# 技术设计：Worktree 材料同步与渐进式执行协议

## 1. 目标与边界

以 10-13-worktree-empty-strings 的原生 Python CLI 为基线，仅覆盖新创建/prepare 的 worktree。Python 是管理、材料选择、冲突及新鲜度规则的唯一 owner；TS 保留 Pi RPC、lease、动态材料呈现和上下文展示。用户入口为 python3 .trellis/scripts/worktree.py，派发/停止为 trellis_dispatch。

不做旧 worktree 快照迁移、legacy baseline 或历史记录兼容。不能把研究中的兼容建议重新引入实施。不改项目 workflow.md/provider，不恢复 trellis_worktree，不自动管理任务生命周期或进行 Git 集成。

## 2. 渐进式协议发现

包内新增 docs/worktree-execution.md；插件用 import.meta.url 解析实际可读文档路径，管理命令仍使用固定项目入口。不额外部署项目文档或修改用户 workflow。

收敛 renderOverview 现有 CLI 两行为约 3–4 行：管理入口、dispatch/stop、主会话留源目录/禁止临时 isolation、首次受管操作前读取协议。缺 CLI/文档显示短诊断，不自动安装。协议按首次执行、检查、刷新、收集和错误处理分节；参数细节引用 CLI help，不在多个入口重复维护完整教程。

有效 Trellis 派发事实及会话角色用于区分子代理，不能用 hasUI 判断（无 UI 主会话也需指引）。角色识别影响展示，不是权限证明；角色首次识别/变化使对应 overview 缓存失效。子代理不收到管理教程，只保留执行 task/root/context/版本及角色边界。不得改变独立子会话指针和 taskBySession 的不复活语义。

renderWorkflowSection 保留项目来源，renderState 保留任务/阶段/绑定事实；动态材料版本只进入派发/执行记录，不放稳定 system 前缀。工具描述和错误给短原因/下一步，必要时引用同一文档。

## 3. 材料模型

复用 materials.py 现有 task-local 选择和完整验证。材料图包括 task.json 要求投影、PRD、存在的 design/implement、两份 JSONL 及明确 task-local 引用。外部引用只验证固定基线，不复制；不扫描其他任务、业务代码或凭据。collect 候选仅当前任务内有界研究/证据与可回收文档，明确选文件才复制。

首次 prepare 成功时建立源 runtime 内私有、有界 JSON 快照，binding 保存短 descriptor/revision。快照只存路径/选择集合/哈希，不存全文；Python 统一 canonical hash，TS 消费 opaque fingerprint。首次实际复制后的 start/hooks 若造成目标变化，保留为目标分歧，不追认为源已批准内容。

必须区分 accepted source（最近显式接受的源要求）和每文件共同祖先 B。保留目标单侧修改时不能把它升级为共同祖先，否则下次源更新会误覆盖。缺失与空文件分别表示。

普通文件按原始 bytes；task.json 为要求投影，排除 branch、worktree_path、status、completedAt、commit、pr_url。身份 id/name 不自动修改；base_branch、meta 和未知字段纳入投影。源/目标 status、目标 branch/context 仍独立校验。refresh 更新目标要求投影时保留上述运行/生命周期字段；collect 永不回写 task.json。无需字段级文本合并。

## 4. refresh

新增 CLI refresh --task <task> [--confirm] [--json]。沿用现有预览/确认契约，确认在 source lock 内重新计算全部计划；预览不是持久预约。不新增 token/--expect 协议。外部文件可能变化的限制必须明确，写入前逐文件重查，不以锁宣称编辑器已被锁住。

B/S/T 整文件规则：两边不变 no-op；源单侧变化更新目标；目标单侧变化保留并报告；S=T 接受收敛并推进 B；双方不同改动冲突，整次写入前拒绝。不做自动文本 merge 或 force。

新引用复制明确 task-local 文件；目标同名不同且无 B 报冲突。移除引用但源文件存在时保留目标并记录 detached，不把移除清单当删除研究成果。源真的删除、目标未改时可预览删除；目标已改保留为 orphan。仍有任一角色引用缺文件则要求图无效。外部规范/代码差异必须明确协调，不能只刷新哈希就继续执行旧规范。

preview 用内存文件 overlay 验证拟应用后的清单和任务图，不能临时写目标或运行 start/hooks。active/unknown 阻断刷新。confirm 先全量验证、再逐文件安全写入/删除，保留 mode，重查 before hash/路径；不删目录树。刷新不 rerun start，不改指针或业务代码。多文件中途失败保留现场/旧快照并记录 error，阻断派发，不自动回滚。

成功后发布源权威快照/revision，目标 marker 只携带关联信息。接受要求或引用变化即使目标字节未变也推进 revision；真正 no-op 不必推进。不把保留目标分歧假装同步收敛。

## 5. collect

新增 collect --task <task> [--file <当前任务相对路径> ...] [--confirm] [--json]。无 file 只列有界候选，confirm 必须显式选择；不支持 glob/目录/--all，不收 task.json/runtime/外部文件/二进制或环境凭据。

逆向整文件三方判断：源未变、目标改动可收回；源已变目标未变保留源；相同幂等；双侧不同冲突，不覆盖。新目标产物仅源缺失或相同时允许收集。缺失目标文件不能传播为源删除。

清单引用新增依赖必须同时显式选中或源已有匹配内容；内存 overlay 校验拟应用源图，缺依赖整次拒绝，不偷偷复制。未选要求的源漂移不能被收集过程擦除。执行材料收敛更新对应祖先/版本使旧验证失效；仅收集未引用报告不追认新 check。目标 task 是执行副本；主 agent 在源任务收集/审核后通过批准的 Git 集成和唯一归档步骤收尾，collect 自身不提交/合并/归档。

## 6. status/query/dispatch 与验证

Python query 返回有界 summary：revision、source/target fingerprint、源漂移、目标变化、冲突、引用增删和省略计数，不能因输出截断宣称判断完整。受管 ready query 校验快照、源要求与 accepted source 一致、完整目标图及原身份/context/状态。

目标单侧修改报告但不另增角色级禁用矩阵；本任务优先检查源批准要求漂移与双侧冲突。角色仍须遵守批准范围；需求变更由主 agent 审阅，不由快照自动批准。

宿主初次 query、ping、source lock 内最新 query、render、最终 fingerprint 重查，再记录 starting/spawn；最新查询版本进入动态派发头与 execution record。调用者伪版本不能作为依据。保留真实 agent ID、cwd/off、stop 与 early terminal/shutdown unknown 行为。

check 当前性同时看 final checkout snapshot、本次材料 revision 和当前源无漂移/冲突。源更新尚未 refresh 或 refresh 仅接受新版本都使旧 check stale，不更改其 completed/report。目标变化由 checkout 指纹补充判断；已有大文件/排除目录限制必须如实说明。不能为 terminal 回调引入不受锁约束的异步材料写入或自动追认要求。

## 7. 失败、范围与回滚

复用路径、JSON/UTF-8、数量/大小、symlink 与 source lock 校验；快照 schema 严格且输出有界。快照发布与多文件写入非跨目录事务。删除 worktree 清理本任务新建的关联快照，仅在原安全 remove 成功后，不删除其他绑定内容。

不增加执行历史系统、文本 diff3、旧快照迁移、自动基线协调、完整 shell 沙箱或额外 provider 控制面。回滚保留目录/分支/材料及诊断，禁止 reset/force/remove 用户成果。

## 8. 审阅状态

用户已批准最终设计与实施，产品实现已完成；独立 check 在 `research/check-results.md` 记录修复与实际验证，最终验收和生命周期由主会话处理。无旧 worktree 兼容范围。
