# Pi 专用内置 Trellis 与项目初始化

## 目标

安装 pi-trellis 后即可显式初始化并使用 Pi 专用 Trellis 工作流，无需预装或调用全局 Trellis CLI。运行时、agents、skills 由 pi-trellis 固定基线并统一发布，避免上游脚本更新导致补丁漂移或多个入口解析规则不一致。

## 背景与已确认事实

- 当前插件通过项目 `.trellis/scripts/` 执行 task/context/journal，安装脚本仍要求全局 `trellis` 及预先初始化的项目。
- `scripts/patch-trellis.py` 有最小 session-isolation 补丁，但本项目生成的 `common/active_task.py` 未应用；已有 fixture 测试不保证真实项目脚本符合隔离规则。
- Trellis CLI 的 channel/mem 是额外运行时能力，不属于本任务支持的日常 Pi task/context/journal/worktree 链路。
- Pi 支持插件 package manifest 暴露 skills，也自动发现项目 `.pi/skills/`。`pi install -l` 只登记/加载包，不自动将 skills 复制到项目目录。
- 本任务获准创建并进入规划；尚未批准产品代码修改、删除 `.agents`、执行安装或开始实施。

## 已确认需求

### R1 — 独立发行

- 将 Pi 所需的 Trellis 派生运行时、默认模板、agents 和裁剪后的 skills 纳入插件可发布材料，使用明确固定的基线。
- 新项目初始化和日常支持操作不依赖全局 `trellis` 二进制。
- 保留派生代码的来源与 AGPL 许可说明；不得宣称全部 MIT。

### R2 — 显式初始化

- 插件提供显式项目初始化能力，代替外部 `trellis init`；`/trellis-init` 是候选接口名称，尚待设计。用户已要求菜单式交互和自定义用户名输入，UX 提案见 `research/init-wizard-ux.md`，待审阅确认。
- 初始化产品 UI 统一使用英文，包括命令描述/help、菜单、用户名输入提示、校验错误、确认摘要、进度与结果；遵循 Pi 英文文案习惯，首版不新增多语言机制。
- 菜单是输入体验适配，不改变已验证的上游 workspace 保留、onboarding 分支和不自动绑定 session 的行为。历史用户名候选可作为本次请求下的新 UX 提案，不得宣称上游已提供此菜单。
- 用户先看到初始化目标和将创建/修改的材料，再确认写入；Pi 启动检测不得自动初始化或升级。
- 初始化提供基础 `.trellis` 目录、默认 workflow/config、开发者身份、Python runtime（含 worktree CLI）、Pi agents/skills，以及版本/hash 记录。
- 开发者身份是用户输入的名称/workspace 标识，不是账号鉴权 ID，也不是 `TRELLIS_CONTEXT_ID`。初始化必须明确收集并展示身份；Git user.name 只能作为候选，既有 `.developer` 不得静默覆盖，缺少身份不得悄悄宣称完整初始化成功。
- 身份初始化应建立 `.trellis/.developer` 和 `workspace/<name>/journal-1.md`、`index.md`，保留既有日志。
- 已初始化项目在新电脑上恢复历史开发者名，属于支持的身份设置，不等于一般旧运行时迁移。行为必须对照 Trellis CLI reinit：显式 user 复用历史 workspace、不覆盖日志；本机原先没有 `.developer` 时，即使历史 workspace 已存在，也创建/复用 `00-join-<slug>` onboarding 任务，不自动绑定当前 session。不得沿用之前未经上游验证的“历史用户不创建 onboarding”方案；历史用户名选择菜单属于需单独审阅的 Pi UX 适配，不是上游行为。
- 上游 CLI 对已有不同身份存在错误成功提示；适配不能声称身份切换成功，须报告实际持久化身份并保护原值。其他行为偏离必须在设计里明确。
- 上游 init 的完整职责盘点和真实二进制历史用户复现见 `research/upstream-init-audit.md`；bootstrap/spec、项目类型/monorepo、根文件等行为仍需逐项确认，不能将“复制目录”视为等价替代。
- 保留项目 Python 入口方案作为规划基线：task.py、get_context.py、add_session.py、worktree.py 使用同一受控发行版本；不能让 extension 和 agent 命令使用不同权威运行时。

### R3 — 仅面向 Pi 的技能范围

- 排除 trellis-channel、trellis-session-insight；裁剪 trellis-meta 等材料中的 channel/mem、其他平台和不再支持的上游 CLI 使用引导。
- 保留并适配日常 start/brainstorm/before-dev/check/finish 等工作流 skills，所有命令与运行时引用自洽。
- 不考虑其他项目 `.agents/skills/` 的发现或残留影响。
- 迁移本仓库时删除本项目 `.agents/`；删除前确保需要保留的内容已纳入新资源，完整处理引用。不得删除其他项目同名目录。
- 技能通过 package manifest 随包加载，不复制到 `.pi/skills/`；用户已确认，避免双副本版本漂移。

### R4 — 资源所有权与既有内容保护

- 首版仅支持新项目初始化、已初始化项目的本机身份设置/历史用户名恢复，以及本仓库定向迁移；不支持一般已有 Trellis 项目的运行时迁移/升级兼容流程。
- 初始化与未来升级分开；初始化不得强制覆盖已有用户文件。
- tasks/spec/workspace、项目定制 workflow/config 与运行状态必须和插件管理资源区分。
- 插件管理资源更新需要版本及内容校验；未知或用户定制内容不能静默覆盖。
- 不依赖修改 pi-subagents/agent-tasks，不恢复临时 worktree isolation；遵守现有公开 RPC 与持久 worktree 协议。

### R5 — 活动任务契约

- 纳入的运行时应与 extension 使用同一明确的 session 归属、任务路径及有效性契约。
- 当前 session 无绑定不得推断其他 session；无效、损坏或失效引用不能授权任务相关 hooks/提交/派发。
- 增加真实内置/部署脚本的调用链回归，而非仅验证由补丁常量构造的 fixture。
- 审计发现的其他上游异常作为设计输入，是否纳入本次修复需显式划定范围，不默认承担整套上游修复。

## 不在范围内

- 首版不检测项目类型，不生成初始 frontend/backend spec，不支持多 package 检测或配置，也不提供远程 spec 模板市场。spec 入口留给后续依据真实项目按需建设。
- 一般已有 Trellis 项目的迁移、旧版运行时兼容和升级流程；首版只定向迁移本仓库。
- trellis channel/mem、其他平台适配及全局 Trellis 安装/升级。
- 自动扫描、删除或迁移其他项目 `.agents/skills/`。
- 修改第三方 subagent provider 或引入 pi-worktree 依赖。
- 默认将之前全部审计发现扩展成全量上游脚本修复。
- 当前任务仅规划，不执行本仓库删除、实际初始化、安装、提交或 push。

## 验收标准

- [ ] AC1: 在无全局 `trellis` 的隔离环境中，插件可显式初始化新项目，随后运行支持的 task/context/journal/worktree 流程。
- [ ] AC2: 初始化预览不写入；确认写入后资源完整，重复操作不破坏用户内容；已有未知/定制文件被明确拒绝或报告。
- [ ] AC3: 运行时、agents、skills 版本及引用一致，不存在运行不同旧副本而未被检测的支持路径。
- [ ] AC4: 支持技能不再引导调用 channel/mem/外部 trellis init；Pi 正确发现保留的 skills。
- [ ] AC5: 本仓库 `.agents/` 按批准迁移删除，所需材料和链接已保留；并行任务、用户状态与其他项目文件不受影响。
- [ ] AC6: 真实脚本测试证明空 session 不借任务，child 不清 parent，无效任务不授权 hooks/提交/派发，错误与无绑定可区分。
- [ ] AC7: 固定上游来源、许可证和升级所有权清晰可验证，安装器不再要求外部 Trellis。

## 已确认的拆分与目录说明

- Skills 随包加载，省略初始前后端 spec 和多 package 支持，用户已确认。
- 用户认可拆分运行时修复、初始化、迁移三个子任务；本任务保留需求和最终集成验收。
- 包运行时源码目录建议统一为 `runtime/`，不使用按语言命名的 `python/`；这是内部源码目录，项目命令仍位于 `.trellis/scripts/`。
- 固定基线来源核验、版本/hash 状态检查和不一致拒绝规则见 design.md；不提供一般升级/迁移。

## 规划文档状态

PRD 已获用户认可；design.md、implement.md、implement.jsonl/check.jsonl（各 9 条真实上下文）已完成初稿并通过 task validate。技术设计含明确待审阅建议，尚未通过最终规划批准，任务仍 planning；未开始实施或删除本项目 .agents。
