---
name: trellis-finish-work
description: "Wrap up the current session: verify quality gate passed, remind user to commit, archive completed tasks, and record session progress to the developer journal. Use when done coding and ready to end the session."
---

# Finish Work

Only the main session performs lifecycle actions, after quality/acceptance review and explicit user approval.

1. Inspect `python3 .trellis/scripts/get_context.py --mode record`, Git status and the exact current task. Preserve unrelated staged and unstaged work.
2. Unfinished work stays active. Do not archive a task merely because a session ends; `task.py finish` only clears your own pointer, not status.
3. Approved code commits belong to workflow step 3.4, never an implicit side effect of this skill.
4. After separate archive approval, use `python3 .trellis/scripts/task.py archive <exact-task> --no-commit` unless automatic Git action was explicitly approved. Review branch/acceptance requirements; do not bypass them by assumption.
5. Record a deliberate session summary with `python3 .trellis/scripts/add_session.py --title "Session title" --summary "Summary" --no-commit`; provide real approved work commit hashes when relevant. Respect configuration and user Git approval.
6. Report exact actions, preserved parallel work and remaining verification limits. Never finish/archive from a dispatched sub-agent.

## Pi Execution Boundary

All `.trellis/...` paths are relative to the execution project, not this package skill. Read-only work needs no task; modifications require approval. Main dispatches implementation/check roles; an already-running role must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
