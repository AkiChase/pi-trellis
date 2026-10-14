#!/usr/bin/env bash
# Install pi-trellis for the user by default. Initialization is explicit.
set -euo pipefail
SOURCE="git:github.com/AkiChase/pi-trellis"
CHECK=0
DRY_RUN=0
LOCAL=0
SOURCE_SEEN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --source) [ "$SOURCE_SEEN" = 0 ] || { echo 'Repeated --source' >&2; exit 1; }; SOURCE_SEEN=1; [ $# -ge 2 ] && [ -n "$2" ] || { echo "--source needs a value" >&2; exit 1; }; SOURCE="$2"; shift 2 ;;
    --source=*) [ "$SOURCE_SEEN" = 0 ] || { echo 'Repeated --source' >&2; exit 1; }; SOURCE_SEEN=1; SOURCE="${1#*=}"; [ -n "$SOURCE" ] || { echo "--source needs a value" >&2; exit 1; }; shift ;;
    --local) [ "$LOCAL" = 0 ] || { echo 'Repeated --local' >&2; exit 1; }; LOCAL=1; shift ;;
    --check) [ "$CHECK" = 0 ] || { echo 'Repeated --check' >&2; exit 1; }; CHECK=1; shift ;;
    --dry-run) [ "$DRY_RUN" = 0 ] || { echo 'Repeated --dry-run' >&2; exit 1; }; DRY_RUN=1; shift ;;
    --neutral-skills|--no-patch) echo "$1 is obsolete: skills ship with the package; initialize explicitly with /trellis-init." >&2; exit 1 ;;
    -h|--help) printf '%s\n' 'Usage: install.sh [--source <spec>] [--local] [--check] [--dry-run]' 'Installs the Pi package for the user; --local selects project scope. Then run /trellis-init in Pi.'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done
case "$SOURCE" in
  git:*|npm:*|http://*|https://*) ;;
  *) SOURCE="$(cd "$SOURCE" && pwd -P)" ;;
esac
command -v pi >/dev/null 2>&1 || { echo "pi not found on PATH" >&2; exit 1; }
ARGS=(install)
[ "$LOCAL" = 0 ] || ARGS+=(-l)
ARGS+=(--approve "$SOURCE")
if [ "$CHECK" = 1 ]; then
  echo "Pi is available. No project files were changed. Use /trellis-init --check for project status."
elif [ "$DRY_RUN" = 1 ]; then
  printf 'Would run: pi'; printf ' %q' "${ARGS[@]}"; printf '\n'
else
  pi "${ARGS[@]}"
fi
printf '%s\n' 'Next: start Pi, grant project trust, then run /trellis-init.'
