# 离线真实宿主/provider 探针

`tests/provider-contracts.mjs` 是可选探针，不在默认 `*.test.mjs` 测试发现范围内。它使用已有本机 Pi 和 provider 的真实 parser/runner/loader 与公开 RPC，以脚本化离线响应验证机制；不访问线上模型或个人配置。运行前需明确本机路径与授权，缺失依赖时报告 NOT_RUN，不安装补齐。

## 运行

从仓库根目录执行，先读完整探针及其临时项目夹具。`--host` 指向已安装 Pi 的 node_modules，`--provider` 指向包含探针所需 src 文件的 provider 包根目录：

```bash
node tests/provider-contracts.mjs \
  --host <Pi-node_modules> \
  --provider <provider-package-root>
```

可重复 `--provider` 分别测试独立 pi-subagents 与 agent-tasks 中的实现。不要把两个冲突 provider 安装到同一日常会话。路径和版本必须与实际安装吻合，不把历史 Pi 1.1 的日志标签当当前版本探测结果；记录实际包版本。

探针建立临时 config/project/target、完整 runtime 夹具、角色和脚本化 native provider，禁止模型网络；退出时 finally 删除自建目录。它加载本机 provider 源文件，这是显式测试依赖，不是产品运行时导入 provider 内部实现的许可。

## 覆盖与结果

当前探针覆盖：

- 三类角色的实际工具，write/edit、自修复后的 shell 检查和晚注册搜索夹具工具。
- 目标 cwd 与目标材料、实际返回 ID、结果查询和 steering。
- 公开 RPC 的不存在目标拒绝、未知 ID 停止失败、服务关闭后超时。
- `trellis_dispatch` 共享源目录的实际子代理写入、源材料、短并发提醒和结果。

检查退出码、断言及每项输出，失败不能因清理成功而改成 PASS。保留首次失败与修正夹具后的最终结果，确认实际 session 和自有子进程退出。探针自身的清理代码不是所有第三方进程均退出的通用证明。

## 证据边界

此探针不是完整托管 worktree 生命周期验收、真实模型服从测试、真实视觉/键位验收或 OS 沙箱证明。网络模型、物理 IME、任意主题和 provider 组合未测就标 NOT_RUN。托管创建/材料谱系的离线回归在 worktree/preparation/dispatch/material-sync 测试中另行验证；实际终端操作见 [tmux 指南](tmux.md)。

日常测试的宿主 TUI preload、子进程 identity 隔离和无 lint/typecheck 限制见[质量规范](../../.trellis/spec/extension/quality-guidelines.md)。文档引入不意味着本次已运行探针。
