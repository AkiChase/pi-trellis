# Runtime Architecture

## Scope and Ownership

`package.json` declares `type: module`, one Pi extension (`extensions/trellis.ts`), and a Pi peer dependency. TypeScript modules use explicit `.ts` imports and Node built-ins; host API imports are type-only. There is no frontend build, service layer, or database in this package.

| Repository-root path | Owner |
| --- | --- |
| `extensions/trellis.ts` | Pi events, session/root identity, UI, workflow excerpt, ordinary Agent interception, agent deployment and skill discovery |
| `lib/task-context.ts` | Task/material containment, role JSONL loading, dispatch facts and owned prompt assembly |
| `lib/config.ts`, `lib/bindings.ts` | Worktree configuration, canonical paths, persisted binding records and source-wide lock |
| `lib/worktree.ts`, `lib/worktree-manager.ts` | Git operations, repository identity, planning and management transitions |
| `lib/preparation.ts`, `lib/cleanup.ts` | Task-only copying/readiness and conservative removal |
| `lib/executions.ts`, `lib/subagent-rpc.ts`, `lib/worktree-tool.ts` | Execution leases/snapshots, public provider RPC and registered tool boundary |
| `scripts/`, `agents/`, `docs/agent-baseline.json` | Installation and adapted-agent source maintenance; see the scripts layer |
| `tests/*.test.mjs` | `node:test` coverage with direct TypeScript imports |

Keep host presentation in the entrypoint and reuse the library owner for shared contract logic. `__internals` exports in the extension are test helpers, not a stable public API. Runtime integration uses the Trellis CLIs and project files; it does not vendor a Trellis runtime implementation. The installer separately applies focused derived Python blocks; [license/provenance rules](../scripts/agent-sync-and-provenance.md) still apply.

## Inputs, Types and Validation

Follow the small local validators rather than introducing a schema framework for an unrelated edit. Example from `lib/config.ts`:

```typescript
const config: unknown = JSON.parse(readFileSync(file, "utf8"));
if (!config || typeof config !== "object" || Array.isArray(config)) {
  throw new Error("pi-trellis.json must contain an object");
}
```

`worktreeDirectory()` decodes the nested object and validates `directory` with `validateText()`. `parseBinding()` checks version/state, required identifiers and canonical paths. `readExecution()` checks its own record shape. A TypeScript assertion alone does not validate JSON. Existing CLI/host payload assertions describe narrow read shapes; do not turn them into a claim that all input already has exhaustive runtime decoding, nor refactor every assertion as part of a small change.

Tool modules register plain JSON Schema, narrow it to the host's `registerTool` parameter type, and validate operational invariants again in library code. Runtime uses explicit state unions, but management currently uses guarded branches rather than a universal reducer. Preserve existing behavior instead of imposing an aspirational architecture.

## Configuration and Path Contracts

- `.pi/pi-trellis.json` owns optional `worktree.directory`. Missing file/section/field defaults to source-root `.worktree`; malformed JSON or invalid objects/values fail. Relative values resolve from the **source root**, not a child cwd. Existing bindings retain absolute paths; changed configuration affects new creates only.
- `.trellis/config.yaml` owns material byte limits. `readContextLimits()` recognizes only the top-level `context_injection` mapping, not general YAML; details are in [Session and Context](session-and-context.md).
- `TRELLIS_CONTEXT_ID` can intentionally pin a valid session key. `TRELLIS_PYTHON` selects the interpreter; `TRELLIS_PI_CONTEXT` and `TRELLIS_PI_STATUS` affect context size/display. Identity is passed to subprocesses and bash, never published into shared `process.env`.
- `containsPath()` uses path-relative containment, not a string-prefix check. `canonicalPath()` resolves existing ancestors, including symlinks, without creating paths. A dangling symlink is not a free destination.
- Material task-store support is deliberately narrow (`resolveTaskPath()`); managed **target** task stores, source/target pi-trellis runtime stores and target sessions runtime must remain local. Source task material may use the resolved external task store. Do not reuse that exception for runtime bindings or arbitrary files.

Evidence: `tests/worktree.test.mjs` covers configuration, symlinks, unsafe slugs, absolute binding reuse and runtime containment; `tests/task-context.test.mjs` covers lexical and realpath boundaries.

## Errors and Side Effects

Cosmetic/discovery failures in the entrypoint degrade: no project/scripts means no session adaptation, unusable optional context warns in UI, and display exceptions clear the display. This is **not** the worktree safety policy. Invalid bindings, target identity, conflicting materials or RPC uncertainty must remain visible and fail conservatively; do not convert them into source fallback or success.

Use `execFile()` argument arrays for subprocesses. `lib/worktree.ts:git()` copies the environment, removes inherited `GIT_*` overrides and sets `GIT_OPTIONAL_LOCKS=0`, so a parent index/repository override cannot redirect an operation. It does not modify the parent environment. Binding JSON uses exclusive temporary files and rename; the source lock uses `wx` and never guesses that an existing lock is stale.

## Review Pitfalls

- Looking up a root once and reusing it after session cwd changes leaks project context; `findRoot()` is consulted per event.
- Treating a target marker as authoritative skips source/Git identity validation; see `sourceFor()`.
- Treating safe UI degradation as permission to swallow a preparation or dispatch failure loses the safety boundary.
- Editing generated `.trellis/scripts/` as if it were this package's source tooling, or copying source uncommitted files into a target baseline, changes ownership without approval.

For the actual state/pointer contracts read [Session and Context](session-and-context.md) and [Worktree Lifecycle](worktree-lifecycle.md). For validation read [Quality Guidelines](quality-guidelines.md).
