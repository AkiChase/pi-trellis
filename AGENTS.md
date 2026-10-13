<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

Pi skills are supplied by the installed pi-trellis package. Use `/skill:trellis-continue` and `/skill:trellis-finish-work` when appropriate; `/trellis-init` initializes a new project or sets local developer identity on a supported clone. Role definitions live in `.pi/agents/`.

Project guidelines, tasks, workspace history and configuration are user-owned. The fixed runtime and its provenance are managed by pi-trellis; do not run upstream `trellis update` to replace this distribution's scripts.

<!-- TRELLIS:END -->
