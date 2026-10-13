#!/usr/bin/env python3
# Trellis-derived code blocks: @mindfoldhq/trellis 0.6.17, AGPL-3.0-only.
# Upstream: https://github.com/mindfold-ai/Trellis
# Modified session resolution/clearing by pi-trellis; see licenses/trellis-AGPL-3.0.txt.
"""Apply pi-trellis's focused session-isolation fixes to project-local Trellis."""
import argparse
import os
from pathlib import Path
import stat
import tempfile

OLD_RESOLUTION = '''    """Resolve the active task from session runtime state only.

    A stale session task is returned as stale. Missing context identity or a
    missing/empty session context falls back to single-session inference: if
    exactly one session file exists in the runtime, return its task with
    source_type="session-fallback" — covers pull-based platform sub-agents
    (copilot, gemini, qoder) that don't inherit the parent's session id. ≥2
    files or 0 files yield ActiveTask(None) — refuses to guess across windows.
    """'''
NEW_RESOLUTION = '''    """Resolve only the identified session's task, including stale references.

    An identified session with no binding has no active task. Single-session
    inference is an explicit read-only compatibility option for unidentified
    callers; it never overrides an identified session. Patched by pi-trellis.
    """'''
OLD_LOOKUP = '''        if active:
            return active

    if allow_single_session_fallback:'''
NEW_LOOKUP = '''        return active or ActiveTask(None, "none", context_key)

    if allow_single_session_fallback:'''
OLD_CLEAR = '''    """Clear the active task by deleting its resolved session context file."""
    context_key = resolve_context_key(platform_input, platform)
    if not context_key:
        return ActiveTask(None, "none")

    previous = resolve_active_task(repo_root, platform_input, platform)
    if not previous.task_path or not previous.context_key:
        return previous

    context_path = _context_path(repo_root, previous.context_key)
    if context_path.is_file():
        _remove_file(context_path)
    return previous'''
NEW_CLEAR = '''    """Delete only this session's pointer; return its task only after success.

    Patched by pi-trellis: inferred tasks never authorize writes or hooks.
    """
    context_key = resolve_context_key(platform_input, platform)
    if not context_key:
        return ActiveTask(None, "none")

    context_path = _context_path(repo_root, context_key)
    context = _read_json(context_path) or {}
    previous = _active_from_ref(
        _string_value(context.get("current_task")), repo_root, "session", context_key
    ) or ActiveTask(None, "none", context_key)
    try:
        context_path.unlink()
    except FileNotFoundError:
        return ActiveTask(None, "none", context_key)
    except OSError as error:
        raise RuntimeError(f"Failed to clear current session: {context_path}") from error
    return previous'''

REPLACEMENTS = [
    ("explicit-fallback-only", "    allow_single_session_fallback: bool = True,", "    allow_single_session_fallback: bool = False,"),
    ("resolution-doc", OLD_RESOLUTION, NEW_RESOLUTION),
    ("strict-session-resolution", OLD_LOOKUP, NEW_LOOKUP),
    ("session-only-clear", OLD_CLEAR, NEW_CLEAR),
]


def replace_block(text, name, before, after):
    if text.count(before) == 1 and after not in text:
        return text.replace(before, after, 1)
    if before not in text and text.count(after) == 1:
        return text
    raise RuntimeError(f"Cannot safely apply Trellis patch: {name}")


def patched_text(text):
    for name, before, after in REPLACEMENTS:
        text = replace_block(text, name, before, after)
    compile(text, "active_task.py", "exec")
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    path = root / ".trellis/scripts/common/active_task.py"
    if path.is_symlink() or not path.resolve().is_relative_to(root) or not path.is_file():
        raise RuntimeError(f"Expected a project-local regular Trellis script: {path}")
    original = path.read_bytes()
    updated = patched_text(original.decode("utf-8")).encode("utf-8")
    if original == updated:
        print("Trellis session-isolation patch already applied")
        return 0
    if args.check:
        print(f"Trellis session-isolation patch required: {path}")
        return 1
    if args.dry_run:
        print(f"Would apply Trellis session-isolation patch: {path}")
        return 0
    mode = stat.S_IMODE(path.stat().st_mode)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".pi-trellis-", delete=False) as output:
            temporary = Path(output.name)
            output.write(updated)
            output.flush()
            os.fchmod(output.fileno(), mode)
        if path.is_symlink() or path.read_bytes() != original:
            raise RuntimeError("Trellis script changed while preparing patch; no replacement attempted")
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print(f"Applied Trellis session-isolation patch: {path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, SyntaxError, UnicodeError) as error:
        raise SystemExit(f"Trellis patch failed: {error}")
