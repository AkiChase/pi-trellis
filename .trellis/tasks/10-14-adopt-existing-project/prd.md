# Adopt existing Trellis project

## Goal

让有 `.trellis/` 但无受管清单的旧项目通过 `/trellis-init` 显式接管，无需手工搬迁 tasks/spec/workspace。

## Background

`tools/my-pi-preset`、`tools/test` 的旧 0.6.16 结构加载新包后被阻断。此前推断报错必然来自这两个项目并不严谨：目前只确认它们符合该错误的触发条件，而当前 pi-trellis 根的 `verifyRuntime()` 通过。

代码证据：`engine.ts:211-216` 将无 manifest 的已有项目判为 unsupported；`engine.ts:388` 的 `plan()` 不接受 unsupported；`command.ts:96,113` 只报错；`resources.ts:22` 要求受管清单；`extensions/trellis.ts:172-177` 阻断无受管运行时。`docs/initialization.md` 公开契约尚未提供接管入口。`engine.ts:19-21,155-162` 和 `resources.ts:30-38` 已支持 preserved-project 模板来源。

旧项目已有旧 scripts、三份 `.pi/agents/trellis-*.md`、自有 workflow/config/guides/tasks/journals、合法 identity；缺 `spec/index.md`。旧 AGENTS.md 含一对 TRELLIS 标记但正文不同，`appendBlock()`（engine.ts:248-256）会拒绝。遗留 `.version`、两份 hashes、`.trellis/agents/` 和清单外脚本不属于新清单。

## Requirements / Decisions

- R1 unsupported 无清单项目提供英文 **Adopt existing project**，其他损坏/不支持清单仍拒绝。
- R2 一次 action-list 确认列出 Install / Replace / Create / Preserve / Current / Legacy；Cancel、--check、无 UI 零写入。
- R3 用包基线替换受管 scripts 与三个角色，**不备份**（用户明确同意）；不执行旧脚本。
- R4 既有八个模板目标保留 bytes/mode，记 preserved-project + 实际 fingerprint + 项目 HEAD/null；缺失目标安装默认，记 package-default。其余 specs/config/workflow/tasks/workspace/journal/identity 不改。接管不创建 onboarding/bootstrap 任务；没有 identity 时落 supported，后续用原身份入口。
- R5 AGENTS.md 只替换唯一 START/END（含标记）的块，块外 bytes/mode 保留，不备份。无块可追加；重复/残缺/错序拒绝。根 ignore 规范块与 journal attributes 沿用严格原语。
- R6 共享 init.lock、每次复查、资源先落盘、清单最后发布；无备份、删除或自动回滚。中断无清单可重新预览并显式接管；不写异形 InitPlan operation 记录。已有锁/operation/worktree 拒绝。
- R7 `.version`、两个 hashes、`.trellis/agents/` 和清单外脚本**保留并在确认和完成摘要列出**（用户已决），枚举有界并注明省略。
- R8 更新 README/docs 的入口与契约；覆盖成功、取消、保留、字节/模式、幂等、并发、伪造计划、锁、链接、损坏清单、中断重试与执行放行。

## Acceptance Criteria

- AC1 临时旧项目经菜单确认接管后为 ready/supported，verifyRuntime 通过，运行时调用不再阻断。
- AC2 所有包清单路径 bytes/mode 与基线一致；无备份目录或删除，AGENTS.md 块外完全保留。
- AC3 自有模板/tasks/history/identity bytes/mode 不变，来源正确；缺失 spec/index.md 默认创建。
- AC4 已成功项目不重复 Adopt；中断无清单可重新显式预览接管，错误如实报告部分写入。
- AC5 HOME/managed worktree/锁/已有 operation/损坏清单/符号链接/非普通目标/陈旧或伪造计划拒绝，前置拒绝零写入。
- AC6 focused + npm test 通过，独立审查、最终实际 diff 与测试证据由主会话复核。

## Out of Scope / Authorization

不做通用 upstream 迁移、旧 trellis update 兼容、远程模板、强制非交互写入、自有 spec 重组、真实用户项目接管、安装/sync/push。用户已授权本任务规划、实施至验收和 scoped local commits；没有授权归档或真实 UI/用户项目写入。任务文档中文，产品界面英文。

## Verification (main session)

- 阶段提交：4058243（block 原语）、eaaf319（adoption 发布路径）、977bb35（命令层入口），文档与独立 review 修复在最终提交。
- 独立 review：`trellis-check` d33d4d90 修 9 项（发布前清单校验、finally 锁 ENOENT、显式 lock 前置、条目级扫描上界、`Append block` 标签真实性、`replaceBlock` 重叠/前后缀分别检测、`--check` 只读降级、README/docs 过度表述），新增 13 条负向/保留断言；主会话已逐条核对 actual diff。
- 主会话最终复跑：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<pi 1.2.0 node_modules> npm test` → 373/373 pass；`git diff --check` 干净。
- 未验证：真实 TUI 视觉、真实用户项目接管（my-pi-preset / tools/test 未改动）、非 POSIX 平台与 Python 矩阵、OS 级并发祖先替换；包无 lint/typecheck 脚本。
- AC1–AC6 以上述自动化证据满足；AC6 的"真实 UI 接管"部分仍待用户在实际项目确认。

## 追加缺陷修复：对话框文本无界（用户报告）

证据：宿主 `dist/modes/interactive/components/extension-selector.js` 将标题与全部选项逐行渲染，无视口/滚动/高度钳制；`interactive-mode.js:2153` 的 confirm 走同一组件。标题越长，选项越被挤出屏幕。影响面不止接管：`planSummary()`（全新初始化约 50 行）、资源更新摘要、Apply template 摘要、接管确认（最坏 43 行 + 256 行 legacy）。

修复：`command.ts:boundedDialog()` 把任何对话框正文钳到 14 行并附 `/trellis-init --check` 指引；`adoption.ts:adoptionDialog()` 在确认框只给各状态计数 + legacy 路径计数；完整逐路径报告保留在 `--check` / 状态通知（普通消息可滚动）。覆盖 300 个 legacy 文件 + 全新初始化长计划的断言在 `tests/init-command.test.mjs`。最终 `npm test` 374/374。未做真实 TUI 视觉确认。
