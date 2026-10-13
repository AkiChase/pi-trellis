# 澄清任务解绑与工作收尾命名

## 目标

区分取消本会话任务激活、工作收尾、任务归档和 journal 记录，避免把解绑当成任务完成。

## 已批准范围与决策

用户确认不考虑兼容，并于 2026-10-14 批准执行、提交、收尾归档。

- `runtime/task.py`：`finish` → `deactivate`，`cmd_finish` → `cmd_deactivate`，`after_finish` → `after_deactivate`；旧命令和旧 hook 不保留兼容。
- help 与示例明确仅清除当前会话绑定，不完成任务、不归档、不记录 journal。
- `skills/trellis-finish-work/SKILL.md` 和 `skills/trellis-meta/references/local-architecture/task-system.md` 更新解绑命令和语义；保留 finish-work skill 名称及授权边界。
- 更新包 workflow 模板的两处解绑命名、相关测试和包源码 runtime/skill/template 资源 hash/releaseId。本项目 `.trellis/config.yaml` hook 注释、`.trellis/workflow.md`、`.trellis/scripts/` 和部署清单保持不变：用户明确要自行验证 init 的 Update resources。
- 不改任务状态模型、归档条件、journal 脚本、UI、历史任务/journal；不安装、部署、reload 或 push。当前生命周期通过已有 CLI 执行归档。

## 事实与变更边界

原 `runtime/task.py:268` handler 仅调用 `clear_active_task`，成功清除有效绑定后执行解绑 hook。业务行为保留，改名在 CLI owner 处实现，不在 extension 拦截。
引用已查明：runtime 本体、两个 skill、包 workflow 模板，以及 runtime-contracts、initialization、agent-context-integration、task-display、unsupported-runtime tests。项目配置和 workflow 的旧引用按用户要求保留，不同步。
资源源证据和 license 元数据保持不变，仅更新 adapted hash 与 runtime releaseId。

## 验收标准

- [x] `deactivate` 仅清除本会话绑定；任务状态、其他会话绑定和任务目录不变。
- [x] help、活跃包 skill 统一用新命令/hook，并区分归档、记录和工作收尾；项目配置示例按用户要求保留。
- [x] 旧 `finish` 拒绝执行且不清指针；旧 hook 不再触发；有效解绑新 hook 仅执行一次，失效绑定无 hook。
- [x] focused 与全仓测试、资源一致性和 diff 检查通过，未跑的检查明确记录。
- [ ] 本任务单阶段工作独立提交，随后归档并记录 session，保留并行 journal/index 内容。

## 轻量执行计划与检查点

PRD-only，主会话直接实现；unused role JSONL 保持空，start 使用 `--allow-empty-context`，不假称 manifest 全验证通过。

1. 修改 owner、两个 skill、包 workflow 模板/runtime 文档与相关 tests，刷新包 hash；不触碰本项目部署资源和配置。
2. 主会话检查实际 diff；用普通只读审查代理独立核对明确无兼容的命令/hook 接口及保留边界。不是 managed worktree 执行，不派发可修改代码的 Trellis role。
3. focused：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/runtime-contracts.test.mjs tests/initialization.test.mjs tests/agent-context-integration.test.mjs tests/task-display.test.mjs tests/unsupported-runtime.test.mjs tests/skill-resources.test.mjs`。
4. full：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test`；`git diff --check`。无 package lint/typecheck，不能标绿。
5. 检查全部实际改动和独立审查结果后，单阶段提交耦合工作与 PRD/证据；记录检查点 hash，不改写历史。
6. 已批准收尾：`task.py archive <exact-task> --no-commit --skip-branch-validation`（当前 main 直接实施、非 PR 任务），检查本会话绑定清除；`add_session.py ... --no-commit` 写 summary。归档改动单独提交；journal/index 的并行既有修改不得混入。
