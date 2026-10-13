# Spec Bootstrap Design

## Boundaries
Keep the repository as one package. Use two spec layers plus shared guides; do not introduce artificial frontend/backend packages.

Proposed final tree:

```text
.trellis/spec/
├── extension/
│   ├── index.md
│   ├── architecture.md
│   ├── session-and-context.md
│   ├── worktree-lifecycle.md
│   └── quality-guidelines.md
├── scripts/
│   ├── index.md
│   ├── installation-and-patching.md
│   └── agent-sync-and-provenance.md
└── guides/
    ├── index.md
    ├── code-reuse-thinking-guide.md
    └── cross-layer-thinking-guide.md
```

Merge topics if deep reading shows repeated ownership; do not expand scope into product changes. Remove the seven frontend scaffold files after replacement guidance is complete.

## Guidance Ownership
- `extension/architecture.md`: ESM TypeScript layout, host-facing entrypoint vs library modules, configuration and type/validation conventions. Evidence: `package.json`, `extensions/trellis.ts`, `lib/config.ts`, `lib/bindings.ts`.
- `extension/session-and-context.md`: per-session/root identity, CLI provenance, child binding, injection markers, role JSONL, byte budgets and fallback. Evidence: extension lifecycle handlers, `lib/task-context.ts`, context/integration tests.
- `extension/worktree-lifecycle.md`: preview/confirm, persistent binding and readiness, pinned baselines, RPC cwd, execution occupancy/unknown states, safe cleanup. Evidence: worktree/preparation/execution/RPC modules and their tests.
- `extension/quality-guidelines.md`: `node:test`, temporary fixtures and cleanup, negative/side-effect preservation assertions, optional real-provider testing and validation limitations.
- `scripts/installation-and-patching.md`: preflight, dry-run/check, opt-out, exact/idempotent/atomic patch and rejected inputs. Evidence: `scripts/install.sh`, `scripts/patch-trellis.py`, `tests/trellis-patches.test.mjs`.
- `scripts/agent-sync-and-provenance.md`: locked upstream source and hash checks, explicit Pi adaptation, bundled-vs-deployed agent distinction and MIT/AGPL material separation. Evidence: sync script, baseline manifest, provenance doc, agent document tests and extension deployment implementation.
- Shared guides: source search/reuse and integration contracts spanning Pi hooks → Python CLI/pointers, JSONL → prompt/fallback, worktree state → provider RPC, source agent documents → deployed customized copies. Replace upstream-only examples rather than importing upstream policy.

## Evidence and Context Contract
Read relevant modules and tests fully before documenting a contract; symbol search identifies candidates but is not sufficient verification. Historical plans explain decisions but maintained code/tests/README establish current behavior. Mark conflicts rather than silently promoting history to a rule.

During bootstrap, JSONL manifests reference task-local research because existing specs are edit targets or unsuitable templates. They are not proof that all source has been audited. After creation, inspect other task references before deleting old paths; future tasks select the relevant new spec files explicitly.

Each index includes applicability, Pre-Development Checklist, Quality Check and topic links. Use English for formal specs, consistent with current documentation guidance; keep examples short and cite repository-root paths.

## Compatibility and Rollback
Changing spec layout does not change product behavior. Check `get_context.py --mode packages` and all task manifests for obsolete frontend references. No monorepo/config changes are expected.

Do not rewrite `.trellis/.template-hashes.json`, generated scripts, platform settings or bundled skills. Trellis update may surface modified-file conflicts; local conventions must not be replaced blindly.

The Trellis initialization tree is currently untracked: preserve pre-edit spec contents in task-local research before any deletion. Rollback restores only this task's spec edits, never uses broad git reset/clean and never discards unrelated initialization files.
