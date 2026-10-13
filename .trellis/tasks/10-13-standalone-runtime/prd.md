# 固定运行时与任务脚本修复

## 目标

建立 runtime/ 固定源码和来源清单；修复会话归属、任务有效性、hooks 授权与精确 journal/archive 提交范围，验证真实脚本。

## 来源与顺序

父任务：`.trellis/tasks/10-13-pi-trellis-standalone`。需求以父 PRD 为准，架构边界参见父 design.md。先执行；其可部署运行时与契约是初始化子任务输入。
父子关系不自动管理依赖。

## 边界

- 父任务统一授权已覆盖计划内实施和本仓库迁移删除；仍不自动安装/提交，不覆盖用户定制或扩范围。
- 不扩展为全量上游异常修复、旧项目/旧 worktree 迁移。
- 文档中文，产品 UI 英文。

## 验收

- [x] 来源与许可可追溯，完整运行时无需全局 trellis
- [x] 空 session 不借任务，child 不清 parent，无效路径不驱动读取/hooks/提交
- [x] journal/archive 不提交无关任务，真实脚本负例回归通过

## 规划状态

子任务 PRD/design/implement/context 已建立；按父任务统一授权与依赖顺序自主实施，进入阶段前仍检查规格、范围和真实交付。
