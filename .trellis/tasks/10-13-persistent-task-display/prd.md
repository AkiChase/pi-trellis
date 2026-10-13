# Persistent Trellis Task Display

## Goal
Keep the Trellis display available even when this session has no active task, with a compact project-wide unfinished task count.

## Background
- `extensions/trellis.ts:576–636` owns the compact footer and themed widget renderers.
- `extensions/trellis.ts:819–822` currently clears both surfaces when no task is active.
- The default widget is above the editor; `TRELLIS_PI_STATUS=status` selects the footer and `off` disables display.
- `.trellis/scripts/common/tasks.py:64–83` enumerates valid task records outside `archive`; completion must additionally be excluded for this count.
- The user approved the visual proposal and creation of this lightweight task. The user subsequently approved implementation and the terminal-column correction.

## Requirements
- In a supported Trellis project, retain the selected display without an active session task.
- Append `(N)` directly to `trellis`, without a space or a “pending” label.
- Count every valid unfinished, non-archived project task once, including parent tasks, child tasks and the current task, independently of session pointers and assignees. Exclude records with `status=completed` and the archive directory.
- Color positive counts with theme `accent` and `(0)` with theme `dim`; keep the Trellis label muted in the widget.
- With an active task, retain the existing task name/status, conditional subtask count and widget artifact indicators. With no active task, show only `▸ trellis(N)` in widget mode.
- Footer mode uses the same count and persistent behavior while retaining its compact presentation and 34-terminal-column width budget. The user approved correcting overly conservative UTF-8-byte clipping: preserve fitting names/statuses using supported host terminal-width utilities rather than byte counts.
- Preserve `off`, non-Trellis-project behavior and context/task injection semantics.
- Refresh on existing lifecycle points: session start, agent end and immediately after recognized `task.py` bash calls. Do not add polling or file watching.
- Unreadable count data must not be presented as a verified zero; cosmetic failures must not interrupt the session.

## Acceptance Criteria
- [x] No active task + three eligible project tasks renders `▸ trellis(3)` with an accent count.
- [x] No eligible tasks renders `▸ trellis(0)` with a dim count.
- [x] Active-task widget retains the existing details after the new count.
- [x] Archived/completed records are excluded; parent/child and other-session tasks count independently.
- [x] Create/finish/archive transitions update the display through existing refresh events, with finish removing current-task details but not the project count.
- [x] Footer mode retains count within its compact budget; off and unsupported-project cases remain hidden.
- [x] Focused tests cover rendering, count filtering, no-task refresh, failure degradation and transitions; full suite and whitespace check results are recorded.

## Scope and Constraints
Expected product changes: `extensions/trellis.ts` for presentation/count refresh, relevant `tests/*.test.mjs` for regression coverage, and `README.md` for display documentation. No new third-party dependency; the user-approved column-width fix may declare the existing host-provided `@earendil-works/pi-tui` peer and a test-only host alias, without installing or bundling it. No CLI modifications, config changes, worktree lifecycle changes, automatic install/reload, commit or push. Leave the unrelated `10-13-worktree-material-sync` planning directory unchanged.

## Deferred
Real-host visual verification may require the user to reload their installed extension after testing. No redesign of task details or real-time cross-session monitoring is included.

## Final Verification
Mocked lifecycle/count/rendering acceptance and real host-loader import passed; focused 32/32 and full live checkout 138/138 passed with subprocess identity unpinned and PI_TRELLIS_TEST_HOST explicitly supplied. Independent width probes covered 2,116 cases. Evidence: research/width-check-results.md. Interactive visual acceptance is not claimed; no installation/reload or commit performed.
