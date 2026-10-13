# Script and Agent-Source Specs

## Applicability

Use this layer for `scripts/install.sh`, `scripts/patch-trellis.py`, `scripts/sync-agents.mjs`, bundled agent source/provenance and their tests. Generated user-project `.trellis/scripts/` and `.pi/agents/` are not interchangeable with package source. Runtime deployment and dispatch also require the [extension layer](../extension/index.md).

## Topics

| Guide | Scope |
| --- | --- |
| [Installation and Patching](installation-and-patching.md) | Preflight, read-only modes, explicit opt-out, exact/atomic Python patch and rejected inputs |
| [Agent Sync and Provenance](agent-sync-and-provenance.md) | Fixed Claude baseline, adaptation, checksums, deployed customization and license boundaries |

## Pre-Development Checklist

- Read the approved task artifacts, [shared guides](../guides/index.md) and the relevant topic here.
- Read the complete script and corresponding tests before changing an option, replacement anchor or output document.
- Identify whether the operation edits package source, a disposable generated baseline, or a user project. Installation/regeneration in a real project needs separate approval.
- For deployment changes also read `extensions/trellis.ts:deployAgents()` and [Session and Context](../extension/session-and-context.md).
- Check the source manifest and provenance together; historical plan wording is not the current runtime contract.

## Quality Check

- Run focused `node:test` files and the full available suite as appropriate; use the [quality guide](../extension/quality-guidelines.md) for subprocess identity isolation and unavailable lint/typecheck scripts.
- Keep check/dry-run behavior read-only, preserve file mode/customized documents, and test incompatible/ambiguous input rejection.
- Verify synchronized agent content and full SHA-256 manifest with `--check` only when fixed-version upstream-generated source is available; do not fabricate a regeneration pass.
- Keep runtime MIT attribution and derived upstream AGPL material/license records intact. Validate spec links and untracked files for documentation-only edits.
