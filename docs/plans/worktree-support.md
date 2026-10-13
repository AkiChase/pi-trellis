# pi-trellis 任务级 Worktree 支持实施计划

状态：W1–W5 首版核心实现与离线集成验收已完成；未提交、未部署到日常环境。保留下面的设计计划及分阶段记录，限制见当前交付范围。

前置计划：[Claude Code 版 Agent 适配](claude-agent-adaptation.md)。A1/A2 和 S0 离线验证已完成；简化真实模型冒烟已验证 trellis-implement → trellis-check 在同一个真实 Git worktree 中实现、自修复并通过测试，源 staged/unstaged/untracked 内容与 index 不动。research/截断 fallback 和完整绑定生命周期不在该冒烟覆盖范围内。

本文整合前面的实施方案，并按最新决定收缩工作流适配范围：**不修改 Trellis 的默认 workflow，不注入第二套执行流程，只增加工作树管理和目录派发能力，通过工具说明与派发校验衔接现有流程。**任务材料注入属于前置计划的共享能力，不等于另一套工作流。

## 当前交付范围：首版核心闭环

- `trellis_worktree`：create/bind/status/prepare/stop/recover/remove。create/bind 默认 preview，确认才写；创建先 unprepared，prepare 验证后 ready。
- `prepare`：源任务必须已 in_progress，只复制当前 task artifacts 与 JSONL 引用的 task-local 文件；外部规范/代码保持固定基线，差异必须明确处理。target task.json 的 branch 改为绑定分支，不修改 source task。目标 CLI start/current 绑定与校验独立 context，预览披露 after_start hooks。
- `trellis_dispatch`：ready/身份/任务状态/工具配置/占用校验后，以公开 cwd RPC 派发，复用 A2 加载器。超预算仍可使用带诊断的 child fallback；结构性材料错误拒绝执行。返回原 agent ID，结果/steering/通知由 provider 负责。
- W4：有绑定的普通 Agent 启动前被阻止，不偷偷 spawn；原 workflow 和阶段定义不改。状态只增加 worktree 事实，不自动推进阶段。
- W5：执行记录持久化，早到结束事件能关联；timeout/shutdown 保守标 unknown，阻止盲目重派。显式 recover 只释放死进程执行，不猜 stale lock。check 最终文件快照改变后标 stale，completed 不等于验收通过。
- 清理默认 preview，拒绝当前目录、脏代码/未保存 task artifacts、活跃/unknown 执行与未保存提交；明确 integratedInto 后普通 Git remove，无force/branch删除，失效目标可显式解除绑定。

首版限制与边界：

- 只绑定安全完整任务 slug、branch-backed Git worktree，不绑定 detached。
- 派发必须来自真实 source-root host/cwd，且 adapter 在 source/user settings 中持久配置（不能只有主会话一次性 -e），确保 child 重新加载上下文；这是共同 provider 角色发现的可验证边界，不改 provider 来绕过。管理调用可从可信 bound target 回源。
- 自定义代理保留，但派发要求明确 isolation: off、extensions: true 与角色必需 tools。更灵活的 selector 组合不在首版支持内。
- source/target runtime 和管理目录须忽略，runtime/目标任务store不得symlink源目录；不自动修改 ignore/安装依赖/执行额外初始化 hooks。
- 不声称第三方入口全部可拦截，也不声称 worktree 是 shell/OS 沙箱；生命周期事件丢失或进程未退出时优先保留 unknown，不保证强制杀死第三方不响应取消的代码。

验证：`npm test` **57/57 通过**，严格 TypeScript noEmit、agent 固定来源再生成、包内容和 Markdown 链接检查通过。实际 Pi/Trellis 集成 driver 保留在 `/tmp/pi-trellis-integrated-smoke.mjs`；临时夹具测试不读取个人配置或联网调用模型。

验证证据：Git临时仓库回归、严格 TypeScript、真实 Pi1.1 loader/tools + 实际 Trellis0.6.17 CLI + create→prepare→implement→check→status→dirty-remove拒绝，通过 `/tmp/pi-trellis-integrated-smoke.mjs`。provider执行使用离线scripted响应；前置真实模型implement/check的简化冒烟已通过，不重复扩大在线矩阵。产品不修改provider、不部署宿主、不初始化本仓库.trellis、不自动提交/推送。

## 0. 前置依赖与两个计划的执行顺序

```text
S0：共同接口验证
    ↓
A1：Claude 角色正文 + Pi 工具 frontmatter 映射 + 原文 fallback
    ↓
A2：共享任务材料加载器 + 普通 Agent 注入
    ↓
Agent 适配计划独立验收
    ↓
W0：worktree 跨目录专项预检
    ↓
W1：配置、创建和绑定存储
    ↓
W2：目标材料准备与上下文绑定
    ↓
W3：cwd 派发并复用 A2 加载器
    ↓
W4：最小门禁和显示
    ↓
W5：恢复、安全清理及组合验收
```

S0/A1/A2 的范围及验收由 [Agent 适配计划](claude-agent-adaptation.md) 定义。本计划复用它们的实现与测试证据，不重新实现角色文本转换、JSONL/artifact 加载或普通 Agent 的材料注入。

A1 是可独立交付的节点；完整 worktree 实施以 A2 验收为前置。两个计划可以并行只读研究，不同时修改共享运行时代码。W0 只补与目标目录相关的契约验证；如果发现无法通过共同公开接口实现，报告阻碍，不魔改 agent-tasks。

## 1. 目标与非目标

### 1.1 目标

- 主 agent 通过 pi-trellis 创建、准备或绑定任务 worktree。
- 默认创建到源项目 `.worktree/<完整任务 slug>/`。
- 通过 `.pi/pi-trellis.json` 修改新建工作树的管理目录。
- 持久化任务、源项目、工作树、分支、基准提交和执行上下文的绑定。
- implement、check 和后续修复使用同一个任务 worktree。
- worktree 不存在、未准备完成或身份不匹配时，拒绝派发；不得退回源目录运行。
- 子代理完成、失败、取消或 Pi 重启后，保留工作树和代码现场。
- 继续使用 Trellis 的阶段、规划、验收和收尾流程。

### 1.2 非目标

- 不修改 pi-subagents 或 agent-tasks；二者按共同公开接口使用，不维护两套适配分支。
- 不引入 pi-worktree，也不要求捆绑 agent-tasks。
- 不使用 subagent 内建的临时 `isolation: "worktree"` 生命周期。
- 不新增 `onWorktreeReady` 或依赖内部 manager 实现。
- 不切换主 Pi 会话的 cwd。
- 不修改 `.trellis/workflow.md`、Trellis 生成的 skills 或阶段定义。
- 不复制、维护另一份完整 Trellis workflow。
- 不自动决定后续阶段，不自动启动 check 或在多个代理间编排修复循环；check 在自身执行中直接修复任务范围内的问题并重新验证，属于 Trellis 默认角色行为，不受此限制。
- 不自动提交、合并、推送、删除分支或强制删除目录。
- 不复制源目录无关的未提交业务代码、凭据或环境文件。
- 不把只读探索、研究、普通审阅放进任务或 worktree 门禁。
- 不宣称 worktree 是操作系统级安全沙箱。

## 2. 职责与原有流程

| 组件 | 职责 |
| --- | --- |
| Trellis | 定义规划、implement、check、规范更新和收尾要求 |
| Agent 适配计划 | Claude 角色基线、Pi 工具映射、唯一共享任务材料加载器与普通 Agent 注入 |
| Worktree 支持计划 | 创建、准备、绑定、校验工作树，复用共享加载器并派发到已有目录 |
| pi-subagents / agent-tasks | 提供公开 RPC、子代理执行、结果读取、通知和 steering 能力 |
| 主 agent | 按 Trellis workflow 选择下一步，调用管理和派发工具 |
| 子 agent | 在分配目录中履行已有角色职责，不管理任务生命周期 |

预期使用流程：

```text
只读探索 → 用户批准任务 → 完成规划与实施审批
                              ↓
             主 agent 创建或绑定任务 worktree
                              ↓
                 材料与上下文准备完成 → ready
                              ↓
              主 agent 派发 trellis-implement
                              ↓
               读取结果、检查实际修改，目录保留
                              ↓
           主 agent 派发 trellis-check 到同一目录
                              ↓
         按原 workflow 决定修复、规范更新与收尾
```

工作树属于任务，不属于某一次子代理调用。第一版不允许同一绑定目录中同时运行多个受管理任务代理；不同任务可以在各自工作树中并行。

## 3. 最小工作流适配

### 3.1 保持现有工作流注入

保留现有 `trellis-workflow` section 和从 `workflow.md` 提取的阶段 breadcrumb。不得为 worktree 支持改写这些内容，不新增完整的 `pi-trellis-execution` 工作流 section。

不将工作树准备状态映射成新的 Trellis 阶段。任务状态和工作树状态分别显示；`in_progress` 不等于工作树已准备完成，代理结束不等于验收通过。

### 3.2 仅在工具上说明调用关系

新工具通过 description、参数说明和简短的 `promptGuidelines` 告知用法，例如：

> 任务的 worktree 隔离执行使用 trellis_worktree 准备目录，使用 trellis_dispatch 派发 trellis-implement / trellis-check；阶段顺序仍遵循 Trellis workflow。只读探索和研究不要求创建 worktree。

不在每轮重复注入相同执行说明，不用一大段覆盖性规则要求模型忽略默认 workflow 或 skills。

### 3.3 普通 Agent 误调用的门禁

对于已绑定隔离工作树的任务，或明确进入隔离实现路径的请求，检查直接通过普通 `Agent` 派发 implement/check 的调用。

- 缺少可用绑定：阻止执行，说明尚未启动任何子代理，提示先创建或绑定工作树。
- 已有绑定：阻止执行，说明普通 `Agent` 无法指定该目录，提示使用 `trellis_dispatch` 派发同一角色。
- 普通研究、未进入隔离路径的调用和其他代理不受这个门禁影响。

worktree 派发门禁 **只校验和阻止，不在内部启动 RPC**。不能先启动子代理，再把原调用标记为失败，避免模型重试造成重复执行。前置 A2 对允许继续执行的普通 Agent 调用可以注入任务材料；这和门禁不暗中创建代理是不同职责，两者必须有明确顺序，不能给已阻止调用再做派发。

不覆盖或重新注册同名 `Agent` 工具。Pi 当前公开的 `tool_call` hook 支持修改参数和阻止执行，不支持提供替代执行结果；普通 `Agent` 又没有 `cwd` 参数，因此不假装可以透明重定向。

第一版不支持通过 SubagentWorkflow、定时任务等其他入口编排隔离任务，不声称可以拦截所有第三方调用路径。

### 3.4 Claude 角色基线、执行事实与共享材料

以 [Agent 适配计划](claude-agent-adaptation.md) 交付的固定版本 Trellis Claude Code 角色及明确 Pi 适配为基线，初始来源为 0.6.17。工具和正文中的必要修正已记录；保留职责、报告结构和 fallback，不在本计划再次改写角色。

check 可以在任务范围内自修复；research 可以将发现写入当前任务的 `research/`，不是完全只读代理。worktree 专属内容只增加必要执行事实：

```text
Active task: .trellis/tasks/<task>
Execution directory: <absolute worktree path>
Review base: <base commit>
```

同时复用 A2 的 `buildTaskContext({ executionRoot, taskDir, role })`，从**实际目标 worktree**读取 JSONL 引用与任务 artifacts。不能注入源目录正文而让工具在另一个版本的目标目录执行；不额外注入主会话调度流程。

目标任务指针与上下文绑定在派发前准备好；材料加载、字节预算、去重、错误诊断和 marker 规则统一由 A2 提供，不在 worktree 模块另写一份。

只有符合加载协议的实际材料注入才添加 `<!-- trellis-hook-injected -->`。必要材料缺失或不能保证完整时，不伪造已注入标记；按共享加载器规则提供诊断/fallback。准备 gate 失败则拒绝派发，不通过 fallback 绕过目录或任务准备校验。不得依赖“没有 UI”判断它是不是子代理。

用户修改过的 `.pi/agents/` 文件继续遵循现有 hash guard，不强制覆盖。若自定义定义的 isolation 或扩展加载配置与本功能冲突，派发明确报错，不能偷偷改配置。

## 4. 配置与路径规则

配置文件：`.pi/pi-trellis.json`。

```json
{
  "worktree": {
    "directory": ".worktree"
  }
}
```

- 无文件或无该字段时使用默认 `.worktree`。
- 相对路径相对于创建绑定的源项目根目录，不相对于 shell cwd。
- 支持原生平台绝对路径；不进行 shell 环境变量展开。
- 无效 JSON、非字符串、空目录字段、NUL 等无效输入使创建操作失败；其他只读功能不受阻断。
- 修改配置只影响新建，不迁移或重新计算既有绑定。
- 派发始终使用绑定中的绝对路径。
- 从任务 worktree 调用管理操作时先识别源绑定，禁止自动创建 `.worktree/task-a/.worktree/task-b`。

目标目录默认以完整任务 slug 命名，分支默认建议为 `trellis/<完整任务 slug>`，允许创建时明确指定分支。

路径检查：

- 目标不得等于源目录、源目录的祖先或其他已占用工作树。
- 解析符号链接和实际路径后再判断身份与冲突。
- 任务 slug 必须是安全的单个目录名。
- 已存在路径不得覆盖或强制删除；已绑定目录校验后复用，其他情况报冲突。
- 项目内部管理目录必须被源仓库忽略；默认规则为 `/.worktree/`。
- 创建前检查 Git ignore，未忽略时提示修复，不静默修改 `.gitignore`。
- 检查本项目与相关 Trellis 更新、搜索路径是否会误扫描内部工作树；发现兼容问题单独报告，不暗中修改上游。

配置可以提交共享。本机绝对路径、运行记录和目标标识保存在忽略的 runtime 中，不写入共享配置。

## 5. 工具接口

工具名称为本计划建议，实施时保持两类核心入口，不扩大成新的工作流引擎。

### 5.1 trellis_worktree

```ts
trellis_worktree({
  action: "create",
  task: ".trellis/tasks/10-12-example",
  base: "main",
  branch: "trellis/10-12-example",
});
```

支持：

| action | 行为 |
| --- | --- |
| create | 创建、准备、绑定；成功后标记 ready |
| bind | 绑定用户已创建的工作树，执行相同身份和材料校验 |
| status | 只读查看绑定、Git 状态和已知执行实例 |
| remove | 明确确认后的安全清理；失效绑定可显式解除 |

默认取当前活跃任务；没有明确任务则创建失败，不猜测、不自动创建 Trellis 任务。

创建前明确展示源项目、任务、目标路径、分支和基准提交完整 SHA。基准引用先解析为固定提交，再执行创建；默认可取源 HEAD，但明确告知不会带入 staged、unstaged 或 untracked 业务修改。

create/bind 是写操作，须遵循用户实施授权。工具提供便利，不将“发现可以改进”解释为获准实施。

### 5.2 trellis_dispatch

```ts
trellis_dispatch({
  agent: "trellis-implement",
  prompt: "按实施计划完成当前任务",
});
```

从任务绑定读取 cwd，不向模型暴露任意目录参数。第一版支持三个 Trellis 角色；独立只读探索无需绑定，可在主会话或其他只读代理中进行。官方 trellis-research 是任务研究代理，会持久化 research 材料；只有已经存在对应任务并授权这些材料写入时才调用它，不因探索自动建任务。

内部调用前先验证绑定，然后从目标目录复用 A2 组装材料，保留任务第一行、原始请求和 execution/review-base 事实。下面 `prompt` 表示已经组装的派发文本，不是未经处理的用户字符串。

内部调用共同公开 RPC：

```ts
pi.events.emit("subagents:rpc:spawn", {
  requestId,
  type: "trellis-implement",
  prompt,
  options: {
    cwd: binding.worktreePath,
    isolation: "off",
  },
});
```

`isolation: "off"` 只禁止插件再创建一层临时工作树，不取消已有目录隔离。显式 cwd 的配置发现与执行目录行为须用真实提供者集成测试验证，不能靠复制整个 `.pi/` 保证加载。

派发前校验：

1. 子代理服务当前可用，公开 RPC 返回正常。
2. 绑定为 ready，任务和所需材料完整。
3. 目录存在且是同一仓库的注册 Git worktree，而非普通目录。
4. 源/目标绑定标识、分支与当前目录身份一致。
5. 当前没有占用该绑定目录的受管理任务代理。
6. 角色配置不强制临时 isolation，不禁用必要上下文能力。
7. implement 符合原 Trellis 实施前提；check 不与未完成的 implement 并发。

任一失败拒绝派发，不回退源目录。后端已有 cwd 存在检查及排队后再次检查，pi-trellis 仍负责工作树身份校验。对外部 Git 手动变更的竞争不声称有原子保证。

### 5.3 复用结果和控制入口

移除前一版建议的独立 `trellis_execution` 工具。

- 派发返回真实 agent ID、执行目录和绑定标识。
- 结果读取、等待和 steering 优先复用 `get_subagent_result`、`steer_subagent` 等现有能力。
- 完成通知由子代理插件负责，不另发一套会触发重复模型回合的通知。
- 只有实际向调用方交付结果时才消费通知，不提前吞掉结果。
- 通过公开生命周期事件维护最小绑定占用和历史记录，不创建自动阶段推进器。
- 停止可复用已有公开 stop RPC；如需用户入口，放在管理接口中，不新增完整执行控制面。

## 6. 创建、准备和绑定事务

按以下顺序执行：

1. 校验任务、配置、Git 仓库、ignore 和固定基准提交。
2. 获取任务创建锁，防止重复创建或绑定。
3. 原子写入 preparing 记录。
4. argv 方式执行 `git worktree add`，不拼接 shell。
5. 验证实际目录、注册身份、分支和提交。
6. 准备选定任务材料。
7. 在目标目录通过 Trellis CLI 绑定执行上下文。
8. 校验 CLI 实际返回的任务、状态和指针。
9. 复用 A2 的材料解析/验证结果确认所需上下文可读取；不在准备模块重新实现 JSONL 解析。
10. 全部成功后才原子标记 ready。

材料范围：

- 当前任务记录与存在的 PRD、design、implement。
- implement/check JSONL 清单及其中明确引用的任务内研究资料。
- 任务材料只复制所需范围；路径穿越、越界符号链接和冲突内容均拒绝。
- 规范与代码使用固定基准提交中的版本；需要但缺失或存在相关未提交差异时报告，不偷偷覆盖。
- 不复制其他任务、整个 runtime、整个 `.pi/`、环境文件、凭据或 node_modules。
- 不自动把目标修改同步回源任务目录；重新同步必须是明确操作且校验冲突。

材料准备与加载明确分工：W2 负责将已批准的选定任务材料放到目标目录并处理复制冲突；A2 负责解析清单、读取文件、预算和诊断。W2 复用 A2 的引用解析/验证接口，不维护第二套清单或材料组装器。准备完成并不等于正文已经注入；每次派发按当时目标文件状态重新加载。

第一版不自动安装依赖或执行自定义初始化 hooks。主 agent 可在目标目录运行获准的准备操作后重试校验。

`task.py start` 本身会更新状态、记录分支并可能运行项目 hooks，不是纯指针写入。准备逻辑要先满足原 workflow 的授权和状态前提，明确这些副作用，再检查结果；不自动传 `--allow-empty-context` 绕过校验。

## 7. 持久状态与上下文隔离

| 数据 | 位置 |
| --- | --- |
| 共享配置 | `.pi/pi-trellis.json` |
| 本机任务绑定与最小执行记录 | 源项目 `.trellis/.runtime/pi-trellis/` |
| 目标绑定标识与执行指针 | 目标工作树的忽略 runtime 目录 |

记录至少包含 version、bindingId、taskDir、sourceRoot、worktreePath、repositoryIdentity、branch、baseCommit、contextId、preparationState、createdAt、lastError。

源记录与目标标识相互校验，不能仅信任目标目录自带的 marker。写入使用原子发布和锁；重试不得覆盖用户代码。

上下文要求：

- 主会话继续拥有源任务生命周期和活跃指针。
- 每个任务工作树使用独立执行 context id，相关子代理共享该任务执行上下文。
- 复用 A2 已验证的任务/context 身份解析与缓存边界；通用的按 root 缓存缺陷在 A2 修复，不在两个计划重复修改。
- W2 只增加源/目标绑定的身份解析，将明确的 executionRoot、taskDir 和 contextId 接入同一机制。
- `loadContext` 和材料缓存纳入 context id/任务/执行目录，Trellis shell 调用显式携带正确 context id，不依赖并发改写一个进程级环境变量。
- 保持稳定提示内容的缓存策略，不把每轮工作树状态塞入系统提示前缀。
- 代理部署保持现有用户修改保护；避免准备目录时产生无关文件和后续误提交。

## 8. 实现、检查和最小状态展示

- implement 在目标目录按现有角色定义实现，不管理任务生命周期。
- 主 agent 读取结果并核查实际 diff，再按原 workflow 派发 check；插件不自动派发下一阶段。
- check 使用相同目录与明确 review base，检查已提交差异、staged/unstaged 修改及新增文件，不能将空 `git diff` 视作没有实现。
- check 按官方定义直接修复任务范围内、解决方式明确的问题，并在修复后重跑相关验证；不能自行派发 implement/check。需求或设计变更、超出范围或无法修复的问题报告给主 agent，由主 agent 决定是否重新规划或派发 implement。
- check 报告已修复内容、未修复问题及实际验证结果；验证记录对应它完成自修复并重新验证后的最终版本，不是启动前的快照。后续实现或手动变更后，不继续显示旧结果为当前验证通过。
- 角色定义和报告格式直接使用 A1 验收的 Claude 正文，本计划不再修改正文；目录/基准事实与 A2 材料放在派发上下文，不改成新的调度规则。
- 原有状态显示可增加简短 worktree 名或路径；详细状态通过 `trellis_worktree(status)` 查询。
- 不改写原 workflow breadcrumb，不每轮发送“下一步必须做什么”的新执行状态消息。

执行记录只用于身份、占用、恢复与结果定位：queued/running/completed/failed/stopped/unknown。completed 表示代理结束，不自动推进 Trellis 状态或判断验收成功。

RPC 回复和生命周期事件可能有时序交错：先订阅、使用唯一 requestId，处理早到事件和回复超时。无回复不等于未启动；状态不明时禁止盲目重派，避免重复写入。

## 9. 失败、恢复与安全清理

| 情况 | 行为 |
| --- | --- |
| 创建失败 | 报错，不派发 |
| 创建成功但准备失败 | 保留目录，记录 error，允许显式重试 |
| 派发前目录缺失或身份不符 | 拒绝 |
| 排队期间目录被删除 | 由后端再次校验后失败 |
| 代理失败或取消 | 代码和目录保留 |
| Pi 重启 | 恢复绑定；不能确认的旧执行标记 unknown |
| 手动换分支、移动目录或改 marker | 报告不一致，不自动修复 |
| 同一任务再次 create | 校验后复用或明确冲突，不另建重复目录 |

清理需明确确认，并检查：

- 无运行中或状态不明的关联执行。
- 不是源目录或当前 Pi 工作目录，绑定身份仍匹配。
- 无 staged、unstaged、untracked 修改；忽略文件删除风险单独展示。
- 工作树独有提交已保存在用户认可的目标引用中；未集成产物默认拒绝清理。
- 确认后重新校验，再使用普通 `git worktree remove`。
- 不 force-remove、不自动删除分支、不用目录递归删除替代 Git 操作。
- 目标已手动移除时，可显式解除 stale 绑定，不将其当成正常完成。

worktree 只隔离工作目录，不限制全部绝对路径访问。直接工具路径检查与角色指令是防误操作，不等同完整 shell 沙箱；不为此引入全项目命令过滤器。

## 10. 建议代码组织

```text
extensions/
  trellis.ts                 # 注册、现有上下文、显示和最小 Agent 门禁
lib/
  config.ts                  # 配置与路径解析
  worktree.ts                # Git 创建、身份校验和安全清理
  bindings.ts                # 绑定记录、锁和原子写入
  preparation.ts             # 目标材料复制与上下文绑定；复用共享清单解析
  task-context.ts           # 由前置 A2 交付，唯一共享材料加载器
  subagent-rpc.ts            # 共同公开 RPC 客户端
  executions.ts              # 最小占用、事件关联与恢复，不调度阶段
agents/
  trellis-implement.md
  trellis-check.md
  trellis-research.md
tests/
  config.test.*
  worktree.test.*
  bindings.test.*
  preparation.test.*
  dispatch.test.*
  workflow-compat.test.*
  context-isolation.test.*
  lifecycle.test.*
```

工具为核心入口。若提供便利脚本，只薄包装同一创建/配置/绑定实现，不能维护第二套逻辑，也不向项目 `.trellis/scripts/` 复制上游替代脚本。

不导入 subagent 内部源码，不 fork worktree 后端。新增运行时代码自行实现，通过 Git、Trellis CLI 和公开 RPC 集成。官方生成的 agent 文档是明确标注来源的例外，保留 Trellis 0.6.17 的上游许可与校验记录，不再宣称完整包没有上游材料或仅含 MIT 内容。

## 11. 分阶段实施

先完成 S0 → A1 → A2 和 Agent 计划独立验收，再执行下表。普通 Agent 材料注入、角色来源/工具映射和通用缓存身份测试引用前置成果，只补跨工作树的集成验收。

| 阶段 | 内容 | 完成条件 |
| --- | --- | --- |
| W0 | 复用 S0，补目标 cwd 与基线衔接预检 | 已验证的 Claude 角色在已有目标目录可加载/执行；真实 ID 可用原结果与 steering 工具操作；无源码魔改 |
| W1 | 配置、路径、安全创建和绑定存储 | 默认/自定义目录、重复创建和冲突测试通过 |
| W2 | 目标材料准备与 Trellis 上下文绑定 | preparing/ready 事务、复制冲突处理；接入 A2 身份和引用验证，无第二套加载器 |
| W3 | cwd 派发、共享材料注入、结果复用与占用 | 缺绑定/目录/冲突配置绝不派发；正文来自目标目录，复用 A2 marker 与预算规则 |
| W4 | 最小工作流兼容与展示 | workflow 不变，工具说明/门禁不暗中 spawn，同目录 check 可自修复 |
| W5 | 恢复、安全清理、安装文档及组合验收 | 失败保留、重启恢复、脏目录拒删；implement → check 自修复 → 验证最终版本闭环通过 |

W0 如发现共同公开接口无法满足必要契约，报告阻碍并调整范围，不通过修改 agent-tasks 绕过。S0 的结果可以作为前置证据，但不能拿同目录测试替代 W0/W5 的真实跨目录验证。

## 12. 测试与验收

### 12.1 配置、Git 与准备

- 默认 `.worktree`、相对/绝对自定义目录、坏配置、修改后旧绑定不移动。
- 符号链接、路径越界、占用分支、目录冲突、未忽略目录和套娃创建。
- 源目录含 staged/unstaged/untracked 修改，创建后源内容与 index 不变。
- 只带当前任务所需材料，不带其他任务、无关代码和凭据。
- 任务 JSON 损坏、材料缺失、上下文 gate 失败、中途取消均不能进入 ready。
- 绑定已存在时冲突不覆盖，准备失败可恢复但不会重建丢失现场。

### 12.2 派发、上下文与结果

- provider 未加载、RPC 超时、未知角色、冲突 isolation/扩展配置。
- 普通目录不能冒充工作树；缺失目录不派发，不降级到源项目。
- 两任务并行时 cwd、context id、事件和结果不串。
- 共享加载器从目标 worktree 读取材料；源/目标文件不同也不混用源正文，后续修改按 A2 缓存策略刷新。
- marker、UTF-8 截断、缺失/省略诊断复用 A2，不能因已有目标指针就伪造完整注入。
- 同一工作树 implement/check 不并发，check 看见实际未提交及新增文件。
- check 能直接修复范围内问题并重跑验证，无需每次重新派发 implement；报告及验证版本覆盖自修复后的修改。
- trellis-research 可以写入当前任务 research/，不得修改业务代码或其他任务材料；独立只读探索不触发任务创建。
- 早到事件、排队、取消、旧会话迟到事件、无回复但可能已启动。
- 原 get_subagent_result/steering 可操作真实 ID，无重复通知或提前消费。
- 后续修改使旧验证结果失效，不把 completed 解释成验收成功。

### 12.3 工作流兼容重点

- `.trellis/workflow.md` 及 Trellis skills 内容、hash 不变。
- 原 `trellis-workflow` section 与 breadcrumb 不被新增流程替换。
- 无额外完整工作流 section，无每轮阶段推进提示。
- 原文要求 Agent 派发时，误调用在启动前被阻止并给出最小纠正信息。
- 被阻止的 Agent 调用没有偷偷产生 RPC 子代理，重试不重复执行。
- 原工具不被同名覆盖，普通研究与非隔离调用不被全局拦截。
- 用户修改过的代理定义继续保留；不靠覆写角色文件保证门禁。
- 包内 agent 以固定版本 Claude 文档为来源，工具及必要正文适配按 A1 集中转换/hash 验证；不要求官方 Pi/Claude 整份逐字一致，也不恢复旧的只读角色限制。
- 主 agent 自主决定 implement/check/修复，插件没有自动阶段推进。

### 12.4 恢复与回归

- 失败、取消、重启后工作树和代码仍在，状态不明不虚报成功。
- 清理拒绝运行中、unknown、脏目录、当前目录和未保存产物。
- 现有上下文注入、hash-guard 代理部署、skill bridge 和只读探索不回归。
- 测试先用临时 Git 仓库和模拟 RPC，再做真实 Pi 加载及两种 provider 的小规模集成。
- 不联网调用模型的测试保持离线；真实模型测试单列。
- 不用 force-exit 掩盖监听器、线程或进程泄漏。

最终验收：主 agent 能为任务准备 `.worktree/<任务>`，通过公开 cwd 接口派发 implement，再按原 Trellis workflow 派发同目录 check；失败现场保留，源目录无关修改不动，默认 workflow 不变，无需修改或捆绑 subagent 插件。

## 13. 相对前一版的修订摘要

| 前一版方案 | 当前方案 |
| --- | --- |
| 完整 pi-trellis 执行规则 section | 仅新工具简短用法说明 |
| 每轮 breadcrumb 增加阶段推进指令 | 保留原 breadcrumb，管理工具查询状态 |
| 子代理角色化执行流程注入 | worktree 仅补任务/目录/基准事实；复用 A2 任务材料，不注入另一套角色流程 |
| 官方 Pi 角色文档为最终基线 | 前置 A1 切换到 Claude 正文 + 确定的 Pi tools frontmatter 映射 |
| worktree 单独开发上下文组装 | 前置 A2 实现唯一共享加载器；W2 准备文件，W3 调用加载器 |
| 两个计划同时修改共享代码 | S0 → A1 → A2 验收 → W0–W5，分别交付与验收 |
| 独立 trellis_execution 控制入口 | 优先复用原结果、等待、steering 和通知能力 |
| 执行层安排检查/修复 | 主 agent 按原 workflow 决定下一步 |
| 普通 Agent 的透明重定向设想 | 明确不接管；门禁只阻止并纠正，派发由新工具执行 |

截至本次同步，前置 agent 适配已提交为 `4f7aead`。简化真实角色/worktree 冒烟证据保留在 `/tmp/pi-trellis-smoke.gfoY0Z/`（model mp-responses/gpt-6.1-sol-coding；只修改 clamp 代码，3/3 tests）。首轮 generic fallback 不作为角色验收证据，已修正临时 host cwd 和 no-fallback 后重跑通过；不修改 provider。

W1–W5 首版核心已按用户“连续逐步执行，只有需决策时再问”的授权完成。实现/测试记录见当前交付范围；历史W1曾为unprepared-only，现在prepare/RPC/占用/stop/recover/remove已接通。未提交Git或安装到日常环境。

正常代码交付之后，提交/推送和实际部署仍由用户决定。无需再逐阶段询问，但不会把实现授权扩展为发布或强制清理授权。
