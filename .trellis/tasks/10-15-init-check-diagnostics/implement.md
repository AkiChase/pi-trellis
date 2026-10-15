# Check 实施计划

## 当前状态与执行方式

- in_progress；用户明确批准最终方案实施，当前会话正常 start。S1 实施开始，产品测试/独立审查/提交尚未完成。
- 产品要求见 [PRD](prd.md)，技术合同见 [design](design.md)，证据见 [初始调研](research/local-diagnostics.md) 和 [补充运行契约调研](research/planning-contracts.md)。历史 verbose/双报告/旧参数与目标任务副本/pointer 设想均已覆盖；按当前 source-authority 运行合同执行。
- 拟委派实现者完成 S1 diagnostics owner/command/tests；主会话协调 scope/session 接线与验收，独立 Agent 审查安全/跨语言合同。高风险读写/来源围栏不能仅主代理自检。
- 本任务未绑定 managed worktree；实施前检查并行改动与当前绑定，尤其 runtime/worktree 材料恢复、research 边界任务。存在绑定时服从 managed 执行规则，不临时 isolation 绕过。
- 实施批准按项目 workflow 包含本任务已验证 stage 的局部提交。无安装、个人 sync、reload、push、归档、journal 授权。

## S1：独立静态诊断与唯一报告

- [ ] 新增结构化分项/安全读取/formatter，覆盖 root、包/manifest/resources、operation/lock、现存相关配置文件、own pointer 静态证据；保留按消费者区分的配置深度给 S2。
- [x] 前置 `10-15-pi-command-unification` 已验收归档（产品 `5d3b4e4`）；后续只接替菜单 Check callback，真实 root/key 由 extension resolver 与 source-authority 状态提供，兼容 child memo 与异常 runtime，生命周期不串结果。
- [ ] 新 Check 不运行 inspect/resourcePlan/adoptPlan，不调用 apply/refresh/reload/model；非交互静态指引遵守前置指令任务，不恢复参数直达。
- [ ] 核对前置指令任务已完成 boundedDialog/adoptionDialog/docs 导航与固定破坏性警告摘要，复用成果，不在本任务重新实施菜单统一。
- [ ] 新增 `tests/init-diagnostics.test.mjs`；更新现有 init-command tests 中旧长清单断言，而非降低无写验证。
- [x] 自检及独立只读审查通过；主复测259/259与审查八文件hash一致，提交S1相关code/tests/docs，不修改部署资源。

验收：A1/A3 的静态部分、A4 静态/no-task、A7 command 无写；同时模拟运行探测必须明确未完成，S1 不代表整个 MVP 可用。

## S2：有界真实上下文探测与配置消费

- [ ] 新增异步 runner、固定环境/argv、全局 deadline、流上限、进程清理、协议校验；包/source/target/重验共享实际读取预算，限量 provenance reader 在可终止 Node worker 运行，保留至少 2 秒收尾/报告，覆盖 spawn/exit/timeout/limit/cancel，各项独立失败。
- [ ] 配置/身份/workflow 通过安全快照传给共享纯消费 helper，不允许预读后默认 reader 无预算重开；身份 main-checkout 回退与 worktree 共同使用限量管道 Git transport，显式真实 trust/合法 developer/current key，非相关注册行不 resolve checkout。
- [ ] 实现固定 package bootstrap + 限长 stdin captured-source table，部署源逐文件比对 hash/mode，保留 namespace 白名单 loader/真实 __init__，不插入磁盘 sys.path；验证 flags/site/closure，禁项目 pyc/shadow。包/runtime gate 前零项目代码执行。
- [ ] 新增 `runtime/diagnostics.py`，提取共享 current payload/config/workflow 叶子给普通 CLI/consumer 同用；不 import task CLI、session_context、manager/cli/materials，不执行 default 全任务/history 或 hooks；Python 不启动下级子进程。
- [ ] 给配置 reader 增加可选诊断事实而不改默认消费语义：缺省/忽略/default 原因、TS 与 Python 实际生效差异；只读 Pi settings 不进入宿主锁/资源递归/npm。
- [ ] 新增 `tests/python/test_diagnostics.py`、`tests/diagnostic-runtime.test.mjs` 的 loader/runner/协议用例；复用完整 runtime fixtures 验证真实部署叶子 current/no-task/Phase Index 与普通消费者 parity，closure/source表必须进真实 baseline。
- [ ] runtime 新入口/source 变更与 `resources/runtime-baseline.json`、必要 provenance/fixture 变更同阶段耦合提交，绝不手改 `.trellis/scripts`/部署 manifest 充当产品修复。
- [ ] 独立审查确认实现、无写/无越范围读证据，主会话复核后提交 S2。

验收：A2 配置/上下文真实能力、A4 runtime、A5 source gate、A6 runner/import 防护、A7/A8；不能用 fake CLI 代替合法 manifest 的实际执行。

## S3：相关 worktree 与最终集成

- [ ] 在 Python 权威 worktree owner 增加 identity-only/no-materials 只读接缝，复用绑定/Git/marker 策略；不执行 readiness 管理或材料扫描。
- [ ] 从 source 与 managed target 两种 cwd 验证 exact 相关绑定、target runtime fence、source authorityRoot 当前 child pointer，复核 scope 不一致；不读取目标旧 task/pointer，不以 binding.contextId 替代实际 memo child key。
- [ ] running/preparing/unprepared/planning/no-binding 分类保持正常/未检查/故障的区别，不修复状态；坏新配置不破坏旧绝对 binding 诊断。
- [ ] source/target 的 Git/helper/temp/output 防护、deadline 共享和目标 gate 用真实 fixtures 验证；平台未验证项报告明确。
- [ ] 汇总健康、错误、blocked/取消、输出预算/省略情况；英文通知+中文用户 docs 明确静态与运行证据、只读和不可见能力限制。
- [ ] runtime/baseline 与本阶段 code/tests/docs 保持耦合；独立安全及跨层审查、主复核完整 diff、全量回归通过后提交 S3。

验收：全部 A1–A8；实际 no-write/no-extra-read、source/target CLI 执行与隔离清理均需证据。静态检查全部成功但核心探测未完成时不能验收。

## 验证命令与证据

以下是待执行命令，不是本轮 PASS。实施时先核对新文件实际存在，再执行；只使用隔离 fixture，不对用户项目主动运行诊断以补证据。

```bash
node --version
python3 --version
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test \
  tests/init-diagnostics.test.mjs tests/init-command.test.mjs \
  tests/adopt-project.test.mjs tests/initialization.test.mjs tests/unsupported-runtime.test.mjs \
  tests/project-activation.test.mjs tests/agent-context-integration.test.mjs
# S2/S3 新增 runtime/source 后：
python3 -B -m unittest discover -s tests/python -p 'test_diagnostics.py'
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/diagnostic-runtime.test.mjs
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test \
  tests/runtime-contracts.test.mjs tests/manifest-provenance.test.mjs \
  tests/worktree.test.mjs tests/worktree-cli.test.mjs \
  tests/preparation.test.mjs tests/skill-resources.test.mjs
# 每个 runtime stage 及最终集成：
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
python3 .trellis/scripts/task.py validate 10-15-init-check-diagnostics
```

缺 Pi peer 时只通过测试子进程 `PI_TRELLIS_TEST_HOST=<existing-Pi-node_modules>` 指向已有宿主，不安装。没有 lint/typecheck script，不记为 PASS；真实终端/在线模型不是本次 fixture 证明，也未授权运行。

必须补的负例：两个独立静态问题与 Python 不可用并存；config 回退/TS-Python 不一致；正常 empty lock；completed audit 后正常用户任务修改；pin/child/双会话；CLI no-task exit 1 与坏 JSON 区别；外部 task-store 与拒绝 target/session symlink；旧/坏 source/target runtime 零执行；worktree 当前任务不符、foreign Git、旧 binding+坏新配置；startup/.pth/pyc/shadow；TMPDIR=project；Git helper；输出爆量/超时/子孙收尾；重复/换会话/shutdown 无迟到报告。

每条实际运行记录环境、版本、exit code、通过/失败/未运行，失败不得因 cleanup 成功而抹去。保存必要 review/测试证据到 `evidence/`，研究发现才由 research agent 写 `research/`；主会话短结论记在本文件，不重复堆报告。

## 实施前与最终门禁

- [x] 用户审阅 PRD/design/本计划并明确批准实施；正常 start 为 in_progress。
- [ ] 确认有效运行时、并行变更和执行目录；不覆盖其他任务 baseline/workflow/materials 改动。
- [ ] 需要独立 review 时准备 check.jsonl 的真实 spec/任务/研究参考，执行角色还需自身上下文；当前 implement.jsonl 可保持未委派为空，validate 对空 manifest 的警告如实报告。
- [ ] 安全未知不能靠报告格式绕过；运行探测只能 blocked 时明确未达验收，再判断是否需要产品范围重新批准。
- [ ] 每 stage 独立审查后主会话核实际 diff/证据再提交，不等全任务结束堆提交；混合文件无法安全取自身 hunks 时报告阻塞。
- [ ] 最终证据对应实际最终源码与资源 hashes，A1–A8 映射全完成；finish 另需用户授权。

## S1 候选与主会话复核

实现者 `f4f09eea-eec4-49b` 第一轮超时后同上下文恢复，最终候选为新 diagnostics.ts、Check-only command delta、新 init-diagnostics tests及两个既有Check断言更新。主会话已全文读取实际代码/tests与 [S1 实现交接](evidence/s1-implementation.md)，确认原 menuSnapshot/写确认保持；extension单独注入真实memo key/source hint，cross-root S1 blocked而不猜来源。

实现者 focused 200/200；主会话 `b782fgwu6` 同九文件集，现有Pi1.2 peer、unset TRELLIS_CONTEXT_ID，**200/200自然 exit 0**。这只覆盖 S1，不代表A1–A8完整运行链路。S1同步读取仅字节预算/cooperative cancellation，无hard20s worker或Python probe。

独立审查 `9ecfb269-bf03-491` 已完成，限定 **S1 PASS**；具体修复与实际证据见 [S1 独立审查](evidence/s1-review.md)。主会话完整读取最终 diagnostics/command/tests，核对八文件 SHA-256 与审查报告相同。独立最终 focused **259/259**、全量 **545/545** 自然 exit0；此前并行 workflow/template hash 漂移导致的 full失败已保留，未改其资源，恢复一致后实际重验通过。

主会话最终复测 `bqvn5schp`：**259/259自然 exit0**，八文件审查指纹一致、diffcheck通过。S1检查点 **ad2187b**，精确17文件，不含raw logs/并行workflow/manifest。S1静态投影不能用作S2执行授权；S2需共享strict validator/worker/consumer真实探测，S3才补native跨root绑定证明。

## 最新源码收敛（2026-10-15）

- 前置菜单统一已归档；Check 从 command.checkProject 接入，Help/Cancel/noargs/写确认不重做。
- worktree `9ec131f`/`176619d` 已 source-authority/version2；child key 在 extension memo，pointer 位于源 runtime，目标无 task start/copy。诊断区分 authorityRoot 与 executionRoot，目标只验证相关绑定和执行环境。
- 现有 native diagnostics.py 是结构化异常 owner，不是探测入口；query 会读 source_materials/引用图，仍需 identity-only 接缝，不能把普通 query 当窄诊断。
- tests/material-sync.test.mjs 已删除，相关通用回归迁入 preparation/worktree。资源数量断言修复现已进入并行 worktree S3 工作区，本任务不重复修改。
- 本轮仅 planning 文档收敛；安全 loader/runner/worker 未实施，历史研究未重跑，不宣称 runtime/预算/只读已验证。

## 首轮规划核验（历史记录；目标 pointer 设想已被上方最新源码收敛覆盖）

- 当前会话 `session:pi-914c31f3a8d5` 已通过固定 `set_active_task()` 绑定；实际 `task.py current --json` 返回 state=valid、status=planning、stale=false。绑定后未运行 start/hooks。
- 任务 JSON、三份主文档相对链接、check.jsonl 引用存在性、任务 whitespace 与 `git diff --check` 通过。
- implement.jsonl 刻意为空：当前没有实施委派授权；不能将其描述为完整 CLI context validation 通过。
- 随后执行 `task.py validate` 的请求被宿主 runtime release 门禁阻断：`Unsupported project runtime release`，命令未启动。本轮不修复或绕过并行会话改变的部署状态；该 CLI 检查为 BLOCKED，不影响已有 planning 文件的静态核验，也不代表当前项目运行能力验收。
- 独立规划审阅 `f6212064-1580-403` 完成：方向可行，不是过度框架；主会话已整合共享读取预算/可终止验证 owner、安全消费者快照、身份与 worktree 共用 Git/env/trust seam、adoptionDialog 固定警告摘要。loader 具体实现作为研究依赖的 S2 技术门禁，不削弱 R5/A2/A6。
- 补充调研 `4be8244d-c44f-42c` 已完成并通读核对关键 source：采用 fixed bootstrap/部署字节捕获/内存 allowlist loader、shared current payload、纯 config/workflow helper、host-only 子进程与 targeted registration。未采用其 blanket 排除 target pointer 的范围建议：最终合同只允许当前任务权威 binding 指定的一个相关目标 pointer，通过独立 target gate 与相同窄 helper 验证，不运行 target CLI/材料/readiness 管理。
- 产品测试/真实诊断未运行；两项只读调研/审阅已完成并整合，不把规划证据当作产品验收。

## S2 主会话接线与验证（2026-10-15）

- 候选 22 文件与实现者最终指纹一致；实现者 focused 143/143、Python 33/33（日志主读）。
- 用户取消独立审查代理并要求主会话直接完成；**S2 未经独立审查**，此为已知缺口。
- 主会话接线 `extensions/trellis.ts`：Check generation/AbortController，新 Check 取消旧 run，`session_start`/`session_shutdown` 取消并抑制迟到报告；新增生命周期测试。
- `init-menu-safety` 旧 S1 断言（Check 零子进程/“runtime probe not performed”）更新为 S2 契约：只允许固定 `-I -S -B -X utf8` bootstrap spawn，禁 Git/exec，报告显式 blocked。
- 全量 `npm test` **582/582 exit0**（首次 575/582，7 项为上述旧断言）；Python 33/33；diffcheck 通过。
- 本仓真实 smoke：304ms，正确报告部署 runtime 落后包版本→runtime probe blocked，静态问题独立保留。
- 限制同 evidence/s2-implementation.md；S3 跨 root/worktree 身份未实施。
