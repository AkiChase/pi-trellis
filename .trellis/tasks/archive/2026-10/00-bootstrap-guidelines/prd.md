# Bootstrap pi-trellis Development Specs

## Goal
Replace initialization boilerplate with source-backed development guidance for pi-trellis, so future implementation and review follow this repository's actual contracts instead of Web frontend or Trellis upstream conventions.

## Background
- `package.json` defines one ESM Pi extension package, not a Web application or monorepo.
- Product code lives in `extensions/trellis.ts` and `lib/*.ts`; project tooling lives in `scripts/`; tests live in `tests/`.
- Initialization produced `.trellis/spec/frontend/` with unfilled component/hook/state-management templates.
- `.trellis/spec/guides/` includes upstream-only template registration, template synchronization and docs-site rules; the cross-layer guide contains duplicated sections.
- The existing bootstrap task was initialized as `in_progress` without a current-session binding. The user subsequently approved the final plan with “开始吧”; execution is now bound to this session.

## Requirements
- R1: Organize specs around the single package's actual extension/runtime and tooling boundaries; remove non-applicable frontend scaffolding.
- R2: Describe current behavior using verified source, tests and maintained project docs. Include concise examples, relevant anti-patterns and verification guidance.
- R3: Cover session/root isolation, task material loading, path containment, worktree preparation/dispatch/cleanup, configuration, and persisted state boundaries.
- R4: Cover installer and Python patch safety, agent synchronization/provenance, license boundaries and customized generated-file preservation.
- R5: Adapt shared thinking guides to local integration boundaries. Remove unrelated upstream paths, duplicate sections, unsupported commands and unsupported generic claims.
- R6: Keep index navigation and discovery consistent with the final file set. Explain role-specific JSONL context selection without claiming every task automatically spawns agents or loads every spec.
- R7: Record available validation commands accurately; distinguish ordinary tests from optional real-host/provider checks. Do not invent lint/typecheck scripts or claim unrun checks passed.

## Out of Scope
- Product source, bundled agent documents, installer behavior, dependencies or package metadata changes.
- Global Trellis/Pi installations, provider modifications, executing installation or applying project script patches.
- Workflow/skill rewrites, automatic commits, task archive/session recording, worktree creation or cleanup.
- Turning existing technical debt into new mandatory architecture or refactoring requirements.

## Acceptance Criteria
- [x] AC1 (R1): Spec discovery reports meaningful local layers and no obsolete frontend layer.
- [x] AC2 (R2–R4): Important guidance cites existing files and relevant symbols/tests; examples reflect the current implementation.
- [x] AC3 (R5): No template-only instructions, duplicate sections, unfilled headings or fictional project paths remain.
- [x] AC4 (R6): Indexes include applicability, Pre-Development Checklist, Quality Check and valid links; task JSONL references resolve.
- [x] AC5 (R7): Quality guidance distinguishes available, optional and unavailable checks; performed validation results are recorded honestly.
- [x] AC6: Implementation changes remain limited to this task's artifacts and `.trellis/spec/`; unrelated initialization and product files are preserved. Completion/archive/commit require separate authorization.

## Approval Boundary
Documentation implementation was approved by the user's “开始吧” message and the task is bound to this session. Independent review and final validation passed; evidence is recorded in `research/check-review.md` and `research/validation-results.md`. Completion/archive/commit still require separate authorization.
