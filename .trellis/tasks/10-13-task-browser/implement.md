# Task Browser Implementation Plan

## Gate
- [x] User approves the latest planning summary in a subsequent turn.
- [x] Refresh task/workspace state and read target-layer pre-development specs.
- [x] Inspect relevant source and host UI examples/API before code changes; implementation agent must read complete changed owners.
- [x] User explicitly selects current source workspace execution. Worktrees are optional; no managed dispatch or CLI deployment is used.

## Execution
1. [ ] Implement safe read-only task/artifact reader and deterministic hierarchy projection; add containment/error/alias/cycle fixtures.
2. [ ] Implement list/detail UI state and keyboard transitions with selection preservation and refresh behavior.
3. [ ] Integrate host Markdown theme, bounded document viewport, Unicode width handling, cache invalidation, and rich-content text fallbacks.
4. [ ] Register `/trellis-task`, English notices, non-TUI guard, and command-scoped project/current-task resolution.
5. [ ] Document browser usage and rendering limits in README; capture task evidence and relevant executable spec contracts.

## Verification
- [ ] Real-host tests for Markdown headings, nested lists/checklists, tables, links, code, quotes, unsupported rich content, and English UI/data language separation.
- [ ] Navigation tests for long lists/docs, refresh/removal, per-section scroll, Esc return/close, resize and narrow/wide Unicode content.
- [ ] Preservation tests prove no session/task/index writes or model/lifecycle calls.
- [ ] Run focused new tests and existing display/context/integration regression suites.
- [ ] Run `env -u TRELLIS_CONTEXT_ID npm test` with explicit `PI_TRELLIS_TEST_HOST` when required by spec. No lint/typecheck script is currently provided; do not invent passed gates.
- [ ] Run `git diff --check` and `task.py validate`; inspect untracked documents separately.
- [ ] Independent check in the explicitly approved current workspace using ordinary Agent with isolation off; main verifies actual diff/evidence.
- [ ] Interactive Pi smoke test if an approved environment is available; otherwise explicitly report it not run, distinct from component tests.

## Rollback Points
Reader/UI/registration are separate stages; revert only this task's owned changes. No user task or runtime-store migration is needed. Do not install/reload, commit, push, or archive without the corresponding approval.
