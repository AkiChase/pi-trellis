# Pi Initialization Contract

## Commands and ownership

`/trellis-init [--user <name>] [--check | --help]` is registered even without a
`.trellis` directory. Only native UI confirmation authorizes publication; no-UI
invocation returns a custom status message without a model turn or writes.
Unknown/repeated/missing parameters fail first. No force, general upgrade or
non-interactive write protocol is provided.

`lib/initialization/engine.ts` owns read-only `inspect()` / `plan()` and approved
`apply()`. Package runtime source remains in `runtime/`; no external CLI or
`trellis-core` dependency generates files. Canonical task defaults come from
`common.task_store.task_skeleton`; developer/journal bytes come from the pure
`common.developer.developer_skeleton`. CLI creation shares these factories.

Fresh projects receive runtime/three roles, editable Pi workflow/config/empty
spec entry and thinking guides, identity/workspace, and bootstrap task. Identity
setup on a supported clone adds only missing identity/workspace/onboarding.
History and other tasks remain byte-identical. Same identity is a no-op;
different identity conflicts. Unicode/spaces are preserved; unsafe path segments
are rejected. Onboarding uses the upstream-compatible lowercase/NFKD slug,
checks actual creator/assignee/record/PRD on reuse and diagnoses collisions.
Archived onboarding does not suppress recreating an absent active directory.

## Release and publication

Package `resources/runtime-baseline.json` is the source/output provenance and
runtime release identity. `resources/template-baseline.json` and
`resources/skill-baseline.json` record curated resource hashes/licensing;
`docs/agent-baseline.json` is the independent adapted-role source record.

Project `.trellis/.pi-trellis.json` schemaVersion 1 records `runtimeReleaseId`
and installed relative paths with full `sha256`, `mode`, `kind`, `source`.
Runtime bytes/modes must match before supported dispatch; template initial
hashes are diagnostic, not permission to overwrite edits. Roles publish only
in approved init, never automatically at startup. Unknown/custom definitions
collide during fresh init and are preserved. Clone identity setup leaves them alone.

Root AGENTS/ignore blocks append only when absent or reuse exact known blocks;
custom/repeated/malformed/unknown markers conflict. Outside bytes and original
file modes are preserved. The precise journal merge=union rule is additive;
conflicting journal attributes refuse publication. Symlink/dangling/nonregular
managed paths and ancestors are rejected; root itself may resolve normally.
HOME and managed worktree initialization are rejected.

Recovery treats persisted records as untrusted: the plan hash detects drift but
does not grant write ownership. Validators reject unknown schema fields and
reconstruct runtime/role/template/identity/task bytes from package resources and
the shared runtime skeletons. Non-root actions can only create missing files;
root actions must append the exact canonical block while proving the original
prefix hash, retaining mode and rejecting duplicate/conflicting blocks/attributes.
The exact manifest resource set, source paths, kinds, initial hashes and modes
are validated; editable template fingerprints do not require current template
bytes to remain unchanged. Required outputs are checked before final manifest
publication and completion. An incomplete operation blocks runtime verification
even if its manifest has already been published.

Apply uses `.trellis/.runtime/init.lock` and a bounded schema-1
`init-operation.json` with exact plan hash/original-output guards/completed
steps. All preconditions are rechecked before locking and before publication.
Each file publishes through exclusive same-directory temporary replacement.
The final manifest follows required outputs; the operation remains incomplete
until persisted identity/runtime/results verify. Failure preserves partial files,
never rolls back by deleting user-visible tasks/history. Retry accepts only the
same operation/release/developer with identical original or owned output bytes
and modes. Divergent changes conflict. A remaining lock is never guessed stale
or automatically removed. Directory creation before the first operation record
and OS-level concurrent ancestor swaps remain conservative manual-reconciliation
limits; this is not a whole-project transaction or an OS sandbox.

## Host integration

Native dialogs work in interactive/RPC UI; input's second argument is a
placeholder, not prefilled Git identity. History lists are bounded and unsafe
candidates are skipped. Git suggestions use argv and sanitized Git environment.
Python probing/generation uses argv, `-B` and copied no-bytecode environment.
Init runs no hooks, task binding, install, code scan or model turn.

Success invalidates context/task/section/display caches. Fresh init reloads via
command context to pick up root instructions/roles, then returns immediately.
Skills are package resources, not `.pi/skills` copies or an extension bridge.
The effective adapter guard uses the actual Pi package resolver, including
normal project precedence and autoload:false delta semantics, with missing
sources skipped rather than installed. Direct configuration assumes a trusted
source host; temporary `-e` is not a persistent child adapter.

Task pointer errors remain `task_error`, never a no_task planning breadcrumb.
Only command-bearing bash/bash_bg/monitor inputs receive explicit session export;
WebSocket monitors and non-command tools are unchanged. Related results invalidate
context/task caches. All deployed releases, including manifest-less legacy
projects, require successful complete resource-manifest/hash/mode verification
before session adaptation, task/context Python execution or child binding.
Absent, invalid, incomplete or mismatched manifests produce `task_error` and an
actionable `/trellis-init --check` diagnostic, not `No active task`.
`/trellis-init` remains registered in fresh and unsupported projects.

In an unsupported Trellis root, command tools block recognized task/context/
developer/journal/worktree invocations (direct Python/script commands, common
shell wrappers and runtime-module imports), as well as Trellis role launches.
Ordinary file reads/searches, unrelated shell commands, other agents and
WebSocket monitors remain available and unmodified. This bounded recognition
is not an arbitrary-shell interpreter or a sandbox: dynamically constructed
commands, external providers and independent direct subprocesses are not
universally intercepted. Native worktree lifecycle algorithms are unchanged.
The earlier unverified-execution probe is retained as historical red evidence;
see the init task's `research/unsupported-runtime-fix.md` for the fix and tests.

## Verification limits

Temporary full-runtime projects cover init/clone/no-op/collision/partial retry,
phase parser and task/context/journal interoperability. Fake native dialogs
cover English flows and cancellations; real Pi loader/resolver tests cover skill
and command discovery/filtering. No real visual TUI, network model/provider,
user-project deployment or broad Python/platform matrix is claimed. The package
has no lint/typecheck script; Node TS execution is not static checking. The legacy
installer and this repository's old scaffolding are migration-task work, not init.
