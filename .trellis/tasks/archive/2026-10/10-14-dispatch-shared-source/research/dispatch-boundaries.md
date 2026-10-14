# 派发边界只读研究

## 当前 owner 与证据

- `lib/subagent-rpc.ts:registerDispatchTool`：query ready 无条件要求 binding；common role config、ping、locked query、material recheck、starting/early/unknown/stop 目前全与 binding 耦合。
- `runtime/pi_trellis_worktree/manager.py:query`：ready 才检查 source task in_progress；非 ready 查询可确认无 binding，损坏/身份错误传播。因此 source 分支须单独 `readTaskRecord` 校验状态，不能把 query(false) 当成 approval。
- `manager.py:manage` create/adopt：确认使用共享 source lock；锁内只检查新 binding，没有 source execution 概念。仅 TS 最后检查不能阻止 child 运行后新建同任务 worktree；需要新增同 task source active 检查。
- `lib/bindings.ts`：可复用 runtimeDirectory/atomicJson/acquireBindingLock；绑定 schema 不用于包装 source execution。
- `lib/executions.ts`：managed path execution-<bindingId>.json 与 WorktreeBinding 强耦合，source 单独 namespace 更小也兼容 Python 既有 managed v1。
- `extensions/trellis.ts:inheritDispatchTask/before_agent_start`：独立 pi-child key 覆盖 parent env pin，set_active_task 不 start/hooks。source 同目录可直接复用。
- `agents/trellis-check.md` 已要求 supplied Review base 才包含对应 committed history；source 自动使用当前 HEAD 会漏历史，不应新增。
- `tests/provider-contracts.mjs` 现有 real parser/runner + direct public RPC 不是 `trellis_dispatch` 工具集成，应新增 source 工具链而非重贴 PASS。

## 设计决定

没有 binding 才选择 source；已绑定或损坏不回退。source 按 task 锁定活跃执行，不独占目录。unknown 不用 owner PID 死亡当作 child 结束证据；MVP 不新增 recover，跨会话 stop 找不到 ID 明确失败。source/managed 身份和 schema 不混用；只复用 lifecycle 的共同机制。

## 审查重点

请求/真实 ID 的 correlation、早到 terminal、shutdown in-flight、stop 成功但未终态、跨会话磁盘记录、安全 regular path/坏记录、dispatch/create/adopt 同锁竞争、不同任务并发，以及 scoped index/父 pointer 保存。新版代码在本轮尚未实施，文档里的目标行为不是已验证结果。
