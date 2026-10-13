"""Full, budget-independent role validation and task-only preparation.

Prompt rendering/budgets remain host-owned. These validators enforce the same
containment, reference/directory bounds and UTF-8 rules without prefix truncation.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

from .records import bounded_command, canonical, contains, git, git_environment, json_value, require_ignored, runtime, task_slug


MAX_RECORD = 1024 * 1024


def task_path(root, task):
    task_slug(task)
    root = canonical(root)
    store = (root / ".trellis/tasks").resolve(strict=True)
    lexical = root / task
    actual = lexical.resolve(strict=True)
    if not contains(store, actual) or not actual.is_dir():
        raise ValueError("Task escapes its Trellis task store")
    return lexical


def safe_path(root, task, path):
    root = canonical(root)
    lexical = Path(os.path.abspath(root / path))
    if not contains(root, lexical):
        raise ValueError("Path leaves execution root")
    actual = lexical.resolve(strict=True)
    store = (root / ".trellis/tasks").resolve(strict=True)
    if not contains(root, actual) and not (contains(root / ".trellis/tasks", lexical) and contains(store, actual)):
        raise ValueError("Symlink leaves execution root/task store")
    return actual


def task_record(root, task):
    task_path(root, task)
    path = safe_path(root, task, Path(task) / "task.json")
    if not path.is_file() or path.stat().st_size > MAX_RECORD:
        raise ValueError("task.json must be a regular file under 1 MiB")
    value = json_value(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Invalid task.json")
    return value


def references(root, task, role):
    task_record(root, task)
    seen_files, seen_dirs = set(), set()
    refs = []
    entries = 0

    def add(path, directory=False):
        nonlocal entries
        lexical = Path(os.path.abspath(Path(root) / path))
        label = lexical.relative_to(root).as_posix() if contains(root, lexical) else str(lexical)
        actual = safe_path(root, task, path)
        info = actual.stat()
        if stat.S_ISDIR(info.st_mode):
            if not directory:
                raise ValueError("Directory reference must declare type: directory")
            if actual in seen_dirs:
                return
            seen_dirs.add(actual)
            if len(seen_dirs) > 128:
                raise ValueError("Directory expansion limit reached")
            for name in sorted(lexical.iterdir()):
                entries += 1
                if entries > 512:
                    raise ValueError("Directory entry limit reached")
                add(name, True)
        elif stat.S_ISREG(info.st_mode):
            if actual not in seen_files:
                seen_files.add(actual)
                refs.append(label)
        else:
            raise ValueError(f"Not a regular file: {label}")

    file = safe_path(root, task, Path(task) / f"{role}.jsonl")
    if not file.is_file() or file.stat().st_size > MAX_RECORD:
        raise ValueError("JSONL must be a regular file under 1 MiB")
    count = 0
    with file.open(encoding="utf-8", newline="") as stream:
        lines = stream.read().split("\n")  # Match host /\r?\n/, not bare CR.
    for i, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            row = json_value(line)
            if not isinstance(row, dict):
                raise ValueError("Expected a JSON object")
            if "file" not in row:
                continue
            if not isinstance(row["file"], str) or not row["file"].strip():
                raise ValueError("Invalid file reference")
            count += 1
            if count > 512:
                raise ValueError("JSONL reference limit reached")
            add(row["file"], row.get("type") == "directory")
        except (ValueError, OSError) as error:
            raise ValueError(f"{task}/{role}.jsonl:{i}: {error}") from error
    if count == 0:
        raise ValueError(f"{task}/{role}.jsonl: No valid file references")
    for name in ("prd.md", "design.md", "implement.md"):
        path = Path(root) / task / name
        if name == "prd.md" or os.path.lexists(path):
            add(path)
    # Required PRD is independent of canonical-file deduplication: an earlier
    # alias reference must not hide an empty requirements artifact.
    prd = safe_path(root, task, Path(task) / "prd.md")
    if not prd.is_file() or prd.stat().st_size == 0:
        raise ValueError("Required PRD is empty or not a regular file")
    for ref in refs:
        path = safe_path(root, task, ref)
        # Streaming avoids allocating unbounded material during readiness queries.
        import codecs
        decoder = codecs.getincrementaldecoder("utf-8")("strict")
        with path.open("rb") as stream:
            while chunk := stream.read(65536):
                if b"\0" in chunk:
                    raise ValueError(f"Binary content: {ref}")
                decoder.decode(chunk)
            decoder.decode(b"", final=True)
        if ref == task + "/prd.md" and path.stat().st_size == 0:
            raise ValueError("Required PRD is empty")
    return refs


def require_target_cli(root):
    files = ["worktree.py", "task.py"] + ["pi_trellis_worktree/" + name for name in ("__init__.py", "cli.py", "records.py", "materials.py", "manager.py")]
    for name in files:
        file = root / ".trellis/scripts" / name
        if not os.path.lexists(file) or not contains(root, canonical(file)) or not stat.S_ISREG(file.lstat().st_mode):
            raise ValueError(f"Target base lacks local Trellis/native CLI files: {name}; commit scaffolding or explicitly update the target before preparing (no automatic deployment)")


def local_target(b):
    root = Path(b["worktreePath"])
    if not contains(root, canonical(root / ".trellis/tasks")):
        raise ValueError("Target task store cannot symlink outside the worktree")
    require_ignored(root, runtime(root))
    sessions = root / ".trellis/.runtime/sessions"
    if not contains(root, canonical(sessions)):
        raise ValueError("Target sessions runtime cannot symlink outside worktree")
    return root


def task_cli(b, args):
    root = Path(b["worktreePath"])
    script = root / ".trellis/scripts/task.py"
    if not contains(root, canonical(script)) or not stat.S_ISREG(script.lstat().st_mode):
        raise ValueError("Target Trellis CLI must be a local regular file in the worktree")
    env = dict(git_environment(), TRELLIS_CONTEXT_ID=b["contextId"], PYTHONDONTWRITEBYTECODE="1")
    code, stdout, stderr = bounded_command([sys.executable, str(script), *args], cwd=root, env=env, timeout=15, limit=MAX_RECORD)
    if code:
        raise ValueError("Trellis CLI failed: " + (stderr or stdout).decode("utf-8", "replace").strip())
    if args[0] == "start" and stdout:
        print(stdout.decode("utf-8", "replace").strip(), file=sys.stderr)
    if stderr:
        print(stderr.decode("utf-8", "replace").strip(), file=sys.stderr)
    return stdout.decode("utf-8")


def validate_ready(b):
    root = local_target(b)
    require_target_cli(root)
    for role in ("implement", "check"):
        references(root, b["taskDir"], role)
    record = task_record(root, b["taskDir"])
    if record.get("status") != "in_progress" or record.get("branch") != b["branch"]:
        raise ValueError("Target task must be in_progress with its bound branch before dispatch")
    current = json_value(task_cli(b, ["current", "--json"]))
    if not isinstance(current, dict) or not isinstance(current.get("current_task"), dict) or current["current_task"].get("dir") != b["taskDir"] or current.get("source") != "session:" + b["contextId"] or current.get("stale") or current.get("error"):
        raise ValueError("Trellis current task/context does not match target binding")


def prepare(b, confirm=False):
    source, target, task = Path(b["sourceRoot"]), local_target(b), b["taskDir"]
    if task_record(source, task).get("status") != "in_progress":
        raise ValueError("Start/approve the source task through the normal workflow first; preparation does not advance a planning task")
    files = dict.fromkeys(f"{task}/{name}" for name in ("task.json", "prd.md", "implement.jsonl", "check.jsonl"))
    for name in ("design.md", "implement.md"):
        if os.path.lexists(source / task / name):
            files[f"{task}/{name}"] = None
    for role in ("implement", "check"):
        for ref in references(source, task, role):
            if ref.startswith(task + "/"):
                files[ref] = None
            else:
                original = (source / ref).read_bytes()
                dest = target / ref
                if not dest.exists() or not contains(target, canonical(dest)) or not original == dest.read_bytes():
                    raise ValueError(f"Referenced baseline material differs/missing in target: {ref}; commit or explicitly reconcile it before preparing")
                if git(source, ["status", "--porcelain", "--", ref]):
                    raise ValueError(f"Referenced baseline has uncommitted source differences: {ref}")
    copies = {}
    for file in files:
        src, dest = source / file, target / file
        if not contains(canonical(source / task), canonical(src)) or not stat.S_ISREG(src.lstat().st_mode):
            raise ValueError(f"Task material must be a regular task-local file: {file}")
        if not contains(target, canonical(dest)):
            raise ValueError(f"Target file escapes worktree: {file}")
        original = src.read_bytes()
        data = original
        if file.endswith("/task.json"):
            record = json.loads(original)
            record["branch"] = b["branch"]
            data = (json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode()
        if os.path.lexists(dest):
            if not stat.S_ISREG(dest.lstat().st_mode):
                raise ValueError(f"Target material must be a regular file: {file}")
            current = dest.read_bytes()
            if data != current and not (file.endswith("/task.json") and original == current):
                if file.endswith("/task.json") and b.get("preparedFiles", {}).get(file):
                    expected, prior = json.loads(data), json.loads(current)
                    expected.pop("branch", None)
                    prior.pop("branch", None)
                    if expected != prior:
                        raise ValueError(f"Target material conflict: {file}")
                else:
                    raise ValueError(f"Target material conflict: {file}; no overwrite attempted")
        copies[file] = data
    require_ignored(target, target / ".trellis/.runtime/sessions")
    require_target_cli(target)
    hashes = {file: hashlib.sha256(data).hexdigest() for file, data in copies.items()}
    if not confirm:
        return dict(files=list(copies), hashes=hashes)
    for file, data in copies.items():
        dest = target / file
        if not contains(target, canonical(dest)):
            raise ValueError(f"Target changed: {file}")
        if not os.path.lexists(dest):
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("xb") as stream:
                stream.write(data)
        else:
            if not stat.S_ISREG(dest.lstat().st_mode):
                raise ValueError(f"Target changed before copying: {file}")
            if dest.read_bytes() != data:
                if not file.endswith("/task.json"):
                    raise ValueError(f"Target changed before copying: {file}")
                expected, current = json.loads(data), json.loads(dest.read_bytes())
                expected.pop("branch", None)
                current.pop("branch", None)
                if expected != current:
                    raise ValueError(f"Target task changed before copying: {file}")
                dest.write_bytes(data)
    task_cli(b, ["start", task])
    validate_ready(b)
    return dict(files=list(copies), hashes=hashes)
