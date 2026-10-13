## Self-Check Complete

### Files Checked

Read all 11 final `.trellis/spec/{extension,scripts,guides}/*.md` documents completely, plus injected task artifacts and `research/source-review-findings.md`. Independently read all of `extensions/trellis.ts`, all 10 `lib/*.ts` modules, the three source scripts, all seven default test files, optional provider probe, package metadata, README and provenance manifest/document. Inspected staged/unstaged/untracked scope; no review base was supplied, so committed history was not reviewed as a change set.

### Issues Found and Fixed

12 local documentation corrections across seven spec files:

1. `extension/architecture.md:41`, `extension/session-and-context.md:49`, `extension/worktree-lifecycle.md:19,37` — Distinguished external source task stores from local managed-target/pi-trellis runtime paths; described lexical/resolved-store checks rather than implying every ancestor symlink is explicitly authenticated.
2. `extension/session-and-context.md:25` — Header parser scans matching facts until a blank line even across unmatched nonblank lines; first-line formatting is not origin authentication. Verified with a pure assertion.
3. `extension/session-and-context.md:72` — Platform filtering applies to workflow head, not separately collected state bodies; 14000-character prefix also gains truncation/rendering text.
4. `extension/worktree-lifecycle.md:7` — Source lock covers confirmed management/dispatch reservations, not stop RPC or terminal-event record writes.
5. `extension/worktree-lifecycle.md:23` — New create/bind validates source task records; status/reuse need not reread them.
6. `extension/worktree-lifecycle.md:29` — Retained failures preserve whatever directory/branch exists; reservation failure may leave only a record.
7. `extension/worktree-lifecycle.md:37` — Selected research directories may copy whole subtrees; baseline-reference comparison uses current target files, not Git tree objects.
8. `extension/worktree-lifecycle.md:74` — Recovery's under-lock recheck is owner liveness, not a complete repeat of identity/binding validation.
9. `extension/worktree-lifecycle.md:76`, `guides/cross-layer-thinking-guide.md:41` — Only fingerprinted changes necessarily stale snapshots; excluded paths/large-file metadata prevent universal detection.
10. `scripts/installation-and-patching.md:50` — Pre-replacement failure does not overwrite the target or undo another writer; content recheck is not full ancestor-race protection.
11. `guides/code-reuse-thinking-guide.md:37` — Full hash manifest records a checkable relationship, not independent integrity proof without source evidence.
12. `scripts/agent-sync-and-provenance.md:40` — Deployment is a content/hash preservation policy with direct writes, not transactional/symlink-contained/concurrent-edit-safe deployment.

All corrections document existing code, not new architecture requirements. Re-read edited documents and checked cross-document consistency after fixes.

### Issues Not Fixed

No remaining blocking spec defect identified. Existing implementation limits above remain deliberately unchanged: this task does not authorize product fixes. Historical README/provenance simplifications were not edited; code/tests prevail. Main-owned link/scope/manifests/discovery validation must be rerun after these documentation edits.

### Verification Results

- Independent source-contract review: **Passed after fixes**; applicable indexes, JSONL selection, real commands, marker/fallback, preview/confirmation, cwd/RPC/occupancy, patch/deployment and mixed-license boundaries reviewed. No irrelevant upstream operational instructions or duplicate sections found.
- `bash -n scripts/install.sh`: **Passed** (syntax only, not lint).
- `git diff --check`: **Passed**; tracked diff alone does not cover new specs.
- Inline Python check over all 11 spec files: **Passed** for count, trailing whitespace, duplicate and empty headings.
- `node --input-type=module` inline pure assertions: **Passed** for header parsing across unmatched nonblank lines, quoted first-line rejection and partial-context marker stripping. No fixture/files or host environment changed.
- Full tests: **Not rerun**, per dispatch. Main's `validation-results.md` records raw pinned `npm test` **65/67**, clean `env -u TRELLIS_CONTEXT_ID npm test` **67/67**, Node **v24.14.1**; this is attributed evidence, not a check-agent execution claim.
- Package lint/typecheck: **Unavailable**; no full static type check performed.
- Optional installed-host/provider probe and source regeneration/check: **Not run**.

### Summary

Checked all 11 specs, fixed 12 documentation issues across seven files, no blocking spec issues remain. Writes were confined to `.trellis/spec/` and this report. No product/generated/config/agent/planning changes, lifecycle operations, test-suite rerun or Git mutations. Final automated documentation gate remains main-owned.
