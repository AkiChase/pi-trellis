# Pi 专用内置 Trellis：技术设计

> 状态：提案，待审阅。PRD 已获批准；本设计不代表实施授权。
> 规划来源快照：`9af75d2f52f78ee932bb31563cc29fe7ce5a9b73`。实施前须重新检查当前 HEAD 和并行改动；不得重置到此 hash。

## 1. 架构与权威来源

pi-trellis 将成为仅面向 Pi 的 Trellis 派生发行版。包内包含固定运行时和默认资源；项目保留自身状态及可编辑的约定。上游 `trellis` 不是运行时依赖，也不得使用任意已安装的 CLI 生成发行资源。

```text
pi-trellis package
  extensions/trellis.ts         existing host orchestration, registers init command
  lib/initialization/          new UI-independent inspection/plan/apply helpers
  runtime/                     固定 task/context/journal 与 worktree 运行时源码
  resources/templates/         Pi workflow/config/ignore/root/bootstrap 默认材料
  resources/baseline.json      来源修订、资源 hashes、发行 schema
  skills/                      适配后的 Pi skills，随包加载
  agents/                      已有适配 Pi 角色定义

project
  .trellis/scripts/            deployed fixed runtime + native worktree CLI
  .trellis/.pi-trellis.json    managed runtime/template provenance manifest
  .trellis/config.yaml        user configuration, not blanket-overwritten
  .trellis/workflow.md         project workflow, not blanket-overwritten
  .trellis/spec/              real project guidelines, never package implementation specs
  .trellis/tasks/             tasks, including bootstrap/onboarding
  .trellis/workspace/         shared historical journals
  .trellis/.developer         local developer identity
  .trellis/.runtime/          local session/worktree state
  .pi/agents/                hash-guarded deployed role definitions
```

这些目录/模块名称是拟实施的目标，不是既有 API。初始化辅助模块不得重复实现 worktree 算法；现有部署器、路径和 hash 基础工具的契约适用时，应直接复用。

### 已确认的资源加载方案

用户认可通过 `pi.skills: ["skills"]` 从包加载 skills，不复制到 `.pi/skills/`。初始化负责项目运行时和文档。包内运行时源码统一放在 `runtime/`，不按语言命名为 `python/`；现有 worktree 源码迁移路径时保留模块归属并更新引用，不能复制出第二份实现。`runtime/` 是目录命名建议，项目命令入口仍是 `.trellis/scripts/`。

保留 `.pi/agents` 部署，因为当前 provider 的发现机制读取该位置。一旦发行清单存在，会话启动阶段不得静默发布来自较新包的已变更角色定义；首次部署应在获准的初始化/迁移中完成，内容未变的文件不重写。保留用户定制的定义，就绪检查仍须明确执行。

## 2. 固定基线与发行来源记录

本次检查的已安装 CLI 报告版本为 0.6.16；既有适配角色的来源说明引用 0.6.17。仅凭任一版本标签，都无法证明当前每个项目脚本的来源。打包前须：

1. 盘点当前已提交脚本的完整导入依赖闭包、模板和适配后的 agents。
2. 按来源类别记录准确的来源修订/版本和完整 hash；有可用包源码时进行比对。不得类推，将全部内容标记为 0.6.17。
3. 保留 AGPL 文件头/声明和既有 agent 来源记录。原创 adapter/worktree 源码保留自身署名与归属说明。
4. 仅纳入支持操作所需的项目运行时，不纳入 CLI/channel/mem 实现、平台配置器或用户状态。
5. 将获准的正确性修复整合到本发行版维护的运行时源码中，停用安装时文本补丁。未来引入上游改动属于有意安排的发行工作，不是自动全局更新。

固定发行 ID 由基线 schema 和资源内容共同导出；仅凭 npm/package 版本不能授权覆盖文件。Python 最低版本须根据实际打包的导入依赖闭包和既有 worktree 要求确定，不得未经验证照搬上游 init 宣称的 >=3.9。解释器选择应确定 argv 中的可执行程序，不得拼接为 shell 字符串。

## 3. 命令与 UI

在 extension 工厂中无条件注册 `/trellis-init`，且位于 session()/hasScripts 门禁**之前**。新项目必须能在 `.trellis` 尚不存在时调用它。工厂本身不执行文件系统初始化。

MVP 支持的命令形式：

```text
/trellis-init
/trellis-init --user akichase
/trellis-init --help
/trellis-init --check
```

`--check` 只检查状态。未知、重复或缺少值的参数必须在写入前报错。参数补全提供参数名和安全的用户名候选。不提供 `--force`、一般升级、完整重新初始化或自动平台生成模式。`--user` 仅跳过名字选择，不跳过最终批准。无 UI 的命令执行返回检查结果/可执行的操作说明；没有 UI 就不得虚构确认。独立的显式非交互写入协议不在 MVP 范围内。

所有发布文案使用英文。使用 Pi 的 `ui.select`、`input`、`confirm`、`notify`，不新增全屏 UI。`input` 文档中的第二个参数是占位提示，不是初始值。Git 建议值应作为选项展示，不得假装它是可编辑输入框中的预填值。基础对话框保留 RPC 兼容性；除既有宿主辅助工具外，不引入新的自定义 TUI 依赖。

### 状态路由

| 状态 | UI/行为 |
| --- | --- |
| 无 `.trellis`，目标有效 | `Initialize project`、`Cancel` |
| 支持的发行版，无本机 `.developer` | `Set up developer identity`、`View project status`、`Cancel` |
| 支持的发行版，已有本机身份 | 显示实际 `Developer`/`Workspace`；提供 `View project status`、`Cancel`；同名请求报告已就绪，不写入 |
| 已有不同的本机身份 | 报告实际身份及请求的名字；不静默切换，不错误报告成功 |
| 不支持的既有运行时/未知清单 | 只读状态；拒绝一般迁移；不得在旧项目内进行部分初始化 |
| 受管初始化不完整/损坏 | 诊断准确状态；仅对第 5 节所述未变更的本操作受管写入安全重试 |

无身份恢复分支适用于本发行版支持的项目克隆。它不授权升级任意上游项目。本仓库的旧脚手架另按第 8 节处理。

### 用户名交互

按限定数量、排序后的有效历史 workspace 名提供候选，并标注 `Existing workspace`；随后提供与历史候选不重复且安全的 Git user.name 建议，标注 `Suggested from Git`，以及 `Enter a different username` 和 `Cancel`。列表来自本地发现，不是身份认证。跳过/报告不安全候选，不跟随任意 workspace 软链接。长菜单和字符串通过既有宿主宽度/列表机制限制展示规模。

自定义名字必须是非空、安全的单个目录片段，拒绝 `.`/`..`、分隔符、控制字符及路径逃逸。在文件系统/路径安全允许时，保留合理的空格/Unicode 名字；不得静默将身份转换成 slug。上游 slug 转换仅用于 onboarding 任务名；须实现兼容的 NFKD/小写化及 Unicode 字母/数字处理，并加入明确测试。说明历史名字被拒绝的原因，不得重命名其 workspace。

在任何发布前步骤取消，都不得写入。输入无效时允许重试，并保留此前有效选择。通过参数传入的用户名遵循相同校验。

### 确认与结果

确认摘要展示规范化后的 `Project`、请求/实际生效的 `Developer`、`Workspace` 是复用还是新建、发行版本、操作类型，以及逐项资源动作/冲突。展示任务创建，并说明 `No active task will be selected`。仅设置身份的确认摘要须明确说明 runtime/config/spec/workflow 不变。确认必须明确返回 true；按 Esc/断开连接均视为取消。

完成后重新读取实际生效身份和清单。展示实际创建/复用的任务路径及后续操作；刷新根目录/会话 key 相关上下文缓存和显示。如宿主资源需要重载，应在写入后通过命令上下文执行 reload，不再使用旧运行时上下文。不得自动触发模型回合、bootstrap 实施、Git stage/commit 或依赖安装。

## 4. 与上游行为的对应关系

完整的已安装实现审计和真实二进制复现见 `research/upstream-init-audit.md`。

| 上游行为 | Pi MVP 对应方案 |
| --- | --- |
| 优先 `-u`，其次 Git user.name，再次非空输入提示 | 保留显式用户优先级；交互菜单将 Git 名字标为建议。不得在缺少身份时静默报告成功 |
| 既有本机 `.developer` 阻止替换 | 保留实际身份；修正 CLI 误导性成功输出，不新增身份切换操作 |
| 历史 workspace 文件保持不变 | 保留历史文件字节一致；仅创建缺失的 journal/index 脚手架 |
| 已初始化项目若此前无 `.developer`，创建 join 任务 | 即使是返回的历史用户，也保留 `00-join-<slug>` 创建/复用行为；与上游一致，活动任务目录缺失时，归档后仍可能重建 |
| 首次 init 创建 bootstrap 任务 | 保留 `00-bootstrap-guidelines` 任务/PRD 及创建者/负责人；模板状态遵循选定且已验证的基线（目前为 in_progress），但不为本会话选择该任务 |
| 任务骨架不绑定会话指针 | 保留；不调用 init 生命周期 `after_create/after_start`，不推断批准 |
| Python/cwd/冲突检查 | 保留安全目的；通过参数数组探测解释器；拒绝在 HOME 及受管目标中初始化 |
| Frontend/backend/fullstack 及可选 monorepo 检测 | 用户明确排除：不检测项目类型，不提供布局菜单，不生成前后端 spec，不检测或配置多 package |
| 远程 spec registry/workflow marketplace | MVP 排除；内置一套 Pi 原生 workflow，spec 仅保留供后续按需建规范的空入口 |
| 其他平台和 channel runtime agents | 排除；仅生成 Pi 角色材料 |
| 根 AGENTS.md 和 journal 合并属性 | Pi 受管指令块/增量 journal 规则；预览准确影响，保留块外内容 |
| CLI 版本/模板 hash 跟踪 | 替换为发行版自有清单，不虚称兼容上游更新 |
| Reinit 平台/完整重新初始化菜单 | 排除；仅支持受支持项目的身份设置/检查 |

用户已明确省略初始前后端 spec 和多 package 支持。Init 不检测项目类型、不写 packages/default_package、不生成 frontend/backend 规范树。仅建立 spec 目录入口；通用 thinking guides 的保留与 bootstrap 引导相互独立，不能夹带业务规范模板。保留 `00-bootstrap-guidelines`，其 PRD 改为指导后续获准、基于真实项目按需建立规范，不引用不存在的前后端模板，也不在 init 中扫描代码或填规范。此处是用户明确批准的上游行为裁剪；首次任务创建、历史身份恢复/onboarding 规则继续保留。不得把本仓库 extension/scripts specs 复制到其他项目。

对于远程提供/自定义模板的 workflow，用户可之后自行编写项目文件；本初始化不下载内容，也不静默修改既有 workflow.md。

## 5. 检查、计划、发布与中断处理

将纯检查/计划与 apply 分开，使对话框、测试及未来可能的非交互客户端共用行为。

- `inspect(root)` 确定项目/发行状态、实际开发者、安全 workspace 候选、解释器可用性和冲突。不产生导入时字节码或运行时写入。
- `plan(root, inputs)` 生成文件/目录操作，包含预期原始 hash、所有权分类、目标字节/模式和任务影响。
- `apply(plan)` 获取专用本机初始化锁，重新读取关键前置条件，校验所有路径/原始 hash，再按文件原子发布。不得递归获取既有 worktree 锁。
- 预览不创建锁。拒绝受管目标中的软链接、悬空链接、非常规文件及根目录逃逸；写入前再次检查。父级根目录本身可以通过正常 OS 软链接解析为规范路径。
- 用户名和 Git 探测不使用 shell 插值；项目相关 Git 调用须移除继承的 Git 重定向环境变量。所有 Python 探测在复制的子进程环境中使用 -B/PYTHONDONTWRITEBYTECODE。

初始化状态标记保存有大小边界、带版本的操作记录，包含准确的计划 hash 和完成步骤，不提供不受约束的删除能力。只有必需资源、身份和任务结果全部验证后，才发布清单/标记完成。逐文件原子写入**不是**整目录事务。中断时报告不完整状态；重试仅恢复内容完全一致、未变更且归本操作所有的内容，绝不覆盖分歧修改。身份以实际持久化文件为准，而非仅以最初请求的名字为准。

新项目初始化绝不覆盖未知文件。受支持项目的身份恢复仅添加 `.developer`、缺失的 workspace 脚手架和 onboarding 任务。既有 tasks/spec/workspace/config/workflow 归用户所有，须保留。不自动回滚删除用户可见的任务/历史；fixture 失败测试须证明保守保留行为。首次发布前检查所有输出的磁盘冲突，包括根 AGENTS.md/.gitattributes 和任务骨架。

清单 schema v1 记录发行 ID、资源来源、受管安装路径/hash/模式和初始模板指纹。用户可编辑模板的初始指纹仅供诊断，不构成整体替换授权。运行时不一致应返回只读状态/错误，而不是允许执行旧脚本。新包/旧项目不一致需要后续显式升级设计；当前 init 不得静默升级。受支持格式上的仅身份恢复无需重写运行时。

## 6. 运行时/任务契约

项目部署的一套运行时，是 task/context/journal CLI 和 init 创建记录的权威来源。TypeScript 磁盘快速路径是同一状态的投影，不是独立且宽松的回退机制。

- Context ID 遵循 extension 文档规定的校验后 override/派生 Pi key；子进程始终接收显式 key/root。无效的显式 ID 须一致地失败或拒绝，不得清洗成另一有效会话的 key。
- 对受支持的 Pi 调用方，不进行单会话推断。Child 在绑定前派生自身独立 key；finish 绝不清除 parent，绑定失败绝不回退，重复 prompt 头绝不恢复已清除的指针。
- 保留不同诊断状态：无绑定、指针损坏、任务无效/失效、记录不可读和任务有效。无效引用可展示以供修复，但不能用于直接文件系统读取、hooks、package 选择或 stage/commit。
- 获授权任务必须位于词法路径与解析路径均允许的任务存储范围内，且 task.json 有效并受大小限制。一致支持既有的窄范围外部来源任务存储路径；受管目标运行时/存储仍保持本地。
- CLI JSON/错误退出语义和字符串封装在授权工作时，不能丢弃有效性信息。Finish 可显式清除自身无效指针，但不得执行任务 hooks；须披露诊断。
- 命令输入 hooks 覆盖已安装的可执行命令工具（`bash`，以及可用的 `bash_bg`/带 command 的 `monitor`），且不修改宿主 process.env；仅转换已知携带 shell 命令的输入。记录用户 shell/provider 的边界，不宣称普遍拦截所有调用。
- 初始化/身份变更时，使相关 context/task/section 快照失效。记录损坏须产生 task_error/诊断，而不是无任务的规划 breadcrumb。保留既有仅计数显示。

### 审计分流与有边界的实施范围

独立发行安全所必需的内容：真实脚本会话隔离；current/context/packages/journal 的任务/路径/记录校验；journal 暂存使用准确的已验证任务路径，而不是 basename；finish hooks 仅在成功清除自身指针且任务有效后执行。Init 必须校验开发者名字、使用安全子进程、保护用户文件，并避免派发到不支持的运行时。

由于 archive 属于内置支持生命周期，还建议将 archive stage/commit 缩小到准确的移动目标、源路径删除和明确修改的 child。不能在支持路径中仍保留已复现的跨任务自动提交问题，却宣称是“安全发行版”。这是待批准的具体新增范围提案，不代表纳入全部审计发现。

以下事项暂缓，除非为避免初始化失败所必需：层级环/过滤渲染/孤立进度、重命名后的指针修复、journal 语义重试身份、软链接/文件模式检查快照，以及一般上游平台 adapter。保留这些审计局限，不得静默宣称全部异常已修复。Init/context 使用的基础畸形任务字段投影不能导致整个操作崩溃。不重新设计每个运行时辅助模块。

## 7. Worktree/provider 集成

保留原生 Python worktree 实现的维护归属和 provider 公共 RPC。Init 组装统一基线，包含 task.py 和原生模块；创建/prepare 仍使用已提交的目标脚本，绝不复制来源未提交运行时，也不在目标内自动安装。在危险的受支持调用前，就绪检查必须诊断不兼容/缺失的运行时发行版；未打补丁脚本上的 fixture 成功不足以证明就绪。

保留当前已提交的材料同步/修订和占用行为。不迁移旧 worktree 记录，不修改 provider，不引入临时 isolation。修正对持久 adapter 的检测，使其遵循实际包资源配置/优先级，避免 init 安装的资源在 child 中被禁用，派发却仍宣称就绪。依据已验证的 Pi 语义测试启用/禁用的包声明；不得从命名推断 `autoload` 含义。

## 8. 本仓库迁移

这是刻意限定范围的一次性计划，不是公开的一般迁移命令。

1. 快照记录 tracked/untracked/ignored 清单及受影响字节；考虑并行任务/worktree，在替换前取得无并发改动的集成窗口。
2. 从已验证基线准备经过筛选的包源码，保留原始声明，构建最终不可变资源清单。
3. 准备清单，标明既有脚手架的准确字节和拟替换内容；保留 tasks（包括当前规划任务）、workspace 历史、developer/runtime 状态、定制 config/workflow 和 spec 文件。
4. 在明确 diff 审阅后，将获准运行时基线和 Pi 资源发布到本仓库；不运行新项目 bootstrap，不覆盖既有开发者。
5. 只有保留的 skills/引用文件已进入包、所有入向链接/config 路径均已更新、且没有必需活动任务上下文指向待删路径后，才删除 `.agents/`。不得删除此用户的全局 `~/.agents` 或其他仓库目录。
6. 移除 extension 的旧 Trellis skill bridge；不管控其他地方第三方对 `.agents` 的自动发现。
7. 用插件包安装及明确 `/trellis-init` 指引，替换安装器对全局 Trellis/文本补丁的依赖。安装时不产生项目脚手架副作用，init 期间不获取依赖。
8. 执行准确迁移快照的检查/测试；commit/archive/install/reload 仍是需要分别授权的操作，不是本任务规划动作。

回滚采用经过审阅的受管脚手架改动反向 diff，或在确认字节未变后从备份恢复。不得对并行改动使用 git reset/clean，也不得整体删除 .trellis。卸载插件只停止加载包资源；保留项目状态/脚手架，不自动抹除。

## 9. 父子任务划分与风险

用户认可拆分子任务。本任务作为需求、整体设计和最终集成验收的父任务：

1. `10-13-standalone-runtime`：固定运行时与脚本修复，先完成可部署基线和真实脚本验证。
2. `10-13-standalone-init`：英文初始化与资源部署，依赖运行时契约确定；不包含项目类型/多 package 检测。
3. `10-13-standalone-migration`：本仓库定向迁移与集成，在前两项验收后执行。

父子关联不是依赖执行器，顺序写入各子任务文档。所有子任务仍 planning，实施前各自完成设计/计划/context 并获得最新批准。Skills 随包加载已确认；脚本修复包含独立发行安全所需的隔离/有效性/精确提交边界，其他审计项暂缓并披露。

风险包括：来源不一致（0.6.16 CLI 与 0.6.17 角色基线）、解释器/版本矩阵、导入依赖闭包大小、项目/包版本过期不一致、根文件冲突所有权、多文件发布中断、来源任务存储软链接，以及受管 worktree 基线。应通过清单盘点、带版本的 manifest 和真实运行时临时环境测试解决，而不是增加动态上游补丁。
