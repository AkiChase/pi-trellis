# 初始化模板与技能盘点（只读实施输入）

## 边界与依据

本次仅写此研究文件，未改产品、runtime、任务状态，未执行 init/start/install/网络请求。以父 `design.md`、本子任务 PRD/design/implement 和父 `research/upstream-init-audit.md` 为准；旧 UX/PRD 中仍有“项目/spec 选择”等提案措辞，不覆盖已确认的无项目类型、无初始前后端 spec、无多 package 范围。runtime 正确性由独立 checker 负责，本次没有阅读其源码或复核测试结论。

读取了本仓库 workflow/config/两级 ignore/AGENTS/.gitattributes、全部拟保留技能及其 references；上游安装目录仅作为来源证据，不是实施时依赖。下表是**建议的精确新增源码路径**，尚未生成产品模板。

## 1. 文件库存、目标与所有权

| 建议包源码 | 参考来源 / 调整 | 新项目目标与所有权 |
| --- | --- | --- |
| `resources/templates/workflow.md` | `.trellis/workflow.md`，按第 3 节适配 | `.trellis/workflow.md`；初始指纹，之后项目可编辑，不整体覆盖 |
| `resources/templates/config.yaml` | `.trellis/config.yaml`，按第 4 节精简 | `.trellis/config.yaml`；用户配置 |
| `resources/templates/trellis.gitignore` | `.trellis/.gitignore` | `.trellis/.gitignore`；只保留本发行版需要的本机状态/缓存规则 |
| `resources/templates/root.gitignore-block.txt` | 根 `.gitignore` 当前仅 node_modules/.DS_Store；README worktree 前置条件 | 根 `.gitignore` 增量块，建议 `/.worktree/`、`/.trellis/.runtime/`；已有文本保持，不复制本仓库通用忽略项 |
| `resources/templates/agents-block.md` | 根 `AGENTS.md` 的 `TRELLIS:START/END` | 根 AGENTS 受管块；块外用户所有；改为 `/trellis-init`、`/skill:trellis-*`、包技能和 `.pi/agents`，删除 Codex/.agents/trellis update 指引 |
| `resources/templates/journal.gitattributes` | 根 `.gitattributes` | 增量 `.trellis/workspace/*/journal-*.md merge=union`；不加 index 规则，删不存在的 cli/backend spec 引用 |
| `resources/templates/workspace-index.md` | `.trellis/workspace/index.md`；上游 `dist/templates/markdown/workspace-index.md` 内容相同 | `.trellis/workspace/index.md`；删错误的 developer/tasks 树（任务实际在根 tasks）、以向导设置身份，不拼接未引号用户名 |
| `resources/templates/spec/index.md` | 新写的导航入口，无本仓库代码规则 | `.trellis/spec/index.md`；只说明未来经批准、基于真实项目建规范，链接 guides/技能 |
| `resources/templates/spec/guides/{index,code-reuse-thinking-guide,cross-layer-thinking-guide}.md` | 通用概念可参考上游 `dist/templates/markdown/spec/guides/*.md.txt`；本仓库 guides **不能直接复制** | 三个通用 thinking guides；用户可编辑。去源码/extension/scripts 专属链接、模板注册/rsync/多平台/marketplace/channel、无依据的“35%误报率”和“只验证一次”安全教条 |
| `resources/templates/tasks/bootstrap-prd.md` | 上游 `dist/commands/init.js:277–440` 的 bootstrap PRD | `tasks/00-bootstrap-guidelines/prd.md`；改为后续获准建真实规范；不生成业务规则、不自动扫描、不写“AI 已在执行” |
| `resources/templates/tasks/join-prd.md` | 上游同文件 `:507–613` | `tasks/00-join-<slug>/prd.md`；Pi onboarding、真实 spec/历史/assigned work；不虚构归档案例、不启动练习任务 |
| **不新增身份/任务算法模板** | workspace 个人 index/journal 使用已交付 `init_developer.py`；任务骨架由初始化计划按固定记录契约生成 | `.developer` 本机身份；个人 workspace/tasks 用户所有；不调用 create/start hooks，不绑定会话 |
| 已交付 `runtime/**`；已有 `agents/trellis-{research,implement,check}.md` | 原来源与许可保留，agents 的 `docs/agent-baseline.json` 单独记录来源 | `.trellis/scripts/**`、`.pi/agents/trellis-*.md` 受管；同源部署、full hash/mode 守卫；不复制算法、不在 session_start 升级 |

`.trellis/.gitignore` 建议核心规则：`.developer`、`.runtime/`、`**/__pycache__/`、`**/*.pyc`，及确有需要的原子临时文件。删 legacy `.current-task`、`.ralph-state.json`、`.agents/`、`.agent-log`、`.session-id`、`.plan-log` 和 upstream update 的 `.backup-*`/`*.new` 注释；操作记录/锁具体路径由主会话定稿后加入。不得忽略发行清单 `.trellis/.pi-trellis.json`，否则 clone 无法识别受支持运行时。不要把整个 `.trellis/` 忽略。

不生成 `.trellis/agents`（channel）、`.version`、`.template-hashes.json`、frontend/backend 树、package 配置、平台 hooks/extensions、`.pi/skills` 或包安装声明。`.pi/settings.json` 当前仅有包来源，init 不应为了技能复制而改它。

## 2. 保留技能及引用闭包

来源统一为本仓库 `.agents/skills/<name>/`，输出为包 `skills/<name>/`，通过 `package.json` 的 `pi.skills: ["skills"]` 加载；本子任务**不删除来源目录**，migration 在引用迁移后删除。

**8 个单文件技能**（各仅保留 `SKILL.md`）：

- `trellis-start`、`trellis-continue`、`trellis-brainstorm`、`trellis-before-dev`
- `trellis-check`、`trellis-update-spec`、`trellis-break-loop`、`trellis-finish-work`

适配点：start 改为已有 session overview 后按需刷新，不重复声称“平台没有启动 hook”；continue/start 去 `--platform codex`。before-dev/check/update-spec 示例统一 `.trellis/spec/<layer>/`，从实际索引发现，不配置 package。break-loop 删除自动同步 `src/templates/...`、立即 commit 和不存在 cross-platform guide。finish 删除“无论是否完成都归档当前任务”和必然产生自动提交的声明：保持质量/授权、精确任务归属及配置驱动的收尾。所有技能都应尊重只读研究不等于修改授权，不能因无 active task 自动建任务。

**`trellis-spec-bootstrap`**：保留 `SKILL.md` 和下列 4 个 `references/` 文件：

- `repository-analysis.md`
- `spec-task-planning.md`
- `spec-writing.md`
- `mcp-setup.md`

保留“真实代码证据、已有规范优先、单 owner、按实际 layer 建规范”的能力，不在 init 执行。MCP 是已有可用工具选项，不是初始化依赖；setup 改为显式另外授权的安装说明/直接源码替代，不要求安装 GitNexus/ABCoder，不新增配置/网络行为。删多 package 分解示例，不把 bootstrap skill 变成 spec 自动生成器。

**`trellis-meta`**：建议保留 `SKILL.md` + 以下 **22 个引用路径**，逐文件裁剪而非整目录无筛选复制：

- `references/local-architecture/`：`overview.md`、`generated-files.md`、`workflow.md`、`task-system.md`、`spec-system.md`、`workspace-memory.md`、`context-injection.md`、`bundled-skills.md`
- `references/platform-files/`：`overview.md`、`platform-map.md`、`hooks-and-settings.md`、`agents.md`、`skills-and-commands.md`
- `references/customize-local/`：`overview.md`、`change-workflow.md`、`change-task-lifecycle.md`、`change-context-loading.md`、`change-hooks.md`、`change-agents.md`、`change-skills-or-commands.md`、`change-spec-structure.md`、`add-project-local-conventions.md`

去 `local-architecture/multi-agent-channel.md` 及全部入向引用；`workspace-memory` 仅刻意写入的 journals，不含 mem。platform-map 改为 Pi 包/项目双 ownership 小表，不保留 21 平台矩阵；`trellis_subagent` 改为实际 ordinary Agent/managed `trellis_dispatch` 边界；bundled-skills 重写为 Pi manifest、包根相对路径、过滤和 reload，不保留 upstream loader/update/模板 hash 管理器。自定义运行时不能指导直接编辑 deployed scripts 绕过发行 hash；定制 workflow/config/spec/roles 与包代码更改分开说明。

**完整排除** `trellis-channel/**`、`trellis-session-insight/**`。无需新增对应替代技能。

所有包内 references 必须 skill-root 相对；项目资料 `.trellis/...` 必须 project-root 相对，不能从包目录解析。技能间引用使用技能名称或 `/skill:trellis-*`，不能残留 `.agents` 路径。worktree 教程仍按概览提供的实际安装 `docs/worktree-execution.md` 按需读取，不塞入主 prompt，不把它当 Python CLI 入口。

## 3. workflow 应保留/裁剪的具体结构

保留 Core Principles、三阶段/步骤编号、Planning Artifacts、父子任务非依赖调度、JSONL context、session-scoped pointer、finish 不改变状态、spec capture、批准后分组提交/no push，以及 `[workflow-state:{no_task,task_error,planning,in_progress,completed}]` 语法。no_task/Request Triage 应明确只读探索无需任务；只有准备修改才征求建任务/实施批准。task_error 不回退 no_task。

删除 Codex inline 状态/平台路由矩阵、Grok/Kimi/其他平台派发说明、Python/JS 上游 hook 文件和上游 regression.test.ts/cli/backend spec 锚点、`trellis update`、marketplace/template-sync 维护教程。Pi 的 `session_start`/input/tool events 由包 extension 负责；phase pull 用 `get_context.py --mode phase --step X.Y`，不硬写 codex。**保持 parser 所需的标题/标记兼容性须由集成测试证明，不能凭文档修剪猜测。**

Phase 2 保留主会话 implement/check、子角色自豁免、Active task 头、JSONL→PRD→design→implement 读取；绑定 worktree 的任务走已有 managed dispatch，不让普通 Agent 偷绕。Phase 3 中 Git/归档/journal 是后续经批准操作，不是 init 副作用。`/trellis:continue`、`/trellis:finish-work` 改为真实 `/skill:trellis-continue`、`/skill:trellis-finish-work`；未声明这些 native command，就不能宣传它们存在。

## 4. 建议安全默认配置

```yaml
session_commit_message: "chore: record journal"
max_journal_lines: 2000
session_auto_commit: false
context_injection:
  max_file_bytes: 32768
  max_artifact_bytes: 65536
  max_total_bytes: 131072
```

`session_auto_commit` 必须显式 false（现有模板注释掉默认 true），避免之后 journal/archive 自动暂存提交；init 本身也不能调用提交。hooks 默认不注册任何命令，可保留说明性注释。删除 channel/codex/packages/default_package/registry 配置。`prompt_injection.skip_keyword` 不能仅凭 upstream 注释宣称 Pi 支持，本轮不建议发布此 knob，主会话如保留需核对宿主消费方。

`.pi/pi-trellis.json` 的 worktree.directory 既有默认 `.worktree`，不需要创建默认 JSON；若用户已有定制则保持。Python 可执行程序通过现有环境选择和 argv 探测，不将本机绝对解释器路径固化进模板；`pythonMinimum` 从最终基线读取。不要在模板中写本机 developer、session key、package root、冻结发行 ID。

## 5. bootstrap/onboarding 已确定契约与尚待综合点

上游实证：`dist/commands/init.js:199–238,444–501,620–625` 生成 task.json + PRD；`status=in_progress`、`dev_type=docs`、`priority=P1`、creator/assignee=实际开发者、createdAt=日期，subtasks/children 为字符串数组，其他字段保持 canonical 默认。24-field 定义证据是安装包 `node_modules/@mindfoldhq/trellis-core/dist/task/schema.js`，**不能作为运行时 dependency**。bootstrap relatedFiles 改 `.trellis/spec/`，不引用不存在前后端目录。不要调用常规 `task.py create`（会尝试绑定 pointer）。

首次 fresh init 创建/复用 `00-bootstrap-guidelines`；受支持 clone 缺 `.developer` 创建/复用 `00-join-<slug>`，即使历史 workspace 已有；同身份已就绪不写，不同身份拒绝。已有任务/历史文件字节保留；上游只检查活动目录，同名任务归档后可再建，不扫描 archive 改行为。slug 为小写→NFKD→非 Unicode Letter/Number 连串替换 `-`→去首尾 `-`→空值 `user`；开发者名字本身不能 slug 化。

需要主会话综合（非用户问题、不得据此改产品范围）：

1. **发行清单衔接**：`resources/runtime-baseline.json` 现有顶层 schemaVersion/upstream/entrypoints/pythonMinimum/files/releaseId/projectSourceRevision，原始来源 hashes 在 `upstream.sourceHashes`；files 条目有 origin/sourcePath/sourceSha256/license/sha256/modified、可选 sourceRevision，部分原创来源字段可 null。它是运行时来源/hash清单，不是含部署目标/mode/templates/agents 的项目完成清单；目前无 mode 字段。主会话须确定项目 `.trellis/.pi-trellis.json` 与模板/agents provenance、操作记录路径/版本的映射，复用最终 checker 产物，不固定当前 releaseId/hashes，不冒称 `resources/baseline.json` 已交付。
2. **任务骨架 API**：init 不能为了 canonical shape 引入 trellis-core/外部 CLI，也不能借 create/start hooks。确定从已交付 runtime 契约取 canonical defaults 的唯一方式，避免 TS 另造宽松字段模型；需与真正 deployed runtime 做互操作测试。
3. **同名 slug 冲突与半任务**：`A B`/`A-B`、emoji fallback 可碰撞；上游存在目录即成功会掩盖 corrupt/missing task.json/PRD。按已批准 preserve/diagnose 处理，主会话须明确“复用”校验与安全重试边界，不能覆盖另一开发者任务或扩为 task 迁移。
4. **根文件增量 ownership**：已有同名受管块被定制、重复/缺闭合 marker，或已有 journal merge 使用非 union，需要明确冲突诊断；不能将“增量”当覆盖许可。匹配必须是准确 journal 路径，不照搬上游泛 `journal-*.md` 正则。
5. **partial init vs empty supported clone**：上游 tasks-empty 会落 full-init/bootstrap；父设计只允许本操作中断恢复、支持 clone 身份设置。不能仅凭空 tasks 推断旧项目可部分初始化；操作记录、manifest 和实际身份决定分支。

## 6. 必需验证与宿主证据

建议沿用父计划测试责任路径：

- `tests/initialization.test.mjs`：fresh 完整文件集/full hashes/modes；inspect/plan/check/所有取消无写/无 bytecode；clone 仅身份/缺失 workspace/join；实际身份重读；Unicode/空格/拒绝名字及 slug；同名冲突/损坏骨架；根块/属性/ignore 原字节；symlink/dangling/祖先逃逸/HOME；并发前置条件变化、逐步故障后保守保留/同操作原样恢复；没有 hooks/session pointer/stage/commit/install/network；最终 true-runtime 生命周期互操作。
- `tests/init-command.test.mjs`：无 scripts 时 command 已注册；所有菜单/help/error/结果英文；参数未知/重复/缺值/空值；历史排序/有界/去重/Git建议与 unsafe 报告；input 的 placeholder 非预填；Esc/undefined/false/无 UI 无写；requested 与实际身份；成功刷新/reload 后不访问旧 runtime。
- `tests/skill-resources.test.mjs`：10 skills/22 meta refs/4 bootstrap refs 精确集合、frontmatter 和相对引用闭包、无 excluded 能力/错误命令/本仓库 spec 泄漏/未替换 token；实际 Pi ResourceLoader 发现技能，无 `.pi/skills` 副本；manifest过滤 skills=[]、extension禁用、autoload:false project delta 和 trust 语义；发布资源包含 runtime/templates/skills/agents/licenses。
- existing agent-context/task-display/worktree-protocol/preparation/dispatch/material-sync：新模板 phase 各步可读、task_error 区分、常驻计数不退、optional worktree baseline 与准备/派发契约不退。不复做 runtime checker 的正确性研究。

Pi 1.2.0 文档已全文阅读：README；docs/{packages,skills,extensions,tui,settings,configuration,cli,rpc-extension-ui}.md；实际 examples/extensions/{rpc-demo,reload-runtime}.ts。API 确认：select 返回 string/undefined，confirm boolean，input(title, placeholder?) 返回 string/undefined；RPC hasUI=true 支持这些 native dialogs，print/JSON 无 UI；reload 为 command-only 且终结旧 runtime。包 manifest 路径包根相对，skills description 用于按需加载，重复技能保留首发现并警告；settings filters 缩小资源集合，autoload:false 是项目过滤 delta，不是整体禁用。本轮未运行宿主/fixture、未做真实 TUI，以上为实施必测项而非通过声明。
