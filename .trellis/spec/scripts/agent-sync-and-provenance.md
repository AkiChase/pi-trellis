# Agent Synchronization and Provenance

## Baseline and Source Evidence

Bundled `agents/trellis-{implement,check,research}.md` derive from **`@mindfoldhq/trellis@0.6.17` generated `.claude/agents/`**, not verbatim official Pi assets. `resources/agent-baseline.json` records version, platform `claude`, adaptation date and full source/adapted SHA-256 per role. `docs/trellis-agent-sync.md` records the fixed npm artifact integrity and generation procedure. No verified upstream commit is asserted because npm gitHead was unavailable.

Use source/tests and `README.md` for current runtime/worktree behavior. The provenance doc's older worktree-plan/future-verification wording is historical context, not permission to override today's implemented ready/RPC/occupancy contract.

## Adaptation Owner and Refresh Procedure

`scripts/sync-agents.mjs:adaptAgent()` owns deliberate text differences. `replace()` requires a unique exact source anchor and fails on drift; context section boundaries are checked before replacement. The current mapping includes:

- Pi built-ins `read/write/edit/bash/find/grep`, explicit `extensions: true`, `skills: true`, `isolation: off`; research lacks built-in edit and hardcoded MCP wildcard.
- First-line dispatch task priority, real execution-root paths, owned complete marker, role JSONL/artifacts and missing/partial/directory fallback.
- Main-only dispatch/lifecycle/Git mutation boundaries and recursion guards; allowlists are not a shell sandbox.
- Check includes staged/untracked and explicitly supplied `Review base` committed diffs, fixes only clear in-scope issues and validates the final version.
- Research persists findings under active task `research/`, uses only actually available external tools and reports missing access instead of inventing citations.

`synchronize(sourceDirectory, check)` adapts all three roles, computes source/output hashes and writes bundled documents plus `resources/agent-baseline.json`, or compares them in check mode:

```bash
node scripts/sync-agents.mjs <fixed-version-generated-.claude/agents> --check
```

The script stamps fixed baseline metadata and compares derived output/manifest. It does **not** independently authenticate a directory's release/artifact before a write: callers must use the fixed generation/integrity procedure and review source hashes. Non-check synchronization writes outputs sequentially, not as an atomic multi-file transaction. Review the entire resulting set after any failure or refresh.

For authorized regeneration, follow the full isolated generation commands in `docs/trellis-agent-sync.md`; then run synchronization, `--check` and tests. Do not install globally, copy generated platform trees/runtime/config into this package, or silently change the baseline. If fixed-version source is unavailable, report that `--check` was not run rather than using a guessed directory. `tests/agent-documents.test.mjs` verifies adapted hashes/role text against the checked-in manifest; source hash length alone is not independent upstream integrity proof.

## Bundled vs Deployed Agents

Bundled `agents/*.md` are package outputs; project `.pi/agents/*.md` are published only by explicitly approved initialization/adoption/resource actions in `lib/initialization/`. Session startup never deploys or upgrades roles. Project schema-2 `.trellis/.pi-trellis.json` records full hashes/modes; the old truncated `.pi/.pi-trellis-hashes.json` is inactive historical evidence, not current write authority.

Safe resource updates preserve customized files and reject modified executable/role conflicts before publication. Identity-only setup preserves deployed roles. Explicit adoption of a manifest-less project is a different, destructive-confirmed action: it replaces old runtime/roles and managed root blocks without backups while preserving project documents/history. Do not conflate adoption approval with a safe update or automatic startup overwrite. See [initialization details](../../../docs/initialization.md).

Publication uses contained regular paths, source/manifest validation, under-lock rechecks and mode-preserving per-file atomic replacement; it is not a multi-file transaction or OS sandbox. Partial failure preserves published files; an existing lock needs inspection. Managed dispatch separately rejects incompatible customized frontmatter rather than overwriting it. Children need persistent adapter configuration, not merely a parent-only `-e`; see [Worktree Lifecycle](../extension/worktree-lifecycle.md).

Evidence: `tests/initialization.test.mjs`, `tests/adopt-project.test.mjs`, `tests/apply-template.test.mjs` and `tests/agent-context-integration.test.mjs` cover publication, customization/identity preservation and host guards. `tests/agent-documents.test.mjs` covers attribution, tools, fallback, scoped check, research boundaries and drift rejection. The optional real-provider probe verifies mechanisms, not model compliance.

## License and Attribution Boundary

`LICENSE` covers original integration/native code under MIT; maintained Trellis-derived runtime code retains AGPL. Bundled adapted upstream documents retain **AGPL-3.0-only**, with attribution/modification notes and `licenses/trellis-AGPL-3.0.txt`. `scripts/patch-trellis.py` embeds Trellis-derived code blocks and explicitly carries their upstream AGPL attribution. Preserve notices in adaptation/patch sources and shipped materials.

`package.json` declares `(MIT AND AGPL-3.0-only)`. Do not describe the complete distribution as MIT-only, wholly upstream-free, or free of Trellis material. The fixed `runtime/common/` and supported task/context/journal/developer entries are now vendored Trellis 0.6.16 AGPL material, with per-file source/output hashes in `resources/runtime-baseline.json`. Native `runtime/pi_trellis_worktree/` remains original MIT code. These are separate from the 0.6.17 adapted-role baseline. The provenance record is not legal advice for every downstream combination, but release claims must not erase the existing attribution/license split.

## Quality Check

- Source version/platform/integrity evidence and manifest match the intended authorized baseline.
- Adapter changes live in `adaptAgent()`; bundled documents and manifest are synchronized, with drift failure visible.
- Tools and fallback remain accurate for Pi; no fictional Skill/slash/MCP service requirement is introduced.
- User deployment customizations survive; incompatible config causes dispatch rejection, not replacement.
- Record tests and optional check/probe separately; see [Quality Guidelines](../extension/quality-guidelines.md) and the [cross-layer guide](../guides/cross-layer-thinking-guide.md).
