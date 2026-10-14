# Read-only Task Browser

## 1. Scope / Trigger

`/trellis-task-viewer` is a native Pi command crossing UI, session-pointer and task-file boundaries. Presentation belongs to `lib/task-browser/{command,component}.ts`; bounded disk reads and hierarchy projection belong to `reader.ts`. The extension supplies command-time root and session key, not runtime authorization. This browser does not change the persistent unfinished-task count.

## 2. Signatures

- `/trellis-task-viewer` accepts no arguments; extra input displays usage. The old `/trellis-task` command is not registered.
- `registerTaskBrowserCommand(pi, { findRoot(cwd), currentTask(root, ctx) })` registers one command.
- `readTasks(root): TaskSnapshot` returns validated `tasks`, ordered tree `rows`, bounded `diagnostics`, and `complete`.
- `readCurrentTaskIdentity(root, key): string | undefined` resolves only the supplied session pointer's canonical task directory; it never opens that task's record.
- `readDocument(root, task, section): TaskDocument`, where section is `prd | design | implement` and state is `ready | empty | missing | removed | error`.
- `TaskBrowser.render(width)`, `handleInput(data)`, `invalidate()` implement one custom interaction.

## 3. Contracts

- Resolve root per command invocation. Browser entry does not require a current task, verified runtime deployment, subprocess or model request.
- Enumerate immediate task directories only; exclude canonical archive descendants and deduplicate canonical aliases. Include completed records still outside archive. Sort immediate directory names lexicographically descending before tree projection: roots and siblings retain that order, children remain beneath parents. Same-day names descend deterministically; MM-DD prefixes do not distinguish years, and no creation-time/status weighting is inferred. The UI promotes the current session task's entire top-level tree ahead of other roots, retaining ancestor and sibling order; invalid/missing current identity leaves descending order unchanged. Refresh reorders before recovering canonical selection. Preserve each valid task once despite malformed/cyclic hierarchy links.
- Resolve task paths with the existing task-store containment owner; only the top-level external task-store exception is supported. Artifact/record files must resolve inside their selected canonical task directory.
- 归档层级引用：可见任务索引优先。未命中的目录名或 `.trellis/tasks/<目录名>` 引用按 `archive/YYYY-MM/<目录名>` 查找，也支持精确 `.trellis/tasks/archive/YYYY-MM/<目录名>` 与指向归档对象的顶层 alias。只读取相关候选记录，不递归加载归档树；归档子任务不展示，归档父任务的可见子任务留在顶层。候选沿用任务目录 containment 与记录大小、UTF-8、regular-file 校验；同 canonical identity 去重，不同归档对象重名视为歧义。合法隐藏引用不产生缺失警告，真正缺失、损坏或越界仍有诊断；不修改任何任务记录。
- Pointer reads use `.trellis/.runtime/sessions/<key>.json` through `checkedPath`; invalid/unreadable pointers yield no current marker, not blocked browsing. A marker is displayed only for an identity in the validated snapshot.
- Record/pointer reads are bounded at 1 MiB; documents at 2 MiB. Validate UTF-8/NUL and descriptor regular-file type, use nonblocking/no-follow final opens, and read at most limit + 1 bytes. This is not an OS sandbox against concurrent ancestor replacement.
- List labels show the sanitized directory basename followed by ` · ` and the original title/name/id fallback; identical values are not repeated. Protect current marker/status before allocating remaining width to tree prefix, directory identifier, then title. Extreme widths may truncate the identifier; full detail stays scrollable. Overview explicitly includes existing Name, Title and Path values. The list header states `Directory descending` and `Current tree first`.
- English application labels do not translate original task/document content. Strip untrusted terminal controls before adding trusted theme/Markdown styling.
- Use `ctx.mode === "tui"` and `ctx.ui.custom()` with full-terminal overlay; complete via the supplied callback. Unsupported modes report English notices without a model turn.
- Up/Down/PageUp/PageDown navigate; Enter opens; Left/Right selects Overview/PRD/Design/Implement; Esc returns/closes; `r` explicitly rereads. Return preserves list position, refresh preserves canonical selection when present, and each section owns its scroll offset.
- Host Markdown plus `getMarkdownTheme()` renders supported syntax. Theme invalidation clears colored caches; resize recomputes widths/offset bounds. Cache content by identity/section/width until explicit refresh/invalidation.
- Images become readable source tokens without destroying surrounding tables, lists, headings or shared link definitions. No HTML/diagram execution or remote fetch. Parser failure displays a warning and complete scrollable document source.

## 4. Validation & Error Matrix

| Input/condition | Observable result |
| --- | --- |
| No project / non-TUI / extra arguments | English notice; no custom UI or lifecycle action |
| No task records in a valid empty store | `No tasks found` |
| Missing record, invalid JSON/UTF-8, escaping symlink, unreadable or special file | Bounded warning, `complete=false`; not a verified empty store |
| Dangling archive | Incomplete store diagnostic, not silent archive absence |
| 可见任务引用合法归档父/子任务 | 不产生缺失警告；归档对象不进入可见树 |
| 归档引用缺失、损坏、越界或不同对象重名 | 保留诊断；精确归档路径可消除名称歧义 |
| Current task is a nested child | Its entire root tree appears first; ancestor and sibling ordering is retained |
| Current identity missing/invalid | Directory descending order, no promotion or false marker |
| Missing/empty document | Distinct `Document not created` / `Document is empty` |
| Task identity removed/replaced | Removed-task message; do not jump detail to a different task |
| Oversized or invalid document | Error diagnostic, no truncated-success rendering |
| Long valid document/Overview | All content scrollable; avoid variadic push of unbounded rendered arrays |
| Host Markdown throws | English warning plus full plain source fallback |
| Invalid current pointer or FIFO record target | No blocking read of task.json and no false current marker |

## 5. Good / Base / Bad Cases

- Good: Chinese PRD with code, checklist and wrapped table uses native theme while the page labels remain English.
- Base: No active task and no deployed CLI still permits browsing valid task files.
- Bad: Opening a FIFO pointed-to record to establish the current marker can block the entire Pi process; resolve pointer directory identity independently.
- Bad: Literalizing a complete image-containing table row destroys native Markdown structure; adapt the image token and retain the other cells.

## 6. Tests Required

`tests/task-browser-reader.test.mjs` asserts canonical archive/alias rules, malformed records, UTF-8/size/type/containment bounds, deterministic descending hierarchy, directory/title labels and missing/removed document distinctions. `tests/task-browser-ui.test.mjs` asserts current-root promotion, nested ancestor preservation, refresh identity recovery, full Name/Title/Path, long-identifier scrolling and old-command absence, and uses actual host peers to assert navigation, refresh/selection, supported Markdown and source fallback, long-document end reachability, Unicode column/row bounds, English labels and original content.

Preservation tests compare all fixture files, session pointers, Git index bytes and porcelain status; browser commands must not call task/context CLI or trigger a model turn. Offline actual-host regular/fullscreen lifecycle tests assert theme invalidation reaches the overlay and completion restores editor focus/text. These tests are not actual PTY acceptance. Follow [Quality Guidelines](../.trellis/spec/extension/quality-guidelines.md) for host resolution and unpinned test subprocesses; parallel resource failures remain failed gates until rerun.

## 7. Wrong vs Correct

```typescript
// Wrong: a large valid document may overflow the function argument stack.
lines.push(...renderedLines);
// Correct: avoid unbounded call arguments, preserving all scrollable content.
lines = lines.concat(renderedLines);
```

Do not catch renderer failure and display an empty document, translate task data, fetch image URLs, or change session/task state as a side effect of viewing details.
