import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, chmodSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture } from './preparation.test.mjs';
import { readBinding, bindingFile } from '../lib/bindings.ts';
import { queryWorktree } from '../lib/worktree-query.ts';
import { writeExecution, worktreeSnapshot } from '../lib/executions.ts';

async function prepared(t) {
 const f=fixture(t), created=await f.run(); await f.run({action:'prepare'});
 const b=readBinding(f.root,f.task);
 const target=(p,data)=>{const path=join(b.worktreePath,f.task,p);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,data);};
 const source=(p,data)=>f.put(f.task+'/'+p,data);
 const text=p=>readFileSync(join(b.worktreePath,f.task,p),'utf8');
 const run=(action,extra={})=>f.run({action,...extra});
 return {...f,b,target,source,text,op:run};
}

test('refresh preview is read-only, source update keeps mode/code/pointer and advances revision; no-op stable',async t=>{
 const f=await prepared(t), before=f.b.materials.revision;
 const pointer=readFileSync(join(f.b.worktreePath,'.trellis/.runtime/sessions',f.b.contextId+'.json'));
 chmodSync(join(f.b.worktreePath,f.task,'prd.md'),0o640);f.source('prd.md','approved new requirements');f.put('code.txt','unrelated source code');
 const preview=await f.op('refresh',{confirm:false});assert.equal(preview.applicable,true);assert.equal(f.text('prd.md'),'Requirements\n');assert.equal(readBinding(f.root,f.task).materials.revision,before);
 await assert.rejects(queryWorktree(f.root,f.task,true),/drift/);await assert.rejects(f.op('prepare'),/drift/);
 await f.op('refresh');assert.equal(f.text('prd.md'),'approved new requirements');assert.notEqual(readBinding(f.root,f.task).materials.revision,before);
 assert.equal(statSync(join(f.b.worktreePath,f.task,'prd.md')).mode&0o777,0o640);assert.equal(readFileSync(join(f.b.worktreePath,'code.txt'),'utf8'),'baseline\n');
 assert.deepEqual(readFileSync(join(f.b.worktreePath,'.trellis/.runtime/sessions',f.b.contextId+'.json')),pointer);
 const revision=readBinding(f.root,f.task).materials.revision;await f.op('refresh');assert.equal(readBinding(f.root,f.task).materials.revision,revision);
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.sourceDrift.count,0);
});

test('target-only ancestry stays B: later source update conflicts and refuses the whole plan',async t=>{
 const f=await prepared(t);f.target('research/topic.md','target research');await f.op('refresh');
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.targetChanges.count,1);
 f.source('research/topic.md','source revised research');f.source('prd.md','another update');
 const preview=await f.op('refresh',{confirm:false});assert.equal(preview.applicable,false);assert.equal(preview.conflicts.count,1);
 await assert.rejects(f.op('refresh'),/conflict/);assert.equal(f.text('prd.md'),'Requirements\n');assert.equal(f.text('research/topic.md'),'target research');assert.equal(readBinding(f.root,f.task).preparationState,'ready');
});

test('new directory dependencies, detach/reselect and physical deletion retain edited orphan',async t=>{
 const f=await prepared(t), manifest=JSON.stringify({file:f.task+'/research',type:'directory'});
 f.source('research/new/sub.md','new dependency');f.source('implement.jsonl',manifest);await f.op('refresh');assert.equal(f.text('research/new/sub.md'),'new dependency');
 f.source('implement.jsonl',JSON.stringify({file:'.trellis/spec/spec.md'}));f.source('check.jsonl',JSON.stringify({file:'.trellis/spec/spec.md'}));
 assert.equal((await f.op('refresh',{confirm:false})).actions.find(a=>a.path.endsWith('/research/topic.md')).action,'detached');await f.op('refresh');assert.ok(existsSync(join(f.b.worktreePath,f.task,'research/topic.md')));
 f.target('research/topic.md','orphan evidence');rmSync(join(f.root,f.task,'research/topic.md'));rmSync(join(f.root,f.task,'research/new/sub.md'));
 await f.op('refresh');assert.equal(f.text('research/topic.md'),'orphan evidence');assert.ok(!existsSync(join(f.b.worktreePath,f.task,'research/new/sub.md')));
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.conflicts.count,0);
});

test('task projection ignores order/runtime, retains lifecycle on refresh and blocks identity changes/collection',async t=>{
 const f=await prepared(t), before=f.b.materials.revision;
 const src=JSON.parse(readFileSync(join(f.root,f.task,'task.json')));src.branch='other';src.completedAt=null;f.source('task.json',JSON.stringify(src,null,1));
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.sourceDrift.count,0);await f.op('refresh');assert.equal(readBinding(f.root,f.task).materials.revision,before);
 src.meta={requirement:'new'};src.base_branch='review-base';f.source('task.json',JSON.stringify(src));await f.op('refresh');
 const target=JSON.parse(f.text('task.json'));assert.equal(target.branch,f.b.branch);assert.equal(target.status,'in_progress');assert.deepEqual(target.meta,src.meta);assert.equal(target.base_branch,'review-base');assert.ok(!Object.hasOwn(target,'completedAt'));
 src.name='renamed';f.source('task.json',JSON.stringify(src));await assert.rejects(f.op('refresh'),/conflict/);
 await assert.rejects(f.op('collect',{files:[f.task+'/task.json']}),/never writes/);
});

test('collect explicit report is idempotent and does not accept unrelated source drift or advance input revision',async t=>{
 const f=await prepared(t), revision=f.b.materials.revision;f.target('research/report.md','new report');f.source('prd.md','unsynced source requirement');
 const candidates=await f.op('collect',{confirm:false});assert.ok(candidates.candidates.paths.includes(f.task+'/research/report.md'));assert.ok(!existsSync(join(f.root,f.task,'research/report.md')));
 await assert.rejects(f.op('collect'),/explicit/);
 const files=[f.task+'/research/report.md'];await f.op('collect',{files});assert.equal(readFileSync(join(f.root,files[0]),'utf8'),'new report');assert.equal(readBinding(f.root,f.task).materials.revision,revision);
 const snapshot=readBinding(f.root,f.task).materials.snapshotId;await f.op('collect',{files});assert.equal(readBinding(f.root,f.task).materials.snapshotId,snapshot);
 assert.ok((await f.op('status')).materials.sourceDrift.count);await assert.rejects(queryWorktree(f.root,f.task,true),/drift/);
});

test('collect bilateral/unknown conflicts, missing deletion, aliases, binary and hidden files preserve source',async t=>{
 const f=await prepared(t);f.source('research/topic.md','source edit');f.target('research/topic.md','target edit');await assert.rejects(f.op('collect',{files:[f.task+'/research/topic.md']}),/conflict/);assert.equal(readFileSync(join(f.root,f.task,'research/topic.md'),'utf8'),'source edit');
 f.source('research/new.md','unknown source');f.target('research/new.md','unknown target');await assert.rejects(f.op('collect',{files:[f.task+'/research/new.md']}),/conflict/);
 rmSync(join(f.b.worktreePath,f.task,'research/topic.md'));await assert.rejects(f.op('collect',{files:[f.task+'/research/topic.md']}));assert.ok(existsSync(join(f.root,f.task,'research/topic.md')));
 f.target('research/binary.md',Buffer.from([0xff,0]));f.target('.env','secret');symlinkSync('new.md',join(f.b.worktreePath,f.task,'research/alias.md'));
 for(const files of [[f.task+'/research/new.md',f.task+'/research/new.md'],[f.task+'/research/../prd.md'],[f.task+'/.env'],[f.task+'/research/alias.md'],[f.task+'/research/binary.md'],['code.txt']])await assert.rejects(f.op('collect',{files}));
});

test('collect manifest requires explicitly selected matching dependency and advances lineage without target writes',async t=>{
 const f=await prepared(t), revision=f.b.materials.revision;
 f.target('research/new.md','new output');f.target('implement.jsonl',JSON.stringify({file:f.task+'/research/new.md'}));
 const files=[f.task+'/implement.jsonl'];const bad=await f.op('collect',{files,confirm:false});assert.equal(bad.applicable,false);await assert.rejects(f.op('collect',{files}),/graph|dependency/);
 files.push(f.task+'/research/new.md');await f.op('collect',{files});assert.equal(readFileSync(join(f.root,files[1]),'utf8'),'new output');assert.notEqual(readBinding(f.root,f.task).materials.revision,revision);
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.sourceDrift.count,0);
});

test('running and unknown leases block preview/confirm refresh and collect; baseline edits never copied',async t=>{
 const f=await prepared(t);for(const state of ['running','unknown']){
 writeExecution(f.b,{bindingId:f.b.bindingId,requestId:'r',role:'trellis-implement',state,ownerPid:process.pid,ownerToken:'x',createdAt:new Date().toISOString()});
 for(const action of ['refresh','collect'])for(const confirm of [false,true])await assert.rejects(f.op(action,{confirm,files:action==='collect'?[f.task+'/prd.md']:undefined}),/active|unknown/);
 }
 writeExecution(f.b,{bindingId:f.b.bindingId,requestId:'r',role:'trellis-implement',state:'completed',ownerPid:process.pid,ownerToken:'x',createdAt:new Date().toISOString()});
 f.put('.trellis/spec/spec.md','source baseline changed');const preview=await f.op('refresh',{confirm:false});assert.equal(preview.applicable,false);await assert.rejects(f.op('refresh'),/baseline/);assert.equal(readFileSync(join(f.b.worktreePath,'.trellis/spec/spec.md'),'utf8'),'committed specification\n');
});

test('equal changed materials advance revision even with identical target checkout, making old check stale',async t=>{
 const f=await prepared(t);f.source('prd.md','equal approved change');f.target('prd.md','equal approved change');
 writeExecution(f.b,{bindingId:f.b.bindingId,requestId:'check',role:'trellis-check',state:'completed',ownerPid:process.pid,ownerToken:'x',createdAt:new Date().toISOString(),materialRevision:f.b.materials.revision,finalSnapshot:worktreeSnapshot(f.b)});
 assert.match((await f.op('status')).note,/stale/);const before=worktreeSnapshot(f.b);await f.op('refresh');assert.equal(worktreeSnapshot(f.b),before);assert.match((await f.op('status')).note,/stale/);
});

test('first prepare records hook changes as target divergence and corrupt snapshot blocks query',async t=>{
 const f=fixture(t), c=await f.run();const script=join(c.binding.worktreePath,'.trellis/scripts/task.py');let code=readFileSync(script,'utf8');code=code.replace("print('started')","(root / "+JSON.stringify(f.task+'/prd.md')+").write_text('hook requirements')\n print('started')");writeFileSync(script,code);
 await f.run({action:'prepare'});const b=readBinding(f.root,f.task);assert.equal((await queryWorktree(f.root,f.task,true)).materials.targetChanges.count,1);
 f.put(f.task+'/prd.md','approved update');await assert.rejects(f.run({action:'refresh'}),/conflict/);
 const snap=join(f.root,'.trellis/.runtime/pi-trellis/materials',b.bindingId,b.materials.snapshotId+'.json');writeFileSync(snap,'null');await assert.rejects(queryWorktree(f.root,f.task,true),/snapshot|JSON object/);
});

test('partial disk failure retains prior snapshot/error and prior successful writes without rollback',async t=>{
 const f=await prepared(t);f.source('prd.md','new requirement');f.source('design.md','new design');
 const script=`import sys,json
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(new URL('../runtime',import.meta.url).pathname)})
from pi_trellis_worktree import manager,materials
old=materials.os.replace
count=0
def fail(src,dst):
 global count
 if str(src).split('/')[-1].startswith('.material-'):
  count+=1
  if count==1: raise OSError('fixture disk failure')
 return old(src,dst)
materials.os.replace=fail
try: manager.manage('refresh',${JSON.stringify(f.root)},${JSON.stringify(f.task)},confirm=True)
except OSError: pass
`;
 const {execFileSync}=await import('node:child_process');execFileSync(process.env.TRELLIS_PYTHON||'python3',['-B','-c',script]);
 const binding=readBinding(f.root,f.task);assert.equal(binding.preparationState,'error');assert.equal(binding.materials.snapshotId,f.b.materials.snapshotId);assert.equal(f.text('design.md'),'new design');assert.equal(f.text('prd.md'),'Requirements\n');await assert.rejects(queryWorktree(f.root,f.task,true),/ready/);
});

test('collect selected source-only manifest preserves source and leaves unrelated drift unaccepted',async t=>{
 const f=await prepared(t);f.source('implement.jsonl',JSON.stringify({file:'.trellis/spec/spec.md'}));
 await f.op('collect',{files:[f.task+'/implement.jsonl']});assert.ok((await f.op('status')).materials.sourceDrift.count);await assert.rejects(queryWorktree(f.root,f.task,true),/drift/);
});

test('new target external references must match source baseline; missing baseline cannot be approved by refresh',async t=>{
 const f=await prepared(t);f.target('implement.jsonl',JSON.stringify({file:'.trellis/spec/missing.md'}));
 mkdirSync(join(f.b.worktreePath,'.trellis/spec'),{recursive:true});writeFileSync(join(f.b.worktreePath,'.trellis/spec/missing.md'),'target-only baseline');
 await assert.rejects(queryWorktree(f.root,f.task,true),/baseline/);const preview=await f.op('refresh',{confirm:false});assert.equal(preview.applicable,false);await assert.rejects(f.op('refresh'),/baseline/);
});

test('successful safe removal cleans only associated snapshots after user-preserving integration',async t=>{
 const f=await prepared(t),snapdir=join(f.root,'.trellis/.runtime/pi-trellis/materials',f.b.bindingId);
 const other=join(f.root,'.trellis/.runtime/pi-trellis/materials/other');mkdirSync(other,{recursive:true});writeFileSync(join(other,'kept.json'),'other binding');
 const {execFileSync}=await import('node:child_process');
 execFileSync('git',['-C',f.b.worktreePath,'add',f.task]);execFileSync('git',['-C',f.b.worktreePath,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','preserve fixture task']);
 await f.op('remove',{integratedInto:f.b.branch});assert.ok(!existsSync(snapdir));assert.equal(readFileSync(join(other,'kept.json'),'utf8'),'other binding');
});

test('explicitly collected new directory-reference input updates selection without accepting unrelated inputs',async t=>{
 const f=await prepared(t);f.source('implement.jsonl',JSON.stringify({file:f.task+'/research',type:'directory'}));await f.op('refresh');const revision=readBinding(f.root,f.task).materials.revision;
 f.target('research/new.md','selected by existing directory');await f.op('collect',{files:[f.task+'/research/new.md']});assert.notEqual(readBinding(f.root,f.task).materials.revision,revision);
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.sourceDrift.count,0);
});


test('target-only task identity changes conflict before ready query or refresh, without rewriting metadata',async t=>{
 const f=await prepared(t);
 const original=f.text('task.json');
 for(const key of ['id','name']){
  const record=JSON.parse(original);record[key]='different task identity';f.target('task.json',JSON.stringify(record));
  const status=await f.op('status');assert.equal(status.materials.conflicts.count,1);
  await assert.rejects(queryWorktree(f.root,f.task,true),/conflict/);
  await assert.rejects(f.op('refresh'),/conflict/);
  assert.equal(JSON.parse(f.text('task.json'))[key],'different task identity');
 }
});

test('refresh impossible target ancestor is rejected in preview before any partial write',async t=>{
 const f=await prepared(t);
 f.source('design.md','would be copied before research');
 f.source('research/new/sub.md','approved nested file');
 f.source('implement.jsonl',JSON.stringify({file:f.task+'/research/new/sub.md'}));
 f.target('research/new','existing target output, not a directory');
 const preview=await f.op('refresh',{confirm:false});assert.equal(preview.applicable,false);
 await assert.rejects(f.op('refresh'),/directory|ancestor|graph/);
 assert.equal(readBinding(f.root,f.task).preparationState,'ready');
 assert.ok(!existsSync(join(f.b.worktreePath,f.task,'design.md')));
 assert.equal(f.text('research/new'),'existing target output, not a directory');
});

test('task-directory symlink cannot redirect refresh/collect into another task',async t=>{
 const f=await prepared(t), taskPath=join(f.b.worktreePath,f.task), alias=join(f.b.worktreePath,'.trellis/tasks/other-task');
 const {renameSync}=await import('node:fs');renameSync(taskPath,alias);symlinkSync('other-task',taskPath);
 f.source('prd.md','approved change');writeFileSync(join(alias,'research/report.md'),'other task report');
 for(const [action,extra] of [['refresh',{}],['collect',{files:[f.task+'/research/report.md']}]]){
  await assert.rejects(f.op(action,{...extra,confirm:false}),/symlink/);
  await assert.rejects(f.op(action,extra),/symlink/);
 }
 assert.equal(readFileSync(join(alias,'prd.md'),'utf8'),'Requirements\n');assert.ok(!existsSync(join(f.root,f.task,'research/report.md')));
 assert.equal(readBinding(f.root,f.task).preparationState,'ready');
});

test('prepare rejects internal task-directory and selected directory aliases before copying',async t=>{
 for(const route of ['task','research']){
  const f=fixture(t);
  const {renameSync}=await import('node:fs');
  if(route==='task'){
   renameSync(join(f.root,f.task),join(f.root,'.trellis/tasks/other-task'));symlinkSync('other-task',join(f.root,f.task));
  }else{
   renameSync(join(f.root,f.task,'research'),join(f.root,f.task,'other-research'));symlinkSync('other-research',join(f.root,f.task,'research'));
  }
  const c=await f.run();await assert.rejects(f.run({action:'prepare'}),/symlink/);
  assert.equal(readBinding(f.root,f.task).preparationState,'unprepared');assert.ok(!existsSync(join(c.binding.worktreePath,f.task)));
 }
});

test('external top-level source task store remains valid for refresh and explicit collection',async t=>{
 const f=await prepared(t), external=join(f.root,'approved-task-store');
 const {renameSync}=await import('node:fs');renameSync(join(f.root,'.trellis/tasks'),external);symlinkSync(external,join(f.root,'.trellis/tasks'));
 f.source('prd.md','new external source requirements');await f.op('refresh');assert.equal(f.text('prd.md'),'new external source requirements');
 f.target('research/report.md','selected report');await f.op('collect',{files:[f.task+'/research/report.md']});assert.equal(readFileSync(join(external,'10-13-task/research/report.md'),'utf8'),'selected report');
 assert.equal((await queryWorktree(f.root,f.task,true)).materials.sourceDrift.count,0);
});
