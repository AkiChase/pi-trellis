# 设计：权威材料来源与派发恢复

## 1. 定案与状态

Phase 2：用户已审阅并批准实施，正常 start 为 in_progress。主 worktree 是 task/spec 的唯一权威来源；派发只给路径与身份，子 agent 直接完整读源文件。取消旧复制/refresh/collect/sync-spec/软链接方案。

```
主根(sourceRoot)
  .trellis/tasks/<task>   权威任务、研究、证据
  .trellis/spec          权威规范
  .trellis/workflow.md   项目政策
  .trellis/.runtime      binding、子上下文、占用、要求指纹
子根(executionRoot)
  产品代码/测试          隔离执行
  .trellis               Git checkout原样，非当前任务来源
  .trellis/.runtime      仅必要的忽略marker，无任务副本
```

子 agent 不能通过cwd猜来源；材料根与执行根是独立、明确的事实。

## 2. 具体必改文件

### 产品源码

| 文件 | 修改内容 |
| --- | --- |
| `runtime/pi_trellis_worktree/materials.py` | 角色材料验证改为源root；common artifacts+当前角色引用图，research无manifest；生成有界引用清单和完整文件hash（非正文注入）；删除baseline两边一致/源git clean门禁、复制、target task start、refresh/collect、accepted graph/ancestry与双副本snapshot实现。不保留legacy分支。 |
| `runtime/pi_trellis_worktree/manager.py` | prepare为零任务文件写入的验证+runtime登记；query/status返回source权威事实与角色readiness；删除目标task_record/current依赖、refresh/collect管理动作及旧材料snapshot清理。无转换命令、无双模式。 |
| `runtime/pi_trellis_worktree/records.py` | 新binding严格version 2，仅source-authority；移除preparedFiles/materials双副本descriptor字段；旧version/未知组合拒绝，不迁移。源root/commonGit/task身份可信，marker不能授权任意外部路径；保留锁/占用/注册worktree检查。 |
| `lib/bindings.ts` | WorktreeBinding/parseBinding同步version 2与新的要求事实字段，移除旧descriptor解析；sameIdentity和所有消费者一起校验，未知/旧记录拒绝。 |
| `runtime/pi_trellis_worktree/cli.py` | ready/prepare按角色验证、status诊断；删除refresh/collect子命令及参数，更新prepare/help；不新增迁移命令，确认不是每次新询问用户。 |
| `runtime/pi_trellis_worktree/diagnostics.py`（新增） | issue code/message/role/path/manifest/line/nextAction；区分缺引用、未知记录、身份、runtime、占用、并发；可恢复不等于写授权。 |
| `lib/worktree-query.ts` | 传role、验证source权威事实与结构化issues；返回要求指纹、不期待source/target材料副本fingerprint；未知payload安全拒绝。 |
| `lib/task-context.ts` | dispatch新增authority路径契约与必读清单构造；所有Trellis角色派发改为路径/范围而非材料正文，去除该路径的complete injection语义；parser只接受新的权威路径契约，不保留旧完整正文header模式，不让caller伪造权威路径；必要role manifest验证复用native事实，不另复制Python policy。 |
| `lib/subagent-rpc.ts` | source/managed统一权威路径派发；managed两次query按role验证源要求hash；cwd仍子根；reserve/spawn/stop/unknown保持；不copy/start/sync，不提供旧模式转换。 |
| `extensions/trellis.ts` | inheritDispatchTask区分source任务root与execution cwd；子context/pointer登记在忽略的源runtime独立身份，不在目标task start；source workflow/spec/task解析与目标执行身份分开；普通角色Agent入口同样使用路径契约；子bash上下文显式根，禁止因本地旧.trellis推断另task；更新overview短协议提示。 |
| `runtime/common/paths.py`、`runtime/common/session_context.py`、`runtime/common/active_task.py` | 已全文核对，现有显式repo_root参数足够，S2默认不改这些公共模块。扩展在source cwd用独立child key调用source CLI；target Git/代码事实单独取，不全局重定向get_repo_root或新增任意env根覆盖。详见evidence/report.md。 |

### 执行指引与文档

| 文件 | 修改内容 |
| --- | --- |
| `scripts/sync-agents.mjs` | 删除上游字符串适配/再生成脚本；不保留生成模式或替代生成入口。 |
| `agents/trellis-implement.md`、`agents/trellis-check.md`、`agents/trellis-research.md` | 直接维护的包内权威角色源码；注明source材料root/execution root、完整分页读、默认只读管理材料与研究显式写源research。保留现有上游衍生来源、版权和AGPL声明；不修改第三方agent产品。 |
| `skills/trellis-start/SKILL.md`、`skills/trellis-continue/SKILL.md` | 主子根明确、只读直接源材料、主负责恢复与生命周期，无旧绑定迁移流程。 |
| 其余 `skills/trellis-{before-dev,check,break-loop,finish-work,brainstorm,update-spec,spec-bootstrap}/SKILL.md` 与 `skills/trellis-meta/SKILL.md` | 最小修正尾部/入口的“材料从execution根解析”歧义：主用source，子用verified绝对source材料，代码仍execution；不改技能主体或增加写授权。 |
| `skills/trellis-meta/references/{customize-local/change-context-loading,platform-files/hooks-and-settings}.md` | 删除旧正文budget/complete-injection要求，改为source path-only/native bounds/完整read验证；`.pi`配置仍按其原执行项目/个人根，不随材料root迁移。 |
| `extensions/trellis.ts` | S3仅修文件头失效license说明链接到现存README/license；无行为改动，S2逻辑不改。 |
| `resources/templates/workflow.md`、`.trellis/workflow.md` | 不准备目标任务副本；每角色完整读source；主维护引用、子返回结果；现有权限与提交政策保留。 |
| `docs/worktree-execution.md`、`docs/dispatch.md` | 中文重写prepare/source authority/参数；删除refresh/collect同步教程；不承诺目标没有Git跟踪.trellis。 |
| `.trellis/spec/development/index.md` | 英文更新source-only材料、零执行副本、直接读/非完整注入、无旧绑定兼容、指纹证据约束；删除“adaptAgent精确anchor是角色改动唯一入口”的旧约束，改为直接维护包内角色并保留来源/hash、custom发布保护；不新增功能spec。 |

### 测试与资源

| 文件 | 修改内容 |
| --- | --- |
| `tests/python/test_worktree.py`、`tests/preparation.test.mjs` | prepare零Git差异/no task copy/start/hooks；source role验证、version 2记录严格解析。 |
| `tests/material-sync.test.mjs` | 删除专用双副本同步测试文件；有价值的通用身份/占用/并发负例迁入preparation/worktree测试，不保留legacy同步用例。 |
| `tests/worktree-cli.test.mjs`、`tests/worktree.test.mjs` | version 2 binding、旧/未知记录拒绝、删除参数拒绝、预览零写入与身份/占用；正常remove仍拒绝真实dirty，不忽略污染。 |
| `tests/dispatch.test.mjs`、`tests/source-executions.test.mjs` | 路径派发、source要求变化、无正文complete marker、零spawn拒绝/unknown不重试。 |
| `tests/task-context.test.mjs`、`tests/agent-context-integration.test.mjs` | authority路径parser与子session接线；source材料/target代码，目标旧task不能成为fallback，子read分页规则。 |
| `tests/runtime-contracts.test.mjs`、`tests/worktree-protocol.test.mjs`、`tests/workflow-policy.test.mjs`、`tests/agent-documents.test.mjs` | source root/context/bash/技能/角色/模板合同一致与无start/递归/生命周期副作用。 |
| `.trellis/spec/testing/index.md` | 最小删除已废弃的生成器测试方法和material-sync矩阵项，改为直接角色合同/hash验证与source-authority负例；保留上游来源证据，不执行旧依赖安装/生成教程。 |
| `resources/runtime-baseline.json`、`resources/agent-baseline.json`、`resources/skill-baseline.json`、`resources/template-baseline.json` | 本任务最终hash；agent baseline保留历史source hash及来源，只更新直接维护角色的adapted hash，不伪称重新生成或纯原创；原生模块MIT、上游改造来源不改写。 |
| `tests/provider-contracts.mjs` | 最终验证工具仍调用已删除buildTaskContext/旧renderer，需改用native source facts与path-only合同；只修测试接线，不改provider产品，不自动运行未授权真实probe。 |
| `tests/initialization.test.mjs` | S1新增原生模块后资源数不再固定35，改为runtime baseline条目数+3角色；不改并行初始化菜单合同。 |
| `tests/manifest-provenance.test.mjs` | 新native诊断来源、直接维护角色及技能模板hash的一致性；历史来源hash不作为再生成要求。 |

## 3. 明确不改/不做

- 不新增 specs.py/spec-sync测试，不实现规范复制ancestry或snapshot2双副本方案。
- 不编辑 `.trellis/scripts/**` 部署副本，不执行install/deploy/reload；测试临时fixture可部署。
- 不做目录symlink/sparse/skip-worktree/assume-unchanged，不自动删目标旧.trellis。
- `runtime/worktree.py`、`runtime/query-worktree.py` 薄入口不改；`scripts/deploy-worktree.py`枚举native模块已足够。
- 不修改pi-subagents/provider或内建临时worktree生命周期；仍公共RPC cwd派发。
- 不自动修改其他用户项目角色/workflow；本仓库 `.pi/agents/` 也是部署/custom副本，本任务不直接编辑或覆盖。
- `/trellis-init` 的 Update project resources继续作为包内 `agents/` 发布到项目 `.pi/agents/` 的现有入口；与删除开发生成脚本无关。本任务不改初始化发布接口、不实际运行资源更新。
- `lib/executions.ts`优先复用既有字段：sourceFingerprint=本角色源要求hash，targetFingerprint=执行checkout事实；若字段消费者无法兼容，凭完整证据修订清单，不能静默改公共语义。

## 4. 派发与直接读取合同

受主host验证的派发facts至少包括taskDir、absolute taskPath/sourceRoot/specRoot、executionRoot、contextId、role、requirementsFingerprint、必读artifact路径、本次scope。header仅列路径和身份/规则，不含PRD/spec全文，不打complete-injection marker。

源JSONL相对引用只从sourceRoot解析；禁止caller prompt伪造/覆盖authority字段，权威来源来自binding/源会话事实。子agent先完整读PRD/design/implement，再读该角色manifest并完整读每个所选规范/研究文件。超read单次上限分页直到完毕，不能把第一次截断视为全部。research不读implement/check JSONL，所需额外材料由scope列真实源路径。

源文件缺失/越界/不可读是具体诊断，无目标fallback。正文注入取消不代表取消派发前必需引用验证。code paths若出现于说明中仍以execution root操作，材料读取根不能成为产品代码写入根。

子扩展解析双根时需验证同仓库绑定、source task身份和独立context；不能只凭header、环境变量或本地marker允许任意外部读写。parent pointer不得被子task继承操作修改。workflow由source加载，执行工具cwd保持target；目标host配置/adapter/runtime兼容校验仍需保留，不能执行不可信目标脚本探测。

## 5. prepare、指纹与记录契约

新binding明确source-authority。prepare验证批准的source task、必要角色材料和目标执行环境，写忽略runtime准备记录，不启动目标任务或hooks。只读ready按本次role构图，global status逐角色报告warning。源未提交spec允许读取：这是读行为，不涉及把未批准内容复制到分支；主agent仍必须按获批要求组织材料。

读取来源是实时source；派发前记录hash并渲染后重检，变更拒绝spawn。子agent应在报告中记录实际阅读的材料/变化提示；初始/最终hash相同也不能证明期间无ABA或实际读全。若执行期间source需求改变，主agent通知/审查结果，检查证据按要求hash+实际代码snapshot判过时；不自动取消或推进phase。

当前仓库核对：Git只有主worktree，`.trellis/.runtime/pi-trellis/bindings/`无记录。不承担旧绑定兼容/迁移：version 2直接替换旧schema，无mode切换、转换命令、旧snapshot读取或双副本同步代码。遇到version 1/未知记录明确拒绝，不自动删文件或猜测升级。移除refresh/collect CLI与文档，误调用走未知子命令错误。删除只发生在获批实施的产品源码/测试范围，不清理任意用户runtime记录。

## 6. 恢复与协作

主agent获取源引用诊断→核实路径迁移→已有维护授权内更新权威JSONL→重新query→派发。不再refresh或sync-spec。需求改变/并行文件冲突/未授权源写入才询问用户。

默认子agent仅写target代码/测试并返回证据；主整合source任务/spec。研究可明确写source任务research，范围在prompt列出，不能写task.json/lifecycle或其他任务。文件系统没有沙箱，权限是工具可覆盖保护与角色协作合同，不承诺阻止所有bash外写。

## 7. 风险与验证

关键风险不是同步算法，而是双根在session/context/CLI/读取路径中是否一致。验证必须覆盖：目标旧任务/spec污染或不存在、source材料全读取、ordinary Agent入口、子bash身份、源pointer不变、role无效隔离、未知binding拒绝、正常git add/commit/merge无执行设施变更。

fixture只证明合同和路由，不能声称真实agent完整读过；需真实宿主测试或如实NOT_RUN。实现前通读相关common paths/session/active_task及其消费者，确认最小root改造；若需扩文件清单先更新design。
