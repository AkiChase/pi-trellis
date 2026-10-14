---
name: trellis-finish-work
description: "Wrap up accepted work: archive completed tasks, clear the current task binding, and record session progress under existing user authorization. Use when ready for task or session wrap-up."
---

# Finish Work

Only the main session performs lifecycle actions after quality/acceptance review.
Authorization to run `trellis-finish-work` covers the applicable archive, deactivation, journal recording and
local commits of those wrap-up changes under the project workflow; do not ask for each action separately.
Honor already-granted finish-work authorization without asking again. Respect explicit user restrictions;
unfinished work must not be archived, and wrap-up authorization never includes push or history rewriting.

1. Inspect `python3 .trellis/scripts/get_context.py --mode record`, Git status and the exact current task. Preserve unrelated staged and unstaged work.
2. Unfinished work stays active. Do not archive a task merely because a session ends; `task.py deactivate` only clears your own session binding, not task status. Work wrap-up, task archive and journal recording are separate actions.
3. Code submission policy belongs to the project workflow, not this skill. Never implicitly commit product code as a side effect of lifecycle commands.
4. For accepted completed work within the authorized wrap-up scope, use `python3 .trellis/scripts/task.py archive <exact-task>`. Review branch/acceptance requirements; do not bypass them by assumption. Check that the current session binding is cleared after archive; for session-only deactivation, use `task.py deactivate` without treating the task as completed.
5. Record a deliberate summary using `python3 .trellis/scripts/add_session.py --title "Session title" --summary "Summary"`; provide actual work commit hashes with `--commit` when relevant. Respect journal configuration.
6. By default, let these commands auto-commit according to `session_auto_commit`. Use `--no-commit` only when the user explicitly forbids commits or the actual commit scope contains parallel changes that cannot safely be included. If `session_auto_commit: false`, do not bypass it with manual commits.
   Before each command, inspect its complete commit scope and actual diff, not just the new record: journal commits include the current developer's journal files/index and current bound task; archive commits include source/destination and affected child task paths. Scoped paths protect unrelated staged files, not parallel changes within those paths. For a mixed scope, use `--no-commit` and safely separate authorized wrap-up hunks for a local commit under the project workflow, or report the blocker if safe separation is uncertain. Never sweep unrelated changes into a wrap-up commit.
7. Verify resulting commits and remaining changes after each command. An auto-commit failure is not successful submission: safely complete the outstanding scoped commit or report the failure and exact pending paths. Configured skips remain uncommitted and must be reported, not silently treated as committed.
8. Report exact actions, preserved parallel work and remaining verification limits. Never finish/archive from a dispatched sub-agent.

## Pi Execution Boundary

All `.trellis/...` paths are relative to the execution project, not this package skill. Read-only work needs no task; modifications require approval. Follow the project workflow for execution and review routing. Sub-agents must not recursively dispatch. Managed worktrees follow the package protocol referenced in the session overview. Do not modify deployed runtime to bypass release hashes.
