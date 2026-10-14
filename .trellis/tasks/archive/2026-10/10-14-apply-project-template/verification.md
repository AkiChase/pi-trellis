# 主会话实现与验证

## 实现范围

主 Agent 直接实现 PRD-only 单阶段，新增资源 owner 的 templatePlan/applyTemplatePlan，复用资源 manifest、路径/hash 与 lock 校验，提取 atomicFile 给两个发布路径使用。
command 新增 Apply template 和 Workflow/Spec/Workflow + Spec 范围，最后通过原生 select 显示列表及 Cancel/Apply template，只有一次最终确认，无 diff UI。
仅处理五个固定目标，manifest 记录所选来源；替换前全部原文档和 manifest 备份到 runtime/template-backups/uuid，部分失败保留数据。
README/docs/initialization 同步文案，新增 apply-template tests，扩展 init-command tests。

## 验证证据

- focused：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/apply-template.test.mjs tests/init-command.test.mjs tests/resource-update.test.mjs tests/initialization.test.mjs`：53/53 passed，`/tmp/pi-bg/b97k8dp6r.log`。
- 第一轮 full 被并行 finish-work task 的 workflow 模板/hash 短暂不一致阻断；该批代码非本任务所有，不修改。收敛后重跑 full 通过；审查修复后最终 full：同一 env `npm test`，350/350 passed，日志 `/tmp/pi-bg/bixni3qpj.log`。
- 审查修正后的 focused 同一命令：56/56 passed，日志 `/tmp/pi-bg/bap1gmp2m.log`。
- `git diff --check` 通过。
- 普通独立只读安全审查 dd4dcb5c-e26b-4a7 发现包模板发布期 drift 与 init operation schema 缺口；主 Agent 加入 authoritative verifyRuntime、operation fingerprint 和最终 manifest 对比，并补3个回归测试；独立复查确认无剩余 scoped finding，56/56 focused 复验通过。不是 delegated implementation，不派发 Trellis 修改角色。
- 未安装、同步项目资源、真实 UI Apply、reload、push；测试仅 disposable fixture + mocked native dialogs。
- 无 lint/typecheck script。

## 保留的并行修改

`.trellis/scripts/task.py`、`.trellis/.pi-trellis.json` 为用户验证 Update resources 产生，workspace journal/index 为前任务记录，均不混入功能提交。
role JSONL 按轻量 direct 路径保持空，start 使用 --allow-empty-context，未声称 validate 全绿。

## 验证与剩余步骤

主会话已读完整 resources/command、engine 和相关 tests，实际 diff 已检查。预览与新确认流程使用已有 native select，支持 interactive/RPC，不新增 custom TUI。
全仓测试与独立复查通过，工作提交 `300f2cc`。用户随后明确授权收尾，接受本任务完成并归档、记录 journal；该授权不补充真实 UI 验证证据。本次仅更新验收记录，产品输入未变化，沿用最终有效测试结果。仍未运行本项目 Apply template、安装、reload 或 push。

## 规范评估

当前项目规范已有原子发布/授权/资源 ownership 合约，本次复用；产品行为在 docs/initialization 记录，不制造额外 spec 改动。
