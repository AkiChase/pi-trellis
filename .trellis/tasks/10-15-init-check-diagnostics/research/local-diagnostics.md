# `/trellis-init --check` 本地诊断研究

## 1. 研究边界与结论

- 任务仍为 **planning**。本轮仅阅读源码、测试及宿主公开声明；只写本文件。未运行初始化、项目 Python、worktree 查询、测试、start、commit、模型调用或委派。
- 已确认范围：默认静态检查 + 有界只读运行探测；项目识别、manifest/锁/中断、托管资源、Python、实际配置、身份/workspace、当前会话任务及其相关 worktree。默认简短报告，`--verbose` 展开证据；无新面板、修复或历史/其他会话扫描。
- 以下是技术研究与复用建议，不新增用户产品偏好。超时数值、检查严重程度等尚不是已批准设计。

**核心结论**：现有检查器有可复用的信任边界，但没有一个可直接当作完整诊断的公共入口。`inspect()` 是初始化状态机，不是纯静态检查；`resourceStatus()` 是更新预览文字，不是运行健康结论；`get_context.py --mode default --json` 会枚举全部活动任务并读取 Git 最近提交，不符合本次窄范围；`queryWorktree(..., ready=true)` 会执行目标 `task.py current`，只能在目标 runtime 验证后使用。还发现 Pi `SettingsManager.create()` 读现存 settings 时会创建/删除锁，不能直接用于只读项目探测。

证据路径均相对于仓库根；宿主证据来自本机 Pi 1.2.0：

`/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules/`

行号对应研究时工作区源码，不表示已运行通过。

## 2. 已完整阅读的主要材料

### 仓库源码

- `lib/initialization/{command,engine,resources,adoption}.ts`。
- `lib/{project-state,task-context,worktree-query,config,bindings,executions,source-executions,adapter-resources}.ts`、`lib/task-browser/reader.ts`、`extensions/trellis.ts`。
- `runtime/{query-worktree,get_context,task,get_developer}.py`。
- `runtime/pi_trellis_worktree/{__init__,cli,manager,records,materials}.py`。
- `runtime/common/{__init__,active_task,paths,task_records,git,git_context,session_context,packages_context,workflow_phase,config,trellis_config,io,task_store,task_context,task_utils,tasks,types,log,developer,safe_commit}.py`。其中长文件 `task_store.py` 已续读至末尾，确认 import 与查询路径没有顶层 lifecycle 执行。
- `resources/runtime-baseline.json`、`resources/templates/config.yaml`、当前 `.trellis/config.yaml`、`.pi/settings.json`、任务 PRD/task.json、`.trellis/workflow.md`。

### 测试（阅读，不执行）

`tests/{initialization,init-command,init-review,resource-update,manifest-provenance,unsupported-runtime,project-activation,project-activation-host,task-context,agent-context-integration,runtime-contracts,worktree,worktree-cli,material-sync,skill-resources,trellis-patches}.test.mjs`、`tests/runtime-fixture.mjs`、`tests/python/test_worktree.py`。

旧 patch/deploy 测试不是当前 manifest runtime 的运行授权来源。其 fixture 可使用自定义 `task.py`；不能据其 query 成功推断目标脚本受信任。

### 宿主实际实现

完整阅读 Pi 1.2.0 的 `dist/core/settings-manager.js`、`dist/core/package-manager.js` 及 `proper-lockfile/lib/lockfile.js`；查阅 `dist/core/extensions/types.d.ts` 的 context/command/signal 声明。同时阅读 `docs/{extensions,packages,settings,configuration}.md`。未调用这些宿主资源加载器。

## 3. 初始化检查现状及可复用验证器

### 3.1 项目识别

| 证据 | 实际行为 | 复用与限制 |
| --- | --- | --- |
| `lib/project-state.ts:6-22` | 从当前 cwd 上溯；先看 `.trellis` 是否存在，再看 `.git` 是否存在；最近 Git 目录或文件均截断发现；ENOENT 之外的错误向上传播 | 直接复用 `discoverProject()` / `initializationRoot()`。保留 cwd、发现根和 Git 边界证据，不能对权限错误继续上溯猜父项目 |
| `lib/project-state.ts:29-39` | 初始化根是 Trellis 根、Git 根或 cwd；`requireProjectRuntime()` 要求 `.trellis` 为本地目录，再 `verifyRuntime()` | 诊断入口不能先 require 成功才显示报告，否则 fresh/unsupported 根本看不到检查 |
| `runtime/common/paths.py:61-80` | Python `get_repo_root()` 上溯 `.trellis.is_dir()`，没有 TypeScript 的最近 Git 边界判断 | 只在已发现、验证的根作为 cwd 执行受信任 runtime；fresh/invalid marker 不执行。不能用它重新决定诊断项目 |

`.trellis` 为文件、符号链接或悬空链接时不能回退到父项目。测试：`tests/project-activation.test.mjs:20-37`，以及权限错误案例 `:88-100`。

### 3.2 manifest / runtime / 模板与角色

- `lib/initialization/engine.ts:53-82`：`checkedPath()` 拒绝越界、反斜杠、空/dot 路径段、现存祖先符号链接/非目录和末端非普通文件/目录；`bytes()` 限制普通文件 4 MiB。可复用路径边界，但不适用于允许的顶层外部 task-store 路由。
- `engine.ts:84-93`：`runtimeBaseline()` 检查包内 Python 文件哈希、Python minimum=3.10、release identity。包自身损坏必须单独报告，不要被描述为用户项目需要更新。
- `engine.ts:120-164`：`packageResources()` / `defaultTemplates()` / `validateManifest()` 验证完整 schema2 inventory、runtime/角色来源、mode/hash、模板 provenance。这是**当前 release 的执行授权验证器**，不可被资源更新预览替代。
- `engine.ts:165-182`：`verifyRuntime()` 检查 live operation 外层字段/schema/status=complete，随后完整 manifest 验证及每个 runtime 文件实际 hash+mode；它不会执行项目 Python。
- `verifyRuntime()` **不验证角色实际内容等于托管哈希**，也**不要求模板存在或等于初始 hash**。角色/模板只做路径安全检查，模板 fingerprint 是初始 provenance，而非当前用户文档约束。不要把 `verifyRuntime()` 成功写成“所有资源文件健康”。缺失角色、缺失必需 workflow/spec index 要另外读取检查；普通模板修改不是 runtime 故障。
- `resources.ts:14-20,21-67`：`read()/stamp()/equal()` 可复用；`resourcePlan(update)` 本身只读，区分 Current、Modified—preserved、Missing、User document。但依赖私有 `oldManifest()` 的较宽旧版本 schema，允许 recorded old runtime 形成安全更新预览；这不授权执行旧/改动 runtime。
- `resources.ts:68-71`：`resourceStatus()` 把失败折成一个字符串，无法累积分项故障；正常时逐文件长列表，Developer 仅取首个 `name=`，并未完整验证身份。
- `resources.ts:41-45`：资源预览拒绝有 managed-worktree marker 的根；不能拿它作为目标工作树的通用诊断器。

**建议**：保留严格执行授权检查，另外用固定 package inventory 逐文件独立诊断，不能因为 manifest 第一个坏字段便跳过可安全读取的所有其他项。更新/恢复建议来自预览，但不生成或应用写计划。只展示确有用途的缺失资源，不能把任意用户 spec 内容与模板逐字比较。

测试依据：`tests/manifest-provenance.test.mjs:42-53,72-131` 覆盖 preserved 模板、完整 manifest 攻击及 runtime mode/hash；`tests/resource-update.test.mjs:9-29` 覆盖修复/旧版本安全更新；`tests/init-review.test.mjs:71-73` 确认 completed audit 不强求 onboarding task 永远未修改。

### 3.3 `inspect()` 不能直接作为新静态诊断主体

实际调用链：

```text
command handler → inspect(initializationRoot(ctx.cwd))
  → realpath + package runtimeBaseline（在 try 之外，仍可能直接抛错）
  → managed marker 判定
  → probePython()（同步子进程）
  → readOperation()
      → validatePlan(...)
          → skeleton()（再次启动包内 Python 导入并生成初始 bytes）
  → init.lock 存在性
  → verifyRuntime / developer
  → workspace 候选枚举 / git username suggestion
```

证据：`engine.ts:94-108,184-238,280-287,294-323`。

问题：

1. Python 检查失败会先退出，manifest、锁、身份等独立静态检查不再进行；不是完整故障收集。
2. 有正常 completed operation 的项目也会运行 `validatePlan(..., false)` → `skeleton()`；“只读 inspect”不等于“纯静态”，不能重复调用作为每项检查。
3. workspace 候选最多扫描 512 项、展示 20 个（`:220-229`），是 username 菜单用途；诊断只需要当前有效身份的 workspace，不应枚举其他开发者的历史。
4. managed worktree 在 Python 前直接 conflict（`:200`），这是**不允许从目标初始化**，不是该工作树必定不健康。
5. 锁只告警存在，未解析 schema/PID/planHash；`verifyRuntime()` 不以 init.lock 存在作执行拒绝条件。不能宣称“有锁=runtime 已被现有围栏阻止”。存在锁表示写操作无法开始、检查期间可能并发变动，不可猜 stale 或删除。
6. `command.ts:105-114` 先 inspect，但非 unsupported 的 health 只返回 `resourceStatus()`，会丢弃 inspect 的 diagnostics。例如 Python 不可用/身份 malformed 导致 conflict，资源预览仍可能输出 Current；不能继续沿用其报告拼接逻辑。
7. `readOperation()` / `validatePlan()` / `probePython()` / `developer()` 都是私有函数，没有可独立调用、返回结构化分项诊断的公共能力。

**建议**：未来实施可拆出有限的静态 operation envelope/锁/身份 reader，并明确哪些属于 recovery-plan 验证、哪些属于运行授权验证。需要规范计划验证时复用现有 canonical 逻辑，但其 Python skeleton 调用应计入独立运行探测预算；不得执行恢复计划里的 `output`、`source` 或命令。completed audit 是历史证据，不应用过去 guard 重验当前任务/用户文件状态。

锁来源：`engine.ts:462-507` 的 initialize/identity apply 写 `{schemaVersion,pid,planHash}`；`resources.ts:88-105,153-165` 和 `adoption.ts:86-93` 的资源/template/adopt 锁是空文件。**空 init.lock 是现有合法生产形态，不能硬套初始化 PID JSON schema 报损坏**。

## 4. 配置的实际来源与诊断范围

### 4.1 不同职责的实际来源

| 来源 | 消费者与证据 | 检查方式 / 不足 |
| --- | --- | --- |
| `.trellis/.pi-trellis.json` | `engine.ts:11,139-182` | 安装 manifest，不是设置文件；必须按当前 provenance schema 判断 |
| `.trellis/config.yaml` | `lib/task-context.ts:26-40`；`runtime/common/config.py:81-103`、`trellis_config.py:200-242` | 项目 Trellis 设置；读真实内容并按消费者支持的 YAML 子集验证，不强求默认模板一致 |
| `.pi/pi-trellis.json` | `runtime/pi_trellis_worktree/records.py:110-125` | 当前只消费 `worktree.directory`；缺失使用源根 `.worktree`；相对源项目根解析，允许绝对路径；仅影响新建，旧 binding 继续绝对路径 |
| `.pi/settings.json`、`<agent-dir>/settings.json` | `lib/adapter-resources.ts:9-17,22-48`；Pi `dist/core/settings-manager.js:117-125,223-275` | Pi package/resource 配置，与上述两种文件职责不同。agent-dir 来自 `PI_CODING_AGENT_DIR` 或默认 `~/.pi/agent`（本库只能看到该来源，SDK 自定义目录不在 command context 公开暴露） |
| `TRELLIS_PYTHON`、`TRELLIS_DEVELOPER`、`TRELLIS_CONTEXT_ID`、`TRELLIS_PI_STATUS` / `TRELLIS_PI_CONTEXT` | `engine.ts:94-100`；`paths.py:43,109-159`；`extensions/trellis.ts:71-98,227-235` | 只采集与诊断相关的有效值/来源，勿整份环境输出或泄露凭据。Python 是可执行文件单个 argv，不是带参数的 shell 字符串 |

本仓库当前实际 `.pi/settings.json` 只有 `{ "packages": [] }`，不存在 `.pi/pi-trellis.json`；当前 `.trellis/config.yaml` 有旧 `channel.worker_guard`，但固定 runtime 没有其消费者。不能为此运行 upstream channel 或按其他插件任意设置 schema 增加诊断范围。

### 4.2 Trellis YAML 可复用与语义偏差

- `trellis_config.py:59-99,114-197` 的子集 parser 对 block scalar、anchor/alias、merge、flow collection、list 内 mapping 发 stderr 并跳过；未知/无冒号内容也可静默跳过，重复 key 被后值覆盖，未提供结构化语法错误全集。返回 `{}` 并不证明原始文件合法。
- `read_trellis_config()` / `_load_config()` 读失败使用 `{}`；不能把权限错误、缺失、非法 UTF-8、有效空配置混成正常 defaults。两者都没有普通文件/大小/路径预检。
- `config.py:37-63` 的 `coerce_config_bool()` 是 bool aliases 公共规则；可复用纯转换，但需保留 warning/default 事实。
- `config.py:111-118` journal maximum 转 int；`:184-232` context limits 接受 Python int 与非负值；`lib/task-context.ts:26-40` 只认十进制 digits、JS safe integer、顶层窄 section，失败静默回退。`+1`、超 JS 安全整数、缩进/quoted/comment 可能两个消费者不一致。诊断须报告各自**实际生效值**和默认原因，而不是自行选一个消费者当唯一 schema。
- `config.py:265-303` hooks 必须 event→list；只读解析/形态检查可以复用，**不执行命令或 import 项目自定义 hook**。`after_deactivate` 是现用事件，旧 `after_finish` 不运行：`task.py:268-285`、`tests/runtime-contracts.test.mjs:70-85`。
- `config.py:311-341,363-384,465-488`：packages 是 mapping，值不是 mapping 会过滤；default_package/scope 有回退。需要指出声明被忽略/无法解析，不能据“最终有 defaults”报完整通过。验证配置名称与引用关系不等于枚举所有任务或 package Git 历史。
- Pi extension 未使用 `prompt_injection.skip_keyword` / channel；不能根据旧模板注释推断 Pi 本地消费者。

**限制**：目前没有公开严格 YAML-validator API，也没有“原始配置 + 语法诊断 + 各消费者生效值”统一入口。若新增 diagnostics reader，需要保持真实子集语义；不应悄然引入完整 YAML parser 后宣称与 runtime 一致。

### 4.3 worktree 配置

`worktree_directory()` 可复用规则，但现有读取：`file.exists()` + `read_text()` 没有 bounded/regular-file 验证，悬空配置文件链接会被当缺失使用默认。对已存在配置应先 lstat/大小/UTF-8，再解析；不要顺便创建目录、检查新建目标占用或执行 create preview。

`manage()` 已有 binding 时不会重新调用 directory 配置（`manager.py:305-336`）；旧 binding 在坏新配置下仍可复用：`tests/worktree.test.mjs:57-63`。所以“配置影响新建”和“当前 binding 不可用”要分开。

### 4.4 Pi 配置 reader 的真实写入与公共能力限制

**不能直接调用** `adapterConfigured()` / `projectSkillPaths()` 当只读诊断：

1. 两者都先 `SettingsManager.create()`（`adapter-resources.ts:11,23`）。Pi `settings-manager.js:257-266` 的 load 经过 `storage.withLock()`；现存 settings 在 `:150-160` 获取 lock，`:178-179` release。`proper-lockfile/lib/lockfile.js:25-41` 使用 mkdir 建 `settings.json.lock`，`:52-85` 还可能自动删除过期锁。这是项目/用户设置目录写入，不只“可能保存 settings”。
2. `DefaultPackageManager.resolve(async()=>"skip")` 避免缺包 install，但仍解析**所有已配置 package/resources**（`package-manager.js:704-752,1000-1058`）。`listConfiguredPackages()` 亦会为所有 package 查 installedPath（`:759-782`）。
3. user npm fallback 在 `:1740-1767,1779-1793` 调用已配置 `npmCommand`（如 npm root/list global），不是纯 FS 读取，也无统一输出/取消预算。它可被配置成任意程序；不能为只读诊断不加限制启动。
4. package recursive traversal 跟符号链接、无本次全局目录预算（`:163-205` 等）；异步 `resolve` 没有 signal 参数。单纯 Promise.race 超时无法终止实际工作。

**可行复用方向**：先安全、限长地只读取得实际 settings 文本，使用公开 `SettingsManager.fromStorage()` 配自定义**只读快照 storage**，不使用 FileSettingsStorage、不返回待写内容、不调用 setters。保留 `projectTrusted`，可以借公开 getters 得到 host 的合并/迁移结果。但宿主没有公开完整 settings-schema 验证器；JSON parse 成功不是所有字段合法，且 command ctx 没有实际 loaded-resource/settings/agentDir snapshot。若要复用 resource 解析，必须排除任意 npmCommand 调用、全库发现和隐藏安装；缺少这样的窄、可取消公共能力时明确“未验证宿主解析后的启用状态”，不得私自 monkey patch 私有方法、强制 trust 或判全链路通过。

只读检查设置文件不代表加载/运行其中项目 extension。scope 优先级与 delta filters 是 host-owned，不应自己以 source 字符串完全相等替代安装 identity（`adapter-resources.ts:26-41`；`tests/skill-resources.test.mjs:29-73`）。缺少 persistent adapter 声明也可能是合法 `-e` one-shot，不能报当前 extension 未安装；测试 `tests/project-activation-host.test.mjs:54-57`。

## 5. 当前会话绑定：必须由现有主 extension 提供 key

### 5.1 key 的真正来源

- `extensions/trellis.ts:98-103`：模块启动时捕获 pinned `TRELLIS_CONTEXT_ID`，`keyBySession` 管理 session 身份。
- `:223-235`：identity=`root::ctx.sessionManager.getSessionId()`；先读 memo；显式 pin 要匹配 `[A-Za-z0-9_-]{1,128}`；否则 key=`pi-` + sha256(sessionFile 或 identity) 前 12 位。
- `:776-791`：child 先覆盖 memo 为 `pi-child-<identity hash>`，随后 `set_active_task()` 绑定 child 独立 pointer。重新按原算法计算或直接取当前 process.env 会读错 child/parent。
- `:1087-1090`：每条 shell 输入显式注入本 session key，不设置共享 process.env。诊断不能依赖工具环境碰巧有这个 export。
- `runtime/common/active_task.py:170-193,299-343`：固定 runtime 仅认显式环境 ID，缺失 no-identity，缺指针/null/空字符串 no-task；即便兼容参数允许也不扫 single-session fallback，不从其他平台/会话猜任务。

**建议**：未来在 `registerInitCommand` 依赖中由 extension 传入当前 key resolver / plain session facts，不能 import `__internals` 当生产 API、复制 key 算法或调用 `session()` 再要求 runtime 才拿 key。invalid runtime 仍应能做自身 pointer 的安全静态诊断。报告运行前捕获 root/sessionId/key，异步完成前检查是否换了会话/根；不要把旧结果发给新会话。

**公共能力限制**：当前 `registerInitCommand(pi, refresh)` 只有 refresh 参数（`command.ts:86`）；独立 initialization 模块拿不到 memoized child key，需有明确内部集成改动，不能在 research 中宣称已经可用。

### 5.2 pointer 与任务验证器

- `active_task.py:102-115,299-343`：sessions 及全部祖先要本地非符号链接；pointer 1 MiB，JSON object，`current_task` 为 string/null。失效与无任务区分：invalid-identity / invalid-pointer / invalid-task / no-task / no-identity。
- `task.py:287-316`：`current --json` 仅 own key + exact task，返回 `{current_task,source,stale,state,error?,raw_ref?}`。**no-task 返回 exit 1 是正常语义，不是执行故障**；应验 payload `source=session:<key>`、state=no-task、null，再分类。不能只按 exit 0/1 判健康。
- `lib/task-context.ts:50-73`：`resolveTaskPath()` / `readTaskRecord()` 只读，允许显式 `.trellis/tasks` 顶层外部 store，实际路径要在该 store。其 record 验证只有 object/大小，`{}` 可通过，不能单独授权 active task。
- `runtime/common/task_records.py:23-94`：Python runtime 对 refs/1 MiB/非空 object/identity-status string 做更严格检查；unknown optional fields 是容忍 read projection，不要求固定 24 字段或 status 枚举。
- `extensions/trellis.ts:326-350` 的 disk fast path 补 task identity 检查，但异常返回 undefined；`:381-399` 自动 fallback `task.py current`，错误放 taskErrors，带缓存。不能直接用 fast path 返回空来判 no-task，也不宜复用缓存做即时诊断。
- `lib/task-browser/reader.ts:42-75` 有 descriptor-level O_NONBLOCK/O_NOFOLLOW/fstat/UTF-8 边界可借鉴，但 `readCurrentTaskIdentity()` 同样吞错，返回值不适合诊断。其 `readTasks()` 会扫全 task store、archive links，不复用。
- `buildTaskContext()`（`task-context.ts:76-194`）会读当前 task JSONL/artifacts + 选中 references，仅只读，但兼具渲染、截断和提示语；未完成可能只是预算而不是授权/record 损坏。planning PRD-only、未使用 role 空 JSONL 合法，不可通用报故障。无本轮批准范围时不为了检查把所有 references 全展开。

若用户当前绑定明确指向 archive 路径，可以验证**该 exact ref**，不枚举 archive 去找失效路径。`task.json.worktree_path` 不是 managed worktree 的权威 binding；应看 runtime bindings/marker。

## 6. 运行探测入口及完整写入风险

### 6.1 入口取舍

| 候选 | 真实调用链 | 是否适合默认诊断 |
| --- | --- | --- |
| Python version / 标准库 probe | `engine.ts:94-100` 的 `-B -c import sys; assert >=3.10` | 适合概念，但现有同步 15s、4 MiB、无 signal，需独立 bounded async runner；只返回 version/executable，不调用模型 |
| `task.py current --json` | `task.py:287-316` → `get_repo_root` → `resolve_active_task` → `read_task_record/task_projection` | **优先候选**，严格 runtime gate 后，以当前 key/已发现 root 执行；no-task 特殊 exit 必须识别 |
| `get_context.py --mode phase` | shim `:17-22` → `git_context.main:49-115` → own pointer 预检 → `workflow_phase.get_phase_index:65-100` | **适合有限候选**：读 own task + workflow，不枚举 tasks、不读取 Git log；可以验证核心 workflow parser，但不是默认 context injection 的全行为验证。无 Phase Index 的用户自定义 workflow 应报告实际影响而不是与默认逐字比较 |
| `get_context.py --mode default --json` | `session_context.get_context_json:326-388` → developer/journal → root git → `iter_active_tasks` → package git / polyrepo discovery | **不适合**本次范围；`:366` 枚举所有活动任务，`:93-166` root/package Git 读取最近 5 commits，`:171-218` 可扫描子仓库；读全部 journal 内容统计行数。没有公开“仅当前会话、无历史”开关 |
| `get_context.py --mode record --json` | `session_context.py:569-646` | 同样全活动任务与 Git history，不采用 |
| `get_context.py --mode packages --json` | `packages_context.py:221-253` → config/spec dirs + own task package | 可在声明配置范围内评估，但会枚举 package/spec，缺 bounded 且可跟 package 路径；不当作无条件全链路 probe |
| `get_developer.py` | `:17-28` → `paths.get_developer:109-159` | 只读候选；无本地身份会调用 main-worktree Git (`git.py:172-201` 无 timeout)。建议独立身份分项限制，不依赖其 exit 1 判 runtime failure |
| `queryWorktree(cwd, task, false)` | 包内 shim → `cli.query_main:87-103` → `manager.query:34-60` → records Git/binding identity；有 snapshot 时 material_summary | 合适的受限 worktree 候选；不是轻量纯 binding read，见下文；无 task 时不解析 current pointer，不会自己找到当前 task |
| `queryWorktree(..., true)` | 上述 → `validate_ready` → `validate_context` → **目标 task.py current** | 只能在源 task/target runtime 前置正确时探测；现有参数默认不要求 supported target release，不可直接调用 |
| `worktree.py status --task …` | `manager.manage:138-161`：read binding/problems + git status + execution；completed check 可能 `snapshot(b)` | 不优先。可能扫描整个 target checkout（10000 files）来推断旧 check snapshot，超出 init diagnostics 的最小目的 |
| init_developer / task start / deactivate / create / prepare / recover / repair 等 | 明确写 identity/task/pointer/hooks/binding/files | **禁止**作为 probe；即使使用 no-commit、preview 或看起来幂等也不是本诊断入口 |

### 6.2 `task.py current` 的 import 链审计

`task.py:43-80` 导入 `paths/active_task/git/io/task_utils/tasks/task_store/task_context`；这些模块再导入 config/safe_commit/types 等。已读完整文件：没有导入时 `ensure_tasks_dir()` / hook / archive 自动执行，写函数均仅在命令 handler 内调用。`common/__init__.py:39-42,59-62` 在 Windows 只重新配置标准流，不写项目；`task.py:766-767` 的 main 按解析命令选择 handler（`:738-756`）。

current 实际仅 own pointer/record/read projection/print。写边界另在 `active_task.py:211-224,364-399` 的 mkdir/atomic write、`task.py:256-263` start 状态/branch/hooks、`:268-285` deactivate unlink/hooks，current 不调用它们。`task_store.ensure_tasks_dir:116-128` 不在 import 时运行。

**不能因为同文件包含写函数就拒绝已审计 current，也不能因为命令名 current 就忽略 Python 启动/import 风险**。

### 6.3 worktree query 细节

实际非 ready 调用链：

```text
lib/worktree-query.ts:21-43（execFile 包内 query-worktree.py）
→ runtime/query-worktree.py:3-6
→ cli.query_main:87-103
→ manager.query:34-60
  → records.source_for:329-345
    → repository:70-83（rev-parse + worktree list）
    → marker/source binding/same_identity/binding_problems:311-326
  → checked_binding:21-25 / require_identity:28-31
  → 有 materials descriptor 时 material_summary:531-552
    → snapshot read、source/target references + hashes、baseline_check:491-501
```

- `query()` 不调用 source_lock/publish/store_snapshot/prepare，Git args 是本地 rev-parse/worktree list/status，读 snapshot/refs；没有 task start、hook、模型调用。
- 但 `records.bounded_command:44-53` 为 Git stdout/stderr 建 `tempfile.TemporaryFile()`；**“不写项目”不等于完全不写磁盘**。继承 `TMPDIR/TEMP/TMP` 指向项目时 tempfile 可能落入项目，需明确处理临时输出路径或采用不同 bounded runner。本轮未调用它。
- `repository()` 读取全部 Git registration metadata，并 canonicalize 每个 row；不扫描那些工作树 task/session 文件，但无关悬空注册路径也可能令 query 失败。这是当前公共协议限制，不能宣称它只接触一个 registration row。
- 有 materials 时会读取被 JSONL 明确引用的文件，可能是目录，最大 512 refs/entries、128 dirs、2048 graph files；UTF-8 validation / hashing streaming 不限制所有文件总字节或时长（`materials.py:120-209,388-423`）。不是任意整个 task 历史扫描，但缺总 I/O 预算；同时 `material_summary()` 要求 source in_progress，planning/completed 是 operation 前置，不应标项目损坏。
- ready 额外 `materials.validate_ready:261-264` → `validate_context:247-258` → `task_cli:231-244` 在目标执行 `current --json`，目标 context=`binding.contextId`，不继承当前源会话 ID。读 target pointer 是当前 task 相关的 readiness，不允许扫描 target 其他 sessions。
- `lib/worktree-query.ts:27-32` 只有 `ready && supportedRelease` 才先 false-query、`verifyRuntime(target)`、再 ready-query。默认 supportedRelease=false；Python 单独 query --ready 没有 manifest 检查。未来诊断必须用严格前置，不可用目标 CLI 跑完才检查 release。
- 两次查询之间 binding 可能改变，现有 wrapper 未比对 bindingId/worktreePath 或重验新 target；target 文件也可能在 verify→spawn 之间替换。这不是原子防篡改能力。
- `executeQuery:35-47` 只检查 ok/source 字符串，binding/materials 没有完整 TS schema 校验；stderr 一旦非空可能掩盖 JSON error，取消/timeout/maxBuffer 也没有结构化分类。

**最小建议**：先只读 static binding/marker/sameIdentity/当前 target release；只对相关且有条件的工作树做 bounded 非 ready identity probe。需要完整 readiness 时保留 target runtime gate、两阶段身份复核，并区分“合法尚未 prepare / source 还 planning”与故障。缺少公开 identity-only/no-materials/no-all-registration 查询，应显式注明剩余限制，不能默默扩大探测。

## 7. 非法 runtime 防执行围栏与安全缺口

### 7.1 已有围栏（必须保持）

- `project-state.ts:34-39` → `engine.verifyRuntime:165-182` 不执行项目代码即可拒绝：缺 manifest、schema/inventory/provenance 不符、非当前 release、runtime bytes/mode 缺失/修改、incomplete operation、unsafe managed paths。
- `extensions/trellis.ts:256-261` 每次 runPython 前 requireRuntime；`:768-773` session 也 require；`:914-932` startup 失败直接退出，不 loadContext；`:966-979` resources discovery await 前后重验；`:893-901` dispatch tool execute 前 guard。
- `extensions/trellis.ts:1056-1080` tool_call 对已知 runtime command 与 Trellis Agent 阻止执行，同时普通 read/search/非 Trellis Agent 仍允许。识别在 `:177-209` 是有限 shell lexer，不是任意 shell interpreter/完整 OS 安全边界。
- 诊断 command 可用不等于可绕过上述 guard。fresh/unsupported/incomplete 时只读文件和受信任宿主/Python环境探测，**不能执行项目脚本，即便只是 --help**。

测试：`tests/unsupported-runtime.test.mjs:21-72` 使用恶意写 marker 脚本、mock spawn，验证这些状态 startup/child 不执行项目 runtime，同时允许普通读；`tests/init-review.test.mjs:67-70` incomplete manifest 已发布仍不授权。

### 7.2 当前不足必须明示

1. **解释器本身**：TRELLIS_PYTHON 是用户指定程序。版本检查只证明该程序响应了 probe；没有沙箱可保证任意 wrapper 不写项目/调网络。
2. **Python startup/import**：`-B` / `PYTHONDONTWRITEBYTECODE` 只抑制写 pyc，不隔离 `PYTHONPATH`、sitecustomize/usercustomize、`.pth` startup code，也不禁止读取现有 `.pyc`。包 hash 校验覆盖清单源文件，不覆盖任意解释器插件/额外模块/旧 pyc。不能据 baseline PASS 承诺绝对无副作用。
3. **可信 import 路径**：`task.py`/query 会按解释器默认 sys.path 导入，可能被未托管同名模块影子覆盖；包内 query 与 Python cwd 默认导入也需考虑。要更强保证需研究 isolation flags（如 -I/-S）与显式受信任 import root 的兼容性，不能直接假设加 flags 不影响现有入口。若新协议/runner 需要调整，应另写设计、测试及 baseline 更新，非本轮实施。
4. **文件竞态**：engine/read/bindings 大多 lstat/realpath 后 `readFileSync`，不是 descriptor-based nofollow 全祖先锁；文件可在 verify 与 spawn 之间改变。已有 task-browser reader 的非阻塞 descriptor 验证可借鉴，但公共 filesystem capability 不提供跨读/执行原子信任保证。
5. **Git side effects**：清除 GIT_*、`GIT_OPTIONAL_LOCKS=0` 只避重定向/可选 index writes；用户 Git config 可启用 fsmonitor 等外部 helper。不可把所有 git status 一律视为“不可能触发用户程序”。诊断宜用最窄 argv、关闭适用 helpers，回归真实配置，并报告尚不可证明的能力。
6. **权限**：只读探测不能证明初始化/repair/start 的实际写权限、磁盘足够或原子 rename 能成功；不创建 temp 测写。只能报告读取能力/静态 mode 信息及“写入能力未探测”。
7. **模型/宿主启用**：不调用模型，不测 API/认证；CommandContext 没有完整 resource loader/current settings provenance 暴露。实际 extension 在运行可作为部分证据，但不能假装验证所有技能/命令的宿主加载结果。

## 8. 子进程取消、超时与资源预算

### 8.1 现有实现

| 层 | 现有上限 | 缺口 |
| --- | --- | --- |
| `engine.ts:94-97` | execFileSync 15s、4 MiB、-B/env bytecode off | 阻塞宿主，无 signal/整体预算，多次 skeleton 累加；失败只有异常 |
| `extensions/trellis.ts:256-291` | async execFile 15s 默认；current 10s (`:387`)、8 MiB、windowsHide/env | 无 AbortSignal；timeout/spawn 非数值 code 返回 undefined；不收 stderr；同正常“CLI unavailable”混淆 |
| `lib/worktree-query.ts:35-43` | async execFile 30s、1 MiB stdout/stderr maxBuffer、signal、-B/env | 单次限制，ready 两阶段可达两次；无整体预算/进程树管理/结构化失败类型 |
| `records.py:44-53` | nested subprocess timeout 30s、每 stream 4 MiB | spool 到磁盘，**退出后**才查 limit；磁盘写入在运行时仍可能超过 limit；非实时输出约束 |
| `materials.task_cli:231-244` | nested target CLI 15s、1 MiB | 无 group termination/cancellation channel，stderr warning 不代表失败 |
| `common/git.py:33-61` | run_git 支持可选 timeout；session_context 的 Git probe 2s | paths/main-worktree probe 无 timeout；capture_output 在 nested process 内无 byte limit；父 maxBuffer 不限制内部内存 |

Pi 公开 `ExtensionContext.signal` 在 streaming 时可能存在、idle command 可能 undefined（宿主 `dist/core/extensions/types.d.ts:239-242,286-324`）；`abort()` 中止当前 agent 操作，不是“当前 slash command cancellation token”。不能把 ctx.abort 误当 command 的已验证取消接线。

### 8.2 建议的最小 runner 契约（待设计确认）

- 使用 shell=false 的固定 executable + argv；环境快照显式当前 context；不启动 shell、模型、project hooks；默认只读探测，无自动重试安装/修复。
- 每项结果是 pass / issue / blocked / skipped / cancelled（命名可设计），保留 timeout、spawn ENOENT、exit、stderr、protocol invalid、output limit；未执行不可算 PASS。一项失败不影响静态独立项。
- 子进程/总体有共同 deadline，下一项只使用剩余预算；工作树 optional 检查不能吃光基础 Python/current/workflow 检查机会。可先评估 version 2–3s、核心 probe 3–5s、相关 worktree 5–10s、总体 15–20s，但这些仅是技术候选，不是已定用户偏好。
- 同时限制 stdout/stderr bytes、文件读取 bytes、目录 entries 和 diagnostics/report 总长度；不要用 role injection `0=unlimited` 设置控制诊断上限。
- 借 ctx.signal 有则传递；session_shutdown/replacement/reload/repeated check 要 abort 自己持有的 controller、dispose listener/timer、禁止迟到报告。公开 API 不保证 idle slash 命令 Esc/Ctrl-C signal，缺此能力时不能宣称“用户按 Esc 已能取消”。不得为捕键新增诊断面板或随意劫持全局输入。
- execFile signal/timeout 默认只 kill 直接子进程，不保证 nested Git/target process tree 全灭。需明确 POSIX group / Windows tree 策略及兼容性；timeout Promise.race 不够。hook 已有 kill-tree 实现在 `task_utils.py:307-347`，可参考但不调用 hooks；它也承认 setsid escape 限制（`:321-323`）。
- Python/Git临时输出、startup与路径隔离必须有 fixture 证据。无法满足时写“运行探测被安全前置阻断/未完成”，保留默认静态诊断，不拿注释或正常 exit 替代只读证明。

## 9. fresh / unsupported / managed worktree 的分支

| 场景 | 应保留的技术判定 |
| --- | --- |
| fresh（无 `.trellis`） | 正常未初始化；报告项目识别、包/Python能力及存在的相关配置；项目 runtime/pointer/worktree readiness 不适用。不建立目录、不套“缺所有托管文件=全部故障” |
| manifest-less unsupported | 静态发现和异常收集，项目 runtime 执行 blocked。现有 adoptPlan 会再 inspect/Python、扫 legacy scripts 4096 项 (`adoption.ts:15-67`)，是接管预览，不作为默认 diagnostics 链路 |
| bad manifest / runtime bytes / incomplete | 分别显示原因、影响与未执行 probe；其他可独立的安全 FS/环境检查继续。不能 run 项目 --help 来证明入口存在 |
| supported clone 无本地 developer | runtime 仍可激活 viewer/dispatch/skills（`tests/project-activation.test.mjs:102-104`）；身份未设置影响任务创建/日志，不等于 runtime release 故障。有效 TRELLIS_DEVELOPER 或 main checkout fallback 要单独标来源 |
| 无当前会话任务 | 正常；只读 current probe 验证 no-task 语义，未使用 worktree 正常。禁止扫描其他 sessions 取“唯一任务” |
| 当前 task planning / PRD-only | 不代表可实施/可 dispatch。空 role JSONL 可合法未使用；不为诊断调用 start、prepare 或 blanket validate 后判全项目不健康 |
| managed target cwd | 显示 execution root 与权威 source root/binding，不沿 init 的 source-only conflict 判健康。验证 local marker→source authority→Git identity；配置 directory 属 source、现用 pointer属当前 execution root/session；target readiness 的 binding.contextId 是相关执行上下文，不是当前主 key替代 |
| 普通 unbound linked worktree | `records.source_for:344-345` 禁止 worktree management，但不等于所有本地 Trellis runtime 不可用。只读发现 `.git` file 边界，提示从 source 管理/显式 adopt；不自动回源、不初始化目标 |
| managed marker 与 own task 不同 | 检查 exact marker 指向相关 binding 的一致性，展示与 own task 的事实；不选择 marker task 覆盖 current pointer，不为 no-task 恢复绑定 |
| lock / preparing / running | 不猜死锁、不释放 lease、不标状态为成功/失败后修正。检查是瞬时快照，可能前置阻断；锁存在不自动阻断所有现有 runtime reader，但可能应避免并发/torn-state运行探测 |

身份细节：initializer `developer()` 要恰好一个 name=（`engine.ts:102-108`），runtime reader 取第一个并支持 env/main checkout (`paths.py:87-159`)；用户名规则还存在 UTF-8 255 bytes vs Python 255 chars、trim/Unicode分类差别。诊断需分别说明初始化 local identity 与有效 runtime identity，不能直接强制二者相等或重写 `.developer`。

workspace 只检查有效身份目录/本地 `index.md`/当前 journal 的存在、普通文件、可读 UTF-8/合理边界，不扫描全部 journal/history；`get_active_journal_file:213-243` 本身枚举当前 workspace journal 名称，可用于定位但需上限且不跟外部链接。零结果不假装检查写入能力。没有公开完整 workspace 一致性校验器，不能从旧 index markers 推断用户历史损坏并自动修复。

## 10. 最小新增/回归测试矩阵

所有**实际执行**只在隔离临时 fixture，不调用用户项目/runtime 探测。当前本轮尚未运行任何用例。测试需将“报告正确”与“无项目写/无越范围读/无子进程”分别断言。

| 组 | 最小参数化案例 | 必须断言 |
| --- | --- | --- |
| command | `--check`、`--check --verbose`、headless/RPC、help、重复/非法 flags、verbose 非法组合 | 未开始模型 turn、未选/确认写入、未 refresh/reload；简短与 verbose同一事实，正常文件不长列；失败分项保留；合法 flags组合按最终设计确认 |
| discovery | nested cwd、nearest `.git` 目录/文件、父 Trellis、file/dangling marker、权限错误、HOME、无Git | 只选最近授权根，不继承错误 marker 的父项目；fresh/unsupported仍有报告，不运行项目脚本 |
| release gate | missing/broken/nonobject/schema1/inventory/source/hash/mode tamper、包 baseline mismatch | 项目 Python spy **零调用**；malicious script写标记不出现；安全静态其余项继续 |
| operation/lock | absent、合法 empty resource lock、init PID lock、malformed、incomplete、foreign root、duplicate completion、completed正常task已编辑 | 不删/建锁；incomplete 阻执行；旧 audit不重验历史任务；区分 recovery-plan未检查与运行授权，不丢 Python failure |
| resource | runtime缺/改、角色缺/改、模板custom/preserved/null、workflow/index缺、symlink/special file、超size/UTF-8 | 用户文档修改非故障；必需功能缺失明确影响；单坏文件不吞其他项；资源预览不能授权旧release |
| Python runner | 缺 executable、<3.10、空/错误输出、timeout、stdout/stderr爆量、abort-before/during、Windows name、space/Unicode path | 有界退出和分类；完整 stderr不无上限回显；不调用shell/模型；子孙cleanup按支持平台验证 |
| import/temp风险 | startup sitecustomize/.pth/PYTHONPATH shadow、现存恶意pyc、TMPDIR=project、Git helper配置 | 安全策略确实阻断/隔离；只读承诺的范围明确。不能只查 pyc absence 就 PASS；无法隔离的场景必须 blocked/未验证 |
| YAML | missing vs unreadable/invalidUTF8、valid empty、quoted 0、negative/非int/+1/超JS整数、重复key、block/alias/flow、nested section | 按消费者实际default/warning/有效值报告；fail-open `{}`不冒充合法；无完整YAML-validator能力时标限制 |
| worktree config | absent/default、null/array/broken、worktree字段shape、控制符/empty、relative/absolute、dangling文件/目录link、旧binding+坏新config | 不创建destination；配置仅影响new worktree；legacy binding仍按绝对路径检查；新设置错不误报现有binding失效 |
| Pi settings | 已存在user/project settings、trust=false、资源empty/delta/filter、one-shot无persistent声明、malformed相关字段、SDK agentDir不可见 | FS写spy禁止 `settings.json.lock` mkdir/unlink，包括stale锁；不npm root/list/install、不全资源递归；不泄露 auth；缺公共loaded snapshot明确未验证 |
| session keys | 两session、pinned、child memo key、malformed显式ID、shutdown/replacement | 使用真实extension resolver不复制；不共享写process.env；只读own key，迟到报告不串会话 |
| pointer/task | missing/null/empty no-task（CLI exit1）、invalidtype/broken/1MiB、invalid task{}、越store、record symlink、外部顶层store、archive exact ref | no-task正常；invalid≠no-task；CLI source必须own key；不搜索archive/其他session；其他pointer bytes不变 |
| task材料 | planning PRD-only、未使用JSONL空/缺、in_progress绑定、当前material缺失/超预算/UTF8 | 不给planning实施授权；不通用强求full role材料；truncated/未检查≠Passed |
| worktree identity | 无binding、合法unprepared/preparing/error/ready、target缺、foreignGit、branch switch、marker mismatch、unbound linked target | 只读related binding/marker/Git；不create/prepare/recover，不自动回source；notprepared不等于runtime破坏 |
| target probe fence | target缺/旧/改runtime、query二阶段binding替换、targetcurrent不同key/task、合法current | target CLI在严格gate前零调用；重验身份；runtime非法仍能静态报告；source planning只阻 readiness，不吞独立identity |
| worktree bounds | material descriptor损坏/refs目录过大/超I/O、无关Git registration悬空、query持有source lock、running lease | 不nested source lock、不snapshot全checkout、不读其他task/session；公共query协议局限可见；一项超时其余已得结果保留 |
| overall readonly | healthy、上述失败/取消/blocked，每次before/after snapshot | 项目文件bytes/mode/目录集合、Git index、所有scope-owned locks/pointers/bindings、外部victim相同；FS write/delete spy 捕获“创建又删除”而非只靠最终snapshot；读spy拒越范围历史/其他会话；零hook/lifecycle/model调用 |

### 已有可复用测试基础与差距

- `tests/runtime-fixture.mjs:8-27`：完整合法 manifest/runtime fixture + host spawn mock，不伪造哈希为恶意脚本授权；适合 fencing 回归。
- `tests/initialization.test.mjs:18-28,70-81`：无写 preview、interruption/锁保守行为；新报告需增加 failed Python与其他项并存，不能只assert文本contains。
- `tests/unsupported-runtime.test.mjs:21-72`：未验证 runtime 零spawn。新 command 分支需同样覆盖，现测试主要startup/tool入口。
- `tests/agent-context-integration.test.mjs:30-85`：multi-session/child隔离；诊断callback必须覆盖child memo而非原formula。
- `tests/runtime-contracts.test.mjs:31-61,88-101,121-128,181-197`：strict own-key、坏ref、外部store、bytecode/update-marker不写、session symlink。它们没有证明Python site/已有pyc/所有OS写隔离。
- `tests/worktree-cli.test.mjs:74-89`：source lock期间query无deadlock；`:131-139` config；`:106-110` target start写入失败。自定义target CLI fixture不提供supported release证明。
- `tests/python/test_worktree.py:50-99,109-127,150-177,191-209` 等：refs/entry/record/snapshot/特殊file边界，适合扩 runner/只读协议contracts。
- `tests/skill-resources.test.mjs` / `project-activation-host.test.mjs`：公开host filters/trust/one-shot；仅settings bytes不变不够，未assert瞬时lock零写。新诊断须补write syscall/临时锁spy。

## 11. 建议的最小实施接缝与未解决能力

未来设计可沿以下顺序收敛，不需要新增产品面板：

1. `command.ts` 的 check 分支先于初始化 `inspect()` 独立进入 diagnostics；不复用 health()文字作为总结果。保留正常写初始化菜单，避免因研究顺手重构 apply。
2. extension 提供真实当前 root/session/key facts；诊断库只接受 plain scope，不自行绑定任务、不调用 session startup/refresh/inheritDispatchTask。
3. 利用 fixed inventory / checkedPath / manifest授权做静态分项、结构化结果，纯读当前pointer/record/binding；有错误仍采集其余独立证据。
4. 为有限runtime probe建立单一异步bounded runner和明确取消/生命周期围栏，验证来源、signal、deadline、协议与临时输出路径；执行前严格gate。
5. 选 `task.py current --json` 与窄 `get_context.py --mode phase` 验证有限核心行为；相关worktree先identity、必要时targetready。**不宣称这等于已执行 default context注入全链路**。
6. 若“完整本地链路”必须包括default context实际行为且不能扫其他task/history，目前缺公共narrow入口。需要新的只读diagnostic runtime协议/参数（连同baseline与tests），或报告该行为未验证；不能为了验收偷偷运行default再丢弃多余输出。
7. 仅安全读取真实相关配置。Pi settings用readonly storage快照，不用SettingsManager.create；若没有可取消且无任意npmCommand的公共resource能力，明确止于静态配置/当前extension已有证据。
8. 短报告与verbose共用事实集合，每项原因/影响/建议/未检查原因，最终summary不吞blocked，不把合法未初始化/no-task/notusedworktree报成坏runtime。

**必须留在设计中的能力限制**：没有统一分项operation/identity严格reader，没有strict YAML诊断API，没有公开default-context“current-only/no-history”选项，没有query identity-only/no-materials选项，没有跨target验证与执行的原子围栏，没有idle slash command确定的用户取消signal，没有loaded settings/resources/SDK agentDir完整snapshot，没有解释器/Git任意用户代码的OS只读沙箱。以上不能靠注释、正常退出或未经执行的测试结论消除。
