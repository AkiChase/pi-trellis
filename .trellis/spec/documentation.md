# Documentation Maintenance

## Language and Placement

Project `.trellis/spec/` documents are English. Root `docs/` Markdown is Chinese; identifiers, commands, code, hashes and quoted upstream originals stay unchanged. README keeps its existing language and overview role. Task plans/research are Chinese. JSON provenance manifests are data, not translation targets. Project rules belong here, never in generated runtime, bundled roles or package skill defaults.

| Location | Responsibility |
| --- | --- |
| `README.md` | Overview, installation, concise behavior/configuration summaries and detail links |
| `docs/` | Feature usage, commands, configuration, design explanations and provenance |
| `docs/testing/` | Reusable testing procedures, including isolated tmux and installed-provider probes |
| `.trellis/spec/` | How to develop/test and evidence-backed constraints future changes must preserve |
| `.trellis/tasks/` | Requirements, execution plans, historical reports, logs and acceptance evidence |
| `docs/plans/` | Retained historical designs, explicitly labelled and linked to current documentation |

A new feature does not require a spec file or chapter. Add a rule only for a reusable development or architecture constraint backed by source/tests. Internal record schemas, safety invariants and cross-language contracts may remain in specs; full feature walkthroughs and repeated command manuals belong in docs. Small features may share a concise page rather than an artificial standalone document.

## Maintenance Checklist

- Read the full owning sources/tests before documenting behavior. Search hits locate evidence; historical prose is not the authority for current behavior.
- When behavior, commands, keys or configuration change, update the owning Chinese document and affected README summaries. Do not duplicate every detail in README.
- When test procedures change, update `docs/testing/`; update the quality spec only when the requirement itself changes. Preserve the distinction between fixtures, actual host/terminal behavior and online model quality.
- When source/resources change, review the authoritative manifests and license records with their owners. Never regenerate/deploy resources merely to repair a project-doc link.
- Classify paragraphs before moving them: keep effective safety/development contracts in specs, consolidate current explanations in docs, retain execution evidence in tasks. Do not move obsolete prose verbatim or silently erase valid negative-case constraints.
- Update indexes and affected active Markdown/JSONL references when paths change. Preserve archived evidence rather than rewriting its historical assertions en masse. Historical plans must point to current instructions and must not claim their test counts are fresh results.
- Keep credentials and personal state out of docs. Preserve unrelated parallel edits and original vendor/license text.

## Verification

Check local relative targets, affected anchors, repository-root evidence paths, language, current command/config claims and whitespace, including untracked files. Run `get_context.py --mode packages` to verify layer discovery and inspect affected task JSONL references. Intentionally unused empty manifests are not full validation success.

Documentation-only checks do not authorize installation, personal sync, reload, real tmux/provider runs or lifecycle changes. Record exact checks and PASS/FAIL/NOT_RUN limits; historical evidence is not a fresh run. Follow [Quality Guidelines](extension/quality-guidelines.md), [tmux procedures](../../docs/testing/tmux.md) and [provider procedures](../../docs/testing/provider.md).
