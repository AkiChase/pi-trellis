# Bootstrap Source Review Findings

## Scope and Review Method

Documentation-only implementation approved through the dispatch prompt. Edits are confined to `.trellis/spec/` and this task's `research/`; task planning artifacts, product source, tests, bundled/deployed agents, generated skills/workflow/config/scripts and Git state were not edited. Existing `research/original-spec/` was read for deletion safety and never overwritten.

Loaded the hook-provided PRD/design/implementation plan and repository evidence; read both role manifests (both reference `research/repository-evidence.md`). Read before-dev/bootstrap skills and relevant bootstrap repository-analysis/spec-writing references. Used complete source/test reads rather than symbol search alone; no Pi API claim beyond the locally implemented hooks/RPC and tests required an invented SDK assumption.

## Fully Read Runtime Evidence

- `package.json`, `README.md`, `.trellis/workflow.md`, existing frontend/shared-guide files.
- `extensions/trellis.ts` in three complete chunks: root/key derivation, subprocess CLI/provenance, pointer reads, workflow parsing/rendering, deployment/skill bridge, child independent binding, caches and all event handlers.
- `lib/task-context.ts`: role JSONL/artifacts, record/material realpath containment, limits, UTF-8 reads/diagnostics, header parsing and marker ownership.
- Every worktree runtime module: `lib/config.ts`, `lib/bindings.ts`, `lib/worktree.ts`, `lib/worktree-manager.ts`, `lib/preparation.ts`, `lib/executions.ts`, `lib/subagent-rpc.ts`, `lib/cleanup.ts`, `lib/worktree-tool.ts`.
- All default tests: `tests/task-context.test.mjs`, `tests/agent-context-integration.test.mjs`, `tests/worktree.test.mjs`, `tests/preparation.test.mjs`, `tests/dispatch.test.mjs`, `tests/trellis-patches.test.mjs`, `tests/agent-documents.test.mjs`.
- `tests/provider-contracts.mjs` read completely for optional probe coverage/limitations, not run or installed.

## Fully Read Tooling/Provenance Evidence

- `scripts/install.sh`, `scripts/patch-trellis.py`, `scripts/sync-agents.mjs`.
- `docs/agent-baseline.json`, `docs/trellis-agent-sync.md` and corresponding tests listed above.
- Runtime `deployAgents()` checked separately from bundled synchronization.

## Contracts Captured in Formal Specs

1. Single ESM Pi extension package; host-facing entrypoint/library owners, narrow JSON validation from unknown, explicit subprocess environment and path helpers. No mandatory framework/reducer/blanket cast refactor invented.
2. Session/root/key cache isolation; caller pin is intentional, child binds a separate key before failure, child binding uses `set_active_task` without start hooks, pointer reads rather than in-memory resurrection.
3. CLI fallback requires code 0, exact current-session provenance and no stale/error. Disk pointer reads are defensive implementation detail, not a newly promised API.
4. Role manifest selection, research artifacts-only loading, explicit directory expansion, current file rereads, narrow top-level task-store exception, bounded records/references/diagnostics and UTF-8 budget behavior. Prompt wrapper/diagnostics are not part of a universal hard byte cap; quoted markers are sanitized.
5. Stable system sections vs volatile custom task-state messages; headless compact mode, actual cache lifetimes/invalidation and limited shutdown cleanup.
6. Persistent source binding/target hint with immutable identity comparison, source-authoritative preparation, source-wide lock and no automatic stale-lock deletion.
7. Create/bind preview-confirm purity and baseline pinning, source/index preservation, branch-backed registered identity, config affecting only new creates and retained failures.
8. Selected task-only preparation, unchanged baseline reference bytes, target-only branch exception, target `start` and configured after_start hooks, local target stores and independent readiness/provenance checks.
9. Actual source host cwd + persisted adapter + compatible custom role + ready target checks before public RPC cwd/off spawn. Unknown lease conservatism, early completion, explicit stop/recover, check completion distinct from acceptance and limited snapshot freshness.
10. Clean/ancestry/ignored-risk removal with ordinary Git only, no force/branch deletion; explicit stale unbind retains branch.
11. Installer default patch vs direct Pi install, real preflight/version/read-only behavior, exact/idempotent/atomic standard-library patch, mode preservation and no finish authorization after failed unlink.
12. Fixed generated Claude baseline, source/output full SHA-256 vs truncated deployment guard, reviewed exact adaptation and user customization preservation. Runtime MIT, adapted upstream documents/derived Python blocks retain upstream AGPL attribution; complete package is not MIT-only.

## Nuances and Conflicts Not Promoted into False Guarantees

- `docs/trellis-agent-sync.md` includes historical future-worktree/probe wording. Current runtime/tests/README win; formal specs link its provenance without treating old planning text as current lifecycle policy.
- Default preview HEAD can move before confirmation. Confirmation recomputes and checks under lock; the returned preview is not a persisted reservation. Persisted binding pins the resolved commit; callers can pass the previewed SHA explicitly.
- Preparation is not multi-file transactional and can leave task copies/hooks after a later error. Document retained error state rather than promise automatic rollback.
- `worktreeSnapshot()` skips several directories and symlinks, bounds file count and uses size/mtime for large files; it is freshness evidence, not complete content or security proof.
- `sync-agents.mjs` stamps fixed metadata and checks unique anchors/output/manifest. Its write path does not authenticate arbitrary input release/integrity and is sequential, not atomic; callers own the fixed-source procedure.
- Installer's get_context preflight verifies exit status, not parsed JSON, despite its printed success wording. Runtime has separate parsing. Check-mode patch incompatibility can be a warning rather than installer failure.
- Existing narrow CLI/event casts and guarded management branches are described accurately, not upgraded to aspirations for exhaustive validation or universal reducers.
- An inherited `TRELLIS_CONTEXT_ID` intentionally pins simulated sessions in distinct-key tests. Quality guidance uses `env -u TRELLIS_CONTEXT_ID` only for the isolated test subprocess and keeps raw/clean evidence distinct; no runtime/test fix made.

## Implement-Agent Actions and Local Checks

- Initial read-only `git status --short`: `.gitignore` modified; `.agents/`, `.gitattributes`, `.pi/`, `.trellis/`, `AGENTS.md` untracked. No changes made to those unrelated/generated files.
- Initial `python3 ./.trellis/scripts/get_context.py --mode packages`: single repo, no packages configured; obsolete layer `frontend`.
- Wrote eight extension/scripts documents and rewrote three shared guides (11 final Markdown files).
- Removed exactly seven frontend scaffold files after asserting filename set and byte equality with `research/original-spec/frontend/`; backup retained.
- Local `rg -n 'To be filled|TODO: fill|To fill|src/templates|packages/cli|rsync|docs-site|/trellis:|35%' .trellis/spec`: no filler, obsolete path, nonexistent slash command or numeric estimate matches. Remaining rsync/docs-site mentions only explicitly state that those instructions do not belong here, not operational guidance.
- Enumerated final spec tree: extension (5), scripts (3), guides (3), no frontend directory. English formal specs, short source-backed snippets, applicability/pre-development/quality/topic navigation in every index.
- Python Markdown self-review over all 11 specs: zero trailing-whitespace lines, duplicate headings or missing required index sections. This is not a substitute for main-owned link/scope verification.

Main agent owns the full test, scope/hash/link/manifests/discovery verification and records raw/clean results separately. This implement agent did not rerun `npm test`, optional provider probes, synchronization generation/check, installation or lifecycle commands. There is no package lint/typecheck command. See the main agent's validation artifact for final gate results.
