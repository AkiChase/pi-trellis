# S3 独立审查（2026-10-15）

## 结论

S3 角色、技能、政策、文档、资源来源及对应离线合同检查通过；已完成 2 类局部一致性修正和 1 项新增静态回归。最终 focused **95/95，自然 exit 0**。独立全量本次执行 **485/485，自然 exit 0**，但并行 viewer 的 component/test 在运行期间发生变化，不能将本次全量声称为整个共享 checkout 最终冻结版本的验收。S3 inputs 未漂移；主仍需复核实际 diff、hash 和 task 最终验收门禁。

Optional provider probe 只做完整源码/消费链静态审查与 `node --check`，**行为 NOT_RUN**；syntax 成功不证明 probe 可执行、真实 provider 正确或真实 agent 实际完整读取。无 commit、生命周期、部署/安装/reload、真实项目 worktree、在线请求或真实终端行为。

## 范围及完整阅读

执行/source 根：`/Users/jyxc-dz-0101322/tools/pi-trellis`，分支 main。Review base `176619d`：实际 `git diff 176619d HEAD` 为空；S3 全部为工作目录候选，另有并行项目 manifest、viewer/其任务等变更。已检查 staged/unstaged/untracked 清单，staged 空；未把并行变更纳入本任务或回退它们。

完整读本任务 `prd.md`、`design.md`、`implement.md`、`check.jsonl` 及全部 6 个引用、`evidence/s3-implementation.md`、`evidence/s3-owned-file-hashes.json`、`evidence/s3-skill-consistency.md`，并在主补充规划后重读最终 design/implement。check 6 行均可解析且引用存在；unused implement manifest 0 字节，未称 task validate 完整通过。

S3 全文及实际 diff：

- `agents/trellis-{implement,check,research}.md`，删除的 `scripts/sync-agents.mjs` 全部旧内容。
- `skills/trellis-{start,continue,before-dev,brainstorm,break-loop,check,finish-work,meta,spec-bootstrap,update-spec}/SKILL.md`，两个 meta `change-context-loading.md` / `hooks-and-settings.md`。
- `.trellis/workflow.md`、`resources/templates/workflow.md`。
- `docs/{dispatch,worktree-execution}.md`、`.trellis/spec/{development,testing}/index.md`、shared index/reuse/cross-layer guides。
- `tests/{agent-documents,workflow-policy,worktree-protocol,manifest-provenance,initialization}.test.mjs`、`tests/provider-contracts.mjs` **484 行全文**、runtime fixture、skill resource tests。
- agent/skill/template baseline 全文、runtime 当前来源/hash 条目核验；`package.json` 检查可用脚本。

只读消费链全文：`lib/{task-context,worktree-query,subagent-rpc}.ts`、`runtime/pi_trellis_worktree/{materials,manager,cli}.py`、`extensions/trellis.ts` **1297 行分页全文**。为核 faux 队列及 resume，另只读已有 host 的 `pi-ai/dist/providers/faux.js` 全文、邻 preset `extensions/agent-tasks/src/agent-runner.ts` **1409 行分页全文**，无执行/import provider 或改动其文件。

本次继承的是普通 scope dispatch/已安装角色上下文，不是新的严格四行 authority 实际宿主派发；完整阅读记录不冒充真实新协议运行证据。

## 发现与修正

1. `tests/workflow-policy.test.mjs:31`：原字面要求 `Follow the project workflow…` 与获准 generic skill 的准确 `Follow the source project workflow…` 冲突。改为接受可选 source 词，仍保留 workflow 路由及授权/非强制 paired dispatch 的全部断言，未删要求或修改 skill 正文来迁就测试。
2. `agents/trellis-research.md:41`：Core Responsibilities 的 Persist 条目原为无条件描述，与上方强授权合同局部不一致。改为仅在 explicit source research authorization 下持久化，否则无写返回；`tests/agent-documents.test.mjs` 增对应局部断言，`resources/agent-baseline.json` 只更新 research adapted hash。历史 source/platform/version/date 均未变。
3. `tests/workflow-policy.test.mjs:130–146`：新增 baseline 中全部 10 个 bundled SKILL.md 的 source material/execution code 根静态断言；支持既有 footer 与 meta/spec-bootstrap 的现存入口/尾部结构，不要求无必要的新章节，拒绝旧 execution material 根陈述。

我仅写上述角色、两个测试、agent adapted hash 和本任务授权 evidence。start/continue 和 skill baseline 没有由我改动。review 后的 research adapted SHA-256：`5ad394a356c18334091c8dbd8f2161c20743cb64e10ff47599dfef26f8636133`。

## 合同核查

- 三角色/start/continue/workflow 对齐严格 **Active task → Trellis context id → Trellis agent → Trellis authority JSON → 空行**。文本 parser 不等于授权，消费方重新核 native 同仓库绑定、context、绝对 source/task/spec/workflow/manifest/reference 与 execution 根。
- 必读 PRD/可选 design/implement/workflow → 选中角色 JSONL/references；research 不要求 implement/check manifest。完整分页、缺失诊断、无 local-current/目标旧副本 fallback、无 complete marker 捷径一致。
- source 材料默认只读；主维护/lifecycle，研究和 evidence 写入需显式路径范围授权。包内角色直接维护，项目 `.pi/agents/` 发布/custom 边界保持。删除生成器，当前产品无残余再生成入口。
- CLI docs 对齐 native `prepare --role`、v2/no migration、无目标 copy/start/hooks/task.json 写入、unknown/stop/removal 保守语义。既有 `/trellis-init` Update project resources 发布 owners 未改变或执行，无参数 Check 仅资源诊断。
- `.trellis/workflow.md` 原 ordinary Agent→subagent_run 并行 hunk 保留；主提交需按原归属选择，不因最终整文件 hash 相等自动归 S3。
- generic 补修最终 diff/报告独立核过：7 个 generic skill 仅尾段变化，前段正文/示例字节与 HEAD 相同；meta 保 `.pi` 执行项目/个人 scope。extension 仅失效 provenance 链接改现存 README/license 注释一行，无行为修改。
- 36 skill、13 template、33 runtime、3 role 当前 hashes 全匹配；资源 manifest 历史 metadata/source hashes 均保留。runtime baseline 本阶段无修改。发布资源数按 runtime entries + 3，不再写死 35。
- 40 个实际相对 Markdown 链接/锚点核过，排除 fenced 格式示例并识别 README 的显式 HTML `license` id。最初两次临时 link checker 把示例 `(url)` 与 HTML anchor 当错误，已修检查器并重跑 exit 0，无产品改动、未隐去检查失败。
- `git diff -- runtime .pi/agents lib/task-context.ts lib/worktree-query.ts lib/subagent-rpc.ts lib/bindings.ts` 空，S1/S2 owners/deployed roles 未污染。prepare 的 target Git 无变化由已保留 fixture assertions/full 证据支持，本次没有真实项目 target 操作。

## Optional provider 静态审查及限制

`queryWorktree → requireMaterials → assembleDispatchPrompt → parseDispatchFacts` 使用实际新 API。临时 Git/source/runtime/注册 target/adopt/prepare 建立 native authority；stale target PRD 仅为负例，source research 输出改绝对源路径，共享源另用 unbound task。仅测试脚本拥有这些 disposable fixture Git 操作，不授权用户仓库 worktree/commit。

完整逻辑静态核查：

- `SOURCE material` 唯一正文来自 source PRD；fixture task 仅 status，workflow/overview/state 没有该 marker。首请求和 prompt 不含正文，随后安排真正 `read` 返回，stale body 不得出现；workflow body 不是 marker 来源。
- 实际 faux `stream()` 同步 `pendingResponses.shift()` / callCount++，set/append 为共享队列。脚本用 parent held request、每个 child held/terminal 边界串行安排，新增 reads 在 child 回答前；当前普通 fixture 每个 check child 为 PRD、workflow、check JSONL 三个去重 read。四个孩子读请求 + 五个孩子回答（含 steering 后额外一轮）+ 一个 parent unread notification = `4 * readCount + 6`，计算正确。不是全并发队列隔离证明。
- public launcher resume 故意省略 trellis role，避免 parent interception 对已 bound task 再走 ordinary 首次派发；实际 runner `resumeAgent()` 复用原 session、tool scope/扩展 handler，原 source authority应继续由 child recheck，而不是重新正文注入。这不验证 persisted-session 重建、需求变化后 resume 或新的独立 authority dispatch。
- `assertSourceReads` 的数量/无 isError/正文 marker，以及模型请求到达，不能单独证明 before_agent_start 成功绑定 authority。child error 会成为 custom task_error，但绝对 source read 仍可能成功；原 probe 没对 custom task_error、独立 source pointer、source/execution overview 或 resume 后 authority 明确断言，也未比较每个 read result 的 path/toolCallId 与计划顺序。因此 **没有确认可执行 PASS**。建议未来另行获准 probe 增这些可观测断言；本轮按明确只读边界未改 probe，也未运行任何 provider。

以上为 probe 覆盖边界，不是已复现 S1/S2 产品 bug；不据此擅改其产品或取消已有 fixture 证据。

## 实际验证

平台 Darwin；Node `v24.14.1`，Python `3.14.7`；真实既有 peer 路径 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，无安装。执行只对子进程 unset `TRELLIS_CONTEXT_ID`，不改 live host 环境。

### 最终 focused

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/agent-documents.test.mjs tests/worktree-protocol.test.mjs tests/manifest-provenance.test.mjs tests/initialization.test.mjs
```

`bgi5mxwy4`：**95/95，exit 0，自然结束**。证据 [s3-review-final-focused.log](s3-review-final-focused.log)。初次 `bfhzv3n4v` 94/94 在最终补修前，只是中间证据 `/tmp/s3-review-focused-initial.log`，不冒充最终。

### 全量

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
```

`bjwp4bnlr`：**本次执行 485/485，exit 0，自然结束**。证据 [s3-review-final-full.log](s3-review-final-full.log)。含 fixture Git、Python/TS、real SDK resource loader 离线检查，默认 glob 不含 provider-contracts.mjs。

启动前记录 110 个相关 verification inputs，结束重核仅并行 `lib/task-browser/component.ts`、`tests/task-browser-ui.test.mjs` 有变化；S3 reviewed inputs 未漂移。故本次 full 不保证覆盖并行 viewer 最终版本，不能作为全 checkout 冻结验收。未修改 viewer、其任务、其他并行项目资源。最终 S3 + generic/comment 输入见 [s3-review-final-file-hashes.json](s3-review-final-file-hashes.json)，共 32 文件；它不是实际阅读/ABA 证明。

### 其他

- `node --check tests/provider-contracts.mjs`：exit 0，**syntax only**。
- `git diff --check`：最终 exit 0。
- `python3 -B .trellis/scripts/get_context.py --mode packages`：exit 0，实际 development/testing 两层。
- Python read-only hash/provenance/byte-boundary/link/JSONL/owner-preservation 检查：最终 exit 0，输出 `/tmp/pi-bg/bzrrymvo6.log`（其中记录最初链接检查误判）、`/tmp/pi-bg/b6ohs9qzv.log`、`/tmp/pi-bg/bu62jdjv6.log`。
- 静态 TypeCheck / Lint：package 无对应 script，**NOT_AVAILABLE**，不是 Passed。Node TS 执行不是静态类型检查。
- 真实 provider/模型遵从/完整分页阅读、真实终端/部署或资源更新、真实项目 managed lifecycle：**NOT_RUN**。

## 主会话后续

1. 复核我方 scoped fixes、最终 32 文件 hash、S3/generic 补修 diffs 和保留的并行 workflow hunk；不得混入 viewer/manifest/其他任务。
2. 若需要“全 checkout 最终冻结 full”证据，待并行 viewer 真正冻结后重跑；现有 S3 focused95/95与本次 full485/485范围/限制已分别记录。
3. Probe 行为继续 NOT_RUN；增断言或真实 host probe需单独按授权处理。无静态 syntax→行为验收跃迁。
4. 本 reviewer 不提交、不 start/finish/archive/install/deploy/reload。阶段/最终验收由主按现有授权与显式 opt-out处理。
