# 统一 Trellis 派发入口，支持共享主目录

## 目标

让 `trellis_dispatch` 成为 Trellis role 的统一派发入口。未绑定 managed worktree 的任务可以直接在主工作目录执行，不再为了使用该工具被迫创建隔离目录；已绑定任务继续遵守 managed 执行协议。

## 授权与状态

- 用户已授权创建任务及完善规划，随后明确“开始做吧”批准上述两阶段方案实施与 scoped local checkpoints。
- 当前阶段为 in_progress；不 push、安装、个人 sync/reload 或归档。
- 用户认可不同任务可以派发到同一主目录，修改范围由主 agent 协调，不宣称文件系统隔离。
- 用户要求共享目录提醒简短，不采用长段警告。

## 已确认的代码事实

- `lib/subagent-rpc.ts` 当前在派发前无条件查询 ready worktree 并要求 binding，无绑定任务无法派发。
- `lib/worktree-query.ts` 可以查询任务绑定；managed readiness/material 校验应只用于已绑定路径。
- `lib/task-context.ts` 提供 `buildTaskContext()` 和 `assembleDispatchPrompt()`，可复用主目录当前材料，包括未提交内容。
- `extensions/trellis.ts` 的 `inheritDispatchTask()` 为子会话创建独立 key 并绑定任务，不需要重新 start 或运行 hooks。
- `lib/executions.ts` 的现有执行记录和 stop/occupancy 与 managed binding 耦合，不能仅删除无绑定报错。
- `tests/dispatch.test.mjs` 已覆盖 managed readiness、真实 ID、目录占用、早到完成事件、shutdown、stop 和材料漂移。

## 范围与要求

### R1：自动选择执行目录

保持现有 `{ agent, task?, prompt }` 调用形状，不新增任意 cwd 或 isolation 参数。

- 无 managed binding：在主工作目录派发，RPC 使用 `isolation: off`。
- 有 binding：在绑定目录派发，沿用 ready、材料 freshness 和 occupancy 校验。
- binding 未准备、损坏、不可验证或存在材料冲突：报错，不回退主目录，也不自动创建/prepare worktree。

### R2：任务上下文与会话边界

两条路径共享 runtime、adapter、角色定义和任务合法性校验。主目录读取当前任务 PRD、可选设计/实施计划及 role JSONL 引用；保留完整/截断材料加载契约。子 agent 使用独立 session，不改变主会话当前任务，不运行 start/hooks，不伪造 managed binding、材料 revision 或 managed check currentness。

### R3：共享目录执行与停止

- 不同任务允许同时派发到同一主目录；不增加全主目录单 agent 占用锁。
- 同一任务暂不允许重叠派发，保持实现后检查的顺序。
- 主目录路径记录 task、request ID、真实 agent ID 和执行状态；不借用假 worktree binding。
- `action: stop` 按任务定位实际执行，停止请求不是终止证据。
- RPC 超时、shutdown 或不确定启动不直接标记 completed；source 记录独立持久化，跨会话 stop 只能请求 provider 停止，终态事件才释放占用。
- MVP 不新增 source recover 命令或自动死 owner 解锁；无法获得终态证据的 unknown 保持阻塞，明确返回记录路径供另外授权的人工核查。
- 同任务 source 活跃执行期间拒绝 create/adopt（preview 和锁内确认都检查），防止运行中切换为 managed 目录；不同任务不受影响。
- 文件范围由主 agent 分配；工具不能保证普通 Agent、其他会话或手动进程不存在并发，也不提供 OS 沙箱。

### R4：简短共享目录提醒

每次主目录派发都加入子 agent 上下文，不依赖其他 agent 活动检测：

> Shared directory: Other agents may be working here. Stay within your assigned scope, preserve unrelated changes, and report overlapping edits to the main agent.

工具返回给主 agent：

> Shared source directory — no filesystem isolation. Coordinate overlapping edits.

结果明确显示执行目录及真实 agent ID。managed 路径继续使用自己的目录占用说明，不混用主目录提醒。

### R5：文档与模型提示

同步工具 description、session overview、README 和相关包级 role/skill 说明，避免继续将 worktree 当成必选步骤。功能说明放根目录 `docs/`，不放 `.trellis/spec/`，不重写用户维护的 `.trellis/workflow.md`。

## 验收标准

- [ ] AC1：无 binding 的合法任务成功派发，RPC cwd 为主目录、isolation 为 off，返回真实 ID。
- [ ] AC2：主目录未提交任务材料被正确注入；子会话独立绑定且不修改父指针。
- [ ] AC3：已绑定且准备完成的 managed 派发保持原行为；未准备、损坏或冲突不回退。
- [ ] AC4：不同任务可以在同一主目录并发派发；同任务重叠执行被拒绝，不引入目录级独占。
- [ ] AC5：source/managed 两条路径的完成、失败、stop、早到事件、超时和 shutdown 有明确测试；跨会话 stop 不因成功回复释放占用，unknown 不自动恢复；同任务 create/adopt 与 source 预留互斥。
- [ ] AC6：source 路径每次注入上述短提醒，结果显示主 agent 短提示；managed 路径不混用。
- [ ] AC7：工具说明和包级文档一致；不自动 create/prepare、start、推进阶段、提交、安装或清理。
- [ ] AC8：现有 managed 回归及完整项目测试通过；真实 provider 验证与模拟 RPC 证据分别记录。

## 不在范围内

- 修改 pi-subagents / agent-tasks 或其公共 RPC。
- 临时 worktree isolation、自动创建 worktree、已绑定任务的 source fallback。
- 文件系统沙箱、文件级锁、自动检测/合并/回滚其他 agent 改动。
- 支持任意用户指定 cwd、同任务多 role 并行或新的派发工具。
- 自动迁移旧 managed worktree 或改写项目定制 workflow。

## 规划就绪与实施门禁

`design.md` 已补齐 source 记录身份/独立存储、跨会话 stop、unknown 保守阻塞、绑定变化重查及 create/adopt 竞态处理。`implement.md` 拆分两阶段及独立审查/本地 checkpoint，`check.jsonl` 已准备 spec/research 引用，主 agent 直接实施的 `implement.jsonl` 有意为空。

无阻塞产品问题。source unknown 不新增自动恢复接口，是 MVP 的明确限制；需要人工核查而不是猜测子进程终止。用户已批准实施并 start，当前执行阶段 1，独立审查与最终验证进行中；尚未提交。
