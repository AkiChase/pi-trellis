# Trellis 任务派发

`trellis_dispatch` 是模型 tool，不是 slash 指令。仅在已初始化且运行时有效的项目中注册；未初始化或运行时无效时不注册，只保留 `/trellis-init`。运行中失效会阻止执行并清除旧常驻显示，`/reload` 后完全撤回注册。

它是 Trellis role 的统一派发入口。主会话保持在源项目根目录，工具按任务绑定选择子 agent 的执行目录，不要求所有任务都创建 worktree。

## 调用

```json
{ "agent": "trellis-implement", "task": ".trellis/tasks/<完整目录名>", "prompt": "实施已批准的任务范围" }
```

role 可选 `trellis-implement`、`trellis-check`、`trellis-research`；省略 task 使用当前会话任务。派发要求任务为 `in_progress`，但状态本身不代表用户实施授权。工具返回真实 agent ID，可直接作为 `task_manage` 的 `task_id`，无需转换 ID。

```json
{ "action": "status", "task_id": "<返回的 agent ID>" }
```

使用 `task_manage` 的 `wait` 等待完整回答、`output` 读取保留结果；可附上 status 返回的准确 `run_id`，省略时锁定调用入口的当前轮次。不要给 status/output/wait/stop 附 `task_type`。成功等待或终态读取会标记该轮结果已消费，抑制重复完成通知；取消等待不停止执行。

运行中需要指导时调用 `subagent_message`：

```json
{ "agent_id": "<返回的 agent ID>", "message": "收敛并报告结果" }
```

这些管理工具需要兼容的运行任务扩展；RPC 可用不代表新管理工具已加载。

## 角色与定制

| 角色 | 职责 |
| --- | --- |
| `trellis-implement` | 读取任务材料，在已批准范围实施并验证 |
| `trellis-check` | 审查指定变更，修复清晰的范围内问题并验证最终版本；争议交主会话 |
| `trellis-research` | 只读研究；明确获准后写源任务 research，不改产品代码 |

角色不自行提交或管理任务生命周期，主会话决定阶段推进和验收。源任务/spec/workflow/JSONL 默认只读，子角色返回结果和证据；明确路径范围授权可允许 research 写源任务 `research/*.md`，或 implement/check 写源任务 `evidence/`，不允许任意源材料写入。材料缺失、失效或截断时必须报告源路径并完整补读，不猜测需求或借用目标副本；外部研究只使用实际配置的工具。

包内 `agents/trellis-*.md` 是直接维护的角色源码，保留 Trellis 衍生来源和 AGPL 声明，不再通过开发生成器重写。

可编辑项目 `.pi/agents/` 定制角色。启动不会部署或升级；安全资源更新保留定制并报告冲突，明确接管旧项目才按确认替换旧角色。见[初始化](initialization.md)。更新文件不会改写已运行子代理。工具名单和角色规则不是 shell 沙箱，仍须审查继承的 extensions/skills。

## 执行目录

| 任务状态 | 执行行为 |
| --- | --- |
| 没有 managed binding | 在共享源目录执行 |
| 已绑定且准备完成 | 在绑定的 managed worktree 执行 |
| 绑定未准备、损坏、身份不符或本角色源材料无效 | 报错，不回退源目录或目标材料副本 |

两条路径均使用公开 cwd RPC 和 `isolation: off`，不创建临时 worktree。实际 host cwd 必须为源项目根；源/用户 settings 必须持久配置 pi-trellis，确保子会话能加载 adapter。角色定义需要兼容的 `extensions: true`、`isolation: off` 和工具列表；不兼容的定制文件保留并报错。

选择 managed 路径时，先遵守[管理执行协议](worktree-execution.md)完成显式 create/adopt 和 prepare。共享源目录执行不需要这些步骤。

## 权威材料与直接读取

共享源和托管执行都使用宿主验证的四行派发头：`Active task`、`Trellis context id`、`Trellis agent`、`Trellis authority`，随后为空行。authority 提供绝对 sourceRoot/materialRoot（同一主根）、taskPath/specRoot/workflowPath、角色引用清单、要求指纹，以及独立 executionRoot。只有任务路径或旧格式头不够，文字本身也不授予路径权限。

派发只提供路径、身份、必读顺序和职责，**不注入 PRD/spec 正文、不发完整注入标记**。子 agent 先完整读取源 PRD、可选 design/implement、workflow，再读取 implement/check 本角色 JSONL 和所有引用；research 无 implement/check manifest 要求。材料相对路径从 sourceRoot 解析，产品代码/测试在 executionRoot 操作；read 截断须用 offset/limit 分页直到完整。

源材料包括获批的未提交内容；源路径无效或缺失时明确拒绝，不用目标旧 `.trellis` 或 local current 猜任务。主会话核实失效引用并在已有材料维护授权内修正，重新查询和派发，不同步两份材料。另一角色失效不阻断本次角色；真实冲突或未授权范围变化交用户决定。

子上下文在源忽略 runtime 中独立登记，不运行 start/hooks、不改父指针。目标 checkout 的 `.trellis` 保持原样，不准备任务/spec 副本。指纹不是实际读取证明，运行中源变化仍须通知/审查；子 agent 应报告实际读过的材料及观察到的变化。

## 共享源目录

不同任务可以同时执行；同一任务的 starting/running/unknown 记录会阻止重叠派发。主 agent 分配文件范围并协调冲突。工具不独占文件目录，也无法完整感知普通 `subagent_run`、其他会话或手动进程。

每次源目录派发，子 agent 都收到：

> Shared directory: Other agents may be working here. Stay within your assigned scope, preserve unrelated changes, and report overlapping edits to the main agent.

主 agent 的返回提示为：

> Shared source directory — no filesystem isolation. Coordinate overlapping edits.

source 材料仍按上述绝对源路径直接完整读取，不因 executionRoot 恰好等于 sourceRoot 而改用旧注入协议。

共享源目录没有托管检查时效判断。需要审查已提交阶段时，由主 agent 明确提供正确 `Review base: <commit>` 和文件范围。

同任务 source 活跃期间，create/adopt 的预览和确认都会拒绝；先等待终态再切换执行位置。

## 停止与未知状态

```json
{ "action": "stop", "task": ".trellis/tasks/<完整目录名>" }
```

stop 只接受 task，不需要 agent/prompt。成功回复仅表示请求 provider 停止，**终态事件才释放占用**。跨会话可以读取 source 记录尝试 stop；provider 不认识旧 ID 时明确失败，不猜测子进程已退出。

RPC 超时、shutdown 和不确定启动保留 unknown 与已知 ID，不自动重试 spawn。报错会给出记录位置供核查；退出前不保证已收到的终态成功落盘，也不会因为 PID 消失自动解除占用。

MVP 没有 source recover 命令。无法取得终态证据时，依据报错记录路径核查真实 provider/进程，另行授权处理记录；不要用 `worktree.py recover` 或自动删文件解除 source unknown。managed 的恢复规则仍见其专用协议。

工具不自动推进阶段、提交、合并、安装、清理或归档；agent completed 不等于工作被接受。
