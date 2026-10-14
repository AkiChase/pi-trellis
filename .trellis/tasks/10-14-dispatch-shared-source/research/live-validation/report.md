# 共享源目录派发：真实 SDK/provider 离线验收

## 结论

**PASS（真实 Pi SDK、真实 extension loader、真实 agent-tasks provider，离线 scripted faux 响应）。** 最终运行自然退出 0，10 个检查点全部通过，无产品代码改动。主会话可核对本目录证据后决定接受/归档。

**未运行**真实 Pi CLI / tmux / TUI 视觉验收、在线语言模型、网络调用。没有把 SDK 离线验证伪称为 CLI/tmux 或在线模型服从性验证；此功能通过实际 SDK/provider 的公开工具与事件验证，不需要制造视觉证据。未额外运行全仓库单元测试、lint/typecheck 或 Python suite（本次范围是追加真实集成验收，原阶段证据仍由 main 核实）。

## 环境与边界

- 仓库 `/Users/jyxc-dz-0101322/tools/pi-trellis`，测试开始 HEAD `c909dcc`（完整 hash 见 `final.json`）。
- Node `v24.14.1`；Python `3.14.7`。
- Host `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`。
- Provider `/Users/jyxc-dz-0101322/.pi/agent/git/github.com/AkiChase/my-pi-preset/extensions/agent-tasks`。
- `ModelRuntime.create` 使用 `refreshOnCreate:false`、`allowModelNetwork:false`，faux native provider 的 localhost:0 模型；无安装、依赖获取或网络模型。
- 创建一次性 Git project/config，`PI_CODING_AGENT_DIR` 只在验证进程内指向临时目录。产品 adapter 持久配置仅写在临时 project settings，children 使用真实 reload 路径。
- 文件写入仅临时目录及本任务 `research/live-validation/`。没有 product edits、commit、start/hooks、主会话 load/reload、个人配置修改或 lifecycle/archive。

## 命令与各次运行

共同环境前缀（每次 Node 运行均使用）：

```bash
cd /Users/jyxc-dz-0101322/tools/pi-trellis
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node <driver> \
  --host /Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  --provider /Users/jyxc-dz-0101322/.pi/agent/git/github.com/AkiChase/my-pi-preset/extensions/agent-tasks
```

1. `<driver>=tests/provider-contracts.mjs`，job `bzi4tuerb`，**FAIL exit 1**。原文件未经修改。真实 parser/runner/target material/write/edit/late external tool 已 PASS；统一 source 派发成功后 cwd 断言失败：实际为 `/private/var/...`、fixture 期望为 `/var/...`。macOS tempdir 别名 canonicalization，属于 **existing harness fixture 断言错误**，不是产品执行目录错误。完整首次 log `first-existing-harness.log`。
2. 从原 harness 复制到本目录 `driver.mjs`，canonicalize `mkdtempSync` 的返回值并扩展验证。job `b1cnl978w`，**FAIL exit 1**：本验证脚本相对 import 多退一级，启动前找不到 task-context.ts，尚未创建 runtime/config。仅修 disposable driver 为正确五级路径。证据 `first-disposable-import-failure.log`。
3. job `bn1qdtk2r`，PID `84840`，**FAIL exit 1**：已证明不同任务同时 running、短提醒、独立 child pointers；同任务派发按预期抛错拒绝，但 disposable driver 错误期待 `{isError:true}` 返回。仅在 disposable driver 捕获正常 tool error 并断言内容，产品不改。证据 `first-rejection-fixture-failure.log`、`rejection-fixture-failure.json`。
4. job `b5g8cxcuk`，PID `86902`，**FAIL exit 1**：已证明同任务拒绝、真实 steering/results、stop reply 后仍占用。driver 错误把 `get_subagent_result(wait:true)` 在 provider status=stopped 的立即返回当成 terminal event 已到，过早断言 terminal。**fixture 时间假设错误**，反而证明 stop/result 回复不是终态。仅改 disposable driver：提前订阅真实 `subagents:failed`，release faux response 后有界等待实际 terminal event，不注入/伪造终态。证据 `first-stop-timing-fixture-failure.log`、`stop-timing-fixture-failure.json`。
5. job `bma8up736`，PID `91682`，**PASS exit 0**，同上命令 `<driver>=.trellis/tasks/10-14-dispatch-shared-source/research/live-validation/driver.mjs`。完整输出 `final-run.log`；详细检查、真实 ID、RPC spawn payload、pointer/record、terminal 与 hashes 为 `final.json`。

首次失败均保留，未修产品或原 `tests/provider-contracts.mjs`。最终 driver 保留原 parser/runner/直接公开 RPC 检查并验证统一 source tool；不是用直接 RPC 的成功冒充统一工具成功。

## 最终通过项（10 个检查点）

1. 原 harness 统一 `trellis_dispatch` source 分支在 canonical 临时路径成功；child 真实 write/read/result，SOURCE material 与短提示已核。
2. 两个不同 in_progress 任务在同一 canonical cwd 同时 running，两个不同真实 agent ID，实际公开 spawn payload 为同 cwd + `isolation:off`，不是顺序跑完后假称并发。
3. 每个 child prompt 都含 docs 的完整短警告，每个返回都含主 agent 短提示；第二任务当前未提交 PRD 正确注入。
4. `pi-child-*` 独立 session pointer 分别绑定不同任务；父 key pointer sentinel 原始字节完全未变。
5. 同任务重叠 tool error 拒绝，provider spawn 数仍为 2，没有偷偷启动额外 child。
6. 返回真实 IDs 可交公开 `steer_subagent` 和 `get_subagent_result`；真实 completion events 与 source completed records 匹配。
7. stop reply 后、真实 terminal 前 source 记录仍 active；再次派发仍抛占用错误。
8. 真实 provider stop 与随后真实 failed terminal 将对应 source 记录变为 failed，才释放占用；没有删除记录或伪造 event。
9. terminal 后下次同任务 dispatch 成功并拿到新 ID/result；`git worktree list --porcelain` 仍只有原 project 一个 worktree，无 `.worktree` 或 managed binding 创建。
10. 原真实 provider parser/runner/write/edit/late session_start external tool，直接公开 RPC ping/missing-dir/missing-ID/steer/result、shutdown 后 unavailable timeout 回归通过。

扩展部分真实 IDs：

- Concurrent A: `fb6dff03-1d49-437`
- Concurrent B: `83abee0d-e638-410`
- Stop target: `bef4a851-8b85-453`
- Next after stop: `94f7d634-8559-488`

## Hash 与清理审计

- `final.json` 包含所有 tracked `lib/`、`extensions/`、`runtime/`、`resources/`、`agents/` 以及原 provider harness、dispatch docs 的测试前后 SHA-256。**changedProductFiles=[]**。
- `external-audit.json` 包含真实 provider 64 个 TS/package 源文件和 host package manifests（共 67 条）SHA-256；`cleanup-audit.json` 复查 **externalHashChanges=[]**。
- 只读核对个人 `~/.pi/agent/settings.json` 与源 project `.pi/settings.json` hashes，**personalSettingsChanges=[]**。
- 原失败 workspace `.../pi-trellis-real-probe-Wea7wh` 和扩展三次 workspace `.../pi-trellis-live-acceptance-{9x8Ldp,MMYaa2,qt3Swt}` 均确认不存在。
- 已实例化的 direct runner sessions 逐个 dispose；parent/provider 经过真实 `session_shutdown` 后 dispose；失败轮同样执行 cleanup finally。最终进程自然退出 0，未用 `process.exit` 隐藏残留。
- PID `84840`、`86902`、`91682` 用 `os.kill(pid,0)` 确认 gone；未记录原 harness/导入失败轮 PID，但它们均自然退出 1，原 workspace 消失且当前 `ps -axo pid,ppid,command` 无对应验证命令。不能伪称有不存在的原 PID 证据。
- provider 使用进程内 SDK child sessions，不创建持久 provider 子进程；Python fixture/context 查询短子进程已结束。`cleanup-audit.json`: **matchingValidationProcesses=[]、allVerifiedGone=true**。
- tmux/CLI **NOTRUN**，所以无新 tmux server/session；没有触碰用户已有 tmux 或其他 Pi 会话。

## 主会话验收提示

先核 `final-run.log`、`final.json`、`cleanup-audit.json` 和全部首次 failure logs。该功能真实 SDK/provider 离线路径通过，无确认产品 bug；原 optional harness macOS canonical-cwd fixture 仍会原样失败，后续若要修该测试需主会话另行按批准范围处理，不应把原命令标成 PASS。在线模型、CLI/tmux/TUI 仍明确 NOTRUN。是否最终接受及归档由 main 执行，本验证代理没有 lifecycle 权限。
