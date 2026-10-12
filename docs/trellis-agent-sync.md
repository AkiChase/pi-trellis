# Trellis agent 文档来源与 Pi 适配

## 当前基线

本包 `agents/trellis-{implement,check,research}.md` 以 **`@mindfoldhq/trellis@0.6.17`** CLI 在隔离项目生成的 **`.claude/agents/`** 为基线，经过明确的 Pi 适配。它们不是官方 Pi 文件的逐字复制，也不是与 Claude Code 完全等价的运行环境。

用户在 2026-10-12 授权修正上游文档中不正确或不适用于 Pi 的说明。保留职责、递归保护、实施/自修复/研究持久化原则和报告结构；正文差异集中在平台接口、安全边界与不完整上下文处理。

来源与产物 SHA-256 见 [`agent-baseline.json`](agent-baseline.json)，转换实现见 [`scripts/sync-agents.mjs`](../scripts/sync-agents.mjs)。转换遇到不匹配的上游段落即失败，不静默生成未审核版本。

上游：<https://github.com/mindfold-ai/Trellis>

固定 npm artifact integrity：

```text
sha512-u65OJbzR3OBzFWybX/uzBXaZdzn+71Afaknodu0GUcFIrTyp3ZegK9rHNeTX0guHow35WXkqDVuyrhn8vVzSQg==
```

当时查询 npm latest 为 0.6.17，不使用 beta。npm gitHead 未返回，因此发布版本、artifact integrity 和文件校验值为来源依据，不声称对应已核实的 commit。

## 再生成与校验

```bash
SYNC_ROOT="$(mktemp -d /tmp/pi-trellis-doc-sync.XXXXXX)"
mkdir -p "$SYNC_ROOT/runtime" "$SYNC_ROOT/project"
npm install --prefix "$SYNC_ROOT/runtime" \
  --no-audit --no-fund --ignore-scripts @mindfoldhq/trellis@0.6.17
(
  cd "$SYNC_ROOT/project"
  git init -q
  "$SYNC_ROOT/runtime/node_modules/.bin/trellis" \
    init --pi --claude --no-monorepo --yes --user pi-trellis-sync
)
node scripts/sync-agents.mjs "$SYNC_ROOT/project/.claude/agents"
node scripts/sync-agents.mjs "$SYNC_ROOT/project/.claude/agents" --check
npm test
```

只生成/转换三个 agent 文件和来源 manifest。不复制 `.claude/`、`.pi/`、官方 extension、settings、hooks、workflow 或 Trellis runtime；不升级全局 CLI。`--check` 不修改文件。

## 明确的适配差异

| 上游 Claude 文档 | 本包 Pi 适配 |
| --- | --- |
| Read/Write/Edit/Bash/Glob/Grep | read/write/edit/bash/find/grep，说明 Glob/Skill 的不同入口 |
| research 的 Skill、mcp__* | 不写入内建工具名单；显式继承已配置 extensions/skills，实际可用才做外部研究 |
| Windows/Claude hooks 不触发的举例 | 换成 Pi 的派发事实与完整注入协议，不依赖 Claude hooks |
| marker 出现即跳过读取 | 只有 pi-trellis 材料块中的完整 marker 有效；缺失/截断/错误时补读 |
| fallback 只读 listed files | 处理无任务、placeholder、directory 引用、越界/缺失/损坏材料 |
| check 只看 unstaged git diff | 同时查 staged/untracked；明确给定 Review base 才查对应 committed diff |
| check 无条件自修复 | 清晰且范围内则修复；需求/设计争议及无关修改报告主 agent |
| 只运行 lint/typecheck | 加相关 focused tests；报告真实命令、失败/未运行状态和自修复后最终版本 |
| Git/生命周期边界不齐 | 不提交/合并/换分支/清理；不运行 task start/finish/archive 或 session recording |
| research 总是先查当前指针 | 派发第一行任务优先，无任务返回主 agent，不猜路径或自行建任务 |
| research 禁止任意 Git 操作 | 允许只读 status/diff/log，禁止修改仓库 |
| research 不得比较/批评实现 | 被明确要求时可以记录证据、风险和 trade-offs，不实施修改 |

三个角色都使用 `isolation: off`，避免 provider 自动创建不含当前未提交任务材料的临时工作树。这里没有实现任务级 worktree 管理；未来目录派发使用 worktree 计划。

**工具限制不是 shell 沙箱。** `extensions: true` 意味着 provider 继承已配置扩展，内建工具白名单不会自动约束所有 extension/MCP 工具。本包不硬编码搜索服务、自动安装 MCP 或伪造外部研究成果；没有外部工具时如实报告只完成本地研究。调用者仍须审查所加载的扩展与技能。

## 材料注入与上下文身份

`lib/task-context.ts` 是唯一材料加载器：明确接收执行根目录、任务路径、角色，读取对应 JSONL 和 PRD/design/implement；research 不套用 implement/check JSONL。支持显式目录引用、去重、UTF-8 安全字节预算和可见诊断。

预算复用 `.trellis/config.yaml` 的 `context_injection.max_file_bytes/max_artifact_bytes/max_total_bytes`；0 为无限制，缺省为 32768/65536/131072 字节。诊断/路径索引单列，不隐藏截断或省略。目录/JSONL/任务记录大小另有防失控限制。

普通 Agent hook 只修改允许执行的派发 prompt，不覆盖工具、不暗中 RPC spawn、不调度阶段。只在所需材料完整加载时加 marker；缺少任务/材料或预算截断则没有 marker，子代理 fallback 可读取完整材料。每次派发重新读取，无跨任务或 same-mtime 材料缓存。

每个 session/root 单独推导 context id；调用者提供 `TRELLIS_CONTEXT_ID` 时可显式共享。子代理通过第一行任务及紧随的 context/role 事实绑定任务，CLI 与 bash 使用显式 context id，不并发修改共享进程环境变量。原 workflow section/breadcrumb 不另造阶段流程。

## 部署与升级

`deployAgents()` 继续按 hash guard 更新宿主 `.pi/agents/`：未修改旧副本可升级，用户修改过的文件保留。升级不会改写其他项目或已打开的 agent；需要重新加载/重启并检查部署文件。

## 同步历史

本次之前曾从同版本 CLI 生成的 `.pi/agents/` 逐字同步，纠正本包初版 check/research 只读偏离。这是已完成的历史，不是当前基线：

| 旧官方 Pi 文件 | SHA-256 |
| --- | --- |
| implement | `75e25a3b2d09dbcd49e37cdac4dc28453f341ab4eab0d0074ac84500e23e0cd2` |
| check | `f6df0b1ff2ae5dc9634e3a4e327de63d20be8d77ab3f54c374c2a3acf1450d3f` |
| research | `ef77555f4c2c4ade36f1c23a076b6f4bb9d180ff24a2f00d7cdc2f8fd5af0b0a` |

## 许可证

上游生成文档及其适配保留 `AGPL-3.0-only`，修改日期/范围在本记录与转换代码中标明。全文见 [`licenses/trellis-AGPL-3.0.txt`](../licenses/trellis-AGPL-3.0.txt)。原有及新写运行时代码使用根 MIT LICENSE；本包元数据 `(MIT AND AGPL-3.0-only)` 表达同时含两类材料，不将上游文档重新许可为 MIT。

这不是对所有组合/分发场景的法律意见。发布须附来源、修改记录与许可证，不能声称完整包无 Trellis 材料或 MIT-only。

## 测试的边界

`npm test` 覆盖来源 hash、必要角色行为、材料/路径/预算、普通 Agent 注入、session 隔离和 hash-guard。`tests/provider-contracts.mjs` 可显式指定本机 Pi host 与 provider，在隔离配置目录以实际 parser/runner/loader 和脚本化离线模型响应检查工具与 cwd；不会使用个人凭据或调用在线模型。

这些检查验证运行机制，不证明语言模型一定遵守每条职责，更不替代未来 worktree 隔离与真实模型的行为验收。验收证据见 [Agent 适配计划](plans/claude-agent-adaptation.md)。
