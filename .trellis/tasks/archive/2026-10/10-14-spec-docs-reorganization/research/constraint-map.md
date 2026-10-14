# 旧约束 → 新规范位置

本轮提炼而非逐段拼接。首轮 13 份/719 行，最终 7 份/250 行（含三个 guides 兼容入口）；未以行数代替安全审查。

| 旧位置/有效约束 | 新位置 |
| --- | --- |
| extension/architecture：ESM、owner、source/deployment、局部 runtime validators、argv/Git env、Unicode、cosmetic vs fail-closed | development/index：Source Ownership and Coding；Identity；Files |
| extension/session-and-context：root/session/key、CLI provenance、child pointer/non-resurrection、材料 containment/UTF-8/限额、owned marker、动态材料与稳定缓存 | development/index：Identity, Context and Materials；testing 对应回归矩阵 |
| extension/worktree-lifecycle：approval/preview、canonical identity、ignored paths、prepare 选中材料/target hook、strict ready、public cwd RPC、starting/unknown/stop、conditional source lock、dead-owner proof、removal | development/index：Worktree, Dispatch and Failure Preservation |
| worktree 材料：Python 唯一 owner、B/S/T/ancestry、prospective overlay、task lifecycle projection、显式 collect dependency/no deletion、revision/check stale、partial retain/limits | development/index：Worktree, Dispatch and Failure Preservation；无需另存内部 snapshot schema/字段手册 |
| scripts/installation：安装≠初始化、user-owned config/spec、safe update/adoption 区别、canonical recovery、manifest last、partial preserve、template backups、resource/phase markers | development/index：Files, Publication and Resource Provenance |
| scripts/provenance：0.6.16 runtime vs 0.6.17 roles、MIT/AGPL、full source/output hash、adaptAgent exact anchors、custom role preserve、source integrity不由stamp证明 | development/index：Files；testing：Role Source Maintenance；docs 保必要版本/artifact/许可归属 |
| documentation：语言、docs用户/spec开发测试/tasks历史、当前链接/JSONL、归档不批改、无隐式运行授权 | development/index：Documentation Maintenance and Review；testing：Reporting |
| quality：real host peer、subprocess-only unpin、无lint/typecheck、fixture commits、negative preservation、final inputs rerun、证据层级 | testing/index：Commands、Fixture and Regression、Reporting |
| docs/testing/provider：现有明确路径、真实loader/RPC脚本化offline、不混冲突provider、不安装、exit/children核验、NOT_RUN | testing/index：Optional Installed-Host/Provider Probe |
| docs/testing/tmux：唯一服务、隔离HOME/config/session、existing CLI、最小矩阵、条件等待、新帧/SGR、focus/action、报告误判、owned进程清理 | testing/tmux.md：完整英文方法 |
| 两份 thinking guide 的重复正文 | guides 三兼容入口：短问题，链接开发/测试正文 |
| runtime-baseline 的底层 task/journal/identity 安全规则 | development/index：Task, Journal and Developer Safety |
| viewer/display 的测试/实现细节 | testing/index：boundary matrix 与 preservation/long-doc要求；用户功能/key/错误留docs |

## 引用处理
- 当前 README/docs/spec 无旧层级、docs/testing、docs/plans、旧基线路径引用。历史归档与 task research 保历史语境，不批量改写。
- 当前活动任务六个 JSONL 全为空，无真实 file row 待迁移；保空，不造引用。并行新任务 `10-14-user-level-project-activation` 未动。
- packages 发现 development/testing；guides 路径保留；不改模板/skills/runtime/workflow/config。

## 自检发现与修正
- 链接检查首次将 `scripts/sync-agents.mjs:adaptAgent()` 当完整文件路径，属于检查器解析误判；切分符号后复查 16 Markdown/71 links/anchors、证据路径/空白/spec英文与活动JSONL通过。未修改产品来迁就检查。
- 文档矩阵曾引用不存在的 `tests/project-resources.test.mjs`，实际核文件名后移除该虚假证据；保真实初始化/来源/模板测试。
- docs/dispatch 移除 source record hash/锁实现手册段落，保可见 unknown/stop/不能自动解除限制。
