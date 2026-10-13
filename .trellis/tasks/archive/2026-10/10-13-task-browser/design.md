# Task Browser Design

## Boundaries
Register `/trellis-task` from `extensions/trellis.ts` using a dedicated `lib/task-browser/` module. Use `ctx.mode === "tui"` to guard `ctx.ui.custom()`. Resolve the project at command invocation; do not require an active task or invoke task lifecycle commands. Keep browsing independent of runtime deployment/verification where on-disk task data can safely be read.

## Data
A read-only reader enumerates immediate task directories, excludes canonical archive descendants, deduplicates canonical aliases, and applies existing task-store containment rules. Share narrowly scoped enumeration/validation helpers with task count where appropriate without changing its unknown-on-incomplete-data semantics. Task errors remain visible in the browser; no partial result is labeled a complete empty store.

Read known artifacts only (`prd.md`, `design.md`, `implement.md`) within the validated task directory; reject escaping symlinks and special files. Distinguish missing, empty, unreadable, and removed artifacts. Obtain current-session task identity through the existing read-only boundary; failure to determine it must not block general browsing. Sanitize terminal-control input before themed rendering while preserving newlines/tabs appropriately for Markdown.

Build the tree from validated parent/children metadata, with stable sibling ordering. Missing links, cycles, conflicting links, and orphans must not drop tasks or duplicate them. Surface bounded diagnostics and list unmatched records safely. Preserve selection by canonical identity on refresh; clamp viewport if it disappeared.

## UI State and Layout
Use one custom component interaction with `list` and `detail` states, not nested terminal renderers. List owns selected identity and viewport offset. Detail owns selected section and per-section scroll position. Header and footer remain fixed; body is bounded to available height. A fresh component is created for each command.

English labels: `Trellis Tasks`, `Overview`, `PRD`, `Design`, `Implement`, `No tasks found`, `Document not created`, `Document is empty`, `Unable to read document`, `Current task`, and keyboard hints. Data text is never translated.

List: status plus title with tree prefix; subtle themed row selection and independent current-task marker. Detail: full title/path and metadata, document switcher, scrolling Markdown body. Long metadata wraps and scrolls rather than silently losing the full title. Use host width utilities, keyed input parsing, and theme callbacks. On resize/theme invalidation, recompute layout and clamp offsets.

## Markdown
Use host `Markdown` with Pi's `getMarkdownTheme()` rather than a Markdown-to-plain-text implementation. Wrap rendered lines in a bounded scroll viewport; cache by content/width/theme invalidation, not colored strings as durable state. Code highlighting depends on the host theme helper and supported language; unsupported languages remain readable.

Host API/source confirms headings, nested/ordered lists, task checkboxes, emphasis, fenced/inline code, blockquotes, links and width-aware tables. Links use terminal OSC 8 when supported or a URL text fallback. Raw HTML is text; images/diagrams are not browser-rendered. Verify actual output with real-host tests before claiming complete rendering acceptance. Preserve readable alt/source fallbacks for unsupported rich content and never fetch URLs or execute HTML/diagram code.

## Compatibility and Side Effects
Reuse existing Pi peers; add no TUI framework. No lifecycle writes, model calls, watcher, subprocess loop, external editor, or terminal renderer. `r` rereads at user request; entry also reads fresh. Missing project/unsupported mode returns a clear English notice. Closing invokes the custom completion callback and restores Pi interaction.

## Rollback
Remove command registration and dedicated browser modules/tests/docs if reverting. No storage migration or task-format change is required. Preserve unrelated standalone migration work.
