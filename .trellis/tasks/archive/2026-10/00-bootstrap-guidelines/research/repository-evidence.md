# Initial Repository Evidence for Spec Planning

This is planning evidence, not a completed source audit. Deep reading remains an implementation prerequisite.

## Confirmed Layout and Tooling
- `package.json`: single ESM package, `pi.extensions` points to `extensions/trellis.ts`; `test` runs `node --test tests/*.test.mjs`; optional `test:provider` requires extra CLI arguments. No package lint/typecheck scripts.
- Local Node at planning time: `v24.14.1`. Tests such as `tests/task-context.test.mjs` directly import `.ts` modules; this execution is not a full type check.
- `README.md`: session isolation, role material injection, hash-guard agent deployment, persistent worktree management, installation patch, explicit operational boundaries and mixed license material.
- `docs/trellis-agent-sync.md`: fixed Trellis 0.6.17 Claude baseline, explicit adaptations, source integrity and regenerate/check commands. It contains historical worktree wording; verify current behavior against code/README.

## Verified Examples
- `lib/config.ts`: `containsPath`, `canonicalPath`, `validateText`, `taskSlug`, `worktreeDirectory`; source-relative worktree configuration, symlink-aware path handling and rejection of invalid inputs.
- `tests/task-context.test.mjs`: task-local fixtures with `mkdtempSync` and `t.after`; role JSONL, directory references, invalid/missing material, traversal/symlink boundaries, UTF-8 byte budgets, bounded diagnostics and injection marker provenance.

## Source Candidates to Read Fully
- Session/root identity, child binding and lifecycle: `extensions/trellis.ts`; regressions in `tests/agent-context-integration.test.mjs`.
- Material decoder and prompt assembly: `lib/task-context.ts`; `tests/task-context.test.mjs`.
- Worktree state and side effects: `lib/config.ts`, `lib/bindings.ts`, `lib/worktree.ts`, `lib/worktree-manager.ts`, `lib/preparation.ts`, `lib/executions.ts`, `lib/subagent-rpc.ts`, `lib/cleanup.ts`, `lib/worktree-tool.ts`; `tests/worktree.test.mjs`, `tests/preparation.test.mjs`, `tests/dispatch.test.mjs`.
- Tooling safety: `scripts/install.sh`, `scripts/patch-trellis.py`, `tests/trellis-patches.test.mjs`.
- Agent provenance and preservation: `scripts/sync-agents.mjs`, `docs/agent-baseline.json`, `docs/trellis-agent-sync.md`, `tests/agent-documents.test.mjs` and deployment code in the extension.
- Optional provider boundary: `tests/provider-contracts.mjs` requires actual host/provider paths and uses offline scripted responses.

## Template Problems Verified by Direct Reading
- `.trellis/spec/frontend/index.md` is unfilled Web frontend guidance; the six associated topic files are scaffolds.
- `guides/code-reuse-thinking-guide.md` instructs editing upstream `src/templates/trellis/index.ts` and rsync to `packages/cli/src/templates/trellis/scripts/`, neither of which belongs to this package.
- `guides/cross-layer-thinking-guide.md` repeats template consistency/runtime upgrade/mode-detection sections and contains unrelated upstream docs-site paths and unsupported slash commands.
- `guides/index.md` includes an unsupported numeric AI false-positive estimate; remove that estimate while retaining evidence-based review verification.
- Bootstrap template PRD incorrectly scoped the project to frontend and described automatic agent spawning as universal.

## Safety and Approval
The user approved planning artifacts only. Do not edit formal specs/product code, bind the session or run lifecycle/installation commands before fresh approval. Preserve unrelated initialization files. Existing task status is not an approval signal.
