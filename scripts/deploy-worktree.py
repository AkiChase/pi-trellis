#!/usr/bin/env python3
"""Protected deployment independent of the active_task.py safety patch.

A manifest authorizes replacement only when every recorded byte is unchanged.
Unknown existing files, symlinks and customized copies are never overwritten.
No network, SDK or package-manager calls. Multi-file publication is not a single
transaction: an interrupted update is diagnosed, never automatically repaired.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile

VERSION = 1
SOURCE = Path(__file__).resolve().parent.parent / "python"
MANIFEST = ".pi-trellis-worktree.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def local(root, file):
    parent = file.parent
    while parent != root:
        if parent.is_symlink():
            raise ValueError(f"Deployment ancestor must not be symlinked: {parent}")
        if parent == parent.parent:
            raise ValueError(f"Deployment escapes root: {file}")
        parent = parent.parent
    if not file.resolve().is_relative_to(root) or file.is_symlink():
        raise ValueError(f"Deployment path must be local, not symlinked: {file}")
    if file.exists() and not stat.S_ISREG(file.lstat().st_mode):
        raise ValueError(f"Deployment file must be regular: {file}")


def deploy(root, check=False, dry_run=False):
    root = root.resolve(strict=True)
    target = root / ".trellis/scripts"
    if not target.is_dir() or not target.resolve().is_relative_to(root):
        raise ValueError("Project .trellis/scripts must be an existing local directory")
    files = {"worktree.py": (SOURCE / "worktree.py").read_bytes()}
    files.update({path.relative_to(SOURCE).as_posix(): path.read_bytes() for path in sorted((SOURCE / "pi_trellis_worktree").glob("*.py"))})
    manifest_file = target / MANIFEST
    local(root, manifest_file)
    prior_bytes = manifest_file.read_bytes() if manifest_file.exists() else None
    prior = json.loads(prior_bytes) if prior_bytes is not None else None
    if prior_bytes is not None and (not isinstance(prior, dict) or type(prior.get("version")) is not int or prior.get("version") != VERSION or not isinstance(prior.get("files"), dict)):
        raise ValueError("Unknown CLI deployment manifest; preserved")
    recorded = prior["files"] if prior is not None else {}
    if any(not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value) for value in recorded.values()):
        raise ValueError("Invalid CLI deployment digests; preserved")
    if any(name not in files for name in recorded):
        raise ValueError("Unknown/retired recorded deployment files; explicit reconciliation required")
    originals = {}
    for name, data in files.items():
        file = target / name
        local(root, file)
        original = file.read_bytes() if file.exists() else None
        originals[name] = original
        if original is not None and (name not in recorded or digest(original) != recorded[name]):
            raise ValueError(f"Unknown or user-customized CLI file preserved: {name}")
        if original is None and name in recorded:
            raise ValueError(f"Recorded CLI file missing: {name}; explicitly reconcile incomplete deployment")
        compile(data.decode("utf-8"), str(file), "exec")
    new = dict(version=VERSION, files={name: digest(data) for name, data in files.items()})
    manifest_bytes = (json.dumps(new, indent=2) + "\n").encode()
    changed = any(originals[name] != data for name, data in files.items()) or prior != new
    if check or dry_run:
        print("CLI deployment " + ("required" if changed else "current") + (" (preview; no writes)" if dry_run else ""))
        return 1 if check and changed else 0
    if not changed:
        print("CLI deployment current (unchanged)")
        return 0
    # Validate every file before any write. Recheck bytes/mode/containment immediately
    # before each atomic replacement; refuse another writer instead of erasing it.
    for name, data in {**files, MANIFEST: manifest_bytes}.items():
        file = target / name
        original = prior_bytes if name == MANIFEST else originals[name]
        local(root, file)
        if (file.read_bytes() if file.exists() else None) != original:
            raise ValueError(f"Deployment file changed concurrently: {name}")
        if original == data:
            continue
        file.parent.mkdir(parents=True, exist_ok=True)
        mode = stat.S_IMODE(file.stat().st_mode) if file.exists() else 0o644
        fd, temp = tempfile.mkstemp(prefix=".pi-trellis-", dir=file.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fchmod(stream.fileno(), mode)
            local(root, file)
            if (file.read_bytes() if file.exists() else None) != original:
                raise ValueError(f"Deployment file changed concurrently: {name}")
            os.replace(temp, file)
        finally:
            Path(temp).unlink(missing_ok=True)
    print("Deployed native CLI: python3 .trellis/scripts/worktree.py --help")
    return 0


def main():
    p = argparse.ArgumentParser(allow_abbrev=False, description=__doc__)
    p.add_argument("--root", type=Path, required=True)
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    try:
        return deploy(args.root, args.check, args.dry_run)
    except Exception as error:
        print(f"CLI deployment refused: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
