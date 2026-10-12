# pi-trellis

A project-local [pi](https://pi.dev) extension for [Trellis](https://www.npmjs.com/package/@mindfoldhq/trellis) projects.

It replaces the pi adapter layer that `trellis init --pi` generates — 13 files, overwritten on every `trellis update` — with one installed package and three agent definitions you own.

## What it does

| | |
|---|---|
| **Task context injection** | Adds `session-overview` and `trellis-workflow` sections to the system prompt, plus a per-turn task-state message. The model knows the active task, its status, and the workflow breadcrumb without reading a single file. |
| **Task display** | A themed line above the editor: `▸ trellis · 00-bootstrap-guidelines · in_progress · prd ✓ design · impl ·`, refreshed when a session starts, when a turn ends, and immediately after any `task.py` call. Switch it to the footer chip or turn it off with `TRELLIS_PI_STATUS`. |
| **Session isolation** | Exports `TRELLIS_CONTEXT_ID` so concurrent pi sessions keep separate active tasks. Subagent sessions inherit the parent's id. |
| **Subagent context** | `trellis-implement`, `trellis-check` and `trellis-research` agent definitions, and an `Active task:` pointer prepended to every `trellis-*` dispatch. |
| **Skill bridge** | Points pi at the Trellis skills already on disk (`.claude/skills/trellis-*` and friends), which pi otherwise cannot see. No files are copied. |

What it deliberately does **not** do: implement subagents (that is [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents)' job), install anything globally, or write slash commands.

## Install

```bash
# 1. Trellis core + Claude Code skills, without the --pi adapter layer
trellis init --claude -u <your-name>

# 2. this extension
pi install -l --approve git:github.com/AkiChase/pi-trellis

# 3. first start asks for project trust — approve once
pi
```

That is the whole install. The repository also ships a script that does the
preflight `pi install` cannot — verifying pi, the Trellis version, python3 and
`.trellis/scripts/`, probing `get_context.py`, reporting which skill directory
will be bridged, and warning when the project also carries a generated
`trellis init --pi` adapter:

```bash
# instead of step 2
git clone --depth 1 https://github.com/AkiChase/pi-trellis /tmp/pi-trellis
/tmp/pi-trellis/scripts/install.sh

# or, after installing, from the copy pi cloned
.pi/git/github.com/AkiChase/pi-trellis/scripts/install.sh --check
```

| Flag | Effect |
|---|---|
| `--source <spec>` | What to install. Defaults to the git source; pass a path for a local checkout. |
| `--neutral-skills` | Also run `trellis init --codex` so Trellis writes platform-neutral skills to `.agents/skills/`, the directory pi discovers natively. Adds a `.codex/` directory. |
| `--check` | Run the checks only, install nothing. Use it to diagnose an existing project. |
| `--dry-run` | Print what would happen, change nothing. |

Uninstall:

```bash
pi uninstall -l git:github.com/AkiChase/pi-trellis
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

**pi cannot see Trellis skills, and this extension only works around it.** `trellis init` writes skills per platform; its default targets (`.claude/skills/`, `.cursor/skills/`) are not directories pi discovers. Nothing is vendored here — this repository contains no skill text. The bridge hands pi the `trellis-*` skills that your own Trellis install already wrote, from the first directory that exists:

1. `.agents/skills/` — pi finds these natively, so the bridge stays out of the way
2. `.claude/skills/`
3. `.cursor/skills/`

Falling back to 2 or 3 means the skill text was rendered for another platform: it refers to `/trellis:continue` and similar slash commands, **which do not exist in pi**. Read those as "follow the matching flow in `.trellis/workflow.md`". For neutral text instead, install with `--neutral-skills` (or run `trellis init --codex` yourself), which makes Trellis write `.agents/skills/` — at the cost of a `.codex/` directory.

**The workflow section is an excerpt.** Only the stable head of `.trellis/workflow.md` is injected (about 10 KB), with platform blocks that do not name Pi removed. Per-phase detail is loaded on demand via `get_context.py --mode phase --step <N.N>`; the model is told so.

**Headless sessions get less.** Subagent sessions and `pi -p` skip the workflow excerpt, since it is the largest block and the least useful to a single-purpose agent. Set `TRELLIS_PI_CONTEXT=full` to inject everything anyway, or `compact` to force the small payload in an interactive session.

## Environment variables

| Variable | Effect |
|---|---|
| `TRELLIS_CONTEXT_ID` | Pins the Trellis session key. Set it yourself to share one active task across several pi sessions; otherwise it is derived from the session file, or from the project root for unsaved sessions. |
| `TRELLIS_PYTHON` | Python interpreter. Defaults to `python3` (`python` on Windows). |
| `TRELLIS_PI_CONTEXT` | `full` or `compact` to override the headless heuristic. |
| `TRELLIS_PI_STATUS` | `widget` (default), `status`, or `off`. See below. |

## Where the task display goes

The default is a **widget**: its own row above the editor, drawn with your
theme's colors, with the task name in full and the planning artifacts beside
it. Status colors carry meaning — `planning` is warning, `in_progress` is
accent, `completed` is success, `task_error` is error.

`TRELLIS_PI_STATUS=status` moves it into the footer instead
(`trellis: 00-bootstr… ▸ in_progress`). That is more compact but shares one
line with every other extension that calls `setStatus()`: pi joins those
statuses with a space, sorts them alphabetically by key, and truncates the
whole line to the terminal width. Keys never collide — each extension owns its
own — but width is finite, and `trellis` sorts late enough to be among the
first to get cut. The widget has no such competition: widgets are keyed and
stacked, up to ten lines across all extensions.

`TRELLIS_PI_STATUS=off` draws nothing. Context injection is unaffected either
way — the display is just a display.

## Design notes

- **`trellis update` never touches `.pi/`.** Trellis detects configured platforms from its own hash manifest, not from directories that happen to exist. A project that never ran `trellis init --pi` has no `.pi/*` entries in that manifest, so pi is never considered configured.
- **Prompt sections are memoized for the process lifetime.** A system-prompt section that changes between turns invalidates the provider's prefix cache from byte zero. Volatile state travels as a custom message instead, and only when it actually changed.
- **Subagent sessions load this extension too**, and their injection works the same way — pi-subagents' `systemPromptOverride` only occupies the `preamble` section. That is why a `trellis-*` dispatch gets a one-line `Active task:` pointer rather than a copy of the task artifacts: the child assembles its own context, and duplicating it would bill the same tokens twice.
- **Everything degrades silently.** A missing `.trellis/`, a corrupt session pointer, a python that will not spawn, a Trellis version whose JSON shape moved — each costs context or the footer entry, never the session. The one thing that is not silent is a `get_context.py` call that stops returning usable JSON: that warns once, because silent degradation there would look like a working setup.

## License

MIT. This extension contains no Trellis source code; it integrates through the `task.py` / `get_context.py` CLIs, the `TRELLIS_CONTEXT_ID` variable, and documented paths under `.trellis/`.
