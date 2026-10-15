# 适配统一运行任务工具的新名称与管理入口

## 目标与授权

让 pi-trellis 在 my-pi-preset 的新工具接口下继续正确检测能力、注入 Trellis 角色材料并执行原有门禁，用户能够用真实 agent ID 查询和等待派发结果。

任务已获创建授权；2026-10-15 用户审阅完善方案后明确批准“激活task，开始执行，就在本工作区做”。当前在 main 共享工作区按两阶段实施并独立审查；批准包含范围内阶段提交，不包含 push、安装／同步／reload 或归档。

## 已确认的本仓库差距

- `extensions/trellis.ts:946-961` 仍检测 `Agent`，`:1060-1130` 的角色执行识别、材料注入和异常处理仍依赖旧名；新 `subagent_run` 不会进入现有角色检查。
- 同文件 `:1060/:1085/:1120/:1137` 的 shell／结果刷新白名单仍包含已移除的 `bash_bg`。
- `lib/subagent-rpc.ts:90/:201` 的说明已不再列旧工具，但没有明确新结果查询／消息入口。原 PRD 引用的 `:52` 已过时。
- `tests/provider-contracts.mjs:125-135/:146` 仍调用 `get_subagent_result`、`steer_subagent`；加载 provider 自身入口不等于加载 preset 的统一任务工具。
- 活跃 workflow、技能参考和 `docs/dispatch.md` 仍以普通 `Agent` 或泛称 result/steering 描述入口。泛称角色的 “Main Agent”、SDK 类型及历史证据不属于工具改名范围。

跨仓库已确认：preset 前置源码已落地，关联任务已归档至 `../my-pi-preset/.trellis/tasks/archive/2026-10/10-14-runtime-task-tools/`。不再等待草案冻结；两仓库新组合仍 NOT_RUN，需由本任务验收。实际参数与消费／加载合同见 [design.md](design.md)，阶段与测试见 [implement.md](implement.md)。

## 需求

### R1 新名称与现有角色边界

仅接受新的活跃工具名，不增加旧名兼容检测／执行 alias，不迁移旧记录、ID 或历史 renderer：

| 原名称 | 新入口 |
| --- | --- |
| `Agent` | `subagent_run` |
| `SubagentWorkflow` | `subagent_workflow` |
| `steer_subagent` | `subagent_message` |
| `get_subagent_result`、`jobs` | `task_manage` |
| `bash_bg` | `bash` 的 `run_in_background=true` |
| `bash`、`monitor` | 保留 |

`subagent_run` 的 `trellis-implement/trellis-check/trellis-research` 普通调用继续走现有材料加载与门禁：拒绝临时 `isolation=worktree`，已绑定任务／managed 目标要求 source host 的 `trellis_dispatch`。非 Trellis 子代理、普通只读命令不扩大限制。

不补做 workflow／第三方 RPC 的递归内容检查；普通工具拦截不是完整权限沙箱，保持现有限制说明。

### R2 失败与会话隔离保持

新名在 unsupported runtime、项目切换／发现异常、runtime/context 异常路径中不得绕过阻断。普通材料缺失／截断仍显式保留 fallback，伪造完整标记不能跳过读取。

`bash/monitor` 保持显式 `TRELLIS_CONTEXT_ID` 前缀与任务命令结果刷新，`bash` 前后台模式同用一个入口；不改变全局环境、父子会话绑定或 Python 校验。

### R3 公共 RPC 与结果管理

保留公开 `subagents:rpc` 的 ping/spawn/stop/consume 通道与 envelope、version、实际 cwd、真实 agent ID、启动／终态区分和占用规则。pi-trellis 不把 RPC 改成工具调用，不生成替代 ID，不实现 `task_manage` 后端。

说明明确使用 `task_manage` 查询／等待／读取与 `subagent_message` 指导消息。任务受管停止仍推荐 `trellis_dispatch action=stop`；停止回执或结果读取不能代替终态事件来释放 Trellis 占用。

### R4 活跃资源与组合验证

同步实际存在的入口提示、用户文档、技能参考、workflow 模板与相关测试。仅更新受影响的 package resource hash；无角色内容变化不重新生成角色，无 Python runtime 变化不重发 runtime。项目 `.pi/agents`、已部署脚本和用户配置不通过本任务自动更新。

离线入口测试验证新名与负例，真实组合探针必须显式加载新工具 owner，并覆盖 RPC 返回 ID 的管理／消息与 source 派发。原生旧 provider 的 RPC 支持与新工具组合支持分开报告，不能以旧工具探针通过代替新组合验收。

## 范围排除

- preset 的管理后端、renderer、child composite 或工具 schema 实现。
- worktree create/prepare/refresh/collect、占用机制、RPC 协议、任务 CLI/UI 的重设计。
- 旧名兼容层、归档历史／上游原文批量替换。
- 修复本会话加载包／项目 runtime 版本差异，安装、资源同步、当前 clone 更新、reload、push 或改写历史。

## 验收标准

- [x] A1／R1：三个 Trellis 角色通过 `subagent_run` 注入正确材料；临时 isolation、managed marker／binding 被拒绝，非 Trellis 输入保持不变。
- [x] A2／R2：新名在 unsupported／失效／项目切换／发现错误下阻断且无子进程／指针副作用；缺失材料仍有可见 fallback。
- [x] A3／R2：`bash` 的前后台模式与 `monitor` 保持 session prefix 和结果刷新；不再以 `bash_bg` 作为有效入口。
- [x] A4／R3：RPC cwd／真实 ID／早到终态／stop／shutdown／unknown 与占用回归保持；真实 RPC ID 可由新管理入口查询、等待、读取并发送指导消息。
- [x] A5／R4：活跃说明只指导新入口，受影响 hash、focused／全量检查与独立合同审查通过；旧 provider 的结果单独标明。
- [x] A6／R4：最终新工具组合测试记录实际加载入口、host/provider 版本、返回字段、退出／清理结果；未执行的安装或真实终端／模型验证标明 NOT_RUN，不声称现有会话已切换。

## 验证与交付边界

S1 已提交 `56e8b9c`；S2 正常真实组合探针、全量450/450、Python20/20和最终独立反证复查通过。`wait` 消费测试盲点已修复，省略消费的扰动会失败。详细命令／日志和阶段提交见 implement.md。

原生旧 provider 未找到，NOT_RUN；monitor只验证双源拒绝，未验证成功流／WebSocket；未验证在线模型或真实终端外观。未安装、同步、reload、push或归档，不表示当前安装会话已加载这些源码改动。

## 启动前置

本次首次 context CLI 成功；后续运行时调用被本会话工具门禁拒绝，提示 `Unsupported project runtime release`，命令未启动。只读核对时源码 runtime baseline 与项目 manifest 的 release ID 相同，这不能证明当前已加载扩展与源码相同。后续按用户实施授权正常 start 成功，未修复部署或绕过门禁；本项不再阻碍当前源码实施。
