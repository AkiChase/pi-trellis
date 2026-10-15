# 实施计划：权威材料来源与派发恢复

## 边界

2026-10-15 用户已审阅最终方案并明确批准实施；task start --allow-empty-context 成功，status=in_progress，当前source main。旧sync-spec/复制方案废弃。本task名保留不重命名。未用manifests为空不称validate全通过。按已批准stage实施/测试/独立审查，主核实后按workflow提交；不部署/安装/reload/push/归档。

执行分工更新：S1范围明确，委派普通 trellis-implement Agent 实施（无commit/lifecycle）；主同时只读核S2 common消费者并协调接线，再独立普通review Agent。此调整不改产品范围，遵循当前workflow实现与审查独立选择。

主实施+普通独立审查（文件归属/双根身份/并发属高风险合同）。实施获批后再为实际check角色准备真实check.jsonl；当前不用角色manifest，空文件不称validate全通过。独立review不替代主核实diff/tests。

## S1 原生source-authority与零副本prepare

文件：`runtime/pi_trellis_worktree/{materials,manager,records,cli}.py`、新增`diagnostics.py`、`lib/bindings.ts`；`tests/{preparation,worktree-cli,worktree,manifest-provenance}.test.mjs`、`tests/python/test_worktree.py`；删除`tests/material-sync.test.mjs`，通用负例迁入保留文件；`resources/runtime-baseline.json`。

1. 保存并行hunks现场，只改本任务范围；当前materials/test_worktree曾出现其他会话变化，不整文件回退或混合提交。
2. native按role读取source common+refs，research无角色manifest；source路径安全/有界hash与结构化诊断。
3. binding严格version 2、同步TS/Python解析，旧/未知记录拒绝，无兼容分支；prepare零task文件/无目标start/hooks；忽略runtime是唯一准备写入。
4. 删除refresh/collect动作/参数、双副本snapshot与ancestry、专用同步测试，不新增转换命令；保留通用并发/路径保护负例。
5. status/query source事实，保留identity/锁/兼容目标校验；更新resource hashes。

验证：
```bash
node --import ./tests/host-tui.mjs --test tests/python-worktree.test.mjs tests/preparation.test.mjs tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/manifest-provenance.test.mjs
```

门禁：prepare前后target git status/diff字节相同、无start/hooks/task.json编辑；source旧引用诊断；旧/未知记录明确拒绝、已删除命令参数拒绝；identity/占用/越界负例保留。独立合同审查通过后形成stage checkpoint，按实施时授权处理提交。

## S1 主验收记录（2026-10-15）

独立审查 a107ae93-5ada-428 完成并自修文件fd/path竞争、图尾重检、内部symlink、raw reference hash与nextAction等S1问题；主全文核最终materials及新增负例、审查报告/实际改动。主最终focused命令：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/python-worktree.test.mjs tests/preparation.test.mjs tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/manifest-provenance.test.mjs`，bq82tih0r自然exit0，91/91。独立Python28/28；33runtime hashes匹配，git diff --check通过。S1通过，已提交精确23files checkpoint `9ec131f`（feat(worktree): use source-authoritative role materials）；未夹带并行workflow/项目manifest/其他任务/logs。全量/真实host由S2/S3负责，未作最终验收。S2普通实现Agent `530dc81e-d8f2-494` 已按明确Active task首行派发，仅桥接/派发/子双根及相关测试，无生命周期或提交权限。

## S2 派发路径与子会话双根接线

文件：`lib/{worktree-query,task-context,subagent-rpc}.ts`、`extensions/trellis.ts`；`tests/{dispatch,source-executions,task-context,agent-context-integration,runtime-contracts,worktree-protocol}.test.mjs`。common三个模块已完整核对，复用显式repo_root参数，默认不改，见evidence/report.md；不得以材料共享为由全局改Git根。

1. source/managed统一路径身份prompt，无正文complete marker；真实source root来自可信binding而非caller prompt。
2. native结果TS真实验证；两次role query比源要求hash；spawn reserve/unknown仍保守不重复。
3. 子extension/session pointer到source忽略runtime，target执行cwd不变；普通角色Agent入口同合同；子bash根和context显式传递，不全局env污染。
4. source workflow/task解析，不读target旧task/spec fallback；任务context_id绑定不运行source/target start/hooks或修改parent pointer。
5. 独立检查旧execution source/target fingerprint消费语义；旧证据信息不足保守未知，不能自动提升验收。

验证：
```bash
node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs tests/runtime-contracts.test.mjs tests/worktree-protocol.test.mjs
```

门禁：source新/target旧材料仅source被读取；target task不存在仍可绑定当前任务；source缺失spawn=0；另一role缺失不阻断；source pointer不变；未知spawn无自动重试；上下文不含整篇材料或complete标记。

## S2 主验收记录（2026-10-15）

独立77d213af自修immutable binding/ancestor sourcepath/CLI绝对路径与cwd/metadata边界/missing marker隔离；主核实际3owner修复与报告，11files指纹匹配独立最终版本。主b6jss9uuq focused104/104自然exit0，独立附加54/54。独立全量468/469唯一initialization literal35（S1新增诊断模块36）仍FAIL，S3明确修此fixture，未称最终fullPASS。S2通过，已提交精确15files checkpoint `176619d`（feat(dispatch): route task roles to source authority paths），未夹带logs/并行workflow/项目manifest/其他task；并行init提交5d3b4e4已含runtimeDiagnostic一行，不在S2重复收录。真实agent/provider行为NOT_RUN。S3普通实现Agent `16d02823-fcf1-47a` 已派仅角色/技能/文档/spec/模板/对应测试和hash，无部署或生命周期权限。

## S3 角色指引、项目政策与文档

文件：删除`scripts/sync-agents.mjs`；直接修改包内`agents/trellis-{implement,check,research}.md`，不改`.pi/agents/`部署副本；两个start/continue技能、`resources/templates/workflow.md`、`.trellis/workflow.md`、`docs/{worktree-execution,dispatch}.md`、`.trellis/spec/development/index.md`、`.trellis/spec/testing/index.md`；`tests/{workflow-policy,agent-documents,manifest-provenance}.test.mjs`与必要protocol断言；修复`tests/initialization.test.mjs`资源数为baseline+3以及`tests/provider-contracts.mjs`旧loader调用接线（不自动运行真实probe）；四类baseline按实际改动hash更新。

1. 完整阅读包内角色/相关规范/现有测试，直接维护角色源码；删除生成器及测试中的adaptAgent/再生成anchor要求，保留直接角色合同和来源/hash检查。历史source hash、AGPL声明不改归属；不编辑custom部署角色、不改初始化资源发布接口。
2. 子角色直接分页完整读源路径，材料与代码根明确；research明确写源research，主负责lifecycle/spec整合。
3. 主发现源引用旧路径主动核实维护再派发，已有授权不反复问；planning/只读不得写。
4. 用户docs中文介绍新prepare与source authority，删除同步及迁移方案；spec英文最小更新开发契约。
5. 按最终源码/CLI统一核对所有指引后更新hash，不真实deploy/install/reload。

验证：
```bash
node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/agent-documents.test.mjs tests/worktree-protocol.test.mjs tests/manifest-provenance.test.mjs
npm test
```

独立审查：无生成器残余调用/失效规范要求；包内角色是权威源、项目部署副本未改；仍有旧target任务/完整注入提示否；材料root/执行root一致；历史来源保留；role读授权不等于任意写；docs/spec职责与语言正确。

## S3 一致性补查（2026-10-15）

实现16d02823返回candidate，focused94/94/full478/478自检自然0，主全文核包roles/docs/spec/template/startcontinue/对应tests及optional provider工具。独立review edbd88ed-f67a-47c后台。旧generic技能尾句execution材料根与meta两引用budget/complete规则会误导新角色，按既定R7一致性补最小措辞，c25a0330-15c7-457仅这些md/skillhash；主只修extension头坏license链接一行，不加行为。design列出，待冻结后独立复查/full主复测，不将candidate全量当最终验收。部署/真实probe仍NOT_RUN。

## S3 主验收记录（2026-10-15）

独立edbd88ed完成role授权句/路由断言/generic10skill根测试，focused95/95/full本次485/485（并行viewer漂移限制如实保留）。主核报告/实际修复/32filehash；主最终 `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test`，bagajovo0自然exit0，486/486；全量期间记录verification inputs结束hash无漂移。S3源码/角色/技能/spec/docs合同通过，准备精确stage提交。Optional provider仅syntax/static审查，真实provider/模型遵从/分页/终端/部署NOT_RUN；不以静态或fixture宣称真实行为验收。

## 最终验收

临时Git仓库端到端：create→source任务批准→prepare→路径派发→子target改产品→返回证据→主更新source任务。逐点assert target管理文件不变、git status无执行设施diff、target产品stage/commit不包含管理变更。加入source引用迁移后由主维护→再次派发无需refresh/软链接；旧/未知binding记录明确拒绝且无自动写入/转换。

真实宿主检验直接源read/分页/双根bash/独立任务身份；测试fixture不等于真实agent行为，环境限制明确NOT_RUN。检查A1–A7、资源来源/hash、git diff --check；遵循届时stage提交与用户opt-out，只精确files/hunks。

不push/安装/外部包sync/部署/reload/归档/清理；这些不由planning或产品测试自动授权。

## 完成与收尾（2026-10-15）

S1 `9ec131f`、S2 `176619d`、S3 `3d12127` 已审查、主复测并提交。tmux 真实离线最小派发/源缺失拒绝/正常退出通过；自主模型、分页、其他角色与恢复/停止等未覆盖项仍如实保留。用户接受当前结果，授权将证据合并为一份报告并归档收尾，覆盖此前不自动归档的边界；不授权push/安装/部署/sync/reload。

最终结论、阶段修复、测试与限制统一见 [完成报告](evidence/report.md)。本文件前面的阶段记录为历史过程，不将其中“待审查/准备提交/NOT_RUN”描述当作最终状态。原始日志与夹具已移出仓库；重复阶段报告已合并。
