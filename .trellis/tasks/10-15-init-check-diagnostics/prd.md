# Check 只读诊断

> 2026-10-15 新决策：用户选择纯菜单 Pi 指令。先完成 [指令统一任务](../archive/2026-10/10-15-pi-command-unification/prd.md)，再实施本任务；最终入口为 `/trellis-init → Check`，删除 --check/--user/--help，不保留隐藏兼容。下述源码证据中的 --check 仅描述旧实现，不作为新产品约定。

## 状态与授权

- `in_progress`；用户已审阅最终三阶段方案并明确授权“开始实现吧”，实施包括每个已验证 stage 的局部提交；不包含部署、安装、reload、push 或归档。
- 当前会话已通过 `task.py start --allow-empty-context` 正常开始，source main；原规划绑定不作为此前实施授权。
- 保留其他会话的产品、资源与任务修改。

## 目标与现状

`/trellis-init → Check` 回答「本地 Trellis 哪些能力可用、哪里异常、影响什么、如何处理」。它比启动的基本激活检查更深入，不能只把启动检查或资源更新预览重新包装。

前置指令统一已提交 `5d3b4e4` 并获用户接受归档。当前 `lib/initialization/command.ts` 的 `checkProject()` 明确只提供资源/接管事实，菜单已不再接受参数；本任务应替换该 collector，而非重新做菜单。`lib/initialization/resources.ts` 的 resourceStatus 仍是逐文件状态，不是分项运行结论。此前 command 先 inspect 的行号仅是历史证据；初始调研见 [local-diagnostics.md](research/local-diagnostics.md)，verbose/双报告与旧参数建议已被 R1 覆盖。

## 需求

| ID | 要求 |
| --- | --- |
| R1 | 唯一入口为 `/trellis-init` 菜单的 `Check`、唯一报告；不再接受 --check，也不新增 verbose、quick/deep/basic/full 参数或交互诊断面板。正常项汇总，异常直接给出原因、关键位置/证据、影响、建议和未检查原因。 |
| R2 | 覆盖项目识别、manifest、初始化中断记录与锁、Python、必需托管资源和 runtime 一致性。正常用户文档定制不是故障；包损坏与项目损坏分开。 |
| R3 | 检查相关现存配置的解析、消费者实际生效值与默认回退，以及有效开发者身份和对应 workspace。只读解析 hooks，不执行；宿主加载状态无法从公开能力证明时明确未验证。 |
| R4 | 只检查当前会话已有任务及相关 worktree。使用 extension 的真实 session resolver，兼容 pinned/child memo key；无任务、合法 planning/未准备 worktree 不误报。损坏绑定不能降级成无任务。 |
| R5 | 默认执行静态检查和有界、无模型的运行探测，验证核心上下文读取及相关 worktree 本地链路。不得执行默认 get_context 的全任务/历史枚举或现有 query 的材料扫描来假装窄范围完成。 |
| R6 | 全程只读：不初始化、更新、修复、删除锁、绑定/切换任务、准备 worktree、安装、Git 写入、执行项目 hooks 或调用模型。未授权/不完整 runtime 不运行项目代码。 |
| R7 | 每项失败不吞独立检查；超时、输出超限、协议错误、前置阻断、取消/迟到结果分别处理。未执行不能算通过；报告和读取/子进程均有预算。 |

## 范围与排除

第一版为完整本地链路：上述五类检查加相关核心入口探测；不要求当前会话有任务。managed target 显示 execution/source root 与权威绑定，不沿用初始化「必须回源」限制判其所有能力不可用。

不扫描所有历史任务、其他会话文件、全部 checkout 或全部宿主资源；不检查业务代码/业务测试、模型/API/网络、实际写权限；不提供自动修复或第二条用户诊断命令。只读安全约束针对本包控制的行为，不承诺任意用户解释器、Git 可执行程序或并发文件替换的 OS 沙箱。

## 验收

| ID | 可观察结果 | 对应需求 |
| --- | --- | --- |
| A1 | 健康 fixture 输出简短、单一报告，无正常文件或完整哈希长清单；异常无需另一种参数获取必要定位细节。 | R1 |
| A2 | 启动 runtime 校验通过后，仍能定位配置被忽略/回退、当前上下文错误、相关 worktree 身份/绑定不一致、真实入口失败/超时。只有未初始化/缺文件用例不能验收。 | R2–R5 |
| A3 | 缺/坏/旧 runtime、包来源异常、中断记录、锁、身份/workspace 问题分别显示影响；合法空资源锁不误报 JSON 损坏，历史 completed audit 不重验已变用户任务。 | R2、R3 |
| A4 | 无任务正常；CLI no-task 的 exit 1 按严格 payload 判定；双会话/child 只读正确 pointer，损坏记录不借其他任务恢复，planning/空未使用 role manifest 不授予执行资格。 | R4 |
| A5 | source/target runtime gate 之前项目入口零执行；只探测当前相关 binding/marker/context，不跑 create/prepare/recovery、材料扫描、default context 历史查询或 Git status helper。 | R4–R6 |
| A6 | 实际探测具备超时、stdout/stderr 上限和收尾；恶意 startup/import/已有 pyc、项目 TMPDIR 等 fixture 验证防护，无法安全探测则显式 blocked，不以注释判 PASS。 | R5–R7 |
| A7 | 健康/失败/超时路径的项目、Git index、配置锁、所有 pointer/binding、外部受害文件 bytes/mode/目录不变；写入 spy 捕获创建后删除，读取 spy 拒绝越范围扫描；零模型/hooks/lifecycle/install。 | R6 |
| A8 | 一项失败仍保留独立证据；超预算与不可见宿主状态明确未检查；重复 check、切会话、shutdown 后无跨会话迟到报告。 | R7 |

## 规划交付

技术决策由 [design.md](design.md) 维护；阶段、提交检查点及验证命令由 [implement.md](implement.md) 维护。[补充调研](research/planning-contracts.md) 的固定 bootstrap/部署源码快照、共享消费者、窄 identity 查询已整合。后续 worktree 提交 `176619d` 已将 child pointer 放在源 authorityRoot：本任务查当前源会话与相关目标执行环境，不读取目标历史 task/pointer，不恢复目标任务副本。历史调研与旧规划中 bound-target-pointer 的设想不再适用。

产品范围已收敛；技术防护仍须由实施 fixture 证明，不能以规划完成代替验收。用户已批准按最终方案实施，先完成 S1 验证与独立审查，再进入 S2。
