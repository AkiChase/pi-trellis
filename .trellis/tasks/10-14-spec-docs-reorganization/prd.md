# 整理文档职责与测试规范

## 目标
精简本仓库长期文档：docs 面向使用者，只介绍插件功能、命令、配置与使用边界；spec 面向开发者，承载开发规范和全部测试方法。减少索引套正文、按内部模块拆规范及重复实现说明，不照搬邻仓 docs/testing 分工。

## 背景与决策
首轮整理已提交 `9414cbb`，历史检查见 research/verification.md；这些结果只覆盖首轮，不代表本轮验收。用户随后明确：测试方法（含 tmux）应放 spec，scripts/worktree-lifecycle 等专题规范过度拆分，docs 只介绍功能。用户已手动删除两份 docs/plans 与 docs/agent-baseline.json；本轮保留 plans 删除决定，但基线 JSON 存在真实运行依赖，不能作为闲置文档直接丢弃。

只读机制研究确认：runtime/common/packages_context.py 的 _scan_spec_layers 只发现 spec 直属目录（排除 guides），不核 index 存在，也不读取正文；skills/trellis-start、before-dev、check 约定读取 layer/index.md 和 guides/index.md。任务派发按 JSONL 显式加载，不自动加载所有 index。根 spec/index.md 属初始化模板路径，保留精简导航；分类 index 直接承载规范正文，不额外套一份正文文件。根 development.md 不会被 layer discovery 发现，故不用此前混合结构。

## 本轮范围
1. 主要规范收敛为 `.trellis/spec/index.md`（短导航）、`development/index.md`（开发规范正文）、`testing/index.md`（测试规范、命令与 provider 方法）、`testing/tmux.md`（完整真实终端测试方法）。不再有单独 development.md/testing.md、scripts/extension 分类或 worktree-lifecycle 专题手册。统一文档维护规则合并到 development/index，不留单独 documentation.md。
2. 保留必要、可复用、源/测试支持的所有权与安全约束；提炼 session、路径、锁/占用、材料同步、失败保留等规则，不机械拼接旧文档，不把内部字段/完整流程手册搬入一份巨型 development 文档。一次性实现解释和历史证据由 task research 承载。
3. guides 是技能明确读取的共享入口，不通过改 package skills/templates/runtime 消除约定。本轮先保留精简 guides/index.md 与既有可用路径，把重复正文收敛为短检查项/新规范链接；最终可能多于上述四份主要规范，不能声称总共仅四份文件。若必须删除 guides 路径或改技能才能达标，另提方案，不静默扩大范围。
4. 将 docs/testing/tmux.md 的隔离、独立服务、已有 CLI、最小矩阵、条件等待、新帧核验、报告与进程清理要求迁到 spec/testing/tmux.md；provider 方法合并 testing/index.md，无额外 provider 文档。spec 英文（包括迁入测试方法），docs/任务材料中文；命令、标识符、引用原文不翻译。不执行真实测试。
5. 精简 docs：初始化、派发、worktree、任务浏览/显示保用途、命令、配置和用户可见限制，移除测试教程、开发检查、内部 schema/hash 算法及实现手册。角色来源/许可证说明保准确必要归属，不能随精简抹去 AGPL/MIT 或 0.6.16/0.6.17 来源差异。docs/index 只导航功能说明；README 维持现有语言与概览角色。
6. 接纳用户删除两份 plans，清除当前 docs/spec/README 引用，不复原计划或批量改写归档证据。
7. 将用户删除的 agent-baseline.json 以已提交内容迁到 resources/agent-baseline.json：字节/hash/字段不改，仅同步 lib/initialization/engine.ts、scripts/sync-agents.mjs、tests/agent-documents.test.mjs 和当前文档引用。原因是 packageResources() 实际读取角色基线，缺文件会破坏初始化/来源测试；此处是唯一计划内产品/脚本/测试路径变更，不改校验或生成算法。
8. 更新受影响活动 JSONL、导航及引用；保并行 runtime-tool-names/其他 session 修改。删除路径前检查实际引用，不能用新增虚假引用绕过检查。

## 不做
不改 runtime/模板/skills/角色、workflow/config、依赖或来源 hash，不新增功能/变更权限和安全算法，不改测试预期来迁就失败。不安装、个人 sync/reload、真实 tmux/provider/在线模型、push、amend/rebase 或归档/journal。历史 commit 保留，使用追加提交。

## 验收（本轮重新验证）
- [ ] development/testing 两目录被 packages 正常发现；分类 index 有实质内容，根 index 简短且不重复。
- [ ] scripts/extension/worktree 专题规范消除，guides 兼容入口有效且不重复规范正文；整体比首轮 13 份/719 行更精简，无通用安全约束遗漏。
- [ ] docs 只有功能使用与必要来源/许可说明，无测试方法/内部实现手册；所有测试要求与 tmux/provider 方法在 spec。
- [ ] plans 删除与基线迁移完成；基线数据字节不变，运行代码/同步脚本/测试统一读 resources 新路径，不残留当前缺失引用。
- [ ] 相关本地 links/anchors、活动 JSONL、空白（含新文件）、packages 检查通过；聚焦角色来源/初始化/规范协议测试及按影响选取更广测试自然退出，未测如实报告。
- [ ] 保归档证据、历史提交与并行修改，精确提交本轮范围。

## 执行与授权
用户已在本会话批准按现有第二轮方案实施及逐阶段本地提交，并要求全部在当前主会话直接完成。主实施与自检，不派发子代理；路径迁移仅改字面路径且基线字节不变，不改变跨模块校验契约，按低风险机械迁移处理。自检不是独立审查。不授权 push、安装、真实 tmux/provider、归档或 journal。
