# 独立审查 — Pi 指令菜单统一

## 结论

本任务范围内未发现剩余产品缺陷。独立审查后修复实际 SDK 测试接线，并补充最终取消与包来源漂移负例；产品 command/adoption 未作额外改动。主会话仍需核对实际差异、全量测试门禁和接受结果，本报告不是生命周期或提交授权。

## 审查范围

完整读取并核对以下 14 个实际变更文件（两个来源清单仅审查对应单文件 hash 变更）：

- `lib/initialization/command.ts`、`lib/initialization/adoption.ts`
- `tests/init-command.test.mjs`、`tests/init-menu-safety.test.mjs`、`tests/adopt-project.test.mjs`、`tests/project-activation-host.test.mjs`
- `README.md`、`docs/initialization.md`
- `resources/templates/agents-block.md`、`resources/template-baseline.json` 对应 hash
- `skills/trellis-meta/references/local-architecture/overview.md`、`resources/skill-baseline.json` 对应 hash
- `lib/task-browser/command.ts` 导航、`extensions/trellis.ts` 的 `runtimeDiagnostic` 单一文案 hunk

读取注入的 PRD/design/implement 与 development/testing，核对 `check.jsonl` 并读取 shared guides；完整阅读原 engine/resources/project-state 和相关测试以追踪选择、计划、最终确认及 apply 验证。查看 staged/unstaged/untracked 清单；暂存区为空。未提供 Review base，因此本次不覆盖已提交历史。其他 extensions/runtime/worktree/context 并行修改未审查或修复。

## 审查与修复

1. `tests/project-activation-host.test.mjs:84`：实际 Pi SDK 测试仍只回答首菜单/名字菜单，沿用 `confirm: true`，与产品新的 `select([Cancel, operation])` 最终确认不匹配。改为完整的 Initialize/custom/Initialize 和 Update/Update 序列，保留每次选择必须属于公开 dialog options 的断言。
2. 同一 SDK 用例补 Initialize/custom/Cancel 和 Update/Cancel，断言最终 options 明确以 Cancel 开头、初始化取消后项目仍为空、更新取消后文件仍缺失、没有额外 reload、所有预期选择被消费；禁止调用旧 confirm。真实 SDK runner 的 `mode:'rpc'` 与实际 `hasUI` 合同有效，不靠伪造上下文证明 SDK 接线。
3. `tests/init-menu-safety.test.mjs:52` 补包 runtime/role/template 来源 hash 漂移负例：只剩 Check/Help/Cancel，错误可见，无 Python/Git/写入/refresh/reload。用临时 read spy，不修改真实包资源或 baseline。

确认核心事实：

- 非空参数与非 UI 分支在任何 FS/路径发现前返回静态引导，parser/completions 已移除。
- 首菜单仅读取显式项目、资源、身份路径；不调用 inspect、workspace inventory、Python 或 Git。异常状态仍保留基础菜单。
- 初始快照不作为写权限：实际动作经过 inspect 与原 plan/apply 重新验证；初始化状态竞态、摘要后的文件/包漂移均拒绝或由原 apply 保存冲突。
- Check 明确是 resource/adoption facts，不声称深入运行诊断；不写文件、不选任务、不触发模型、不 refresh/reload。manifest-less Check 选择之后仍可调用既有 adoption inspect/Python/Git；这不是菜单零 subprocess 合同，也不是新深诊断。
- 初始化、身份、更新、模板、接管摘要的固定 project/scope/counts/preservation/destructive/no-backup 信息均位于可截断路径样例之前；合法用户名禁止换行/控制符，root/path 已单行转义。包含确认标题后仍不超 14 物理行。宿主原生 selector 初选 index 0，所有最终写确认均 Cancel-first。
- docs/错误/模板/技能参考导航一致，未更改 Python CLI 参数、runtime/baseline 或进行部署。

## 实际验证

环境：Darwin/macOS，Node `v24.14.1`，Python `3.14.7`，已存在 Pi SDK `1.2.0`。所有 JS 测试子进程均使用：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID ...
```

1. 最终 4 文件 focused：

```bash
node --import ./tests/host-tui.mjs --test tests/init-command.test.mjs tests/init-menu-safety.test.mjs tests/adopt-project.test.mjs tests/project-activation-host.test.mjs
```

**PASS 76/76，自然 exit 0，无 skip/cancel**。包括最后新增包漂移与实际 SDK 最终取消断言。[完整最终日志](review-final-focused.log)。同一命令末尾的 `git diff --check` **exit 0**。

2. 较广回归：

```bash
node --import ./tests/host-tui.mjs --test tests/init-command.test.mjs tests/init-menu-safety.test.mjs tests/adopt-project.test.mjs tests/project-activation-host.test.mjs tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/task-browser-ui.test.mjs tests/manifest-provenance.test.mjs tests/apply-template.test.mjs tests/skill-resources.test.mjs
```

**PASS 184/184，自然 exit 0，无 skip/cancel**。[完整日志](review-regressions.log)。此轮已含 SDK cancel 加强，但开始于最后包漂移测试增加之前；之后最终 focused 已复测所有直接修改测试。其他 6 个回归文件没有被本审查修改。skill-resources 的 npm pack 是 dry-run/ignore-scripts，未安装依赖。

3. `git diff --check` exit 0；本次未跟踪 safety test 无尾随空白。active check/implement JSONL 均解析成功且 references 存在。README、初始化文档与本任务 artifacts 的相对 Markdown 链接目标存在。
4. hash 校验 **PASS**：AGENTS 模板 `db46ec45c71ae528e5497a9cc688a4e8e3542ba0b7107e16b50f9525819b2bf3`；技能参考 `e7868a8a95c517004380caafdd04f2fe8ffa7d8db1af6369995d261ad1260fbe`，均与对应 baseline 一致。
5. `rg '/trellis-init[ \t]+--|View project status' README.md docs resources/templates skills lib/initialization lib/task-browser/command.ts extensions/trellis.ts` 无匹配（rg exit 1，包装断言 exit 0）。迁移提示仍列出旧 flags，属于明确拒绝说明而非教程。

## 限制与未处理项

- Lint / TypeCheck：项目无对应 script，**不可用**，不标 Passed。Node TS 执行不是静态类型检查。
- 本审查未跑 `npm test` 全量或 Python 全量；主会话负责。主与实现者曾报告 initialization 固定数量 `36 vs 35` 的并行 baseline 失败；未改该测试、runtime 或 baseline，也不把既有 full FAIL 改称 PASS。
- 实际 SDK + scripted UI 是公开 parser/runner/loader 接线证据，不是实际终端/RPC wire 客户端画面、键盘输入或在线模型效果。无 PTY/在线/provider 验收；Check 不承担后续深入诊断任务的验收。
- 未启动/绑定/归档任务、提交、安装、部署、个人 reload 或 push；测试 reload 仅发生于 disposable SDK fixture。

## 最终直接审查文件指纹

```text
94ad4ffc875d7952aa5d59110bde75ffbd629f43b0b8b85a2c6b2882006f6233 lib/initialization/command.ts
653fd4e2673b9fbdb9bac538fc67e00ee1b48fb96cb304c9a15fb3dc1e7e68da lib/initialization/adoption.ts
c9af7d1290b73aadce7e22a88c8e0a67d547c2c0a9c3c7dc41ab250ef139ff3a tests/init-command.test.mjs
92b25b4dd40e4264adeb6b793c3a987a8c0c4a425f58848b262cde1a33a083c7 tests/init-menu-safety.test.mjs
378a5fd49bea20726aa598087711efec69f570ca9d9320f1363221f9693550a7 tests/adopt-project.test.mjs
48b0a5175e951823d3eb117ad519076c207812799c7f4a813b3b142551c16a87 tests/project-activation-host.test.mjs
```
