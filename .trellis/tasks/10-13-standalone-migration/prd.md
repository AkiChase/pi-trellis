# 本仓库迁移与独立发行集成

## 目标

定向迁移本仓库脚手架与引用，删除仅本项目 .agents，调整安装说明并完成父任务集成验收。

## 来源与顺序

父任务：`.trellis/tasks/10-13-pi-trellis-standalone`。需求以父 PRD 为准，架构边界参见父 design.md。等待 runtime/init 验收；与并行工作协调后才能修改本仓库共享脚手架。
父子关系不自动管理依赖。

## 边界

- 父任务统一授权已覆盖计划内实施和本仓库迁移删除；仍不自动安装/提交，不覆盖用户定制或扩范围。
- 不扩展为全量上游异常修复、旧项目/旧 worktree 迁移。
- 文档中文，产品 UI 英文。

## 验收

- [x] 所需 skills/引用先迁移，随后删除仅本项目 .agents
- [x] tasks/spec/workspace/developer/runtime 和并行修改保留
- [x] 安装不要求全局 Trellis，整体测试与父任务 AC 验证通过

## 规划状态

子任务 PRD/design/implement/context 已建立；按父任务统一授权与依赖顺序自主实施，进入阶段前仍检查规格、范围和真实交付。
