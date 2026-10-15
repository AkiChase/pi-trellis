# 统一 Pi 指令为菜单式交互入口

## 状态与授权

`in_progress`；用户已审阅纯菜单方案并批准实施（“可以，开始吧”）。已通过 task.py start --allow-empty-context 激活当前会话，branch=main；本任务实施含已验证范围的局部提交，不包含部署、安装、reload、push 或归档。保留其他任务并行改动。

## 目标

减少 Pi slash command 的 shell 风格参数，让用户从无参数指令进入菜单完成操作。`View project status` 与 check 重叠且含义不清，拟用 `Check` 替换，将主动诊断放进初始化菜单，不再要求用户记忆 `--check`。

## 已确认意图

- 新任务先处理 Pi 指令统一；诊断能力本身仍由 `10-15-init-check-diagnostics` 承接。
- 用户倾向 init 菜单 `Check` 代替 `View project status` 与 `--check`。
- 先盘点其余选项，不能只机械更名一个入口。

## 源码盘点

| 入口 | 现行行为 | 拟调整/边界 |
| --- | --- | --- |
| `/trellis-init` | `lib/initialization/command.ts:7-35,86-114` 接受 --user/--check/--help；有补全和 quoted username parser。 | 无参数打开菜单；旧参数明确迁移提示，不兼容。 |
| View project status | `command.ts:117-146` 的 unsupported/unhealthy/supported 分支；输出 resourceStatus 或 adoption preview，不是完整健康探测；fresh 菜单没有该项。 | 各适用状态统一为 Check，入口必须在异常项目仍可用；本任务不宣称新诊断已实现。 |
| --user | 只跳过 chooseUsername，不跳过操作菜单/最终写确认；原用户名选择支持历史/Git建议/Unicode输入。 | 菜单流程保留原身份选择与写确认。 |
| --help | 输出 INIT_HELP；既有 command description 和参数补全提供提示。 | 拟菜单 Help，取消参数补全，帮助不调用 Python/写入。 |
| `/trellis-task-viewer` | `lib/task-browser/command.ts:8-29` 无参数打开全屏任务面板，拒绝参数；仅 TUI 可用。 | 保留现有无参数和模式约束，更新错误引导，不顺带重做名称/面板。 |
| 其他参数文字 | `extensions/trellis.ts:173`、task-browser、adoptionDialog、docs 引导 --check；worktree 文档有 Python --task/--help/--confirm。 | Pi check 指引统一；Python CLI、Pi自身 install/reload 等保持原样。 |

## 确认范围

用户已选择**纯菜单**：移除 --user/--check/--help，旧参数提示迁移，不隐藏兼容；非交互模式只返回使用指引，不直接检查或写入。

1. init 无参数菜单包含当前状态可用操作、Check、Help、Cancel，保留 Initialize/Adopt/Set identity/Update/Apply template 的原有可用性与最终确认。
2. 移除全部 init 参数公开用法与补全；非空参数返回统一迁移提示，不运行 inspect/Python或进入写流程。
3. Check 暂时使用原有只读事实能力，不把资源预览称为全链路健康通过；随后诊断任务接替内部实现。
4. 报错/docs/test 的 --check 导航统一改为 `/trellis-init → Check`；写操作摘要保留破坏性/无备份警告，不拿 check 当完整写清单。
5. 无原生交互选择能力时仅提示进入交互模式；RPC 是否可交互按真实宿主能力判断，不能将所有 RPC 一律等同 headless。

## 排除

不改 Python runtime CLI 参数、Pi自带命令、provider/tools；不重命名 task-viewer，不新增全局总菜单；不实施深入诊断、安全 runner、worktree readiness；不自动初始化/修复/绑定/安装/reload。

## 初步验收

- 所有本包 Pi command 用法遵守最终确认的同一规则，文档/补全/错误导航一致，无残留公开 --check 教程。
- 各项目状态都能访问 Check，Help 不跑 inspect/Python，Cancel 与只读分支零文件/锁/Git/model/refresh/reload副作用。
- 原身份选择、写操作可用性、最终确认和破坏性警告保持；非交互行为有明确约定。
- 错误参数按确定兼容策略处理，Unicode/空格用户名由原生输入覆盖。
- 入口统一与诊断能力验收分离，不挪走原任务安全/全链路要求。

## 规划交付

产品形式已收敛，没有待确认的参数兼容决策。技术接入见 [design.md](design.md)，验证与阶段见 [implement.md](implement.md)。本任务先完成菜单统一，原诊断任务再实现 Check 的实际诊断；两任务不合并验收。当前已获本任务实施批准；后续诊断任务仍为 planning。
