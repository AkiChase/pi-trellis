# Pi 初始化向导与资源部署

## 目标

实现英文初始化菜单、自定义/历史用户名、上游对应的 workspace/onboarding；受控部署 runtime，skills 随包加载。

## 来源与顺序

父任务：`.trellis/tasks/10-13-pi-trellis-standalone`。需求以父 PRD 为准，架构边界参见父 design.md。等待 runtime 契约/部署资源验收；不支持初始前后端 spec 和多 package 检测。
父子关系不自动管理依赖。

## 边界

- 父任务统一授权已覆盖计划内实施和本仓库迁移删除；仍不自动安装/提交，不覆盖用户定制或扩范围。
- 不扩展为全量上游异常修复、旧项目/旧 worktree 迁移。
- 文档中文，产品 UI 英文。

## 验收

- [x] 无 trellis CLI 的新项目初始化可用，预览/取消不写入
- [x] 历史用户名复用日志、正确 onboarding，身份冲突不误报成功
- [x] skills 随包加载，无初始前后端 spec/multi-package 菜单，失败保护用户内容

## 规划状态

子任务 PRD/design/implement/context 已建立；按父任务统一授权与依赖顺序自主实施，进入阶段前仍检查规格、范围和真实交付。
