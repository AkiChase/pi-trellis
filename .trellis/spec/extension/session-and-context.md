# Session Identity and Task Context

## Applicability

Use this guide for changes to `extensions/trellis.ts`, `lib/task-context.ts`, ordinary Agent injection, prompt caching or task display. Managed worktree dispatch adds the readiness and occupancy rules in [Worktree Lifecycle](worktree-lifecycle.md).

## Session and CLI Ownership

`findRoot()` walks upward from the current event cwd on every use. `session()` requires both Trellis scripts. `sessionIdentity()` combines root and Pi session ID; `contextKey()` memoizes a key for that identity. A trimmed `TRELLIS_CONTEXT_ID` matching `[A-Za-z0-9_-]{1,128}` intentionally pins a key. Otherwise the key is `pi-` plus a 12-character SHA-256 prefix of the session file, or root/session identity when no file exists. Do not assume a session-file-derived key itself includes the root: caches also carry root/identity to isolate usage.

`runPython()` passes `{ ...process.env, TRELLIS_CONTEXT_ID: key }` and the execution root as cwd. The bash `tool_call` handler prefixes the command with an explicit export, including indirect CLI invocations. Neither mechanism mutates the host's `process.env`.

The disk fast path defensively reads `.trellis/.runtime/sessions/<key>.json`; it is a Trellis implementation detail, not a new public API. `readTaskRecord()` applies the material containment boundary. A missing/unreadable pointer degrades to `task.py current --json`. The CLI fallback accepts a task only when:

```typescript
if (result.code !== 0 || data?.source !== `session:${key}` || data.stale || data.error) {
  return undefined;
}
```

This is the guard in `resolveActiveTask()`. Foreign/missing/session-fallback provenance must not enter display, state or dispatch materials. The fixed Python runtime applies the same task authorization rules; unsupported/missing/incomplete manifests block script execution and produce task_error. See [Installation and Patching](../scripts/installation-and-patching.md).

## Child Binding Is Not Parent Pointer Inheritance

`parseDispatchFacts()` requires a first-line `Active task: <path>`, not a phrase in prose. It then scans until the first blank line for matching context/role lines; unmatched nonblank lines do not stop the scan. This recognizes dispatch formatting, not an authenticated origin. `inheritDispatchTask()` derives `pi-child-<hash>` from the child's root/session identity **before** validating/binding; it overrides even a process-wide parent pin. The dispatch context ID is provenance, not authorization to clear the parent's pointer.

The child invokes `common.active_task.set_active_task` through a scoped Python subprocess. It does not run `task.py start` or lifecycle hooks. Successful binding is remembered in `taskBySession` only to avoid rebinding the same dispatch task each turn. `sessionTask()` still reads the pointer; that map is not an in-memory active-task override. After a child clears its pointer and task cache is invalidated, the same header must not resurrect it. Failed binding remains on the independent key rather than falling back to the parent.

Evidence: `tests/agent-context-integration.test.mjs` exercises concurrent sessions, scoped CLI cache, child finish/non-resurrection, failed binding, explicit vs quoted task headers and provenance rejection.

## Role Materials and Containment

`buildTaskContext({ executionRoot, taskDir, role })` owns all material loading; every dispatch rereads files, including same-mtime edits.

| Role | Loading order |
| --- | --- |
| `trellis-implement` | `implement.jsonl` references, then required `prd.md`, optional `design.md` and `implement.md` |
| `trellis-check` | `check.jsonl` references, then the same artifacts |
| `trellis-research` | Artifacts only; does not automatically load implement/check JSONL |

JSONL uses repository-root-relative paths, for example:

```json
{"file":".trellis/spec/extension/session-and-context.md","reason":"Session and injection contract"}
```

Blank lines and object rows without `file` are skipped. Broken rows, invalid/missing files, seed-only/empty role lists, missing/empty PRD and invalid task records produce diagnostics, not complete injection. A directory reference must declare `"type":"directory"`; expansion is sorted and canonical-path-deduplicated, including cycles. Real files shared across references/artifacts are deduplicated.

`resolveTaskPath()` requires a task beneath `.trellis/tasks/`, and its realpath beneath the resolved task store. `safePath()` rejects lexical escape from the root and arbitrary external symlinks. The intended external-store route is the project's top-level `.trellis/tasks` symlink; implementation checks the lexical route and resolved store, not the symlink type of every ancestor. `task.json` receives the same root/store boundary. This exception does not permit external worktree runtime or managed-target task stores.

Bounds in `lib/task-context.ts`: task record and JSONL at most 1 MiB, at most 512 JSONL references, 128 expanded directories and 512 directory entries, and at most 64 diagnostics plus one omission notice. Preserve these defenses when changing loading behavior.

## Byte Budgets and Complete-Injection Provenance

`readContextLimits()` reads non-negative safe integer settings from the top-level `context_injection` mapping in `.trellis/config.yaml`:

| Setting | Default bytes |
| --- | ---: |
| `max_file_bytes` | 32768 |
| `max_artifact_bytes` | 65536 |
| `max_total_bytes` | 131072 |

`0` disables that limit. Quoted integer values are accepted; invalid values retain defaults. This is a narrow mapping reader, not a full YAML parser. Total budgeting accounts for material headers/separators; diagnostic text and the outer dispatch wrapper are separate, so do not advertise a hard cap on the entire prompt. UTF-8 prefixes are trimmed safely, not replaced with invalid characters. Binary/NUL and invalid UTF-8 material cannot assert completeness.

`assembleDispatchPrompt()` strips caller-supplied owned blocks and injection markers, builds a fresh header, and sanitizes markers/delimiters quoted inside loaded files. Only `context.complete` adds `<!-- trellis-hook-injected -->` within `<!-- pi-trellis:task-context:start -->` / `end`. A quoted marker, partial prefix or diagnostic is never success. Agents must read omitted/missing full material within the same path boundary before working; unavailable requirements are a blocker, not permission to guess.

## Injection and Cache Lifecycle

- `sectionCache` memoizes overview/workflow sections per session/root/key for stable provider prefixes. `before_agent_start` adds them only when the host supplies `systemPromptOptions.sections`; headless defaults to compact (no workflow excerpt), overridable with `TRELLIS_PI_CONTEXT`. Main overview has four short worktree entry/boundary lines and the readable package-local `docs/worktree-execution.md` path resolved via `import.meta.url`; missing CLI/document diagnoses, never installs. A valid first-line dispatch role is remembered only for presentation (not authorization), invalidating sections on role changes. Child overview contains execution boundaries, not a management tutorial; `hasUI` does not decide role. Material versions stay dynamic, never in stable sections.
- Volatile task state is a deduplicated `trellis-task-state` custom message, not a changing system section. Role task materials live in the dispatch prompt, not a duplicate system section.
- `loadContext()` caches promises for 1500 ms keyed by root/key. Active-task promise/absence cache lasts 10000 ms; a bash result mentioning `task.py` invalidates it. These are runtime caches, not material caches.
- `loadWorkflow()` reparses by mtime, separates the stable head before the first state block, and filters platform blocks that omit Pi from that head. State-block bodies are collected separately without the same platform filtering. It retains up to 14000 head characters plus a truncation notice; the final rendered section adds explanatory text. Detailed phases remain on-demand. Display mode does not change injection.
- Shutdown clears current identity's key/binding/role memo, stable sections and last sent state, and clears UI. Do not claim every module cache is cleared.

## Ordinary Agent Boundary and Verification

The `tool_call` hook only alters ordinary `Agent` calls for the three Trellis roles. It blocks temporary `isolation: worktree`, managed target markers and bound-task ordinary calls before spawn. Unbound allowed calls receive fresh materials; no task or loading failure strips success markers and retains visible fallback. Non-Trellis read-only exploration is unchanged. Third-party RPC/workflow launches are not intercepted by this hook; direct RPC callers must assemble materials explicitly.

`assembleDispatchPrompt()` owns optional managed revision/source/target fingerprint header lines, stripping caller-supplied material fact lines before rendering. Ordinary calls remain unversioned. These facts are tracing, not a success marker or approval. `parseDispatchFacts()` still reads task/context/role from the first contiguous header.

Run `tests/task-context.test.mjs` for path/UTF-8/budget/marker cases, `tests/worktree-protocol.test.mjs` for role/cache/protocol discovery, and `tests/agent-context-integration.test.mjs` for session/injection behavior. Distinct-key tests require an unpinned **subprocess** environment; see [Quality Guidelines](quality-guidelines.md). Do not infer automatic agent spawning or loading all specs from a manifest, pointer, or workflow breadcrumb.
