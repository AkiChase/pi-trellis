# 最小发布规则设计

## 设计决策

采用“完整行为流程、最小修改面”：一个workflow模板定义通用契约，两个skill分别承担核验与收尾责任。仅三个规则文件，不修改角色、派发提示代码、runtime或项目应用副本，不新增机制/配置/文件。

## 材料生命周期

```text
系统临时目录（仓库外、本次执行自有）
  采集原始日志/事件/画面/driver/hash
       ↓ 失败则诊断并复测，不提前删除
  子代理返回简明结果 + 必要临时路径
       ↓ 主会话实际核验，不为了交接复制入仓
  精选长期结论 → implement.md / 可选最小evidence
       ↓ 无活动进程使用、归属及授权明确
  清理自有临时目录，准确报告残余/保留原因
```

临时路径用于执行期间的检索与交接，不是长期证据链接。最终正式记录自足：包含环境、命令、退出、结果、失败原因/修正/复测关系及未运行限制。错误处理要求保留事实，不要求永远保全全部raw。

未解决/难复现诊断可以继续保留临时材料，必要的最小脱敏片段可由主会话选择入evidence；不得擅自丢弃仍需要的原始内容。清理沿用既有执行/收尾授权，不能扩大为清历史或其他会话。无法确认权限/归属、进程仍使用、清理失败均报告并保留，不调用未经批准的自动机制。

## 三文件职责

### resources/templates/workflow.md

在现有Task Material Boundaries集中定义上述默认与例外，明确evidence是精选长期区而非运行输出目录。2.1委派段简短要求默认外置和结果返回，不重复制整个生命周期。3.4/3.5在任何可能提交task目录前提醒检查新增及未跟踪材料；不改stage commit、auto_commit或archive语义。

### skills/trellis-check/SKILL.md

在现有Task Material Boundaries checklist改写“报告放evidence”项为“有需要持久化才放evidence”，核对临时默认、失败事实和最终记录自足性。保留source授权、历史材料保护及真实/模拟验收分层。

### skills/trellis-finish-work/SKILL.md

在现有提交范围审查附近加入人工留存检查：确认最小集合、合并重复报告、在权限及归属可证时清理自有临时目录。先确认不再被活动进程使用；保留/失败/残余明确报告。不改命令、自动提交配置或禁用策略，不要求逐文件重复向用户确认已授权清理，也不授权陌生目录删除。

## 配套与所有权

仅 `tests/workflow-policy.test.mjs` 新增一组合同检查，验证上述职责和原生命周期授权边界。`resources/template-baseline.json`只更新workflow输出hash；`resources/skill-baseline.json`只更新check/finish输出hash。source hashes/license/origin与其余entries不变；不改agent-baseline。

项目 `.trellis/workflow.md`、spec/config/manifest/scripts 和 `.pi/agents`只读。发布模板由Trellis apply应用，当前任务不对真实项目执行apply；既有apply/manifest tests在一次性fixture中作为兼容回归即可。不改已安装技能来激活效果。

## 风险与限制

规范不能技术保证所有Agent遵从；用户明确不需要工具兜底。主会话仍负责具体派发提示与最终筛选。本任务自身测试日志必须外置，不能以验证留存策略为名再次生成批量附件。无真实终端/在线provider测试需求。
