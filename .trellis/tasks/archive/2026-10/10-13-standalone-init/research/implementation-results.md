# 初始化子任务实施交付

## 状态与边界

按父任务统一授权在当前项目执行；本报告是 implement 自检交付，不替代 main 的独立 check 或父任务最终验收。没有创建/切换 worktree，没有真实安装/初始化本仓库，没有 commit/push/start/finish/archive/session journal 操作。保留 runtime 子任务已有改动与全部本仓库 `.agents`；未编辑父任务/迁移任务材料。

## 实际代码与资源

- `lib/initialization/engine.ts`：只读 inspect/plan、明确批准的 apply，schema1 项目清单、原 bytes/modes guards、专用锁/有界操作记录、逐文件原子发布与保守中断重试。模板/role/runtime 源 hash 验证；受管路径/祖先 softlink/dangling/nonregular、未知文件、HOME/managed worktree 与自定义根块冲突保护。
- `lib/initialization/command.ts`：无 `.trellis` 也注册英文 `/trellis-init`，严格 `--user/--check/--help`；原生 select/input/confirm、历史与 Git建议、自定义重试、任意取消无写、headless只发送不触发回合的状态消息。安全补全支持含空格/Unicode/引号名字 round-trip。fresh 成功刷新并 command-only reload 后立刻返回；identity-only刷新不改 runtime/config/spec/workflow。
- `resources/templates/` 13 个文件：Pi 原生 workflow/五种 workflow-state/各 Phase steps、安全 config、增量根 blocks/精确 journal union attributes、空 spec 入口/通用 guides、bootstrap/join PRD。无 frontend/backend/project-type/multi-package/channel/mem/remote 配置。
- `skills/`：8个单文件日常技能 + spec-bootstrap（4 refs）+ meta（22 refs），共36 Markdown；完整引用闭包、Pi适配与独立 source/output/license清单。`package.json pi.skills=["skills"]`。移除 extension skill bridge，未删来源 `.agents`。
- `extensions/trellis.ts`：移除会话自动 roles 部署；支持包版本/部署 hash 错误诊断，task_error与no_task分开；bash/bash_bg/monitor command作用域及相关results缓存失效，不转换ws/noncommand，持久任务计数回归保留。
- `lib/adapter-resources.ts`：复用真实 Pi SettingsManager/DefaultPackageManager 做 persistent adapter判断，缺失来源skip不安装。`lib/subagent-rpc.ts`/`worktree-query.ts`：危险 managed dispatch 要求 supported source/target；先用不执行target task.py的binding query验证target release，再执行ready query。普通/native lifecycle query保留原语义；未改7个native Python算法文件。
- `runtime/common/{task_store,developer}.py`：提取纯 canonical task/developer skeleton；CLI仍共享同一默认字段/日志内容，TS不复制另一任务schema，不调用create/start/hooks。只刷新上述最终hash和runtime release；全部32 runtime files实际重新验证。
- `README.md`/`docs/initialization.md`/`TESTING.md`：说明已交付 init 与ownership，旧installer明确标legacy pending migration，未替换installer。

## 核验要点

真实temporary部署覆盖fresh、Unicode/空格identity、supported clone历史byte保留/onboarding（归档后可重建）、同名no-op/不同身份conflict、slug collision/半任务、根block精确复用/重复/定制、模式保持、路径links、并发precondition变化、中断前后manifest、同操作重试/分歧保护/锁保留/畸形记录、无trellis PATH、无bytecode/绑定/hooks/Git/安装。

真实部署 runtime 验证phase全部12steps、task create/start/current/finish、context/journal/help互操作；实际Pi 1.2.0 ResourceLoader成功发现10skills与无scripts时init command，PackageManager验证normal project override/trust/delta/empty/exclusion。重要实证：autoload:false下 `skills:[]`/`extensions:[]` 是空增量不禁用，显式 `-extensions/trellis.ts` 可禁用；normal entry `extensions:[]` 禁用。Top-level排除不是该package资源过滤，不套用错误禁用推断。

## 实际命令与结果

实际 host preload：`PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，所有Node验证仅子进程 `env -u TRELLIS_CONTEXT_ID`，live host环境未改。

- `node --import ./tests/host-tui.mjs --test tests/initialization.test.mjs tests/init-command.test.mjs tests/skill-resources.test.mjs tests/runtime-contracts.test.mjs tests/dispatch.test.mjs`：最后整组83/83（随后添加quoted completion测试单文件13/13，再full重跑）。日志 `/tmp/pi-init-final-focused2.log`、`/tmp/pi-init-completion.log`。
- `npm test`：最终 **213/213 Passed**，正常退出，耗时82.9s，日志 `/tmp/pi-init-final-full3.log`。曾把supported guard错误套到generic ready queries导致15个legacy-native fixtures失败，已收窄到危险dispatch并重跑通过；未为掩盖失败修改native算法。
- `bash -n scripts/install.sh`：通过，仅语法不是lint/installer执行。
- `python3 -B .trellis/scripts/task.py validate .trellis/tasks/10-13-standalone-init`：两个8-entry contexts通过，只读。
- `git diff --check`：通过。
- 独立Python重算：runtime32/skills36/templates13 hashes全部匹配；runtime最终 `pi-trellis-runtime-v1-56affc3695c933701b71c8f4ccfc0afa80ee526927759088c173c5c3ac7e608b`。Runtime suite23/23验证import闭包/Python3.10 AST、native原Git来源bytes、source/provenance和npm pack；资源suite验证完整发布文件。
- Lint/static typecheck：项目无支持脚本，不称通过；TS直接执行不是typecheck。

## 剩余限制与交接

需 main 独立 check 实际diff/未追踪文件后推进migration。没有真实TUI视觉/真实网络model/provider probe；实际host resource loader测试不是完整交互UI验收。Python执行证据macOS/3.14.7，AST3.10不是跨版本/跨平台矩阵。

初始化逐文件atomic而非整目录事务；创建最初控制目录但未写出操作记录前的极早故障只读拒绝、需人工核对，不能自动接管未知目录。死锁文件不会猜测/删除，运行中编辑者与OS祖先竞态不是sandbox/全局transaction保障。项目native worktree生命周期算法原样，general upgrade/legacy migration仍不公开支持。旧installer、本项目部署清单/脚手架、`.agents`删除/入向任务引用搬迁全部留给后续migration，用户定制不得覆盖。
