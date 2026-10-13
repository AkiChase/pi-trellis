# Independent Width-Fix Check Results

## Scope and preservation

Checked the approved terminal-column follow-up in `extensions/trellis.ts`, `package.json`, `tests/host-tui.mjs`, `tests/task-display.test.mjs`, and the task's README paragraphs. Read the complete extension/display/context integration tests, task PRD, `research/width-fix-results.md`, prior `research/check-results.md`, and applicable extension architecture/session/quality and shared boundary/reuse specs. This task has no `design.md` or `implement.md`.

Reviewed unstaged task changes and relevant untracked files; staged changes were empty. No Review base was supplied: committed history was **not** reviewed. HEAD was `07614dd83181dfa3d97b6c61b603af3059f51fdf`, recorded for identity only, not inferred as a review base.

Concurrent worktree changes in the entrypoint overview/role/injection hunks, README worktree paragraphs, extension specs, libraries, Python, worktree tests and the other task were not edited or independently accepted. Full-suite results below are captured live-checkout regression evidence, not a review of that other task. No task-only snapshot suite was independently rerun; the implementer's scoped 32/108 results remain separately attributed to `width-fix-results.md`.

**Checker writes: this evidence file only.** No product/test fixes were necessary. No install, reload, stage, commit, push, branch switch, finish/archive, managed dispatch or real-project worktree operation was performed. The standard suite uses its own disposable Git fixtures/fixture commits. The peer-resolution probe used a temporary symlink to the existing real peer, not an installation or a source `node_modules` change.

## Findings

### Approved width correction verified

- `extensions/trellis.ts:26, 59, 636–655`: direct bare import of public host `visibleWidth()` / `truncateToWidth()`, 34-column budget, count/separator reserved first, status-first clipping with at least one name column, explicit one-column ellipsis.
- Required fitting output is exactly `trellis(3): current ▸ in_progress`, **33 visible columns**. The exact-34 ASCII and fitting CJK, combining, rocket/skin-tone/family-ZWJ emoji name/status cases remain whole.
- The count is never passed to the truncator. The render test checks zero, positive, unknown and `Number.MAX_SAFE_INTEGER`; all are complete. Runtime counts originate in bounded immediate directory enumeration, not arbitrary external numeric input.
- Input ANSI is stripped and C0/DEL/C1 controls become spaces before measurement. Helper-generated reset sequences are removed before semantic theming, preventing truncated text/ellipsis from interrupting its intended color span.
- Existing 192-combination matrix measures the **real host helper's width of ANSI-themed output**, not JS length or bytes. Independent additional 2,116 name/status/count combinations also stayed <=34 with complete counts and no remaining C0/DEL/C1 characters after theme stripping. These probes included flags, orphan combining/spacing marks, empty strings, ZWJ, Unicode line/paragraph separators, surrogate input, Thai/Myanmar/halfwidth text, CSI/OSC/APC/C1/ESC/control inputs, and long repeated names/statuses.

### Public host integration and test resolution verified

Read installed Pi 1.2.0 `docs/packages.md`, full public TUI declarations and the relevant implementation/public barrel, and complete extension loader. Evidence:

- Host package documentation lists `@earendil-works/pi-tui` as supplied to extensions and explicitly requires `peerDependencies` with `"*"`, without bundling.
- The peer's `main` is `dist/index.js`; that barrel publicly exports both helpers. Public signature: `truncateToWidth(text, maxWidth, ellipsis?, pad?)`.
- Actual host loader maps the bare TUI package to its host entry (or embedded virtual modules on bundled distributions). Production has **no host path probing, hardcoded installed path, custom loader, copied Unicode implementation or fallback**.
- `package.json` adds only the host TUI `*` peer and the test preload. No runtime dependency/bundle or install step was introduced.
- `tests/host-tui.mjs` resolves the real package's public main through `createRequire`, registering a narrow bare-package resolver alias. The explicit host directory controls resolution; without override it resolves from the test/package location. Both modes returned the same `visibleWidth` function identity as the installed public entry in independent probes.
- With a local real-peer symlink but an explicit isolated missing host, resolution failed with the actionable peer error rather than silently choosing the local peer. With no peer/override in this checkout, raw `npm test` fails actionably; no width mock, skip or production fallback conceals it.
- Actual host `loadExtensions()` loaded this production extension successfully **without** `--import ./tests/host-tui.mjs` or `PI_TRELLIS_TEST_HOST`. It registered `trellis_dispatch` and lifecycle handlers. No lifecycle event, provider/network interaction or real UI was invoked. This specifically checks loader/import integration, not interactive rendering.

### Prior behavior regression verified

Focused tests retain positive/zero/unknown count styling, active widget full name/status/subtasks/artifacts, completed/archive exclusion, canonical archive symlink exclusion and dangling-archive unknown behavior, alias deduplication, external top-level task store containment, malformed/unreadable count degradation, no-task persistence, create/finish/archive refresh via existing events, selected status/off surfaces, unsupported/headless handling and cosmetic exception degradation. The status lifecycle regression renders the complete active `current ▸ in_progress` footer. Context integration still verifies foreign CLI rejection, distinct keys and non-resurrection/parent-pointer preservation.

No new runtime or test correctness issue was found; the prior byte-clipping finding is resolved.

## Verification commands and results

Environment: macOS, Node **v24.14.1**, real installed host TUI **1.2.0**. Test commands removed `TRELLIS_CONTEXT_ID` only in child environments, not the host. No package lint/typecheck command exists: both are **unavailable**, not Passed; direct TS execution is not static checking.

```bash
# Independent focused (log /tmp/pi-trellis-width-check-focused.log)
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs
# Independent full (log /tmp/pi-trellis-width-check-full.log)
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
# Explicit no-host negative check (log /tmp/pi-trellis-width-check-no-host.log)
env -u TRELLIS_CONTEXT_ID -u PI_TRELLIS_TEST_HOST npm test
# Whitespace gate
git diff --check
```

- Focused: **32/32 passed**, no failures/skips, natural exit, 3.11 s.
- Full live checkout: **138/138 passed**, no failures/skips, natural exit, 61.77 s. Background job `bjnxu7ann` exit 0; launcher output `/tmp/pi-bg/bjnxu7ann.log`.
- No-host command: **exit 1 as expected**, missing `@earendil-works/pi-tui` with `PI_TRELLIS_TEST_HOST` guidance. **Raw no-override npm test is not Passed.**
- Additional edge matrix: **2,116/2,116 <=34**, required ASCII exact text and width 33 verified, exit 0.
- `git diff --check`: passed. Untracked task Markdown/tests/loader whitespace, both task manifests and README local links also checked separately.

Independent host-loader probe command:

```bash
env -u TRELLIS_CONTEXT_ID -u PI_TRELLIS_TEST_HOST JITI_FS_CACHE=0 node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadExtensions } from '/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js';
const fixture = mkdtempSync(join(tmpdir(), 'pi-trellis-width-host-load-'));
try {
  const result = await loadExtensions([resolve('extensions/trellis.ts')], fixture);
  assert.deepEqual(result.errors, []);
  assert.equal(result.extensions.length, 1);
  assert.deepEqual([...result.extensions[0].tools.keys()], ['trellis_dispatch']);
  assert.ok(result.extensions[0].handlers.has('session_start'));
  result.runtime.invalidate('check completed');
} finally { rmSync(fixture, { recursive: true, force: true }); }
JS
```

Result: **passed**; log `/tmp/pi-trellis-width-check-host-loader.log`. The fixed path is explicit test evidence for this environment, not a path added to production or the test resolver.

Peer-resolution probe ran `env -u TRELLIS_CONTEXT_ID node --input-type=module` with a temporary copied preload and symlink to the installed real peer, spawning `node --import <preload> --input-type=module -e <assertions>` for ordinary local resolution, explicit host resolution and an isolated missing explicit host. Assertions compare imported helper identity with the real public entry, verify CJK width 4, and verify actionable failure despite an available local peer. All three boundaries **passed**. Log `/tmp/pi-trellis-width-check-resolver.log`. Temporary directories were removed. An extra in-fixture nonexistent override path was explored but not asserted as isolated: Node legitimately searches ancestor module roots; the actual negative assertion uses a separate empty temporary root.

Additional width probe ran `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<same-host> node --import ./tests/host-tui.mjs --input-type=module` with four counts and 23 repeated name/status samples (4×23×23 = 2,116), real ANSI theme, actual `visibleWidth`, complete-label and stripped-control assertions. It also asserted the required ASCII exact result and width 33. No source files were changed by the probes.

## Final reviewed fingerprints

SHA-256 after verification:

| File | SHA-256 |
| --- | --- |
| `extensions/trellis.ts` | `9088512ee67942e692f9cf6c94f59cd1db4a11cb239a2936b1168762f0ee5eeb` |
| `package.json` | `0e114b08e5cdef8c42228e1dc0449d5a45779a84048934a514cc278487a0f877` |
| `tests/host-tui.mjs` | `812365169c74746eb923e5b0d7eaff19a72281016dec68f14c9248e565215a0b` |
| `tests/task-display.test.mjs` | `ebcaf34798779e07a877c3b637dc6d59a46993f6cd677076792f0232f8249a9e` |
| `tests/agent-context-integration.test.mjs` | `2c7026f7be8d212b26611e6bd9fdc94ded7258bdffcea17e82fc800f3fbbd1c1` |
| `README.md` | `2fb6ec84a85ad6ee94aa96f1b2d9cfde15a95d023864fdb1dd910c8d4cbfb156` |

## Remaining limits and spec follow-up

- No real interactive visual/reload, online model, optional provider-contract suite, older Pi version matrix or static lint/typecheck was run. The host still owns aggregate shared-footer truncation. The real-loader smoke check is not a provider probe or installation.
- Existing concurrently modified specs still describe host imports as type-only (`extension/architecture.md` opening paragraph) and show the prior direct-test command without the required preload (`extension/quality-guidelines.md`). README/package instructions are correct. **Do not overwrite those concurrent spec changes in this review**; main session should align these small statements during the normal spec-update step. This is documentation follow-up, not an unresolved runtime-width defect.
- No task-only snapshot independent rerun or committed-history review was performed; live regression checks are green at the captured version. Task acceptance and lifecycle remain with the main session/user.

## Summary

Approved width fix independently verified; prior count/widget/archive regression checks remain green. No product/test issue needed a mechanical fix. Only this report was added; concurrent work preserved.
