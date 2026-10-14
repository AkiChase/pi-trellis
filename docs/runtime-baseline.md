# Fixed Runtime Baseline

## Source and License

`resources/runtime-baseline.json` schema v1 records a fixed **Trellis 0.6.16**
source category. All 28 original project Python files were byte-compared against
that installed npm release's `dist/templates/trellis/scripts/` files. The package
vendors only the five supported entries and their AST import closure (24 original
files), not unused `cli_adapter.py`, `task_queue.py`, root `__init__.py` or
`hooks/linear_sync.py`. The original full SHA-256 inventory remains in the
manifest. No verified upstream Git revision is asserted.

Trellis-derived entries/common modules retain **AGPL-3.0-only**, Mindfold LLC
attribution and modification notices; the license is shipped in
`licenses/trellis-AGPL-3.0.txt`. New shared `common/task_records.py` is maintained
as part of that AGPL adaptation. Native `runtime/pi_trellis_worktree/`,
`worktree.py` and private `query-worktree.py` remain original **MIT** pi-trellis
code, initially moved byte-identically from `python/`. Current native changes retain
that original source hash/revision and record distinct output hashes with `modified: true`.
The adapted agent documents' **0.6.17**
source and `docs/agent-baseline.json` are independent; do not conflate versions.

Each runtime file has `sourceSha256`, final `sha256`, source path, origin and
license. `releaseId` is `pi-trellis-runtime-v1-` plus SHA-256 of compact sorted
JSON `{schemaVersion, files: {path: outputHash}}`; package version alone does not
authorize deployment. Python **3.10** is the syntax floor checked with AST
`feature_version=(3,10)` and in-memory compilation. Executed interpreter evidence
is macOS/Python 3.14.7, not a tested 3.10-to-3.14 or Windows matrix.

## Deployment Boundary

Package `runtime/` is source; project commands still run `.trellis/scripts/`.
This runtime child does not deploy scripts or initialize projects. Existing
`scripts/install.sh` and `scripts/patch-trellis.py` remain legacy until the
separate initialization/migration work replaces installation behavior.
`scripts/deploy-worktree.py` still deploys **only** the native CLI/modules,
now reading from `runtime/`; it never deploys Trellis common modules or query.
There is one native algorithm implementation, not parallel `python/` copies.

Supported fixed entries: `task.py`, `get_context.py`, `add_session.py`,
`init_developer.py`, `get_developer.py`, `worktree.py`. Query is a private host
entry. All entries suppress import bytecode. Task/context/developer operations
require no global `trellis`; update/version probes and update-marker writes are
removed. Config imports retain existing package-related configuration reading
for compatibility; no new frontend/backend or package detection is implemented.

## Task and Session Contracts

- Pi owns key derivation. Python accepts an explicitly supplied, trimmed
  `TRELLIS_CONTEXT_ID` matching `[A-Za-z0-9_-]{1,128}`; invalid overrides fail
  rather than sanitize into another key. No platform/ticket/sole-session
  inference, even when the legacy fallback keyword is true.
- `ActiveTask.valid` authorizes only an existing task with a valid bounded
  record. Invalid references retain `raw_ref`, `error`, `state` and source for
  diagnostics, but `task_path` and `get_current_task()` become `None`.
- Resolution requires a lexical descendant of `.trellis/tasks` and a real
  descendant of its resolved store. The explicitly external top-level **source**
  task store is allowed; arbitrary external paths/task links are not. Record
  reads require a regular `task.json` inside the same store, at most **1 MiB**,
  a nonempty object and at least one identity/status field. Present identity
  fields must be nonempty strings; status is limited to 128 characters, other
  projected strings to 8192. Optional malformed values do not crash readers;
  children project only safe strings from the first 512 entries.
- `start` requires identity and valid record before binding/status/hooks. Missing
  or invalid records fail. `current --json` returns null plus diagnostic on
  invalid pointers/tasks, distinct from `no-task`/`no-identity`; both invalid
  and absent task cases exit nonzero.
- `deactivate` unlinks **only its own key** and returns prior authorization only
  after unlink succeeds. Session runtime ancestors must be local directories;
  symlinked ancestors cannot authorize reads, start, deactivate or archive. A final
  pointer symlink is invalid and deactivate may remove that link only, not its target.
  Clearing its corrupt/stale pointer reports diagnostics
  without hooks; repeated/missing deactivate runs none. Unlink failure exits nonzero.
  Valid deactivation invokes `after_deactivate` once, without changing task status,
  archiving or recording a journal. The old `finish` command and `after_finish`
  hook are not supported.
- Context/package/journal CLI readers refuse invalid pointer state; direct
  context readers retain `task_error`. Raw stale references never select task
  files, packages, journal metadata or hook paths. Hooks revalidate records.
  Existing host error/display adaptation remains separate integration work.
  `task.py validate` shares bounded record authorization, rejecting invalid or
  outside-store task.json instead of raw metadata reads.
- Journals auto-stage developer journal/index products and the **exact validated
  task path**, including an archived task's month path, never its basename.
  External task stores cannot be staged by the local Git repository and are
  skipped, never remapped to a local victim.
- Archive auto-stage/commit includes the **actual moved destination**, source
  deletion and explicitly edited child **task.json** files—not the whole archive
  or child directories. Existing unrelated staged entries are preserved by
  explicit commit pathspecs. Archive destination ancestors and dangling links
  are rejected before status, child records or session pointers change. Git
  subprocess environments remove inherited
  `GIT_*` overrides; arbitrary trusted hooks still execute shell commands.

## Developer Contract

Names are trimmed safe single segments, allowing reasonable Unicode and spaces.
Reject empty/dot/traversal/separators (including whitespace-padded dot segments),
control/format/surrogate characters and
names longer than 255 characters. Existing effective identity is never switched:
same-name requests are no-ops; different requests fail and report actual identity.
Unsafe environment/file identities fail rather than feed workspace paths. Local
identity/workspace/file symlinks refuse initialization; existing journal/index bytes are
preserved. Identity publication follows successful scaffold creation and uses
exclusive create; this is not a general initialization transaction.

## Verification and Deferred Work

`tests/runtime-contracts.test.mjs` copies the **full runtime** into disposable Git
projects, covering real script effects, forbidden reads/hooks/commits, real child
binding/deactivate/non-resurrection, preserved identity/index/history, source/output
hashes, import closure, syntax and `npm pack --dry-run` contents. It uses the real
host preload (`tests/host-tui.mjs`, explicit `PI_TRELLIS_TEST_HOST` if needed).
Fixture commits are not user-project commits. Native worktree/material/dispatch
regressions verify current behavior and source/output provenance separately.

Deferred: hierarchy cycles/rendering, rename pointer redesign, journal semantic
retry changes, snapshot symlink/mode fixes, effective provider adapter detection,
init UI/resource publication and repository migration. These tests are not a
real-model/provider/TUI acceptance test or OS sandbox proof. There is no package
lint/typecheck script; direct TS execution is not static checking.
