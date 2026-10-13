---
name: trellis-continue
description: "Resume work on the current task. Loads the workflow Phase Index, figures out which phase/step to pick up at, then pulls the step-level detail via get_context.py --mode phase. Use when coming back to an in-progress task and you need to know what to do next."
---

# Continue Current Task

Resume work on the current task — pick up at the right phase/step in `.trellis/workflow.md`.

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

All `.trellis/...` paths are relative to the execution project, not this package skill. Read-only work needs no task; modifications require approval. Follow the project workflow for execution and review routing. Sub-agents must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
