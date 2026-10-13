# Runtime Architecture

## Scope and Ownership

`package.json` declares `type: module`, one Pi extension (`extensions/trellis.ts`), and host-provided Pi peers. TypeScript modules use explicit `.ts` imports and Node built-ins; coding-agent API imports are type-only, while `@earendil-works/pi-tui` provides runtime `visibleWidth()` / `truncateToWidth()` utilities. There is no frontend build, service layer, or database in this package.

| Repository-root path | Owner |
| --- | --- |
| `extensions/trellis.ts` | Pi events, session/root identity, UI, workflow excerpt, ordinary Agent interception, agent deployment and skill discovery |
| `lib/task-context.ts` | Task/material containment, role JSONL loading, dispatch facts and owned prompt assembly |
| `runtime/pi_trellis_worktree/records.py`, `manager.py` | Native Git/config/identity, v1 records, lock and management transitions |
| `runtime/pi_trellis_worktree/materials.py` | Complete reference validation, selected task copies and readiness |
| `lib/config.ts`, `lib/bindings.ts` | Host path validators and shared v1 persistence/lock primitives (no management fallback) |
| `lib/executions.ts`, `lib/subagent-rpc.ts`, `lib/worktree-query.ts` | Host leases/snapshots, public provider RPC and read-only Python queries |
| `runtime/common/`, `runtime/{task,get_context,add_session,init_developer,get_developer}.py` | Fixed AGPL Trellis 0.6.16 import closure, maintained task/session/journal contracts |
| `resources/runtime-baseline.json` | Full original/output hashes, independent native/role source categories and content-derived release ID |
| `scripts/`, `agents/`, `docs/agent-baseline.json` | Installation and adapted-agent source maintenance; see the scripts layer |
| `tests/*.test.mjs` | `node:test` coverage with direct TypeScript imports |

Keep host presentation in the entrypoint and reuse the library owner for shared contract logic. `__internals` exports in the extension are test helpers, not a stable public API. The native standard-library management core remains original MIT pi-trellis code, moved unchanged from `python/`. The package now also vendors the supported AGPL Trellis 0.6.16 task/context/journal/developer import closure in `runtime/`; see [runtime baseline](../../../docs/runtime-baseline.md). Package source is not implicitly deployed to an existing project. Host queries invoke the package-local Python query without taking a lock; user commands use the independently deployed fixed project entry. Python also owns accepted-source snapshots, whole-file B/S/T decisions, prospective overlays and material revisions; TS consumes opaque facts and never duplicates those rules. The installer separately applies focused derived Python blocks; [license/provenance rules](../scripts/agent-sync-and-provenance.md) still apply.

## Inputs, Types and Validation

Follow the small local validators rather than introducing a schema framework for an unrelated edit. Example from `runtime/pi_trellis_worktree/records.py`:

```python
config = json.loads(file.read_text(encoding="utf-8"))
if not isinstance(config, dict):
    raise ValueError("pi-trellis.json must contain an object")
```

`records.py:worktree_directory()` decodes the nested object and validates `directory` with `records.py:text()`. `parseBinding()` checks version/state, required identifiers and canonical paths. `readExecution()` checks its own record shape. A TypeScript assertion alone does not validate JSON. Existing CLI/host payload assertions describe narrow read shapes; do not turn them into a claim that all input already has exhaustive runtime decoding, nor refactor every assertion as part of a small change.

The single execution tool registers plain JSON Schema, narrows it to the host's `registerTool` parameter type, and validates action-specific requirements at runtime. Management uses operation-specific argparse parsers. Runtime uses explicit state unions, but management currently uses guarded branches rather than a universal reducer. Preserve existing behavior instead of imposing an aspirational architecture.

## Configuration and Path Contracts

- `.pi/pi-trellis.json` owns optional `worktree.directory`. Missing file/section/field defaults to source-root `.worktree`; malformed JSON or invalid objects/values fail. Relative values resolve from the **source root**, not a child cwd. Existing bindings retain absolute paths; changed configuration affects new creates only.
- `.trellis/config.yaml` owns material byte limits. `readContextLimits()` recognizes only the top-level `context_injection` mapping, not general YAML; details are in [Session and Context](session-and-context.md).
- `TRELLIS_CONTEXT_ID` can intentionally pin a valid session key. `TRELLIS_PYTHON` selects the interpreter; `TRELLIS_PI_CONTEXT` and `TRELLIS_PI_STATUS` affect context size/display. Identity is passed to subprocesses and bash, never published into shared `process.env`.
- `containsPath()` uses path-relative containment, not a string-prefix check. `canonicalPath()` resolves existing ancestors, including symlinks, without creating paths. A dangling symlink is not a free destination.
- Material task-store support is deliberately narrow (`resolveTaskPath()`); managed **target** task stores, source/target pi-trellis runtime stores and target sessions runtime must remain local. Source task material may use the resolved external task store. Do not reuse that exception for runtime bindings or arbitrary files.

Evidence: `tests/worktree.test.mjs` and `tests/worktree-cli.test.mjs` cover configuration, symlinks, unsafe slugs, absolute binding reuse and runtime containment; `tests/task-context.test.mjs` covers lexical and realpath boundaries.

## Errors and Side Effects

Cosmetic/discovery failures in the entrypoint degrade: no project/scripts means no session adaptation, unusable optional context warns in UI, and display exceptions clear the display. This is **not** the worktree safety policy. Invalid bindings, target identity, conflicting materials or RPC uncertainty must remain visible and fail conservatively; do not convert them into source fallback or success.

Use `execFile()` / Python `subprocess` argument arrays for subprocesses. `records.py:git_environment()` copies the environment, removes inherited `GIT_*` overrides and sets `GIT_OPTIONAL_LOCKS=0`; both Git operations and target `task.py`/hooks use it so parent index/repository overrides cannot redirect an operation. It does not modify the parent environment. Binding JSON uses exclusive temporary files and rename; the source lock uses `wx` and never guesses that an existing lock is stale.

## Task Display Contract

- `readUnfinishedTaskCount(root): number | undefined` rereads immediate project task directories on existing display refresh events. Exclude completed records and canonical archive descendants, deduplicate canonical aliases, and retain task-store containment validation. Unreadable/invalid enumeration yields unknown, not a partial or verified zero.
- Widget mode renders `▸ trellis(N)` without a session task and adds existing task details when active. Positive counts use `accent`, zero `dim`, unknown `(?)` `muted`. Footer follows the same count semantics; `off` and unsupported projects clear the display.
- Footer clipping uses host `visibleWidth()` / `truncateToWidth()` before theming, with a 34-terminal-column budget. Sanitize control input, preserve the count and fitting name/status, and cap long content. Byte length is not terminal width: `trellis(3): current ▸ in_progress` fits at 33 columns and must not become `cur…`.
- `tests/task-display.test.mjs` asserts count filtering/alias behavior, persistence/refresh transitions, theme/error degradation and Unicode/control width bounds. Production resolves TUI through the Pi loader; direct-TS tests use the real peer via the test-only preload documented in [Quality Guidelines](quality-guidelines.md).

## Review Pitfalls

- Looking up a root once and reusing it after session cwd changes leaks project context; `findRoot()` is consulted per event.
- Treating a target marker as authoritative skips source/Git identity validation; see `records.py:source_for()`.
- Treating safe UI degradation as permission to swallow a preparation or dispatch failure loses the safety boundary.
- Editing generated `.trellis/scripts/` as if it were this package's source tooling, or copying source uncommitted files into a target baseline, changes ownership without approval.

For the actual state/pointer contracts read [Session and Context](session-and-context.md) and [Worktree Lifecycle](worktree-lifecycle.md). For validation read [Quality Guidelines](quality-guidelines.md).
