# Implementation self-check — Pi command unification

## Scope and status

Implemented in shared source, uncommitted. Only changed:

- `lib/initialization/command.ts`
- `lib/initialization/adoption.ts`
- `tests/init-command.test.mjs`
- `tests/adopt-project.test.mjs`
- New `tests/init-menu-safety.test.mjs`

Task documents were supplied but `implement.jsonl` was missing; reported before implementation and directly read the complete approved artifacts/specs/owners. No recursive delegation, task lifecycle, commit, dependency install, deployment or live reload.

## Behavior

- No init flag parser/export/completions. Every nonempty argument is a static migration notice; noUI returns only an interaction guide before any filesystem access. Native RPC remains allowed by hasUI.
- Initial menu uses explicit static project/resource/identity reads, no inspect/workspace enumeration/Python/Git. Check/Help/Cancel remain available on unsafe/fresh/unsupported/incomplete roots. Snapshot is not publication authority; writing selections reuse inspect and existing plan/apply validators.
- Single `checkProject()` owner uses existing resource/adoption facts with explicit resource-only scope; no model turn/writes/refresh/reload. Adoption may invoke existing inspect/Python/Git only after Check was selected; probe errors remain visible.
- Core root/scope/counts/preservation/destructive/no-backup warnings precede optional bounded examples. Path controls/newlines cannot push warnings outside the physical line budget. No full-action-list Check promise remains in either dialog.
- Public Pi 1.2 SDK source confirmed `ui.confirm()` uses `[Yes, No]` at selected index 0. To meet safe final default, initialization/update now use one native `select([Cancel, operation])`, matching adoption/template; no extra operation-selection stage.

## Actual verification

Environment: macOS Darwin, Node v24.14.1, Python 3.14.7, existing Pi 1.2.0. Every JS check used:

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID ...
```

Final focused command:

```bash
node --import ./tests/host-tui.mjs --test tests/init-command.test.mjs tests/adopt-project.test.mjs tests/init-menu-safety.test.mjs tests/project-activation.test.mjs tests/task-browser-ui.test.mjs
```

**PASS 100/100, natural exit 0.** [Final log](implement-focused-final.log). Includes subprocess/filesystem spies, native RPC hasUI, all-state menu access, Check failure retention and bytes/modes/index/session-pointer preservation, username Unicode/spaces/quotes, original adoption/update/template behavior, warning counts/bounds, source-root and state-race gating.

`git diff --check`: **PASS exit 0** after final edits.

Full `npm test`: **FAIL 453/455, exit 1**, no cancelled/skipped tests; [shared-source log](implement-full-shared-source.log). Both failed gates are outside this executor's scope:

1. `tests/initialization.test.mjs:20` expects fixed manifest resource count 35; concurrent worktree baseline now publishes 36. New scoped update test uses actual manifest count.
2. Parent-owned `tests/project-activation-host.test.mjs:87` answered `ui.confirm: true` without choosing the new final safe native selection, so initialization remained cancelled (`reloads 0` expected 1). Parent was notified to adapt init/update final selections.

The full run started before the last test-only strengthening (14-line assertion and Check index/pointer bytes), so final scoped focused result is authoritative for those additions. No product source changed after full launch. Earlier broader planned matrix was **123/130**: one scoped test hardcoded 35 (fixed), one existing count failure, five unsupported-runtime failures from then-in-flight unrelated extension task_error output. Retained [intermediate log](implement-intermediate-planned-matrix.log); do not label it Passed. Those five extension cases passed in full run after concurrent updates.

Lint/typecheck: **unavailable** (no package scripts), not Passed. Real PTY/terminal appearance/provider execution: **NOT_RUN**, not authorized. This is self-check, not independent review or acceptance; parent must arrange independent review and its final SDK/full rerun.

## Final scoped file SHA-256

```text
94ad4ffc875d7952aa5d59110bde75ffbd629f43b0b8b85a2c6b2882006f6233 lib/initialization/command.ts
653fd4e2673b9fbdb9bac538fc67e00ee1b48fb96cb304c9a15fb3dc1e7e68da lib/initialization/adoption.ts
c9af7d1290b73aadce7e22a88c8e0a67d547c2c0a9c3c7dc41ab250ef139ff3a tests/init-command.test.mjs
378a5fd49bea20726aa598087711efec69f570ca9d9320f1363221f9693550a7 tests/adopt-project.test.mjs
ad3ab476b35cf236bc07bec36467945ca7fa91d3e9a4d78b5526c0dffcd4bf66 tests/init-menu-safety.test.mjs
```
