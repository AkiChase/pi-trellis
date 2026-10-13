# 独立检查报告

## 范围与结论

本次是 `trellis-check` 独立检查与就地修复，执行在用户批准的当前 source workspace。完整审阅三个 browser owner、两个新增测试、README 浏览器段落与 extension 的 browser import/registration；同时阅读任务 check.jsonl 对应规范、已注入 PRD/design/implement/planning-evidence 及 implementation-report。没有修改任务输入材料、owning specs 或并行任务文件。

**结论：本任务新增测试最终 39/39 通过，四类具体缺陷已修复；共享工作区的最终 focused/full gate 未通过，受并行资源 hash 不一致阻断，不能标记整仓通过。**

没有提供 Review base，因此没有猜测或审阅全部提交历史。启动时 README browser 段落已经在 HEAD（并行 migration 提交）；该段落按明确任务范围完整审阅，只补充文件大小及 Markdown 渲染失败回退说明。审阅 staged/unstaged/untracked，staged 为空。其他 HEAD/dirty 变化没有当成本任务内容或撤销。

## 发现与修复

### 1. 高：当前任务标记读取可能阻塞 FIFO

原注册回调调用 `readActiveTaskFromDisk()`；它在 browser 已排除非法记录后仍再次通过共享 `readTaskRecord()` 读取 pointer 指向的 task.json。task.json 为 FIFO 时，同步读取可阻塞整个 UI。

修复：`lib/task-browser/reader.ts:67` 增加 `readCurrentTaskIdentity()`，只读当前 session 的受 containment 校验 disk pointer，并解析 canonical task 目录身份；不打开 task record、不运行 CLI。UI 只会标记独立 snapshot 中验证通过的任务。extension 仅 browser 注册回调切换至该 helper，共享 active-task/display 行为不变。

回归：reader 验证 pointed-to FIFO 不读取、FIFO/非法 UTF-8 pointer 安全降级；command 验证 open/refresh/close 在 current task FIFO 时仍可完成。

### 2. 中：记录 UTF-8 与实际读取上限不充分

原 task.json 复用 `readTaskRecord(..., "utf8")`，非法 byte 在字符串字段内变成 `�` 仍被接受，损坏 source-language 内容。文档/记录的 stat 后无限 `readFileSync` 也不是实际 bounded read。

修复：`lib/task-browser/reader.ts:42` 用 nonblocking/no-follow descriptor、`fstat` 常规文件校验、最多 `limit + 1` byte 的读取和 `isUtf8`/NUL 检查，统一服务 browser record/document/pointer。保留 1 MiB record、2 MiB document 和 task-local canonical containment，不扩大共享 helper 的契约。允许安全 task-local symlink（先 canonicalize，再 no-follow 打开最终文件）。

回归：非法 UTF-8 JSON 字符串、不合法 NUL record；原有 oversized/FIFO/directory/dangling/escaping/unreadable/local-symlink 测试全部保留通过。该处理降低 final-file 替换为 FIFO 的风险，不宣称提供对恶意并发祖先目录替换的 OS sandbox。

### 3. 高：合法长文档/Overview 可触发参数栈溢出

实测 420 KB 的 `line\n\n` × 70000 文档未超 2 MiB，但 `lines.push(...renderedLines)` 抛 `Maximum call stack size exceeded`。原 Overview 也有同类展开。

修复：`lib/task-browser/component.ts` detailBody 改为 array concat，避免大量调用参数；host Markdown renderer 抛错时显示 English warning，并用完整原始 source 的 Text 包装继续滚动，不吞成空文档。README 补充回退说明。

回归：70000 行 Overview 与 140000 行 Markdown 到末尾仍可访问；模拟 host Markdown 抛 RangeError 后原始中文/source 尾部可达，refresh 后恢复正常 renderer。

### 4. 中：图片文本回退破坏受支持 Markdown

原 `readableMarkdown()` literalize 整个含图片行和全部 reference definition。实测 table 含图片时图片 cell 丢失/列错位，**bold**/list/heading 失去原生结构；图片与 `[Docs][shared]` 共用 definition 时 Docs 不再渲染为 link。

修复：`lib/task-browser/component.ts:20` 仅 literalize 图片 token，保留 surrounding native heading/list/checklist/table 与原 reference definitions；参考图片 source URL 通过 literal definition appendix 可读。避开 fenced（含 list/quote fence）及 inline code、escaped image，处理 table pipe、嵌套列表图片和 unmatched backtick 与插入 literal delimiter 的干扰。不含图片的文档原样返回。

回归：真实 host table cell 图片/pipe、heading/list 的 native emphasis token、共用 reference link、code/escaped image 保留、nested image URL、unmatched backtick。

## 未视为缺陷的审查结论

- **主题：不是 global helper 误用。** 完整阅读 Pi 1.2.0 `docs/extensions.md`、`docs/tui.md`，相关 Markdown source/public d.ts、overlay QA example，以及 actual custom/theme/TUI invalidation owners。`ctx.ui.theme` getter 与 `getMarkdownTheme()`读取同一 global active theme；宿主 `onThemeChange → ui.invalidate()`遍历 overlay component，TaskBrowser 清理 colored cache。新增离线真实 host regular/fullscreen custom lifecycle 测试证明 theme 更新到 Markdown、resize 重算、completion 移除 overlay 并恢复原 editor focus/text。没有启动 terminal 或 watcher。
- **无 task.json 的目录：保留有界诊断。** 现 task store 约定 immediate task directories；缺记录可能是半创建/损坏任务，不能静默声称完整 empty。普通文件与 archive 被忽略，canonical alias dedup；nested/group 没有 record 时 browser 告警而非递归搜索，符合批准设计的 immediate-only 范围。不做未知 grouping-directory 策略扩展。
- 英文 application labels、不翻译 Chinese title/body；list/detail/section/page/return selection、refresh/removal、current-session-only marker、hierarchy conflicts/cycles/aliases、width/row clipping 均有实际测试。
- Markdown 使用真实 host，不增加框架、网络 fetch、HTML/diagram/image 执行。HTML/unknown language/mermaid 是 readable source/code；无搜索、归档浏览或编辑功能。
- 浏览路径只调用 FS 读取及 custom UI，无 model/task start/switch/runtime CLI；保留测试比较整个 fixture 文件 bytes、session pointer、Git index 与 porcelain。

## 实际验证

环境：Node `v24.14.1`，macOS，Pi 1.2.0 release 已存在的 node_modules；未安装依赖或 reload。仅测试子进程 unset `TRELLIS_CONTEXT_ID`。

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-browser*.test.mjs
# 最终 39/39 passed，0 failed，0 skipped
# /tmp/pi-trellis-task-browser-check-new-final.log

env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-browser*.test.mjs tests/task-display.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs
# 最终 58/85 passed，27 failed，0 skipped
# /tmp/pi-trellis-task-browser-check-focused-final.log

env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
# 最终 190/336 passed，146 failed，0 skipped
# /tmp/pi-trellis-task-browser-check-full-final.log

git diff --check
# passed
python3 ./.trellis/scripts/task.py validate .trellis/tasks/10-13-task-browser
# passed：implement.jsonl/check.jsonl 各 3 entries；只读 validate
```

新 code/test 文件亦逐行检查 trailing whitespace 和末尾 newline，通过。初始实现的 browser 测试 32/32；修复后、并行模板尚一致时 focused 曾 85/85（`/tmp/pi-trellis-task-browser-check-focused.log`）。后续新增边界回归曾暴露 unmatched-backtick 的 image 消失，已修复并重跑；不把这些中间版本通过代替最终 gate。

### 范围外失败的具体证据

最终 focused 的 27 失败全部为 fixture 初始化 `Package template hash mismatch: workflow.md`。最终 full 的 146 失败含 143 同类 hash error、2 个 init-command 菜单/identity assertion、1 个 `skill-resources` hash assertion；这些失败属于正在并行修改的 workflow/skills 资源，不是 browser 测试失败。

检查时 `resources/template-baseline.json` 对 workflow 的 expected SHA256 为 `7c6791a4f5652a826f6e59aef196500d8e7e8513e81570c42e08561e0301e5ef`，实际 `resources/templates/workflow.md` 为 `ab21b3191139725c8d29ebbd10b44c3ec9acaca2140a2e31841580102f679304`。full 中 finish-work skill actual 为 `585a37e8a3e962501e172cc4612e5ed184b31733d61cf3cac5120a9743ee9781`，expected 为 `81a1b41303c7b762fb0cb9fd4f5778808b2845c39878334b995f94a8f4157f2e`。

未修改、覆盖或临时替换这些资源来制造通过。主会话需在并行 task 收敛后重跑 focused/full；当前最终 gate 明确失败。

## 限制与未运行

- package 无 lint/typecheck scripts；两者 unavailable/not run，Node strip-only TS 执行不是静态 typecheck。
- 未运行实际 Pi PTY、个人 plugin install/reload、真实 terminal regular/fullscreen 人工导航或 provider/model probe。离线 host lifecycle/renderer 测试不等同真实用户终端验收。
- readTextFile 的 flags 在本次 macOS 环境及现有 host 下验证；不是跨 OS 实机认证。Markdown image fallback 是 readable text adapter，不是完整浏览器级 Markdown parser。
- 未 spawn agent、worktree 操作、stage/commit/push/archive 或 task lifecycle 写入。主会话仍负责 PRD AC/spec 判断及整仓最终验收。
