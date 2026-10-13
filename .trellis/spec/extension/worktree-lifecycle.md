# Persistent Worktree Lifecycle

## Applicability and Invariants

Use this guide for `python/pi_trellis_worktree/`, `lib/worktree-query.ts`, `lib/bindings.ts`, `lib/executions.ts` and `lib/subagent-rpc.ts`. pi-trellis manages a persistent task directory, then uses the provider's public cwd RPC. It does not modify providers, use temporary subagent isolation, automatically advance phases, install dependencies, commit, merge or delete branches.

Caller approval is required before using `--confirm`; a CLI flag is not proof of consent. Management runs through `python3 .trellis/scripts/worktree.py`; `trellis_worktree` is not registered. Each mutating CLI operation previews by default, accepts explicit `--task`, and requires approved `--confirm`. Operation-specific argparse rejects abbreviation, duplicates, unknown/inapplicable options and empty/control-character values before repository access. `status` cannot confirm. JSON stdout is one object; errors/progress go to stderr. A source-wide exclusive lock serializes confirmed management transitions and dispatch reservations; provider terminal-event record writes and stop requests do not acquire that lock. Existing lock files require inspection, not automatic stale-lock deletion.

## Binding and Repository Identity

`lib/bindings.ts:WorktreeBinding` persists version 1 identity: task path, binding ID, canonical source/target/common-Git-directory paths, branch, pinned full base commit, context ID and creation time. Preparation state is `creating | unprepared | preparing | ready | error`.

- Source record: `.trellis/.runtime/pi-trellis/bindings/<sha256(taskDir)>.json`.
- Target marker: `.trellis/.runtime/pi-trellis/binding.json`.
- Execution record: source `.trellis/.runtime/pi-trellis/execution-<bindingId>.json`.

`parseBinding()` / `records.py:parse_binding()` validates identity fields and canonical paths. Records are local regular bounded JSON object files (present `null` is invalid, not absence); atomic JSON writes use `wx` temporary files (mode `0600`) and rename. Publication of source/target records is not a single cross-directory transaction. `sameIdentity()` / `records.py:same_identity()` deliberately compares immutable fields, not mutable preparation state; the source is authoritative for preparation.

`records.py:source_for()` treats a marker only as a hint: verify its authoritative source binding, common Git directory, registration and branch through `records.py:binding_problems()`. An unbound linked worktree cannot become an implicit source; explicitly adopt it from the source project. pi-trellis runtime paths cannot symlink outside their project; preparation separately checks the target sessions runtime.

## Preview, Create and Adopt

`manager.py:manage()` requires a safe `.trellis/tasks/<full-slug>` and never creates a task. New create/adopt validates the existing source task record; status and binding reuse do not necessarily reread it. New create paths derive from source-relative `worktree.directory` plus full slug; default branch is `trellis/<full-slug>`. `adopt --path` accepts an existing **branch-backed registered worktree of the same repository**, not an arbitrary directory, foreign repository, detached or bare worktree.

A preview resolves and reports a full commit ID, source, destination and branch without writing records/directories or changing Git. Create defaults to source HEAD; adopt defaults to target HEAD. Confirmation recomputes/revalidates the plan and checks under lock before mutation; the preview is not a persisted reservation. Do not claim preview and confirmation cannot observe a changed default HEAD. The persisted binding pins the resolved commit; callers can supply the previewed full commit explicitly.

Reject existing paths/branches, source-containing destinations, metadata paths and overlaps with registered worktrees. `canonicalPath()` / `records.py:canonical()` resolves symlinked ancestors without shell expansion and rejects dangling symlinks. Source runtime and any destination beneath source must be Git-ignored and untracked; target runtime must be ignored too. `records.py:require_ignored()` checks Git's effective ignore result and tracked files; it never edits `.gitignore`. The README recommends explicit project rules for reproducible baselines.

Confirmed create uses `git worktree add -b <branch> -- <destination> <baseCommit>` and verifies the resulting identity. Create/adopt ends **unprepared**: no source staged/unstaged/untracked code or task material is copied, no task starts, no agent launches. Failure after reservation records `error` and retains any created directory/branch for inspection; a failure before Git creates them may leave only the record. Reuse checks identity and explicit path/branch/base consistency; status reports missing/mismatched targets without recreating them. Existing absolute bindings remain usable independently of later invalid/new configuration.

Evidence: `tests/worktree.test.mjs` covers preview purity, pinned base, source/index preservation, binding/reuse, invalid inputs, lock/cancellation, branch mismatch and retained failures.

## Preparation: Task Material Only

`materials.py:prepare()` requires source `task.json.status === "in_progress"`; approval/start happens through the normal source workflow, not preparation. Preview validates conflicts and lists copies and target `after_start` hook risk without copying or starting anything.

The selection includes `task.json`, required PRD, implement/check JSONL, optional design/implement artifacts, and task-local references collected from both role manifests (typically selected research). It does **not** copy unselected research, source specs/code/scripts, `.pi` configuration or the source pointer. A selected directory can include its whole research subtree. Non-task references must exist with identical bytes in the target checkout and no uncommitted source difference; otherwise preparation refuses. This compares current files, not target Git tree objects. Task-local source material must be regular files and remain inside that task's resolved directory, which may be in an external source task store; target task store/runtime must be local.

Existing conflicting target material is preserved and rejected. The limited metadata exception changes only target `task.json.branch`; other metadata differences still conflict. Confirmed writes recheck paths/content, require local target task.py and native CLI/modules before copying (missing scaffolding needs an explicit baseline/update, never auto-deployment), create missing files exclusively, then run **target** `task.py start` with `binding.contextId`. That writes the target pointer/branch and can run configured target `after_start` hooks; no source lifecycle command or script patch is run. Preparation is not fully atomic: later failure can leave selected copies/hooks and an error record, never an automatic rollback.

`materials.py:validate_ready()` rechecks local task/runtime paths, both implement/check contexts with byte limits disabled, target status/branch and target CLI `current --json` provenance (`session:<binding.contextId>`, matching task, no stale/error). The manager separately validates hash-only material lineage/freshness through `material_summary()`; `validate_ready()` alone does not. Ready state is not acceptance or a clean tree. First successful preparation stores the delivered source graph/ancestors before interpreting target hook changes; hook divergence is never approved source. Repeated ready preparation verifies freshness without rerunning start or syncing; drift requires explicit refresh. `error/creating/preparing` require explicit recover before reuse.

Evidence: `tests/preparation.test.mjs` covers task-only copies, independent pointer, unchanged source, baseline conflicts, target preservation and metadata branch handling.

## Managed Dispatch and Provider Boundary

`registerDispatchTool()` requires:

1. Actual `process.cwd()` and event `ctx.cwd` both match the source root. A prompt that merely says the right cwd is insufficient for provider role discovery.
2. pi-trellis persistently configured in source/user settings so children reload it, not just a parent-only `-e` argument (`adapterConfigured()`).
3. Source task in progress, existing ready binding, matching repository/marker and `materials.py:validate_ready()` success.
4. Compatible source `.pi/agents/<role>.md`: exact role name, `isolation: off`, `extensions: true`, not `isolated: true`/`enabled: false`, and required tools. Customized incompatible files are rejected, never overwritten.
5. Provider ping success and no `starting/running/unknown` lease under the source lock.

The host calls `queryWorktree()` before dispatch and again inside its source lock, renders using the latest query's authoritative binding/facts, then performs a final ready fingerprint recheck before writing `starting`. Changed revision/source/target fingerprints refuse dispatch without a lease or spawn. Python computes materials after target `current` and rechecks target lifecycle; custom `task.py` may have side effects. Multiline prompt prose is retained; strict control-character rejection applies to identifier/options, not prose. Python queries verify source/task/identity/readiness/material freshness without acquiring that lock, avoiding nested-lock deadlock. TS retains v1 lease writes with the long-lived host PID/token, not a CLI PID. Dynamic header/record facts are `materialRevision`, `sourceFingerprint`, `targetFingerprint`; terminal callbacks preserve starting lineage, never asynchronously accept current requirements.

Build materials from the **target** with `buildTaskContext()` and include `Execution directory` and pinned `Review base`. Budget-limited inlining may still omit the complete marker; ready validation verified the full references, so the child must finish loading through fallback.

The actual spawn contract in `lib/subagent-rpc.ts` is:

```typescript
const reply = await rpc(pi, "spawn", {
  requestId: record.requestId, type: args.agent, prompt,
  options: { cwd: binding.worktreePath, isolation: "off" },
});
```

RPC uses correlated `subagents:rpc:<method>` / `reply:<requestId>` events. It returns the real provider ID for existing result/steering tools; there is no hidden source fallback or next-phase scheduling. Ordinary Agent calls for bound tasks/managed targets are blocked in the entrypoint. Third-party RPC/workflow launches bypass this occupancy gate; the tools/role rules are not an OS sandbox.

## Occupancy, Completion and Recovery

`ExecutionRecord` states are `starting | running | completed | failed | stopped | unknown`, with request ID, provider ID when known, owner PID/token, and optional final snapshot. Persist `starting` **before** spawn. A terminal event can arrive before the spawn reply; the bounded early-event map reconciles it so a finished child does not leave a stale running lease.

Spawn errors/timeouts or shutdown with owned or in-flight starting executions retain `unknown`; a late spawn reply after shutdown never revives a running lease. Call-time abort is not forwarded as an implicit provider cancellation. `trellis_dispatch action=stop` (task only; nonempty role/prompt fields are rejected as dispatch-only) requests provider stop for a known ID but retains occupancy until terminal evidence; successful stop RPC alone is not release.

`recover` verifies the current repository identity and rejects active live-owner records (`records.py:owner_alive()`) before returning a preview or acquiring the lock. Under lock it reloads the authoritative binding and execution, compares immutable identity and rechecks liveness; it does not repeat all marker/Git checks. Non-POSIX recovery conservatively cannot prove owner death. Do not infer a fully transactional recovery guarantee. Confirmation marks any recorded execution stopped and resets preparation to unprepared, without overwriting code. Nonpositive/group PIDs, permission errors and unsupported probes cannot prove owner death. POSIX `os.kill(pid, 0)` is conservative; inability to prove death retains ownership. Recovery is not automatic repair of arbitrary missing/changed worktree identities or stale locks. Run prepare again before dispatch.

A completed check can record `worktreeSnapshot()`. Status calls a completed check current only when its final checkout snapshot and starting `materialRevision` match, material state is valid, and source drift/conflicts are zero; inspect its report for acceptance. Source edits before refresh, or accepting changed requirements with unchanged target bytes, still make it stale. Missing lineage never becomes current evidence. The bounded snapshot matches host UTF-16 filename ordering (including supplementary Unicode), skips `.git`, `.pi`, `node_modules`, runtime and symlinks; large files use size/mtime. It is freshness evidence, not an exhaustive content/security guarantee.

Evidence: `tests/dispatch.test.mjs` covers target cwd/off options, real IDs, overlap, early completion, stale snapshots, shutdown and incompatible role/pointer rejection. Dead-owner/live-owner and cleanup cases are in `tests/preparation.test.mjs`.

## Explicit Materials and Synchronization

`materials.py` is the sole policy owner. New successful prepare writes a source-runtime private snapshot at `materials/<bindingId>/<snapshotId>.json` and publishes `binding.materials = {version: 1, revision, snapshotId}`. Strict descriptor/snapshot identity, schema, SHA-256/null hashes, contained regular paths and limits are validated. Snapshots contain accepted source graph (fixed artifacts plus both expanded role selections), and task-local common ancestors B; no body text. Null means missing, not empty. No old-worktree migration, baseline reconstruction or history ledger is provided.

Ordinary files hash raw bytes; task.json hashes canonical requirements excluding `branch`, `worktree_path`, `status`, `completedAt`, `commit`, `pr_url`. Unknown fields, `meta`, `base_branch` remain inputs; source/target `id`/`name` mismatches conflict in ready queries and refresh plans, including target-only changes. Refresh updates the whole source projection into the original target dict, preserving excluded lifecycle fields; status/branch/context eligibility remain independent guards. Collect never writes task.json.

`refresh --task ... [--confirm]` previews by default. Ready identity, source in_progress, target context and no starting/running/unknown lease are required, even for preview. Under confirmed source lock recompute the entire plan; there is no token/`--expect`/reservation. Whole-file B/S/T: source-only writes, target-only preserves B, equal convergence advances B, bilateral different changes conflict before any write. Source deselection with an existing file retains detached target output; physical source deletion deletes only an unchanged copy, preserving edited orphans. All role/fixed selections participate; any selected missing reference is invalid. External source/target referenced baseline files must match current bytes with no uncommitted source difference, including target-added references; they are never copied/deleted.

An in-memory `MaterialView` overlay validates the prospective target graph and rejects existing non-directory ancestors, permitting repairable old manifests without mutating trial files or rerunning start/hooks. Task-local reads/writes reject task-directory and descendant symlink aliases; only the explicit top-level source task-store route retains the external-store exception. Confirmed writes verify contained regular paths/before hashes, exclusively add, mode-preserving temporary replace, or delete individual unchanged files (not directories). task.json also rechecks raw bytes so excluded runtime changes are not overwritten. After writes recheck source/target graph and readiness, then publish snapshot/binding/marker. Multi-file/publication failure retains changed files, old descriptor and an error binding; no rollback. Accepting changed source requirements/references advances revision even with identical target bytes; true no-op retains revision. Preserved target divergence never becomes B.

`collect --task ...` with no files lists bounded candidates only; confirmation requires distinct explicit repeated `--file <current-task-project-relative-file>`. Fixed docs/manifests and textual `research/`/`evidence/` (.md/.txt/.json/.jsonl/.csv/.log) are eligible; no hidden/credential names, binary, code, task.json, runtime, other tasks, symlink aliases, globs/directories/all. Reverse whole-file B/S/T protects source, rejects unknown differing ancestry, and never propagates target deletion. Selected manifest dependencies must be explicitly collected or match source; prospective source graph is validated without silently copying dependencies. Only selected accepted inputs/ancestry update—unselected source drift stays visible. Idempotent unreferenced report collection may change snapshotId without requirements revision. Collection is not scope acceptance, Git integration or archive; the source task is the unique archive owner.

Snapshot maps/ancestry max 2048 entries, serialized snapshots max 1 MiB, virtual read files max 16 MiB, write overlay max 64 MiB, label max 4096 chars. Existing role expansion limits remain. Candidate discovery counts directories and files; output reports actual totals/omissions with max 24 paths and 8 KiB per summary list, max 48/24 KiB plan action samples. Policy computes the full bounded graph before sampling, never treating omitted paths as fresh. status/query return structured valid/invalid material summary, revision/source/target fingerprints, source drift, target changes, reference adds/removes and conflicts. Ready query rejects drift/conflicts; target single-sided task changes are reported without a role-policy matrix.

After safe removal succeeds, cleanup deletes only this binding's regular private snapshot files, never another binding. Recovery is not material repair; inspect/reconcile error state before reuse. Source lock does not lock editors, snapshot fingerprints are not an OS sandbox, and final recheck still cannot eliminate all external races.

Evidence: `tests/material-sync.test.mjs`, `tests/python/test_worktree.py`, `tests/worktree-protocol.test.mjs` and updated dispatch/CLI/context tests cover ancestry retention, overlays, normalized metadata, explicit collection, missing dependencies, occupancy, corrupted snapshots, partial failure retention, check invalidation and versioned dispatch.

## Removal

`manager.py:remove()` refuses active/unknown execution and removal of either the actual process cwd or the supplied `--cwd`. For an existing target it requires clean staged/unstaged/untracked state and user-approved `--integrated-into`; resolve that reference and require target HEAD to be its ancestor. Preview reports ignored files at risk. Confirmation rechecks identity, occupancy, clean state and ancestry, then uses ordinary `git worktree remove -- <path>`: **no force**, no branch deletion. Git can still refuse removal; do not reinterpret that as success.

After success, source binding/execution records are removed. An already manually removed target can be explicitly unbound without the existing-target clean/ancestry checks; its branch is retained. Prepared task artifacts often make a tree dirty, so preserve them via a separately approved workflow rather than force-cleaning for removal.

Use [Quality Guidelines](quality-guidelines.md) for fixture and validation conventions. Provider behavior beyond mocked events requires an explicitly configured optional probe, not an assumption.

## Migration and Deployment

Native management is the only lifecycle core; TS manager/preparation/cleanup/Git modules are retired. `scripts/deploy-worktree.py` deploys the fixed entry and private modules separately from the active_task.py patch; installer `--no-patch` still deploys them. Full recorded digests authorize updates only for untouched known files. Unknown/customized, missing recorded files, unsafe symlinks and incompatible manifests fail before writes. Deployment check/dry-run is read-only and modes survive atomic replacement; multi-file interruption is diagnosed, not silently repaired. CLI never invokes Node, providers or an installer. Material eligibility is limited to newly prepared snapshots; identity/lease paths remain v1, without old material migration. Extension updates need reload/restart; no workflow or customized-agent rewrite accompanies migration.

Evidence: `tests/worktree-cli.test.mjs`, `tests/python/test_worktree.py` and migrated worktree/preparation/dispatch fixtures cover fixed deployed entry, Node-unavailable execution, explicit source pins, cross-language records/locks, complete material rejection and deployment preservation. Python 3.10+ syntax; verified native platform/version is macOS/Python 3.14.7, not a cross-platform guarantee.


## Executable Boundary Summary

### Scope / Trigger

Apply when changing CLI parameters, Python/host queries, approval flags or execution fields. Management has one Python implementation; host events remain TS-owned.

### Signatures

```bash
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/<slug> [--base <ref>] [--branch <name>] [--confirm] [--json]
python3 .trellis/scripts/worktree.py adopt --task .trellis/tasks/<slug> --path <registered-path> [--confirm] [--json]
python3 .trellis/scripts/worktree.py remove --task .trellis/tasks/<slug> --integrated-into <ref> [--confirm] [--json]
```

Host calls retain `{agent, task?, prompt}` for dispatch; `{action: "stop", task?}` requests stop. Exact empty optional host placeholders mean omitted; CLI explicit empty values are errors.

### Contracts

CLI success JSON has `ok: true` plus management result fields; failure has `ok: false, error` and nonzero exit. Progress/diagnostics use stderr. `--task` is explicit, `--cwd` defaults to actual cwd. Target task CLI receives its binding context ID and sanitized Git environment; it never writes with the source session pin.

### Validation and Error Matrix

| Input/state | Result |
| --- | --- |
| create with --path, duplicate or empty argument | Parse rejection before repository writes |
| nonempty stop agent/prompt | Rejection before provider RPC |
| missing ready material or changed pointer | Reject dispatch without spawn/reservation |
| present null execution record / nonpositive PID | Invalid record / owner death unproven; no recovery bypass |
| approved remove but dirty/nonancestor/current cwd | Reject and preserve worktree/records |

### Good / Base / Bad Cases

- Good: preview create, obtain approval, confirm; then separately preview/approve prepare and dispatch.
- Base: `status --task ... --json` reads existing records without mutation.
- Bad: use `--confirm` as proof of consent, pass bind path to create, or clear occupancy immediately after a successful stop reply.

### Tests Required

CLI/parser tests assert no files/branches/records change on rejected input and preview. Deployment tests preserve customized/symlink files. Dispatch tests assert no RPC for inapplicable stop fields, a retained running lease after stop, and refreshed materials after locked query. Python and host fixtures must share v1 records/locks and snapshot ordering.

### Wrong vs Correct

Wrong: subprocess `cd` or inherited `TRELLIS_CONTEXT_ID` is assumed to switch/isolate the parent Pi session.

Correct: keep the source host unchanged, prepare using the bound target ID, and launch a new child via the public target cwd RPC.
