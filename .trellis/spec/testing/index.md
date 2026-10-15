# Testing Guidelines

## Pre-Development and Quality Checklist

Read [development constraints](../development/index.md), the approved task artifacts and full relevant tests/fixtures. Choose checks by changed behavior, not file count. Add negative-case preservation assertions at each changed trust/transition boundary. Review final source, staged/unstaged/untracked files and relevant committed stages; rerun affected checks after fixes. Historical PASS counts and an empty unstaged diff do not prove current acceptance.

## Available Commands and Environment

Run from repository root. `npm test` is `node --import ./tests/host-tui.mjs --test tests/*.test.mjs`. Verified local execution uses Node v24.14.1; direct TypeScript execution is not static typechecking. There is no package lint/typecheck script: report unavailable, not Passed.

```bash
node --version
env -u TRELLIS_CONTEXT_ID npm test
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/task-context.test.mjs tests/agent-context-integration.test.mjs
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
```

The preload uses the real `@earendil-works/pi-tui` peer. When absent locally, set `PI_TRELLIS_TEST_HOST=<existing-Pi-node_modules>` in the **test subprocess**, without installation or a mock width fallback. Missing peer resolution fails visibly. Unset `TRELLIS_CONTEXT_ID` only in subprocesses needing derived distinct sessions: the extension captures an intentional caller pin at import. Do not mutate the live host environment, config or pointer to make tests pass. Keep initial pinned/missing-peer failures separate from corrected-environment results.

Do not run installers, regenerate agents, sync personal resources or create real project worktrees just to fill a checklist. Tests use disposable fixtures; real terminal/provider execution requires separate explicit authorization. Python 3.10 is the source syntax minimum, not a fully tested interpreter/platform matrix; record actual versions and platform.

## Fixture and Regression Design

Use `node:test`, strict assertions, `mkdtempSync()` and `t.after()` cleanup. Initialize complete fixed-runtime disposable repositories when testing real CLI effects; tiny fake scripts cover only their simulated contract. Fixture commits use explicit local identity/signing settings and are not authorization to commit the user's repository. Keep paths/Git operations fixture-relative and restore any process cwd after host simulation.

Assert observables **and absence of forbidden side effects**: parent pointer remains after child finish; foreign/stale pointers never enter prompts; source files/index and customized agents remain byte-identical after rejection; previews create no directories/records/branches; ambiguous spawn retains occupancy; stop waits for terminal evidence; later requirements invalidate prior check freshness. An error message or a setup-only assertion is insufficient. Preserve first failures, diagnose product vs fixture causes from actual source/output, and rerun after scoped fixes without weakening product expectations.

| Changed boundary | Focused evidence |
| --- | --- |
| Source authority headers/paths, references, no body/read claims | `tests/task-context.test.mjs` |
| Root/session identity, CLI provenance, child lifecycle, subagent_run injection | `tests/agent-context-integration.test.mjs`, `tests/worktree-protocol.test.mjs` |
| Initialization, updates, adoption, templates, provenance | `tests/initialization.test.mjs`, `tests/adopt-project.test.mjs`, `tests/apply-template.test.mjs`, `tests/manifest-provenance.test.mjs` |
| Fixed runtime, raw task records, developer/journal/archive scope | `tests/runtime-contracts.test.mjs` |
| Native config/Git/binding/preview/deployment | `tests/worktree.test.mjs`, `tests/worktree-cli.test.mjs`, `tests/python/test_worktree.py` |
| Source-only role preparation, zero target copies/start/hooks, occupancy/recovery/removal | `tests/preparation.test.mjs` |
| RPC cwd/IDs, readiness/fingerprint rechecks, early terminal/shutdown | `tests/dispatch.test.mjs`, `tests/source-executions.test.mjs` |
| Viewer read-only containment, hierarchy/archives, selection, Markdown/fallback | `tests/task-browser-reader.test.mjs`, `tests/task-browser-ui.test.mjs` |
| Persistent count, theme/error degradation, terminal-column bounds | `tests/task-display.test.mjs` |
| Direct role hashes/attribution, source/execution protocols and read/write scope | `tests/agent-documents.test.mjs` |
| Workflow phase/policy and resource ownership | `tests/workflow-policy.test.mjs`, `tests/skill-resources.test.mjs` |
| Project activation, command/tool registration, skill filters and real SDK reload | `tests/project-activation.test.mjs`, `tests/project-activation-host.test.mjs`; use isolated agent/project dirs and public SDK without network/install. Test command parser init/repair, disabled sources, trust, explicit resources, and no runtime state/UI in ordinary projects. |
| Historical patch/installer read-only behavior and mode preservation | `tests/trellis-patches.test.mjs` |

Inspect actual filenames/test coverage before selecting this matrix. Cross-language tests must share record/lock/material semantics; no mocked single-layer check establishes full interoperability. Viewer tests must verify files/pointers/Git preservation and no lifecycle/model calls, long-document end reachability and complete source fallback. Component tests cannot prove physical terminal behavior.

## Role Source Maintenance

Maintain the three bundled `agents/trellis-*.md` files directly, review source/execution reading and write-scope contracts, then update their adapted SHA-256 values in `resources/agent-baseline.json`. Preserve historical source hashes, version/platform, adaptation date and AGPL attribution; do not imply these files were newly generated or are wholly original. Deployed/custom `.pi/agents/` must stay byte-identical unless its own explicit publication is approved. Runtime count assertions use `Object.keys(runtimeBaseline().files).length + 3` roles, not a fixed resource count.

Historical source was generated Claude roles from `@mindfoldhq/trellis@0.6.17`; fixed npm artifact integrity from the original verification remains:

```text
sha512-u65OJbzR3OBzFWybX/uzBXaZdzn+71Afaknodu0GUcFIrTyp3ZegK9rHNeTX0guHow35WXkqDVuyrhn8vVzSQg==
```

npm gitHead was unavailable; this is not a verified upstream commit or current regeneration claim. Source hashes without retrieved source are historical provenance, not independent current integrity proof. No dependency fetch, generator or personal-resource synchronization is needed for role maintenance.

Focused role/workflow/provenance checks and source-authority regressions cover exact four-line headers, absolute source reads, pagination rules, no target fallback/copy/start/hooks, per-role invalid-reference isolation and explicit source-write authorization. Fixture assertions cannot prove an agent actually read all materials. Source fingerprints plus execution checkout snapshots are freshness evidence, not acceptance or an ABA-free transaction.

## Optional Installed-Host/Provider Probe

`tests/provider-contracts.mjs` is outside the default test glob. Read the complete probe and fixtures first. With explicit approved **existing** paths:

```bash
node tests/provider-contracts.mjs --host <Pi-node_modules> --provider <provider-package-root>
node tests/provider-contracts.mjs --host <Pi-node_modules> --preset <preset-root>
```

The modes are mutually exclusive. `--preset` loads this package's Trellis adapter and the preset's `extensions/task-composition.ts`; both entries persist in disposable settings for real child reloads. Never load the standalone agent backend or a native provider alongside the composition. It checks real RPC IDs through the public management/message tools, exact-run retrieval/resume, consumption notification controls, cancellation vs execution, source dispatch and cooperative stop/drain. Monitor coverage is the invalid dual-source boundary only, not a successful command/WebSocket stream.

Repeat `--provider` to test independent native implementations in separate subprocesses using their existing result/message tools; these are test-only native contracts, not product old-name aliases or new-preset evidence. Do not install conflicting providers in one live session. Record actual package versions, not historical log labels. The probe loads provider source as an explicit test dependency, not permission for product runtime to import provider internals.

It creates temporary config/project/target, complete runtime and scripted offline responses without model network or personal credentials. It exercises actual parser/runner/loader, role tools, write/edit/scoped self-fixes, late registered fixture search, target code cwd with native-validated absolute source paths and scripted read tool results, real IDs/result/steering, public RPC error/timeout paths and shared-source dispatch. Source bodies must be absent before read and appear only through real read results; never assert target task bodies as authoritative. The disposable managed fixture establishes native binding identity before invoking the runner; this is not a real project worktree. Read exit status, assertions and each case; cleanup success cannot convert failure to PASS. Verify actual sessions and owned subprocesses exit rather than assuming a finally block proves all third-party cleanup.

This is mechanism evidence, not full managed lifecycle, real-model compliance, terminal appearance or an OS sandbox. Missing/unapproved dependencies are NOT_RUN; no installation to fill coverage. Real terminal steps are in [tmux testing](tmux.md).

## Reporting and Documentation Gates

- Record exact final commands, subprocess environment, platform/versions, exit codes and PASS/FAIL/NOT_RUN; execution completion is not acceptance. A concurrent resource failure remains a failed gate until valid rerun evidence exists.
- Check relative Markdown links/anchors, repository-root source references, affected active JSONL parse/existence, untracked whitespace and `git diff --check`. For spec changes run `python3 .trellis/scripts/get_context.py --mode packages` and verify real substantive layer indexes.
- Intentionally empty unused role manifests may use `start --allow-empty-context`; task validate still diagnoses empties and must not be reported as full PASS. Dispatched roles need real curated context.
- Separate mocked fixtures, actual installed-host execution, real terminal input/frames and online model quality. No fake dialog, scripted provider or process-panel state proves visual/physical interaction or OS exit.
- Keep reusable methods here and terminal details in tmux.md; task evidence stores retained dated results/logs; research/ is reserved for research-agent findings. Never imply that adding a guide authorized or ran its procedure. No implicit personal sync/reload, push or lifecycle actions.
