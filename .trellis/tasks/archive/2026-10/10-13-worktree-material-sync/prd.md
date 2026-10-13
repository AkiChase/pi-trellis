# 完善 Worktree 材料同步与渐进式执行协议

## 目标

让主 agent 按需发现受管 worktree 的正确执行方式，并保证子代理依据已批准且未过期的任务材料执行；明确材料从首次准备、需求更新到收尾收集的边界。

## 基线与已确认事实

- 以 `10-13-worktree-empty-strings` 的原生 Python 架构为基线：管理使用 `python3 .trellis/scripts/worktree.py`；派发和停止使用 `trellis_dispatch`。不恢复 `trellis_worktree` 注册。
- Python 是管理与 ready 检查的唯一实现；宿主通过 `lib/worktree-query.ts` 复用只读查询。TS 负责 Pi RPC、lease、材料 prompt 和执行结果。
- 首次 prepare 已复制未提交的当前任务材料；ready 后重复 prepare 只验证目标并复用，不同步源更新。
- `extensions/trellis.ts` 的 renderOverview 已注入 CLI 子命令和正常流程。该 overview 主会话与子代理均可收到。
- 项目 workflow.md 由项目维护，只负责开发阶段；插件协议不写入或复制另一套 workflow。

## 范围与需求

### R1 渐进式协议发现

收敛现有 overview 注入，不叠加新常驻教程。主会话只收到少量管理/派发入口、关键边界和插件维护的可读协议文档引用；首次管理或派发受管任务前按需读取。详细顺序、审批、刷新、收集和故障处理放在文档中，参数细节交给 CLI help。受管子代理不接收主会话管理教程，仅保留任务、目录、上下文、材料版本与角色边界。项目 workflow 注入与任务状态提示各守原职责。

### R2 材料归属与显式同步

主目录维护已批准要求，目标 worktree 保存执行副本与研究/验证产物。只处理当前任务和明确引用的任务内文件；不复制业务代码、其他任务、runtime、环境或凭据。task.json 分支、上下文和生命周期不可整文件互相覆盖。禁止后台双向同步。

### R3 材料刷新

在 Python CLI 增加显式 refresh 能力：默认预览，批准后 confirm；运行中或 unknown 执行不得刷新。依据上次同步快照、源当前内容、目标当前内容检测单侧变化和冲突，明确新增/删除/引用集合变化；保留目标单侧产物，冲突不覆盖。刷新后更新快照，旧验证不能继续标为当前通过。

### R4 派发新鲜度

status/query 显示源要求漂移、目标修改及冲突；派发复用 Python 查询，源批准要求发生未同步变化时拒绝执行并说明文件。目标研究/证据变化不一概禁止执行。执行记录携带本次材料版本，保留现有 ready、身份、独立 context、cwd/off 与占用校验。

### R5 收尾材料收集

提供显式预览和冲突保护的目标材料收集方式；主 agent 审核选择研究、任务文档修改和验证证据，不自动回写 task.json/runtime。明确与最终集成/提交及唯一归档位置的关系，防止重复收集。收集不自动提交、合并或归档。

### R6 保持当前接口边界

以新创建并准备的 worktree 为验收对象，不为既有 worktree/旧记录设计材料快照迁移或升级兼容流程。保持当前 Python CLI 与 dispatch/stop 的职责和调用边界，不恢复旧管理工具，不回迁 TS 管理核心。协议文档可被实际安装形态发现，缺 CLI/文档时报明确诊断，不自动安装。

## 验收条件

- AC1/R1：主会话常驻说明约 3–4 行，含可读协议路径；子代理不注入管理教程；不重复污染 workflow/state。
- AC2/R2：未提交 task 首次准备仍可执行，源无关未提交代码和源指针不受影响。
- AC3/R3：预览无写入；确认刷新处理单侧更新、新增/删除；双侧冲突及 running/unknown 拒绝并保留文件。
- AC4/R4：源要求更新后旧材料派发被拒绝；刷新后可派发；目标研究产物保留；执行依据版本可追溯。
- AC5/R3、R4：材料刷新后旧 check 结果不显示为当前有效。
- AC6/R5：收集显式选择并预览；源目标冲突拒绝；不复制 runtime 或执行生命周期操作。
- AC7/R6：新建/准备流程直接建立材料快照；CLI help/严格参数、当前 dispatch/stop 契约和 Python/TS 唯一规则归属不回退。不要求旧 worktree 快照迁移。
- AC8/全部：相关 fixture、全量测试、文档引用和 diff-check 有实际证据；不虚构真实 provider、跨平台或类型检查结果。

## 范围外

不修改项目 workflow.md、pi-subagents/agent-tasks/provider；不使用临时 isolation 生命周期；不强制所有任务使用 worktree；不自动提交/推送/合并/归档/安装/清理；不声称完整 OS 沙箱或双向事务同步；不做旧 worktree/历史记录的迁移、基线补建或兼容策略。

## 实施状态

用户已明确批准最新最终 design.md/implement.md 与实施，源 task 为 in_progress。实现、自检与独立 check 已完成，最终验收由主会话继续；未自行提交、部署、重载或归档。详见 [实施证据](research/implementation-results.md) 和 [独立检查](research/check-results.md)。旧 worktree 迁移仍不在范围。
