# 用户级安装与项目级激活

## 目标

pi-trellis 用户级安装一次，按当前项目状态启用完整工作流。普通项目只保留 `/trellis-init`，不因安装插件而自动引入 Trellis 工作流。继续支持项目级安装及 Pi 配置覆盖。

## 授权

用户批准完整规划在当前工作区执行，确认未初始化时viewer/dispatch不注册和常驻显示完全缺席，采用Git边界停止规则。授权包括计划内实施、验证、独立审查及各阶段本地commit；不包括个人环境安装/reload、push、archive。直接实施的implement.jsonl故意为空；独立审查check.jsonl已有当前spec与研究引用。

## 背景与类型

- `/trellis-init` 和 `/trellis-task-viewer` 是 slash commands，使用 registerCommand。
- `trellis_dispatch` 是模型 tool，使用 registerTool；不能用 inactive/hidden 冒充不注册。
- `/skill:trellis-*` 由 Pi 从 skill 资源生成，不注册成手写 command。
- 当前 `extensions/trellis.ts:findRoot` 从ctx.cwd一直向上到filesystem root；viewer/dispatch无条件注册，package.json静态加载十个skills。普通项目虽没有workflow/display，却仍暴露指令/tool/skills。
- Pi 1.2.0 有公开resources_discover、动态注册、reload重建能力，但没有通用command注销；动态skill paths不会自动继承package过滤。只读真实resolver实验及宿主代码证据见 research/host-resource-lifecycle.md。
- 现有verifyRuntime校验manifest、初始化操作与部署runtime指纹；init有显式确认与reload，adapterConfigured接受用户级永久配置，不应放宽安全gate。

## 需求

### R1 安装

推荐用户级单包安装，installer默认用户级，--local保留项目级。遵守Pi身份、项目覆盖、autoload:false delta与trust。只安装包不初始化项目，不自动复制skills到项目。

### R2 状态与注册

- 无Trellis：本包只注册init；不注册viewer command/dispatch tool、不自动加载skills、不新增overview/workflow/task-state、不绘制UI、不自动调用Python或写文件。常驻任务显示必须完全缺席：不显示 `▸ trellis(0)`、`▸ trellis(?)`、任务详情或 footer chip，而非仅隐藏任务名。
- 有效runtime（含clone缺本地身份）：注册init、viewer、dispatch；按资源过滤加载skills；保留现有prompt/UI/session/派发约束。有效项目没有当前session任务时仍显示未完成任务计数，不能因无任务而误隐藏。
- 旧版/损坏/中断/不安全标记：只注册init，不加载完整能力；有限UI诊断指向init --check，不新增完整工作流或task-state。不自动升级、接管或修复。
- 有效项目缺provider仅保留已有warning，不影响init/viewer；任何注册快照均不能替代执行时runtime/occupancy验证。

### R3 根发现与init目标

用户确认：每级先检查.trellis，再检查.git文件或目录；最近Git边界停止，无Git到filesystem root。不越过异常/非目录/悬空Trellis标记去继承祖先项目。

本次最终方案同时统一init目标：已有Trellis操作发现root；无Trellis的Git项目操作最近Git边界root；无Git/Trellis使用ctx.cwd。摘要显示绝对目标，保留engine HOME/managed target/containment/确认限制。

### R4 生命周期

完整commands/tool在session_start按ctx.cwd有效runtime条件注册，一个runner一次；factory仅init与必要观察handlers。init/接管/repair成功reload后自动启用完整能力；reload后失效项目只剩init。会话恢复/替换不重复注册或订阅，不泄漏别的root上下文。

公开API无通用command注销：运行中runtime失效立即阻执行/清UI，registry完全撤回以reload或新宿主重建为界；当前SDK不支持任意cwd热切换，不承诺热注销，不修改process.cwd或宿主内部map。用户/历史AGENTS和旧会话消息不删除，只保证不新增错误project注入。

### R5 条件skills

manifest显式skills空数组，resources_discover只对有效runtime提供源码SKILL.md；以公开Pi resolver和只读虚拟Settings视图兼容现有本包skills过滤，保留explicit/delta/trust，missing source跳过不安装。临时-e不被当作永久dispatch配置。

自动能力保证不接管用户显式静态skills路径、强制Pi资源选择或其他来源同名skill。真实宿主验收noSkills/CLI/过滤行为，文档如实说明动态resource provenance/config展示差异，不手写glob/private API。

### R6 兼容、文档与交付

宿主验收及最低要求Pi1.2.0，不无证据宣称1.1兼容；Python要求保持init/有效runtime执行。无新增dependency。README英文、使用者docs中文；同步 `docs/task-display.md`、`docs/initialization.md` 和 README 的激活/常驻显示说明，明确未初始化完全不显示、有效项目无当前任务仍显示。必要开发/测试约束维护现有英文spec，不新增功能专用spec、不接管并行spec整理。

主直接实施，三阶段分别独立审查和验证后本地commit；实现、测试、必要耦合manifest同stage。无自动push/archive或真实个人install/reload。

## 验收

- [x] AC1/R1：用户级/项目级声明按Pi身份去重，项目覆盖和delta正确；installer默认user且--local可用，check/dry-run无写。
- [x] AC2/R2：真实SDK fresh registry本包只有init，tools无dispatch，skills/model提示无自动Trellis；启动无Python/项目写入。
- [x] AC3/R2：valid（含无身份）完整commands/tool/skills/prompt/UI存在；有效项目无当前任务仍显示计数；无Trellis/unhealthy/init中断在widget和status两种模式均无任何常驻标签、计数或详情，失效/reload清除旧显示。仅init且拒runtime执行，普通read/search不受影响。
- [x] AC4/R3：子目录、嵌套独立repo、.git文件、无Git、异常marker测试覆盖；init目标和确认摘要统一，取消/拒绝保持原字节。
- [x] AC5/R4：真实SDK init/repair→reload启用，reload失效后撤回注册和自动skills；恢复会话不重复订阅，错误cwd不新增其他root上下文，旧历史不篡改。
- [x] AC6/R5：真实resolver/SDK default、empty、plain白名单、+加法、delta empty/exclusion、trust、重复source、临时-e/noSkills和静态强制路径覆盖，不mock冒充宿主验收。
- [x] AC7/R6：最终focused/full、实际diff、独立check及文档link/版本证据完整；未运行的lint/typecheck/真实TUI/provider如实记录。

## 排除

不修改Pi/pi-subagents/其他插件，不搬项目workflow/spec/config/tasks/workspace到用户目录；不取消runtime/lease安全契约，不改dispatch名字/schema/action，不自动初始化、接管、依赖安装或升级；不修改runtime/skills/roles内容与provenance以凑校验；不动并行部署runtime、workflow/spec整理、历史plans删除和runtime-tool-names任务；不操作个人环境、push、archive/journal，除非另获授权。

## 规划产物

design.md：共享root/activation owner、commands/tools生命周期、skills过滤、init目标及失败边界。
implement.md：三阶段（发现注册→条件skills/SDK→安装与文档）、独立check/commit checkpoints、真实命令和验证限制。
research/host-resource-lifecycle.md：宿主事实、7项resolver实验与第一次实验预期错误记录。

产品决策与实施方案已获用户批准；执行限当前工作区和本任务范围，material scope变化重新审批。

## 验收证据及限制

Stage1独立130/130+display12/12；Stage2独立full442/442及真实SDKcmd parser init/repair reload、source/filter/trust、无身份/无效runtime覆盖；Stage3独立26/26及34links，主最终full443/443 exit0。报告见research各stage-independent-check。AC5的会话恢复/foreigncwd由mock生命周期覆盖，真实SDK仅bind/reload；持久session resume/switch端到端未跑。没有真实PTY/provider或个人环境install/reload，未测旧Pi，lint/typecheck unavailable。任务实现交付待用户接受，未归档。
