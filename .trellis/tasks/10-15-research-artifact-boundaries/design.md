# 设计：任务材料边界

## 最小改动

以 workflow 材料分类为主契约，角色重复必要写入边界，check skill 负责复核；collect 只执行可可靠判断的扩展名与既有安全约束，不推断 Markdown 内容及作者。

## 材料流

research agent → research/<topic>.md → 主会话核对 → design/implement 整合采用结论。
implement/check/主会话 → 必要 evidence 报告或日志 → PRD/implement 引用 → review 核对。
轻量结果可直接记 PRD，普通临时运行文件留临时目录。

## 实现落点

- `resources/templates/workflow.md`：在现有材料章节新增分类与主会话边界；对应更新本项目 `.trellis/workflow.md`，保留用户内容和 phase/breadcrumb。
- `scripts/sync-agents.mjs`、`agents/trellis-{research,implement,check}.md`、`resources/agent-baseline.json`：按现有生成模型加入写入限制，保留源文本与许可。适用时同步本项目 `.pi/agents/`，先验证不是自定义输出。
- `skills/trellis-check/SKILL.md`：增加材料检查项，不要求清理历史。
- `runtime/pi_trellis_worktree/materials.py:collectible()`：research 与 evidence 分开判定；保留后续安全逻辑。针对格式拒绝提供清晰诊断。
- `tests/python/test_worktree.py`、`tests/material-sync.test.mjs` 与现有资源合同测试：补正反例，不将普通测试报告继续命名为 research 产物。

## 兼容性

不收紧通用上下文读取、material graph 或 refresh 的历史文件格式；只收紧未来 collect 的 research 路径资格。历史非 Markdown research 文件留原位；collect 预览忽略、显式收集拒绝。不更改任务 schema、JSONL 格式、dispatch 协议或 evidence 白名单。

不创建新权限层；角色约束不是 shell sandbox。规则不能证明作者身份，review 不得将扩展名校验描述为身份验证。

## 资源发布与回退

实施前读完整生成器、资源来源及 provenance 测试；必要 runtime 哈希与代码同阶段更新。部署 runtime 仅通过本项目受支持、授权的资源流程处理，不能手改部署副本。本次不安装、不同步已安装包、不重载。保留所有自定义及并行文件；出现生成/部署冲突报告，不覆盖。

回退只涉及本任务 scope，不改历史任务，不自动 git reset/revert 或重写提交历史。
