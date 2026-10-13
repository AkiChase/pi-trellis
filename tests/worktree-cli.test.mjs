import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync, statSync, symlinkSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { canonicalPath } from '../lib/config.ts';
import { acquireBindingLock, readBinding, atomicRecord, bindingFile } from '../lib/bindings.ts';
import { readExecution, writeExecution, worktreeSnapshot } from '../lib/executions.ts';
import { queryWorktree } from '../lib/worktree-query.ts';

const deploy = resolve('scripts/deploy-worktree.py');
const python = execFileSync('which',[process.env.TRELLIS_PYTHON || 'python3'],{encoding:'utf8'}).trim();
const execute = (args, options={}) => spawnSync(python, ['-B', ...args], { encoding:'utf8', env:{...process.env, PYTHONDONTWRITEBYTECODE:'1'}, ...options });
function fixture(t) {
 const root = canonicalPath(mkdtempSync(join(tmpdir(),'pi-native-'))); t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(path,data)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),data);};
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');put('.gitignore','/.worktree/\n/.trellis/.runtime/\n/.pi/\n');put('code.txt','base');put('.trellis/spec/spec.md','spec');
 put('.trellis/scripts/task.py',`import pathlib,os,sys,json
p=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')
if sys.argv[1]=='start':
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps({'dir':sys.argv[2]}));print('hook progress')
else: print(json.dumps({'current_task':json.loads(p.read_text()),'source':'session:'+os.environ['TRELLIS_CONTEXT_ID']}))
`);
 const deployment=(...flags)=>execute([deploy,'--root',root,...flags]);
 assert.equal(deployment().status,0);
 git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','fixture');
 const task='.trellis/tasks/native';put(task+'/task.json','{"status":"in_progress"}');put(task+'/prd.md','需求');
 for(const role of ['implement','check'])put(task+'/'+role+'.jsonl',JSON.stringify({file:'.trellis/spec/spec.md'}));
 const cli=join(root,'.trellis/scripts/worktree.py');
 const run=(action, flags=[], options={})=>execute([cli,action,'--task',task,'--cwd',root,'--json',...flags],options);
 const ok=(action,flags=[],options={})=>{const r=run(action,flags,options);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 return {root,task,put,git,cli,run,ok,deployment};
}

test('strict CLI help/operation arguments reject before writes, including duplicate flags and whitespace/control values',t=>{
 const f=fixture(t);
 const help=execute([f.cli,'--help']);assert.equal(help.status,0);assert.match(help.stdout,/create.*adopt.*status.*prepare.*recover.*remove/s);
 for(const [action,flags] of [
  ['create',['--path','somewhere']],['status',['--confirm']],['prepare',['--base','HEAD']],['recover',['--branch','x']],
  ['adopt',[]],['create',['--unknown']],['create',['--br','x']],['create',['--task',f.task]],['create',['--json']],
  ['create',['--confirm','--confirm']],['create',['--base']],['create',['--base','']],['create',['--base','   ']],
  ['create',['--branch','bad\tname']],['remove',['--integrated-into','bad\nref']],['create',['--cwd','']],
 ]) {
  const r=f.run(action,flags);assert.notEqual(r.status,0,JSON.stringify([action,flags]));assert.equal(JSON.parse(r.stdout).ok,false);
  assert.ok(!existsSync(join(f.root,'.worktree')));assert.ok(!existsSync(join(f.root,'.trellis/.runtime')));
 }
});

test('deployed CLI runs from its fixed path with Node unavailable and inherited Git overrides isolated; prepare scopes target pin',async t=>{
 const f=fixture(t), bin=join(f.root,'only-git');mkdirSync(bin);symlinkSync(execFileSync('which',['git'],{encoding:'utf8'}).trim(),join(bin,'git'));
 const env={...process.env,PATH:bin,TRELLIS_CONTEXT_ID:'parent-pin',GIT_DIR:join(f.root,'foreign'),GIT_INDEX_FILE:join(f.root,'wrong-index')};
 const preview=f.ok('create',[],{env});assert.equal(preview.preview,true);assert.ok(!existsSync(join(f.root,'.worktree')));
 const b=f.ok('create',['--confirm'],{env}).binding;
 f.put('.trellis/.runtime/sessions/parent-pin.json','{"current_task":"parent"}');
 const before=readFileSync(join(f.root,f.task,'task.json'));
 const prepared=f.run('prepare',['--confirm'],{env});assert.equal(prepared.status,0,prepared.stderr);assert.match(prepared.stderr,/hook progress/);
 assert.equal(JSON.parse(prepared.stdout).binding.preparationState,'ready');assert.deepEqual(readFileSync(join(f.root,f.task,'task.json')),before);
 assert.equal(readFileSync(join(f.root,'.trellis/.runtime/sessions/parent-pin.json'),'utf8'),'{"current_task":"parent"}');
 assert.ok(!existsSync(join(b.worktreePath,'.trellis/.runtime/sessions/parent-pin.json')));
 assert.ok(!existsSync(join(f.root,'wrong-index')));
 assert.equal((await queryWorktree(f.root,f.task,true)).binding.bindingId,b.bindingId);
 assert.equal(readBinding(f.root,f.task).version,1);
});

test('Python and host v1 binding/execution/lock interoperate without nested query deadlock',async t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;f.ok('prepare',['--confirm']);
 const hostRecord={bindingId:b.bindingId,requestId:'host',role:'trellis-check',state:'unknown',ownerPid:process.pid,ownerToken:'host-token',createdAt:new Date().toISOString()};
 writeExecution(b,hostRecord);assert.equal(f.ok('status').execution.ownerPid,process.pid);
 assert.notEqual(f.run('recover').status,0);assert.equal(readExecution(b).state,'unknown');
 const release=acquireBindingLock(f.root);
 try { assert.equal((await queryWorktree(f.root,f.task,true)).binding.bindingId,b.bindingId);assert.match(f.run('recover',['--confirm']).stderr,/alive/); }
 finally {release();}
 writeExecution(b,{...hostRecord,ownerPid:2147483647});
 const release2=acquireBindingLock(f.root);
 try {assert.match(f.run('recover',['--confirm']).stderr,/locked/);}finally{release2();}
 assert.equal(f.ok('recover').preview,true);assert.equal(readExecution(b).state,'unknown');f.ok('recover',['--confirm']);assert.equal(readExecution(b).state,'stopped');
 // Host republishes unchanged v1 identities and Python reads without migration.
 const current=readBinding(f.root,f.task);atomicRecord(bindingFile(f.root,f.task),current);assert.equal(f.ok('create').reused,true);
});

test('readiness rejects empty/seed JSONL, invalid UTF-8/NUL, escaped/symlinked/directory refs and preserves target',t=>{
 const cases=[['',/No valid/],['{"reason":"seed"}',/No valid/],['{"file":"../../outside"}',/leaves/],['{"file":".trellis/tasks/native/research"}',/declare type/],['{"file":".trellis/tasks/native/research/binary"}',/UTF|utf|Binary/],['{"file":".trellis/tasks/native/research/link"}',/Symlink/]];
 for(const [manifest,expected] of cases){
  const f=fixture(t);f.put(f.task+'/research/binary',Buffer.from([0xff,0x00]));f.put('external-file','outside');symlinkSync(join(f.root,'external-file'),join(f.root,f.task,'research/link'));
  // A task-local link into source root fails during task-only copy even though general material loading allows it.
  if(expected.source==='Symlink'){rmSync(join(f.root,f.task,'research/link'));symlinkSync('/etc/hosts',join(f.root,f.task,'research/link'));}
  f.put(f.task+'/implement.jsonl',manifest);const b=f.ok('create',['--confirm']).binding;
  const r=f.run('prepare',['--confirm']);assert.notEqual(r.status,0);assert.match(r.stderr,expected);assert.ok(!existsSync(join(b.worktreePath,f.task)));assert.equal(readBinding(f.root,f.task).preparationState,'unprepared');
 }
});

test('directory expansion includes selected subtree, external source task store allowed but external target store rejected',t=>{
 const f=fixture(t);f.put(f.task+'/research/a.md','a');f.put(f.task+'/research/sub/b.md','b');f.put(f.task+'/unused.md','not selected');
 f.put(f.task+'/implement.jsonl',JSON.stringify({file:f.task+'/research',type:'directory'}));
 const store=join(f.root,'external-store');mkdirSync(store);cpSync(join(f.root,'.trellis/tasks/native'),join(store,'native'),{recursive:true});rmSync(join(f.root,'.trellis/tasks'),{recursive:true});symlinkSync(store,join(f.root,'.trellis/tasks'));
 const b=f.ok('create',['--confirm']).binding;f.ok('prepare',['--confirm']);assert.ok(existsSync(join(b.worktreePath,f.task,'research/sub/b.md')));assert.ok(!existsSync(join(b.worktreePath,f.task,'unused.md')));
 rmSync(join(b.worktreePath,'.trellis/tasks'),{recursive:true});symlinkSync(store,join(b.worktreePath,'.trellis/tasks'));
 const r=f.run('prepare');assert.notEqual(r.status,0);assert.match(r.stderr,/Target task store/);
});

test('target start failure retains copied task, branch and diagnostic error binding',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 writeFileSync(join(b.worktreePath,'.trellis/scripts/task.py'),'raise RuntimeError("hook failed")');
 const r=f.run('prepare',['--confirm']);assert.notEqual(r.status,0);assert.match(r.stderr,/hook failed/);assert.equal(readBinding(f.root,f.task).preparationState,'error');assert.ok(existsSync(join(b.worktreePath,f.task,'prd.md')));assert.ok(f.git('rev-parse',`refs/heads/${b.branch}`));
});

test('deployment check/dry-run/idempotency/modes and unknown/customized file protection',t=>{
 const root=mkdtempSync(join(tmpdir(),'pi-deploy-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'.trellis/scripts'),{recursive:true});
 const run=(...flags)=>execute([deploy,'--root',root,...flags]);
 assert.equal(run('--check').status,1);assert.equal(run('--dry-run').status,0);assert.ok(!existsSync(join(root,'.trellis/scripts/worktree.py')));
 assert.equal(run().status,0);const file=join(root,'.trellis/scripts/worktree.py');const original=readFileSync(file);chmodSync(file,0o640);assert.equal(run().status,0);assert.equal(run('--check').status,0);assert.equal(statSync(file).mode&0o777,0o640);
 writeFileSync(file,'custom');assert.notEqual(run().status,0);assert.equal(readFileSync(file,'utf8'),'custom');assert.notEqual(run('--dry-run').status,0);
 writeFileSync(file,original);rmSync(join(root,'.trellis/scripts/.pi-trellis-worktree.json'));assert.notEqual(run().status,0);assert.deepEqual(readFileSync(file),original);
});

test('deployment updates recorded untouched versions, refuses symlinks and missing modules never auto-repair',t=>{
 const f=fixture(t),file=join(f.root,'.trellis/scripts/worktree.py'),manifest=join(f.root,'.trellis/scripts/.pi-trellis-worktree.json');
 const old=Buffer.from('old CLI');writeFileSync(file,old);const record=JSON.parse(readFileSync(manifest));record.files['worktree.py']=createHash('sha256').update(old).digest('hex');writeFileSync(manifest,JSON.stringify(record));chmodSync(file,0o640);
 assert.equal(f.deployment('--check').status,1);assert.equal(f.deployment('--dry-run').status,0);assert.deepEqual(readFileSync(file),old);assert.equal(f.deployment().status,0);assert.equal(statSync(file).mode&0o777,0o640);
 const outside=join(f.root,'outside.py');writeFileSync(outside,'user file');rmSync(file);symlinkSync(outside,file);assert.notEqual(f.deployment().status,0);assert.equal(readFileSync(outside,'utf8'),'user file');
 rmSync(file);rmSync(manifest);rmSync(join(f.root,'.trellis/scripts/pi_trellis_worktree'),{recursive:true});assert.equal(f.deployment().status,0);
 rmSync(join(f.root,'.trellis/scripts/pi_trellis_worktree/manager.py'));const missing=execute([file,'--help']);assert.notEqual(missing.status,0);assert.match(missing.stderr,/missing\/incompatible/);assert.ok(!existsSync(join(f.root,'.trellis/scripts/pi_trellis_worktree/manager.py')));

});

test('configuration validation/defaults/absolute locations and dangling links never infer empty defaults',t=>{
 const f=fixture(t);
 for(const config of ['null','[]','broken',JSON.stringify({worktree:null}),JSON.stringify({worktree:{directory:''}}),JSON.stringify({worktree:{directory:'  '}}),JSON.stringify({worktree:{directory:'a\tb'}}),JSON.stringify({worktree:{directory:42}}),JSON.stringify({worktree:{directory:'..'}})]) {
  f.put('.pi/pi-trellis.json',config);assert.notEqual(f.run('create').status,0);assert.ok(!existsSync(join(f.root,'.worktree')));
 }
 f.put('.pi/pi-trellis.json',JSON.stringify({worktree:{directory:join(f.root,'absolute')}}));f.put('.gitignore','/absolute/\n/.trellis/.runtime/\n/.pi/\n');
 assert.equal(f.ok('create').plan.worktreePath,join(f.root,'absolute/native'));
 symlinkSync(join(f.root,'missing'),join(f.root,'link'));f.put('.pi/pi-trellis.json',JSON.stringify({worktree:{directory:'link'}}));assert.notEqual(f.run('create').status,0);assert.ok(!existsSync(join(f.root,'missing')));
});

test('remove without preserving reference/adopt conflicts refuse without erasing directory or records; target native modules required',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 for(const flags of [[],['--integrated-into','missing-ref']]){assert.notEqual(f.run('remove',flags).status,0);assert.ok(existsSync(b.worktreePath));assert.equal(readBinding(f.root,f.task).bindingId,b.bindingId);}
 assert.notEqual(f.run('adopt',['--path',b.worktreePath,'--branch','wrong']).status,0);assert.notEqual(f.run('adopt',['--path',f.root]).status,0);
 rmSync(join(b.worktreePath,'.trellis/scripts/pi_trellis_worktree/manager.py'));const r=f.run('prepare',['--confirm']);assert.notEqual(r.status,0);assert.match(r.stderr,/no automatic deployment/);assert.ok(!existsSync(join(b.worktreePath,f.task)));
});

test('target task.py and hooks do not inherit Git redirection; null records fail without erasing state',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 writeFileSync(join(b.worktreePath,'.trellis/scripts/task.py'),`import os,subprocess,json,pathlib,sys
assert {k:v for k,v in os.environ.items() if k.startswith('GIT_')} == {'GIT_OPTIONAL_LOCKS':'0'}
assert subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip() == str(pathlib.Path.cwd())
p=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')
if sys.argv[1]=='start':
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps({'dir':sys.argv[2]}))
else: print(json.dumps({'current_task':json.loads(p.read_text()),'source':'session:'+os.environ['TRELLIS_CONTEXT_ID']}))
`);
 f.ok('prepare',['--confirm'],{env:{...process.env,GIT_DIR:join(f.root,'.git'),GIT_WORK_TREE:f.root,GIT_INDEX_FILE:join(f.root,'bad-index')}});
 assert.ok(!existsSync(join(f.root,'bad-index')));
 const file=join(f.root,'.trellis/.runtime/pi-trellis',`execution-${b.bindingId}.json`);writeFileSync(file,'null');
 assert.notEqual(f.run('recover',['--confirm']).status,0);
 assert.equal(readFileSync(file,'utf8'),'null');assert.equal(readBinding(f.root,f.task).preparationState,'ready');
 const bindingPath=bindingFile(f.root,f.task);writeFileSync(bindingPath,'null');
 assert.notEqual(f.run('create',['--confirm']).status,0);assert.equal(readFileSync(bindingPath,'utf8'),'null');assert.ok(existsSync(b.worktreePath));
});

test('malformed manifests and symlinked deployment ancestors refuse every write',t=>{
 for(const manifest of ['null','{"version":true,"files":{}}','{"version":1,"files":{"worktree.py":4}}']){
  const root=mkdtempSync(join(tmpdir(),'pi-bad-manifest-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'.trellis/scripts'),{recursive:true});
  const file=join(root,'.trellis/scripts/.pi-trellis-worktree.json');writeFileSync(file,manifest);
  for(const flags of [[],['--check'],['--dry-run']])assert.notEqual(execute([deploy,'--root',root,...flags]).status,0);
  assert.equal(readFileSync(file,'utf8'),manifest);assert.ok(!existsSync(join(root,'.trellis/scripts/worktree.py')));
 }
 const f=fixture(t),scripts=join(f.root,'.trellis/scripts'),outside=join(f.root,'outside-scripts');cpSync(scripts,outside,{recursive:true});rmSync(scripts,{recursive:true});symlinkSync(outside,scripts);
 const before=readFileSync(join(outside,'worktree.py'));assert.notEqual(f.deployment().status,0);assert.deepEqual(readFileSync(join(outside,'worktree.py')),before);
});

test('explicit --cwd cannot hide the actual process cwd from removal',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 const r=f.run('remove',['--confirm','--integrated-into','HEAD'],{cwd:b.worktreePath});
 assert.notEqual(r.status,0);assert.match(r.stderr,/current working directory/);
 assert.ok(existsSync(b.worktreePath));assert.equal(readBinding(f.root,f.task).bindingId,b.bindingId);
});

test('Python status compares host snapshots identically for supplementary Unicode filenames',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 for(const name of ['\uE000.md','🙂.md'])writeFileSync(join(b.worktreePath,name),'snapshot content');
 writeExecution(b,{bindingId:b.bindingId,requestId:'unicode',role:'trellis-check',state:'completed',ownerPid:process.pid,ownerToken:'token',createdAt:new Date().toISOString(),finalSnapshot:worktreeSnapshot(b)});
 assert.match(f.ok('status').note,/check ended on current snapshot/);
 writeFileSync(join(b.worktreePath,'🙂.md'),'changed');assert.match(f.ok('status').note,/stale/);
});

test('host atomic record writes reject a final symlink instead of silently replacing user state',t=>{
 const f=fixture(t),b=f.ok('create',['--confirm']).binding;
 const outside=join(f.root,'user-state.json'),marker=join(b.worktreePath,'.trellis/.runtime/pi-trellis/binding.json');writeFileSync(outside,'user state');rmSync(marker);symlinkSync(outside,marker);
 assert.throws(()=>atomicRecord(marker,b),/regular file/);
 assert.equal(readFileSync(outside,'utf8'),'user state');assert.ok(statSync(marker).isFile());assert.equal(readFileSync(marker,'utf8'),'user state');
});
