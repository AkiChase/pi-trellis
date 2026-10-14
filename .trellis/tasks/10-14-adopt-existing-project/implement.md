# Implementation plan — Adopt existing Trellis project

执行者：主会话直接实施（范围清晰、上下文已在手），每阶段完成后自检；最后一阶段前安排一次独立 `trellis-check` 复核（接管会替换运行时文件并改写用户 `AGENTS.md` 托管块，属跨模块契约与潜在数据损失风险）。

提交策略：用户已授权实施到验收并自主提交，**不 push、不做个人 install/sync/reload、不在真实用户项目上执行接管**。每阶段验证通过即提交该阶段。

## Stage 1 — engine 原语与导出

- `lib/initialization/engine.ts`：新增 `replaceBlock()`、`projectRevision()`；导出 `template`、`appendBlock`、`journalAttributes`、`replaceBlock`、`projectRevision`。
- `inspect()`：`unsupported` 诊断改为可执行文案（指向 Adopt），保留"无通用迁移"的表述。
- `lib/initialization/resources.ts`：导出 `read`、`stamp`、`equal`、`atomicFile`。
- 测试：在 `tests/initialization.test.mjs`（或新建用例文件）覆盖 `replaceBlock` 的唯一标记替换、块外保留、重复/错乱/残缺拒绝、空输入行为。

验证：`node --import ./tests/host-tui.mjs --test tests/initialization.test.mjs tests/manifest-provenance.test.mjs`

提交检查点：Stage 1 全部文件 + 新增用例。

## Stage 2 — `adoption.ts`（计划 / 发布 / 状态）

- 新建 `lib/initialization/adoption.ts`：`adoptPlan()`、`applyAdoptPlan()`、`adoptionStatus()`，按 design 第 3–5、7 节实现（前置条件、六组行为、签名复查、共享锁、幂等重试、清单最后发布、发布后 `verifyRuntime()` + `inspect()` 验证、零备份零删除）。
- 新建 `tests/adopt-project.test.mjs`：design 第 8 节 1–5 项（含 0.6.16 形态夹具）。

验证：`node --import ./tests/host-tui.mjs --test tests/adopt-project.test.mjs tests/resource-update.test.mjs tests/apply-template.test.mjs`

提交检查点：`adoption.ts` + 其测试（与 Stage 1 的导出耦合已在上一阶段落地）。

## Stage 3 — 命令层集成

- `lib/initialization/command.ts`：`unsupported` 菜单（Adopt / View project status / Cancel）、Adopt 预览与一次确认、成功后 `refresh` + `ctx.reload()`、`--check` 与 `View project status` 在 `unsupported` 时走 `adoptionStatus()`、`INIT_HELP` 增补。
- 测试：`tests/init-command.test.mjs` 增加菜单/取消/确认流程；`tests/adopt-project.test.mjs` 增加接管后 `extensions/trellis.ts` 不再阻断 runtime 的断言。

验证：`node --import ./tests/host-tui.mjs --test tests/init-command.test.mjs tests/adopt-project.test.mjs tests/unsupported-runtime.test.mjs`

提交检查点：命令层 + 测试。

## Stage 4 — 文档与最终集成验证

- `docs/initialization.md`：修订 "Public init cannot ... initialize a manifest-less legacy project" 契约，新增 "Adopting an existing project" 小节（语义、保留/替换清单、零备份零删除、锁与幂等恢复、身份后置、验证限制）。
- `README.md`：菜单说明补充 Adopt 动作。
- 独立 `trellis-check` 复核（已准备 `check.jsonl`）：核对实际 diff 与 PRD 验收、数据损失面、清单 provenance 合法性、测试真实性。
- 最终验证：`npm test`（全量）。

提交检查点：文档 + 任何复核修复 + PRD 验收证据。

## 风险与回滚点

- 高风险文件：`lib/initialization/engine.ts`（受管清单与路径校验的权威实现，不得放宽既有 `fresh`/`identity` 约束）、用户 `AGENTS.md` 改写路径。
- 任何阶段若发现需要放宽 `engine.ts` 既有 `validatePlan()` 规则，停止并回到规划（说明表示接管应保持在独立模块内）。
- 回滚手段：各阶段独立提交，可按 commit 粒度回退；产品侧无自动回滚（设计即"保留部分写入 + 幂等重跑"）。

## 用户约束记录

- 旧版遗留文件一律保留并在摘要列出（D1）。
- `AGENTS.md` 托管块直接替换、不备份；旧 runtime/角色文件替换同样不备份（D2）。
- 不 push、不执行真实用户项目接管、不做个人 install/sync/reload。
