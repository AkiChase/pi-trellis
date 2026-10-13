# Installation and Project-Local Patching

## Applicability and Ownership

`scripts/install.sh` runs from the user's project cwd. Its own directory locates `patch-trellis.py`; `PROJECT_ROOT` is the invoking project's physical cwd, not the package checkout. `pi install` alone installs the extension but does not apply the Python patch. The repository installer defaults to patching the project's `.trellis/scripts/common/active_task.py`, then installing project-locally. Do not patch global Trellis, silently edit ignores, or introduce patching into worktree preparation.

## Installer Modes

The script uses `set -euo pipefail`, argument-array execution and no `eval`. Default source is `git:github.com/AkiChase/pi-trellis`; local source paths are resolved before installation.

| Option | Actual behavior |
| --- | --- |
| `--source <spec>` / `--source=<spec>` | Select package source for `pi install -l --approve` |
| `--neutral-skills` | In normal install, run `trellis init --codex`; this writes `.agents/skills/` and adds `.codex/` |
| `--no-patch` | Skip default project-local safety patch; extension-side provenance checks remain active |
| `--check` | Preflight/report only; patch checker may report missing/incompatible patch as a warning; no install/init/patch writes |
| `--dry-run` | Preflight plus print mutating commands and patch preview; no install/init/patch writes |

Preflight requires `pi`, `trellis`, interpreter (`TRELLIS_PYTHON` or `python3`), `.trellis/`, `task.py` and `get_context.py`. It rejects numeric Trellis 0.x versions below 0.6, warns for a newer major, and warns/skips range checking for an unparseable version. The `get_context.py --mode default --json` preflight checks successful exit, not JSON parsing; do not overstate its printed success label. Runtime parses returned context separately.

The installer warns about a generated `.pi/extensions/trellis/index.ts` duplicate adapter but does not delete it. Skills are reported in existing-root priority `.agents/skills`, `.claude/skills`, `.cursor/skills`; only neutral-skills normal install generates them. `--check --neutral-skills` must not initialize. The package installer does not write fictional Pi slash commands or install a provider globally.

Normal install applies the patch first and then runs `pi install -l --approve <source>`. This is not a transaction: an installation failure does not undo a successful project patch. Project trust still gates loading. Uninstall does not undo patched Python; after a Trellis update replaces that script, check/reapply through an approved installation workflow. A prepared worktree uses its committed target scripts unchanged.

## Python Patch Contract

`scripts/patch-trellis.py` uses only the Python standard library. Its four `REPLACEMENTS` target known `active_task.py` text:

1. Set `allow_single_session_fallback` default to false.
2. Update resolution documentation.
3. For an identified session, return its own active/stale result or no task immediately; never infer another session even with fallback explicitly true.
4. Clear only the resolved current key's pointer, returning its prior task only after successful unlink. Missing pointer/no identity yields no task; other unlink failures raise rather than authorize finish hooks.

Single-session inference is an explicit read-only compatibility option only for unidentified callers. An identified stale task remains local and marked stale; do not silently replace it with a foreign valid task. Repeated finish calls must not repeat a previously cleared task's `after_finish` authorization.

Exact-match discipline in `replace_block()`:

```python
if text.count(before) == 1 and after not in text:
    return text.replace(before, after, 1)
if before not in text and text.count(after) == 1:
    return text
raise RuntimeError(f"Cannot safely apply Trellis patch: {name}")
```

This permits idempotent already-applied blocks and rejects unknown/ambiguous structures. It is a focused textual patch, not a whole-module AST/semantic validation. Do not claim it supports arbitrary upstream drift.

The target must be a local regular file: reject final-file symlinks and any resolved path outside root. Decode UTF-8, apply all replacements in memory, and `compile(..., "exec")` before writing. If unchanged, return success. `--check` returns 1 for a required patch, 0 when applied; incompatible inputs fail. `--dry-run` validates and previews without writing.

Mutation uses a same-directory temporary file, writes/flushes, preserves permission bits with `os.fchmod`, rechecks that the target is not now a symlink and that original bytes are unchanged, then `os.replace()`. Before replacement, a failure cleans the temporary file without this patch overwriting the target; it does not undo another writer's changes. This is atomic replacement with a content recheck, not a concurrent-writer lock, full ancestor-race defense or power-loss durability guarantee.

## Regression and Review Checklist

Evidence: `tests/trellis-patches.test.mjs` imports patch constants to construct a disposable known-shape Python fixture and uses fake `pi`/`trellis` binaries for installer mode tests.

- Check/dry-run leave original bytes unchanged; normal patch changes them; `--no-patch` does not.
- Reapplication is identical and preserves mode.
- Identified missing/empty pointer never borrows another; unidentified fallback requires opt-in; stale stays on the current key.
- Repeated finish clears only the current session; no identity/missing pointer cannot authorize hooks, and forced unlink failure is not reported as success.
- Unknown anchors and symlink targets fail without overwriting original/external files.
- When changing installer flag combinations, test read-only combinations explicitly; do not infer all combinations from existing standalone-option tests.

Focused command: `node --test tests/trellis-patches.test.mjs`. `bash -n scripts/install.sh` checks syntax only; it is not a linter or installation test. Never execute an actual install/patch in a user's project solely for verification without permission. See [Quality Guidelines](../extension/quality-guidelines.md).
