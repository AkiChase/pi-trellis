# Managed worktree execution

`trellis_dispatch` also supports unbound tasks in the shared source directory; see [unified dispatch](dispatch.md). The steps below apply only when choosing managed execution. A task with active source execution cannot create/adopt a worktree until terminal evidence is recorded. There is no source recovery through the managed CLI.

Read this protocol before the first managed operation. Commands run from the **source project root** through `python3 .trellis/scripts/worktree.py`; this package document is not a CLI entry. Use each command's `--help` for exact flags. If the CLI or document is missing, request an explicit installation/update; never auto-install.

## First execution

1. Approve and start the source task through the project's normal workflow. Worktrees are optional, not required for all tasks.
2. Preview `create --task .trellis/tasks/<slug>` (or `adopt` for a registered branch-backed directory). Obtain user approval before repeating with `--confirm`. This leaves an unprepared directory pinned to the reported base; it does not copy source code or start an agent.
3. Preview and approve `prepare`. Only the selected current-task documents are copied, including uncommitted materials. External references must match the target baseline and have no uncommitted source difference. The target must already contain committed Trellis/native CLI scaffolding.
4. Confirm preparation runs **target** `task.py start` and configured `after_start` hooks using an independent context. It creates a hash-only source snapshot; hook changes remain visible target changes, not approved source requirements.
5. Dispatch the approved role with `trellis_dispatch {agent, task, prompt}`. Keep the main Pi host at the source root. The provider receives the existing target cwd and `isolation: off`, and returns its real ID for normal result/steering tools. Never use temporary isolation or source fallback.

The project owns phase decisions. No operation automatically advances to check, commits, merges, installs dependencies or archives. Child agents work only in their supplied task/root/role scope and load any omitted full context; they do not manage worktrees or source lifecycle.

## Check and freshness

Python validates identity, independent target context, complete references and current approved source requirements. Dispatch performs a locked latest query, renders target material, then rechecks its fingerprints before reserving execution. Dynamic prompt and execution records carry the material revision and source/target fingerprints.

`status --task ... --json` reports bounded drift/change/conflict summaries and check freshness. A completed check is **not acceptance**: inspect the report. Currentness requires its final checkout snapshot and starting material revision to match, with no source drift/conflict. Snapshot exclusions and large-file size/mtime fallback are not exhaustive change detection.

## Refresh approved requirements

Edit approved materials at the source, then preview `refresh --task ...`. Repeated `prepare` validates; it never secretly refreshes. Drift blocks managed dispatch until explicitly reconciled.

Review action paths and hashes and read/diff the actual files. Confirm only after user approval. Confirmation recomputes under the source lock; the preview is not a reservation or token. Source-only changes update the target; target-only changes retain their original common ancestor; equal changes converge. Different bilateral changes refuse the whole plan before writes. There is no text merge or force flag.

A removed reference retains the target file as detached while the source file exists. A physically deleted source file deletes only an unchanged target copy; edited copies remain orphan output. Missing selected references are errors. Baseline specs/code are never copied—explicitly reconcile them. `task.json` syncs one whole requirements projection, preserving target `branch`, `worktree_path`, `status`, `completedAt`, `commit`, and `pr_url`; `id`/`name` changes require explicit identity resolution. `base_branch`, `meta` and unknown fields remain requirements.

Refresh does not rerun start/hooks, write pointers, or copy business code. Accepted requirements/reference changes advance revision even when target bytes are already equal, making old checks stale. Target-only changes are reported without a new role-policy matrix; role scope is still mandatory.

## Collect before integration/archive

`collect --task ...` without `--file` only lists bounded task-local candidates. Explicitly select each file with repeated `--file <project-relative-current-task-file>`; no globs, directories or `--all`. Preview, review actual differences, then obtain approval before `--confirm`.

Collect uses the reverse hash-only three-way rule. Source conflicts and unknown ancestry never authorize overwrite; missing target files never delete source files. `task.json`, runtime, other tasks, code, symlinks, hidden environment/credential files and binary material are not collectible. When collecting a manifest, explicitly select new task-local dependencies too, unless matching source copies already exist. No dependencies are silently copied.

Repeated collection is idempotent. Collecting an execution input updates only selected accepted inputs and ancestry, leaving unrelated source drift visible and invalidating old material lineage. An unreferenced report can be collected without advancing requirements revision. Main-session review is still required; collection does not approve new scope or a passing check.

The target task is an execution copy. Collect and review at the source before separately approved Git integration and **one source-task archive**. Collect never commits, merges, archives or changes task metadata. Do not independently archive the child copy.

## Occupancy and failures

Starting/running/unknown execution blocks refresh, collect and removal. `trellis_dispatch {action: "stop", task}` requests provider stop; only terminal evidence releases occupancy. Stop success is not proof the child stopped. Shutdown/ambiguous spawn retains unknown; inspect the real ID/provider before dead-owner recovery.

Confirmed operations revalidate all plans and each write's contained regular path/hash, preserving file modes. The source lock does not lock editors. Multi-file writes and source/target publication are not transactions; a later error retains changed files, old snapshot and an error binding, with no rollback/reset/force cleanup. Recover only releases proven dead ownership/reset preparation; it does not repair conflicting materials or missing scaffolding. Inspect and explicitly reconcile before reuse. Only newly prepared snapshots are supported; no old-worktree migration or baseline reconstruction exists.

Removal is a separate user-approved operation requiring a clean target and a preserving `--integrated-into` reference. Preview ignored files at risk. It uses ordinary Git removal, never force or branch deletion; only after success does it clean this binding's private snapshots. Preserve outputs through approved collection/integration before cleanup.
