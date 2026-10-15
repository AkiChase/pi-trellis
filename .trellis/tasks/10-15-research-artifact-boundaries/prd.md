# 明确 research 与任务证据的目录边界

## 目标

让 `research/` 只承载 research agent 的研究结果，不再作为通用任务附件目录；为实施、审查和验证材料明确归属，并以最小运行时约束防止格式混用。

## 背景与证据

- `.pi/agents/trellis-research.md:25–36,76–89` 规定研究结果持久化位置和 research agent 的写入范围，但没有形成全局目录独占契约。
- `.trellis/workflow.md:17–30` 定义规划材料与 JSONL，未定义研究、实施报告及测试证据的分类。
- implement/check 角色及 `skills/trellis-check/SKILL.md` 缺少非研究产物不得写入 research 的规则与检查项。
- `runtime/pi_trellis_worktree/materials.py:618–625` 对 research/evidence 使用相同的文本扩展名白名单；`tests/python/test_worktree.py:171–173` 已有基础 collectible 测试，`tests/material-sync.test.mjs:62–82` 覆盖 collect 预览与写入。
- 角色生成由 `scripts/sync-agents.mjs:adaptAgent()` 维护，不能仅手改生成角色而遗漏生成器及来源哈希。

## 授权与状态

用户认可补齐方案，并明确历史任务无需清理，随后授权“开始实施吧”。当前 in_progress，主会话直接实施并自检，独立审查完成后按 workflow 做 scoped local commit。历史任务不做迁移、删除、改名或引用修复；无安装、已安装包同步、重载或生命周期授权。

## 要求

### R1 全局材料分类

在 workflow 的现有材料章节定义：PRD 保存目标、范围、验收及授权边界；design 保存设计；implement 保存阶段计划、进度、提交检查点及证据链接；research/*.md 只保存 research agent 的研究结果；evidence/ 保存有复核价值的实施、审查、测试与验收证据；角色 JSONL 仅精选上下文引用。

禁止 research 存放实施总结、进度/授权记录、审查报告、测试日志、截图与临时脚本。evidence 也不是任意附件箱：不强制生成报告，短结果可直接记 PRD/implement；临时文件放临时目录，长期保留材料必须有复核价值。

### R2 角色与主会话边界

research agent 保持只写自己的 research/<topic>.md，采用现有研究格式与引用/不确定性要求。implement/check 持久化报告时使用 evidence，不得写 research；主会话同样遵守，不冒充 research agent 输出，负责核对研究并整合采用结论。无任务只读探索不要求建任务或落盘；有任务的主会话分析整合到 design/implement，需保留的原始证据放 evidence。

### R3 检查项

在 check skill 加入新增任务材料的分类、复核价值、敏感信息、临时文件与重复内容检查。计划引用证据而不反复复制整份报告。发现历史混用只报告，不自动清理。

### R4 Collect 格式边界

research 仅允许 .md；evidence 保留当前 .md/.txt/.json/.jsonl/.csv/.log 白名单。保留固定规划文件、路径/任务范围、安全、UTF-8、NUL、冲突、依赖选择与不传播删除等现有保护。目录作者与内容语义由角色规范及 review 保证，不声称 collect 可以鉴别作者，不增加作者登记、签名或语义识别系统。

### R5 资源与兼容性

同时覆盖包内 workflow 模板、角色生成来源/输出、check skill 与 collect 实现/测试；本项目 workflow/roles 的应用遵守用户内容与资源 provenance 规则，不直接修改部署 runtime 绕过发布哈希。规则只约束后续产物；历史非 Markdown research 文件仍可读取，未改变的历史任务不因本次规则被自动拒绝或改写；显式 collect 非 Markdown research 文件会拒绝，并说明应使用 evidence。

实际实施范围额外纠正现有 `.trellis/spec/testing/index.md` 与 `tmux.md` 各一句 research 保存结果/日志/终端证据的冲突规则，并同步 `resources/skill-baseline.json` 中 check skill 的单项 hash；两者均为现有契约一致性维护，不新增规范文件。

## 验收标准

- [x] A1（R1）：workflow 模板与本项目 workflow 明确全局目录职责，且轻量任务不被迫新增报告。
- [x] A2（R2）：三个角色与主会话规则一致；角色生成器、输出及必要 provenance 同步，不覆盖自定义角色。
- [x] A3（R3）：check skill 明确检查新增材料及禁止自动清理历史。
- [x] A4（R4）：research Markdown collect 成功；其余文本格式预览不列出、显式收集拒绝；evidence 的既有六种格式保持可收集。
- [x] A5（R4/R5）：安全与冲突回归通过，历史引用的正常读取不被收紧；未收集违规文件不被移动或删除。
- [x] A6（R5）：相关资源/生成回归与全量可用测试覆盖最终版本；历史任务及无关文件不变，准确报告未运行项。

## 不在范围内

历史任务清理；新建额外专用规范文件；通用附件管理系统；作者身份硬鉴权；内容语义自动分类；强制报告/截图；第三方 agent 修改；安装、同步已安装包、重载、push、归档或会话记录。
