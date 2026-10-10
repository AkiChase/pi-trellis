# pi-trellis

A project-local [pi](https://pi.dev) extension for [Trellis](https://www.npmjs.com/package/@mindfoldhq/trellis) projects.

It replaces the pi adapter layer that `trellis init --pi` generates — 13 files, overwritten on every `trellis update` — with one installed package and three agent definitions you own.

## What it does

| | |
|---|---|
| **Task context injection** | Adds `session-overview` and `trellis-workflow` sections to the system prompt, plus a per-turn task-state message. The model knows the active task, its status, and the workflow breadcrumb without reading a single file. |
| **Footer status** | `trellis: 00-bootstrap ▸ in_progress`, updated when a session starts, when a turn ends, and immediately after any `task.py` call. |
| **Session isolation** | Exports `TRELLIS_CONTEXT_ID` so concurrent pi sessions keep separate active tasks. Subagent sessions inherit the parent's id. |
| **Subagent context** | `trellis-implement`, `trellis-check` and `trellis-research` agent definitions, and an `Active task:` pointer prepended to every `trellis-*` dispatch. |
| **Skill bridge** | Points pi at the Trellis skills already on disk (`.claude/skills/trellis-*` and friends), which pi otherwise cannot see. No files are copied. |

What it deliberately does **not** do: implement subagents (that is [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents)' job), install anything globally, or write slash commands.

## Install

```bash
# 1. Trellis core, without the --pi adapter layer
trellis init -u <your-name>

# 2. this extension, project-locally
pi install -l git:github.com/<you>/pi-trellis

# 3. first start asks for project trust — approve once
pi
```

Uninstall:

```bash
pi uninstall -l git:github.com/<you>/pi-trellis
rm -rf .pi/agents/trellis-*.md .pi/.pi-trellis-hashes.json
```

### Requirements

- pi ≥ 1.1.0
- Trellis ≥ 0.6 (uses `task.py` / `get_context.py` and `.trellis/.runtime/sessions/`)
- python3 on `PATH` (override with `TRELLIS_PYTHON`)
- a subagent extension for the `trellis-*` agents — `pi install @tintinweb/pi-subagents`. Without one, everything else still works; you get one warning at startup.

Verified on macOS and Linux. Windows is untested.

## Agent definitions and `.gitignore`

On first start the extension writes `trellis-implement.md`, `trellis-check.md` and `trellis-research.md` into `.pi/agents/`, then records their hashes in `.pi/.pi-trellis-hashes.json`.

**Edit those files freely.** A file whose content no longer matches the recorded hash is never overwritten — that is the supported way to customize an agent for your project. A file you have not touched is updated when the package version changes.

Whether they belong in git is your call:

- **Commit them** to share agent definitions with your team. Package upgrades will show up as diffs.
- **Ignore them** (`/.pi/agents/trellis-*.md`, `/.pi/.pi-trellis-hashes.json`) and let everyone generate their own. Everyone then needs the package installed.

## Known limitations

**pi cannot see Trellis skills, and this extension only works around it.** `trellis init` writes skills per platform; its default targets (`.claude/skills/`, `.cursor/skills/`) are not directories pi discovers. The skill bridge hands pi the `trellis-*` skills from the first directory that exists, in this order:

1. `.agents/skills/` — pi finds these natively, so the bridge stays out of the way
2. `.claude/skills/`
3. `.cursor/skills/`

Falling back to 2 or 3 means the skill text was rendered for another platform: it refers to `/trellis:continue` and similar slash commands, **which do not exist in pi**. Read those as "follow the matching flow in `.trellis/workflow.md`". For byte-neutral skill text instead, run `trellis init -u <name> --codex`, which writes `.agents/skills/` — at the cost of a `.codex/` directory.

**The workflow section is an excerpt.** Only the stable head of `.trellis/workflow.md` is injected (about 10 KB), with platform blocks that do not name Pi removed. Per-phase detail is loaded on demand via `get_context.py --mode phase --step <N.N>`; the model is told so.

**Headless sessions get less.** Subagent sessions and `pi -p` skip the workflow excerpt, since it is the largest block and the least useful to a single-purpose agent. Set `TRELLIS_PI_CONTEXT=full` to inject everything anyway, or `compact` to force the small payload in an interactive session.

## Environment variables

| Variable | Effect |
|---|---|
| `TRELLIS_CONTEXT_ID` | Pins the Trellis session key. Set it yourself to share one active task across several pi sessions; otherwise it is derived from the session file, or from the project root for unsaved sessions. |
| `TRELLIS_PYTHON` | Python interpreter. Defaults to `python3` (`python` on Windows). |
| `TRELLIS_PI_CONTEXT` | `full` or `compact` to override the headless heuristic. |

## Design notes

- **`trellis update` never touches `.pi/`.** Trellis detects configured platforms from its own hash manifest, not from directories that happen to exist. A project that never ran `trellis init --pi` has no `.pi/*` entries in that manifest, so pi is never considered configured.
- **Prompt sections are memoized for the process lifetime.** A system-prompt section that changes between turns invalidates the provider's prefix cache from byte zero. Volatile state travels as a custom message instead, and only when it actually changed.
- **Subagent sessions load this extension too**, and their injection works the same way — pi-subagents' `systemPromptOverride` only occupies the `preamble` section. That is why a `trellis-*` dispatch gets a one-line `Active task:` pointer rather than a copy of the task artifacts: the child assembles its own context, and duplicating it would bill the same tokens twice.
- **Everything degrades silently.** A missing `.trellis/`, a corrupt session pointer, a python that will not spawn, a Trellis version whose JSON shape moved — each costs context or the footer entry, never the session. The one thing that is not silent is a `get_context.py` call that stops returning usable JSON: that warns once, because silent degradation there would look like a working setup.

## License

MIT. This extension contains no Trellis source code; it integrates through the `task.py` / `get_context.py` CLIs, the `TRELLIS_CONTEXT_ID` variable, and documented paths under `.trellis/`.
