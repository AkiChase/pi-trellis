---
name: trellis-finish-work
description: "Wrap up accepted work: archive completed tasks, clear the current task binding, and record session progress under existing user authorization. Use when ready for task or session wrap-up."
---

# Finish Work

Only the main session performs lifecycle actions, after quality/acceptance review and user authorization.
Honor already-granted finish/archive/journal authorization without asking again. Authorization does not waive completion requirements.

1. Inspect `python3 .trellis/scripts/get_context.py --mode record`, Git status and the exact current task. Preserve unrelated staged and unstaged work.
2. Unfinished work stays active. Do not archive a task merely because a session ends; `task.py deactivate` only clears your own session binding, not task status. Work wrap-up, task archive and journal recording are separate actions.
3. Code submission policy belongs to the project workflow, not this skill. Never implicitly commit product code as a side effect of lifecycle commands.
4. With archive authorization, use `python3 .trellis/scripts/task.py archive <exact-task> --no-commit`. Review branch/acceptance requirements; do not bypass them by assumption. Check that the current session binding is cleared after archive; for an authorized session-only deactivation, use `task.py deactivate` without treating the task as completed.
5. With journal authorization, record a deliberate summary using `python3 .trellis/scripts/add_session.py --title "Session title" --summary "Summary" --no-commit`; provide actual work commit hashes when relevant. Respect journal configuration.
6. Report exact actions, preserved parallel work and remaining verification limits. Never finish/archive from a dispatched sub-agent.

## Pi Execution Boundary

All `.trellis/...` paths are relative to the execution project, not this package skill. Read-only work needs no task; modifications require approval. Follow the project workflow for execution and review routing. Sub-agents must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
