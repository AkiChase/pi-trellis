# Stage 2 独立检查

## 范围与环境

仅检查 `.trellis/tasks/10-14-user-level-project-activation` 的 Stage 2。Review base 为 `568634f`（Stage 1 检查点），本次 `git diff 568634f HEAD` 为空；Stage 2 实际工作在 unstaged/untracked 文件中，不能把空 committed diff 当成无工作。index 为空。

产品/测试检查文件：

- `extensions/trellis.ts`
- `lib/adapter-resources.ts`
- `package.json`
- `tests/skill-resources.test.mjs`
- `tests/agent-context-integration.test.mjs`
- `tests/project-activation-host.test.mjs`（新增）
- `tests/initialization.test.mjs`（主会话修正旧测试预期，独立核对仍保留执行阻断断言）

已使用完整注入的 PRD/design/implement、check.jsonl 当前五项材料，读取适用 `trellis-check` skill，核对真实 Pi SDK 的 package-manager/settings-manager/resource-loader/agent-session/extensions-runner 相关完整方法，而非调用其 private API。

执行环境：macOS/darwin，Node `v24.14.1`，Python `3.14.7`，已有 Pi `1.2.0`，host node_modules 为 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`。没有安装依赖、修改个人 settings、个人 reload、模型网络、provider 派发、提交或生命周期操作。

## 发现与自修

1. `lib/adapter-resources.ts`：虚拟 defaults 原来仅用 source 字符串匹配。同样的相对字符串在 user/project scope 中可以指向不同包，导致另一个包的虚拟 defaults 被改写。改用公开 `listConfiguredPackages()` 的 installedPath/canonicalPath 判定本包，再按 `scope + source` 修改对应 entry。新增同拼写、不同实际包的 scope 回归，检查另一包的虚拟 entry 原样保留，双方 settings 字节不变。
2. `extensions/trellis.ts`：原来仅在异步 resolver 前验证 runtime，且只判断 event.cwd。现在同时核对 ctx.cwd/root，并在 await 返回后再次核验 runtime 和当前 ctx.cwd。新增 public resolver 返回时删除 runtime 的竞态回归与 foreign ctx.cwd 拒绝断言。
3. `lib/adapter-resources.ts`：临时 extension fallback 不再返回不存在的 SKILL.md，保留 onMissing=skip 和永久 adapter gate。只做本包目录枚举，没有自造 npm/git identity/filter 算法。
4. 修正入口注释的旧“project-local / skills from manifest”描述；实现依然无静态 skills 注册，`pi.skills: []`。

新增/加强实际 SDK 与公共 resolver 回归：npm/git installedPath 真实身份（临时目录已有路径 symlink，不安装/不访问网络）、无效 settings 拒绝且字节不变、禁用 package/extension、project trust 拒绝项目独有包而保留 user 来源、静态显式 skill 的 host-owned 限制、`noSkills` 允许 extension-discovered explicit paths、临时 `-e` 加载仍不满足 `adapterConfigured`、user/project 去重与配置字节保留、实际 getAllTools/getActiveToolNames/systemPrompt、真实 command parser 的 init/repair 确认→reload 启用。

其中 scope 虚拟视图回归与删除 runtime 竞态回归使用 `t.mock.method()` 观察/注入公共 API 边界；其他 SDK activation/filter/reload/command parser 场景使用实际 loader/session。RPC UI 回答是脚本化测试输入，不是物理终端验收。

## 首次失败与后续证据

- 主会话首次 SDK 测试误用不存在的 `session.getExtensionRunner`；此前已改为公开 `loader.getExtensions()`。本次未引入私有 runner 调用。
- 主 full `b92h1h7mq`：432 项，431 PASS / 1 FAIL，`tests/initialization.test.mjs:102` 仍假设 unsupported runtime 自动注入 task_error，实际新的批准契约应为无 state。主修复后保留 bash/bash_bg/monitor/Agent 执行阻断及 read/WebSocket 不受影响断言。
- 主 full `b9nk69c51`：432/432 PASS，exit 0。审查员在收到该 run 启动通知前已经修改 adapter-resources 的 scope/defaults；因此不把它作为最终审查版本的充分证据。该 run 结束后才继续修改 extension/test；随后独立完整重跑。
- 独立 resolver focused：`tests/skill-resources.test.mjs` 8/8 PASS，exit 0。
- 独立新增 SDK+resolver 首轮：20 项，19 PASS / 1 FAIL。repair 测试最后误把先前删除 task.py 导致的预期 error notice 算作 repair 失败；实际修复、两次 reload、完整 activation 断言已成功。改为先断言失效 diagnostic 存在，再清测试收集数组，只评估 repair 阶段；未改产品失败处理。

## 最终验证

所有执行均在测试子进程 unset `TRELLIS_CONTEXT_ID`，没有修改父会话环境或任务指针。

Focused 命令：

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test \
  tests/skill-resources.test.mjs tests/project-activation.test.mjs \
  tests/project-activation-host.test.mjs tests/agent-context-integration.test.mjs \
  tests/init-command.test.mjs tests/worktree-protocol.test.mjs \
  tests/initialization.test.mjs
```

结果：95/95 PASS，exit 0。之后只增加 getActiveToolNames 的 fresh/valid/invalid 三个断言（产品不变），下述完整运行覆盖最终测试源码。

Final full 命令：

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  npm test
```

结果：**442/442 PASS，exit 0**，0 skipped/cancelled，耗时 `128624.168041ms`。job `bj0baztlt`，实际完整日志 `/tmp/pi-bg/bj0baztlt.log`。所有产品/测试自修完成后启动，运行期间未修改其输入。

- `git diff --check`：PASS。
- 当前 task `check.jsonl` JSON parse/五个 file 存在、required artifacts 存在：PASS。
- 新增 SDK 测试 untracked whitespace：PASS；本研究文档按相同尾部空格检查。
- Lint / static TypeCheck：**Unavailable**，package.json 没有对应 scripts；Node 直接执行 TS 不是静态类型检查。
- 专门的 Python unittest、旧 Pi 版本矩阵、真实 PTY/在线 provider/model：**NOT_RUN**，本阶段 npm integration 的完整 runtime fixture/CLI 路径通过，但不是独立 Python/platform/provider 全面验收。

## 结论与限制

Stage 2 无剩余已知阻塞问题；主会话仍需核实际 diff、接受并提交本阶段。没有宣称整个任务完成；installer/docs/最低版本说明属于 Stage 3，尚未改变。

公开 SDK 保持固定 AgentSession cwd；没有测试或承诺任意 cwd 热注销。实际测试覆盖 reload/fresh runner/重复 bind 与源码 guards；没有做真实持久会话 resume/switch 的独立端到端测试，也不声称历史消息被删除。Stage 1 context 回归单独模拟事件，不冒充在线模型 prompt 质量。

fresh SDK 检查项目目录完全为空和资源/registry/prompt 不激活；无 Python 的断言来自完整 focused 中 `project-activation` 的 exec 边界测试，不冒充所有真实宿主自有子进程均为零。普通项目不会因本包自动启用 Trellis；用户自己显式提供的静态 skills/同名其他来源由 Pi 控制，`noSkills` 按 Pi 1.2.0 语义仍允许显式 extension discoveries。

并行 `.trellis/.pi-trellis.json`、部署 manager.py/records.py、`.trellis/workflow.md` 与 `10-14-runtime-tool-names` 未编辑或纳入审查范围；Stage 3 installer/docs 未编辑。保留所有并行 dirty 和空 index，不提交、不安装、不派发、不 archive/journal。
