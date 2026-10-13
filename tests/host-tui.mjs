// Direct-TS tests use the real public host TUI export, not a width mock.
// Like provider-contracts.mjs's host aliases, this only affects the test loader.
// Without local peers, set PI_TRELLIS_TEST_HOST to an installed Pi node_modules.
import { createRequire, registerHooks } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(process.env.PI_TRELLIS_TEST_HOST
  ? join(process.env.PI_TRELLIS_TEST_HOST, "package.json")
  : import.meta.url);
let tui;
try {
  tui = pathToFileURL(require.resolve("@earendil-works/pi-tui")).href;
} catch (cause) {
  throw new Error("Tests require the host pi-tui peer: set PI_TRELLIS_TEST_HOST to an installed Pi node_modules (no install needed).", { cause });
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "@earendil-works/pi-tui" ? tui : specifier, context);
  },
});
