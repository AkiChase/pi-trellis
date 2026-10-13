# Extension and Runtime Specs

## Applicability

Use this layer for `extensions/trellis.ts`, `lib/*.ts`, runtime integration tests, or documentation of Pi/Trellis behavior. pi-trellis is one ESM package, not a Web application or monorepo. Installation and agent-source synchronization belong to the [scripts layer](../scripts/index.md).

## Topics

| Guide | Scope |
| --- | --- |
| [Architecture](architecture.md) | Entrypoint/module ownership, configuration, paths, types and failure boundaries |
| [Session and Context](session-and-context.md) | Session keys, CLI provenance, child pointers, JSONL materials and injection lifecycle |
| [Worktree Lifecycle](worktree-lifecycle.md) | Preview/confirm, persistent bindings, preparation, RPC occupancy and cleanup |
| [Task Browser](task-browser.md) | Read-only command, bounded task/document reads, native Markdown and keyboard viewport contracts |
| [Quality Guidelines](quality-guidelines.md) | Fixtures, preservation assertions, test environment and verification limits |

## Pre-Development Checklist

- Read the approved task artifacts and selected role JSONL references; manifests choose relevant specs, not every file in this layer.
- Read [Architecture](architecture.md) and the topic that owns the behavior being changed, including its cited source and tests.
- Read the [shared guides](../guides/index.md); for an integration change, trace the whole boundary before choosing an edit point.
- Identify execution root, context key, source/target ownership and allowed side effects. Do not infer approval from a pointer or status alone.
- Check [Quality Guidelines](quality-guidelines.md) before selecting validation commands.

## Quality Check

- Run relevant tests and record actual results and environment; the package has no lint/typecheck script.
- Verify negative cases preserve other sessions, source code/index, custom agents and worktree artifacts.
- For documentation changes, verify links, evidence paths, layer discovery and task manifests, including untracked Markdown.
- Do not describe temporary provider isolation, automatic phase advancement, or a complete upstream-free/MIT-only package. See [provenance](../scripts/agent-sync-and-provenance.md).
