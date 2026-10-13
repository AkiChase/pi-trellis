# Installation and Project Resource Ownership

## Supported installation

`pi install -l --approve git:github.com/AkiChase/pi-trellis` installs and registers the Pi package. Bundled skills load from the package manifest; project runtime and documents are created only by the explicitly confirmed `/trellis-init` command. No global Trellis CLI or upstream init/update is required.

`scripts/install.sh` is a thin installer wrapper. It supports source/check/dry-run/help, requires only Pi, and never runs Python project scripts, applies patches, deploys runtime or generates skills. Check does not install; dry-run prints argv; obsolete neutral-skills/no-patch fail with guidance. Initialization separately requires the supported Python version. Installation is not initialization, and project trust still gates package loading.

## Initialization and manifest

`lib/initialization/engine.ts` owns inspect/plan/apply and resource validation; `command.ts` owns native English menus. It is available before any project scripts exist. Usernames can be historical candidates, a Git suggestion or explicit input; existing identity/history is preserved. No frontend/backend spec or package detection, remote template market, channel or mem capability is generated.

Project `.trellis/.pi-trellis.json` schema 2 separates exact executable resources (`files`: fixed runtime and role set) from editable template provenance (`templates`: the known template routes). Runtime hashes/source/mode/release identity remain strict. Fresh init records package-default templates; preserved-project records describe actual retained fingerprints or explicit absence, not package installation. Template provenance never authorizes executable files or recovery outputs. Source baseline is `resources/runtime-baseline.json`; do not conflate its schema with the project manifest.

Unknown files and customized root blocks are never overwritten by init. Incomplete operations block runtime use; recovery reconstructs canonical package/skeleton outputs and checks original ownership, not just an unauthenticated planHash. Publication is per-file atomic, not an all-files transaction. No init runs hooks, selects active tasks, installs dependencies or commits Git.

## Source and deployment

`runtime/` is package source; `.trellis/scripts/` is project deployment. Runtime provenance and source/import closure are documented in [runtime baseline](../../../docs/runtime-baseline.md). The native worktree owner remains `runtime/pi_trellis_worktree/`; do not duplicate its algorithms. Persistent targets use their committed compatible baseline, never source uncommitted script copying or automatic installation in prepare.

`scripts/deploy-worktree.py` remains a development utility for native files only; it is not the supported full-project initializer. `scripts/patch-trellis.py` remains historical focused patch tooling, not a step in the current installer. Do not instruct users to run either to bypass the distribution manifest.

This repository was migrated explicitly after verifying the old scaffold and skills. Its existing config/workflow/spec/workspace were preserved with honest project-snapshot provenance; only selected current instruction references changed. Old `.version`/`.template-hashes.json` and extra unused source files are inactive upstream evidence, not authority for future `trellis update`. Other repositories have no public legacy migration API.

## Workflow and Skill Resource Contracts

`resources/templates/workflow.md` supplies fresh-project defaults; existing project `.trellis/workflow.md` remains user-owned and is not silently replaced. Implementation and review executors are selected independently, including direct main implementation followed by independent check. Keep phase headings/state markers and role recursion guards intact.

When changing this policy, review related bundled skills so boundary boilerplate and continue/brainstorm routing do not restore mandatory paired dispatch. Keep execution/review/submission policy in workflow; skills carry operation-specific guidance and short routing references, not duplicated policy tables. Implementation approval includes scoped local stage commits unless explicitly opted out; push/history rewriting need explicit approval. Finish-work handles accepted lifecycle actions under existing authorization, not product commit scheduling.

Curate JSONL for dispatched roles only; the current CLI still gates both empty seeded manifests unless `start --allow-empty-context` is explicit, and `validate` continues reporting empty manifests. Document this limitation rather than inventing runtime support or fake context entries.

Update only adapted output SHA-256 fields in `resources/template-baseline.json` and `resources/skill-baseline.json`; preserve source evidence and license metadata. `tests/workflow-policy.test.mjs` covers policy text, real phase extraction and default rejection vs explicit direct/check-only start. Resource hashes and initialization are covered by skill-resource/initialization tests. These checks do not prove real-model compliance.

## Verification

Use real complete runtime copies in disposable fixtures, not patch constants alone. Tests cover inspect/cancel no writes, malformed/forged manifests and recovery plans, historical identity, exact journal/archive scope, symlink/path escape, source hashes and Pi resource filters. Installer tests confirm Pi-only calls and no script mutation. `git diff --check` must include staged/untracked content where applicable. See [quality guidelines](../extension/quality-guidelines.md) for the actual host preload and limitations. Never install or mutate a real project merely to fill a test checklist.
