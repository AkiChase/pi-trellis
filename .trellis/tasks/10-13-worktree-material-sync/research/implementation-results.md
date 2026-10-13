# Implementation results: worktree material sync

## Status / boundary

User explicitly approved the latest design/implement plan and implementation. Implemented in the current main checkout; source task stays in_progress. Independent trellis-check and final acceptance remain main-session work. No agent recursion, source lifecycle commands, real worktree operations, installation/reload, staging/commit/push/merge/archive were performed. All mutation/commits/removals exercised by tests were disposable fixtures.

## Implementation

- `python/pi_trellis_worktree/materials.py`: reuses role references through a read-only prospective MaterialView overlay; source-runtime bounded hash-only accepted graph + common B ancestry. Strict descriptor/snapshot schema/path/hash/count/byte validation; task.json whole requirements projection excludes only branch/worktree_path/status/completedAt/commit/pr_url, preserving runtime and rejecting id/name changes. Target start/hook output remains divergence, not source approval.
- `manager.py`, `cli.py`, `records.py`: first prepare initializes the snapshot; explicit refresh/collect preview and approved confirm recompute under lock. Whole-file three-way classification, detach/orphan retention, no text merge/force/token/migration. Explicit collectible task docs or textual research/evidence, reverse conflict protection, manifests/dependencies overlay validation, no task.json/deletions/runtime/code collection. Unselected source drift stays visible; directory-expanded selected collection updates only its selected ancestry/graph. Snapshot publication, partial failure/error preservation and binding-only safe removal cleanup.
- `lib/worktree-query.ts`, `bindings.ts`, `executions.ts`, `subagent-rpc.ts`, `task-context.ts`: consume Python facts, locked latest binding/query/render/final fingerprint recheck before starting/spawn. Renderer-owned dynamic revision/source/target facts are recorded, preserving cwd/off, provider IDs, stop occupancy, early terminal and shutdown unknown handling. Check currentness uses checkout plus starting material lineage and no source drift/conflict.
- `extensions/trellis.ts`, `docs/worktree-execution.md`: replace existing worktree overview lines with four main lines and readable package-local path via import.meta.url. Role provenance changes section cache, not authorization; child overview has execution boundaries, no management tutorial. No hasUI role guessing, workflow edits or pointer resurrection. Custom-start events safely lack a prompt.
- README and four English extension specs updated; no source scripts deployed or custom/bundled agents rewritten.

## Actual validation

Environment: macOS (darwin), Node v24.14.1, Python 3.14.7. Minimum Python syntax is not a cross-version/platform claim.

| Command | Actual result |
| --- | --- |
| Baseline `env -u TRELLIS_CONTEXT_ID npm test` | 88/88 before implementation/concurrent product work |
| Baseline Python unittest discover | 11/11 |
| `env -u TRELLIS_CONTEXT_ID node --test tests/worktree-cli.test.mjs tests/preparation.test.mjs tests/material-sync.test.mjs tests/dispatch.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs tests/worktree-protocol.test.mjs` | 89/89 at focused checkpoint; subsequent final tests included in full run |
| New material suite `env -u TRELLIS_CONTEXT_ID node --test tests/material-sync.test.mjs` | 24/24 after directory-input collection regression |
| `env -u TRELLIS_CONTEXT_ID npm test` before concurrent host-loader change | 135/135 at final checkpoint before last directory regression |
| Same bare command after concurrent host-loader change | Failed during preload: host pi-tui peer not resolvable locally. No product assertion ran. Preserved concurrent package/loader changes. |
| `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test` | **138/138**, natural completion; existing host peer only, no install/provider probe |
| `python3 -B -m unittest discover -s tests/python -p 'test_*.py'` | **16/16** final |
| `python3 .trellis/scripts/task.py validate 10-13-worktree-material-sync` | implement 6/check 5 entries valid |
| `python3 .trellis/scripts/get_context.py --mode packages` | Single repo; extension/scripts layers found |
| Local Markdown link check (README, protocol, specs, this task) | **46/46** existing; untracked task/protocol included |
| `git diff --check` | Passed final code and documentation checkpoint |

Official Pi 1.2.0 docs read completely: docs/extensions.md (tools/events/sections/lifecycle), packages.md, configuration.md, settings.md. Relevant installed declarations for before_agent_start user/custom events, mutable systemPromptOptions.sections and sequential tools were inspected. This validates usage against documented API plus fixtures, not a live provider/model run.

Tests include source-update refusal without spawn/lease, lock/render-final material change, baseline differences, preserved target B followed by bilateral conflict, fresh/no-op/equal-convergence revisions, source-only/target-only changes, directory expansion, detached/deleted edited orphan, task projection/runtime race, explicit/idempotent collect, missing dependencies, unknown/bilateral ancestry, symlinks/unsafe/binary/credential/code selection, active/unknown preview rejection, malformed/bounded snapshots, partial disk failure preserving old descriptor/error/files, source-only manifest not accepted, directory-selected collected input, safe binding-only cleanup, role/cache/main-noUI protocol and pointer non-resurrection.

One preexisting dispatch test intentionally changed a target baseline spec and expected spawn. Approved design forbids baseline mismatch; it now tests a permitted task-local target-only edit for latest rendering, with a separate negative test rejecting unapproved baseline changes. The existing Unicode snapshot fixture now prepares/records material lineage rather than treating an unversioned execution as current.

## Concurrent ownership / preservation

At start only the two task directories were untracked; no product modifications. During execution persistent-task-display independently changed `extensions/trellis.ts`, README, agent-context integration tests, package.json and added task-display.test.mjs/host-tui.mjs; English quality/session spec files were also shared. Those changes were preserved. Our extension edits are limited to role memo, renderOverview signature/worktree lines, before_agent_start role/cache/union-prompt handling and shutdown role cleanup; README edits only worktree documentation; integration edit only the old overview assertion. Did not touch the unrelated task directory, display renderers/count/width logic, host loader or package.json. Final full suite includes concurrent work, not a claim that all those changes belong to this task.

## Limits / not run

- Lint/typecheck unavailable as package scripts; direct Node TS execution is not static typechecking.
- Independent check not dispatched by this implement agent; main session must review final diff/current concurrent boundaries.
- No real provider RPC/model obedience, cross-platform matrix, actual deployment/installation/reload or production worktree validation.
- Source lock does not lock editors; final hashes/path rechecks reduce but cannot eliminate external races. Multi-file writes and snapshot/binding/marker publication are not transactions; failures preserve error and old descriptor, not rollback.
- Snapshot checkout exclusions/symlinks and large-file size/mtime behavior remain bounded freshness evidence, not exhaustive content/security verification.
- No old-worktree migration, execution history ledger, token/--expect, text merging or role policy matrix. Collect permits fixed docs/manifests and textual research/evidence suffixes only, with explicit selection and no credential-name files; no claim of arbitrary credential detection.
