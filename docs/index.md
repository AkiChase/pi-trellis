# 文档索引

这里收录功能使用、设计解释、来源说明和可复用测试操作。`.trellis/spec/` 保留开发规范与必须保持的架构/安全约束，不按每个小功能积累实现说明。需求、执行日志和验收证据留在 `.trellis/tasks/`；README 提供概览与安装入口。

项目 spec 使用英文，根目录 docs Markdown 使用中文；命令、标识符、代码、来源 hash 和上游原文保持原样。完整维护规则见[文档维护规范](../.trellis/spec/documentation.md)。

## 功能

- [任务浏览器](task-viewer.md)：`/trellis-task-viewer`、排序、当前任务树置顶、键位和只读文档浏览。
- [常驻任务显示](task-display.md)：任务数量、widget/footer 与显示边界。
- [项目初始化](initialization.md)：新项目、已有项目接管、资源更新和模板替换。

## 运行时与集成

- [运行时基线](runtime-baseline.md)：固定来源、许可、部署和任务/session 契约。
- [任务派发](dispatch.md)：共享源目录与托管路由、并发提醒、停止语义。
- [托管 worktree 执行](worktree-execution.md)：执行、材料同步、检查时效和清理协议。
- [角色同步与来源](trellis-agent-sync.md)：角色适配、来源和再生成。

## 测试操作

- [tmux 真实终端验证](testing/tmux.md)：授权、隔离、键位/帧采集、条件等待、报告和清理。
- [离线真实宿主/provider 探针](testing/provider.md)：已有本机依赖、运行步骤、覆盖与限制。

## 历史设计

`plans/` 中的[worktree 计划](plans/worktree-support.md)与[角色适配计划](plans/claude-agent-adaptation.md)保留当时方案和执行证据，不作为当前接口手册。当前用法以对应功能文档及 [README](../README.md) 为准，历史 PASS 数量不代表当前代码已重新验证。
