# Agent Synchronization and Provenance

## Baseline and Source Evidence

Bundled `agents/trellis-{implement,check,research}.md` derive from **`@mindfoldhq/trellis@0.6.17` generated `.claude/agents/`**, not verbatim official Pi assets. `docs/agent-baseline.json` records version, platform `claude`, adaptation date and full source/adapted SHA-256 per role. `docs/trellis-agent-sync.md` records the fixed npm artifact integrity and generation procedure. No verified upstream commit is asserted because npm gitHead was unavailable.

Use source/tests and `README.md` for current runtime/worktree behavior. The provenance doc's older worktree-plan/future-verification wording is historical context, not permission to override today's implemented ready/RPC/occupancy contract.

## Adaptation Owner and Refresh Procedure

`scripts/sync-agents.mjs:adaptAgent()` owns deliberate text differences. `replace()` requires a unique exact source anchor and fails on drift; context section boundaries are checked before replacement. The current mapping includes:

- Pi built-ins `read/write/edit/bash/find/grep`, explicit `extensions: true`, `skills: true`, `isolation: off`; research lacks built-in edit and hardcoded MCP wildcard.
- First-line dispatch task priority, real execution-root paths, owned complete marker, role JSONL/artifacts and missing/partial/directory fallback.
- Main-only dispatch/lifecycle/Git mutation boundaries and recursion guards; allowlists are not a shell sandbox.
- Check includes staged/untracked and explicitly supplied `Review base` committed diffs, fixes only clear in-scope issues and validates the final version.
- Research persists findings under active task `research/`, uses only actually available external tools and reports missing access instead of inventing citations.

`synchronize(sourceDirectory, check)` adapts all three roles, computes source/output hashes and writes bundled documents plus `docs/agent-baseline.json`, or compares them in check mode:

```bash
node scripts/sync-agents.mjs <fixed-version-generated-.claude/agents> --check
```

The script stamps fixed baseline metadata and compares derived output/manifest. It does **not** independently authenticate a directory's release/artifact before a write: callers must use the fixed generation/integrity procedure and review source hashes. Non-check synchronization writes outputs sequentially, not as an atomic multi-file transaction. Review the entire resulting set after any failure or refresh.

For authorized regeneration, follow the full isolated generation commands in `docs/trellis-agent-sync.md`; then run synchronization, `--check` and tests. Do not install globally, copy generated platform trees/runtime/config into this package, or silently change the baseline. If fixed-version source is unavailable, report that `--check` was not run rather than using a guessed directory. `tests/agent-documents.test.mjs` verifies adapted hashes/role text against the checked-in manifest; source hash length alone is not independent upstream integrity proof.

## Bundled vs Deployed Agents

`extensions/trellis.ts:deployAgents()` deploys package `agents/*.md` to project `.pi/agents/` once per root in the process. Its separate `.pi/.pi-trellis-hashes.json` uses 12-character SHA-256 prefixes, unlike the full provenance hashes. Do not confuse their purposes.

| Current target | Action |
| --- | --- |
| Missing | Copy package document and record package hash |
| Same content as package | Keep file, repair recorded hash if needed |
| Content matches recorded old hash | Update untouched older copy and record new hash |
| Different content without matching recorded hash | Preserve customization; notify in UI |

Unreadable/unwritable files degrade independently; losing the deployment manifest loses the safe-update path, not the user's custom content. This is a content/hash policy, not transactional deployment or path isolation: target/manifest writes are direct, with no exclusive-create, symlink-containment or concurrent-edit recheck. Do not promote the preservation policy into guarantees against concurrent writers or redirected paths. Deployment does not force-refresh already loaded agents or delete removed package files. Reload/restart and inspect deployed files after an upgrade. Managed dispatch separately rejects incompatible customized frontmatter rather than overwriting it; see [Worktree Lifecycle](../extension/worktree-lifecycle.md).

Evidence: `tests/agent-context-integration.test.mjs` verifies untouched old copy upgrade, custom research preservation and missing implement creation. `tests/agent-documents.test.mjs` verifies tools, attribution, fallback, scoped check behavior, research write boundary and rejection of unreviewed anchors. The optional real-provider probe verifies parser/runner mechanisms, not model compliance.

## License and Attribution Boundary

`LICENSE` covers original/new runtime code under MIT. Bundled adapted upstream documents retain **AGPL-3.0-only**, with attribution/modification notes and `licenses/trellis-AGPL-3.0.txt`. `scripts/patch-trellis.py` embeds Trellis-derived code blocks and explicitly carries their upstream AGPL attribution. Preserve notices in adaptation/patch sources and shipped materials.

`package.json` declares `(MIT AND AGPL-3.0-only)`. Do not describe the complete distribution as MIT-only, wholly upstream-free, or free of Trellis material. The fixed `runtime/common/` and supported task/context/journal/developer entries are now vendored Trellis 0.6.16 AGPL material, with per-file source/output hashes in `resources/runtime-baseline.json`. Native `runtime/pi_trellis_worktree/` remains original MIT code. These are separate from the 0.6.17 adapted-role baseline. The provenance record is not legal advice for every downstream combination, but release claims must not erase the existing attribution/license split.

## Quality Check

- Source version/platform/integrity evidence and manifest match the intended authorized baseline.
- Adapter changes live in `adaptAgent()`; bundled documents and manifest are synchronized, with drift failure visible.
- Tools and fallback remain accurate for Pi; no fictional Skill/slash/MCP service requirement is introduced.
- User deployment customizations survive; incompatible config causes dispatch rejection, not replacement.
- Record tests and optional check/probe separately; see [Quality Guidelines](../extension/quality-guidelines.md) and the [cross-layer guide](../guides/cross-layer-thinking-guide.md).
