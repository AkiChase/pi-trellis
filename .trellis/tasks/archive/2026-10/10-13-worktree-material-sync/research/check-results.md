# Independent check: worktree material sync

## Scope and review basis

Reviewed the complete injected check manifest, PRD/design/implement and research, actual tracked/staged/untracked changes and complete changed runtime sources/tests. No Review base was supplied, so committed history was **not** part of this review. The staged diff was empty; this was not interpreted as absence of work.

Runtime review: `python/pi_trellis_worktree/{materials,manager,records,cli}.py`, `lib/{bindings,executions,worktree-query,subagent-rpc,task-context}.ts`, scoped role/overview/cache changes in `extensions/trellis.ts`. Tests reviewed: material-sync, protocol, dispatch, native CLI/Python, preparation, task-context, integration and fixture adapter. Reviewed package protocol, worktree README/spec claims and all current task artifacts. No workflow/provider/agent definition change appeared in the diff.

Concurrent persistent-task-display owns package.json, host-tui.mjs, task-display.test.mjs, display functions and display documentation. Those were preserved, not edited or counted as this task's deliverables. The full test runs include the concurrent work and use its existing loader; they are not an ownership claim.

## Findings fixed

1. **Ready-query identity bypass** (`materials.py:identity_changed/material_summary`). A target-only `task.json.id/name` change was classified as ordinary target divergence and could be dispatched although refresh correctly rejected identity mismatches. Reused one identity comparator in summary and refresh; all roles now reject without spawn or a starting lease. The first regression failed with 0 conflicts instead of 1; final tests pass and metadata stays unchanged.
2. **Impossible prospective ancestor** (`MaterialView.path`, `local_file`). An overlay accepted a new nested reference even when an existing ancestor was a regular target file. Preview incorrectly reported applicable and confirmation could leave earlier writes before failing mkdir. Validate existing ancestor directory types before virtual graph approval and writes. Regression initially failed with applicable=true; final rejection preserves the ready descriptor and prior files with no partial write.
3. **Task-local symlink alias boundary** (`local_file`, `prepare`). The old guard stopped before checking the task directory itself, and initial prepare's copy checks admitted internal directory aliases. A task-directory symlink could redirect current-task refresh/collection into another task; selected directory aliases could also be copied. Reject the task directory and descendant symlinks during graph reads, preparation planning and confirmed copies/writes. Keep the explicit top-level source task-store route legal. Added current-task alias, prepare alias and successful external source-store refresh/collect regressions.
4. **Virtual special-file read** (`MaterialView.data`). Require a resolved regular file before read/open, preventing an unexpected FIFO/device from blocking the new virtual-reader path. Added POSIX FIFO unit regression; no special file is opened.
5. **Evidence/doc consistency**. Corrected spec wording that attributed lineage validation to `validate_ready()` alone (the manager separately owns material summary/freshness); documented identity/path behavior. Removed stale “implementation not approved/not started” design status. Strengthened new refresh/collect CLI help/empty/inapplicable/--all/--expect negative assertions. Updated checklist to separate completed independent check from pending main-session acceptance.

Self-fix files: `python/pi_trellis_worktree/materials.py`, `tests/material-sync.test.mjs`, `tests/dispatch.test.mjs`, `tests/python/test_worktree.py`, `tests/worktree-cli.test.mjs`, `.trellis/spec/extension/worktree-lifecycle.md`, and this task's PRD/design/implement/check evidence. No new dependency, policy matrix, token, text merger, migration or lifecycle feature was introduced.

## Other audited contracts

- Refresh preserves B on target-only changes; accepted source and common ancestry are distinct. Bilateral conflict refuses the whole plan. Deselection retains detached files; physical deletion only deletes unchanged copies. Source baseline references are validated, never copied.
- Collect is explicit/reverse whole-file and never task.json or target deletion. Manifest/dependency overlays validate prospective source; selected collection does not erase unrelated source drift. Directory-expanded explicitly collected inputs update only their own accepted selection.
- Snapshots contain hash/path maps, strict descriptor/identity/schema/hash/count/size checks and bounded summaries; source binding is authoritative. Failed multi-file/publication operations retain files/old descriptor/error rather than rollback or dispatch permission. Cleanup remains binding-local after safe removal.
- Dispatch uses latest locked query facts, renders target materials and finally rechecks revision/fingerprints before writing starting. Target current CLI effects precede fingerprint computation. Early terminal/shutdown/stop keep original lineage and occupancy semantics. Completed check freshness requires checkout plus material revision/no source drift, not acceptance.
- Main overview uses four management/boundary/document lines; child role memo invalidates stable sections and removes the management tutorial without hasUI role guessing. Dynamic material facts do not enter stable sections. No pointer-resurrection or workflow rewrite was added.

## Actual verification

Environment: darwin/macOS, Node v24.14.1, Python 3.14.7. No dependency installation or provider probe.

- Initial independent full run: `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test` — 138/138, natural completion; initial Python 16/16.
- Two new red regressions: `env -u TRELLIS_CONTEXT_ID node --test --test-name-pattern='target-only task identity|impossible target ancestor' tests/material-sync.test.mjs` — 0/2 before fixes, 2/2 after fixes.
- Scoped after-fix run: `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/worktree-cli.test.mjs tests/preparation.test.mjs tests/material-sync.test.mjs tests/worktree-protocol.test.mjs tests/dispatch.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs` — 96/96. Subsequent regular-reader and strict-CLI assertions were separately verified and included in the final full run.
- Final full command (same environment as initial) — **144/144**, natural completion; final delivery log `/tmp/pi-material-check-delivery.log`.
- `python3 -B -m unittest discover -s tests/python -p 'test_*.py'` — **18/18**, including FIFO regular-file rejection.
- `env -u TRELLIS_CONTEXT_ID node --test --test-name-pattern='strict CLI help' tests/worktree-cli.test.mjs` — 1/1 after added refresh/collect flags.
- `python3 .trellis/scripts/task.py validate 10-13-worktree-material-sync` — implement 6/check 5 valid.
- `python3 .trellis/scripts/get_context.py --mode packages` — single repo, extension/scripts found.
- `git diff --check` — passed. Final local Markdown links/whitespace check: **14 files / 28 local links** valid, including untracked task/protocol/evidence, no trailing whitespace.
- Lint/typecheck: **unavailable** as scripts, not reported passed. Node TS execution is not static typechecking.

## Remaining limitations / acceptance

No unresolved scope-local correctness finding after fixes. Main-session acceptance is still pending, not inferred from execution completion. No real Pi/provider/model, actual install/reload/deployment/production worktree or cross-platform test was run. Fixtures alone cannot prove model obedience or OS sandboxing. No source lifecycle, stage/commit/push/merge/archive/reset/cleanup command was performed; all worktree/deployment/Git mutations in tests were temporary fixtures.

Source locks do not lock editors; before-hash/path and final fingerprint rechecks do not eliminate every external race. Multi-file writes and snapshot/binding/marker publication are not transactions. Existing checkout snapshot exclusions and large-file metadata fallback remain bounded freshness evidence, not exhaustive detection. No old-worktree compatibility was reviewed or introduced.
