# Footer Terminal-Column Fix — Implementation Results

## Scope and preservation

The user approved correcting the remaining footer UTF-8-byte clipping finding from `check-results.md`, using supported host helpers without dependency installation. Implementation stayed in the current checkout, without subagent dispatch or task lifecycle changes.

Writes in this follow-up:

- `extensions/trellis.ts`: public TUI import, `STATUS_MAX_COLUMNS`, column-based `compactText()` / `renderStatus()` only.
- `package.json`: declare the host-supplied `@earendil-works/pi-tui: "*"` peer; preload the test-only alias in `npm test`.
- `tests/host-tui.mjs`: small direct-TS test resolver for the **real installed public TUI package**, configurable through `PI_TRELLIS_TEST_HOST` or normally resolved local peers.
- `tests/task-display.test.mjs`: fitting Unicode/ASCII regressions, actual-column bounds, ANSI/control sanitization, semantic-color-span checks, and active/taskless footer lifecycle assertion; mode subprocesses use the same explicit preload.
- `README.md`: actual terminal-column semantics and no-install test instructions.
- Task `prd.md`: transparently record the approved existing-host-peer exception to the original no-new-dependency constraint; acceptance/lifecycle left unchanged.
- This evidence file.

The previous canonical archive exclusion and its symlink/dangling-archive regression remain intact. Default widget rendering is unchanged. Concurrent `renderOverview`, role provenance, injection, worktree libraries/Python/specs/tests/protocol documentation and unrelated README hunks were preserved, not replaced. `tests/agent-context-integration.test.mjs` has no net follow-up edits; its pre-existing display assertions and concurrent overview assertion remain.

No install, reload, stage, commit, push, branch/worktree lifecycle, finish/archive or real-provider dispatch was performed. The normal full tests do create/commit/remove their own disposable Git fixtures; those are not user-checkout operations.

## Public host-helper contract

Read complete installed Pi 1.2.0 documents before changing imports/API use:

- `@earendil-works/pi-coding-agent/docs/extensions.md`
- `docs/tui.md`
- `docs/packages.md`
- `docs/themes.md`
- The linked `examples/extensions/custom-footer.ts` and `widget-placement.ts`
- `@earendil-works/pi-tui/README.md`

Followed the public-export reference through the installed release's `pi-tui/dist/index.js`, `dist/utils.d.ts` and relevant `truncateToWidth()` implementation. The coding-agent loader also aliases the host TUI entry, as the existing `tests/provider-contracts.mjs` probe does.

The package documentation explicitly supplies `pi-tui` to extensions and requires host packages in `peerDependencies` with `"*"`, not bundled runtime dependencies. The public barrel exports both `visibleWidth()` and `truncateToWidth()`. Production uses that direct bare import only: **no production path probing, fallback, custom loader, Unicode tables or copied third-party logic**.

Test resolution is separate: `node --import ./tests/host-tui.mjs` registers one synchronous resolver alias before extension imports link. With no local `node_modules`, `PI_TRELLIS_TEST_HOST` points to an existing host `node_modules`; `createRequire().resolve()` locates the real public entry. Missing peers fail with an actionable message rather than mocked widths or skipped coverage. No dependency tree was installed or modified.

## Behavior and regression coverage

The footer reserves the complete `trellis(N)` count and separator first, then budgets status and task name by **visible columns**, retaining the existing status-first priority and minimum one column for the task name. The host truncator uses grapheme-aware clipping and an explicit one-column `…` marker.

Task input ANSI is stripped and C0/DEL/C1 controls are replaced with spaces before measurement. The host truncator adds ANSI resets when shortening even plain strings; these helper-generated resets are stripped **before** applying semantic theme colors, so truncated names/statuses and their ellipses remain within the intended color span.

Confirmed fitting strings remain complete:

- `trellis(3): current ▸ in_progress`: **33 columns**, no `cur…` regression.
- `trellis(3): abcdefghijk ▸ planning`: **34 columns**.
- CJK names, repeated combining `é`, rocket emoji, skin-tone emoji and family ZWJ emoji.
- Fitting CJK/combining/emoji custom statuses.

The bounds matrix covers **192** count/status/name combinations (positive, zero, unknown and `Number.MAX_SAFE_INTEGER`; ordinary and long ASCII/CJK/combining/emoji statuses; short and long Unicode names). It checks the **real helper's visible width of the ANSI-themed output** <=34, exact host-truncated expected components, complete count and uninterrupted semantic theme spans. Separate cases cover SGR, OSC title/hyperlink sequences, newline/CR/tab/NUL/bell/DEL/C1 input. Lifecycle fixtures cover both selected modes and active/taskless transitions; the status fixture explicitly renders the complete `current ▸ in_progress` footer after a task.py result.

## Exact verification

Environment: macOS, Node **v24.14.1**, installed host TUI **1.2.0**. `TRELLIS_CONTEXT_ID` was removed only from test subprocesses. No lint or typecheck command exists: both are **unavailable**, not Passed. Direct TypeScript execution is not static typechecking.

The following host path was supplied through the test-only variable in every host-helper test command:

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules
```

### Current live concurrent checkout

Commands (variable repeated on each invocation, not exported into the live host):

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
git diff --check
```

- Final focused: **32/32 passed**, zero failures/skips, natural exit. Log: `/tmp/pi-trellis-display-width-live-focused-final.log`.
- Final full: **138/138 passed**, zero failures/skips, natural exit, 70.64 s. Log: `/tmp/pi-trellis-display-width-live-full-final.log`.
- Earlier correctly preloaded focused: **32/32 passed**; earlier full before the strengthened active-footer lifecycle assertion: **138/138 passed**, 80.46 s. Logs: `/tmp/pi-trellis-display-width-live-focused.log`, `/tmp/pi-trellis-display-width-live-full.log`.
- Whitespace: `git diff --check` passed; new tests/evidence separately checked for trailing whitespace.
- Both role manifests parsed and all referenced paths exist; README local links **5/5 exist**.

The prior check's concurrent overview failures **did not recur** in these runs. This is a captured green live run, not independent acceptance/review of concurrent worktree implementation.

### Task-only snapshot and negative control

Pinned HEAD `07614dd83181dfa3d97b6c61b603af3059f51fdf` was used only as a disposable test-snapshot baseline. The reconstruction excludes concurrent entrypoint overview/role hunks and all concurrent libraries/Python/worktree tests; it overlays only the persistent-display imports/count/render/refresh/export/startup changes and this follow-up. Package/test host bootstrap and final task-display test are copied. Integration is HEAD plus only the two original display assertions, not the concurrent overview assertion. README is copied for documentation completeness, but is not a runtime test input. Snapshot directories were removed after each run; source files/index/branch were not reset or cleaned.

Executed via:

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules python3 /tmp/pi-trellis-display-width-snapshot.py
```

The script removes `TRELLIS_CONTEXT_ID` in the child environment and runs:

- `node --import ./tests/host-tui.mjs --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs`: **32/32 passed**, no skips. Log: `/tmp/pi-trellis-display-width-scoped-focused.log`.
- `npm test`: **108/108 passed**, no skips, natural exit. Log: `/tmp/pi-trellis-display-width-scoped-full.log`.
- Plain-HEAD integration control with the same preload: **12/12 passed**. Log: `/tmp/pi-trellis-display-width-head-integration.log`.
- Negative control: restore the exact previous `compactText()` byte implementation plus byte measurements in the snapshot footer, then `node --import ./tests/host-tui.mjs --test --test-name-pattern='footer preserves fitting' tests/task-display.test.mjs`: **failed as expected**, actual `trellis(3): cur… ▸ in_progress` versus expected `trellis(3): current ▸ in_progress`. Log: `/tmp/pi-trellis-display-width-clipping-red.log`. Final helper code was restored before scoped focused/full runs.

Harness corrections were not product fixes: the first attempt to register the resolver through ordinary static imports failed before linking; explicit `--import` was adopted and final tests rerun. An initial snapshot negative-control extraction omitted unchanged context lines and failed with `separator is not defined`; it was corrected to restore only the actual old clipping helper and byte measurements. Only the final **assertion mismatch** above is valid red-regression evidence. An earlier extraction also raised `ValueError`; it did not run tests. These failed harness attempts are not counted as successful verification.

Reconstruction script SHA-256: `e58996a05f9a4e0508f827549abe7994d4118069e6dc2c0daaee4bf7d6a88a94`.
Scoped extension patch `/tmp/pi-trellis-display-width-scoped.patch` SHA-256: `73d322933e3f1c703a6001c665e8a9947432e32f88a23a19e30b7d23c32204c7`.
Final tests SHA-256: `host-tui.mjs` `812365169c74746eb923e5b0d7eaff19a72281016dec68f14c9248e565215a0b`; `task-display.test.mjs` `ebcaf34798779e07a877c3b637dc6d59a46993f6cd677076792f0232f8249a9e`.

## Remaining limits

No real interactive TUI visual test, installation/reload, online-model test, optional provider-contract probe or independent check-agent review was run in this follow-up. Tests use real host width/truncation helpers with simulated theme/lifecycle surfaces. The host still controls aggregate footer truncation when all extensions share a narrow terminal. PRD acceptance and task lifecycle remain for the main session/user.
