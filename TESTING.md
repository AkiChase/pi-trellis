# Testing Pi Trellis

Run from the package root with Node 24 and the actual installed Pi peers:

```bash
PI_TRELLIS_TEST_HOST=/path/to/installed/pi/node_modules env -u TRELLIS_CONTEXT_ID npm test
PI_TRELLIS_TEST_HOST=/path/to/installed/pi/node_modules env -u TRELLIS_CONTEXT_ID \
  node --import ./tests/host-tui.mjs --test \
  tests/initialization.test.mjs tests/init-command.test.mjs \
  tests/skill-resources.test.mjs tests/runtime-contracts.test.mjs tests/dispatch.test.mjs
bash -n scripts/install.sh
git diff --check
```

`tests/host-tui.mjs` aliases the real public Pi TUI and coding-agent exports for
direct TypeScript execution. Set `PI_TRELLIS_TEST_HOST` only for test subprocesses
when local peer dependencies are absent; do not install peers merely to run tests.
Unset `TRELLIS_CONTEXT_ID` only in the subprocess so distinct simulated sessions
are not intentionally pinned together. The live host environment is unchanged.

- Initialization tests publish the entire fixed runtime in temporary directories,
  covering preview/no-op/collisions, owned root blocks, identity/history/join,
  mode/hash drift, interruption/retry, malformed operation/identity, no global
  Trellis/Python bytecode, and real task/context/journal/phase interoperability.
- Native-dialog tests cover English command/help/errors, UI/headless routes,
  username retries and cancellation, confirmation, refresh and terminal reload.
- Resource tests use actual Pi `DefaultResourceLoader` / `DefaultPackageManager`
  for command/skill discovery, trust and package filtering. `autoload:false`
  empty arrays are empty deltas, not disable-all; explicit exclusions are tested.
- Dispatch tests use initialized real-runtime fixture Git baselines and public
  mocked RPC. Runtime release guards run before target CLI execution and spawn;
  customization, occupancy, source drift and shutdown remain covered.
- Existing native worktree/material tests retain their original lifecycle
  fixtures. Generic readiness is not a migration requirement; supported-release
  gating is requested only by dangerous managed dispatch.

Fixture commits are disposable test setup, not authorization to commit this
repository. No real project initialization, installer, network model/provider,
visual TUI or OS sandbox test is implied. The package has no supported lint or
static typecheck command; TS test execution is not a typecheck.

The optional provider probe requires explicit installed host/provider paths and
separate approval; see the README. Do not install or load conflicting providers
into a live session for a checklist.
