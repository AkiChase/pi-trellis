---
name: trellis-continue
description: "Resume work on the current task. Loads the workflow Phase Index, figures out which phase/step to pick up at, then pulls the step-level detail via get_context.py --mode phase. Use when coming back to an in-progress task and you need to know what to do next."
---

# Continue Current Task

Resume work on the current task — pick up at the right phase/step in `.trellis/workflow.md`.

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

## Step 1: Load Current Context

```bash
python3 ./.trellis/scripts/get_context.py
```

Confirms: current task, git state, recent commits.

## Step 2: Load the Phase Index

```bash
python3 ./.trellis/scripts/get_context.py --mode phase
```

Shows the Phase Index (Plan / Execute / Finish) with routing + skill mapping.

## Step 3: Decide Where You Are

`get_context.py` shows the active task's `status` field. Route by `status` + artifact presence. This command replaces the user needing to remember the Trellis flow; it does not itself approve implementation.

- `status=planning` + no `prd.md` → **1.1** (load `trellis-brainstorm`)
- `status=planning` + `prd.md` only → decide whether the task is lightweight or complex. Lightweight can move to **1.4** review; complex returns to **1.1** to add `design.md` + `implement.md`.
- `status=planning` + artifacts complete + context missing for a role to be dispatched → **1.3**
- `status=planning` + required artifacts and selected role context ready → **1.4** (review approval; start only with explicit approval of the same plan, using `--allow-empty-context` for intentionally unused role manifests if needed)
- `status=in_progress` + implementation not started → **2.1**
- `status=in_progress` + current implementation stage done, not yet checked → **2.2**
- `status=in_progress` + current stage checked → follow **2.2** checkpoint instructions, then return to **2.1** for the next approved stage.
- `status=in_progress` + all stages checked → **3.1–3.4** for final acceptance, verification, spec assessment and Git review.
- `status=completed` → review acceptance and use existing archive authorization, or obtain it if absent.

Phase rules (full detail in `.trellis/workflow.md`):

1. Run steps **in order** within a phase — `[required]` steps must not be skipped
2. `[once]` steps are already done if the required output exists. `prd.md` alone can be enough only for lightweight tasks; complex tasks also need `design.md` and `implement.md`.
3. You may go back to an earlier phase if discoveries require it

## Step 4: Load the Specific Step

Once you know which step to resume at:

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.X>
```

Follow the loaded workflow within approved scope, honoring existing authorization and explicit opt-outs.
Do not turn every step into a fresh approval question. Report any conditional lifecycle actions left unperformed.

---

## Reference

Full workflow and detailed phase steps live in `.trellis/workflow.md`. This command is only an entry point — the canonical guidance is there.

## Pi Execution Boundary

Main-session `.trellis/...` paths are relative to the source project, not this package skill. Dispatched roles use verified absolute source material paths and separate executionRoot for code/tests. Read-only work needs no task; modifications require approval. Follow the project workflow for execution and review routing. Sub-agents must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
