# pi-trellis Claude Code 版 Agent 适配实施计划

状态：A1/A2 和简化真实模型 implement/check 验收已完成；research 与截断 fallback 模型质量未验证。后续 W1–W5 首版 worktree 核心闭环已实现并通过实际 Pi/Trellis 离线集成。

关联计划：[任务级 Worktree 支持](worktree-support.md)。当前基线为 Trellis 0.6.17 Claude 角色加明确 Pi 适配，来源/差异见 [同步记录](../trellis-agent-sync.md)。worktree 材料准备与派发复用本计划的共享加载器，不另造角色或流程。

## 1. 目标与边界

以固定版本 Trellis CLI 在临时项目中生成的 `.claude/agents/trellis-*.md` 为角色基线，保留职责、工作结构与报告格式；根据用户最新授权，允许修正不正确/不适用于 Pi 的正文，所有平台、上下文与验证边界调整显式记录，不再要求正文逐字一致。

初始基准使用已核实的 `@mindfoldhq/trellis@0.6.17`。实施时若希望升级来源版本，先核对新版本、生成内容和差异，明确更新两个计划及来源记录；不静默跟随 `main` 或 beta。

要实现：

- implement 执行需求、验证并报告，不提交/推送/合并。
- check 审查、直接修复任务范围内的问题、重跑验证，报告已修复和未修复项。
- research 在当前任务 `research/` 持久化材料，返回路径和简要摘要。
- implement/check 不递归派发 Trellis implement/check；保留正文已有的自豁免说明。
- 没有材料注入时，继续使用 Claude 文档已有的 child-side context fallback。
- 由 pi-trellis 提供共享 JSONL/artifact 材料加载器，先接入普通 Agent，之后供 worktree 派发复用。

不做：

- 不修改 pi-subagents 或 agent-tasks；二者按共同公开接口使用。
- 不引入 pi-worktree，不使用内建临时 isolation 生命周期。
- 不改 `.trellis/workflow.md`、默认 skills 或阶段 breadcrumb，不添加第二套执行工作流。
- 不复制整个 Claude settings/hooks 或官方 Pi extension。
- 不复制 hook 中重复的角色/流程包装，尤其不复制与 research 持久化冲突的只读包装。
- 不硬编码 Exa 服务，不通过 `tools: *` 粗暴替代工具映射。
- 不将文档中的写入/Git 限制描述成已经具备 OS 沙箱强制保证。
- 不因独立只读探索要求创建任务；任务研究代理的持久化职责不改变这一边界。

## 2. 两个计划的依赖与实施顺序

```text
S0：共同接口验证（本计划组织，worktree 计划复用）
    ↓
A1：Claude 角色基线 + Pi 工具映射 + 原文 fallback
    ↓
A2：共享任务材料加载器 + 普通 Agent 注入
    ↓
A 计划独立验收
    ↓
W0：worktree 跨目录专项预检（复用 S0，不重复全部验证）
    ↓
W1：配置、创建与绑定存储
    ↓
W2：任务材料准备、目标上下文绑定
    ↓
W3：cwd 派发、复用 A2、结果与占用管理
    ↓
W4：最小门禁与显示
    ↓
W5：恢复、清理与组合验收
```

A1 可形成一个独立、可用的交付点：即使 A2/worktree 尚未完成，代理仍可按正文自行读取上下文。完整 worktree 功能实施以 A2 验收为前置，不同时维护两套材料组装逻辑。

可并行进行只读接口研究和测试案例设计；正式实现按依赖顺序进行，不让两个计划同时修改 `extensions/trellis.ts`、agent 部署与上下文身份逻辑。

## 3. S0：共同接口与工具能力验证

使用临时目录、模拟 RPC 和必要的真实 Pi/subagent 加载测试，验证：

1. Claude frontmatter 经转换后，实际 parser 和 runner 赋予正确工具，不只是 YAML 可解析。
2. check 实际可使用 write/edit；research 实际可写入任务材料。
3. 公开 `subagents:rpc:spawn` 能指定已存在的绝对 cwd，不存在目录失败。
4. 显式 cwd 执行时，配置发现、pi-trellis 扩展加载与 cwd 分别来自哪里。
5. RPC 返回真实 agent ID，原结果读取、steering 和公开生命周期能关联该执行。
6. provider 禁用/未加载、RPC 无响应、角色缺失或冲突时能识别失败，不能假定 ping 版本代表所有能力。
7. 识别 skills/MCP/search 的实际加载与权限边界，不把 Claude 工具名当成 Pi 已注册能力。

只使用共同公开接口。测试覆盖两种 provider 的共享契约，不维护产品代码的 provider-specific 分支，不复制或导入其内部 manager。

S0 发现无法满足的契约时，报告阻碍并调整范围；不得通过魔改 agent-tasks 绕过。

## 4. A1：切换角色文档基线

### 4.1 来源与转换

继续通过隔离安装的固定版本 CLI，在临时项目生成 Claude 文档。只选择三个角色文件，不把 `.claude/` 或 `.pi/` 整目录覆盖进本项目。

转换规则：

| Claude frontmatter | Pi 目标 |
| --- | --- |
| Read / Write / Edit / Bash / Grep | read / write / edit / bash / grep |
| Glob | find；检索参数和行为按 Pi 实际工具使用 |
| Skill | Pi 的技能发现与 read 加载 SKILL.md，不虚构同名 Skill 工具 |
| mcp__* | 当前会话配置并加载的 MCP/扩展能力；不能原样写入内建工具 allowlist |

implement/check 的内建工具目标为 `read, write, edit, bash, find, grep`；research 的内建目标为 `read, write, find, grep, bash`，外部能力按共同公开的扩展选择机制授权和验证。

A1 必须明确 research 的外部能力是否可用：有配置时验证真实可调用；无配置时明确降级为本地研究并报告，不能承诺完成未执行的外部搜索。不得为通过校验增加本不需要的全工具权限。

职责与报告结构保留；Pi 工具入口、marker/fallback、任务生命周期、Git 差异范围、外部能力和真实验证状态可作明确修正。转换代码集中记录差异，上游段落漂移即失败，不扩展成另一套调度流程。

### 4.2 暂时使用已有 fallback

A1 不声称已具备完整材料 hook 注入：

- 继续保证派发第一行 `Active task: <task path>`。
- 不添加 `trellis-hook-injected` 标记。
- implement/check 按 Claude 正文读取对应 JSONL 引用与任务 artifacts。
- research 按正文解析任务、写入 research/；无任务时执行原文的询问/停止规则，不猜任务或自行建任务。

原有任务指针、状态、workflow 注入可以继续存在，但不把它们当作材料正文已经加载。

### 4.3 部署、来源与验收

- 保留现有 hash guard，不覆盖宿主用户自定义的代理文件。
- 更新 README、`docs/trellis-agent-sync.md` 的来源和再生成步骤，明确工具及正文适配范围。
- 保留原 Pi 同步的历史事实；不要将旧文件 hash 描述成新的 Claude 基线。
- 记录来源全文和转换后文件校验值；转换脚本加来源/修改声明，保留上游许可证。正文不再要求逐字一致，差异必须由集中转换代码复现。
- 更新 `tests/agent-documents.test.mjs`：从“与生成 Pi 文档逐字一致”改为“固定版本 Claude 来源 + 可复现的适配 hash + frontmatter 映射 + 必要角色行为保留”。不机械 lower-case 所有字符串。
- 用真实 parser/runner 验证工具、角色自豁免和 user-edited 部署保护。

A1 验收：职责和报告结构保留，明确正文修正可复现，实际工具支持 check 自修复/研究落盘，fallback 指令无 Pi 平台错误；未改 workflow/provider。脚本化工具验证不等于模型一定遵守指令。

## 5. A2：共享任务材料加载器与普通 Agent 注入

### 5.1 责任边界

建议实现 `lib/task-context.ts`，接口形态如下（名称可在实施时细化）：

```ts
buildTaskContext({
  executionRoot, // 明确的实际执行项目根目录
  taskDir,       // 已解析并验证的任务引用
  role,          // implement / check / research
});
```

输出包含材料文本、已加载文件清单、未加载/截断诊断及可否使用注入标记的状态。

加载器：

- 只读明确目录中的材料，不自行猜当前任务。
- 不创建 worktree，不复制任务，不调用 start/finish/archive，不选择阶段，不启动代理。
- 不硬编码源项目根，不从进程全局环境变量猜任务。
- 与未来 W2 的材料准备区分：W2 负责让文件在目标目录可用，A2 负责读取这些文件形成上下文。

### 5.2 材料与健壮性

- implement/check 分别读取对应 JSONL，再读取 PRD、存在的 design 和 implement artifacts。
- 支持文件引用和明确的目录引用，跳过无 file 字段的占位行。
- 以规范化/realpath 做路径边界检查；对宿主明确允许的 Trellis store 布局设清晰边界，不读取任意外部路径。
- 缺文件、损坏 JSONL、无有效引用、目录展开限制、二进制内容等必须返回可见诊断，不能静默宣称已加载。
- 引用与 artifacts 去重，保持可预测顺序，不重复计费同一材料。
- 支持 UTF-8 安全的单文件、artifact 与总字节预算；沿用宿主 Trellis `context_injection` 配置含义，不增加另一套互相竞争的 worktree 配置。
- 超预算内容提供路径及读取提示；research 不套用 implement/check 的清单，也不引入禁止持久化的 hook 包装。
- 文件变化后刷新材料缓存，按 executionRoot/task/role 和文件身份区分，避免跨任务复用旧内容。

### 5.3 接入普通 Agent

对已识别且实际获准执行的 Trellis Agent 调用：先解析任务与执行目录，再只修改其 prompt 添加材料。保持原用户请求及第一行任务指针，不替换 Agent 实现，不在 hook 中创建新的 RPC 代理。

不得因已有 `Active task:` 就跳过材料组装；指针与材料注入去重是两件事。也不得让用户请求里碰巧出现 marker 字符串就伪造“注入成功”。

`<!-- trellis-hook-injected -->` 只在实际注入材料且符合该角色加载协议时添加：

- 没有加载、任务解析失败或必要材料缺失时不添加，保留 child-side fallback。
- 对预算导致的部分加载保留明确的未加载清单与读取提示；若不能保证标记不会让原文跳过必要材料，则不加标记，继续走 fallback。
- 包装只携带材料、诊断和必要事实，不重复 Claude hook 的角色/流程/权限说明。
- 不改原 workflow section 或每轮 breadcrumb，不每轮重新注入整套静态材料。

### 5.4 通用上下文身份

A2 修正同项目多会话下按 root 缓存任务身份和材料的假设，明确 task/context 的解析边界；`loadContext` 等缓存纳入 context id，不依赖并发改写全局 `process.env`。

本阶段不实现 worktree 绑定存储。W2 后续把目标绑定的 task/context/executionRoot 传入同一机制，不再复制一套身份或缓存逻辑。

### 5.5 验收

- 完整注入、无注入 fallback、部分注入/超预算提示都实际到达子会话。
- 中英文 UTF-8 边界、目录引用、占位行、损坏 JSONL、越界 symlink、二进制与去重测试通过。
- 两个任务/会话同时运行不串正文、context id 或材料缓存。
- 后续修改材料不复用过期结果，重复派发不重复叠加相同注入块。
- 普通 Agent 的结果、通知和 steering 不受影响，无额外代理、无自动阶段推进。

## 6. 与 Worktree 计划的交接契约

A2 验收后向 W 计划交付：

1. 已验证的 Claude 角色基线及 Pi 工具映射。
2. 唯一共享 `buildTaskContext` 加载器及材料诊断规则。
3. 明确任务/context 身份解析和缓存隔离接口。
4. S0 的共同 RPC、扩展加载、结果/steering 测试证据。

W 计划增加的仅是：

```text
验证 worktree 绑定与占用
    ↓
提供目标 executionRoot / taskDir / role
    ↓
复用 A2 组装目标目录的任务材料
    ↓
RPC spawn(cwd = worktreePath, isolation = off)
```

worktree 派发不能注入源目录正文而让工具在目标目录执行。配置变更、目标材料缺失、绑定无效的处理属于 W；材料读取和 marker 规则属于 A2。

check 的最终验证版本必须包含它自身的修复，两个计划采用相同定义。共享加载器不自动安排下一轮 implement/check。

## 7. 代码与测试组织

建议新增/调整：

- `agents/trellis-*.md`：A1 工具声明与明确的 Pi 正文修正。
- `docs/trellis-agent-sync.md`：实际切换完成后更新来源，不预先改写历史。
- `lib/task-context.ts`：A2 的唯一材料加载实现。
- `extensions/trellis.ts`：普通 Agent 材料注入及通用上下文身份衔接。
- `tests/agent-documents.test.mjs`：Claude 正文、frontmatter 映射、来源和权限回归。
- `tests/task-context.test.*`：加载、预算、路径与缓存。
- `tests/agent-context-integration.test.*`：真实 Pi/provider 能力与 fallback。

以离线临时项目和模拟 RPC 为主，真实 Pi 加载与小规模模型行为测试单列；不使用 force-exit 掩盖生命周期泄漏。

## 8. 完成标准

| 里程碑 | 完成标准 |
| --- | --- |
| S0 | 共同公开接口与实际工具权限验证，阻碍已报告 |
| A1 | 职责/报告结构保留、工具及正文修正可复现、fallback 指令正确、来源与部署保护正确 |
| A2 | 共享材料加载与普通 Agent 注入可用，marker/失败/预算规则不伪报成功 |
| A 验收 | 不依赖 worktree 也可执行 implement → check 自修复及 research 落盘；workflow 与 provider 未改 |
| W 交接 | W 计划引用上述实现，不另造材料组装和角色文本 |

最终组合验收在 W5 完成：目标 worktree 中 implement → check 自修复 → 验证最终版本，结果和现场保留，源目录无关修改不动。

## 9. 当前实施与验证记录

用户授权实施，且选择使用本计划记录进度：本仓库没有 `.trellis`，不初始化 Trellis、不另建任务。用户允许适当修正 Claude 正文，不再把逐字一致当验收标准。

- A1：已通过 `scripts/sync-agents.mjs` 切换三个角色，记录来源/产物 hash，正文差异见同步记录；hash-guard 保留。
- A2：已新增 `lib/task-context.ts` 并接普通 Agent。每次重新加载文件，不保留材料缓存；context id 由 session/root 推导，CLI/bash 显式传递，子会话绑定派发事实。
- S0：在临时配置目录用 Pi 1.1.0 和两种实际 provider 验证 parser/runner/extension loader：目标 cwd 材料、write/edit、research 文件写入、session_start 后注册的搜索 fixture 工具可用。
- S0：真实公共 RPC 检查已通过：目标 cwd、不存在目录拒绝、真实 agent ID、原 get_subagent_result 与 steer_subagent 能操作该 ID。产品运行时代码不导入 provider 源码；可选测试显式读取本机 provider。
- 当前测试：`npm test` **26/26 通过**；严格 TypeScript noEmit 检查通过；`node scripts/sync-agents.mjs <generated-.claude/agents> --check` 通过；包内容、Markdown 链接和 `git diff --check` 通过。双 provider 真实离线测试还执行了 check 的 edit 与修复后 shell 验证，以及 research 搜索 fixture 调用。
- 可选真实 provider 验证曾因测试夹具的 host alias、父 ctx、tool wrapper、模型响应数量等错误失败，修正后重新运行通过；未改 provider 产品代码。
- 初次交付未执行真实模型行为验收；后续按用户简化要求，在临时真实 Git worktree 中用当前 mp-responses/gpt-6.1-sol-coding 和 preset provider 实际运行 implement → 手动植入错误 → check，自修复后 3/3 测试通过、源暂存/未暂存/新增内容与 index 不动。research 和截断 fallback 不在本次简化覆盖范围内，不扩大为全角色保证。证据：`/tmp/pi-trellis-smoke.gfoY0Z/report.json`。

可复现真实 provider 检查（不会使用个人模型凭据）：

```bash
node tests/provider-contracts.mjs \
  --host <Pi-1.1.0-node_modules> \
  --provider <vendored-agent-tasks-root> \
  --provider <isolated-pi-subagents-0.21.0-root>
```

Agent 适配已提交为 `4f7aead`；后续 W1–W5 首版核心已实现，详见关联计划。未修改 provider、安装到宿主或自动提交/推送。共享材料加载器被管理派发直接复用；真实 Pi/Trellis CLI 的离线完整链路验证与此前真实模型冒烟分开记录，不夸大为所有模型/插件都保证遵守职责。
