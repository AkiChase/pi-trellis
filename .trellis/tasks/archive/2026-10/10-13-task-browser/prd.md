# Trellis Task Browser

## Goal
Provide a read-only `/trellis-task` terminal page for browsing project tasks and their planning documents without asking the model to read files.

## Background
The user approved creating this task and the list-to-detail design. Existing task display provides only a count and active-task summary. Task records and planning documents already live under `.trellis/tasks/`.

## Requirements
- R1: `/trellis-task` opens an interactive task list even when the session has no active task.
- R2: All application-owned UI copy is English (headings, labels, hints, status descriptions, empty/error states). Task titles and document content retain their original language.
- R3: Show non-archived tasks with full titles in detail, themed statuses, parent/child tree indentation, and a distinct current-session-task marker. Truncate list titles without losing important status information.
- R4: Up/Down selects; Enter opens detail; Esc returns to the list or closes from the list. Preserve list selection and scroll position on return.
- R5: Detail contains Overview, PRD, Design, and Implement sections. Left/Right switches sections; Up/Down and PageUp/PageDown scroll document content.
- R6: Render planning Markdown as terminal Markdown, including headings, emphasis, nested/ordered lists, checkboxes, inline/fenced code, quotes, links, and tables. Use the active Pi theme. Long content remains accessible through scrolling and wrapping.
- R7: `r` refreshes task/document data. Missing documents show an English empty state; unreadable/invalid entries surface bounded diagnostics rather than being reported as an empty project.
- R8: Browsing does not alter task records, session pointers, Git state, or planning files; it does not call a model or start a task.
- R9: Adapt to terminal resizing and narrow widths; every rendered line fits the available terminal columns. Unsupported non-TUI modes report an English explanation without opening custom UI.

## Out of Scope
- Starting/switching tasks, editing, deleting, archiving, or changing status from the browser.
- Search and archive browsing/filtering in the first version.
- Browser-equivalent HTML rendering, embedded images, Mermaid diagrams, or remote resource fetching. Unsupported rich content must remain readable as text, not execute or silently disappear.
- Standalone shell TUI outside Pi, additional TUI frameworks, or modifications to provider/preset packages.

## Acceptance Criteria
- [x] AC1 (R1–R3): The command opens with and without an active task; titles, hierarchy, statuses, and active marker are correct; UI copy is English while Chinese task/document text is preserved.
- [x] AC2 (R4–R5): Keyboard navigation, section switching, scrolling, and return-position preservation work for lists/documents longer than the viewport.
- [x] AC3 (R6): Real host Markdown fixtures demonstrate headings, nested lists, checkboxes, code, quotes, links, and wrapped tables at normal/narrow widths. Unsupported rich content has a readable fallback.
- [x] AC4 (R7): Refresh reflects on-disk changes; missing, empty, deleted, malformed, and unreadable data have distinct safe outcomes.
- [x] AC5 (R8): Tests verify no pointer/file/index mutations and no model/task-lifecycle invocation.
- [x] AC6 (R9): Unicode/control-input width safety, resize, theme invalidation, and non-TUI guard are covered; real interactive smoke-test limits are recorded honestly.

## Verification Evidence
See `research/implementation-report.md` and `research/check-report.md`. Independent check fixed four concrete defect classes and browser tests passed 39/39. Actual-host offline overlay lifecycle tests cover regular/fullscreen mounting, invalidation, and focus restoration; actual PTY/manual interaction was not run. Repository-wide gate was initially blocked by parallel workflow/skill hashes. The final precommit rerun passed 336/336 with the existing Pi 1.2.0 peers; see `research/main-verification.md`. Actual PTY/manual interaction was not run by the agents; the user subsequently confirmed real-terminal acceptance passed and authorized wrap-up.

## Approval State
Task creation and final planning summary approved. User explicitly authorized implementation ("开始吧") and subsequently selected direct execution in the current source workspace. No managed worktree operation, CLI deployment, automatic commit/install/reload, or changes to unrelated migration work are authorized.
