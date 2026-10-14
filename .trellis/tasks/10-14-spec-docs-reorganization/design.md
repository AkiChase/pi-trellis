# 第二轮文档精简设计

## 内容与目录
主要结构：
```
.trellis/spec/
  index.md
  development/index.md
  testing/index.md
  testing/tmux.md
  guides/index.md
  guides/code-reuse-thinking-guide.md
  guides/cross-layer-thinking-guide.md
```
后面三份暂为兼容路径：技能固定读取 guides/index；其余两份保短检查项/指向实际规范，避免改技能/模板或破坏旧引用。不是要求每项都有独立说明，不保额外 scripts/extension/documentation/worktree 手册。执行时以有效约束清单审查提炼结果，而非凑文件/行数目标。

根 index 只说明正文位置、适用场景与职责，development/index 合并源布局/所有权/编码/跨层安全/文档维护；testing/index 包含测试命令、环境隔离、断言/回归设计、自然退出与证据、provider 方法；tmux 独立因为操作细节较长。全部 spec 英文，docs 中文。

## 机制依据
- runtime/common/packages_context.py:33–44：直属目录 discovery，不检查 index；根 .md 不列为 layer。
- skills/trellis-before-dev/SKILL.md:25–35 和 start/check：从 layer index 及 guides index 导航。
- lib/task-context.ts 与 runtime/common/task_context.py：显式 JSONL file/directory 选择，无自动全 spec 注入。
- lib/initialization/engine.ts、resources.ts：root/guides 基础模板有固定来源路由；不因本轮 project spec 定制改模板/manifest。

## 基线与产品变更唯一边界
从 Git 已提交 docs/agent-baseline.json 取原字节保存到 resources/agent-baseline.json，不恢复旧 docs 文件。同步 initialization/engine.ts、sync-agents.mjs、agent-documents.test.mjs 中的字面路径，保持读/写/check 校验算法、完整来源/产物 hash 与角色文件不变。检查所有 current refs，归档记录只作为旧路径历史证据。

## 迁移与失败
先整理新规范和文档、建立原约束→新位置映射，再更新活动引用，最后删除旧规范/教程。用户手动删的 plans 保删除；JSON 缺失不代表允许省略安全校验。保原版 in Git，不用 git restore 覆盖并行文件。若 task.json/manifest/其他 session 内容出现并行更改，只选明确自有 hunks，不整目录 stage。

## 风险与审查
最主要风险是精简漏掉安全规则、引用缺失或只改 JSON reader 未改 generator/tests。独立 review 是否必要按实际路径变更与风险决定；如派发，先准备 check.jsonl、明确 review scope，使用批准的管理入口，不为了 review 改 source 或临时 isolation。未获本轮实施授权前不做迁移或派发。
