---
name: trellis-start
description: "Initializes an AI development session by reading workflow guides, developer identity, git status, active tasks, and project guidelines from .trellis/. Classifies incoming tasks and routes to brainstorm, direct edit, or task workflow. Use when beginning a new coding session, resuming work, starting a new task, or re-establishing project context."
---

# Start Session

Initialize a Trellis-managed development session. Pi supplies a session overview. Reuse it and refresh missing or stale context on demand.

## Dispatched Role: Source Materials, Execution Code

A dispatched role requires the host-validated exact four-line header (`Active task`, `Trellis context id`,
`Trellis agent`, `Trellis authority`), followed by a blank line. Use its absolute sourceRoot/materialRoot,
taskPath/specRoot/workflowPath and separate executionRoot. Missing or invalid authority is a blocker;
report to main and stop, with no local `task.py current` or execution-checkout `.trellis` fallback.
Fully read source PRD, optional design/implement, workflow and the selected implement/check JSONL plus
all references; research has no implement/check manifest requirement. Resolve relative materials from
sourceRoot, inspect/edit product code/tests at executionRoot, and paginate read offset/limit until complete.
Paths/hashes are not injected bodies or actual-read proof; no complete-injection shortcut applies.
Source task/spec/workflow are read-only by default. Main owns integration, reference repair and lifecycle.
Return results/evidence; source evidence/research writes require explicit path-scoped authorization.
An already-running role works directly: never dispatch recursively, start/hooks, commit or finish.
For the main-session CLI steps below, use the source root. For a dispatched role, use absolute source
reads first; if a read-only CLI is needed, invoke the verified source `.trellis/scripts/` separately with
its independent child context. Product shells retain execution cwd; do not mix source CLI and product commands.
Main verifies obsolete source references and repairs them within existing authorization, then requeries
and redispatches. No target material synchronization, binding migration or automatic source fallback.

---

## Step 1: Current state
Identity, git status, current task, active tasks, journal location.

```bash
python3 ./.trellis/scripts/get_context.py
```

## Step 2: Workflow overview
Compact Phase Index, request triage rules, planning artifact contract, and the step-detail command.

```bash
python3 ./.trellis/scripts/get_context.py --mode phase
```

Full guide in `.trellis/workflow.md` (read on demand).

## Step 3: Guideline indexes
Discover existing spec layers, then read each relevant index file.

```bash
python3 ./.trellis/scripts/get_context.py --mode packages
cat .trellis/spec/guides/index.md
cat .trellis/spec/<layer>/index.md   # for each relevant layer
```

Index files list the specific guideline docs to read when you actually start coding.

## Step 4: Decide next action
From Step 1 you know the current task and status. Check the task directory:

- **Active task status `planning` + no `prd.md`** → Phase 1.1. Load the `trellis-brainstorm` skill.
- **Active task status `planning` + `prd.md` exists** → stay in Phase 1. Lightweight tasks can be PRD-only; complex tasks need `design.md` + `implement.md`. Load the relevant Phase 1 step detail before `task.py start`.
- **Active task status `in_progress`** → Phase 2 step 2.1. Load the step detail:
  ```bash
  python3 ./.trellis/scripts/get_context.py --mode phase --step 2.1
  ```
- **No active task** → Read-only conversation, research and explanation need no task. Before preparing changes, ask for task/planning approval. Corrupt bindings are task_error, not no_task.

---

## Skill routing (quick reference)

| User intent | Skill |
|---|---|
| New feature / unclear requirements | `trellis-brainstorm` |
| About to write code | `trellis-before-dev` |
| Done coding / quality check | `trellis-check` |
| Stuck / fixed same bug multiple times | `trellis-break-loop` |
| Learned something worth capturing | `trellis-update-spec` |

Full rules + anti-rationalization table in `.trellis/workflow.md`.

## Pi Execution Boundary

Main-session `.trellis/...` paths are relative to the source project, not this package skill. Dispatched roles use verified absolute source material paths and separate executionRoot for code/tests. Read-only work needs no task; modifications require approval. Follow the project workflow for execution and review routing. Sub-agents must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
