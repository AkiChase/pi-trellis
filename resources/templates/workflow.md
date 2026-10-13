# Pi Trellis Workflow

## Core Principles

Read before write. Project guidelines and task artifacts are authoritative.
Read-only exploration, research and explanation need no task and grant no implementation approval.
Create a task only when preparing changes and after user approval. Never infer approval from status.
No automatic phase advancement, Git commits, push, installation or dependency fetching.

## Planning Artifacts

Lightweight tasks may use a PRD alone; complex tasks need `prd.md`, `design.md`, `implement.md`.
Curate `implement.jsonl` and `check.jsonl` with real project-root-relative files before role dispatch.
Parent/child links are organization, not a dependency scheduler. Execute in the approved order.
Session-scoped pointers never infer another session. `finish` clears only your pointer, not task status.

## Phase Index

1. Plan: 1.0 orientation, 1.1 requirements, 1.2 design, 1.3 context, 1.4 review/start.
2. Execute: 2.1 implement, 2.2 independent check.
3. Finish: 3.1 review, 3.2 verify, 3.3 capture specs, 3.4 approved commit, 3.5 archive/journal.
Pull details on demand: `python3 .trellis/scripts/get_context.py --mode phase --step X.Y`.

## Phase 1: Plan

#### 1.0 Orient [required]
Use `/skill:trellis-start`; inspect identity, Git state and current session task.
If scripts are absent, explicitly use `/trellis-init`. Unsupported runtime is read-only, not auto-upgraded.

#### 1.1 Requirements [required]
Use `/skill:trellis-brainstorm`. Read-only questions do not need task creation.
Before preparing changes, get task creation/planning approval. Save goals, scope and acceptance in PRD.

#### 1.2 Design [once]
For complex work, document ownership, interfaces, validation, failure/rollback and exclusions.
Write an ordered implementation plan with actual test commands. Do not implement during planning.

#### 1.3 Context [required]
Use `/skill:trellis-before-dev`. Discover relevant spec indexes, read their checklists and guides.
Curate real JSONL references; no placeholder rows or unrelated entire directories.

#### 1.4 Review and Start [required]
Review required artifacts and obtain implementation approval before `task.py start <task>`.
Status changes are not approval. Respect already-granted bounded authorization.

## Phase 2: Execute

#### 2.1 Implement [required]
The main session dispatches `trellis-implement`; a role already running implements directly, never recursively dispatches.
Dispatch starts with `Active task: <path>`, context id and role. Bind the child to its independent session key,
without calling start or hooks. Load JSONL references, PRD, optional design and implement plan unless a complete
injection marker is present in the task-context block. Read all omitted materials within the task store boundary.
Bound tasks must use managed `trellis_dispatch` from the source host after approved preparation, not ordinary Agent
or temporary isolation. Read the package-local worktree protocol from the session overview on demand.
Only work the approved scope; preserve parallel changes. Do not commit, install or finish as a sub-agent.

#### 2.2 Check [required]
Main dispatches `trellis-check` for independent review; an already-running role self-checks without recursion.
Use `/skill:trellis-check`, real focused tests and full available checks. Fix only scoped findings.
Record exact commands and unavailable checks; simulated UI is not real visual/provider validation.

## Phase 3: Finish

#### 3.1 Review [required]
Compare actual changes with PRD acceptance. Inspect tracked, untracked and parallel hunks without reverting unrelated work.

#### 3.2 Verify [required]
Rerun relevant checks after final edits; record failures and limits. No unrun check is Passed.

#### 3.3 Capture Specs [required]
Use `/skill:trellis-update-spec` for reusable evidence-backed contracts. Keep project rules in project specs.

#### 3.4 Commit [required]
Only after explicit approval, group the task's exact files/hunks and commit. Preserve unrelated staged work.
Never push without separate approval. Initialization does not approve this step.

#### 3.5 Archive and Journal [required]
Use `/skill:trellis-finish-work`. Only main performs approved finish/archive/session recording.
Unfinished tasks stay active; finish alone does not complete status. Archive only accepted completed work.
Journal records deliberate summaries, respecting configuration and explicit Git approval.

## Breadcrumbs

[workflow-state:no_task]
No active task. Read-only exploration needs no task. Before modifying code, ask for task/planning approval.
[/workflow-state:no_task]

[workflow-state:task_error]
Task binding or runtime is invalid. Inspect the diagnostic before reading task material or dispatching. Do not treat this as no_task or approval.
[/workflow-state:task_error]

[workflow-state:planning]
Stay in Phase 1. Review required artifacts and curate context before approved start.
[/workflow-state:planning]

[workflow-state:in_progress]
Main session: dispatch implement then independent check. Already-running sub-agent: work directly, do not dispatch roles recursively. No implicit Git/finish approval.
[/workflow-state:in_progress]

[workflow-state:completed]
Review acceptance and get explicit approval for commit/archive/journal; preserve unfinished work.
[/workflow-state:completed]
