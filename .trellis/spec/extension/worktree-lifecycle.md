# Persistent Worktree Lifecycle

## Applicability and Invariants

Use this guide for `lib/worktree*.ts`, `lib/bindings.ts`, `lib/preparation.ts`, `lib/executions.ts`, `lib/subagent-rpc.ts` and `lib/cleanup.ts`. pi-trellis manages a persistent task directory, then uses the provider's public cwd RPC. It does not modify providers, use temporary subagent isolation, automatically advance phases, install dependencies, commit, merge or delete branches.

Caller approval is required before setting `confirm: true`; a tool flag is not proof of consent. `trellis_worktree` is sequential at the host tool boundary. A source-wide exclusive lock serializes confirmed management transitions and dispatch reservations; provider terminal-event record writes and stop requests do not acquire that lock. Existing lock files require inspection, not automatic stale-lock deletion.

## Binding and Repository Identity

`lib/bindings.ts:WorktreeBinding` persists version 1 identity: task path, binding ID, canonical source/target/common-Git-directory paths, branch, pinned full base commit, context ID and creation time. Preparation state is `creating | unprepared | preparing | ready | error`.

- Source record: `.trellis/.runtime/pi-trellis/bindings/<sha256(taskDir)>.json`.
- Target marker: `.trellis/.runtime/pi-trellis/binding.json`.
- Execution record: source `.trellis/.runtime/pi-trellis/execution-<bindingId>.json`.

`parseBinding()` validates identity fields and canonical paths. Records are local regular bounded files; atomic JSON writes use `wx` temporary files (mode `0600`) and rename. Publication of source/target records is not a single cross-directory transaction. `sameIdentity()` deliberately compares immutable fields, not mutable preparation state; the source is authoritative for preparation.

`sourceFor()` treats a marker only as a hint: verify its authoritative source binding, common Git directory, registration and branch through `bindingProblems()`. An unbound linked worktree cannot become an implicit source; explicitly bind it from the source project. pi-trellis runtime paths cannot symlink outside their project; preparation separately checks the target sessions runtime.

## Preview, Create and Bind

`manageWorktree()` requires a safe `.trellis/tasks/<full-slug>` and never creates a task. New create/bind validates the existing source task record; status and binding reuse do not necessarily reread it. New create paths derive from source-relative `worktree.directory` plus full slug; default branch is `trellis/<full-slug>`. `bind` accepts an existing **branch-backed registered worktree of the same repository**, not an arbitrary directory, foreign repository, detached or bare worktree.

A preview resolves and reports a full commit ID, source, destination and branch without writing records/directories or changing Git. Create defaults to source HEAD; bind defaults to target HEAD. Confirmation recomputes/revalidates the plan and checks under lock before mutation; the preview is not a persisted reservation. Do not claim preview and confirmation cannot observe a changed default HEAD. The persisted binding pins the resolved commit; callers can supply the previewed full commit explicitly.

Reject existing paths/branches, source-containing destinations, metadata paths and overlaps with registered worktrees. `canonicalPath()` resolves symlinked ancestors without shell expansion and rejects dangling symlinks. Source runtime and any destination beneath source must be Git-ignored and untracked; target runtime must be ignored too. `requireIgnored()` checks Git's effective ignore result and tracked files; it never edits `.gitignore`. The README recommends explicit project rules for reproducible baselines.

Confirmed create uses `git worktree add -b <branch> -- <destination> <baseCommit>` and verifies the resulting identity. Create/bind ends **unprepared**: no source staged/unstaged/untracked code or task material is copied, no task starts, no agent launches. Failure after reservation records `error` and retains any created directory/branch for inspection; a failure before Git creates them may leave only the record. Reuse checks identity and explicit path/branch/base consistency; status reports missing/mismatched targets without recreating them. Existing absolute bindings remain usable independently of later invalid/new configuration.

Evidence: `tests/worktree.test.mjs` covers preview purity, pinned base, source/index preservation, binding/reuse, invalid inputs, lock/cancellation, branch mismatch and retained failures.

## Preparation: Task Material Only

`prepareWorktree()` requires source `task.json.status === "in_progress"`; approval/start happens through the normal source workflow, not preparation. Preview validates conflicts and lists copies and target `after_start` hook risk without copying or starting anything.

The selection includes `task.json`, required PRD, implement/check JSONL, optional design/implement artifacts, and task-local references collected from both role manifests (typically selected research). It does **not** copy unselected research, source specs/code/scripts, `.pi` configuration or the source pointer. A selected directory can include its whole research subtree. Non-task references must exist with identical bytes in the target checkout and no uncommitted source difference; otherwise preparation refuses. This compares current files, not target Git tree objects. Task-local source material must be regular files and remain inside that task's resolved directory, which may be in an external source task store; target task store/runtime must be local.

Existing conflicting target material is preserved and rejected. The limited metadata exception changes only target `task.json.branch`; other metadata differences still conflict. Confirmed writes recheck paths/content, create missing files exclusively, then run **target** `task.py start` with `binding.contextId`. That writes the target pointer/branch and can run configured target `after_start` hooks; no source lifecycle command or script patch is run. Preparation is not fully atomic: later failure can leave selected copies/hooks and an error record, never an automatic rollback.

`validateReady()` rechecks local task/runtime paths, both implement/check contexts with byte limits disabled, target status/branch and target CLI `current --json` provenance (`session:<binding.contextId>`, matching task, no stale/error). Ready validates references, not acceptance or a clean tree. Repeated ready preparation validates without rerunning start. `error/creating/preparing` require explicit recover before reuse.

Evidence: `tests/preparation.test.mjs` covers task-only copies, independent pointer, unchanged source, baseline conflicts, target preservation and metadata branch handling.

## Managed Dispatch and Provider Boundary

`registerDispatchTool()` requires:

1. Actual `process.cwd()` and event `ctx.cwd` both match the source root. A prompt that merely says the right cwd is insufficient for provider role discovery.
2. pi-trellis persistently configured in source/user settings so children reload it, not just a parent-only `-e` argument (`adapterConfigured()`).
3. Source task in progress, existing ready binding, matching repository/marker and `validateReady()` success.
4. Compatible source `.pi/agents/<role>.md`: exact role name, `isolation: off`, `extensions: true`, not `isolated: true`/`enabled: false`, and required tools. Customized incompatible files are rejected, never overwritten.
5. Provider ping success and no `starting/running/unknown` lease under the source lock.

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

Spawn errors/timeouts or shutdown with owned executions retain `unknown`; uncertainty is not proof the detached child stopped. Call-time abort is not forwarded as an implicit provider cancellation. `stop` requests provider stop for a known ID but retains occupancy until terminal evidence; successful stop RPC alone is not release.

`recover` verifies the current repository identity and rejects active live-owner records (`ownerAlive()`) before returning a preview or acquiring the lock. Under lock it rechecks owner liveness for an existing active record; it does not repeat all repository/marker checks or reload every binding field. Do not infer a fully transactional recovery guarantee. Confirmation marks any recorded execution stopped and resets preparation to unprepared, without overwriting code. `process.kill(pid, 0)` is conservative; inability to prove death retains ownership. Recovery is not automatic repair of arbitrary missing/changed worktree identities or stale locks. Run prepare again before dispatch.

A completed check can record `worktreeSnapshot()`. Status says only that the check ended on the current snapshot; inspect its report for acceptance. Later changes to fingerprinted inputs make it stale, but not every file change is detected. The bounded snapshot skips `.git`, `.pi`, `node_modules`, runtime and symlinks; large files use size/mtime. It is freshness evidence, not an exhaustive content/security guarantee.

Evidence: `tests/dispatch.test.mjs` covers target cwd/off options, real IDs, overlap, early completion, stale snapshots, shutdown and incompatible role/pointer rejection. Dead-owner/live-owner and cleanup cases are in `tests/preparation.test.mjs`.

## Removal

`removeWorktree()` refuses active/unknown execution and removal of the current cwd. For an existing target it requires clean staged/unstaged/untracked state and user-approved `integratedInto`; resolve that reference and require target HEAD to be its ancestor. Preview reports ignored files at risk. Confirmation rechecks identity, occupancy, clean state and ancestry, then uses ordinary `git worktree remove -- <path>`: **no force**, no branch deletion. Git can still refuse removal; do not reinterpret that as success.

After success, source binding/execution records are removed. An already manually removed target can be explicitly unbound without the existing-target clean/ancestry checks; its branch is retained. Prepared task artifacts often make a tree dirty, so preserve them via a separately approved workflow rather than force-cleaning for removal.

Use [Quality Guidelines](quality-guidelines.md) for fixture and validation conventions. Provider behavior beyond mocked events requires an explicitly configured optional probe, not an assumption.
