import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "python"))
from pi_trellis_worktree.records import canonical, parse_binding, text, owner_alive, source_lock, now, read_json, json_value
from pi_trellis_worktree.materials import references, projection, digest, classify, material_graph, load_snapshot, apply_files, file_hash, collectible, local_file, MaterialView
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

    def test_material_projection_and_ancestor_rule(self):
        self.assertEqual(digest(projection('{"branch":"x","status":"planning","meta":{"x":1},"name":"n"}')), digest(projection('{"name":"n","meta":{"x":1}}')))
        self.assertNotEqual(digest(projection('{"meta":null}')), digest(projection('{}')))
        self.assertEqual(classify('A', 'A', 'L'), 'target-only')
        self.assertEqual(classify('A', 'N', 'L'), 'conflict')
        self.assertEqual(classify(None, None, ''), 'target-only')
        self.assertEqual(classify('A', 'N', 'N'), 'converged')

    def test_overlay_validates_new_directory_without_writes(self):
        self.put(self.task + '/check.jsonl', json.dumps({'file': self.task + '/prd.md'}))
        overlay = {self.task + '/implement.jsonl': json.dumps({'file': self.task + '/research', 'type': 'directory'}).encode(), self.task + '/research/new/sub.md': b'virtual research'}
        graph = material_graph(self.root, self.task, overlay)
        self.assertIn(self.task + '/research/new/sub.md', graph['hashes'])
        self.assertFalse((self.root / self.task / 'research').exists())
        with self.assertRaises(ValueError):
            material_graph(self.root, self.task, dict(overlay, **{self.task + '/research/new/sub.md': b'\x00'}))

    def test_task_lifecycle_race_is_detected_before_projection_replace(self):
        self.put(self.task + '/task.json', '{"branch":"target","name":"n"}')
        label = self.task + '/task.json'
        import hashlib
        action = dict(path=label, target=file_hash(self.root, self.task, label), targetBytes=hashlib.sha256((self.root / label).read_bytes()).hexdigest())
        self.put(label, '{"branch":"changed-runtime","name":"n"}')
        with self.assertRaisesRegex(ValueError, 'changed before write'):
            apply_files(self.root, self.task, {label: b'{"branch":"target","name":"new"}'}, [action], 'target')
        self.assertIn('changed-runtime', (self.root / label).read_text())

    def test_snapshot_schema_bounds_and_symlink_directory(self):
        import uuid
        revision = str(uuid.uuid4())
        b = dict(sourceRoot=str(self.root), bindingId='binding', taskDir=self.task, materials=dict(version=1, revision=revision, snapshotId=revision))
        path = f'.trellis/.runtime/pi-trellis/materials/binding/{revision}.json'
        valid = dict(version=1, bindingId='binding', revision=revision, accepted=dict(hashes={self.task + '/prd.md': 'a'*64}, roles=dict(implement=[self.task + '/prd.md'], check=[self.task + '/prd.md'])), ancestors={self.task + '/prd.md': 'a'*64})
        self.put(path, json.dumps(valid))
        self.assertEqual(load_snapshot(b)['revision'], revision)
        for bad in [dict(valid, version=True), dict(valid, ancestors={self.task + '/prd.md': 'bad'}), dict(valid, ancestors={'../escape': 'a'*64}), dict(valid, accepted={'hashes':{},'roles':{'implement':[{}],'check':[]}}), dict(valid, ancestors={})]:
            self.put(path, json.dumps(bad))
            with self.assertRaises(ValueError): load_snapshot(b)
        self.put(path, ' ' * (1024*1024+1))
        with self.assertRaises(ValueError): load_snapshot(b)
        directory = self.root / '.trellis/.runtime/pi-trellis/materials/binding'
        import shutil
        shutil.rmtree(directory)
        outside = self.root / 'outside'; outside.mkdir()
        directory.symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlinks'): load_snapshot(b)

    def test_collection_not_arbitrary_code_or_credential_files(self):
        for label in [self.task+'/code.py', self.task+'/research/run.sh', self.task+'/research/secrets.md', self.task+'/.env']:
            with self.assertRaises(ValueError): collectible(self.task, label)
        collectible(self.task, self.task+'/research/report.md')

    def test_task_local_alias_and_impossible_overlay_ancestors(self):
        task_dir = self.root / self.task
        alias = self.root / '.trellis/tasks/other'
        task_dir.rename(alias)
        task_dir.symlink_to(alias, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            local_file(self.root, self.task, self.task + '/prd.md')
        task_dir.unlink()
        alias.rename(task_dir)
        self.put(self.task + '/check.jsonl', json.dumps({'file': self.task + '/prd.md'}))
        self.put(self.task + '/research', 'regular file blocks directory')
        overlay = {self.task + '/implement.jsonl': json.dumps({'file': self.task + '/research/new.md'}).encode(), self.task + '/research/new.md': b'new dependency'}
        with self.assertRaisesRegex(ValueError, 'directory'):
            material_graph(self.root, self.task, overlay)
        self.assertEqual((self.root / self.task / 'research').read_text(), 'regular file blocks directory')

    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'POSIX special-file fixture')
    def test_virtual_reader_rejects_special_file_before_open(self):
        label = self.task + '/research/pipe.md'
        path = self.root / label
        path.parent.mkdir(parents=True, exist_ok=True)
        os.mkfifo(path)
        with self.assertRaisesRegex(ValueError, 'regular file'):
            MaterialView(self.root, self.task).data(label)

    def test_live_owner_and_lock_are_conservative(self):
        self.assertTrue(owner_alive({"ownerPid": os.getpid()}))
        with source_lock(self.root):
            with self.assertRaisesRegex(ValueError, "locked"):
                with source_lock(self.root):
                    self.fail("must not enter")
        self.assertFalse((self.root / ".trellis/.runtime/pi-trellis/worktrees.lock").exists())


if __name__ == "__main__":
    unittest.main()
