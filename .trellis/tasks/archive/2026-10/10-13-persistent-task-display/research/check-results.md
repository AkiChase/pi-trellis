# Independent Check Results — Persistent Task Display

## Review scope and boundaries

Reviewed the complete display-task source/tests and README, PRD, check.jsonl, implementation-results, and extension architecture/session/quality specs. This lightweight task has no design.md or implement.md. The hook-injected PRD/spec were complete. Reviewed unstaged changes and new task-display tests; staging was empty. No Review base was supplied, so committed history was not reviewed. HEAD `07614dd83181dfa3d97b6c61b603af3059f51fdf` was pinned **only as a test-snapshot baseline**, not guessed as a review base.

Concurrent work appeared in libraries, Python management, overview/role-provenance entrypoint hunks, worktree tests, protocol documentation/tests and the worktree planning directory. Those changes were neither authored nor reverted by this checker. Specifically, the concurrent `renderOverview` and `roleBySession` hunks and the final integration test's worktree-overview assertion were excluded from task-only verification.

Checker writes were limited to:

- `extensions/trellis.ts`: canonical archive exclusion inside `readUnfinishedTaskCount`.
- `tests/task-display.test.mjs`: one archive-symlink/dangling-archive regression.
- This evidence file.

No task lifecycle command, stage, commit, push, install, dependency change, reload, branch change, real project worktree creation, or agent dispatch was performed. Full tests use existing disposable Git fixtures, including their own fixture commits/worktrees.

## Confirmed issue fixed

### Symlinked archive aliases entered the unfinished count

`extensions/trellis.ts:369–376`: the original code compared canonical task paths against a **lexical** `<resolved-store>/archive`. When `archive -> retired` and an immediate task directory alias pointed to `archive/old`, the archived task counted as unfinished. The independent minimal fixture expected zero and returned one. With an additional active task, the new regression expected one and the original implementation returned two.

Fix: canonicalize an existing archive path before containment checks. A genuinely absent archive is allowed; a dangling/unreadable archive degrades to unknown rather than a verified zero. This keeps the existing task-store safety policy, directory deduplication and no-write behavior.

Regression: `tests/task-display.test.mjs:118` verifies an active task plus aliases into an internal symlinked archive, then a dangling archive. In the disposable task-only snapshot, restoring the original archive line caused this regression to fail (exit 1, `2 !== 1`); restoring the final source passed.

## Confirmed finding not fixed — footer preservation needs a decision

`extensions/trellis.ts:635–659`, `tests/task-display.test.mjs:57–77`, README footer paragraph: the new **34 UTF-8-byte** budget is safely below 34 terminal columns, but unnecessarily clips names that fit the actual footer. Both `▸` and `…` cost three bytes but one terminal column; CJK and combining text lose more useful space. The test currently locks in `cur…` rather than detecting this preservation loss.

Read-only probe using the installed host's `visibleWidth()`:

| Full chip that fits | Full columns | Current output | Output columns |
| --- | ---: | --- | ---: |
| `trellis(3): current ▸ in_progress` | 33 | `trellis(3): cur… ▸ in_progress` | 30 |
| `trellis(3): abcdefghij ▸ planning` | 33 | `trellis(3): abcdef… ▸ planning` | 30 |
| `trellis(3): 任务任务 ▸ planning` | 31 | `trellis(3): 任务… ▸ planning` | 28 |
| Four combining `é` graphemes with `planning` | 27 | Two graphemes plus `…` | 26 |

There is no observed width overflow: 144 count/status/name combinations, including CJK, combining text, emoji and control sequences, were all <=34 columns (maximum 32). This finding is about requested preservation, not a width-bound failure.

Recommendation: confirm terminal-column-aware clipping (prefer the host's supported width/truncation utility, before theming), retaining the complete count and fitting name/status content within 34 columns. Then update the footer assertion and README. Introducing/resolving a runtime width-helper dependency or adopting a Unicode-width implementation is a design/dependency choice under this task's no-new-dependency constraint, so the checker did not silently rewrite it or claim full UI acceptance. Main session should resolve this finding before final acceptance.

## Behavior confirmed

Task-only tests verify tightly appended positive accent / zero dim / unknown muted counts; no-task persistence; active widget full name/status, conditional child count and artifacts; independent parent/child/other-session enumeration; completed/archive filtering; explicit external top-level task-store support; canonical aliases counted once; escaping directories rejected to unknown; malformed/unreadable/oversized count data never rendered as zero; session-start/task.py-result/agent-end count refresh; finish removes current details but retains count; off/unsupported clearing; headless behavior; theme/UI exceptions do not reject refresh handlers. Context provenance/injection regression assertions remain intact in the task-only snapshot.

## Exact verification and results

Environment: macOS, Node `v24.14.1`. `TRELLIS_CONTEXT_ID` was removed only from test subprocesses; the host identity was untouched. There is no package lint or typecheck script: both are **unavailable**, not Passed. Node's direct TypeScript execution is not static typechecking.

### Task-only baseline verification — final archive fix

A disposable directory was populated from the pinned HEAD (excluding generated `.trellis`, `.pi`, `.agents` files). Only this task's entrypoint imports/count/render/refresh/session-start/export hunks, task-display test and README were overlaid. The integration test was reconstructed from HEAD plus **only the two display assertions**, excluding a concurrently added worktree-overview assertion. No concurrent library/Python/worktree source or test changes were copied. Snapshot was removed after checks; no source branch/index/content reset occurred.

- `env -u TRELLIS_CONTEXT_ID node --test tests/task-display.test.mjs tests/agent-context-integration.test.mjs`: **30/30 passed**, no skips.
- `env -u TRELLIS_CONTEXT_ID npm test`: **106/106 passed**, no skips, natural exit.
- Negative archive regression: `node --test --test-name-pattern='symlinked archive' tests/task-display.test.mjs` against pre-fix archive code: **failed as expected**, `2 !== 1`; final-code focused/full runs above passed.
- Plain HEAD integration control: `env -u TRELLIS_CONTEXT_ID node --test tests/agent-context-integration.test.mjs`: **12/12 passed**.

Reconstruction script: `/tmp/pi-trellis-display-check-snapshot.py`. Selected entrypoint diff: `/tmp/pi-trellis-display-check-scoped.patch` (SHA-256 `4aaed6e6512254098fc2587e8d2fc49cade1e5e5692f9e1601b4a2c7bddbf241`). Final new test SHA-256: `ffd46f41a3a65e9ff4275b5365337bebd17ddcd7ad08ce300d3bcfed8e370217`.

Logs: `/tmp/pi-trellis-display-check-scoped-focused.log`, `/tmp/pi-trellis-display-check-scoped-full.log`, `/tmp/pi-trellis-display-check-archive-red.log`, `/tmp/pi-trellis-display-check-head-integration.log`.

The first reconstruction accidentally included the subsequently changed worktree-overview assertion from the live integration file; it failed that single out-of-scope assertion. The reconstruction was corrected to select only the display assertions and all final checks rerun. This was a snapshot selection correction, not a product/test weakening.

### Live concurrent checkout — do not conflate with scoped results

- Initial focused command, same clean subprocess identity: **23/29 passed**, six failures. Direct evidence: concurrent `renderOverview()` default argument called undefined `packageRoot()`; `before_agent_start` swallowed that error, so expected task-state messages were absent.
- Initial full `env -u TRELLIS_CONTEXT_ID npm test`: **97/105 passed**, eight failures: the six overview/injection failures above, multiline dispatch baseline drift, and supplementary Unicode snapshot lineage. This differs from the implementation agent's older live results because the checkout kept changing.
- Final local-fix focused command: **24/30 passed**, six overview/injection failures; the new archive test passed. Log: `/tmp/pi-trellis-display-check-live-focused-final.log`.
- Final local-fix full `env -u TRELLIS_CONTEXT_ID npm test`: **123/131 passed**, eight failures: child binding's expected state message; three foreign/missing-source expected state messages; direct worktree-overview assertion; display lifecycle's final state-message assertion; two newly added worktree-protocol overview assertions. Display rendering/count/lifecycle checks before the final injected-message assertion passed; other count/theme/off tests passed.

Final live log: `/tmp/pi-trellis-display-check-live-full-final.log`. At execution time the direct overview failure was `ReferenceError: packageRoot is not defined` in a concurrently added default argument; the other failures observed undefined overview/messages through the same path. The worktree owner edited this area again while final evidence was being collected, so these are captured run results, not a claim that the latest moving checkout still has that error. The standalone HEAD integration control and display-only snapshot are green. Do not change unrelated source or weaken state assertions to make this task green.

Initial live logs: `/tmp/pi-trellis-display-check-focused-initial.log`, `/tmp/pi-trellis-display-check-live-initial.log`.

### Other final checks and limitations

- Actual installed-host width probe: **144/144 <=34 columns**, maximum 32; confirmed excessive clipping examples above. Log: `/tmp/pi-trellis-display-check-widths.log`. No host/dependency installation or runtime helper import added to product.
- `git diff --check`: passed after final local fix.
- New test and task evidence trailing-whitespace checks: passed; role JSONL parsed and references existed; README local links **4/4 exist**.
- Real interactive host visual/reload and optional provider-contract probe: **not run**.
- Full live gate is not green in the captured run; task-only suite is green but does not resolve the footer-preservation decision or approve concurrent worktree changes. PRD/lifecycle status was left for the main session.

## Summary

One confirmed mechanical bug fixed with a red/green regression; one confirmed footer-preservation finding remains for main-session design resolution. Task-only final focused/full checks pass; captured live checks fail on concurrent overview/injection work. No broader clean-checkout or complete UI acceptance claim is made.
