#!/usr/bin/env bash
#
# pi-trellis installer.
#
# Does the preflight that `pi install` cannot: checks the toolchain, checks the
# Trellis version against what this extension's CLI assumptions require, and
# reports which skill directory will end up bridged into pi.
#
# Usage:  ./scripts/install.sh [options]
#
#   --source <spec>     What to hand `pi install -l`. Defaults to the git
#                       source; pass `.` (or any path) to install a local
#                       checkout instead.
#   --neutral-skills    Also run `trellis init --codex`, which makes Trellis
#                       write platform-neutral skills to .agents/skills/ —
#                       the directory pi discovers natively. Adds a .codex/
#                       directory to the project.
#   --no-patch         Skip the default project-local Trellis safety patch.
#   --check             Run the checks only; do not install anything. Useful
#                       after the fact to diagnose a project.
#   --dry-run           Print what would happen, change nothing.
#   -h, --help          This text.

set -euo pipefail

SOURCE="git:github.com/AkiChase/pi-trellis"
NEUTRAL_SKILLS=0
DRY_RUN=0
CHECK_ONLY=0
PATCH_TRELLIS=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(pwd -P)"

MIN_TRELLIS_MAJOR=0
MIN_TRELLIS_MINOR=6

red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
amber() { printf '\033[0;33m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

die() { red "✗ $*"; exit 1; }

run() {
	if [ "$DRY_RUN" = "1" ]; then
		dim "    would run: $*"
	else
		"$@"
	fi
}

while [ $# -gt 0 ]; do
	case "$1" in
		--source) SOURCE="${2:?--source needs a value}"; shift 2 ;;
		--source=*) SOURCE="${1#*=}"; shift ;;
		--neutral-skills) NEUTRAL_SKILLS=1; shift ;;
		--no-patch) PATCH_TRELLIS=0; shift ;;
		--check) CHECK_ONLY=1; shift ;;
		--dry-run) DRY_RUN=1; shift ;;
		-h|--help) awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"; exit 0 ;;
		*) die "unknown option: $1 (try --help)" ;;
	esac
done

# A bare path is a local install; prefix it so pi reads it as one.
case "$SOURCE" in
	git:*|npm:*|http://*|https://*) ;;
	*) SOURCE="$(cd "$SOURCE" 2>/dev/null && pwd)" || die "no such path: $SOURCE" ;;
esac

echo
echo "pi-trellis installer"
echo "  project: $(pwd)"
if [ "$CHECK_ONLY" = "1" ]; then
	echo "  mode:    checks only"
else
	echo "  source:  $SOURCE"
fi
echo

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

command -v pi >/dev/null 2>&1 || die "pi not found on PATH"
green "✓ pi $(pi --version 2>/dev/null | head -1)"

command -v trellis >/dev/null 2>&1 \
	|| die "trellis not found on PATH — install @mindfoldhq/trellis first"

TRELLIS_VERSION="$(trellis --version 2>/dev/null | head -1 | tr -d '[:space:]')"
[ -n "$TRELLIS_VERSION" ] || die "could not read a version from \`trellis --version\`"

TRELLIS_MAJOR="${TRELLIS_VERSION%%.*}"
TRELLIS_REST="${TRELLIS_VERSION#*.}"
TRELLIS_MINOR="${TRELLIS_REST%%.*}"

case "$TRELLIS_MAJOR$TRELLIS_MINOR" in
	*[!0-9]*)
		amber "! trellis version \"$TRELLIS_VERSION\" is not a number triple — skipping the range check"
		;;
	*)
		if [ "$TRELLIS_MAJOR" -eq "$MIN_TRELLIS_MAJOR" ] && [ "$TRELLIS_MINOR" -lt "$MIN_TRELLIS_MINOR" ]; then
			die "trellis $TRELLIS_VERSION is older than the required ${MIN_TRELLIS_MAJOR}.${MIN_TRELLIS_MINOR} (this extension calls task.py / get_context.py --json)"
		fi
		if [ "$TRELLIS_MAJOR" -gt "$MIN_TRELLIS_MAJOR" ]; then
			amber "! trellis $TRELLIS_VERSION is a new major version — the CLI contract may have moved; watch for a startup warning from pi-trellis"
		fi
		;;
esac
green "✓ trellis $TRELLIS_VERSION"

PYTHON="${TRELLIS_PYTHON:-python3}"
command -v "$PYTHON" >/dev/null 2>&1 \
	|| die "$PYTHON not found on PATH (set TRELLIS_PYTHON to your interpreter)"
green "✓ $("$PYTHON" --version 2>&1 | head -1)"

[ -d .trellis ] \
	|| die "no .trellis/ here — run \`trellis init -u <your-name>\` first (do NOT pass --pi)"

for script in task.py get_context.py; do
	[ -f ".trellis/scripts/$script" ] \
		|| die ".trellis/scripts/$script is missing — this project's Trellis install looks incomplete"
done
green "✓ .trellis/ with task.py and get_context.py"

if "$PYTHON" ./.trellis/scripts/get_context.py --mode default --json >/dev/null 2>&1; then
	green "✓ get_context.py returns JSON"
else
	amber "! get_context.py --mode default --json failed — context injection will be degraded"
fi

if [ -f .pi/extensions/trellis/index.ts ]; then
	echo
	amber "! .pi/extensions/trellis/index.ts exists — this project also has the \`trellis init --pi\` adapter."
	amber "  Two adapters will both inject context. Remove the generated one:"
	dim   "    rm -rf .pi/extensions/trellis .pi/prompts/trellis-*.md"
	amber "  Trellis respects the deletion on later \`trellis update\` runs."
fi

# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

echo
if [ "$NEUTRAL_SKILLS" = "1" ]; then
	echo "Writing platform-neutral skills to .agents/skills/ via the Codex configurator..."
	dim   "    (this is a second \`trellis init\` pass; it also creates .codex/)"
	if [ "$CHECK_ONLY" = "1" ]; then
		dim "    checks only: not running trellis init --codex"
	else
		run trellis init --codex
	fi
fi

SKILL_NOTE=""
if [ -d .agents/skills ]; then
	green "✓ skills: .agents/skills/ — pi discovers these natively"
elif [ -d .claude/skills ]; then
	SKILL_NOTE=".claude/skills"
elif [ -d .cursor/skills ]; then
	SKILL_NOTE=".cursor/skills"
else
	amber "! no trellis-* skills found in .agents/, .claude/ or .cursor/ — pi will have none"
fi

if [ -n "$SKILL_NOTE" ]; then
	amber "! skills: bridging $SKILL_NOTE/trellis-* (no files are copied)"
	amber "  Those were rendered for another platform, so they mention \`/trellis:*\` slash"
	amber "  commands that do not exist in pi. Read them as \"follow the matching flow in"
	amber "  .trellis/workflow.md\". For neutral text instead, re-run with --neutral-skills."
fi

# ---------------------------------------------------------------------------
# Project-local Trellis safety fixes (no global CLI or worktree preparation changes)
# ---------------------------------------------------------------------------

if [ "$PATCH_TRELLIS" = "1" ]; then
	if [ "$CHECK_ONLY" = "1" ]; then
		if ! "$PYTHON" "$SCRIPT_DIR/patch-trellis.py" --root "$PROJECT_ROOT" --check; then
			amber "! Trellis safety patch missing or incompatible — rerun the installer to repair it"
		fi
	elif [ "$DRY_RUN" = "1" ]; then
		"$PYTHON" "$SCRIPT_DIR/patch-trellis.py" --root "$PROJECT_ROOT" --dry-run
	else
		"$PYTHON" "$SCRIPT_DIR/patch-trellis.py" --root "$PROJECT_ROOT"
	fi
else
	dim "Skipping Trellis safety patch (--no-patch)"
fi

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------

echo
if [ "$CHECK_ONLY" = "1" ]; then
	if [ -f .pi/settings.json ] && grep -q "pi-trellis" .pi/settings.json 2>/dev/null; then
		green "✓ pi-trellis is declared in .pi/settings.json"
	else
		amber "! pi-trellis is not declared in .pi/settings.json — re-run without --check to install it"
	fi
	if [ -d .pi/agents ] && ls .pi/agents/trellis-*.md >/dev/null 2>&1; then
		green "✓ agent definitions present in .pi/agents/"
	else
		amber "! no .pi/agents/trellis-*.md yet — they appear on the first trusted pi start"
	fi
	echo
	green "Checks done."
	echo
	exit 0
fi

echo "Installing the extension project-locally..."
# `-l` writes .pi/settings.json, which pi treats as project-local config and
# refuses to touch in an untrusted project. Running this installer is the
# consent for that one write; pi still asks before *loading* the package.
dim "    pi install -l --approve $SOURCE"
run pi install -l --approve "$SOURCE"

echo
green "Done."
echo
echo "Next:"
echo "  1. Start pi and approve project trust once — project-local packages load only after that."
echo "  2. .pi/agents/trellis-{implement,check,research}.md appear on first start."
echo "     Edit them freely; edited files are never overwritten."
echo "  3. Decide whether .pi/agents/trellis-*.md belong in git (see README)."
echo
