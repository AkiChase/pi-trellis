# 文档索引

这里面向使用者，介绍 pi-trellis 的功能、命令、配置和使用限制。开发与测试方法统一放在 `.trellis/spec/`；任务计划和验收记录留在 `.trellis/tasks/`。

- [项目初始化](initialization.md)：用户级安装后的项目激活、根目录发现、新建/接管、资源更新、模板替换。
- [任务派发](dispatch.md)：共享源目录与托管 worktree、并发、停止和未知状态。
- [托管 worktree](worktree-execution.md)：创建、准备、材料同步、收集与安全清理。
- [任务浏览器](task-viewer.md)：只读任务列表、层级、文档和键位。
- [常驻任务显示](task-display.md)：任务数量、widget/footer 与刷新。

安装与总体配置见 [README](../README.md)。未初始化时只有 `/trellis-init`；有效项目才注册 viewer 指令、dispatch tool、自动 skills 和常驻显示。
