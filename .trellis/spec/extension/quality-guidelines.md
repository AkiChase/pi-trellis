# Runtime Quality Guidelines

## Available Checks and Their Limits

`package.json` defines `npm test` as `node --import ./tests/host-tui.mjs --test tests/*.test.mjs`. Tests directly import `.ts` modules; Node v24.14.1 is the verified local environment. The preload resolves the real `@earendil-works/pi-tui` peer locally, or from `PI_TRELLIS_TEST_HOST` (an installed Pi `node_modules` directory). Set that variable in the test subprocess when local peers are absent; no install is needed. Missing resolution fails with an actionable error, not a mock-width fallback. TypeScript execution is **not** a full static type check. There is no package lint or typecheck command; report these as unavailable rather than inventing scripts or marking them passed.

```bash
node --version
# From repository root, without an intentional inherited identity pin:
env -u TRELLIS_CONTEXT_ID npm test
# Focused examples:
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/task-context.test.mjs tests/agent-context-integration.test.mjs tests/task-display.test.mjs
node --import ./tests/host-tui.mjs --test tests/worktree.test.mjs tests/preparation.test.mjs tests/dispatch.test.mjs
```

Use plain `npm test` when the invoking environment has no `TRELLIS_CONTEXT_ID` pin. `extensions/trellis.ts` captures a caller pin at module load; `tests/agent-context-integration.test.mjs` verifies derived distinct session keys. Running that suite from a pinned Trellis host can intentionally give simulated parent sessions the same key. Unset the variable **only for the test subprocess**, not the live host, global `process.env`, user config or session pointer. Record raw pinned and clean-subprocess results separately; such a failure is not by itself evidence of a runtime isolation bug.

Do not run the installer, regenerate agents, install dependencies or create real project worktrees simply to fill a validation checklist. Use temporary fixtures or separate explicit authorization.

## Fixture Patterns

Tests use `node:test`, `node:assert/strict`, `mkdtempSync()` and `t.after()` cleanup. Example from `tests/task-context.test.mjs`:

```javascript
const root = mkdtempSync(join(tmpdir(), "pi-trellis-context-"));
t.after(() => rmSync(root, { recursive: true, force: true }));
```

Worktree/preparation tests initialize disposable repositories and commit **fixture** baselines using inline identity/signing options. Those fixture commits are not authorization to commit a user's repository. Helpers keep writes and Git calls relative to the fixture. Dispatch tests restore `process.cwd()` after their temporary host-root simulation; runtime Git code separately sanitizes inherited Git overrides.

Integration fixtures model documented Python `start/current` or `set_active_task` behavior and fake Pi events. They are not a copied product Trellis runtime and do not prove all real-host/provider behavior. Assert both observable results and absence of forbidden side effects.

## Coverage by Boundary

| Test file | What to verify when editing |
| --- | --- |
| `tests/task-display.test.mjs` | Persistent task-less display, count/completion/archive/alias filtering, theme/unknown fallback, lifecycle refresh, Unicode/control footer column bounds with real host TUI helpers |
| `tests/task-context.test.mjs` | Role lists/artifact order, dedup, directories/cycles, invalid/empty records, traversal/symlinks, UTF-8/byte caps, same-mtime rereads, marker ownership and bounded diagnostics |
| `tests/agent-context-integration.test.mjs` | Session/CLI isolation, child bind/finish/non-resurrection, failed binding, ordinary Agent gates, foreign CLI provenance and deployment customization preservation |
| `tests/worktree.test.mjs` | Preview no-write behavior, pinned baseline, source staged/unstaged/untracked/index preservation, bind identity, config reuse, lock/cancel and retained error records |
| `tests/preparation.test.mjs` | Selected task copies, independent target pointer, unchanged source, conflicts, branch-only metadata exception, clean/ancestry cleanup, dead/live owner recovery |
| `tests/material-sync.test.mjs`, `tests/worktree-protocol.test.mjs` | Accepted-source/B/S/T ancestry, overlay/dependencies, projection, explicit collection/negative paths, partial error retention, check lineage, package protocol and role cache changes |
| `tests/dispatch.test.mjs` | Public RPC target cwd/off, real ID, occupancy, early completion, source drift/final material recheck, versioned snapshot freshness, shutdown ambiguity and rejection before spawn |
| `tests/worktree-cli.test.mjs`, `tests/python/test_worktree.py` | Strict CLI parsing, deployed entry without Node, source pin isolation, complete reference bounds, v1 host/CLI locks and protected deployment |
| `tests/runtime-contracts.test.mjs` | Complete fixed-runtime copies: strict own-key/no inference, real child finish/non-resurrection, invalid raw refs/records/hooks, bounded projections, exact journal/archive commits and preserved unrelated index, safe developer identity, no global trellis/bytecode, source hashes/import closure/package files |
| `tests/trellis-patches.test.mjs` | Exact/idempotent patch, mode/no-write behavior, current-session clearing, unlink failure, unsafe inputs and installer modes |
| `tests/agent-documents.test.mjs` | Adapted hashes/attribution, role tools and protocols, scoped check fixes, research output boundaries and rejected source drift |

Add negative tests at the boundary where a new input or transition is accepted. Examples of meaningful assertions: foreign pointer does not enter the prompt; parent pointer remains after child finish; source index/content stays byte-identical; conflicting target/custom agent is not overwritten; unknown startup retains a lease; later change makes a check snapshot stale. An error message alone does not prove preservation.

## Optional Real-Host/Provider Probe

`tests/provider-contracts.mjs` is outside the default `*.test.mjs` glob and requires explicit installed paths:

```bash
node tests/provider-contracts.mjs --host <Pi-node_modules> --provider <provider-package-root>
```

Repeat `--provider` to probe separate implementations. The script uses real parser/runner/loader and public RPC with scripted offline responses, temporary configuration and no model network. It includes role tools, target materials/cwd, late extension tool availability, missing target, real IDs/result/steering and service shutdown. It is not a real-model obedience test, comprehensive sandbox test, or substitute for task acceptance. Do not install conflicting providers into a live session or run the probe without the required paths/approval. If not run, say so.

## Review and Documentation Gate

- Read the full relevant source/test before documenting a contract; snippets/search hits locate evidence but do not replace review.
- Review staged, unstaged, untracked and explicitly supplied-base committed changes. An empty unstaged diff is not evidence of no work.
- Use `git diff --check`, but inspect new untracked Markdown separately for whitespace, empty headings and stale guidance.
- For spec layout changes, run `python3 ./.trellis/scripts/get_context.py --mode packages`, validate the task manifests, and check relative links/repository-root evidence paths and deleted spec references.
- Rerun relevant checks after final fixes. Report exact commands, environment, passed/failed/not-run results and remaining limitations. Separate execution completion from acceptance.
