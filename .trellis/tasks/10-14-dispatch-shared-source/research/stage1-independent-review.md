# 阶段 1 独立审查

## 结论

**暂不建议接受本阶段：3 个 lifecycle / 跨任务阻塞问题仍需修复，另有 1 个解码一致性问题。** 本 reviewer 按派发要求只读产品代码，仅写本报告，没有改产品、测试、任务状态或 Git index。

### 范围与材料

- 已加载完整 PRD、design、implement 和 `check.jsonl` 的全部 spec / research 引用；任务文档仍有旧 planning/未授权措辞，本次执行依据主 agent 的明确阶段审查派发和实际 `in_progress` 状态。
- 实际检查：`lib/subagent-rpc.ts`、新增 `lib/source-executions.ts`、`runtime/pi_trellis_worktree/{records,manager}.py`、`extensions/trellis.ts` 的 overview hunk、`resources/runtime-baseline.json`、`tests/dispatch.test.mjs`、新增 `tests/source-executions.test.mjs`。
- 为追踪真实 owner，还读了 `lib/{bindings,executions,worktree-query,config}.ts`、`lib/initialization/engine.ts` 的路径/manifest 校验、`tests/worktree-fixture.mjs`，并检查主 agent 并发新增的 `tests/runtime-contracts.test.mjs` provenance hunk。
- 检查了 tracked dirty diff、cached diff（空）、untracked 清单及任务所需 untracked 文件；没有读取/修改无关 `10-14-runtime-tool-names` 的产品范围。
- 未提供 `Review base`，因此 **committed history 不属于本次审查范围**；记录的当前 HEAD `6274908592a23ccbaab504baf136aaa0ddfc7683` 只是快照，不是推测的任务 base。

## 已验证、未修复的发现

### F1 / P1：无锁的终态 / shutdown 发布可以覆盖另一 host 的新 request，丢失活跃占用

**位置：** `lib/subagent-rpc.ts:39-40`（source terminal read/check/write）、`:60-61`（source shutdown read/check/write）；`lib/source-executions.ts:39-42`（无条件 atomic rename）。

`requestId` 在读盘时比较，但比较与 `atomicJson()` 的最终 rename 不在同一跨进程临界区。跨 host 路径使这个竞态不再仅是理论：

1. Host A 收到旧 agent 的 terminal（或开始 shutdown），读到旧 request，准备发布。
2. Host B 也收到旧 terminal，先将同一旧 request 写成 completed。
3. Host B / C 取得真实 source lock，检查磁盘无活跃记录，再为同任务合法预留新 request。
4. A 的迟到 rename 把新 request 覆盖回旧 completed / unknown。

**实际复现：** 使用 `tests/dispatch.test.mjs` 的原始 disposable fixture，拦截 `node:fs.renameSync` 并 `syncBuiltinESMExports()`，只在 A 对此 source record 的最终 publication 点插入上述 B terminal + 持真实 `acquireBindingLock()` 的新 reservation。插入时显式断言 `sourceActive(readSourceExecution(identity)) === false` 后才预留，未绕过同任务 occupancy。输出：

```text
terminal {"reserved":"new-request","persisted":"d111b136-8594-435b-8dec-5a22b5059d17","state":"completed"}
shutdown {"reserved":"new-request","persisted":"c5e7b6f6-62bb-4687-b0e7-6a90a7e459f8","state":"unknown"}
```

终态分支留下 completed 时，新 child 仍运行，但之后的 dispatch/create/adopt 会认为无占用。shutdown 分支则把新 agent ID 丢掉并错误指向旧 child，妨碍跨会话 stop。

**具体修复：** source record 的 conditional update 与新 reservation 必须使用同一跨进程 serialization，持锁后重新读盘比较 request/identity/state，再发布。只在 rename 前再读一次仍有同样窗口，不能当 CAS。可新增 source per-task update lock（reservation 与 callback 都使用，明确固定 lock 顺序），或将 source callback 延迟到可取得现有 source lock 后再重查/写入；不得在 spawn 已持锁时同步嵌套取锁。只修 source，不顺带重构 managed schema。设计目前声明 callbacks 不取 source lock，主 agent 应明确记录必要的 source-only 协议调整，而不是声称原方案已经有跨进程 CAS。补两个 host 的 terminal/reservation 和 shutdown/reservation deterministic regression。

### F2 / P2：新 host 首次工具调用之前收到的 terminal 只缓存、永不与旧磁盘记录对账

**位置：** `lib/subagent-rpc.ts:28`、`:37`、`:45`、`:92`、`:94-101`、`:138`。

`sourceIdentity` 直到一次 dispatch/stop 的查询后才初始化。新 host 收到旧 agent 的 terminal 时只能进 `early`。之后 stop 虽然知道 root/task/record，也不会消费这条缓存；`early` 只在新 spawn reply 中按新 ID 消费。因此已观察到的终态证据丢失，旧 `unknown` 可以永久阻塞。新的 cross-host 测试只覆盖 **stop 先于 terminal**，未覆盖反序。

**实际复现：** 同一原始 fixture source dispatch → 原 host shutdown → 新 `registerDispatchTool()` → emit completed(old ID) → 新 host successful stop RPC。结果：

```text
early-before-stop unknown
```

另一个完全不调用工具的注册 + terminal 复现也保留 unknown。

**具体修复：** 当首次拿到可信 source identity 时，对已缓存的 terminal 与严格读取的磁盘 active record 按 agentId/request/identity 对账（经 F1 的 conditional publication）。如要满足无工具调用时也可消费 terminal，可在 host session context 建立时解析 source identity，而不是从事件/prompt 猜 root。缓存仍要有界；stop success 本身不可成为终态。补 terminal-before-first-stop 和 stop-before-terminal 两个顺序，断言旧记录 completed、后续同任务可预留，父 pointer 不变。

### F3 / P2：其他任务的一个坏 source record 会吞掉本任务的合法终态

**位置：** `lib/source-executions.ts:50-60`；`lib/subagent-rpc.ts:37-45`。

跨 host lookup 在整个 source-executions 目录扫描，每个 hash-shaped 文件都先严格解码，任何无关文件的坏 JSON/null/identity/路径错误都会中断全扫描。外层吞掉异常，真实 terminal 被塞进 `early`，但不会再按旧磁盘执行消费。这样一个任务的损坏记录影响另一任务释放占用，与 per-task 状态边界冲突。

**实际复现：** 原始 fixture dispatch → shutdown → 新 host stop（先确保 sourceIdentity 已初始化）→ 写入无关 `000…000.json` 内容 `null` → emit 本任务 completed(old ID)。该任务记录仍为：

```text
unrelated-corrupt-record unknown
```

**具体修复：** 跨任务 discovery 需要逐 entry 隔离错误并保留可见诊断/该坏任务的阻塞，而不是让无关 entry 阻止已经严格验证的 matching record 更新。另一可行的小方案是 stop 时保存已校验的 agent→task identity，用于本次 terminal 的直接读取（同时保留一般跨 host discovery）。不能把命中的坏记录降为不存在，也不能读取 symlink/无界文件；共享目录本身不安全时仍整体拒绝。补无关 null/坏 JSON/identity record 与正常 task 同时存在的回归。

### F4 / P3：Python source 字符串长度边界与 TS 不一致

**位置：** `runtime/pi_trellis_worktree/records.py:283-289`；`lib/source-executions.ts:26-28`。

TS `.length` 按 UTF-16 code unit，Python `len()` 按 Unicode codepoint。持久 JSON 的 `requestId = '😀'.repeat(129)` 在 TS 长度 258，被拒绝；Python 长度 129，接受 completed 并让 create/adopt 的 active 检查返回 false。agentId/error 等边界也存在相同差异。

**实际复现（最新 records.py）：**

```text
TS: Invalid source execution identifier
Python: astral identifier accepted False
```

**具体修复：** 明确双方采用同一长度单位。最小改动是在 Python 对 source record 字符串按 UTF-16 长度校验（含正确 surrogate 处理），保持现有 TS/public provider ID 容许范围；或者双方明确采用同一 UTF-8 byte limit。不要仅修改一方。补 BMP/astral/escaped-surrogate 边界互证，completed 的坏记录也应拒绝而非允许 create。

## 主 agent 并发修复后已排除的发现

- 初始 Python source reader 只看 directory/file symlink，遗漏 `.trellis` / `.runtime` / `pi-trellis` 的本地别名；初始 `version != 1` 接受 boolean true。review 期间主 agent 已修改 `records.py:272`、`:278`，并同步实际 hashes/release。最新独立复现显示：

```text
boolean version rejected Invalid source execution state/owner
local ancestor rejected Source execution path is symlinked or external
```

  不再列为未修复问题；UTF-16 parity 仍未修。
- `runtime-baseline.json` 最初仍声明 modified=false；主 agent 已保留原 sourceSha256/sourceRevision、标记修改输出 modified=true，并调整 provenance test 区分原始/修改输出。独立 focused provenance test 已通过，不把它继续作为阻塞。
- 新增普通 ping 中 create binding 的测试、跨 host stop 后 terminal 测试与 Python create preview interoperability 测试独立通过。无绑定→有绑定不会静默切换目录。
- scoped source/managed 正常 completion/failed、早到 spawn terminal、unknown、stop 不释放、shutdown 及不同 task 并发的现有 fixture 测试通过；不能用这些 PASS 反驳 F1–F3 的未覆盖顺序。

## 验证记录

环境：Node `v24.14.1`；Python `3.14.7`。所有 Node 检查仅在子进程移除 `TRELLIS_CONTEXT_ID`，设置：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules
```

实际独立运行：

1. `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=… node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs`
   - **25/25 PASS**，自然结束；日志 `/tmp/pi-bg/bftcsalak.log`。这是初始已完成 scope；主随后增加的用例不混入这个数量。
2. `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=… node --import ./tests/host-tui.mjs --test --test-name-pattern='recorded native provenance' tests/runtime-contracts.test.mjs`
   - **1/1 PASS**，读取的是主 agent 已并发修复的 provenance assertion/metadata。
3. `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=… node --import ./tests/host-tui.mjs --test --test-name-pattern='new host|interoperates|introducing a binding|recorded native provenance' tests/dispatch.test.mjs tests/runtime-contracts.test.mjs`
   - **4/4 PASS**，自然结束，覆盖 main 新增的正常顺序。
4. Disposable inline Node/Python probes：F1 terminal + shutdown publication interleaving、F2 terminal-before-stop、F3 corrupt-neighbor、F4 decoder mismatch 均得到上文实际输出。所有 fixture 已 cleanup。首个 fixture-eval probe 因 eval 内 `import.meta` SyntaxError 没有执行，随后将 extension path 作为 lexical 常量替换重跑成功；不把首次失败当产品问题。
5. `git diff --check`：运行多次，**PASS**。cached diff 为空。

未运行：全量 Node suite / Python unittest（main 正在并发跑，避免重复）、lint/typecheck（package 无脚本）、真实 provider / online 网络 / 安装/reload/个人 sync。主 agent 报告全量 `bh59uslra` 390/390，此处只记录主报告，不伪称 reviewer 独立运行。

## 快照与限制

`lib/subagent-rpc.ts` 在所有上述 lifecycle 复现中保持 hash：
`fbfbc8659b5e2f1ba0c9166804c7b0eabaa81d65c73a2cb544efc0a32ed62d62`。

最终读到：

- `lib/source-executions.ts`：`19feaad0791179ec6e06003dc5e3a1c2d2a494092eb8467160b125e35fdd60bd`（期间仅去除未使用 import，已重读完整文件）。
- `runtime/pi_trellis_worktree/records.py`：`88cfc97a65c35a565fa98cadfee58d1797360b57b0c74d207044c984e9cc885f`。
- `runtime/pi_trellis_worktree/manager.py`：`85d13a265ac5763af181f9ac6942ad2772b813c2db0ae228d458f135052b4fd3`。
- `resources/runtime-baseline.json`：`9eae74e5f303921973dceaf34033ad09550b4d39a6ccb0e23ce3715f5520ba5f`。

这是共享 checkout 的阶段审查而非静止 worktree；已显式检查主并发的 tests/provenance/ancestor 修复，没有覆盖或撤销它们。产品修复必须由主 agent 做，之后重跑受影响的 deterministic regressions 与最终检查；本报告不是阶段验收或提交授权。
