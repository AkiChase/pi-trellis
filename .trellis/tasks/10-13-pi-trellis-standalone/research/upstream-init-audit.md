# 上游 init 行为审计

对已安装 `@mindfoldhq/trellis` CLI 的只读源码审计，其报告版本为 **0.6.16**，并非假定的 0.6.17 基线。本次源码审计未执行上游 init。这些证据不代表决定复制全部上游功能。

## 已阅读来源

- `/opt/homebrew/lib/node_modules/@mindfoldhq/trellis/dist/commands/init.js`（完整 1603 行）
- `/opt/homebrew/lib/node_modules/@mindfoldhq/trellis/dist/configurators/workflow.js`（完整）
- 项目 `.trellis/scripts/init_developer.py`、`common/developer.py`（完整）
- `trellis init --help`、`trellis --version`

## 身份是独立输入

`-u/--user <name>` 是开发者名字/workspace 身份，不是登录/认证/账号 ID，也不是逐会话的 `TRELLIS_CONTEXT_ID`。

首次 init 优先解析 `options.user`，其次在 cwd 存在 `.git` 时使用 `git config user.name`。若仍缺少名字且为交互模式，则反复提示输入非空名字。`--yes` 在既无显式用户、又无 Git 名字时，会跳过开发者初始化和 bootstrap 创建。`init_developer.py` 不覆盖既有身份（退出码为 0，报告 `already initialized`）。我们的初始化器必须展示/核对实际持久化身份，不能假设请求的用户已经设置成功。

开发者初始化器写入包含 `name` 和 `initialized_at` 的 `.trellis/.developer`，创建 `workspace/<name>/journal-1.md` 和 `index.md`，保留既有 journal/index 文件。

## Init 不止负责复制目录

1. 防止在 home 目录运行，选择冲突写入模式，解析 Python 命令（CLI 宣称 >=3.9；实际内置运行时兼容性须单独检查）。
2. 按上述方式解析开发者身份。
3. 检测项目类型；可选 monorepo 检测/配置，包括 package spec 目录。
4. 选择平台；可选远程 spec 模板/registry 和其他 workflow。这些操作可能发起网络请求，不一定是 Pi 专用 MVP 的必需项。
5. 创建 workflow 结构：可执行 scripts、workflow/config/.trellis gitignore、根 `.gitattributes` journal 合并规则（增量添加）、channel runtime agents、workspace index、tasks 目录、frontend/backend/package spec 脚手架及思考指南。
6. 写入 `.trellis/.version`，配置所选平台材料，通过处理冲突的写入器创建根 AGENTS.md，并根据已记录写入初始化模板 hash。
7. 初始化开发者。新项目或 tasks 为空时，创建含 task.json/PRD 且分配给开发者的 `00-bootstrap-guidelines`。既有项目此前无 developer 时，创建 `00-join-<slug>` onboarding 任务；同设备 reinit 两者都不创建。这些骨架使用 in_progress，但**不绑定活动会话指针**。
8. Reinit 快速路径可添加平台、在新 checkout 上设置开发者，或请求完整重新初始化。这与一般旧运行时迁移不同，需要明确 MVP 范围决策。

## 使用真实二进制验证历史用户名 reinit

仅在临时目录中执行实际安装的 `bin/trellis.js init -u <name>`；目录包含已安装脚本模板、一个既有任务、历史 `workspace/akichase/{journal-1.md,index.md}`，但没有 `.developer`。未在本项目执行 init/写入。

- 首次 `init -u akichase`：退出码 0，写入 `.developer` name=akichase，两个历史文件逐字节保留，创建 `tasks/00-join-akichase`，不创建会话指针目录。
- 再次 `init -u akichase`：退出码 0，保留身份/历史，不重复创建 onboarding。
- 随后 `init -u someone-else`：退出码 0，CLI 误导性输出称 `someone-else initialized`，但持久化身份仍为 akichase，因为委托的 Python 脚本拒绝替换既有身份。不创建新的 join 任务。
- Onboarding 的根因：`handleReinit()` 只检查调用前 `.developer` 是否存在，不检查 `workspace/<name>` 是否已存在。因此，新设备上的返回用户被当作新加入者。`writeTaskSkeleton()` 跳过既有同名目录；如果 onboarding 任务已归档且活动目录缺失，辅助函数不检查 archive，可以再次创建该任务。
- 已初始化项目在不带显式 platform/user 参数时运行 `init`，会显示 add-platform/add-developer/full 菜单；仅传 `--yes` 则直接返回、不配置身份，即使已经检测到 Git 名字。

更正：此前对话中的“恢复历史用户不创建 onboarding；列出历史用户名；冲突提示”是我们提出的行为，**不是**上游行为。用户现在要求与 CLI 行为对应。规划必须以上述分支行为为基线，明确指出任何有意的安全偏离；不得暗中加入自定义用户名选择器，也不得宣称不会创建 onboarding。

## 规划修正

此前 PRD 的“开发者身份”条目定义不足。Pi 初始化器必须明确身份输入、Git 名字建议/确认、既有身份保护、workspace 输出，以及与会话上下文的区别。不得静默将 Pi session ID 用作开发者身份。完成 design/implement 前，须根据本盘点决定 bootstrap/spec 准备、项目类型/monorepo、根文件所有权及离线模板范围。

不得仅因上游如此实现，就完整保留 channel agents、其他平台生成、远程 registry marketplace、上游版本/更新提示、自动创建 in_progress 任务或 reinit 流程。逐项映射为保留/适配/省略，并说明用户可见影响。在声明固定发行基线前，须核对已安装 CLI 0.6.16、agent 派生基线 0.6.17 和当前项目脚本之间的来源关系。
