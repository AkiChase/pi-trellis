# Research: Worktree 材料刷新、收集与派发新鲜度

> 2026-10-13 用户范围纠正：不考虑旧 worktree。本文第 6 节及其他 legacy baseline/旧记录迁移/兼容测试建议已被否决，仅保留为研究过程记录，不属于设计、实施或验收要求。后续只围绕新创建并准备的 worktree 设计，不新增旧记录补建基线机制。

- **Query**：只读研究 refresh/collect CLI、三方快照、task.json 归一化、旧 v1 记录兼容、引用增删、派发新鲜度与 check 失效。
- **Scope**：本仓库源码、相关规格与测试；未做外部研究。
- **Date**：2026-10-13。
- **Inspected revision**：`07614dd83181dfa3d97b6c61b603af3059f51fdf`。
- **授权边界**：PRD 方向已认可，实施尚未获批。本研究只新增此文件；未运行任务生命周期、部署、worktree 管理、测试或提交命令。文中接口均为建议，除明确列出的现有 API 外尚未实现。

## 1. 现状与实际修改落点

| 文件 / API | 已验证行为 | 新能力的落点 |
| --- | --- | --- |
| `python/pi_trellis_worktree/materials.py:19–132`：`task_path`、`safe_path`、`task_record`、`references` | 根目录/任务仓 containment；两份角色清单各自有引用/目录数量上限；完整 UTF-8/NUL 校验，不受 prompt budget 影响。`references` 自动加 PRD、可选 design/implement；不返回 task.json 或 JSONL 本身。 | 保留现有验证；拆出可供 overlay 读取的引用枚举/文件访问能力，让 preview 校验“应用计划后的文件图”，不创建临时任务或修改真实文件。 |
| `materials.py:183`：`prepare` | 复制 task.json、PRD、implement/check JSONL、可选 design/implement、两份清单明确引用的当前任务内文件。未选择 research 不复制；非当前任务引用只能验证既有 baseline，不能复制。 | 共用 selection builder、哈希/规范化、受保护的 task-local 文件读写。首次 prepare 成功时建立材料快照。 |
| `materials.py:170`：`validate_ready` | 校验本地 runtime/CLI、两份清单、目标 `status=in_progress`、绑定 branch、目标 `task.py current --json` 的独立 context/provenance。 | 将“目标 context/metadata 校验”与“完整角色材料校验”分开。refresh 可以修复失效旧引用，不应先被旧引用图阻断。 |
| `python/pi_trellis_worktree/manager.py:30`：`query` | 只读、不拿锁；`ready=True` 查源 status、目标 readiness，却不检查源材料变化。 | 唯一 freshness policy 入口；给 status/query 同一份 materials summary；ready query 拒绝未同步源漂移。 |
| `manager.py:122`：`manage` | `prepare` 在 ready 时直接复用，不同步源更新。confirmed management 与宿主派发共享 source lock。 | 添加 refresh/collect 分支；ready prepare 仍保持验证/复用，提示用 refresh，不偷偷刷新。 |
| `manager.py:81`：`publish` | 先源 binding，再目标 marker；不是跨目录事务。source 为可变状态权威；immutable identity 不含 preparationState。 | 保留 identity 与 v1；新增可选材料快照指针，不把材料 revision 纳入 `same_identity`。 |
| `python/pi_trellis_worktree/records.py:152–256` | v1 binding 保留额外字段；binding 最大 1 MiB；execution 最大 64 KiB。`preparedFiles` 只是 copied bytes 的 hash 字典。starting/running/unknown 都占用。 | 校验新可选字段/快照、runtime 路径、hash、上限；缺少新字段不等于损坏旧绑定。 |
| `python/pi_trellis_worktree/cli.py:34`：`parser` | operation-specific argparse；禁止 abbreviation、重复/inapplicable flag；`status` 不接受 confirm；所有管理 task 显式指定。 | 增加 refresh/collect help、严格 file 选择和 preview fingerprint；不要新增管理 tool 或 Node CLI。 |
| `lib/worktree-query.ts:14`：`queryWorktree` | 使用**包内** `python/query-worktree.py`，不是目标部署副本；30s、stdout/stderr 1 MiB。 | 增加 Python 返回 summary 的 TS 类型，仅消费 opaque version/fingerprint，不复制 Python merge/freshness 规则。 |
| `lib/subagent-rpc.ts:112–121` | ping 后在 source lock 内再次 ready query；随后从目标 build context，但仍使用先前 binding 构造多数数据。starting 写入后 spawn cwd/off。 | 必须使用 locked query 的最新可变材料字段；prompt、execution record 都携带同次版本。 |
| `lib/executions.ts:8,35` 与 `manager.py:48,132` | execution 只有一个最新 record；finalSnapshot 是目标 checkout 指纹，忽略 runtime/.pi 等，较大文件用 size/mtime；status 仅表达“check ended on current snapshot”，不判断 pass。 | 增加 optional 材料 revision/source/target fingerprint；current check 同时查材料与 checkout。不伪造 acceptance 或删除历史报告。 |
| `lib/task-context.ts:209,225` | 第一行 task、context/role header 已有严格解析；complete marker 归 renderer 所有；调用方 markers 被清理。 | 新版本事实应是受管 renderer 所有的 header/prose；不得让调用方声明材料版本。不影响旧非受管调用。 |
| `scripts/deploy-worktree.py`、`python/worktree.py` | 固定项目入口+private modules；manifest 保护用户修改；不自动部署。部署器枚举 Python package 的 `*.py`。 | 优先复用现有模块；若拆小模块要同步 `require_target_cli` 文件列表及部署测试，不能认为 glob 自动解决 target readiness。 |

关键规格：`.trellis/spec/extension/worktree-lifecycle.md`、`quality-guidelines.md`、`.trellis/spec/scripts/installation-and-patching.md`。本研究不修改这些规格或 `.trellis/workflow.md`。

## 2. 最小兼容数据模型：hash-only 三方祖先 + accepted source

### 不要直接复用 preparedFiles

`preparedFiles` 不是源快照：task.json 已改为目标 branch，JSON 序列化也变了。现有 `prepare` 在 start/hooks **之前**算哈希，不能证明 hook 后目标与源仍相同。它也不包含外部 referenced baseline、原引用集合或 normalized task.json。

建议继续保留 `version: 1` 和旧 `preparedFiles`，新增 optional 材料 descriptor，例如：

```text
binding.materials = { version: 1, revision: <opaque id>, snapshotId: <safe id> }
```

材料私有快照存于**源** ignored runtime，例如：

```text
.trellis/.runtime/pi-trellis/materials/<bindingId>/<snapshotId>.json
```

- 新快照先以现有安全 atomic JSON 模式写完，再发布源 binding 的指针，最后发布 marker。源权威快照，不信任 marker 内可变 revision。
- immutable 快照 + compact binding 比把多个 full maps 塞入 binding 稳妥：binding 已有 1 MiB 上限，query 在目标调用时可能同时返回 local/binding 两份，宿主 buffer 也只有 1 MiB。快照限大小/条目，query 只返回 bounded summary、counts、最多若干路径及 omission count。若只读 query 无法完整判断，返回 invalid/unknown，不因截断宣称 fresh。
- 不存完整正文，只存 path/集合信息/严格 SHA-256；做整文件三方判定，不做文本 patch merge。不需要保留历史完整字节，也不依赖 Git commits。
- 快照由 Python 生成/验证，TS 只记录其 opaque fingerprints。不要新做一份 TS canonical JSON 算法。
- 每个新 revision 保存：accepted source selection/ref map、源 canonical hashes、每文件祖先 B、仍保留的 detached/orphan 文件 ancestry、collect 收敛信息。普通文件 B 是最后一次双方内容收敛的 hash，缺失用 `null`，不能拿空字符串当缺失。
- sourceVersion 覆盖当前任务固定材料、optional artifact 存在性、两份 manifest 内容及展开的 source 引用集合/hash。非 task 引用也只记 hash/集合，不复制。
- targetVersion 覆盖此次实际角色材料图及 normalized task metadata；目标 research/evidence 修改可改变 targetVersion，但不自动改变 accepted sourceVersion。

### 必须区分祖先 B 和 accepted source snapshot

刷新后的“快照更新”不能把保留的目标单侧改动当作新的共同祖先。

```text
初始 B=A，源 S=A，目标 T=用户研究改动 L。
refresh 保留 L：acceptedSource=A，祖先仍为 A。
后来源 S=N：必须判定 N 与 L 双侧冲突。
```

如果第一次 refresh 直接把 targetBase 更新为 L、把它标成 clean，第二次会把 L 误当作未修改目标而覆盖。正确做法：accepted source 更新到本次已批准的 S，但 B 只有写入/收集后双方真正收敛时才更新；保留分歧要继续显式记录。保存“本次 observed target”可用于展示，但不能代替 B。

采用 common canonical B 足够；task.json 归一化后也使用 B/S/T。无需存正文做 diff3。

### Revision 的含义

revision 是一次批准的材料同步/基线接受代次，sourceVersion/targetVersion 是内容指纹。confirm refresh 若改变 accepted 要求、引用集合或建立旧记录基线，即便未改目标文件，也产生新 revision；真正无变化的 no-op 不必产生新 revision。只收集不在执行材料图中的新证据，可只更新 collection tracking，不改变要求 revision。

## 3. task.json：只同步要求投影，保留目标生命周期

现有 `.trellis/scripts/common/types.py:21` 明确要求 writes 使用原 dict、保留未知字段；task.py start 只填 branch、翻 planning status，hooks 可以修改 meta。task.json 的 `relatedFiles`、children/subtasks 等**不是**当前材料枚举 API，不能当作自动文件复制指令。

建议固定、文档化一个 excluded lifecycle set：

```text
branch, worktree_path, status, completedAt, commit, pr_url
```

- Normalize：用 `records.json_value` 读取原 dict，移除上述 key，canonical sorted JSON 编码后 hash；普通文档仍按 bytes hash。JSON whitespace/key-order 不引起 task metadata 假漂移；缺 key 与显式 null 仍有区别。
- `base_branch` 属于 review/integration 要求，默认纳入投影，不等同目标运行 branch。
- `id/name` 是任务身份，变更需显式诊断，不用 refresh 偷偷 rename/bind。taskDir 本身更不允许迁移。
- `meta` 和未知字段保留并纳入投影；不因不知道语义就删掉。hook 新增 meta 可能成为目标单侧变化/冲突，需显式展示。
- Refresh 若允许 task metadata 更新，先对**整个要求投影**做 B/S/T 判定，再把源投影 keys 添加/更新/删除到目标**原 dict**，保留 excluded 字段；不整文件覆写，不从源复制 context/pointer。不要按字段自动合并两个有争议的要求版本。
- 源必须仍 in_progress；目标 status/branch 必须满足既有 bound context 校验。这是独立 eligibility guard，不能因 normalize 排除 status/branch 而跳过。
- Collect 一律拒绝 task.json，包括显式选择；要求变化通过 PRD/design/manifest 收集审核，metadata 由主 agent 使用正常任务接口处理。
- 首次 prepare 当前 branch-only 转换可保留；建立 normalized B 应用的是**实际交付内容**，不是事后把 hook 输出视为 approved source。hook 引起的目标分歧应可见；不覆盖 hook 字段。

投影的 excluded set 属于可审阅的契约，最终需主 agent/用户确认；不应把上述建议描述为现有实现。

## 4. Refresh：有界的显式 source → target 整文件协调

建议 CLI：

```text
python3 .trellis/scripts/worktree.py refresh --task <task> [--cwd <root>] [--json]
python3 .trellis/scripts/worktree.py refresh --task <task> --confirm --expect <previewDigest> [--json]
```

`--expect` 建议仅新 refresh/collect 的 confirm 必需：预览输出完整计划 fingerprint，confirm 在 source lock 内重算并匹配，避免用户批准旧预览却执行新要求。没有持久 reservation、没有 shell token/eval；token hash 不是用户批准的证明。无需改旧 create/prepare 参数契约。

### 状态/顺序

1. 只允许已有绑定，验证 repository/registration/branch/marker identity；source/target context eligible。starting/running/unknown 都拒绝，包括预览；不拿 stop success 当 terminal。
2. 读取快照或进入明确 legacy baseline 路径；枚举 source 新图、旧图、target 当前图。目标旧清单无效时记录原因，但能修复的 source 单侧 manifest 更新不应被过早 validate_ready 阻断。
3. 对 union paths 做 B/S/T 全量分类；preview 返回 add/update/delete/detach/keep/no-op/conflict、引用集合变化、预计 check 失效、可执行标记。冲突 preview 可 `ok:true, applicable:false`，confirm 则拒绝；绝不 partial apply 非冲突文件以绕过其余冲突。
4. 用内存 read overlay 验证**拟应用后**的两份目标 manifest + artifacts + metadata；不是在真实目标临时写“试一下”，也不能调用 task.py start 来校验。
5. confirm 获取 source lock、reload immutable identity 与最新 snapshot、再查 occupancy/状态/计划 fingerprint；先验证全部，后逐文件写入/删除。
6. 每个写入前复查路径类型、ancestor containment、before bytes/hash；新文件 exclusive create；覆盖用同目录临时文件、保留 mode、再 replace；删除只对确定的 task-local regular file，复查 before hash，不删除目录树。
7. 成功后重查目标 readiness、重新验证 source 未发生变化、发布快照/revision。refresh 不 rerun start/hooks，不推进 lifecycle，不改 source/runtime pointer、不碰业务代码。
8. 多文件写入不是事务。中途外部改动/写盘失败保留已发生的改变，source binding 进入 error 并保留诊断/旧快照，阻断派发；不 force rollback，也不声称所有 TOCTOU 都被消除。existing recover 不足以证明材料重新一致，恢复后仍需 refresh/基线确认。

### B/S/T 基本判定（普通已管理文件）

| 状态 | refresh 行为 |
| --- | --- |
| S=B，T=B | no-op |
| S≠B，T=B | source-only：更新目标；S=null 时可删除，条件见下节 |
| S=B，T≠B | target-only：保留目标与 B，展示 targetChanges；不宣称双方收敛 |
| S=T（双方同样改变或都删除） | converge/no-op bytes，接受新 source snapshot；B=S=T |
| S≠B，T≠B，S≠T | 双侧冲突，整次 confirm 拒绝 |
| 无 B 的新文件，目标缺失 | source add；必须是新选择的 task-local 正常文件 |
| 无 B，双方存在且相同 | 明确预览后接受已收敛 baseline |
| 无 B，双方存在但不同 | unknown ancestry，冲突；不能猜目标来自旧 source |

### 新引用、删引用和删文件必须分开

- 新 task-local ref：复制/建立 B；目标同名不同内容且无可靠 B 则拒绝。目录引用展开成明确 regular file 集合；不递归复制目录对象/链接。
- **deselected 但源文件仍存在**：推荐保留目标文件、标成 detached，停止把它作为当前 approved source input；保留其 B 供将来 collect/reselect 判断。不要把“移除 JSONL 行”解释为授权删除研究产物。
- **源文件真的删除且已不被新图引用**：旧 managed T=B 时可作为 preview 中的 delete；T 已改动则保留为 orphan output，不能覆盖/删除。旧图 B 留作 collect/conflict ancestry，不把 orphan 消失隐藏起来。
- 源删文件但新清单仍引用它：source graph invalid，拒绝，用户先修清单；目标清单同理对 prospective 图校验。
- 一个文件仍被任一角色/固定 artifact 引用，不能因另一角色删 ref 而删除；role 集合和 union 集合都需比较。optional design/implement 的存在/消失同样纳入。
- target 清单新增自己的研究 ref：必须记录目标图变化、检查源是否也修改清单；不能靠 source-only selection builder 漏掉新增图或把输出误当输入自动回写。
- 非 task ref（含其他任务）永远不复制/删除。新增 ref 要在目标已存在并满足既有准备 baseline 约束；源 baseline 更新而目标仍旧时 refresh 报“显式 reconcile baseline”，不能通过只更新 source fingerprint 让旧 spec 继续派发。目标自己改 referenced baseline 不代表获得 source-writing 权限。
- 同一 canonical file 的 alias、source top-level external task-store symlink仍按现有窄信任模型处理；copy/collect 要比一般 `safe_path` 更严格，最终必须是当前任务内 local regular file。reject 控制字符/unsafe labels/symlink final file，不以 lexical prefix 一项判断安全。

## 5. Collect：显式选择、逆向三方判断、不收生命周期

建议 CLI：

```text
python3 .trellis/scripts/worktree.py collect --task <task> [--json]
python3 .trellis/scripts/worktree.py collect --task <task> --file <task>/research/report.md --file <task>/implement.md [--json]
python3 .trellis/scripts/worktree.py collect --task <task> --file ... --confirm --expect <previewDigest> [--json]
```

- 无 file 的调用只读列候选/counts，不自动选择；confirm 必须有至少一项显式文件。file 为 project-relative 当前任务路径，与 preview labels 一致；不支持 glob、目录复制、`--all`。重复 file 或别名重复要拒绝；`Once` 不能直接用于可重复 file，可做独立 accumulation action，其余 flags 保持 Once。
- Candidates 可有未在 implement/check 清单里的 target research/evidence，因此不能只调用 `references(target)`。bounded task walk/discovery；只显示路径/状态，不自动读取任意二进制内容。最终选中文件必须 UTF-8/NUL-free、regular、contained；禁止 task.json、runtime、外部任务、代码、凭据型隐藏环境文件。
- 使用已有 B 或此前明确 collection baseline 的 B，方向反转：S=B、T≠B 时可收集目标；S≠B、T=B 保留源；S=T 幂等；双方不同于 B 且互异则冲突。全次选择中有冲突则不写。
- 新 target-only output 没有 B：source 不存在即可预览 add；source 相同为 already-collected；source 存在但不同必须 unknown/conflict，不能以“研究目录一般归目标”覆盖源研究。
- **推荐 MVP 不从目标删除传播源删除**。collect 缺失选中文件应诊断，不删除源；target deletion collection 可作为后续单独审批需求。
- 显式选 PRD/design/implement/JSONL 可以回收文档修改，但这不是自动批准新要求；主 agent 审核该 preview 的内容差异再 confirm。普通字节 hash 能判断冲突，preview 应给 hashes/actions，用户通过 read/diff 审阅，不把巨大的全文塞入 JSON。
- Collect JSONL 时，拟应用 source 图必须可读；目标新增引用的 task-local依赖需**同时显式选择**或 source 已有相同内容。缺依赖则列出缺项、整次拒绝；不能收回 manifest 却不收文件，也不能偷偷自动复制依赖。非 task ref不收集，prospective source 应可验证。
- 在 source lock 下重复验证身份、occupancy、source/target selection与 before fingerprints；source 写入同样支持其显式外部 task store，但不得把该许可扩大到其他外部路径/任务。
- 成功收集双方相同文件可推进其 B/collection receipt，避免重复 collect。未选择文件保持旧 ancestry；source 中别的要求漂移不能被本次 collect 擦除/“认可”。
- 如果所选资料改变了 executed input 图/内容，需明确更新/失效 material revision，不能仅把 B 改为新 source 而继续标记老 check 当前。只把不被执行图引用的新报告加回 source，无需伪造新 check，也不改变目标 checkout。
- 不 commit、merge、archive、写 task.json；不替代 Git 集成。建议源为唯一 task archive 位置，收集发生在 archive 之前；源任务已归档/不存在时不猜 archive 路径或重建旧 task。目标任务是执行副本，不独立归档，后续 removal 仍需要单独批准、clean tree、preserving commit。

## 6. 旧 v1 记录：非破坏性的 baseline-required

推荐默认策略：

1. 旧 v1 identity/records/stop/status/recover/remove 照常解析；不改 ID、base、branch、context，不重建/删除目标。status 显示 `materials: legacy-untracked / baseline-required`，不能叫 fresh。
2. **首次 managed dispatch 在缺快照时拒绝**，提示先 preview/confirm refresh 建立基线；不能通过 ready query 偷偷创建快照或默认接受目标现状。
3. Legacy refresh 在 S/T canonical 投影、引用图都相等时可明确建立 B；外部 baseline 保持既有验证。目标额外未选择研究可以保留/收集，不需强制清空。
4. 若普通旧 managed 文件的 T hash 正好等于旧 `preparedFiles[path]`，可作为“目标未偏离曾交付 bytes”的有限证据，在显式 legacy preview 中接受源更新。B 可使用该 hash；**不要**据此证明源从未变化或 old check current。
5. 旧 task.json raw `preparedFiles` 没有历史 normalized projection；当前目标的 branch/format重建匹配可作为辅助诊断，但不能恢复已丢失的历史要求。S/T normalized相同时可接受；不相等时要求主 agent 先人工 reconcile，不自动以源覆盖。
6. 没有可靠 B 且 S/T 不同的路径保留、报 unknown ancestry；不存在 `--force` / `--accept-current-target` 任意覆盖。先由主 agent审阅收集/手工协调再建基线。
7. 老 execution 缺 materialVersion/revision 仍能读取/停止/保留 occupancy；status 显示“材料版本不可追溯，旧 check 不证明当前材料”。不填入当前版本伪造证据。

这会比“旧 ready 继续放行”严格，属于需用户确认的兼容安全选择。完全保留旧放行语义无法同时保证 R4 的要求新鲜度。

## 7. 派发 query guards 与 check 失效

### Python 唯一规则归属

`manager.query(..., ready=True)` 除原 readiness 必须：

- 完整有效快照 + compatible snapshot schema。
- 当前 source 要求/选择/ref hash 与 accepted source 对比无未同步漂移；所有角色都遵守，不新增任意 bypass flag。
- 未解决 B/S/T conflicts 或 source graph invalid 都拒绝，错误给路径/count 与 refresh/reconcile 指引。
- source branch/status 保持独立 guards；normalized 忽略 branch 不等于免校验。
- target research/evidence 的单侧变化不 blanket 禁止；最新 targetVersion 要返回并进入执行事实。目标 authoritative doc 单侧变化的额外阻断见用户选择。

status、普通 query 即便 drift 也尽可能返回 structured summary，不仅报笼统 readiness exception；有身份问题或非法材料时标 invalid/unknown。总结字段可以是 sourceDrift、targetChanges、referenceAdded/Removed、conflicts、legacy、revision/sourceVersion/targetVersion、verification；不返回巨大 maps 或正文。

### 宿主派发使用“最新”而不是先前 binding

`sameIdentity(latest.binding, binding)` 只比较 immutable identity，**不会**校验材料 revision。`subagent-rpc.ts` 当前在 locked query 之后用早先 binding 建 prompt/record；新代码必须以 locked query 的 latest metadata 为准。

最小可靠顺序：初次 ready query → provider ping → source lock →最新 ready/material query → render target context →最后一次只读 material/ready fingerprint 检查（仍在锁内）→记录本次 revision/sourceVersion/targetVersion→spawn。渲染前后的要求/目标 fingerprint 不同则不 dispatch、不写 starting。若不加最后检查，至少需明确 race limitation；source lock 不禁止用户编辑文件。无需把 Python policy搬到 TS。

`validate_ready` 会调用 target task.py current；这是项目脚本，可能有自定义副作用。测试已经覆盖其在 locked query 内改 material。新 freshness snapshot 应在该调用**之后**读/算，或检查 pre/post。不能把“query 本身没有管理写操作”等同“任意 task.py current 绝不写”。校验不自动修补/部署 task.py。

新增 prompt 版本事实由 renderer 构造，caller prose 同名事实不能授权。保留第一行 Active task 与旧 parseDispatchFacts 兼容；仅 managed dispatch 注入新 material事实，普通 assemble 调用仍可无版本。预算不足仍用已有 fallback，不把版本标记误当完整材料 marker。

### check 当前性 = checkout + material lineage，不是 completed/pass

新 ExecutionRecord optional字段建议包括：`materialRevision`、`sourceVersion`、`targetVersion`，必要时记录 finalTargetVersion；terminal callbacks 与 early-completion 路径都保留 start facts。不能在终止事件把当前要求 revision写入旧 record来“追认”。

status 显示 current check 至少需要：

1. role 为 trellis-check 且 state completed；
2. 原 finalSnapshot 存在并等于当前 checkout snapshot；
3. start materialRevision 等于当前 accepted revision，source 当前无 drift/conflict，材料状态 valid；
4. 若显示更精确 final material freshness，finalTargetVersion 与当前 targetVersion 相等。

如果 check 自己修改研究/计划/代码并在终止前复验，可保留 final target fingerprint；但它修改 authoritative 要求不应自动变成 source-approved。旧 record 缺字段显示 unversioned，不显示当前材料 verified。

refresh 改引用/接受 S=T/新 baseline 可能没有任何目标 bytes 修改，finalSnapshot 完全不变；**仍必须因 revision 改变而 stale**。反过来源 PRD 改而尚未 refresh 时旧 checkout 不变，也应 stale。不要只靠现有 checkout hash。报告文件、execution terminal state、agent ID 都保留，仅改变有效性解释。

现有 execution 文件只保留最新执行，不是历史 ledger。若需求只要求“本次可追溯”，无需顺带开发完整执行历史；要跨多次执行保留所有记录属于新范围选择。

## 8. 建议测试矩阵（本次只读，不声称已跑）

- `tests/python/test_worktree.py`：normalized JSON order/branch/status vs scope/meta；invalid snapshots/NaN/null/hash/path/count/bytes；B保留目标分歧；new/delete/detach/reselect；optional artifacts；多角色同文件；目录新增/删除/循环/unsafe aliases。
- `tests/preparation.test.mjs`：首次未提交材料快照；hook 后变化不成为 approved B；ready prepare no refresh；refresh conflict zero-write/source pointer与业务代码保持；preview/confirm plan变化拒绝；中途失败保留文件/error。
- `tests/worktree-cli.test.mjs`：新 help/strict flags、重复 file、非法路径与 binary；preview不写快照/lock/cache；Node不可用；source外部 task store/target外部store拒绝；new modules部署缺失；old v1 baseline-required与 preparedFiles有限迁移；snapshot publication失败。
- 新 `tests/material-sync.test.mjs` 可复用 existing native subprocess fixture：collect未知 ancestry/新target-only报告/重复幂等/source drift保留/manifest依赖缺失/task.json禁收/目标删除不传播；运行或unknown全拒绝。
- `tests/dispatch.test.mjs`：源 PRD/normalized metadata/ref集合更新无 spawn/lease；ping期间源更新第二次 query拦；render期间变化最终query拦；target证据保留可派发；最新revision进入prompt/record；早到terminal/shutdown/stop保留新事实；旧check unversioned；刷新无目标改动仍 stale。
- 现有“locked query修改target spec后render最新内容”测试需明确继续允许哪个 target baseline edit；不能不解释地放宽/删除安全断言来过测试。
- `tests/task-context.test.mjs`：新增 managed facts不破坏首行/markers/idempotence；caller伪版本不授权；non-managed旧调用形状保持。部署与agent生成的测试仅在对应文件需要改动时扩展，不自动执行实际 install。
- 全量验收仍由实施阶段运行 `env -u TRELLIS_CONTEXT_ID npm test`、link/diff检查；仓库没有 lint/typecheck script，不能标这两项 Passed。真实provider/平台保证本次未验证。

## 9. 需要用户/主 agent 明确的政策选择

1. **旧 ready 无快照能否继续派发**：推荐 baseline-required，stop/status/identity兼容；继续无快照派发无法证明源新鲜。
2. **目标单侧 authoritative doc 修改是否阻断 implement**：推荐 PRD/design/manifest/normalized要求 metadata 修改先收集审阅再 implement；research/证据允许。`implement.md` 常含完成勾选，整文件严格阻断会影响正常实施；可先仅告警/允许 check、research，具体角色规则应明确，不做隐式 Markdown checkbox解析或自动批准目标新要求。
3. **删引用是否删目标文件**：推荐 deselect保留、physical source deletion只删未改副本、改过的保留orphan；collect MVP不传播目标删除。若用户希望 deselect也清理，需要明确额外删除审批而非隐藏在集合比较中。
4. **task.json 生命周期投影边界**：推荐上述 excluded set；base_branch/未知meta纳入要求，collect永不收task.json。用户若有hook/runtime metadata约定，应说明哪些字段是目标独有，而不是把整个meta排除导致要求更新漏检。

其余建议是实现上的最小安全选择：Python hash-only整文件三方协调、显式文件收集、source authoritative快照、无自动 merge/force/lifecycle、版本参与check当前性。最终 design/implement 文档需把上述政策确定下来，再请求实施授权。
