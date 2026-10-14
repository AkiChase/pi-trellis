# Documentation

Feature usage and implementation notes belong in this root `docs/` directory.
`.trellis/spec/` is reserved for shared coding guidelines, architecture and
cross-module engineering boundaries—not one spec file per small feature.
Task requirements and execution records remain in `.trellis/tasks/`.

## Features

- [Task Viewer](task-viewer.md): `/trellis-task-viewer`, labels, ordering, current-tree promotion, navigation and read-only document browsing.
- [Persistent Task Display](task-display.md): task-count widget/footer and presentation behavior.
- [Project Initialization](initialization.md): explicit initialization and existing-project adoption.

## Runtime and Integration

- [Runtime Baseline](runtime-baseline.md): fixed runtime ownership and provenance.
- [Trellis Dispatch](dispatch.md): shared source execution, managed routing, concurrency warnings and stop semantics.
- [Managed Worktree Execution](worktree-execution.md): execution and material synchronization protocol.
- [Agent Synchronization](trellis-agent-sync.md): agent source adaptation and provenance.

Historical design plans are stored under `docs/plans/`; current usage is also
summarized in the [README](../README.md).
