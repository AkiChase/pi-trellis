# Stage 1 独立审查

## 范围与环境

2026-10-14，独立 trellis-check 在用户批准的当前 shared source 工作区审查并自修；没有 worktree binding，不创建隔离目录、不递归派发、不管理 phase/lifecycle、不 commit/install/reload/push。

已使用完整注入的 PRD/design/implement、development/testing/reuse/cross-layer spec 和宿主研究，并实际读取 check.jsonl（5 行均 JSON 可解析、引用存在）及 stage1-progress.md。

没有提供 Review base：审查 scoped staged/unstaged/untracked，不把 committed history 当作已审查。启动 HEAD 为 8088e7b；审查中并行列布局任务提交，最终 HEAD 为 4c78c03。其 component/layout tests/docs 不属于本审查。最终 tests/task-browser-ui.test.mjs 的 unstaged diff 实际仅 activation imports/commandFixture，无需混合 hunk 拆分；最终 cached 为空。

完整审查的 10 个 Stage1 文件：

- lib/project-state.ts
- extensions/trellis.ts
- lib/initialization/command.ts
- lib/task-browser/command.ts
- tests/project-activation.test.mjs
- tests/init-command.test.mjs
- tests/unsupported-runtime.test.mjs
- tests/agent-context-integration.test.mjs
- tests/task-display.test.mjs
- tests/task-browser-ui.test.mjs（仅 activation imports/commandFixture 变更）

另读 initialization engine 的 discovery/runtime/inspect 边界、subagent-rpc 注册/订阅/shutdown/gate，完整 dispatch/source-executions tests 和 runtime-fixture；这些不是本审查实现范围。只读 Pi 1.2.0 runner.emitToolCall/emit 的异常语义：tool_call handler 的 throw 会向外传播，故发现异常不能无条件使普通 read/search 失败。

环境：darwin，Node v24.14.1，Python 3.14.7，已有 Pi 1.2.0。测试 subprocess 显式 `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，未修改活宿主环境或个人配置。

## 发现与自修

1. **runtime 失效后的旧 display**：独立负向探针删除 task.py 后，tool_result 与 dispatch 拒绝后仍保留 `["▸ trellis(0)"]`。`extensions/trellis.ts` 的 tool_result catch、viewer/dispatch/runtime gate 现在清除两套 surface；refreshDisplay 在等待 sessionTask 后再核 runtime，防止旧 known session/cache 绘制失效项目；init refresh 复用 runner-root display gate。viewer 的内部 dependency findRoot 接受当前 command ctx，便于清正确 UI，不改变 slash command 名称、参数或 public SDK。
2. **标记删除绕过 ordinary Agent gate**：已激活 runner 的 `.trellis` 整体被删后，原 `if (!root) return` 让 Trellis Agent/runtime shell继续。现在先核注册 root/cwd 再处理 no-root；拒绝已激活 runner 的 foreign/no-root Trellis 执行，普通 read/search/Explore不受影响。
3. **异常发现影响普通工具**：discoverProject 的 EACCES 等异常原在 tool_call 的 try 外，可能让普通 read/search fail。现在发现异常保守清 UI，只 block 已识别 Trellis runtime/role，不继承祖先；shutdown discovery 异常也不抛。更新 findRoot 注释，不再宣称 Pi 1.2 支持任意 cwd 热切换。
4. **fresh runner 跨项目注册**：registeredRoot 未设置时可在后续 session_start 为另一个有效 root 注册全部能力。记录首次 session_start cwd，未注册 runner 不为 foreign cwd 注册/注入/绘制/执行 Trellis；同 cwd 的 init→reload 保持允许，新的 runner可正常激活。
5. **模板确认目标缺失**：Apply template 最终确认仅列 relative file paths，未显示绝对目标。`lib/initialization/command.ts:75` 新增 `Project: ${root}`，测试使用 engine canonical root（macOS /var → /private/var），而非假定 lexical fixture 路径。

回归增加 8 项：四条即时 runtime invalidation route、删除 marker gate、EACCES ordinary-tools preservation、无身份 clone 激活、fresh→foreign session replacement；现有 cross-project case 增加 viewer/session_start/ordinary Agent 断言，init子目录模板case增加绝对root确认断言。未改 runtime/manifest/provenance、角色/skills内容、dispatch schema/action 或 occupancy 协议。

## 验证过程与最终结果

主 focused balr5iq2f 122/122 自然 exit0 是主验证，不冒充独立结果。主在其后给 refreshProjectDisplay 加 cosmetic try/catch；独立 review 的最终版本另跑。

独立 focused 相同命令：

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test \
  tests/project-activation.test.mjs tests/init-command.test.mjs \
  tests/unsupported-runtime.test.mjs tests/agent-context-integration.test.mjs \
  tests/task-display.test.mjs tests/dispatch.test.mjs \
  tests/source-executions.test.mjs tests/task-browser-ui.test.mjs
```

保留失败序列，不将完成当作通过：

- 初次 behq7t1jq：122/122 PASS，exit0，110689.497416ms；日志 `/tmp/trellis-stage1-independent-focused.log`。没有在该运行中改输入。
- 自修后 brjjmpdxb：128/129，exit1；新测试对同步 shutdown 使用 doesNotReject，返回 undefined 使 assertion API失败。改 doesNotThrow，没有放宽产品行为。日志 `/tmp/trellis-stage1-independent-final.log`。
- bts2fbofk：128/130，exit1；模板断言 lexical /var 与 engine canonical /private/var 不同；chmod-000 cleanup 的 after hook 顺序导致 fixture rm ENOTEMPTY。改 canonical root 断言与 try/finally 在fixture cleanup前恢复权限。日志 `/tmp/trellis-stage1-independent-final2.log`。只删除 checker 自己残留的确切临时 fixture。
- **最终 bu28wukoc：130/130 PASS，fail/cancel/skip/todo均0，自然 exit0，98069.59025ms**。日志 `/tmp/trellis-stage1-independent-final3.log`，后台包装日志 `/tmp/pi-bg/bu28wukoc.log`。运行前记录10个scope文件 SHA256，运行结束与报告前全部OK；无输入漂移。hash记录 `/tmp/trellis-stage1-independent-final3-input.sha256`。
- 独立 display mode 负向探针 bm459c57z：**12/12 PASS，exit0**。widget/status/off × fresh/valid/corrupt/incomplete；valid无当前任务保持计数、删除runtime后立即清两surface；其他状态不注册viewer/tool、不新增sections/state，两surface清空。日志 `/tmp/pi-bg/bm459c57z.log`。是 disposable mock-handler +真实完整runtime fixture，不是实体终端验收。
- `git diff --check`：最终 PASS（exit0）。check.jsonl parse/existence：5/5。
- Typecheck/Lint：**Unavailable**，package.json没有对应script；Node TS执行不是静态typecheck。
- Full npm test/Python全集：本独立审查 **NOT_RUN**；主可另跑，不能复用自修前全集作为最终版证据。

## 结论与限制

本次 Stage1 的 scoped 可明确自修问题已修，最终focused通过。Trellis优先、Git目录/文件边界、异常marker阻祖先、无Git fallback、init root统一及绝对确认、commands/tool分类条件注册、no-task计数与失效清理、child/context isolation/lease gate均有源码检查及focused fixture证据。

Stage2故意仍静态skills：不能宣称普通项目已实现整体“只init”。Pi真实 AgentSession bind/reload、skills filtering/noSkills/trust/临时-e/resource provenance、安装与文档整合、最低版本修改留待后续stage；本次仅真实host源码与host TUI helper/component contract，未跑真实完整SDK activation/reload fixture或真实PTY/provider/model。registered command/tool完整撤回仍以新runner/reload为界；没有通用unregister，不清历史AGENTS/messages。运行时安全gate不是OS sandbox。

并行 deployed `.trellis/.pi-trellis.json`、两Python脚本、workflow与runtime-tool-names task保持原样；未审查/修复这些修改。没有提交、安装、个人reload、push、archive/journal或其他生命周期操作。主应审查实际自修diff、跑最终受影响/full checks并决定阶段提交；本报告不是任务验收/收尾。
