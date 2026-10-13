# Worktree 管理 CLI 与 Pi 执行入口重构

## 目标

主 agent 能通过固定项目内原生 Python CLI 管理任务 worktree，不必理解混合工具中各操作的无关字段，也不需要定位包绝对路径或通过 Python 调用 Node/TS；Pi 扩展继续负责真实子代理派发和会话上下文隔离。正常流程明确为「创建目录 → 准备执行环境 → 派发代理」，不把内部关联记录称为用户必须执行的“绑定”步骤。

## 背景与证据

- `lib/worktree-tool.ts:9-20` 将七个操作及其参数放在一个 schema 中，只有 action 必填；可选字符串允许空值。
- `lib/worktree-tool.ts:36-37` 没有归一化空字符串，task 的空值会阻断默认回退。
- `lib/worktree-manager.ts:157-159` 对已有记录检查显式 path/branch/base；`:171` 拒绝新建时提供 path，包括空字符串。
- 工具签名为何显示所有字段必填尚未定位，不归因于 strict mode、Pi 或本项目。
- 用户否决拆分大量注册工具，认可「CLI 管理 + 最小 Pi 执行入口」；主 Pi 留在源项目，不通过脚本切换父会话。
- `lib/preparation.ts:taskCli` 使用目标目录及目标独立 TRELLIS_CONTEXT_ID；`prepareWorktree` 只准备选定材料并运行目标 start，不能推进源 planning 任务。
- `lib/subagent-rpc.ts:rpc/registerDispatchTool` 使用宿主 pi.events 和终态监听。独立脚本没有该事件总线，不能直接替代派发/停止。

## 需求

### R1 清晰的管理入口

提供一个带子命令的 CLI，覆盖 create、adopt、status、prepare、recover、remove。create 为正常新建入口；adopt 只接管同仓库已有、带分支的注册 worktree。每个子命令只接受适用参数，未知参数、不适用参数、重复参数和缺少参数值均报错，不静默忽略。空字符串不是 CLI 占位约定，显式空值不得被当成默认值。

### R2 保留最小宿主入口

不增加大量工具；保留一个 Pi 执行工具承担派发和 provider stop。管理 CLI 不调用 Agent、不请求模型、不实现独立 provider 桥接服务。停止请求成功不意味着释放占用，仍等待终态证据。

### R3 上下文隔离

主 Pi 的 cwd、任务指针及配置不因 CLI 执行发生切换。CLI 明确指定任务；目标 preparation 使用关联记录中的独立上下文 ID，不继承源 ID 写目标指针。派发仍由源宿主通过公开 cwd RPC 启动目标子代理，并保持现有上下文注入、配置验证和占用记录。

### R4 审批与安全

所有可变更管理操作默认仅预览，显式确认且获得用户批准后才执行。创建不复制源代码未提交内容，不自动 start/prepare/dispatch；准备预览披露目标 start/hooks 风险；删除保留 clean/ancestry/引用校验且不 force、不删分支。错误保留目录、分支和诊断；恢复只释放已死亡执行者占用，不杀进程、不覆盖代码。已有手动删除目标的显式解除关联例外保持不变。

### R5 可发现与迁移

固定入口为 `python3 .trellis/scripts/worktree.py`，管理逻辑原生 Python/标准库实现，无 Node/TS/SDK 依赖。安装流程独立部署并维护脚本及私有模块，禁止硬编码包路径；与既有 active_task.py 补丁分开，支持检查、dry-run、幂等更新与用户定制保护。停止注册旧 trellis_worktree 工具，更新说明、阻断提示及测试；旧内部记录和 worktree 可继续使用，无需迁移、重建或自动清理。保留 trellis_dispatch 的旧派发调用形状。

## 验收条件

| 编号 | 可观察结果 |
| --- | --- |
| AC1 / R1 | CLI help 展示主流程和每个子命令参数；create 不接受 path，adopt 必须提供真实路径；解析错误无文件/Git变更。 |
| AC2 / R1、R4 | create 预览解析任务、目录、分支和完整 base commit，但不创建目录、分支或关联记录；确认创建后状态为未准备。 |
| AC3 / R1、R4 | adopt 保留已有代码，拒绝普通目录、外部仓库、detached及身份不符；显式冲突参数仍被拒绝。 |
| AC4 / R3 | 带源 TRELLIS_CONTEXT_ID 的 CLI prepare 在目标使用独立 ID；源指针与源任务状态不变，目标材料/分支/指针校验通过。 |
| AC5 / R2、R3 | 派发仍验证 ready/身份/源任务/宿主配置，通过目标 cwd/off RPC 获得真实 ID；禁止源目录 fallback、临时隔离和并发占用。 |
| AC6 / R2、R4 | stop 通过宿主 RPC 请求已知 ID；成功回复不直接清 lease。活 owner 的 recover 失败，死 owner 的 recover 默认预览。 |
| AC7 / R4 | remove 无有效保留引用、dirty、非祖先或当前 cwd 等负例拒绝并保留目标/记录；有效预览不删除，确认不 force、不删分支。 |
| AC8 / R5 | 注册工具中没有 trellis_worktree；trellis_dispatch 仍支持旧 agent/task/prompt 调用。已保存的 v1 记录可被新 CLI 原样读取。 |
| AC9 / R5 | 固定项目入口在不提供包路径、Node不可用时可执行help和管理fixture；部署支持check/dry-run/幂等且保护未知或用户定制文件，缺失模块明确失败、不联网修复。 |
| AC10 / 全部 | CLI 子进程测试、宿主工具测试、现有 worktree/preparation/dispatch 测试和清除测试子进程身份 pin 的全量测试通过；记录实际命令与限制。 |

| AC11 / R3、R5 | Python与宿主的v1记录/锁互操作通过；宿主查询复用Python身份/ready规则，无第二套TS管理核心、无嵌套锁死锁。 |

## 范围外

不切换主 Pi 会话，不统一替换 Trellis task.py，不修改 pi-subagents/agent-tasks，不新增 daemon/IPC，不改 workflow 阶段，不实施自动提交/合并/清理/重试，不改真实项目安装或恢复暂停 monitor。原空值缺陷由移除混合管理工具和严格 CLI 参数解决；仅对保留的宿主入口处理可选字符串空占位，不推广到所有工具。

## 规划状态

这是一个需整体验收的重构任务，不拆成独立子任务。prd.md、design.md、implement.md 使用中文；角色 JSONL 保持机器协议，reason 使用中文。目录沿用 10-13-worktree-empty-strings 以保留关联。用户已批准本版原生 Python 架构和实施，任务 in_progress，并明确在当前 checkout 实施；不安装真实项目、不另建执行 worktree、不修改 ignore。独立验收由主会话安排，实际进展见 implement.md。
