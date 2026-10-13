# 无清单运行时执行阻塞修复

## 范围与结论

本轮仅修复独立 checker 5463 确认的 extension 授权漏洞及必要 fixture 适配；保留 checker 对 engine、磁盘任务投影和 adversarial tests 的修改。未修改 `runtime/`、runtime baseline/hash、本仓库生成脚本/developer/workspace，未运行本仓库 init/migration、删除 `.agents`、安装/reload、stage/commit 或派发其他 agent。

根因不是 `verifyRuntime` 缺少调用，而是 `session()` 忽略返回的 `undefined`，随后以脚本存在作为授权。现 `findRoot` 只负责发现；`requireRuntime` 要求取得完整成功的 manifest 验证结果。`session()` 和 `runPython()` 执行边界均要求成功，不接受缺失清单。已有 manifest 的无效 schema/provenance、损坏 JSON、资源/hash/mode mismatch、缺失资源和未完成操作继续保守拒绝。

`session_start` 不探测旧脚本，只清显示并给英文 `/trellis-init --check` 诊断；`before_agent_start` 不读运行时/绑定 child，输出 `Status: task_error`，不冒充 `No active task`。初始化命令仍在所有 session 门禁前注册，fresh help 可用。shutdown 改为无需运行授权的本地 bookkeeping，避免 unsupported root 抛出并遗留 child memo。

## 命令边界

unsupported Trellis root 的 `bash` / `bash_bg` / 带 command 的 `monitor` 拦截已知 task/context/developer/journal/worktree invocations，包括直接脚本、Python argv、引号路径、env/command/exec 等常见前缀、`env -u`、shell `-c` 和已知 runtime module import。Trellis role Agent 同样拒绝启动，英文消息说明没有执行并指向检查/显式初始化或 reconciliation，不提供 legacy bypass。

普通 `pwd`、Git status、cat/rg/find、非 runtime Python、Explore、普通 read 和 WebSocket monitor 仍允许且不加 session export。该识别不是任意 shell 解释器、OS sandbox 或第三方 provider 全局拦截；动态构造命令、独立子进程、受管路径祖先的 OS 竞态不作普遍防护声明。supported runtime 的原有 scope export/材料/child 行为保持。

## Fixture 处理

- 新 `tests/runtime-fixture.mjs` 在 disposable root 调用真正 `plan/apply`，安装完整 immutable runtime 和合法匹配 manifest；计数测试只删除 bootstrap task，不改 runtime/hash。未制造 fake script 的合法性。
- `agent-context-integration`、`task-display`、`worktree-protocol` 和 runtime child integration 改用此 fixture；optional provider probe 也改为真实发行 fixture，但未执行 provider probe。
- provenance 负测/不同 key context cache/child bind 执行失败通过 `node:test` mock **宿主 child_process.execFile 边界**制造回包或退出码，使用 `syncBuiltinESMExports`，按 root 限定并在测试后恢复。Python 源码、hash 和真实验证仍生效；foreign/missing source、matching source、stale/error 全部保留。
- child 自有 key、finish 不清 parent、重复 header 不复活、失败绑定隔离、quoted header、伪 marker、missing materials、bound gate、定制 agent 不覆盖及 display count/theme/alias/foreign source 用例均保留。真实 child binding/finish 仍由 Python 执行。
- 新 unsupported 负测覆盖 absent/mismatch/corrupt/incomplete manifest/incomplete operation；每种状态同时断言零 Python spawn、无旧脚本 marker、无 child pointer、无成功 overview/no-task 状态、三个 command tool 的拒绝和非 runtime 探查的可用性。

## 红 → 绿

所有 Node 测试使用实际 Pi 1.2.0 peers：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test <files>
```

- 原始新增负测、产品修复前：`tests/unsupported-runtime.test.mjs`，**1 pass / 5 fail**；`/tmp/pi-unsupported-red.log`。
- 强化 marker 红证据：temporary extension 副本只移除“必须取得验证成功结果”guard，不动工作目录源码；absent manifest test **0 pass / 1 fail**，明确 `session_start executed unverified runtime`；`/tmp/pi-unsupported-marker-red.log`。先前 checker 旧脚本执行探针继续保留，不改历史报告。
- 首次 green focused：unsupported + agent integration + display + protocol + runtime contracts，**63/63**；`/tmp/pi-unsupported-green1.log`。
- 最后 command wrapper 增补后 focused：unsupported + integration + display + protocol，**40/40**；`/tmp/pi-unsupported-green-final.log`。
- 最后补充显式零 spawn 断言：unsupported，**6/6**；`/tmp/pi-unsupported-spawn-green.log`。
- full1：实际 preload `env -u TRELLIS_CONTEXT_ID npm test`，**241/241**，126.69s；`/tmp/pi-unsupported-full1.log`。
- full-final：同命令，**241/241**，145.20s；`/tmp/pi-unsupported-full-final.log`。此运行启动后补充了零 spawn 断言，因此不用它冒称最终快照。
- **最终 exact full：同命令，241/241，0 failures / 0 skips，118.49s**；`/tmp/pi-unsupported-full-exact.log`。包含最后的零 spawn 断言及全部保留回归。

## 最终验证

最终实际执行命令：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  env -u TRELLIS_CONTEXT_ID npm test
```

`git diff --check` 已通过。Node v24.14.1 / Python 3.14.7 / macOS；无 lint/typecheck 脚本，均不可用，不把 Node TS 执行当静态 typecheck。未做真实视觉 TUI、provider/model、实际用户项目安装/deployment/reload。

主会话已获用户独立提交 runtime 的新授权；本 agent 不 stage/commit。告知主会话 `tests/runtime-contracts.test.mjs` 的两处 init fixture 适配在该通知前已写入，且其 import 依赖 `tests/runtime-fixture.mjs`；此后不再修改该 runtime 测试文件。独立 runtime 暂存应保留这两处 init hunk 在 working tree，或显式纳入 helper 依赖快照。本轮不需要任何 runtime metadata 变更。
