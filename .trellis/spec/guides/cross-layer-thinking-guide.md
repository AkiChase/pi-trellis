# Cross-Layer Boundary Thinking Guide

## Applicability

Use this guide for changes spanning Pi events, Python CLI/pointers, JSONL/artifacts, worktree persistence, provider events or generated agent documents. A boundary matters even when only two files change. This package does not have upstream Web/API/database or docs-site release trees to maintain.

## Map the Current Data Flow

| Flow | Contract owner and evidence |
| --- | --- |
| Event cwd/session → context key → scoped Python/bash → session pointer → task-state/UI | `extensions/trellis.ts:session`, `contextKey`, `resolveActiveTask`, `inheritDispatchTask`; `tests/agent-context-integration.test.mjs` |
| Role/task/execution root → JSONL/artifacts → bounded context → owned dispatch block → child fallback | `lib/task-context.ts`; `tests/task-context.test.mjs` |
| Source task/config → Git plan → authoritative binding + target marker → task-only prepare → target pointer/readiness | `runtime/pi_trellis_worktree/{manager,records,materials}.py`, shared host persistence in `lib/bindings.ts`; worktree/preparation tests |
| Ready target → source-host role config → lease → public spawn cwd/off → provider ID/terminal event → snapshot/status | `lib/subagent-rpc.ts`, `lib/executions.ts`; `tests/dispatch.test.mjs` |
| Approved clean target + preserving reference → ancestry/ignored-risk preview → ordinary Git removal → unbind | `runtime/pi_trellis_worktree/manager.py:remove`; cleanup cases in `tests/preparation.test.mjs` |
| Fixed upstream Claude docs → adaptation/full hashes → approved resource publication | `scripts/sync-agents.mjs`, `docs/agent-baseline.json`, `lib/initialization/{engine,resources,adoption}.ts`; agent document/initialization tests |
| Explicit package install → confirmed initialization/resource publication | `scripts/install.sh`, `lib/initialization/`; installer/initialization tests; native-only development deployment remains separate |
| Authorized historical patch tooling → focused active-task patch | `scripts/patch-trellis.py`; `tests/trellis-patches.test.mjs`; not part of current installation |

For each changed arrow record input origin/shape, validation, authoritative state, side effects, failure output and verification. Source root, target root, Pi session identity, context ID, task path and binding ID are distinct facts; do not substitute one for another.

## Boundary Questions Before Editing

### Identity and Provenance

- Does a result belong to the current session/root, or merely name an existing task? CLI acceptance requires successful exit, exact `session:<key>` provenance and no stale/error.
- Is dispatch task data a first-line fact or a quoted phrase? Does a child bind its own pointer before any failure can expose a parent pin?
- Can finish/invalidation remove a task without an in-memory header override resurrecting it?

### Material and Path Ownership

- Is the file task-local, baseline spec/code, user configuration or runtime state? Preparation copies selected task material, not source code/specs/scripts.
- Are lexical and realpath boundaries both checked? General task-store symlink support must not authorize external runtime or managed-target stores.
- Does a diagnostic/byte prefix omit the complete marker and tell the child what still needs reading? Quoted markers cannot assert injection.

### Persisted State and External Effects

- Which record is authoritative after partial source/target publication? `sameIdentity()` compares immutable identity while source owns preparation state.
- Is a preview really no-write, and does confirmation recheck under lock? Preview is not a stored reservation; a default HEAD can move before confirmation.
- Can copies/hooks or a spawned child exist when the caller receives an error? Retain error/unknown records and code; do not turn uncertain startup into stopped/success.
- Does stop merely request provider cancellation, or is a terminal event actually observed? A live-owner lease is not recoverable by assumption.
- Is a completed check just execution completion/freshness evidence, or has its report been accepted? Later changes to fingerprinted inputs must make snapshot evidence stale; excluded paths and large-file metadata limits prevent a universal change-detection claim.

### Generated Documents and Scripts

- Is a change in the adaptation source, bundled output or user-customized deployed copy? Preserve customizations and reject incompatible config rather than overwriting it.
- Are fixed source version/integrity, full hashes and output changes reviewed together? The sync script's stamped version does not authenticate arbitrary input.
- Do check/dry-run flag combinations remain read-only? Are original bytes/mode retained for a rejected patch?
- Does a project Trellis update replace a patched script? Diagnose/reapply explicitly; do not invent an upstream template-sync workflow inside this repository.

## Validation Placement

Prefer shared validators near the owner, but **do not** replace all boundary revalidation with “validate once at entry.” Files, branch, pointer, execution occupancy and symlink ancestors can change between preview and mutation. Keep the current under-lock/pre-write checks that protect those races. Conversely, cosmetic UI code must not redefine task ownership or silently turn failed readiness into source fallback.

Existing code contains narrow assertions and explicit guarded branches; these guides do not require an unrelated universal decoder/reducer refactor. Change the smallest contract owner and prove its callers retain their behavior.

## After-Change Checklist

- Trace every route using the changed contract: ordinary Agent vs managed RPC, source vs child, preview vs confirm, new binding vs reuse, check vs normal install, bundled vs customized agent.
- Add focused malformed/missing/stale/conflicting inputs and preservation assertions for the relevant boundary.
- Confirm host **actual cwd** matches source when testing managed dispatch, not just prompt text or `ctx.cwd`.
- Keep the default mocked-fixture suite separate from the optional installed host/provider offline probe; neither proves real-model rule compliance or OS sandboxing.
- Review maintained README/provenance/spec claims against current runtime; label historical wording rather than making it a new requirement.
- Record actual final commands/results and any untested boundary. Use [Runtime Quality](../extension/quality-guidelines.md), [Session and Context](../extension/session-and-context.md), [Worktree Lifecycle](../extension/worktree-lifecycle.md) and [Script Specs](../scripts/index.md).
