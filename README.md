# pi-trellis

A project-local [pi](https://pi.dev) extension for [Trellis](https://www.npmjs.com/package/@mindfoldhq/trellis) projects.

It supplies an explicit Pi-native initializer plus a fixed project runtime in one package. The three bundled agents use Trellis 0.6.17's generated Claude Code roles as their baseline, with documented Pi tool, context, and correctness adaptations. See [agent provenance and synchronization](docs/trellis-agent-sync.md).

## What it does

| | |
|---|---|
| **Task context injection** | Adds `session-overview` and `trellis-workflow` sections to the system prompt, plus a per-turn task-state message. The model knows the active task, its status, and the workflow breadcrumb without reading a single file. |
| **Task display** | A persistent themed line above the editor: `▸ trellis(3) · 00-bootstrap-guidelines · in_progress · prd ✓ design · impl ·`. Shows the project-wide unfinished task count even without an active session task, refreshed when a session starts, when a turn ends, and immediately after a `task.py` bash result. Switch it to the footer chip or turn it off with `TRELLIS_PI_STATUS`. |
| **Session isolation** | Derives a separate `TRELLIS_CONTEXT_ID` per session/root and passes it explicitly to CLI/bash calls. Dispatched children bind the explicit task under their own key without lifecycle hooks; they never reuse the dispatcher's pointer. No shared-process environment mutation. |
| **Subagent context** | Claude-based `trellis-implement`, `trellis-check`, and `trellis-research` agents adapted for Pi. Ordinary `Agent` dispatch loads role JSONL references and task artifacts with byte budgets and fallback diagnostics. |
| **Package skills** | Ten curated Pi skills load through `pi.skills`; there is no project copy or extension skill bridge. |

What it deliberately does **not** do: implement subagents (that is [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents)' job), install anything globally, or install dependencies during project initialization.

## Initialize a new project

Install the package using Pi, grant project trust when applicable, then use the English native command:

```text
/trellis-init
/trellis-init --user "Your Name"
/trellis-init --check
/trellis-init --help
```

No global Trellis CLI is required. Python 3.10+ is required. `--user` skips name selection,
not the final confirmation. Interactive and RPC native dialogs support initialization;
headless invocation reports status and instructions without writing.

Fresh initialization creates a fixed runtime, Pi roles, editable workflow/config/spec entry,
identity/workspace and `00-bootstrap-guidelines`. It selects no active task and runs no
hooks, model turn, Git action or dependency installation. Supported clones missing local
identity can reuse historical usernames/journals and create/reuse `00-join-<slug>`;
existing different identity is a conflict, not a silent switch. No frontend/backend rules,
project-type detection, multiple-package setup, remote templates or arbitrary upstream migration.

An existing `.trellis/` project without a managed manifest offers **Adopt existing project**:
one confirmation lists Install/Replace/Create/Preserve/Current resources plus legacy paths
left in place. Adoption installs the fixed runtime and roles, replacing older copies and the
`AGENTS.md`/`.gitignore` managed blocks without backups, while leaving existing workflow,
config, spec, tasks, journals and identity byte-identical; the eight template targets that
already exist are recorded as `preserved-project` provenance instead of being written.
Nothing is deleted, no onboarding task is created, and identity setup stays a separate step.
This is the only supported adoption path; there is still no general upstream migration.
Existing managed projects can review resource updates or restore missing resources
through `/trellis-init`. Status shows per-file health and installed/available versions.
Healthy existing projects also offer **Apply template**: choose Workflow, Spec, or both,
then confirm one Replace/Create/Same file list. This explicitly adopts the bundled
workflow and four basic spec documents, with replaced files and original provenance
backed up under `.trellis/.runtime/template-backups/`. Project-only spec files and
runtime/config/identity/tasks/journals remain unchanged; no diff viewer or automatic merge.

`.trellis/.pi-trellis.json` records the installed runtime release, hashes/modes and resource
provenance separately from the package baseline. Unknown collisions and customized root
blocks are rejected before writes. Initialization uses a local lock and bounded operation
record; interrupted publication preserves files and retries only identical recorded outputs.
This is per-file atomic publication, not an all-files transaction. See [initialization contract](docs/initialization.md).

## Install

```bash
pi install -l --approve git:github.com/AkiChase/pi-trellis
pi
# In Pi, grant project trust and run /trellis-init.
```

Installing the package exposes the extension and bundled skills. It does not
initialize project files. `/trellis-init` explicitly deploys the fixed Python
runtime and role definitions after reviewing and confirming the plan.

`scripts/install.sh` is an optional thin wrapper around the same local package
installation. `--source <spec>` selects a source, `--check` checks Pi availability
without writes, and `--dry-run` prints the installation command. Neither mode
runs project scripts. Obsolete `--neutral-skills` and `--no-patch` are rejected.
No global Trellis CLI or install-time patch is required.

Remove the package with `pi remove -l git:github.com/AkiChase/pi-trellis`.
Project runtime, configuration and history remain; removal never deletes them.

### Requirements

- pi ≥ 1.1.0
- Python ≥ 3.10 on `PATH` (override with `TRELLIS_PYTHON`)
- a subagent extension for the `trellis-*` agents — `pi install @tintinweb/pi-subagents`. Without one, everything else still works; you get one warning at startup.

Existing host behavior has macOS/Linux evidence. The native management CLI is verified on macOS with Python 3.14.7; Python 3.10 is the syntax minimum, not a tested version matrix. Windows is untested and recovery conservatively refuses to prove owner death there.

## Agent definitions and `.gitignore`

Explicit `/trellis-init` publishes the bundled `trellis-implement.md`, `trellis-check.md` and `trellis-research.md` into `.pi/agents/`, then records their full hashes/modes in `.trellis/.pi-trellis.json`. Session startup never deploys or upgrades roles. Their baseline is Trellis 0.6.17's Claude Code definitions, with explicit Pi adaptations:

- **implement** reads task artifacts and `implement.jsonl`, implements and validates, and does not commit, push, or merge.
- **check** reviews committed changes against an explicit review base, staged/unstaged changes and new files; fixes clear issues within scope and reruns validation on the final version. It is not a read-only audit agent.
- **research** reads code and documentation and writes findings only under the active task's `research/` directory. Standalone read-only exploration can still happen in the main session without creating a task.

**Edit those files freely.** A file whose content no longer matches the recorded hash is never overwritten — that is the supported way to customize an agent for your project. New package versions do not silently replace definitions; `/trellis-init` can review updates to recorded, unmodified resources. Existing customized files are preserved, so inspect them if they still contain the old read-only check/research rules.

Whether they belong in git is your call:

- **Commit them** to share agent definitions with your team. Keep these roles and the initialization manifest in the committed baseline.
- **Do not ignore the runtime manifest**: a clone needs it to recognize the supported release. Initialization does not regenerate missing/custom roles on session startup.

## Known limitations

**Skills load from the package.** `pi.skills: ["skills"]` exposes ten curated skills with complete references. `/skill:trellis-start` and `/skill:trellis-continue` are real skill commands, not `/trellis:*` aliases. Pi's resource filters and trust rules determine what actually loads. A project `autoload:false` entry is a delta: empty arrays do nothing, explicit `-path` exclusions disable resources. Normal package entries with `extensions: []` disable that resource type. The adapter readiness guard uses Pi's actual resolver without installing missing sources.

**The workflow section is an excerpt.** Only the stable head of `.trellis/workflow.md` is injected (about 10 KB), with platform blocks that do not name Pi removed. Per-phase detail is loaded on demand via `get_context.py --mode phase --step <N.N>`; the model is told so.

**Headless sessions get less.** Subagent sessions and `pi -p` skip the workflow excerpt, since it is the largest block and the least useful to a single-purpose agent. Set `TRELLIS_PI_CONTEXT=full` to inject everything anyway, or `compact` to force the small payload in an interactive session.

**Subagent materials are budgeted.** `.trellis/config.yaml` supports `context_injection.max_file_bytes` (32768), `max_artifact_bytes` (65536), and `max_total_bytes` (131072); `0` disables a limit. Partial/missing/binary material receives a diagnostic and does not get the complete-injection marker: the agent must read missing context before working. Paths stay inside the execution project or its explicit top-level Trellis task-store symlink. Direct RPC callers must assemble materials explicitly; ordinary `Agent` hooks cannot intercept third-party RPC/workflow dispatch.

**External research is configuration-dependent.** Agent files inherit configured extensions/skills, not a particular web service. Without actual search/MCP tools, research reports that external search was unavailable. Built-in tool allowlists and role instructions are not a shell sandbox or a restriction on every extension tool.

**Task-level worktree management.** `python3 .trellis/scripts/worktree.py` owns creation/adoption, preparation, explicit material refresh/collection, status, recovery and safe removal; only execution/stop remains in Pi. The old `trellis_worktree` tool is not registered. Material lineage applies to newly prepared worktrees; there is no old-worktree migration or snapshot reconstruction. `trellis_dispatch` sends a role to an existing ready directory. No temporary subagent isolation, automatic phase advancement, commits, merges or branch deletion. Read the package-local [execution protocol](docs/worktree-execution.md) before the first managed operation; the overview supplies its actual installed read path.

### Worktree usage

Source `.gitignore` must explicitly ignore `/.worktree/` (or your configured directory) and `/.trellis/.runtime/`. The target base must also ignore its runtime. The native CLI checks this; it never edits `.gitignore` silently. Optional `.pi/pi-trellis.json` (relative paths resolve from source root):

```json
{ "worktree": { "directory": ".worktree" } }
```

Run the fixed project entry from the source project (no package-path lookup):

```bash
python3 .trellis/scripts/worktree.py --help
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/<full-slug>
# Repeat only after approval; optionally pin the preview's full commit with --base:
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/<full-slug> --confirm
python3 .trellis/scripts/worktree.py prepare --task .trellis/tasks/<full-slug>
# After approval of copies and target start/hooks:
python3 .trellis/scripts/worktree.py prepare --task .trellis/tasks/<full-slug> --confirm
python3 .trellis/scripts/worktree.py status --task .trellis/tasks/<full-slug> --json
```

`adopt --path <registered-worktree>` handles an existing branch-backed worktree. `create` accepts `--base`/`--branch`, not `--path`. Every command requires explicit `--task`; `--cwd` defaults to process cwd. `--json` outputs one object (failures nonzero; diagnostics/progress stderr). Unknown, abbreviated, repeated (except distinct `collect --file` selections), inapplicable, missing and empty/control-character options fail before mutation. `status` is read-only; all other commands preview by default. A preview is not a reservation: default HEAD can change before confirmation; supply its full commit to pin it.

Creates never copy staged/unstaged/untracked source code, commit, install, or delete anything. New configuration affects new creates only; existing bindings keep their absolute path.

After create/adopt, use `prepare` (preview, then `--confirm`). Source task must already be `in_progress`. Preparation copies only task artifacts and task-local referenced research; specs/code/scripts stay at the target baseline. The baseline must contain local task.py and deployed native CLI/modules; missing scaffolding requires committing it or an explicitly approved target update, not copying source scripts during prepare. Conflicts or source spec differences are reported, never silently overwritten. It runs **target** `task.py start`, including configured `after_start` hooks, with the independent target context ID and inherited Git redirection variables removed, then validates the target pointer and branch. Successful preparation marks `ready` and stores a bounded hash-only source snapshot, separating accepted source requirements from per-file common ancestry. Target hook changes remain target divergence. Repeated ready preparation validates; it does not synchronize.

When approved source requirements change, preview `refresh --task ...`, review paths/hashes and actual diffs, then repeat with user-approved `--confirm`. Whole-file B/S/T detects single-sided changes, convergence and conflicts without text merging. Target-only changes keep their original ancestry; deselected files stay detached, edited source-deleted copies stay orphan outputs. Baseline references are never copied. `task.json` syncs requirements excluding `branch`, `worktree_path`, `status`, `completedAt`, `commit`, `pr_url`; identity changes conflict, unknown fields/meta/base_branch remain requirements.

Before integration/archive, `collect --task ...` lists bounded candidates without writing. Use repeated explicit `--file <current-task-project-relative-file>` for task documents or textual research/evidence, preview and approve confirmation. No task.json, code, runtime, binary/hidden credential files, directory/glob/all selection, or target-deletion propagation. Manifest dependencies must be explicitly selected or already match source. Collection is idempotent, preserves unrelated source drift and never commits/merges/archives; the source task is the unique archive owner. Both directions refuse active/unknown execution and bilateral conflicts before writes. Confirmation recomputes under lock without a token/reservation; multi-file failure preserves files/old snapshot with an error binding, not automatic rollback.

Dispatch from a Pi host opened at the source project root:

```json
{ "agent": "trellis-implement", "task": ".trellis/tasks/<full-slug>", "prompt": "Implement the approved task" }
```

Pass this to `trellis_dispatch`; use its returned ID with existing result and steering tools. The main agent chooses when to dispatch check to the same directory. Ordinary Agent calls for a bound task are blocked before starting; `completed` means the agent ended, not acceptance. Source drift or conflicts block dispatch. Locked latest query, target rendering and a final Python fingerprint recheck precede spawn; dynamic prompt/execution records carry material revision and source/target fingerprints. Check currentness needs both final checkout snapshot and starting material revision, with no source drift/conflict—even a refresh with unchanged target bytes can invalidate it. Inspect its report; bounded snapshot exclusions/large-file mtime fallback are not exhaustive verification.

`trellis_dispatch` with `{ "action": "stop", "task": ".trellis/tasks/<full-slug>" }` requests the provider to stop (no agent/prompt required); the lease remains until a terminal event. Timeout/restart ambiguity retains an `unknown` lease and code. Explicit `recover` resets preparation and releases an execution only after its owner process has exited; live owners must be stopped through the provider. Stale lock files need manual inspection, not automatic deletion.

`remove` previews ignored-file risks and requires confirmation, a clean worktree and `--integrated-into <reference>` (the user-approved reference preserving its commits). It uses ordinary `git worktree remove`, never force-removes, deletes the branch, or removes the actual process cwd (even when `--cwd` points elsewhere). A manually removed target can be explicitly unbound. Task artifacts often keep a prepared tree dirty: preserve/commit/archive them through the normal approved workflow before cleanup.

**Limits:** first version accepts branch-backed worktrees and strict bundled-style role config (`isolation: off`, `extensions: true`, required tools). Customized incompatible files are kept and rejected, not replaced. Managed dispatch requires the actual host/source cwd to match and pi-trellis persistently configured in source/user settings (not just a parent-only `-e`) so children can reload the adapter. Worktrees and role rules are not an OS sandbox; third-party RPC/workflow launches are outside this tool's occupancy gate.

## Environment variables

| Variable | Effect |
|---|---|
| `TRELLIS_CONTEXT_ID` | Pins the Trellis session key. Set it yourself to intentionally share an active task; otherwise derive from root plus session file/id. Child dispatch receives an explicit key, and shell calls are scoped without mutating process.env. |
| `TRELLIS_PYTHON` | Python interpreter. Defaults to `python3` (`python` on Windows). |
| `TRELLIS_PI_CONTEXT` | `full` or `compact` to override the headless heuristic. |
| `TRELLIS_PI_STATUS` | `widget` (default), `status`, or `off`. See below. |

## Where the task display goes

In a supported Trellis project, the display stays visible even when this
session has no active task: `▸ trellis(3)`. The tightly appended count includes
all unfinished task records immediately under `.trellis/tasks/`, including
parent and child tasks once each, regardless of assignee or session. Completed
records and `archive/` are excluded; the project's explicit top-level task-store
symlink is supported. Positive counts use `accent`, zero uses `dim`. Unreadable
or invalid count data shows muted `(?)`, not a verified zero. The count is read
from disk on existing refresh events; there is no polling or file watching.

The default is a **widget**: its own row above the editor, drawn with your
theme's colors. With an active task, it adds the full task name, status,
conditional subtask count and planning artifacts after `▸ trellis(N)`.
Status colors carry meaning — `planning` is warning, `in_progress` is
accent, `completed` is success, `task_error` is error.

`TRELLIS_PI_STATUS=status` moves it into the themed footer instead
(`trellis(3): 00-boot… ▸ in_progress`, or just `trellis(3)` without an active
task). The chip preserves the count within a compact 34-terminal-column budget,
using Pi's host-provided `visibleWidth()` / `truncateToWidth()` helpers before
theming. Fitting names/statuses stay intact, including CJK, combining characters
and emoji; long names and custom statuses are shortened. It shares one
line with every other extension that calls `setStatus()`: pi joins those
statuses with a space, sorts them alphabetically by key, and truncates the
whole line to the terminal width. Keys never collide — each extension owns its
own — but width is finite, and `trellis` sorts late enough to be among the
first to get cut. The widget has no such competition: widgets are keyed and
stacked, up to ten lines across all extensions.

`TRELLIS_PI_STATUS=off` and unsupported projects draw nothing. Context injection
is unaffected either way — the display is just a display.

## Browse task documents

Run `/trellis-task` in Pi's interactive terminal to open a read-only task list,
with or without a current session task. It reads project task files directly;
no deployed scripts, model request, task start/switch, or file writes are needed.
Non-archived tasks (including completed records still in the active store) are
shown with status colors, parent/child tree lines, and `*` for the current task.
This browser is separate from the persistent unfinished-task count above.

- **List:** Up/Down selects, Enter opens details, Esc closes. PageUp/PageDown
  moves by a page. Returning from detail preserves list selection and position.
- **Detail:** Left/Right switches Overview, PRD, Design, and Implement;
  Up/Down and PageUp/PageDown scroll the bounded content area. Full titles and
  paths wrap inside that area. Esc returns to the list.
- **Refresh:** `r` rereads task records, current-session identity, and documents.
  Missing, empty, removed, unreadable, and invalid data have distinct notices;
  incomplete enumeration is not reported as an empty project.

Application labels are English; task titles and document text retain their
original language. Documents use Pi's active Markdown theme for headings,
lists/checklists, emphasis, code, quotes, links, and wrapping tables. Images
remain readable Markdown source (alt text and URL); HTML and diagrams remain
text rather than executing or fetching resources. Files must be UTF-8 regular
files inside the selected task directory (safe local symlinks are allowed);
records are limited to 1 MiB and documents to 2 MiB, with diagnostics instead of
truncated success. If host Markdown rendering fails, the complete document
source remains scrollable with an English warning. RPC, print, and JSON modes
explain that custom terminal browsing is unavailable.
Search, editing, lifecycle actions, and archive browsing are not included.

## Design notes

- **Project data and runtime have different owners.** Workflow/config/spec/history remain project content; fixed scripts and their release manifest are managed by pi-trellis. Upstream `trellis update` is not a supported update path.
- **Prompt sections are memoized for the process lifetime.** A system-prompt section that changes between turns invalidates the provider's prefix cache from byte zero. Volatile state travels as a custom message instead, and only when it actually changed.
- **Subagent sessions may load this extension too.** The dispatch supplies the task/context identity and role materials; the child uses these facts instead of inheriting a mutable process-global pointer. Child-side fallback reads JSONL/artifacts when complete injection is unavailable. No task materials are added a second time to the system prompt.
- **Optional discovery/UI degrades safely.** Missing `.trellis/` or unusable CLI context does not take the session down. Dispatch material errors are visible and keep fallback active; they are not presented as complete injection. Only ordinary Agent calls are patched, not hidden RPC dispatch.

## Fixed runtime source (deployment not automatic)

`runtime/` contains the supported task/context/journal/developer Python import
closure derived from **Trellis 0.6.16**, plus the unchanged original native
worktree implementation moved from `python/`. The adapted agent documents have
an independent **0.6.17** baseline. [Runtime provenance and contracts](docs/runtime-baseline.md)
and `resources/runtime-baseline.json` record exact source/output hashes, licenses,
Python syntax minimum and a content-derived release ID. No global `trellis`
probe or installation-time textual patch is used by this fixed runtime.

Installation alone does **not** deploy runtime. New projects use the confirmed
`/trellis-init` flow; this repository was explicitly migrated while retaining its
existing guidelines, configuration, tasks and history. Project commands execute
`.trellis/scripts/`, not package-source `runtime/`. No general legacy project
migration or automatic runtime upgrade is provided.

## Development checks

Pi supplies `@earendil-works/pi-tui` as a `*` peer dependency; it is not bundled
or installed separately. Direct-TS tests use the real public TUI export via a
test-only loader alias, analogous to the provider probe. If local peers are
absent, point `PI_TRELLIS_TEST_HOST` at an existing Pi `node_modules` directory:

```bash
# Omit this variable when the host peer is already locally resolvable.
export PI_TRELLIS_TEST_HOST=/path/to/installed/pi/node_modules
env -u TRELLIS_CONTEXT_ID npm test
# Focused direct-TS tests need the same preload:
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs
# Full real runtime copies in disposable projects (same host preload):
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/runtime-contracts.test.mjs
# Native standard-library unit tests (also included in npm test):
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
node scripts/sync-agents.mjs <fixed-version-generated-.claude/agents> --check
# Optional: real Pi/provider execution, scripted offline model responses only
node tests/provider-contracts.mjs --host <Pi-node_modules> --provider <provider-package-root>
```

Repeat `--provider` to test standalone pi-subagents and a vendored agent-tasks implementation separately. Do not install two conflicting providers in the same live Pi session.

## License

Original pi-trellis integration and native worktree code is licensed under [MIT](LICENSE); maintained derivatives of Trellis runtime code retain AGPL as described below. The bundled `agents/trellis-*.md` documents are adapted from `@mindfoldhq/trellis@0.6.17` Claude Code assets, whose package declares `AGPL-3.0-only`; they retain that upstream license, reproduced in [licenses/trellis-AGPL-3.0.txt](licenses/trellis-AGPL-3.0.txt). See [provenance](docs/trellis-agent-sync.md) for generation commands, adaptations and checksums.

The fixed Trellis-derived runtime entries and `runtime/common/` retain **AGPL-3.0-only** attribution from the verified 0.6.16 baseline; the native worktree modules remain **MIT**. Source and adapted output hashes are in [runtime-baseline.json](resources/runtime-baseline.json). Existing project integration still uses the `task.py` / `get_context.py` CLIs, `TRELLIS_CONTEXT_ID`, and paths under `.trellis/`. Do not describe the complete package as containing no upstream Trellis material or as MIT-only.
