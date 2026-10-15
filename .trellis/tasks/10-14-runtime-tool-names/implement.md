# 实施计划

## 当前状态

2026-10-15 用户明确批准激活并在当前工作区执行。`task.py start ... --allow-empty-context` 成功，session `pi-29d97c9035ea`，任务 in_progress／branch main／unbound；未创建 worktree。本次运行时门禁已允许正常 start，无部署修复／reload。S1 已提交 `56e8b9c`；S2 已提交 `94e54cf`，均仅范围内文件。源码实施与计划内验证完成，任务保持 in_progress 待用户验收／收尾；未安装、同步、reload、push或归档。

## 执行与审查

建议主会话直接实施 S1；S2 真实宿主探针可委派单文件实现以减少上下文，仍由主会话复核。本任务涉及公开接口和执行门禁，两个阶段均需独立合同审查。已准备 18 条真实 `check.jsonl` 引用；委派 reviewer 前刷新引用及明确本阶段范围，主会话复核实际 diff 与证据。实施角色无需为形式派发；S1 的 `implement.jsonl` 当时有意为空，S2 实际委派后已准备八条引用。

源目录已有其他任务的 runtime/material、workflow、角色、hash 和测试修改。实施前刷新 Git／文件基线；共享文件只修改本任务必要区域，冲突无法安全分离时停止并报告，不覆盖／打包提交他人改动。未指定 worktree，也不自动创建。

实施授权包含每个独立验证阶段由主会话提交本阶段范围。不推送、不改写历史、不自动归档。

## 启动前检查

- [x] 用户审阅更新方案并批准实施；本会话正常 start 成功，未绕过门禁。
- [x] 重新核对两仓库相关源码与新工具加载链；仅已有部署残留不纳入本任务提交。
- [x] 已读取 development/testing/shared guides 和相关 owner／完整测试，check JSONL 已准备。
- [x] 批准后已执行 `task.py start --allow-empty-context`；S2 后补实施引用。后续 validate exit0，两份 manifest 路径有效，但存在代码引用和大文件截断 warnings，执行者需全文读取。

## S1：入口与资源成套迁移

1. 在 `extensions/trellis.ts` 迁移能力提示、Trellis 执行识别、角色注入、异常处理和 shell／结果刷新白名单。保留控制流程，避免顺手抽象／重构。
2. `lib/subagent-rpc.ts` 的 description 与 source/managed 回复统一提供新管理／消息指引；保持参数、RPC、details 和占用逻辑。
3. 更新相关 fixture 的工具列表、事件名和 shell 参数；补真实新名的三个角色、非 Trellis 不变、unsupported/foreign/invalid marker/temp isolation、无任务与材料 fallback、前后台 bash／monitor prefix/refresh 断言。
4. 同步 `docs/dispatch.md`、`resources/templates/workflow.md`、两个技能参考的活跃入口。规范仅更新已有通用说明中的工具名，不新建功能 spec。变动 skill/template 的对应 baseline hash 在同阶段更新；不改 agent/runtime baseline 或 deployed 项目资源。
5. 独立审查所有新名路径，复核负例和被拒绝调用没有实际 spawn／写指针；主会话核 diff／测试后提交 S1。

相关测试：`agent-context-integration`、`unsupported-runtime`、`project-activation`、`initialization`、`adopt-project`、`task-display`、`dispatch`、`source-executions`、`task-context`、`worktree-protocol`、`workflow-policy`、`skill-resources`、`manifest-provenance`、`agent-documents`。查看实际 filename 再执行，不以搜索命中数宣称覆盖。

## S1 检查进度

主会话已完成入口／提示／fixture／资源迁移，未改 RPC 执行机制。用户最终指定警告为 `pi-trellis：未检测到 subagent_run。请确认 my-pi-preset 的 Task Composition 已启用并重载会话`。

- Node v24.14.1、Python 3.14.7；测试仅使用既有 host 1.2.0 node_modules。
- 聚焦十文件 164/164；补新角色／前后台负例的三文件 49/49。
- 全量 `PI_TRELLIS_TEST_HOST=<上述host> env -u TRELLIS_CONTEXT_ID npm test`：450/450，自然退出；Python unittest 20/20。
- 全量后只改变最终警告字符串和对应断言，单独重跑 agent-context integration：16/16；串联命令尾部的原生 provider `ls` 未找到路径导致整体 exit1，不是测试失败。独立审查 `328537d9-8724-41b` 已通过：216/216 自然退出、额外 disposable 门禁／截断／异常保持检查通过，无确认缺陷。
- 日志分别 `/tmp/pi-bg/b6qq9agiy.log`、`ba61dxjc1.log`、`bm8ot0yev.log`；这是 S1 检查记录，不代表当时新组合已验证。

S1 已提交 `56e8b9c`（23 文件，代码／测试／资源／规范／任务材料），未纳入五项部署残留或其他任务。S2 为减少真实宿主接线上下文，委派普通实现代理 `5606d46d-9ecf-4c0`，仅允许修改 `tests/provider-contracts.mjs`；不改变主会话对方案理解和最终验收责任。已补充 implement JSONL 八条真实引用；子代理无提交／生命周期权限，S2 仍需独立审查。

## S2：真实 provider／新工具组合验收

1. 重构 `tests/provider-contracts.mjs` 的旧结果／消息耦合：保留原生 provider 独立套件；新增 `--preset <preset-root>` 组合模式，显式加载本仓库 trellis.ts 和 preset task-composition.ts，不并载独立 agent 后端或原生 pi-subagents。
2. 原生 provider 与 preset 组合分别在独立进程运行并输出结论。临时 settings 持久写入两个组合入口供 child reload；断言唯一 task_manage/RPC 服务及实际 bash 后台 schema。组合测试经真实公开工具参数执行，不绕过 task_manage 接线直接调用内部 manager。
3. RPC spawn 返回真实 ID 后：list 正文/status metadata 定位；运行中 subagent_message 指导；wait 完成并消费精确 run，output 再读保留结果；list/status 不消费。status/output/wait/stop 不附 task_type，不把其他可选字段统一填满。缺失 ID／错误 run_id 明确拒绝；独立 RPC consume 不带 run_id，其语义单独验证。source trellis_dispatch 的真实 ID 同样可以管理并保持材料/cwd/独立会话。
4. stop 的回执／终态与 Trellis 占用分开断言，preserve unknown/shutdown/early-terminal 回归。无须在所有 action 上重复做 preset 自身后端测试。
5. 在获准使用的既有依赖上运行离线 SDK probe，记录准确 host/provider 版本、入口、工具集合、断言与实际退出／清理；没有依赖或授权时记 NOT_RUN，不能安装来填验收。
6. 独立 reviewer 审查真实接线与证据边界；主会话验证最终全量和资源检查，提交 S2。

## S2 检查进度

实现代理仅改 `tests/provider-contracts.mjs`，主会话全文复读实际候选后重跑指定 `--preset` 离线组合：exit0、自然退出。主日志 `/tmp/pi-bg/bihkqx3lf.log`；Pi1.2.0／Node24.14.1／preset0.1.0 revision `9687d94`。真实 RPC ID 新管理入口、错误字段／stale、运行中消息、取消等待保持运行、完整结果／消费通知正对照、真实 resume、后台 bash／workflow、source dispatch、cooperative stop/drain、child/main shutdown 与 RPC关闭后timeout全部通过。临时工作区清理成功，无 force-exit。

- 实现代理最终版本三轮probe自然exit0、CLI八负例／syntax检查通过（日志 `/tmp/pi-bg/bbj9ekni7.log`、`b31uy1qug.log`）。
- 原生 provider 本机未找到，NOT_RUN，不安装；monitor仅双源拒绝，未测成功流／WebSocket，不扩大为已验。
- 主会话最终全量450/450、Python20/20自然退出通过（`/tmp/pi-bg/bptgfns74.log`）；syntax和六CLI负例通过（`bnnv9ue5n.log`）。独立S2 reviewer `cd4a62da-3981-4bc` 初审发现 P2：成功wait后output掩盖wait未消费。主会话将output移到通知控制后，并添加已完成run的预先取消wait触发非消费reconsider，区分真正消费和只取消通知timer。修复后主probe `bbyra9x56` 自然exit0；最终独立反证复查通过：省略首次wait消费的扰动确实执行（sourceLoads=1/executions=1），在通知断言 `7 !== 6` 自然exit1，非加载／wrapper错误，日志 `bwgn6sjnn.log`。预先取消retrieval wait不消费也不停止目标的源码语义已复核，P2关闭，无新确认缺陷。
- S2 阶段提交 `94e54cf`：probe、testing规范、实现JSONL与PRD／执行记录共五文件。首次提交因并行 index.lock 失败；只读核查后锁已自行释放，未删锁，重试成功。暂存区已清空，五项既有部署残留和其他任务未纳入。
- 主会话补充既有 testing spec 的 `--preset` 用法与证据界限；不新增docs测试教程或修改邻仓产品。

## 测试命令（执行结果见上述阶段记录）

本仓库没有本地 node_modules；已发现现有 host 路径，下列设置只作用于测试 subprocess：

```bash
HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules
node --version
python3 --version
PI_TRELLIS_TEST_HOST="$HOST" env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/agent-context-integration.test.mjs tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/initialization.test.mjs tests/dispatch.test.mjs tests/source-executions.test.mjs
PI_TRELLIS_TEST_HOST="$HOST" env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/skill-resources.test.mjs tests/manifest-provenance.test.mjs tests/agent-documents.test.mjs
PI_TRELLIS_TEST_HOST="$HOST" env -u TRELLIS_CONTEXT_ID npm test
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
git diff --check
```

S2 已新增 `--preset` 参数，实际组合使用以下命令：

```bash
env -u TRELLIS_CONTEXT_ID node tests/provider-contracts.mjs --host /Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules --preset /Users/jyxc-dz-0101322/tools/my-pi-preset
```

原生模式保留 `--host <node_modules> --provider <实际已获准的provider-package-root>`，与组合模式分进程运行；实际 provider 路径须在执行前确认，不猜测／安装。禁止把 preset 根当作具有 `src/index.ts` 的 provider，也禁止沿用固定“Pi 1.1”成功日志。preset package test 会 link SDK 且 force-exit，不运行它来证明本次自然退出组合；本任务的 probe 直接使用既有依赖。

无 lint/typecheck script，不能写 PASS；离线 scripted SDK 不证明在线模型、真实 terminal 外观或当前安装组合。实际 provider/terminal 执行须明确获准；未执行时 A6 不算通过。

## 规划检查与证据（历史阶段）

首次本地 JSONL 路径检查在 `design.md` 尚未写入时失败，属于规划写入顺序问题；文件补齐后重新检查，不能将首次失败记成通过。

文件补齐后本地检查通过：三个 Markdown 的相对链接／锚点／whitespace、task JSON planning/unbound、check JSONL 18 条路径与 `git diff --check`。S1 完成时 `implement.jsonl` 按直接实施计划有意为空，S2 实际委派后已补齐；当时未运行被门禁阻断的 task CLI validation，不称其 PASS。产品 owner／test／resource 七目录指纹在只读基线后保持不变，其他任务与 testing/tmux 的变化来自并行活动。

2026-10-15 邻仓核对完成：主会话复读 contracts、facade、management、composition、RPC、source 与公开 launch/message schema，确认真实 ID／按动作参数／消费语义和唯一组合加载入口。代理早期的本任务状态描述已过时，仅采用可复核的接口结论；当时尚未执行新组合，后续执行结果见 S2。

规划阶段只检查任务 Markdown／JSON／JSONL／路径与 whitespace，不跑产品测试。主会话分析写规划／执行记录；若需保留 reviewer/test 证据放 `evidence/`，不写 `research/`。

当前任务 in_progress，已按明确授权写本会话 pointer 并实施；非任务变化按并行来源报告而不误归本任务。历史 PASS 不是后续版本的组合验收。
