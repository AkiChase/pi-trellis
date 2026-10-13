# Code Reuse Thinking Guide

## Applicability

Use this guide when adding a helper, modifying configuration/constants, or changing repeated material/path/state handling in `extensions/`, `lib/` or `scripts/`. Search and compare before extracting; similar syntax alone does not prove shared semantics.

## Search the Actual Owner

Run from repository root:

```bash
rg -n 'buildTaskContext|assembleDispatchPrompt|readTaskRecord' extensions lib tests
rg -n 'canonicalPath|containsPath|parseBinding|sameIdentity' lib tests
rg -n 'TRELLIS_CONTEXT_ID|preparationState|activeExecution' extensions lib scripts tests README.md
```

Read the complete relevant owner and callers after locating them. Package source is not a generated `.pi/git/` install or another project's `.trellis/scripts/`. This repository has no upstream template registry to update or second template tree to rsync.

## Existing Reuse Boundaries

| Need | Existing owner | Important distinction |
| --- | --- | --- |
| Task/material validation and loading | `lib/task-context.ts:resolveTaskPath`, `readTaskRecord`, `buildTaskContext` | Explicit external task-store exception only through `.trellis/tasks`; not arbitrary symlinks |
| Owned injection wrapper | `lib/task-context.ts:assembleDispatchPrompt` | Strip caller/quoted success markers; incomplete context keeps fallback |
| Destination/config containment | `lib/config.ts:containsPath`, `canonicalPath`, `validateText`, `taskSlug` | Canonicalize ancestors without writes; worktree slugs are narrower than general material references |
| Persistent binding/lock | `lib/bindings.ts:parseBinding`, `sameIdentity`, `atomicJson`, `acquireBindingLock` | Immutable identity comparison vs source-authoritative mutable state |
| Git repository operations | `lib/worktree.ts:git`, `repository`, `resolveBase`, `requireIgnored` | Argument arrays and sanitized environment; no implicit ignore writes |
| Agent source adaptations | `scripts/sync-agents.mjs:adaptAgent` | Fixed exact anchors plus full provenance hashes, not deployed-copy hash policy |

Reuse these owners instead of making a second JSONL loader, local prompt-marker shortcut, string-prefix containment test or unchecked direct Git invocation. When several consumers need a newly decoded field, consider putting its validation/projection with its data owner and testing all callers, rather than adding more divergent assertions. That is a targeted decision, not a mandate to rewrite every existing payload cast.

## Similar Mechanisms That Must Not Be Collapsed Blindly

- `runPython()` in the entrypoint and `taskCli()` in preparation both spawn Python, but optional discovery can degrade while target readiness must fail, and cwd/key ownership differs.
- General material loading may accept a top-level external task store; worktree preparation requires a local target store. Sharing a helper must preserve the stricter policy.
- Ordinary Agent injection and managed RPC share `buildTaskContext()`/`assembleDispatchPrompt()`, but only managed dispatch validates readiness, host cwd and occupancy. Hooks cannot promise interception of third-party RPC.
- Full source/adapted SHA-256 in `docs/agent-baseline.json` records a source/output relationship that can be checked against available files; without the source, it is not independent integrity proof. Truncated deployment hashes only determine whether a user's copy is treated as untouched. They are not the same manifest.
- Binding `ready`, provider `completed` and accepted work are different states. A common state formatter must not imply equivalence.

## Decide Whether to Extract

Ask:

1. Do callers need the same invariant and error semantics, or merely similar code?
2. Can an existing owner be extended without mixing project/source/target roots or broadening accepted paths?
3. Would a shared abstraction hide meaningful side effects or make a small change larger?
4. What negative tests establish unchanged behavior for every consumer?

Prefer a small source-backed helper where behavior is genuinely shared. Leave deliberate asymmetry explicit; do not extract solely to satisfy a repetition count. Current management uses guarded action branches; no generic event reducer is required for unrelated edits.

## Verification After a Shared Change

- Search all callers, constants, schema/frontmatter references, tests and maintained docs again.
- Compare ordinary vs managed prompt behavior, preview vs confirmed operation, and package agent vs deployed custom copy as applicable.
- Verify path/pointer/code/customization preservation on rejection and partial failure.
- If changing role/source generation, update and check the complete authorized output/manifest set; do not manually synchronize generated project trees.
- Run the focused boundary tests and report what was actually exercised. See [Quality Guidelines](../extension/quality-guidelines.md) and [Cross-Layer Boundaries](cross-layer-thinking-guide.md).
