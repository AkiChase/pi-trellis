# Pi 初始化向导 — UX 提案

状态：提案，待用户批准；不是已实现命令，也不是最终设计。用户要求菜单和自定义用户名输入，同时与已验证的上游 init 效果对应。

## 已验证的宿主能力

已完整阅读 Pi 1.2.0 的 docs/extensions.md 和 docs/tui.md。宿主提供 registerCommand、参数补全、ui.select/confirm/input、notify 及自定义组件。`input(title, placeholder)` 未提供文档化的初始值参数：应将 Git 建议值展示为可选项，不得伪装成预填文本。内置对话框支持交互/RPC 客户端；自定义终端组件不支持。MVP 优先使用内置对话框；无 UI 调用需要显式输入和确认，不能使用隐含默认值。

## UI 语言

用户要求所有面向用户的初始化产品 UI 使用英文：命令描述/help、菜单、输入提示、校验错误、确认摘要、进度及成功/失败通知。此前中文对话/示意仅用于解释，不得成为发布 UI。示例标签：`Initialize Trellis`、`Set up developer identity`、`View project status`、`Enter a different username`、`Confirm`、`Cancel`；字段标签：`Project`、`Developer`、`Workspace`。遵循既有 Pi 英文 UI 约定。MVP 不增加语言切换。

## 拟议入口与状态路由

`/trellis-init` 打开向导；`--user <name>` 跳过用户名选择，但绝不跳过写入确认。`--help` 只读。参数解析/补全须符合获准命令契约，不照搬任意上游 CLI 选项。

- 未初始化项目：显示规范化目标和固定发行标识；依次选择用户名、项目/spec 配置、审阅，再初始化。
- 已初始化的受支持项目，无本机身份：菜单为 'set up developer identity on this device'、'view project status'、'cancel'。此分支不覆盖/升级运行时。
- 已初始化项目，已有本机身份：显示实际身份/workspace 和状态；同用户 init 不作修改。请求不同用户时报告既有身份，不自动切换。MVP 不提供完整重新初始化按钮。
- 不支持的上游运行时：报告不支持迁移；不得混淆身份恢复与整项目升级，也不得因此拒绝本发行版支持的克隆项目身份设置场景。

## 用户名交互

将已验证的既有 workspace 名作为可选历史候选；Git user.name 与候选不重复时，作为明确标注的建议；另提供 'enter another username' 和取消。历史名字是本次用户要求的 UI 便利功能，不是上游特性。限制候选列表规模；不跟随任意软链接，也不将目录名视为已认证身份。自定义输入须校验为非空、安全的单个路径片段（禁止路径遍历、分隔符、控制字符）；名字约束是明确的安全适配，不是对上游行为的声明。输入无效时允许重试，不丢弃此前有效的向导选择。取消 UI 不写入。

选择既有名字时复用 workspace，保留历史 journal/index。历史是否存在**不改变**上游 onboarding 分支：已初始化项目缺少本机 `.developer` 时，创建/复用 `00-join-<slug>`；不绑定会话活动指针。须提示：onboarding 活动目录缺失时，可能被重新创建（上游不搜索 archive）。

## 确认与结果

写入前汇总操作、规范化根目录、请求/实际生效的开发者身份、workspace 是复用还是新建、发行版本、待创建资源及冲突；披露 bootstrap/onboarding 任务创建，并说明不绑定活动任务。仅身份设置的确认摘要只列本机身份/缺失的 workspace 脚手架/onboarding，明确 scripts/config/spec 不变。默认确认结果为取消；任何写入前步骤取消，文件均保持不变。

成功后重新读取实际生效身份/资源，刷新 extension 上下文/显示；如有需要，通过文档化宿主生命周期重载 skills。不自动触发模型回合、代码库扫描、bootstrap start、依赖安装或 Git commit。显示创建/复用的 onboarding/bootstrap 路径及后续操作。失败时保留/报告准确的部分状态，不笼统报告成功，也不隐藏覆盖冲突。

## 尚未确定的设计维度

项目类型/spec/bootstrap 选项需要各自基于上游证据建立映射；本 UX 提案不静默选择 frontend/backend 默认值，也不承诺 monorepo 支持。运行时基线、技能加载/部署和完整实施范围仍在规划中。
