# Shared Thinking Guides

## Applicability

Use these guides before nontrivial changes in this single-package Pi extension, especially when code crosses host events, Python CLI/files, task materials, Git worktree records or provider RPC. These are review questions, not a new framework or task lifecycle. Read-only exploration does not become implementation approval merely because it finds an improvement.

## Guides and Layers

| Guide | When to use |
| --- | --- |
| [Code Reuse](code-reuse-thinking-guide.md) | Adding a helper/config/state field or repeating material/path/payload logic |
| [Cross-Layer Boundaries](cross-layer-thinking-guide.md) | Changing identity, file/JSONL shape, RPC/events, preparation or generated-agent behavior |
| [Extension layer](../extension/index.md) | Runtime ownership and source/test contracts |
| [Scripts layer](../scripts/index.md) | Installer, focused Python patch and agent provenance |

## Pre-Development Checklist

- Read the task's approved artifacts and explicitly selected role context. A JSONL manifest selects relevant specs/research; it does not automatically load every guideline or spawn every role.
- Search actual owners/callers/tests before changing a value or adding a helper. Prefer `rg -n` over searching installed/generated copies as if they were source.
- Identify the smallest behavior gap, where it lives, expected files/side effects and explicit exclusions. Ask before expanding scope.
- Read the relevant layer/topic and the matching thinking guide. Confirm which state is authoritative and what must survive failure.

## Evidence-Based Review

Verify each important finding against the actual source, caller and tests before prioritizing it:

- Trace the value's origin and trust boundary. A bundled hash manifest differs from user configuration, mutable pointers and external RPC replies; neither trust nor distrust can be assumed from a filename alone.
- Read comments/design intent, then confirm current implementation and tests. Historical worktree wording does not overrule runtime/README.
- Trace variable/key definitions: root, session identity, context ID and task path are not interchangeable.
- Reproduce the relevant condition in an isolated fixture when possible. A pinned test subprocess intentionally changes derived-key behavior; preserve raw and unpinned results separately.
- Ask whether a regression would fail if the feature/guard disappeared. Assertions that only repeat fixture setup do not establish behavior.

There is no project-supported numeric false-positive estimate for AI review. Comments, a plausible warning or a green test alone do not replace checking the full boundary.

## Quality Check

- Findings name real repository-root symbols/files, observed behavior and relevant tests, not hypothetical framework requirements.
- Reuse does not broaden trust boundaries, erase diagnostics or mix independently owned state.
- Cross-layer tests cover rejected input and preservation, not only the happy path.
- Validation records actual commands/results and unavailable checks; use [runtime quality guidance](../extension/quality-guidelines.md).
- Spec edits keep valid navigation, English formal guidance and current evidence paths; do not import upstream-only template registration, synchronization or docs-site instructions.
