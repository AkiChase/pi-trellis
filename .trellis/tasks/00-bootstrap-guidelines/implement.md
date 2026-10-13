# Spec Bootstrap Implementation Plan

## Phase Gate
- [x] User approved reuse of the existing bootstrap task for planning.
- [x] Replace template PRD; write design, implementation plan and initial evidence notes.
- [x] Present final planning summary and obtain fresh implementation approval (user: “开始吧”).
- [x] After approval, validate manifests and bind the task to this session with `python3 ./.trellis/scripts/task.py start 00-bootstrap-guidelines`.

Do not treat the task's initialization-time `in_progress` status as implementation approval. Do not create another task or dispatch implement/check during planning.

## Execution Checklist
1. [x] Read the bootstrap/before-dev guidance and relevant source/tests completely (implement-agent evidence in `research/source-review-findings.md`). If Pi API details need confirmation, consult installed Pi documentation; document only verified APIs.
2. [x] Record the pre-edit spec contents under this task's `research/` for narrow rollback; capture git status and enumerate task JSONL references.
3. [x] Verify extension/session/context rules against `extensions/trellis.ts`, `lib/task-context.ts` and context/integration tests.
4. [x] Verify worktree/config/binding/preparation/RPC/execution/cleanup rules against every corresponding library and focused tests.
5. [x] Verify installation/patch/agent-sync rules against scripts, provenance, baseline manifest, deployment implementation and tests.
6. [x] Write the proposed extension/scripts layer documents and indexes. Reference actual paths/symbols and concise examples; describe reality, not aspirational refactors.
7. [x] Rewrite shared guides, remove irrelevant upstream instructions and duplicate sections, then remove obsolete frontend scaffolds. Fix affected references if found.
8. [x] Review all new specs for contradictions, over-broad rules and missing verification evidence (independent report: `research/check-review.md`; 12 local corrections).
9. [x] Validate final layout, links, manifests, placeholder removal and permitted change scope; record actual results (`research/validation-results.md`).
10. [x] Report acceptance status and remaining limitations. Do not finish/archive, record session or commit until separately authorized; review automatic-commit configuration before any eventual lifecycle operation.

## Validation
- `python3 ./.trellis/scripts/task.py validate 00-bootstrap-guidelines`
- `python3 ./.trellis/scripts/get_context.py --mode packages`
- `git diff --check` (also inspect new untracked Markdown; git diff alone does not cover it).
- Scan spec Markdown for template fillers such as `To fill`, `To be filled`, `TODO: fill`, and empty headings; review matches manually to avoid flagging legitimate terminology.
- Verify Markdown relative links and repository-root evidence paths, and check task JSONL entries for deleted paths.
- Compare pre/post file content and git status: only this task's artifacts and `.trellis/spec/` may change during implementation.
- `npm test` is available for optional runtime regression confidence; if run, record Node version and results. Documentation structure/link validation remains the primary gate.
- There is no package lint/typecheck script. Do not fabricate one or equate Node's TypeScript execution with full type checking.
- Optional provider probe requires explicit `--host` and `--provider` paths; do not install dependencies, touch personal configuration or run it merely to fill a checklist.

## Rollback Points
- Before removing frontend templates: verify replacement coverage and retain exact pre-edit contents in task-local research.
- Before accepting final specs: restore only changed spec files if discovery/link checks fail; never delete unrelated untracked initialization files.
- Before task completion/archive: obtain separate permission and inspect `session_auto_commit` behavior. No automatic Git operation is part of this plan.
