# 修正 Trellis 收尾授权与自动提交

## 目标与授权

用户认可完整方案并授权创建轻量任务、实施及本地提交。统一 `trellis-finish-work` 收尾授权，恢复按配置自动提交适用的收尾变更，不再额外拆分归档/日志授权。用户追加授权：本任务结束后单独提交 workspace 中残留的 Session 7、8 两份文件改动。

## 背景与边界

- `skills/trellis-finish-work/SKILL.md` 强制 archive/add_session 使用 `--no-commit`，又无后续提交检查，导致日志残留。
- `runtime/add_session.py:_auto_commit_workspace` 默认受 `session_auto_commit` 配置控制，限定当前开发者 journal/index 和当前绑定任务路径，不会带上其他路径的暂存文件；同路径的并行修改仍须审查。
- `runtime/common/task_store.py:_auto_commit_archive` 限定归档源/目标与受影响子任务路径。
- 行为归属是包 skill 与工作流模板，不修改 Python 逻辑、部署 `.trellis/scripts`、本项目 workflow/config/manifest，不 install/sync/reload/push。
- 保留 `apply-project-template` 并行任务全部改动；残留日志只单独提交用户指定范围，不覆盖后续并行新增记录。

## 实施要求

1. 收尾授权涵盖验收通过后的适用归档、解绑、日志与其本地提交；无需逐项再问，尊重用户限制，不隐含 push。
2. archive/add_session 默认不加 `--no-commit`，沿用 `session_auto_commit`；用户明确不提交或实际提交范围混有无法纳入的并行修改时才使用该选项。配置关闭时不以手动提交绕过。
3. 执行前检查完整提交路径与实际 diff，执行后核实 commit/残留；受限安全拆分或报告阻塞，不静默忽略失败。
4. 同步 `resources/templates/workflow.md` 3.5 与 completed breadcrumb，更新两份 adapted hash，仅保留既有来源/许可证证据。
5. 增加 workflow-policy 回归测试：正常命令无 no-commit、单一授权、配置与并行保护、失败核实。

## 验收标准

- [x] skill 和 workflow 不再要求单独 archive/journal 授权；默认允许配置控制的收尾自动提交。
- [x] 不越过验收、用户 no-commit、配置 false、并行范围、push 边界；未完成任务不归档。
- [x] focused workflow/skills/初始化/runtime 检查及 full suite 通过；记录实际限制。
- [x] 包来源 hash 校验、diff whitespace 通过；本任务未修改已部署资源或并行工作。
- [x] 修正提交与 Session 7、8 日志提交分离，检查各提交准确范围。

## 单阶段与验证

主会话直接实施并自查：只改变既有自动提交策略的文字路由，不改 Git 算法或扩大提交路径；不派发角色，两个 role JSONL 有意为空，start 使用 `--allow-empty-context`，validate 的空清单诊断如实记录。

阶段 checkpoint：skill/workflow/tests/hash/本任务 PRD 同一提交；随后单独提交残留日志。

命令：

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/skill-resources.test.mjs tests/initialization.test.mjs tests/runtime-contracts.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

无 lint/typecheck 脚本；文字与真实 fixture 检查不证明真实模型遵循 skill。不将实施授权推断为本任务归档授权。

## 验证记录

- 主会话自查实际 skill/workflow/tests/两份 hash diff，通过；未使用独立 review，不声称独立验收。
- 首次命令因缺少本地 `pi-tui` peer 在 preload 阶段失败，0 个业务用例运行；没有安装依赖。
- 以 `PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules` 指定现有 host，以上 focused 命令 61/61，通过；full 命令 347/347，通过。两命令仅对测试子进程 unset `TRELLIS_CONTEXT_ID`。
- `git diff --check` 与新 PRD whitespace 检查通过；来源证据/许可证不变，仅两个 adapted sha256 更新。
- `task.py validate` 报 implement/check 两个有意为空的 manifest 错误，与 direct/self-review 路径相符，不称完整 validate 成功。
- Spec 评估：现有 installation-and-patching 归属/验证规范仍适用，本次完整操作策略在 skill/workflow，有对应 regression，无需复制策略到 spec。
- 并行 apply-project-template 在验证中继续修改 README/docs/init/tests 等；本任务未动这些文件或部署资源，不将它们纳入提交。
- Checkpoint：`8e5aa2d` 仅包策略、两份 hash、回归测试和本任务材料；`8bc285a` 仅用户追加授权的 workspace 两文件 Session 7、8 残留（68 insertions/2 deletions）。最终两文件相对 HEAD 干净，其他并行修改仍保留。
- 实施与提交验收项均完成；未运行本任务 archive/deactivate/add_session，未 install/sync/reload/push。任务保持 in_progress 等待收尾。
