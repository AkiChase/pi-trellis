# Implementation Results — Persistent Task Display

## Scope and actual changes

- `extensions/trellis.ts`: read-only, uncached `readUnfinishedTaskCount()` enumerates immediate task directories and reuses `resolveTaskPath()` / `readTaskRecord()` plus `containsPath()` for containment. Excludes completed/archive records, deduplicates canonical directory aliases, accepts the explicit top-level task-store symlink, and returns unknown on unreadable/invalid/incomplete count input instead of reporting a partial/zero count.
- Both renderers append themed `(N)` immediately to `trellis`: positive `accent`, zero `dim`, unknown `(?)` `muted`. Widget task name/status, child count and artifacts remain; task-less supported projects retain only the label/count.
- Footer themes label/count/name/status and clips plain text before ANSI styling against a conservative 34 UTF-8-byte budget (a terminal-column upper bound). Count stays intact; long task names/custom statuses truncate, including wide text. Existing refresh hooks only; no polling, CLI/runtime/worktree changes or injection changes.
- `tests/task-display.test.mjs`: 17 focused tests for rendering/theme, counting/filtering, alias/task-store paths, invalid/unreadable data, task-less UI, lifecycle transitions, footer/off/unsupported/headless and cosmetic exceptions.
- `tests/agent-context-integration.test.mjs`: foreign/missing CLI provenance still cannot supply task details/materials; expect persistent project count rather than both surfaces cleared.
- `README.md`: documents persistence/count semantics, conservative footer budget and unknown fallback.

Before edits, read the complete installed Pi 1.2.0 `docs/extensions.md`, relevant `docs/tui.md`, and declarations for setStatus/setWidget/theme tokens. Only existing UI APIs/theme helpers are used; no new dependency. Optional design.md/implement.md do not exist for this lightweight task.

## Verification evidence

Environment: macOS, Node v24.14.1. Commands run with identity unpinned only in test subprocesses.

- Final focused command: `env -u TRELLIS_CONTEXT_ID node --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs` — **29/29 passed**, no skips. An initial footer assertion incorrectly expected an unshortened slug under the conservative byte budget; corrected the expectation, reran successfully.
- `env -u TRELLIS_CONTEXT_ID npm test` in the live checkout — first run **104/105 passed**, failing Python `test_record_and_directory_byte_count_bounds` (`1 MiB` expected, JSON decode error received). Concurrent `python/pi_trellis_worktree/materials.py` changes appeared during execution; not authored/reverted by this task.
- Final live-checkout full rerun (complete log `/tmp/pi-trellis-persistent-task-display-tests.log`) — **102/105 passed**. Concurrent Python changes now include cli.py/manager.py/materials.py/records.py. Failures:
  1. `tests/dispatch.test.mjs`: current-check snapshot expectation receives stale/unavailable material lineage.
  2. `tests/dispatch.test.mjs`: multiline dispatch material fixture rejected for source baseline drift.
  3. `tests/worktree-cli.test.mjs`: supplementary Unicode snapshot expected current, received stale/unavailable lineage.
  All display/context-focused tests passed. These concurrent files were left untouched.
- To separate this task from concurrent work, created disposable non-worktree files from `git show HEAD:<path>` (excluding generated project/platform files), overlaid only the four display-task product/test files listed above, and ran subprocess `npm test` with `TRELLIS_CONTEXT_ID` removed. **105/105 passed**, no skips, on final display revision. Complete log: `/tmp/pi-trellis-persistent-task-display-isolated-tests.log`. Snapshot deleted after verification; no branch/worktree/source mutation or commit. This is scoped baseline evidence, **not** a claim that the concurrent live checkout passes.
- Separately, disposable HEAD Python-only baseline `python3 -B -m unittest discover -s tests/python -p 'test_*.py'` — **11/11 passed**.
- Read-only installed Pi TUI `visibleWidth()` probe: **144** themed footer combinations (counts 0/3/unknown/MAX_SAFE_INTEGER; normal/long/custom statuses; ASCII/CJK/combining/emoji/control-sequence names) all **<=34 terminal columns**, maximum **32**. Product imports no new TUI API/dependency.
- `git diff --check` — passed, including final product revision. New untracked test/results files additionally checked for trailing whitespace.
- README local links — **4/4 exist**.
- Lint/typecheck: **unavailable** (no package commands). Direct Node TypeScript execution is not static type checking.
- Latest focused rerun after further concurrent library edits appeared — **29/29 passed**, log `/tmp/pi-trellis-persistent-task-display-focused.log`. Concurrent lib/bindings.ts, executions.ts, subagent-rpc.ts, task-context.ts and worktree-query.ts were also left untouched; no claim is made about a future changing-checkout full suite.
- Real-host visual/reload test and optional provider probe: **not run**. No install/reload/stage/commit/push/task lifecycle operation performed.

## Acceptance evidence and remaining review

Mocked event tests demonstrate no-task count 3/0/unknown, active details, project-independent counting, creation/start/finish/archive event refreshes, footer/off/unsupported behavior and graceful cosmetic failures. Finish removes session details but not eligible project count. Agent end rereads project count despite cached active-task absence/startup context. Tests simulate disk mutations and invoke existing hooks; they are not an end-to-end real Trellis CLI/interactive-host visual acceptance test.

PRD acceptance boxes remain unchecked for main-session review. Full live-checkout gate is currently affected by concurrent work; scoped snapshot full suite is green. User may reload their installed extension later for visual acceptance; this implementation did not do so. Unrelated `.trellis/tasks/10-13-worktree-material-sync/` and concurrent Python modifications remain unchanged by this task.
