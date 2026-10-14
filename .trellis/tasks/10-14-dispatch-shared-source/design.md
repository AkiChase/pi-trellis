# 技术设计：统一派发与共享主目录

## 1. 最小行为差异与边界

当前 `registerDispatchTool()` 把所有派发视为 managed execution。此次只增加未绑定任务的 source execution 分支，保留公开调用形状和 managed readiness/materials/占用契约。两条分支共享输入、runtime、adapter、角色定义、RPC 和任务上下文构建；不新增通用调度器、文件锁或 provider 私有 API。

实际入口保持在源项目根：`process.cwd()`、`ctx.cwd` 必须与 Python 查询得到的 source.root 一致。不支持未 adopt 的 linked worktree、任意 cwd 或在 managed 子目录递归派发。

## 2. 执行位置解析

1. 规范化 action/空可选字段，验证 role 和 prompt。
2. 通过非 ready `queryWorktree()` 确定 source、任务绑定；损坏记录、身份校验错误直接传播。
3. 校验源 runtime、持久 adapter 配置、任务路径/记录和角色定义。dispatch 的任务必须为 `in_progress`；这只是执行门禁，不是实施授权证明。
4. provider ping 后取得现有 source lock。
5. 在锁内重新查询同一任务：
   - 原本无 binding 而现在有 binding：拒绝本次调用，提示重新检查；不临时切换目录。
   - 原本有 binding：核对 immutable identity 并执行现有 ready/material 校验。
6. 检查该任务 source 活跃记录，managed 分支另检查自己的原有执行记录。
7. 构建上下文，最终重新检查任务状态、绑定身份/缺失以及执行占用；managed 同时重查 revision 和 fingerprints。
8. 持久化 starting 后通过公开 spawn RPC 派发。

source lock 仅覆盖短期身份/记录预留和 spawn startup，沿用现有锁语义；不是持续占用整个主目录。不同任务各自预留记录，第一项返回真实 ID 后另一项可以启动，子进程可同时运行。

## 3. source 执行记录

新增小型 owner `lib/source-executions.ts`，不改变 managed `ExecutionRecord` 的 v1 形状。

存储：`.trellis/.runtime/pi-trellis/source-executions/<sha256(taskDir)>.json`。

记录字段：

- `version: 1`, `mode: "source"`。
- canonical `sourceRoot`、`repositoryIdentity`（common Git directory）、规范 taskDir。
- requestId、role、agentId（已知时）、ownerPid、ownerToken、createdAt。
- state：`starting | running | completed | failed | unknown`，可选有界 error。

复用 `runtimeDirectory()` 和 `atomicJson()` 的本地 regular-file/包含边界和原子发布；读取验证版本、对象形状、字段类型、role、正 PID、状态、身份一致与文件大小上限 64 KiB。缺失文件才是无记录；null、坏 JSON、symlink、错误身份均拒绝执行。文件名只由 taskDir 摘要生成，不接受 caller 指定记录路径。source 记录不写 bindingId、material revision、finalSnapshot，也不生成 managed check currentness。

同任务 starting/running/unknown 阻止再次派发；终态记录可以在锁内被新的 request 替换。不同 taskDir 的记录不互相占用。terminal handler 写入前取得与 reservation 相同的 source lock，再重新读取并核对 requestId/身份，避免旧事件覆盖新执行。source callback 遇 spawn/management 锁占用时有界单 timer 延迟重试；锁内 dispatch 可直接 drain，不同步嵌套取锁。shutdown 同样 conditional publication；进程退出来不及写时保留原活跃记录，不推断结束。

生命周期处理只抽取确实共用的 correlation/early-event/owned tracking；不要把 source 记录强制包装成假 WorktreeBinding。owned entries 用明确 source/managed 分支，managed 终态仍做原有 snapshot。

## 4. 与 create/adopt 的竞态

只在 TS 最后检查无 binding 不够：source child 启动后仍可能 create 同任务目录。为保持同任务单执行：

- `runtime/pi_trellis_worktree/records.py` 增加 source 执行记录的严格只读解码/active 检查，字段/path 与 TS 测试互证。
- `manager.py` 的 create/adopt 对同任务活跃 source 记录在 preview 和确认锁内都拒绝。
- managed dispatch 也拒绝残留活跃 source 记录，尤其防御人工生成 binding 的情况。
- 不同任务 create/adopt 不受影响；不改变 prepare/refresh/collect/remove 的既有规则。

此 Python 改动与 source 记录格式在同一个实现阶段交付。更新原生输出 hashes/release 是包资源一致性工作；不修改已部署 `.trellis/scripts/`、不自动升级本项目运行时。

## 5. stop、终态与不确定启动

`action: stop` 仍只接受 task，不新增 agent/prompt/cwd 参数。stop 不要求任务继续 in_progress，否则任务状态变化会阻止停止旧执行。

- 根据任务的 source 活跃记录或 managed 执行记录定位真实 ID；不允许两份活跃记录并存时猜一个，报告冲突。
- RPC stop 成功只表示请求已提交，不释放占用。
- terminal completed/failed 事件释放对应 request 的占用；先于 spawn reply 的事件通过现有有界 early map 对账。
- spawn 等待超时或错误、shutdown、返回 ID 后 shutdown：保留 unknown 和已知 ID；不自动重试 spawn，不因为调用 signal abort 宣称停止。
- 跨会话可读取同一 source 记录并尝试 provider stop；provider 找不到旧 ID 或不可用则明确失败并保留 unknown。
- 首次查询取得可信 source identity 时，将已缓存 terminal 按已有磁盘 agentId/request 对账。已知 ID 直接读取对应任务；目录 discovery 对无关坏 entry 隔离并输出有界诊断，命中任务直接读取仍严格拒绝。

MVP 不新增 source recover CLI/API，不做自动死 owner 解锁。unknown 无可验证终态时是显式阻塞，返回记录路径和人工核查提示；用户确认 provider 已结束后才能进行另外授权的 runtime 记录处理。不得用 `worktree.py recover` 处理 source 记录或暗中删记录。此限制在用户文档中直说。

## 6. 上下文、共享提醒与 review base

source 使用 `buildTaskContext({executionRoot: source.root, taskDir, role})`，然后由 `assembleDispatchPrompt()` 构建真实 header，保留字节预算、完整标记及遗漏加载提示。任务记录缺失/路径非法属于派发门禁失败；材料截断不伪装 complete，沿用子 agent 补读协议。

每次 source prompt 的动态执行说明加入：

> Shared directory: Other agents may be working here. Stay within your assigned scope, preserve unrelated changes, and report overlapping edits to the main agent.

返回真实 agent ID、`mode: source`、cwd 和：

> Shared source directory — no filesystem isolation. Coordinate overlapping edits.

managed 结果可加 `mode: managed` 作为增量 details，保留 bindingId/cwd。source 不自动把当前 HEAD 当作 Review base：它不能代表任务开始点，会导致检查漏掉已提交阶段。主 agent 的 review prompt 应明确供给已验证 checkpoint/base；未供给时仍遵守 reviewer 报告 committed history 未覆盖的原契约。

现有 `inheritDispatchTask()` 保持独立 child key、不 start/hooks、不修改父 pointer。不改普通 Agent 的原有未绑定允许/已绑定拒绝契约，统一入口是推荐路径，不扩大对第三方 RPC 的拦截。

## 7. 提示、文档与资源一致性

预计修改：

- `lib/subagent-rpc.ts`：共同校验/两路径/stop、返回与生命周期。
- `lib/source-executions.ts`：source 记录 owner；`lib/executions.ts` 仅确有共用需要时局部抽取，不改变 managed schema。
- Python `records.py`、`manager.py`：同任务 source execution 与 create/adopt 互斥。
- `extensions/trellis.ts`：主 overview 从 managed-only 改为按绑定路由、保持渐进式协议引用。
- `docs/dispatch.md`、`docs/index.md`、README、`docs/worktree-execution.md`：统一入口、两路径及 unknown 限制。
- `skills/trellis-meta/references/platform-files/agents.md` 和必要的 before-dev/start 边界句：与入口一致。
- `resources/templates/workflow.md` 只调整包模板的派发路由说明，不触碰项目 `.trellis/workflow.md`。
- `resources/runtime-baseline.json`：Python/template/skill 改动的实际受管 hashes 和 content-derived release，与同阶段耦合维护。

当前 bundled agents 已支持真实 execution root、独立会话、无 Review base 时明确历史覆盖限制，不需要为提醒修改生成 role 文档或 `scripts/sync-agents.mjs`。短提醒动态注入，不引入 agent provenance 更新链。若实际检查发现有冲突，先说明新增范围再调整。

## 8. 验证与失败边界

默认 fixture 测 source 实际 RPC cwd/off、未提交材料、parent pointer preservation、同任务拒绝/不同任务并发、严格持久化、stop/early/shutdown、创建竞态；managed 回归覆盖材料版本、final recheck 与 snapshot。

可选 provider harness 扩展统一工具 source 分支与现有 managed/public RPC，使用临时配置和 faux offline model，明确不是在线模型服从性或 OS sandbox 验证。安装/真实项目 worktree/reload 不作为测试前提。

回退方式：保留旧 managed schema，source 记录独立 namespace；若产品阶段出现回归，停止后续执行并做新的 scoped fix，不重写 commit 历史、不回滚其他 agent 代码、不自动删除 unknown 记录。
