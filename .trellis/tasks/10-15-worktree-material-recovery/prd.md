# Worktree 权威材料来源与派发恢复

## 目标与授权

取消 managed worktree 的任务执行副本。主 worktree 是任务与规范的唯一权威来源，子 worktree 只承担代码/测试执行；派发提供任务身份、绝对来源路径与职责，子 agent 直接完整读取源材料，不依赖正文注入或目标旧副本。

2026-10-15 用户已审阅最终三份规划并明确要求“开始执行吧”，批准按本方案实施；任务已正常 start 为 in_progress。允许最小修正本仓库 development spec 中不符的契约。保留不部署/安装/reload/push/归档边界。

## 背景与证据

- `runtime/pi_trellis_worktree/manager.py` create 用 git worktree add 从 commit 创建，不复制源未提交内容；prepare 调用材料复制及目标 task start。
- `runtime/pi_trellis_worktree/materials.py:267-341`：复制当前任务材料，修改目标 task.json branch；外部 spec 要求源/目标一致。任务文件不是忽略的 runtime，复制可能产生 untracked/modified。
- `materials.py` 的 refresh/collect、accepted graph 与 ancestry 用于协调两份任务材料，增加漂移与冲突负担。
- `lib/task-context.ts:136-160,226-247`：implement/check 加载角色 JSONL，research 不加载 manifest；当前按预算注入正文及完整标记。
- `extensions/trellis.ts:776-796`：当前子会话按执行根解析任务并绑定目标 pointer，需改为明确的源权威任务身份。
- 直接用软链接替换 Git 跟踪的 `.trellis` 或 spec 会产生删除/链接差异；临时 Git 探针确认简单 sparse-checkout 排除后也不能保证 git add -A 无污染，因此不采用复制/软链接布局。

## 已决定的需求

### R1 单一权威来源

任务、规范、角色 manifest、项目 workflow 从绑定的主 worktree 读取；代码、测试从子 worktree 读取/修改。项目相对材料引用以主根解析，代码执行以子根解析；source 缺失或路径无效不回退到目标 .trellis。

### R2 路径派发，直接读取

派发只注入任务身份、sourceRoot/materialRoot、绝对 taskPath/specRoot、executionRoot、role、独立 context id、必读顺序及本次职责。不注入完整材料正文，不使用“已完整注入”标记，不以 prompt 预算为由遗漏必读材料。子 agent 分页读取完整源文件及本角色 JSONL 所列材料；research 读取任务 artifacts，不要求 implement/check manifest。

### R3 零执行副本与Git污染

prepare 只验证身份、权威材料及执行配置，登记忽略的运行状态；不复制任务/spec，不改目标 task.json，不在目标执行 task start/hooks。目标从 Git checkout 自然存在的 .trellis 保持原样，不用于本任务权威解析。不使用 symlink/sparse/skip-worktree/assume-unchanged 掩盖变更。准备前后目标 git diff/status 相同（忽略的 runtime 除外），代码提交不夹带 Trellis 执行设施。

### R4 主子职责

默认主 agent 维护任务/规范/生命周期，子 agent 改代码测试并返回结果、证据和规范建议。研究角色按明确授权可写源任务 research；其他材料写入必须单独明确范围。角色不能自行扩大需求/start/归档/提交；读权限或派发任务身份不等于写授权。工具/指引不是OS沙箱。

### R5 校验与主动恢复

按角色验证源必需材料，不因另一角色 manifest 过时阻断本次。缺失路径给源位置/JSONL行号和可操作诊断；主 agent 在已有维护授权内核实映射、修复源引用、再派发，不再同步两份材料。真实冲突/范围变化/未授权操作才请求用户决定。

### R6 执行与证据

身份/同仓库/分支/占用/锁/兼容配置/public RPC/unknown lease 保持；派发前拒绝不启动，spawn未知不自动重复。记录源要求指纹与目标checkout状态，主 agent 验收前复核；运行中要求变化不是自动中止，也不能假装子 agent 已读到更新。源头完整可读不证明 agent 实际完整阅读，验收需子结果/测试与主审查。

### R7 直接替换旧设计与文档

当前仓库仅主 worktree，权威 bindings 目录无绑定记录；不实现旧绑定/旧材料快照兼容，不提供迁移或转换命令。直接删除双副本 refresh/collect 与 ancestry 实现，采用新的严格 binding 契约。意外遇到旧格式或未知记录明确拒绝，不自动转换/清理。产品/技能/模板/中文docs/英文spec一致；不自动覆盖用户 workflow 或部署副本。包内 `agents/trellis-*.md` 直接作为权威角色源码维护，删除 `scripts/sync-agents.mjs` 再生成模式；角色历史来源和AGPL声明保留。现有 `/trellis-init` 资源发布功能不变，本任务不实际更新项目资源。

## 验收

- A1/R1-R2：目标存在过时甚至缺失任务/spec，子 agent仍读取源权威文件；源码缺失明确拒绝，无目标fallback，无完整正文注入。
- A2/R3：create/prepare/dispatch不新增目标 tracked/untracked管理文件、不改目标task.json、不start/hooks；git status/diff前后不变；产品提交只含实施内容。
- A3/R4-R5：实现/检查只读源材料；研究明确范围写源research；默认子角色不更新生命周期。源旧引用可由主维护后重试，不执行refresh/sync-spec。
- A4/R5-R6：另一角色失效不阻断；本次角色无效spawn=0；prompt组装时要求变化拒绝；spawn unknown不重试。
- A5/R6：验收识别源要求和代码变化导致的证据过时；最终fingerprint不是agent阅读证明，不报告伪独立验收。
- A6/R7：无旧绑定转换/双模式分支；refresh/collect与双副本快照代码、参数及旧语义测试移除；未知或旧记录明确拒绝，正常身份/占用保护保持。
- A7/R7：源码/资源hash/技能/docs/spec一致；角色测试不再依赖生成器，历史source hash/来源保留、adapted hash匹配直接维护的包内角色；项目 `.pi/agents/` 不直接修改，初始化发布入口不变。本轮产品源码不被planning修改。

## 范围外

spec复制/同步/软链接、通用Git同步、目标任务生命周期、自动merge/rebase/安装/升级/部署/归档/清理、自动phase推进、spawn未知重试、批量历史任务重写。旧 sync-spec 与 snapshot2双副本方案已废弃，不是实施依据。

## 技术验证

细化源身份如何传入子扩展和bash、源runtime兼容与目标运行配置责任、按角色指纹与阅读前后变化。旧绑定迁移明确范围外。见 design/implement；这些是技术研究，不改变已决定的产品方向。
