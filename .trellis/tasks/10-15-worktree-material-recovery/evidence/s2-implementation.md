# S2 实施交接（2026-10-15）

## 状态与边界

**S2 candidate 已实施、自检通过，交主会话独立审查；不是独立 review、最终验收或提交授权的执行。** 执行目录 source main。没有 commit/start/hooks/install/deploy/reload/push/生命周期操作，也没有真实项目 worktree；Git worktree/初始化发布/任务生命周期仅在既有测试的 disposable fixture 内发生。

本轮完整读取 PRD/design/implement、S1 independent review/native handoff、S2 root routing、workflow、development/testing/shared guides 和完整相关 owners/callers/tests。当前任务 implement.jsonl 是空文件，不能称其 validate 全通过；本次遵照主明确 source 路径/范围直接读取工作。

## 精确产品/测试范围

实际自改 10 files：

- `lib/worktree-query.ts`：短 role 查询、真实外部 envelope/path/hash/issues/strict-v2 校验、结构化错误；原生 query 保持只读。
- `lib/task-context.ts`：删除正文 loader、context budget、complete 标记生成；新 path-only authority parser/renderer、去 caller-owned claims；共享 task path reader 保留 viewer 的 canonical in-store aliases，native authority 验证仍拒绝内部 symlink。
- `lib/subagent-rpc.ts`：source/managed 统一 paths 合同，前后 role query/hash fence；managed sourceFingerprint=源要求 hash、targetFingerprint=实际 worktreeSnapshot，target persistent adapter 校验；保 reserve/unknown/stop/早 terminal。
- `extensions/trellis.ts`：execution registration 与 source authority/session 分根；startup 在 prompt 之前验证 managed marker→native binding 并隔离；source runtime 独立 child key/pointer；source CLI/workflow/task/overview；authority error fence；普通 subagent_run 同合同；单一 CLI invocation source cwd、mixed shell拒绝而不把产品命令搬到 source；Git env 仅 subprocess 清理；source Git 概览明确不是 target Git。
- `tests/{dispatch,task-context,agent-context-integration,runtime-contracts,worktree-protocol}.test.mjs`：上述真实 native/源路径/子指针/旧目标材料/失败副作用的断言。
- `tests/worktree-fixture.mjs`：必要 `--role` passthrough。

`tests/source-executions.test.mjs` 未改，最终 focused 仍执行其四项记录/占用保留负例。`lib/executions.ts`/`lib/source-executions.ts` 未改，原有字段/状态 owner 保持。common 三模块、native、runtime baseline 本轮未改，**无需 resource hash 更新**。

存在并行 `extensions/trellis.ts:runtimeDiagnostic` 一行 `/trellis-init --check`→native Check菜单措辞更新，**不是本实现者 hunk**；主整合不得将其误归 S2。其他 README/docs/init libs/task-browser command/template/skill baselines/project manifest/workflow/邻 task 当前 dirty 均为并行内容，未回退或覆盖。未改包内/部署角色、S3 scripts/skills/docs/spec/templates。

## S2 消费 schema 与合同

### Native bridge

`queryWorktree(cwd, task?, ready=false, signal?, supportedRelease=false, selectedRole?)`；`selectedRole` 是 `implement|check|research`，ready 必须显式 task+role。`supportedRelease` 先无role读 binding、验证 target runtime，再读 ready，不执行 target task.py。Python 是 authority/material policy owner，TS 只校验返回 facts。

成功 envelope：`{ok:true,source:{root,commonDir,worktrees},local:binding|null,binding?:binding|null,materials?,issues:[]}`；显式 task 必须存在 binding 字段（可 null）。Git row branch 可 null。binding 严格由 S1 parseBinding version2 解析、同 source/task/commonGit 核对，无 legacy 材料描述。

`materials` valid：`state,role,sourceRoot,materialRoot,taskDir,taskPath,specRoot,workflowPath,artifacts,manifest,references,sourceFingerprint,revision,issues`。`revision===sourceFingerprint` 为64 lowercase hex；manifest research=null、references=[]；implement/check=本角色绝对源 JSONL、完整有界 raw references。reference `label,path,sha256,bytes` 的 sha256 是原始全文 hash，不当要求投影或 agent-read proof。路径/regular-file/lexical-real authority、三必需artifact/两optionalartifact、manifest与ref bounds、structured diagnostics实际验证。拒绝 malformed/hash/path/role/version/unknown binding，没有 target fallback。

`WorktreeQueryError.issues` 保留原生 `code/message/nextAction/role?/path?/manifest?/line?`，stderr 单独保留且加入可见message，不覆盖/吞掉 JSON issues。non-ready invalid materials 保留 diagnostics，由 requireMaterials 明确抛出；ready failure保留原生错误。

### Dispatch header（正文不注入）

严格首四行+空行：

```text
Active task: .trellis/tasks/<task>
Trellis context id: <independent-dispatch-id>
Trellis agent: trellis-implement|trellis-check|trellis-research
Trellis authority: <one-line JSON object>

<assigned scope prose>
```

authority JSON 必须完整：`sourceRoot,materialRoot,executionRoot,taskPath,specRoot,workflowPath,requirementsFingerprint,artifacts,manifest,references`；parser 只验证语法，不授予信任。child 将其与从 actual execution cwd 查询的 native source/local binding/materials 比对，不能凭 caller prose/env root 任意读写。普通 subagent_run 任务来自已验证 active source pointer，不让 caller `Active task:`/forged authority 覆盖；owned header/context delimiter/legacy marker 被 strip。

路径清单只列身份、规则、绝对路径/raw hash，规定 PRD→design→implement→workflow→本角色JSONL→所有 selected refs，分页完整读、directory展开、缺源报告。无 PRD/spec/workflow 材料全文、无 complete marker、无旧 budget fallback。research不要求其他manifest。

### RPC/child双根与证据

source/managed role查询前后比 sourceFingerprint；managed另外捕获/复核 target snapshot。source要求变化或target snapshot在渲染间变化拒绝spawn、无 lease；unknown一次spawn后拒绝自动重复。managed执行cwdtarget，source材料source；源要求/live内容修改不等于自动接受、初末hash相同也非实际阅读证明。

child session registration仍是 execution root，不将 Session.root 直接改source破坏 SDK startup registration。managed startup先 native marker/source binding验证，只保存可信source root，隔离child key并等待完整header；header核验成功后在**source** runtime写独立子pointer，忽略派发runtime context id做实际key，不改parent、不task start/hooks。source CLI以 source cwd+子key执行，无 global env/get_repo_root override。source缺失、坏header、失败binding fence不允许旧target/parentpointer fallback。成功deactivate不会因重复header重新绑定。

运行后普通turn只核身份和必读source路径存在，不把内容/生命周期变化当自动取消策略或读取证明；源/执行最终要求变动交主审查。对runtime invocation只包单命令 `(cd source; CLI)`；mixed runtime/product shell拒绝并提示拆开，product shells cwd保持target。已包命令重入幂等。不能保证任意shell/env/第三方provider是OS沙箱。

## 新增/保留关键验证

- target任务目录真正不存在仍完成managed startup和child source pointer绑定；target旧spec/旧task.json/坏pointer都不影响source paths，target Git status前后相同。
- child读取source paths得到实际source bytes，不是旧target；parent/source task.json与parent pointer不动，无target child pointer。
- source PRD/ref缺失、当前角色无效→spawn0；另一角色失效不阻断implement/research。
- source/managed首role query之后修改source→第二query拒绝，无spawn/lease；old/badshape/forgedheader→fence，不fallback。
- sourceFingerprint与targetFingerprint/finalSnapshot实意、completed check freshness继续原生状态核验。
- reserve、早 terminal、shutdown while spawn、未知spawn无retry、stop等待terminal仍通过。
- uninitialized startup zero Python/state/write、foreigncwdnegative、runtime失效、viewer alias/外部task store行为保留。

## 实际验证与失败保留

环境：darwin，Node v24.14.1，Python3.14.7；existing host1.2.0 peer路径仅测试子进程使用，无安装。每次test使用：

```bash
env -u TRELLIS_CONTEXT_ID \
 PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
 node --import ./tests/host-tui.mjs --test <files>
```

**最终冻结代码**（后续未再编辑）：

1. 用户 exact focused six files：`tests/dispatch.test.mjs tests/source-executions.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs tests/runtime-contracts.test.mjs tests/worktree-protocol.test.mjs`：**91/91, natural exit0**, job bwuskpj7e。保留 `s2-final-verification.log`。
2. 稳定附加边界：`tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/task-browser-reader.test.mjs`：**54/54, natural exit0**, job btanh3c8r。保留 `s2-stable-regressions.log`。
3. `git diff --check`：**exit0**。最终自改文件hash保留 `s2-owned-file-hashes.json`。
4. lint/typecheck：**UNAVAILABLE**，package无此script；Node执行TS不称static typecheck。

中间/广泛检查（不是最终全部通过）：

- 初bridge+dispatch38/38 exit0；首次integration31/42 exit1（macOS /var→/private canonical fixture、new native来源sourcePath=null的旧gitshow断言），修后42/42 exit0。
- focused初89项87/89 exit1：source任务缺失被taskTTL掩盖的产品问题 + 同test两fixture after清理顺序错误；定点修后4/4 exit0，下一focused91/91 exit0；后来self-review收紧decoder/env/cache/unsupported规则再跑最终91/91。
- activation首33/60 exit1：并行agents-block template哈希未更新导致fixture门禁20项失败，另共享viewer in-store aliases回归7项；未修改并行template，恢复共享path行为后viewer34/34、后activation60/60 exit0。
- `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=... npm test`：**417/424, exit1**, job bd3tpf35g，保留 `s2-full-suite-intermediate.log`。五项unsupported runtime派发旧header错误曾导致task_error注入，已修并在最终54/54全部复核。另两项：`tests/initialization.test.mjs:20` literal executableCount35但S1新增diagnostics为36；`tests/init-command.test.mjs:108` 并行native菜单修改取不到error。**未改这两out-of-scope文件，不称full pass**，主/S3/并行owner协调。
- 最后扩展66项regressions65/66 exit1，唯一 `tests/project-activation-host.test.mjs:87` 仍旧 `/trellis-init --user Fixture` 宿主命令，而并行init owner改为菜单，因此reloads0≠1；本实现者未改host test或init command。其他65项通过，保留 `s2-final-regressions-concurrent-init.log`。随后稳定54/54不包括该并行菜单合同，明确不是把其fail改成pass。

真实provider/online model/PTY视觉、真正agent完整read/分页/真实项目worktree：**NOT_RUN**。managed双根证据是真实native CLI/fixture handler+真实source路径读取/CLI执行；真实SDK activation证据不等同真实managed provider行为。

## 主审查/下一阶段注意

- 本实现者未递归派发review，主需独立审查并按workflow核实际diff/hashes/tests后checkpoint。
- S3仍需删除生成器、直接维护包内角色、skills/docs/spec/template、最终hash及用户文档一致性；旧角色正文协议测试当前通过不证明新source-only角色合同已更新。
- `tests/provider-contracts.mjs`（默认glob之外）仍调用已删buildTaskContext/旧renderer API，需要S3/最终测试规划明确允许接线再修；本轮范围未包含、**NOT_RUN**，不能称provider probe可用或通过。
- runtime baseline unchanged。source execution持久记录schema未扩大（approved范围未包含owner），source要求hash已在派发authority和前后查询围栏；managed existing fields含source要求+target快照，source记录仍是占用truth不是read/freshness证明。
- 保留指纹ABA/live filesystem及shell/OS sandbox边界；验收仍必须子read报告、实际代码、主审查。
