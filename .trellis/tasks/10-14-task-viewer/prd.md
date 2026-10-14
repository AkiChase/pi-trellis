# 任务查看器名称与展示优化

## 目标

让只读任务查看器同时展示可定位的英文任务标识和原始中文标题，并让新任务优先出现；将命令命名为 `/trellis-task-viewer`，明确只读用途。

## 背景与证据

- `lib/task-browser/reader.ts:122` 当前通过 `title ?? name ?? id ?? 目录名` 选择单一标题，中文 title 会遮蔽英文标识；`reader.ts:220` 的 taskLabel 只输出该标题。
- `lib/task-browser/reader.ts:106` 当前按目录名字典序升序枚举；projectTree 保留同层顺序并将子任务放在父任务后，不按状态、优先级或时间字段排序。
- `lib/task-browser/component.ts:173` 的 Overview 未单独列出 Name/Title；列表在 `component.ts:207` 起优先保护当前标记与状态。
- `lib/task-browser/command.ts:8` 注册 `/trellis-task`；README、测试和 `.trellis/spec/extension/task-browser.md` 有相关命令契约。
- 用户已批准本 PRD 实施，并授权完成后直接收尾，包括 scoped local commit、归档、解除本会话绑定及 journal；不推送或安装。

## 范围与要求

### R1：英文标识与原始标题同时展示

- 列表格式：`[status] MM-DD-english-slug · 原始标题`，保留当前任务标记和父子树线。
- 英文标识使用实际任务目录 basename，方便定位任务文件；不翻译或凭空生成英文名。
- 中文/原始标题沿用现有 title/name/id 回退，若与目录标识相同则不重复展示。
- 状态和当前标记优先保留，剩余宽度优先展示英文标识，标题允许截断；极窄终端无法容纳完整标识时安全截断，详情可查看完整内容。
- 详情明确列出 Name、Title（存在时）和 Path，保留原始值及终端控制字符清理。

### R2：同层从新到旧

- 将现有目录排序改为字典序降序；顶层任务和同一父任务下的子任务一致应用，子任务仍紧跟父任务。
- 列表说明以英文明确标注目录降序；不引入状态排序或排序切换。用户追加批准一个特例：当前会话任务所在整棵顶层树置顶，父任务及祖先保持在子任务之前；树内及其他任务仍按目录降序。独立当前任务直接成为第一行。
- 这是日期前缀目录的新到旧约定，不宣称是精确创建时间排序：同日按完整目录名降序，MM-DD 前缀无法表达跨年先后。精确时间排序不在本次范围。

### R3：命令改名

- 仅注册 `/trellis-task-viewer`，不保留 `/trellis-task` 别名。
- 同步 Usage、错误/模式提示、README、测试和项目 spec 中的用户命令引用。
- 不改动内部 `trellis-task-state`/`trellis-task-status` 消息类型或其他任务 CLI。

### R4：功能文档归位（用户追加授权）

- 每个小功能的说明放根目录 docs/，不放 .trellis/spec/；spec 保留跨功能开发规范、架构及安全边界。
- 将任务查看器文档迁移为 docs/task-viewer.md，修复导航与相对链接；将 architecture.md 中持久任务展示说明抽到 docs/task-display.md。
- 检查其他现有 spec：会话隔离、worktree 跨模块契约、安装/provenance 和质量指南作为通用规范保留，不改包技能或模板资源。
- 添加 docs/index.md 功能文档入口及项目 spec 中的文档归属规则，README 链接到具体功能文档。

## 验收标准

- [x] AC7 / R4：小功能说明位于 docs/，spec 不再包含独立 task-browser.md 和 Task Display Contract；导航及文档链接有效，通用规范保留。
- [x] AC1 / R1：有中文 title 的任务在宽列表中同时可见目录英文标识与中文标题；同名回退不重复。
- [x] AC2 / R1：详情可查看完整 Name、Title、Path；长英文名、中文、窄屏不越界，保留状态/当前标记与树结构。
- [x] AC3 / R2：多日期顶层及兄弟子任务按目录降序排列，父子关系不变；同日排序确定，刷新保留 canonical selection。
- [x] AC4 / R3：新命令可用，旧命令不再注册；README、Usage、spec 和测试同步。
- [x] AC6 / R2：当前会话任务所在顶层树置顶（含嵌套祖先），树内同层顺序不变；无当前任务或无效指针仍降序；刷新改变当前任务后正确重排并保留选择身份。
- [x] AC5：现有只读、安全读取、归档排除、导航与文档浏览回归通过，无任务生命周期或模型调用副作用。

## 实施与验证计划

轻量单阶段：主会话直接实施，并按 trellis-check 自审；不创建委派 worktree 或角色上下文作为仪式。若发现超出显示/排序/命令引用的公共兼容性风险，再明确独立评审需求。

1. 实施 R1/R2/R3，同步相关 reader/UI 测试、README 和 docs/task-viewer.md。
2. 聚焦验证：`node --import ./tests/host-tui.mjs --test tests/task-browser-reader.test.mjs tests/task-browser-ui.test.mjs`。
3. 全量验证：`npm test`；检查 `git diff --check` 及用户命令引用，区分内部消息类型。
4. 主会话核实际 diff 和只读回归证据，完成一个阶段的 scoped local commit（仅在获得实施授权后）；不推送。

## 排除与限制

不改 task.json schema、任务 CLI、持久任务计数、归档展示、父子链接规则或资源部署/runtime。不开排序设置，不恢复旧命令别名；不安装、同步个人插件、reload 或 push。完成验证后按用户授权归档收尾。离线 host 测试不冒充真实 PTY 视觉验收。

## 规划状态

PRD-only 轻量任务；用户已审阅并明确批准实施和完成后直接收尾。主会话直接实施与自审，unused role manifests 保持空。

## 完成证据

- 主会话实施与自审完成；最终聚焦 44/44、全量 379/379，通过。文档迁移后复跑全量仍 379/379。
- 目录降序、当前整树置顶及选择身份恢复、双名称/详情/长标识滚动、旧命令未注册、只读文件/index 保全均有回归测试。
- docs/ 本地链接及任务 whitespace 检查通过，git diff --check 通过。
- task validate 报两个 intentionally empty role manifests，非完整 manifest 验证通过；直接实施/自审已实际读取规范，未派发。
- Node v24.14.1；测试 subprocess 使用 PI_TRELLIS_TEST_HOST 指向已有 Pi 1.2.0 peers，并仅对子进程 unset TRELLIS_CONTEXT_ID。首次缺 host peers 的环境失败、长标识测试重叠拼接的夹具断言失败均保留记录；修复测试收集方式后通过，未以假结果验收。
- 无 lint/typecheck script；未真实 PTY 视觉验收、provider 模型调用、install/sync/reload/push。
- 用户授权验证通过后直接收尾；单阶段完成，将提交后归档并记录 journal。
