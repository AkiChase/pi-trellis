# S1 native source-authority implementation handoff

## Scope and state

Implemented only approved S1 in source main. No commit/start/install/deploy/reload, real project worktree, deployed runtime or other task edits. Tests created disposable Git fixtures and deployed package runtime inside those fixtures only. Existing `.trellis/workflow.md`, `.trellis/.pi-trellis.json` and neighboring task changes were preserved.

Changed: `runtime/pi_trellis_worktree/{materials,manager,records,cli}.py`, new `diagnostics.py`, `lib/bindings.ts`, `resources/runtime-baseline.json`, `tests/{preparation,worktree-cli,worktree,manifest-provenance}.test.mjs`, `tests/python/test_worktree.py`. Deleted `tests/material-sync.test.mjs`; retained generic active/unknown lease, task-store/alias/path/UTF-8/bounds/identity/removal negatives in the surviving tests. Removed material-copy, target start/current, snapshots/accepted graphs/ancestry and refresh/collect APIs.

## S2 schema and consumers

### Binding

Strict `version: 2`, required immutable fields unchanged: `bindingId`, `taskDir`, `sourceRoot`, `worktreePath`, `repositoryIdentity`, `branch`, `baseCommit`, `contextId`, `createdAt`; required `preparationState` enum unchanged. Only optional `lastError` remains. Unknown fields (including `preparedFiles`, `materials`, mode/authority alternatives), version1/boolean/unknown versions reject; no migration/cleanup. `sameIdentity` keeps the same immutable key list with version2. No `preparedRole` or persistent material snapshot is necessary: each operation revalidates its current role.

### Native query

`manager.query(cwd, task=None, ready=False, role=None)`; roles are short `implement | check | research`. Ready requires explicit task and role. CLI private query adds `--role`; user prepare adds optional `--role` (default implement). Removed refresh/collect and --file reject as unknown arguments. Ready source facts come exclusively from source root, even when target task/spec are absent or outdated. Read-only query remains safe while host holds source lock; occupancy is retained for host reserve checks and management operations.

Success envelope: `{ ok: true, source, local, binding?, issues: [], materials? }`. `source` retains repository facts `{root, commonDir, worktrees}`; `local` is the authoritative binding or null. Role query `materials`:

```text
state: "valid"
role: "implement" | "check" | "research"
sourceRoot/materialRoot: canonical absolute source root
 taskDir: lexical .trellis/tasks/<slug>
 taskPath: real absolute source task path (may be external explicit task-store route)
 specRoot: real absolute source spec directory
 workflowPath: real absolute source workflow file
 artifacts: absolute paths of task.json, workflow.md, PRD, optional design/implement
 manifest: absolute selected implement/check JSONL path, null for research
 references: [{label: source-relative lexical label, path: real absolute path,
               sha256: lowercase 64-hex hash, bytes: full byte count}]
 sourceFingerprint/revision: same current role graph 64-hex hash
 issues: []
```

Artifact order above is native validation order; S2 prompt must explicitly instruct PRD/design/implement then selected manifest/references. Research requires no role manifest and references is empty. Selected graph hashes include common files, current role JSONL, expanded refs, canonical paths/task/spec routes; task.json hash uses requirement projection excluding existing lifecycle fields. Source uncommitted material changes are readable, no target byte comparison/Git-clean gate. Reference list is bounded and complete, never sampled/truncated into false readiness. Bounds: record/role manifests 1 MiB; other material 16 MiB; graph 64 MiB/2048 files; JSONL 512 refs; expansion 128 dirs/512 entries; paths 4096 characters; authority result 512 KiB. Streaming incremental UTF-8/NUL validation and stable file identity fence (dev/inode/mode/size/mtime/ctime, excluding read-induced atime). Internal task/file/directory symlinks are refused; explicit source top-level task-store symlink supported. No target task-store parsing.

Non-ready invalid role facts: `{materials:{state:"invalid",role,issues},issues}`; ready failures exit1 and return `{ok:false,error,issues}`. Issue shape `{code,message,nextAction,role?,path?,manifest?,line?}`. Codes are assigned at throw boundaries, never inferred from message text. Explicit codes include binding/record/runtime, invalid_role/task, binding_not_ready, source_not_approved, execution_active, operation_locked, material_missing/path_unsafe/not_regular/limit/binary/encoding/changed/empty, manifest_row_invalid/reference_invalid/empty. Unclassified failures use `operation_failed`.

`manage(status)` returns `materials:{implement,check,research}` and flat issues, so one invalid role does not poison other roles. Completed check freshness now requires `execution.sourceFingerprint === materials.check.sourceFingerprint` plus `execution.finalSnapshot === snapshot(target)`; materialRevision/old lineage is not accepted as proof. Existing execution fields remain readable for conservative stale reporting.

### S2 outstanding bridge (intentionally not changed)

- `lib/worktree-query.ts` currently does not pass role and still declares old MaterialSummary. Change it to validate v2 binding and the source facts/issues above. Existing ready call without role now rejects by design.
- `lib/subagent-rpc.ts` must map `trellis-*` to short native role, compare current sourceFingerprint/revision across two queries, render source paths, and use actual target snapshot for targetFingerprint (native materials no longer has targetFingerprint).
- `lib/executions.ts` fields can remain; completed check must record sourceFingerprint at start and final target snapshot. No persisted binding.materials exists.
- The S1 CLI test uses a test-local direct native query helper to exercise explicit-role protocol; add/retain real host-adapter coverage during S2 instead of weakening the explicit-role requirement.
- `tests/worktree-fixture.mjs` currently has no role passthrough; S1 default-role paths use it, explicit-role coverage uses direct CLI. S2 can add role passthrough if needed.
- Runtime provenance added diagnostics.py as original MIT native source (`sourcePath/sourceSha256:null`, current sha256); historical source hashes/licenses untouched. New runtime module raises executable resource count from 32 to 33. `manifest-provenance` now compares dynamic baseline count. Other out-of-S1 fixtures with literal count35 (runtime+3 roles) or old material semantics require later stage adaptation.

## Verification

macOS/darwin; Node v24.14.1; Python3.14.7. No lint/typecheck script exists. Full npm suite, real provider/TTY/source-read behavior: NOT_RUN in S1; later stages own integration and independent review.

1. Planned focused command without existing peer path failed before test loading (0/5, missing `@earendil-works/pi-tui`); log `/tmp/pi-bg/bwmw3lgcv.log`.
2. Standalone `python3 -B -m unittest discover -s tests/python -p 'test_*.py'`: 18/18 exit0 at that intermediate point; log `/tmp/pi-bg/bas4gyey9.log`.
3. Focused with installed host1.2.0 peer: 79/91 exit1. Product read fence initially compared full stat including atime; fixed without weakening content/source drift protection and added concurrent replacement negative. Log `/tmp/pi-bg/bajg4agm7.log`.
4. Next focused attempt 72/91 exit1: implementer edited materials.py during background run, correctly tripping 19 resource-hash checks. No bypass; waited for terminal result and refreshed hashes. Log `/tmp/pi-bg/b2udevwp2.log`.
5. Frozen final native source and matching baseline:

```bash
env -u TRELLIS_CONTEXT_ID \
 PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
 node --import ./tests/host-tui.mjs --test \
 tests/python-worktree.test.mjs tests/preparation.test.mjs \
 tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/manifest-provenance.test.mjs
```

91/91, exit0; embedded Python suite includes 19 tests (added read-race negative). Log `/tmp/pi-bg/bi5n4onjh.log`.
6. Final test-only import/comment cleanup and additional dirty target-material removal assertion: same subprocess environment, `node --import ./tests/host-tui.mjs --test tests/preparation.test.mjs tests/worktree-cli.test.mjs`: 27/27 exit0. Log `/tmp/pi-bg/bedlapkvb.log`. Unchanged native/provenance/binding/Python inputs retain prior valid focused evidence.
7. `git diff --check`: exit0 after final test edits. All own product files remained unstaged/uncommitted. Self-check only; main's independent S1 review/acceptance outstanding.
