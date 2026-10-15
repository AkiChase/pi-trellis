# Check 技术设计

## 1. 接入与职责

诊断从指令统一任务形成的菜单 `Check` callback 独立进入，早于 `inspect()`；不调用 resourcePlan/adoptPlan/apply/refresh/reload。最终无参数 `/trellis-init` 打开菜单，不接受 --check/--user/--help；非交互只给静态使用指引。本任务接替 Check 的诊断 collector，不重做已统一的菜单/身份选择/确认流程。

- `extensions/trellis.ts`：提供当前 root/sessionId/contextKey 的普通数据与生命周期失效接线。调用现有 `contextKey()`，不调用要求 runtime 有效的 `session()`，不复制 hash 算法或使用 `__internals`。
- `lib/initialization/diagnostics.ts`（拟新增）：安全快照、执行前置、分项编排、汇总结论；独立于初始化写状态机。
- `lib/initialization/diagnostic-runner.ts`（拟新增）：固定 argv、异步子进程、deadline、输出上限与清理。不是通用 shell 工具。
- `runtime/diagnostics.py`（拟新增）与共享叶子 helper：复用固定 runtime 的配置、任务/context、worktree 策略，只返回当前范围的结构化事实；不 import task CLI、session_context 或 manager/cli/materials。Python 管理规则不复制到 TS。
- 报告 formatter 优先留在 diagnostics owner；只在复杂度确有需要时拆文件，不引入通用健康检查框架。

最小行为缺口：当前 check 的更新清单不能证明配置/上下文/绑定实际可用。新增分项协议与受限实际探测解决该缺口，不改变 start、prepare、dispatch 和 repair 的执行政策。

## 2. 分项数据与汇总

### 能力与证据合同

| 能力 | 取得什么证据才算完成 | 不得宣称 |
| --- | --- | --- |
| 项目/资源 | 最近根发现、包来源、非空 manifest、固定 runtime 文件 bytes/mode 校验；异常独立收集 | 仅文件存在就代表 runtime 可执行 |
| 配置 | 安全快照实际解析，已消费字段的有效值、忽略/回退原因；TS/Python差异可见 | JSON/YAML parse 成功就代表所有设置有效，或所有宿主资源已加载 |
| 当前上下文 | 真实已校验部署叶子在隔离 Python 中执行：authorityRoot+实际 sessionKey 的 current payload、配置/身份/workflow 共享消费者 | 默认全量 get_context、完整模型提示注入、全部引用材料已经验证 |
| worktree身份 | 当前 task 的 source binding 与 marker、相关 source/target Git身份和目标runtime；当前会话仍从source pointer解析 | prepare=ready 就代表所有角色可派发；目标旧pointer有效性决定当前任务是否可用 |
| 只读运行 | 入口无写/hook/model、无越范围读取；真实fixture验证deadline/限量输出/owned-child收尾 | 任意用户wrapper/恶意stdlib、OS沙箱或实际写权限已验证 |

固定 bootstrap 执行的是已校验部署的消费者，不是只返回静态快照的自造 projector。共享 helper 的普通 CLI/生产消费 parity 和实际隔离执行必须同时有测试，缺任一证据时对应能力不可标 pass。

### 唯一报告样例（设计示意，非当前项目诊断结果）

```text
Trellis Check · Issues found
Project: /example/project
Scope: current session; related worktree only
Completed: resources, Python, identity, current task

[Warning] Context configuration falls back to defaults
Location: .trellis/config.yaml · context_injection.max_total_bytes
Reason: the Pi consumer ignores the negative value -1.
Impact: the default context budget remains active.
Next: set a non-negative safe integer; 0 means unlimited.

[Blocked] Related worktree runtime probe
Location: /example/target/.trellis/scripts/task.py
Reason: deployed runtime does not match its manifest.
Impact: target code was not executed; runtime capability is unverified.
Next: review and explicitly update the target resources from the supported workflow.

No files changed. No hooks, model calls or repairs.
```

健康报告只列完成的能力摘要与不适用项，不显示正常文件列表。若宿主最终 loaded resources 不可见，简短注明该边界，不把它当当前项目故障；若本次要求的核心探测 blocked，则总标题不能是“All checks passed”。


内部协议 `schemaVersion: 1`，scope 区分 executionRoot、authorityRoot、sessionKey、exact taskRef，以及需要时的 bindingId/targetRoot。authorityRoot 来自现有 extension 的已验证 source-authority 状态与窄绑定复核，不从 cwd 猜目标任务来源。所有外部 JSON 必须运行时验证类型、长度、来源与允许的枚举，不能以 TS cast 授权。

每项：`id/category/status/severity/summary/evidence/impact/advice`，可附错误 code/exitCode/elapsedMs。`status` 为 `pass | issue | blocked | skipped | cancelled`，severity 为 `error | warning | info`；证据是限长白名单字段，不回显整份配置、环境、凭据或恢复计划 output。

- 正常未初始化显示「尚未初始化」，不是缺全部文件的连环错误；正常无任务/未使用 worktree 为正常项或不适用。
- error 表示对应能力不可用；warning 表示局部异常、回退或并发不确定性；blocked/skipped 表示未取得证明，不能汇总成「全部正常」。
- 独立静态项始终尽量收集；依赖前置失败的项给出具体阻断链，不重复展开同一根因。
- 唯一英文通知报告：root/当前范围、能力结论与正常计数、异常详情、未完成检查与边界。正常不列逐文件和完整哈希；异常仅显示必要预期/实测证据。
- 控制字符脱敏/替换后输出，按原因合并重复问题。报告预算优先保留根因、影响、建议；超限必须显示省略数量及哪些检查未展示，不能默默截断或建议不存在的 verbose 参数。

## 3. 静态范围与信任围栏

| 检查 | 策略 |
| --- | --- |
| 项目 | 复用最近 Git 边界发现；unsafe marker 不跳过，保留 cwd 与根证据。HOME 只限制初始化写入，不把只读 check 变成写操作。 |
| 包与 manifest | 复用 package/runtime provenance 验证器；先验证包，再验证项目执行授权。固定 inventory 独立读文件收集缺失/改动，不被第一个 manifest 错误吞掉；不从未知 manifest 扩大路径列表。 |
| operation/lock | 限长 envelope、路径/schema/status/root/completed 等静态检查；不执行恢复内容或重建 skeleton。合法空资源锁与 PID 锁分别识别；存在锁不证明 stale，不删除。完整恢复计划可重试性不在本次运行健康证明范围。 |
| 角色/用户文档 | 缺必需角色/workflow/spec 入口报告实际受影响能力；托管角色修改报告定制/更新冲突，不假定不能运行；用户文档修改不按初始模板 hash 判故障。 |
| 配置 | 限长读取 config.yaml、源项目 worktree 设置及可见的相关 Pi settings；区分缺省、有效空、读失败、语法失败与消费者回退。诊断解析服从现有子集，不引入另一套 YAML 语义。未知历史字段不直接判错；识别不支持语法、重复 key 与已消费字段形态错误。 |
| 身份/workspace | 分别给出本地初始化身份与有效 runtime 身份及来源；env/main-checkout 回退保持合法。只查该身份的 workspace/index 和有界当前 journal 定位，不枚举所有开发者历史，不测写权限。 |
| 当前任务 | 只读 resolver 指定 pointer 和 exact taskRef，复用严格 task record/store 校验。顶层 source external store 例外保留；target/session store 不继承。不得搜索 archive 或其他 sessions 自动修复引用。 |

读路径先验证祖先与末端，优先复用 descriptor nofollow/nonblock/fstat/UTF-8 边界；缺失、权限错误、symlink、special file、超限分别报告。不复用吞异常的 cosmetic fast path 作为授权判定。

Pi 配置只读快照，不用 `SettingsManager.create()`/FileSettingsStorage，不运行完整资源发现或 npm；若使用宿主 getters，必须通过公开只读 storage 且不调用 setter。extension 将实际 `ctx.isProjectTrusted()` 与可见 agent-dir 来源传入，不强制 trust。当前 extension 已执行是局部证据，SDK 自定义 agent-dir、最终 loaded resource/filter 状态无法从公开 context 证明时明确未验证，不能猜安装失败。

消费者读取统一使用诊断快照 seam：安全 reader 取得文本/字节及来源后，把快照传入配置解析、身份解析和 workflow 纯消费 helper。默认生产入口仍读文件后调用同一 helper，回归其原有语义；诊断不得先安全预读再让 `_load_config()`、`get_developer()` 或 `_read_workflow()` 无预算重开文件。确需现场重读的 pointer/binding 由同一限量 reader 完成并记录快照变化，不 monkey patch 全局 pathlib/open。

## 4. 运行探测：真实但窄范围

顺序为安全静态前置 → Python 环境 → 当前上下文 → 有关 worktree。前置失败后其他独立静态结果仍输出。

1. Python 环境用固定 `-I -S -B` 启动，读取版本/解释器事实；低于 3.10、不可执行、超时分别分类。
2. 严格验证必须取得非空有效 manifest（`verifyRuntime()` 不抛错但返回 undefined 仍不授权），通过诊断 bootstrap 只加载已验证固定 source 模块；使用当前 key 实际执行 own pointer/record、有效身份、配置与 workflow Phase Index/context 选取的只读消费者。
3. 核心上下文不能直接运行默认 `get_context`（会枚举全部 task/Git 历史）。新增 current-only facts 路径，复用普通上下文的配置/任务/workflow消费 helper；若需提取 helper，须保持既有默认上下文输出与行为的回归。明确这是有限上下文能力探测，不宣称完整模型提示注入已验证。
4. 从 `task.py cmd_current` 提取共享 current payload helper，普通 CLI 与 diagnostics 同用严格 source/state/record 规则，诊断不 import 整个 task.py。新协议 exit 0 仅表示传输成功；no-task/invalid 等状态仍在 payload。既有 CLI no-task exit 1 语义不变，测试严格 payload，而非只凭退出码。
5. 执行前重验资源与 scope；返回后核对 root/key/task/binding，变动标为快照不一致。没有跨文件读/执行原子保证，不宣称消除 TOCTOU。

Bootstrap 固定为包内字面代码，不从项目路径读取或拼接程序。Host 在 package provenance 与非空项目 manifest gate 后，按固定 import closure 用 nofollow bounded descriptor 捕获**本次探测 root 部署**的 `.py` 字节：当前任务/配置/workflow 消费来自 authorityRoot，目标环境探测来自 targetRoot。每个 root 单独授权，比对 baseline hash 与 manifest mode，经限长 stdin JSON 传给 Python，关闭 stdin；不把 package `.py` 替代部署代码来宣称项目实际可运行。fresh/unsupported/incomplete 仅独立执行 stdlib 环境 probe，不传项目源表。

运行参数 `-I -S -B -X utf8 -c <fixed-bootstrap>`；显式验证 version/sys.flags/site 未加载，不能依赖 assert。MetaPathFinder 只处理可信源表的 diagnostics/common/pi_trellis_worktree 命名空间；保留 namespace 缺模块直接抛错，不 fallback。Loader 从捕获字节 `compile(..., dont_inherit=True)` 执行，真实 `__init__.py` 同样来自源表，package search locations 为空，不插入项目/package 目录到 sys.path，不用 runpy/普通 file loader 或 pyc。source table/flags/requestId/scope/schema/大小都须验证。

解释器 stdlib/zip/native 模块及其 pyc 属可信解释器基，不承诺禁绝所有 Python 字节码。Trellis 依赖的 pyc/site/customize/PYTHONPATH/未托管 shadow 不可执行；closure 随 baseline 审查，不 import CLI/session_context/materials。S2 用 capture 前替换拒绝、capture 后只执行已验字节、missing allowlist 不 fallback 等 fixture 证明。技术依据见 [planning-contracts.md](research/planning-contracts.md)。

## 5. 相关 worktree（已删除）

2026-10-15 用户纠正范围：Check 只检查部署。本节原有的 worktree 身份/绑定/当前会话 pointer 设计全部作废；托管 worktree checkout 中运行 Check 仅报告 marker 并阻断运行探测，提示回源项目。

## 6. 预算、取消与只读边界

初始工程预算（常量，无新增用户参数）：整体 20 秒；Python 3 秒、当前上下文 5 秒、相关 worktree 总计 8 秒，均受剩余 deadline 限制；预留收尾与报告时间。stdout/stderr 各 256 KiB；普通读取单文件不高于现有 4 MiB、pointer/record 不高于现有 1 MiB；文本/元数据累计 8 MiB、固定 runtime 验证累计 64 MiB、单目录最多 512 entries、最多 64 分项/异常详情，最终报告最多 16 KiB。固定清单哈希使用流式读取；任何读取都计入对应总量，不能把 hash 当预算外工作。现有严格验证器成本须计入预算，超限不能绕过验证继续执行。S2 若发现该预算不能覆盖固定清单，只能在保持有限/可见的前提下调整常量并记录理由。

子进程 shell=false、受控 env、显式 scope；stdin JSON/source table 也限长（8 MiB，另计源读取预算），无动态 argv 请求通道。Python entry 只做范围内读取与共享解析，不启动下级 Git/目标 CLI；Git 由 host 的统一 runner 固定调用，原始结果传入 native identity helper 解释。清理 inherited GIT_*，设置 GIT_OPTIONAL_LOCKS=0。保留解释器/可执行文件查找所需 PATH、平台 SystemRoot 等及合法 `TRELLIS_DEVELOPER`；context key 以 extension 的显式值覆盖，不继承其他 session 值。Python -I/-S 隔离 PYTHON* startup，环境白名单不回显秘密。

身份 main-checkout 回退与 worktree 查询共同使用诊断专用 bounded Git transport，而非现有无 timeout 的 `_probe_main_worktree_root()` 或 disk-backed `records.bounded_command()`。Git 固定只读 argv、禁用适用 fsmonitor/helper，stdout/stderr 用管道实时限量；registration 非相关行只解析文本，不 realpath/stat 无关 checkout。不得因先运行身份回退便绕过 worktree 阶段预算。不创建项目临时输出/测试写权限，也不允许内部 TemporaryFile 落入项目。

预算按一次 command 共用：包验证、execution/source/target 校验与执行前重验的所有实际读取累计计费，64 MiB 不是每次调用的新额度。诊断使用受控、可终止的 Node worker 验证 owner，复用同一 provenance 规则与限量 reader；不能把既有同步 `verifyRuntime()` 放主线程再用 AbortController/Promise.race 宣称硬 deadline。默认生产验证保持原接口，新增 reader/budget seam 不复制弱化校验。Worker 可缓存本 run 内已校验包快照，但键须含 root/release/路径/内容来源，项目执行前仍重验；超时可终止 worker，留出至少 2 秒子进程收尾和报告预算。健康支持 fixture 必须能完成默认核心探测，不能被重复哈希常态耗尽预算。

每次 command 持有 controller。重复检查中止旧 run；session_start/replacement/shutdown 失效取消并禁止迟到通知，发送前复核 scope。ctx.signal 可用才接线；不保证 idle command Esc/Ctrl-C 取消，不劫持全局按键。POSIX 受控进程组有界终止；Windows 缺已验证清理策略的相关探测标为 blocked，不伪造跨平台 PASS。

本包不写项目/外部配置/Git index，不执行 hook/模型/安装。任意用户指定解释器或 Git binary 的恶意行为、脱离进程组的恶意子孙与并发替换不属于 OS 沙箱保证；报告保留边界。所有 PASS 只表示已完成的有限只读能力检查。

## 7. 兼容与回退

只读新入口加入 runtime inventory 后需同阶段更新 baseline release identity 与 provenance 测试；不直接修改本仓库部署的 `.trellis/scripts` 或 manifest 来绕过执行围栏。旧项目继续可诊断静态问题，但新 release 对旧 runtime 的执行授权规则保持严格；引导用户显式确认资源更新，check 自己不升级。

前置 `5d3b4e4` 已完成 boundedDialog/adoptionDialog 的固定警告摘要及菜单导航，且获接受归档。本任务仅更新 Check 能力说明与对应诊断断言，不重复改写确认流程、不恢复“完整清单见 check”承诺。

回退以 stage commit 为定位点，不自动还原用户文件、删除工作树或改资源。若无法证明受限探测安全，保留静态诊断并明确 blocked，但 R5/A2/A6 未完成，不能宣称任务验收通过。
