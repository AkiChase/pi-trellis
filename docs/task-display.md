# Persistent Task Display

The task count widget/footer is a presentation feature owned by
`extensions/trellis.ts`. It is independent of the read-only
[Task Viewer](task-viewer.md).

## Behavior

- `readUnfinishedTaskCount(root): number | undefined` rereads immediate project task directories on existing display refresh events. Exclude completed records and canonical archive descendants, deduplicate canonical aliases, and retain task-store containment validation. Unreadable/invalid enumeration yields unknown, not a partial or verified zero.
- Widget mode renders `▸ trellis(N)` without a session task and adds existing task details when active. Positive counts use `accent`, zero `dim`, unknown `(?)` `muted`. Footer follows the same count semantics; `off` and unsupported projects clear the display.
- Footer clipping uses host `visibleWidth()` / `truncateToWidth()` before theming, with a 34-terminal-column budget. Sanitize control input, preserve the count and fitting name/status, and cap long content. Byte length is not terminal width: `trellis(3): current ▸ in_progress` fits at 33 columns and must not become `cur…`.

## Verification

`tests/task-display.test.mjs` asserts count filtering/alias behavior, persistence/refresh transitions, theme/error degradation and Unicode/control width bounds. Production resolves TUI through the Pi loader; direct-TS tests use the real peer via the test-only preload documented in [Quality Guidelines](../.trellis/spec/extension/quality-guidelines.md).

See [README](../README.md#where-the-task-display-goes) for configuration and
[the documentation index](index.md) for other feature documents.
