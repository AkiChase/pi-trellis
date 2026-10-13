import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "python"))
from pi_trellis_worktree.records import canonical, parse_binding, text, owner_alive, source_lock, now, read_json, json_value
from pi_trellis_worktree.materials import references
from pi_trellis_worktree.cli import parser


class NativeContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.task = ".trellis/tasks/test"
        self.put(self.task + "/task.json", "{}")
        self.put(self.task + "/prd.md", "requirements")
        self.put(self.task + "/implement.jsonl", json.dumps({"file": self.task + "/prd.md"}))

    def put(self, path, data):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(data, encoding="utf-8")

    def test_canonical_dangling_symlink_is_not_free_destination(self):
        (self.root / "link").symlink_to(self.root / "missing")
        with self.assertRaises(FileNotFoundError):
            canonical(self.root / "link/new")

    def test_v1_identity_strict_and_extra_fields_preserved(self):
        b = dict(version=1, bindingId="old-id", taskDir=self.task, sourceRoot=str(self.root), worktreePath=str(self.root / "target"), repositoryIdentity=str(self.root), branch="task", baseCommit="a" * 40, contextId="pi-wt-old-id", createdAt=now(), preparationState="ready", custom="preserved")
        self.assertEqual(parse_binding(b)["custom"], "preserved")
        for field, value in (("sourceRoot", "relative"), ("contextId", "../escape"), ("baseCommit", "HEAD"), ("preparationState", "invalid")):
            with self.assertRaises(ValueError):
                parse_binding(dict(b, **{field: value}))

    def test_parser_preserves_nonempty_whitespace_and_rejects_controls(self):
        args = parser().parse_args(["create", "--task", self.task, "--base", " HEAD "])
        self.assertEqual(args.base, " HEAD ")
        for raw in ("", "  ", "a\t", "a\x7f"):
            with self.assertRaises(ValueError):
                text(raw, "value")

    def test_jsonl_bound_and_directory_entry_bound(self):
        self.put(self.task + "/implement.jsonl", (json.dumps({"file": self.task + "/prd.md"}) + "\n") * 513)
        with self.assertRaisesRegex(ValueError, "reference limit"):
            references(self.root, self.task, "implement")
        for i in range(513):
            self.put(self.task + f"/research/{i}.md", "x")
        self.put(self.task + "/implement.jsonl", json.dumps({"file": self.task + "/research", "type": "directory"}))
        with self.assertRaisesRegex(ValueError, "entry limit"):
            references(self.root, self.task, "implement")

    def test_streaming_utf8_across_chunks_cycle_and_nonempty_prd(self):
        self.put(self.task + "/prd.md", "a" * 65535 + "🙂")
        self.assertEqual(references(self.root, self.task, "implement"), [self.task + "/prd.md"])
        self.put(self.task + "/research/x.md", "x")
        (self.root / self.task / "research/cycle").symlink_to(self.root / self.task / "research", target_is_directory=True)
        self.put(self.task + "/implement.jsonl", json.dumps({"file": self.task + "/research", "type": "directory"}))
        self.assertEqual(len(references(self.root, self.task, "implement")), 2)
        self.put(self.task + "/prd.md", "")
        with self.assertRaisesRegex(ValueError, "PRD is empty"):
            references(self.root, self.task, "implement")

    def test_bare_cr_is_not_a_jsonl_row_separator(self):
        row = json.dumps({"file": self.task + "/prd.md"})
        self.put(self.task + "/implement.jsonl", row + "\r" + row)
        with self.assertRaises(ValueError):
            references(self.root, self.task, "implement")
        self.put(self.task + "/implement.jsonl", row + "\r\n" + row)
        self.assertEqual(references(self.root, self.task, "implement"), [self.task + "/prd.md"])

    def test_empty_prd_alias_cannot_bypass_artifact_validation(self):
        self.put(self.task + "/prd.md", "")
        (self.root / self.task / "alias.md").symlink_to("prd.md")
        self.put(self.task + "/implement.jsonl", json.dumps({"file": self.task + "/alias.md"}))
        with self.assertRaisesRegex(ValueError, "PRD is empty"):
            references(self.root, self.task, "implement")

    def test_present_null_record_and_non_json_constants_are_not_missing(self):
        file = self.root / "record.json"
        self.assertIsNone(read_json(file, 100))
        for data in ("null", "[]", "false", '{"ownerPid":NaN}', '{"x":Infinity}'):
            file.write_text(data)
            with self.assertRaises(ValueError):
                read_json(file, 100)
        with self.assertRaises(ValueError):
            json_value('{"status":NaN}')

    def test_pid_uncertainty_permission_and_nonposix_never_prove_death(self):
        for pid in (0, -2147483647, True, "1"):
            with patch("os.kill", side_effect=ProcessLookupError) as kill:
                self.assertTrue(owner_alive({"ownerPid": pid}))
                kill.assert_not_called()
        with patch("os.kill", side_effect=PermissionError):
            self.assertTrue(owner_alive({"ownerPid": 123}))
        with patch("os.kill", side_effect=ProcessLookupError):
            self.assertFalse(owner_alive({"ownerPid": 123}))
        with patch("os.name", "nt"), patch("os.kill") as kill:
            self.assertTrue(owner_alive({"ownerPid": 123}))
            kill.assert_not_called()

    def test_record_and_directory_byte_count_bounds(self):
        self.put(self.task + "/task.json", " " * (1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, "1 MiB"):
            references(self.root, self.task, "implement")
        self.put(self.task + "/task.json", "{}")
        self.put(self.task + "/implement.jsonl", " " * (1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, "1 MiB"):
            references(self.root, self.task, "implement")
        for i in range(129):
            (self.root / self.task / "research" / str(i)).mkdir(parents=True)
        self.put(self.task + "/implement.jsonl", json.dumps({"file": self.task + "/research", "type": "directory"}))
        with self.assertRaisesRegex(ValueError, "Directory expansion limit"):
            references(self.root, self.task, "implement")

    def test_live_owner_and_lock_are_conservative(self):
        self.assertTrue(owner_alive({"ownerPid": os.getpid()}))
        with source_lock(self.root):
            with self.assertRaisesRegex(ValueError, "locked"):
                with source_lock(self.root):
                    self.fail("must not enter")
        self.assertFalse((self.root / ".trellis/.runtime/pi-trellis/worktrees.lock").exists())


if __name__ == "__main__":
    unittest.main()
