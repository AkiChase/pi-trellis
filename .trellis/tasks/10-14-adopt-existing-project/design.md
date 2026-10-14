# Design — Adopt existing Trellis project

## 1. 边界与所有权

新增模块 `lib/initialization/adoption.ts`，与 `resources.ts`（受管项目的资源更新 / 模板采纳）平级：

| 模块 | 负责 |
| --- | --- |
| `engine.ts` | `inspect()` / `plan()` / `apply()`（fresh 初始化、clone 身份），包基线、清单校验、受管路径与块处理原语 |
| `resources.ts` | 已受管项目的 `update` / `repair` / `Apply template` |
| **`adoption.ts`（新）** | `unsupported` 旧项目的一次性显式接管：`adoptPlan()` / `applyAdoptPlan()` / `adoptionStatus()` |
| `command.ts` | `/trellis-init` 菜单路由与确认 UI |

`engine.ts` 不依赖 `adoption.ts`（无环）。`adoption.ts` 复用 `engine.ts` 导出的原语，并复用 `resources.ts` 的原子写入工具。

需要在 `engine.ts` 新增导出：

- `template(path)`（现为私有；接管需要包模板字节与哈希校验）
- `appendBlock()` / `journalAttributes()`（现为私有）
- `replaceBlock(original, block, start, end)`（**新增**）
- `projectRevision(root)`（**新增**，`git rev-parse HEAD`，沿用 `inspect()` 已有的 argv + 清理 `GIT_*` 环境变量写法，失败或非 40 位小写 hex → `null`）

需要在 `resources.ts` 新增导出：`atomicFile()`、`stamp()`、`equal()`、`read()`（已存在的私有实现，避免第三份副本）。

## 2. `replaceBlock` 语义（D2：直接替换，不备份）

```
replaceBlock(original: Buffer | undefined, block: Buffer, start: string, end: string): Buffer
```

- `original` 为空 → 返回 `appendBlock(undefined, block, ...)` 的结果（即纯 block）。
- 统计 `start` / `end` 出现次数：必须各恰好 1 次，且 `indexOf(start) < indexOf(end)`，否则抛错（0 个 → 交给 `appendBlock` 追加；重复 / 顺序错乱 / 残缺拼写 → 拒绝接管，不猜测边界）。
- 仅把 `[indexOf(start), indexOf(end) + end.length)` 这一段替换为 `block.trimEnd()` 对应的规范字节；**前缀与后缀字节原样保留**。
- 若替换结果与原字节相同 → 行状态为 `Current`，不进入写入列表。
- 文件模式沿用原模式（`original?.mode ?? 0o644`），写入走 `atomicFile`（同目录临时文件 + `rename`）。

`AGENTS.md` 与根 `.gitignore` 两个带标记的托管块都用这条规则；`.gitattributes` 仍用 `journalAttributes()`（加性规则，冲突则拒绝）。

## 3. `adoptPlan(rootInput)`

前置条件（任一不满足即抛错，零写入）：

1. `const state = inspect(rootInput)`；要求 `state.state === "unsupported"`。其它状态直接抛 `state.diagnostics`（`inspect()` 已覆盖 HOME、managed worktree、Python 版本、`init.lock` 存在、未完成操作记录、损坏清单→`conflict`）。
2. `root = state.root`（已 realpath）。断言 `.trellis/.pi-trellis.json` 确实不存在、`.trellis/.runtime/init-operation.json` 不存在（存在则要求先处理，不接管）。

计划构造（全部字节来自包资源，不信任项目内容）：

| 组 | 路径 | 行为 |
| --- | --- | --- |
| runtime + agent | `packageResources()` 的 35 项 | 字节一致 → `Current`；存在但不同 → `Replace`；缺失 → `Install`。包字节必须匹配 `resources/runtime-baseline.json` / `docs/agent-baseline.json` 哈希 |
| template | `defaultTemplates()` 的 8 项 | 存在 → **不写**，行 `Preserve`，清单记 `{origin:"preserved-project", sha256, mode, source:{kind:"project-snapshot", revision}}`；缺失 → 写包默认，行 `Create`，清单记 `package-default` |
| root blocks | `AGENTS.md`、`.gitignore` | 无块 → 追加规范块（`appendBlock`）；有唯一规范块且字节一致 → `Current`；有唯一块但不同 → `Replace block`（`replaceBlock`）；重复/错乱 → 抛错 |
| root attribute | `.gitattributes` | `journalAttributes()` 追加 journal `merge=union` 规则；已存在 → `Current`；冲突属性 → 抛错 |
| 旧版遗留（D1） | `.trellis/.version`、`.trellis/.template-hashes.json`、`.pi/.pi-trellis-hashes.json`、`.trellis/agents/`、`.trellis/scripts/**` 中不属于清单的文件 | **只报告**，行 `Legacy — left in place`；永不进入写入列表，永不删除 |

`revision` 对所有 `preserved-project` 条目取同一个值（接管时的项目 HEAD，或 `null`）。

旧版遗留扫描是有界的：仅 `.trellis/scripts/**` 递归 + 上述固定白名单路径；跳过符号链接与非普通文件；最多列 256 条，超出只报计数。

返回：

```ts
interface AdoptPlan {
  root: string;
  releaseId: string;
  rows: { path: string; state: "Install" | "Replace" | "Replace block" | "Create" | "Preserve" | "Current" | "Legacy" }[];
  changes: { path: string; data: Buffer; mode: number; before: Stamp | null }[];
  guards: Record<string, Stamp | null>;   // 包含所有 changes 路径 + 清单路径 + 所有 preserved 模板路径
  legacy: { paths: string[]; omitted: number };
  manifest: InstalledManifest;
  revision: string | null;
}
```

构造结束后对 `manifest` 跑一次 `engine.ts` 的清单校验（经 `verifyRuntime` 使用的同一校验路径）以保证不会发布无效清单。

## 4. `applyAdoptPlan(plan)`

1. 重新 `adoptPlan(plan.root)` 并比对签名（`digest(JSON.stringify(...))`，`data` 以 base64 规范化），不一致 → `Project or package changed since adoption preview; review again`。
2. 取共享锁 `.trellis/.runtime/init.lock`（`openSync(..., "wx", 0o600)`）：锁存在即拒绝，**绝不自动删除或判定为陈旧**。`finally` 中仅删除本次创建的锁。
3. 锁内再比对一次签名，再次确认清单与操作记录仍不存在。
4. 按 `changes` 顺序逐个 `atomicFile(path, data, mode, before)`；每次写入前后以 `guards` 复查（并发变化 → `Concurrent change preserved: <path>`）。**不写备份、不写 operation 记录**（D2）。
5. 所有资源写完后再发布清单（最后一步）。发布前校验：所有 `Install`/`Replace`/`Create` 路径的落盘指纹等于计划输出；所有 `Preserve` 路径指纹仍等于计划中记录的 `preserved-project` 指纹。
6. 发布后 `verifyRuntime(root)` 必须返回清单，且 `inspect(root).state` ∈ `{"supported","ready"}`，否则抛错（部分文件保留，不自动回滚）。
7. 返回最终 `Inspection`，由命令层展示。

**可恢复性设计（替代 operation 记录）**：清单是最后一步，中断后项目仍是 `unsupported`，已写入的 runtime 文件在下一次 `adoptPlan()` 中变成 `Current`（无需再写），因此重跑 Adopt 即为幂等恢复。这是本任务对 PRD R6 的收敛：复用锁 + 清单最后发布 + 幂等重试，不引入 `init-operation.json` 这一需要 `InitPlan` 形状的记录（写入异形记录会让 `verifyRuntime()` 直接判定项目异常且无重试路径）。

## 5. 身份与任务

接管**不处理** identity / workspace / onboarding 任务：

- 旧项目通常已有合法 `.trellis/.developer`（样本为 `name=akichase` + `initialized_at=`，`engine.ts:102-109` 的解析兼容）→ 接管后状态直接为 `ready`。
- 若 `.trellis/.developer` 缺失 → 接管后状态为 `supported`，由既有 `Set up developer identity` 路径补齐（复用现成代码，不新增分支）。

既有 `.trellis/tasks/**`、`.trellis/workspace/**`、`.trellis/spec/` 下非模板文件、`config.yaml`、`workflow.md` 字节与模式一律不变。

## 6. 命令层集成（`command.ts`）

- `unsupported` 分支由"仅报错"改为菜单：`["Adopt existing project", "View project status", "Cancel"]`，标题用 `statusSummary(state)`。
- 选择 Adopt → 构造 `adoptPlan()` → 一次 action-list 确认，摘要包含：
  - `Install` / `Replace` / `Replace block` / `Create` / `Preserve` / `Current` 分组行；
  - `Legacy — left in place` 行（含省略计数）；
  - 固定说明：`Existing runtime scripts, role files and the AGENTS.md managed block are replaced without backups. Workflow, config, spec, tasks, journals and identity are preserved. Nothing is deleted.`
- 确认后 `applyAdoptPlan()` → `notify(statusSummary(result) + 后续提示)` → `refresh(ctx, root)` → `ctx.reload()`（与 fresh init 一致，刷新根指令与角色发现）。
- `View project status` 与 `--check`：当状态为 `unsupported` 时改用 `adoptionStatus(root)`（列出 rows + 遗留项 + 可执行提示），不再输出 `resourceStatus()` 的 `No managed project manifest` 死语。
- `INIT_HELP` 增加一句接管说明。

## 7. 失败与回滚

- 任何前置条件失败 → 零写入。
- 写入阶段失败 → 已写文件保留，清单未发布，项目仍 `unsupported`；错误文案提示重跑 `/trellis-init` 继续接管（幂等）。
- 无自动回滚、无删除、无 Git 操作、无安装、无 hooks、无模型轮次。

## 8. 测试策略

新增 `tests/adopt-project.test.mjs`，夹具构造 0.6.16 形态的临时项目（旧 `task.py`/`common/*` 字节、旧 `.pi/agents/trellis-*.md`、旧 `AGENTS.md` TRELLIS 块 + 块外自有章节、`.trellis/.version`、`.trellis/.template-hashes.json`、自定义 `workflow.md`/`config.yaml`/`spec/guides/*`、既有 task 与 journal、无 `spec/index.md`）：

1. 成功接管：状态 `ready`、`verifyRuntime()` 通过、35 个清单路径字节=包基线、`spec/index.md` 被创建且记为 `package-default`、其它模板记为 `preserved-project`（含 `revision`）。
2. 保留性：`workflow.md` / `config.yaml` / `spec/guides/*` / 既有 task / journal / `.developer` 字节与模式不变；`.trellis/.version` 等遗留文件仍在。
3. `AGENTS.md`：块内替换为包 block，块外前后文字节不变，文件模式不变；重复/错乱标记 → 拒绝且零写入。
4. 幂等与重试：中断（注入写入失败）后清单未发布、项目仍 `unsupported`，重跑成功；成功后再次 `adoptPlan()` 抛错（已受管，走 supported 菜单）。
5. 拒绝路径：已受管项目、worktree（`binding.json`）、HOME、已有 `init.lock`、已有 `init-operation.json`、符号链接/非普通目标、包哈希不匹配、伪造/过期计划签名。
6. `extensions/trellis.ts` 在接管后不再阻断 runtime 调用（与 `tests/unsupported-runtime.test.mjs` 的阻断断言互补）。

`tests/init-command.test.mjs` 增加：`unsupported` 菜单包含 Adopt、取消为只读、确认后状态与通知文案。

## 9. 明确不做

通用 upstream 迁移 API、旧 `trellis update` 兼容、远程模板、非交互强制接管、删除任何旧版文件、真实用户项目上的实际执行。
