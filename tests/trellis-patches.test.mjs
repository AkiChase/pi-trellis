import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, statSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const patch = resolve('scripts/patch-trellis.py');
const run = (args, options = {}) => spawnSync('python3', args, { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options });
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'trellis-patch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, '.trellis/scripts/common/active_task.py');
  mkdirSync(join(file, '..'), { recursive: true });
  const make = run(['-c', `import importlib.util,sys
s=importlib.util.spec_from_file_location('patch',sys.argv[1]); p=importlib.util.module_from_spec(s); s.loader.exec_module(p)
header='''import os,json
from pathlib import Path
from dataclasses import dataclass
@dataclass
class ActiveTask:
    task_path: str | None
    source_type: str
    context_key: str | None = None
    stale: bool = False
def resolve_context_key(*args, **kwargs): return os.environ.get("TRELLIS_CONTEXT_ID")
def _context_path(root,key): return root / ".trellis/.runtime/sessions" / (key + ".json")
def _read_json(path): return json.loads(path.read_text()) if path.exists() else None
def _string_value(value): return value if isinstance(value,str) and value else None
def _active_from_ref(ref,root,source,key=None): return ActiveTask(ref,source,key,not (root/ref).is_dir()) if ref else None
def _remove_file(path):
    try: path.unlink(); return True
    except OSError: return False
def _resolve_single_session_fallback(root):
    files=list((root/".trellis/.runtime/sessions").glob("*.json"))
    if len(files)!=1: return None
    return _active_from_ref(_read_json(files[0]).get("current_task"),root,"session-fallback",files[0].stem)
def resolve_active_task(repo_root,platform_input=None,platform=None,*,
    allow_single_session_fallback: bool = True,
    allow_environment_context=True):
'''
body=p.OLD_RESOLUTION+'''
    context_key = resolve_context_key(platform_input,platform)
    if context_key:
        context = _read_json(_context_path(repo_root,context_key)) or {}
        task_ref = _string_value(context.get("current_task"))
        active = _active_from_ref(task_ref,repo_root,"session",context_key)
'''+p.OLD_LOOKUP+'''
        fallback = _resolve_single_session_fallback(repo_root)
        if fallback is not None: return fallback
    return ActiveTask(None,"none",context_key)
def clear_active_task(repo_root,platform_input=None,platform=None):
'''+p.OLD_CLEAR+'\\n'
Path=__import__('pathlib').Path; Path(sys.argv[2]).write_text(header+body)
`, patch, file]);
  assert.equal(make.status, 0, make.stderr);
  const put = (key, task) => {
    const pointer = join(root, `.trellis/.runtime/sessions/${key}.json`);
    mkdirSync(join(pointer, '..'), { recursive: true });
    writeFileSync(pointer, JSON.stringify({ current_task: task }));
    if (task) mkdirSync(join(root, task), { recursive: true });
  };
  const apply = (...args) => run([patch, '--root', root, ...args]);
  const probe = (code) => run(['-c', `import sys,os,json\nfrom pathlib import Path\nsys.path.insert(0,str(Path.cwd()/'.trellis/scripts'))\nfrom common.active_task import *\nroot=Path.cwd()\n${code}`], { cwd: root, env: { ...process.env, TRELLIS_CONTEXT_ID: 'a', PYTHONDONTWRITEBYTECODE: '1' } });
  return { root, file, put, apply, probe };
}

test('patch is atomic/idempotent, preserves mode; check and dry-run do not write', t => {
  const f = fixture(t), original = readFileSync(f.file);
  chmodSync(f.file, 0o640);
  assert.equal(f.apply('--check').status, 1);
  assert.equal(f.apply('--dry-run').status, 0);
  assert.deepEqual(readFileSync(f.file), original);
  assert.equal(f.apply().status, 0);
  assert.equal(statSync(f.file).mode & 0o777, 0o640);
  const patched = readFileSync(f.file);
  assert.equal(f.apply().status, 0);
  assert.equal(f.apply('--check').status, 0);
  assert.deepEqual(readFileSync(f.file), patched);
});

test('identified empty/missing session refuses foreign fallback; unidentified fallback is opt-in; stale stays local', t => {
  const f = fixture(t); f.put('b', '.trellis/tasks/b'); assert.equal(f.apply().status, 0);
  const result = f.probe(`assert resolve_active_task(root).task_path is None
assert resolve_active_task(root,allow_single_session_fallback=True).task_path is None
os.environ.pop('TRELLIS_CONTEXT_ID')
assert resolve_active_task(root).task_path is None
assert resolve_active_task(root,allow_single_session_fallback=True).context_key == 'b'
os.environ['TRELLIS_CONTEXT_ID']='a'
p=_context_path(root,'a') if False else root/'.trellis/.runtime/sessions/a.json'
p.write_text(json.dumps({'current_task':None}))
assert resolve_active_task(root).task_path is None
p.write_text(json.dumps({'current_task':'.trellis/tasks/missing'}))
active=resolve_active_task(root)
assert active.context_key=='a' and active.stale
`);
  assert.equal(result.status, 0, result.stderr);
});

test('repeated finish only clears own session; no identity and removal failure never authorize hooks', t => {
  const f = fixture(t); f.put('a', '.trellis/tasks/a'); f.put('b', '.trellis/tasks/b'); assert.equal(f.apply().status, 0);
  const result = f.probe(`hooks=[]
for _ in range(3):
    previous=clear_active_task(root)
    if previous.task_path: hooks.append(previous.task_path)
assert hooks==['.trellis/tasks/a']
assert (root/'.trellis/.runtime/sessions/b.json').exists()
os.environ.pop('TRELLIS_CONTEXT_ID')
assert clear_active_task(root).task_path is None
os.environ['TRELLIS_CONTEXT_ID']='a'
p=root/'.trellis/.runtime/sessions/a.json'
p.mkdir()
try: clear_active_task(root)
except (RuntimeError,IsADirectoryError): pass
else: raise AssertionError('Expected failure')
assert (root/'.trellis/.runtime/sessions/b.json').exists()
`);
  assert.equal(result.status, 0, result.stderr);
  // Force unlink failure independently of read failures, even under privileged CI users.
  const failed = f.probe(`from unittest.mock import patch
p=root/'.trellis/.runtime/sessions/a.json'
p.rmdir(); p.write_text(json.dumps({'current_task':'.trellis/tasks/a'}))
with patch.object(Path,'unlink',side_effect=PermissionError('denied')):
    try: clear_active_task(root)
    except RuntimeError: pass
    else: raise AssertionError('Must not report success')
assert p.exists()
`);
  assert.equal(failed.status, 0, failed.stderr);
});

test('unknown/ambiguous code and external script symlinks fail without modifying anything', t => {
  const f = fixture(t);
  writeFileSync(f.file, readFileSync(f.file, 'utf8').replace('    if allow_single_session_fallback:', '    if False:'));
  const original = readFileSync(f.file);
  assert.notEqual(f.apply().status, 0);
  assert.deepEqual(readFileSync(f.file), original);
  const outside = join(f.root, 'original.py'); writeFileSync(outside, original);
  rmSync(f.file); symlinkSync(outside, f.file);
  assert.notEqual(f.apply().status, 0);
  assert.deepEqual(readFileSync(outside), original);
});

test('installer defaults to patch, --no-patch opts out, and check/dry-run do not mutate', t => {
  for (const args of [[], ['--no-patch'], ['--check'], ['--dry-run'], ['--check','--neutral-skills'], ['--dry-run','--no-patch']]) {
    const f = fixture(t), original = readFileSync(f.file);
    const bin = join(f.root, 'bin'); mkdirSync(bin);
    for (const [name, body] of [['pi', 'echo 1.1.0'], ['trellis', 'echo 0.6.17']]) {
      const path = join(bin, name); writeFileSync(path, `#!/bin/sh\n${body}\n`); chmodSync(path, 0o755);
    }
    writeFileSync(join(f.root, '.trellis/scripts/task.py'), "print('{}')");
    writeFileSync(join(f.root, '.trellis/scripts/get_context.py'), "print('{}')");
    const result = spawnSync('bash', [resolve('scripts/install.sh'), ...args], {
      cwd: f.root, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    if (!args.length) assert.notDeepEqual(readFileSync(f.file), original);
    else assert.deepEqual(readFileSync(f.file), original);
    const readonly=args.includes('--check') || args.includes('--dry-run');
    assert.equal(existsSync(join(f.root,'.trellis/scripts/worktree.py')), !readonly);
    assert.equal(existsSync(join(f.root,'.trellis/scripts/pi_trellis_worktree/manager.py')), !readonly);
    assert.ok(!existsSync(join(f.root,'.codex')));
  }
});
