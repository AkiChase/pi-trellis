# Pi Initialization Contract

## Commands and ownership

`/trellis-init [--user <name>] [--check | --help]` is registered even without a
`.trellis` directory. Only native UI confirmation authorizes publication; no-UI
invocation returns a custom status message without a model turn or writes.
Unknown/repeated/missing parameters fail first. No force, arbitrary upstream
migration or non-interactive write protocol is provided.

## Managed resource updates and useful status

An initialized healthy project exposes `Update project resources`, `Apply template`,
`View project status`, and `Cancel`. Update also restores missing managed files; there is no separate repair menu.
When nothing needs changing, it reports `Project resources are up to date.`.
Resource status lists installed/available runtime
IDs and individual missing, modified, current, safe-update and preserved-document paths;
it is not merely a duplicate of the menu summary. Skills load from the installed package.

`lib/initialization/resources.ts` builds a read-only update/repair preview. Only files
matching their recorded installed fingerprint can be updated; missing owned files can
be restored. Modified runtime/role files block publication rather than being overwritten.
Untouched package-default documents can update, while customized/default or originally
preserved documents remain user content. Existing identity, tasks, logs, session state
and bootstrap/onboarding tasks are not recreated. Unknown inventory/schema requires
explicit reconciliation; this is not a general legacy migration API.

Publication requires confirmation, locks and fresh rechecks, and writes the manifest
last. It is per-file atomic, not a multi-file transaction: interrupted writes are retained;
retry accepts exact new package bytes as already applied, not arbitrary changes. Old
completed init records are retained as audit history outside live initialization recovery.
Successful changes refresh host state and reload resources. `--check` is read-only.

## Explicit template adoption

On a healthy existing source project, `Apply template` offers `Workflow`, `Spec`,
or `Workflow + Spec`. One action-list confirmation shows `Replace`, `Create`,
and `Same`; there is no diff viewer or per-file selection. Cancel is read-only.
This explicitly replaces user documents, unlike safe resource update.

Workflow selects only `.trellis/workflow.md`. Spec selects only the bundled
`spec/index.md` and three `spec/guides/` index/reuse/cross-layer documents.
Other project spec files, config, runtime, agents, identity, tasks and journals
remain unchanged. Same means matching bytes and mode; those files are not written.
Selected template provenance is changed to exact `package-default`, including
Same documents, so future safe updates can recognize adoption.

`templatePlan()` reconstructs the fixed allowlist and package bytes, requires a
current unmodified runtime through the authoritative validator, and guards the
manifest, initialization operation record and all selected documents. Before
manifest publication, current package provenance must still match the confirmed
plan, even though the selected document outputs have now changed.
`applyTemplatePlan()` rechecks under the shared initialization lock. Before any
replacement, all replaced files (with original modes) and the original manifest
are backed up beneath `.trellis/.runtime/template-backups/<uuid>/`, retaining
project-relative paths. The result reports the backup location. Symlinks,
nonregular/oversized files, forged or stale plans and changed package hashes fail.
Publication is per-file atomic, not transactional: on partial failure, backups
and already published files remain, the error names the backup, and no automatic
rollback or implicit recovery is attempted. The manifest is published last.
Success refreshes host context; no runtime deployment, hooks, task activation,
installation or automatic reload occurs. Remote templates are not supported.

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

Project `.trellis/.pi-trellis.json` **schemaVersion 2** has exactly four fields:
`schemaVersion`, `runtimeReleaseId`, `files`, `templates`. This replaces the
unreleased schema 1; there is no schema-1 fallback or general migration API.
The independent runtime release ID/baseline schema remains unchanged.

- `files` contains exactly the 32 runtime and three role paths. Each record has
  exactly `sha256`, `mode`, `kind` (`runtime` or `agent`), `source`; all four
  values must match the package baseline. Runtime disk bytes/modes are checked
  before supported execution. Role publication remains approved-init-only;
  identity setup preserves deployed roles, including later customizations.
- `templates` contains exactly the eight known workflow/config/ignore/workspace
  index/spec entry/thinking-guide targets, never arbitrary paths. Every record
  has exactly `origin`, `sha256`, `mode`, `source`. Fresh init emits only
  `package-default`, with exact package initial hash, mode 0644 and canonical
  `resources/templates/...` source. A false canonical hash/mode/source is rejected.
- `preserved-project` describes content retained by a separately reviewed,
  one-time repository migration, not content installed from the package. It
  records the actual initial lowercase 64-hex SHA-256 and integer mode 0–0777,
  or **both** `sha256: null` and `mode: null` for an absent target. Its `source`
  is exactly `{kind: "project-snapshot", revision: <null or lowercase 40/64-hex>}`.
  The revision identifies the diagnostic snapshot, not a file/executable or
  authority to fetch, read or write content. Unknown fields, malformed hashes,
  modes, mixed nulls, source labels/revisions and unknown targets are rejected.

Template provenance is a bounded initial declaration, not authentication of
historical deployment or permission to overwrite user edits; current template
bytes need not match it, and an initially absent target may remain absent.
Managed template paths/ancestors still reject symlinks/nonregular targets.
Public init cannot request preserved provenance or initialize a manifest-less
legacy project. Supported clone identity setup preserves the entire existing
manifest and project templates. Unknown/custom role definitions collide during
fresh init and are preserved.

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
The exact fixed resource set/source/kind/hash/mode and separate bounded template
provenance are validated. Fresh initialization/recovery additionally requires
**canonical package-default** template and manifest outputs, not merely a valid
installed manifest. Preserved provenance cannot authorize a template action,
arbitrary output, identity-time template write or legacy initialization.
Required outputs are checked before final manifest
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
