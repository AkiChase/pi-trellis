# S2 实现候选交接（2026-10-15）

## 状态

**S2 候选已实现并完成以下自检，尚非 S2 独立验收或全任务完成。** 父会话仍须独立审查、生命周期接线/测试、最终复核；本实现者未 commit/start/deploy/install/reload/push/archive。项目 `.trellis/.pi-trellis.json`、`.trellis/workflow.md`、其他任务/既有 S1 evidence 均未修改或清理。

## 修改与接口

- engine.ts + 新 provenance-reader.ts：默认生产 API 与诊断共用严格 runtime/package/manifest policy；diagnostics.ts 删除重复 package validator，保留非授权旧 release 静态事实。
- 新 diagnostic-worker.ts：同 run reader 计费静态、严格 gate、部署 closure 捕获、执行后 recheck；当前 task-store route 变更拒绝。只从返回非空严格 manifest 授权，不用 runtimeStaticValid。
- 新 diagnostic-runner.ts/diagnostic-bootstrap.ts/diagnostic-runtime.ts：terminable worker、20s 总预算/2s收尾预留、固定 shell=false argv/环境白名单、256KiB streams/8MiB stdin、owned PID/受控 POSIX group 退出、固定 `-I -S -B -X utf8` bootstrap、hash 校验内存 loader/真实 package init/保留 namespace 不 fallback。
- runtime/diagnostics.py、common/{active_task,config,paths,task_records,trellis_config,workflow_phase}.py、task.py：共享纯 pointer/current payload/task semantics/config snapshot/identity/Phase Index 消费；不 import CLI/session_context/materials，不磁盘重开/子进程/hooks。
- runtime-baseline.json：仅本次 8 个源码 hash（含新 diagnostics.py）及 release 耦合更新，历史 source metadata 保留。
- command.ts：Check await 一份报告；保写菜单/Help/Cancel；可选第4参数生命周期 seam。tests/init-{diagnostics,command}.test.mjs 更新仅 Check 行为；新增 tests/diagnostic-runtime.test.mjs、tests/python/test_diagnostics.py；docs/initialization.md 更新能力/限制。

父接口：

```ts
runDiagnostics(scope, { signal, scopeError }): Promise<DiagnosticResult>
registerInitCommand(pi, refresh, getScope, runCheck?)
// runCheck(ctx, scope, {signal,scopeError}) -> Promise<DiagnosticResult | undefined>
// 返回 undefined 时 command 不 notify；父会话用它持有 generation/controller，取消旧run、抑制迟到发布。
```

extensions 未编辑。`runDiagnostics` 不发送通知；父会话负责重复 Check、session_start/replacement/shutdown 的失效接线。无需另加 UI/命令/flags。

## 实际验证

环境 Darwin、Node v24.14.1、Python 3.14.7；所有 Node 测试以 `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test ...` 执行。

- 初次 preliminary 在 runtime hash 尚未耦合更新时失败：Package runtime hash mismatch。未通过部署本项目或放宽 gate 修复；更新本次 package baseline 后复测。
- 初次实际 fixture 发现缺失 sessions 目录的 recheck 错误；改为保留 original root/path 路由后真实 probe 通过。
- preliminary initialization + S1 static：85/85 exit0。
- init-diagnostics + init-command + 新 runtime：115/115 exit0。
- provenance/runtime-contracts/adopt/apply-template/unsupported/initialization 六文件集：130/130 exit0（最后 task.py 去冗余投影前）。
- **最终源码**四文件集 `tests/init-diagnostics.test.mjs tests/init-command.test.mjs tests/diagnostic-runtime.test.mjs tests/runtime-contracts.test.mjs`：**143/143 exit0**。其中 runtime 35项包含真实 worker read/write spy、全 run 预算累计、capture 前/后 tamper、保留 namespace 缺失、startup/shadow/pyc、schema/scope、输出洪水/timeout/abort/EPIPE/owned PID及受控继承pipe子孙实际退出。
- **最终源码** `python3 -B -m unittest discover -s tests/python -p 'test_*.py'`：**33/33 exit0**（包含5项新共享消费 parity/no-reopen/无子进程/hooks测试）；旧 refresh/collect 负例按预期 stderr argparse error，不是 suite 失败。
- git diff --check、22个own files（tracked+untracked）末尾换行/尾空格：通过。
- 没有 lint/typecheck script；无可用现成 tsc，**NOT_RUN**，Node strip 执行不冒充静态 typecheck。
- npm test 全量、独立审查、真实宿主生命周期/终端/在线模型：**NOT_RUN**。

原始执行输出与临时 driver/指纹均在 `/tmp/pi-s2-*`，不复制到仓库。此摘要不是原始日志长期可用承诺。

## 具体未完成/限制

1. 父 lifecycle 接线及重复/换session/shutdown 无迟到发布测试尚未实施，不能验收 A8 全部。
2. 跨 root/managed marker/native Git identity、有效身份 main-checkout fallback 留到 S3：S2 明确 blocked，不 stat claimed foreign source、不借目标 pointer、不开 nested Python/Git/tempfile。
3. **当前实际源码没有 TS context-limit 消费者**：task-context 已是 path-only；lib 中无 context_injection/parseContextLimits，故未按历史调研重建虚构 parser。报告标注当前 Python 消费值，native material safety 不受这些 prompt limits 授权。父会话须确认此差异按实际源码接受。
4. Pi settings 当前只有安全只读 JSON snapshot，实际 merge/filter/loaded resource/custom agent-dir 未证明；worktree.directory 深度消费者归 S3，未凭 shape parse 宣称 effective。
5. 普通 current CLI 与 diagnostics 共用 pointer parser/current payload/record semantics；诊断读取是 worker 的严格 exact route/snapshot，不等于执行整个 resolve_active_task 的默认磁盘路径或 full get_context。
6. Windows 探测 blocked；任意恶意 interpreter/stdlib、脱离受控进程组的子孙、并发祖先替换非 OS 沙箱。worker terminate 对内核不可中断 I/O 无平台绝对保证。
7. 新测试尚未穷尽用户列出的每一种 timestamp/current pyc、host 错scope返回、lateclose、source-store ABA 等对抗变体；已有实际 fixture 证据不可替代独立 reviewer 对缺口的判断。未据此宣称 S2 全验收完成。
