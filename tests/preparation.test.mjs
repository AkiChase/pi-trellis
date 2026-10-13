import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { canonicalPath } from '../lib/config.ts';
import { manageWorktree } from '../lib/worktree-manager.ts';
import { readBinding, markerFile } from '../lib/bindings.ts';
import { writeExecution } from '../lib/executions.ts';

export function fixture(t) {
 const root=canonicalPath(mkdtempSync(join(tmpdir(),'pi-w2-')));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(path,data)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),data);};
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');
 put('.gitignore','/.worktree/\n/.trellis/.runtime/\n/.pi/\n');
 put('code.txt','baseline\n');put('.trellis/spec/spec.md','committed specification\n');
 // Fixture models the documented task.py start/current contract, without copying runtime into product.
 put('.trellis/scripts/task.py',`import os,sys,json,pathlib
root=pathlib.Path.cwd()
token=os.environ['TRELLIS_CONTEXT_ID']
pointer=root/'.trellis/.runtime/sessions'/f'{token}.json'
if sys.argv[1]=='start':
 pointer.parent.mkdir(parents=True,exist_ok=True)
 pointer.write_text(json.dumps({'current_task':sys.argv[2]}))
 print('started')
else:
 task=json.loads(pointer.read_text())['current_task']
 print(json.dumps({'current_task':{'dir':task},'source':'session:'+token,'stale':False}))
`);
 git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','fixture');
 const task='.trellis/tasks/10-13-task';
 put(task+'/task.json',JSON.stringify({status:'in_progress',name:'10-13-task'}));
 put(task+'/prd.md','Requirements\n');put(task+'/research/topic.md','selected research\n');
 for(const role of ['implement','check']) put(task+'/'+role+'.jsonl',JSON.stringify({file:'.trellis/spec/spec.md'})+'\n'+JSON.stringify({file:task+'/research/topic.md'})+'\n');
 const run=(opts={})=>manageWorktree({action:'create',cwd:root,task,confirm:true,...opts});
 return {root,put,git,task,run};
}

test('prepare preview selects task-only materials; writes isolated pointer and ready without source changes',async t=>{
 const f=fixture(t),created=await f.run();
 const sourceRecord=readFileSync(join(f.root,f.task,'task.json'),'utf8');
 const preview=await f.run({action:'prepare',confirm:false});assert.equal(preview.preview,true);assert.match(preview.note,/after_start/);
 assert.ok(!existsSync(join(created.binding.worktreePath,f.task)));
 const ready=await f.run({action:'prepare'});assert.equal(ready.binding.preparationState,'ready');
 assert.equal(readFileSync(join(f.root,f.task,'task.json'),'utf8'),sourceRecord);
 assert.ok(existsSync(join(ready.binding.worktreePath,f.task,'research/topic.md')));
 assert.ok(!existsSync(join(f.root,'.trellis/.runtime/sessions')));
 const pointer=JSON.parse(readFileSync(join(ready.binding.worktreePath,'.trellis/.runtime/sessions',ready.binding.contextId+'.json')));
 assert.equal(pointer.current_task,f.task);
 assert.equal((await f.run({action:'prepare'})).reused,true);
});

test('planning task, missing reference and source baseline differences cannot be prepared',async t=>{
 const f=fixture(t);await f.run();
 f.put(f.task+'/task.json','{"status":"planning"}');await assert.rejects(f.run({action:'prepare'}),/normal workflow/);
 f.put(f.task+'/task.json','{"status":"in_progress"}');
 f.put('.trellis/spec/spec.md','uncommitted spec');await assert.rejects(f.run({action:'prepare'}),/differs|uncommitted/);
});

test('existing target materials are never overwritten',async t=>{
 const f=fixture(t),created=await f.run();
 const dest=join(created.binding.worktreePath,f.task);mkdirSync(dest,{recursive:true});writeFileSync(join(dest,'prd.md'),'user target PRD');
 await assert.rejects(f.run({action:'prepare'}),/conflict/);
 assert.equal(readFileSync(join(dest,'prd.md'),'utf8'),'user target PRD');assert.equal(readBinding(f.root,f.task).preparationState,'unprepared');
});

test('remove requires clean worktree and preserving reference, preview exposes ignored file risk',async t=>{
 const f=fixture(t),created=await f.run();
 const preview=await f.run({action:'remove',confirm:false,integratedInto:'HEAD'});assert.equal(preview.preview,true);assert.match(preview.note,/Ignored files/);
 writeFileSync(join(created.binding.worktreePath,'new.txt'),'unsaved');
 await assert.rejects(f.run({action:'remove',integratedInto:'HEAD'}),/untracked/);
 rmSync(join(created.binding.worktreePath,'new.txt'));
 await f.run({action:'remove',integratedInto:'HEAD'});
 assert.ok(!existsSync(created.binding.worktreePath));assert.equal(readBinding(f.root,f.task),undefined);
 assert.ok(f.git('rev-parse',`refs/heads/${created.binding.branch}`));
});

test('remove cannot delete current worktree or unknown execution; recover live owner refused',async t=>{
 const f=fixture(t),created=await f.run();
 await assert.rejects(f.run({action:'remove',cwd:created.binding.worktreePath,integratedInto:'HEAD'}),/current working/);
 writeExecution(created.binding,{bindingId:created.binding.bindingId,requestId:'r',state:'unknown',role:'trellis-check',ownerPid:process.pid,ownerToken:'token',createdAt:new Date().toISOString()});
 await assert.rejects(f.run({action:'remove',integratedInto:'HEAD'}),/active|unknown/);
 await assert.rejects(f.run({action:'recover'}),/still alive/);
});

test('preparing committed task metadata overrides only target branch, source stays unchanged',async t=>{
 const f=fixture(t);f.put(f.task+'/task.json','{"status":"in_progress","branch":"source-branch"}');
 f.git('add',f.task);f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','committed task');
 const created=await f.run();await f.run({action:'prepare'});
 assert.equal(JSON.parse(readFileSync(join(f.root,f.task,'task.json'))).branch,'source-branch');
 assert.equal(JSON.parse(readFileSync(join(created.binding.worktreePath,f.task,'task.json'))).branch,created.binding.branch);
});

test('dead-owner unknown execution is released only by confirmed recovery',async t=>{
 const f=fixture(t),created=await f.run();
 writeExecution(created.binding,{bindingId:created.binding.bindingId,requestId:'orphan',state:'unknown',role:'trellis-check',ownerPid:2147483647,ownerToken:'old',createdAt:new Date().toISOString()});
 const preview=await f.run({action:'recover',confirm:false});assert.equal(preview.preview,true);
 const recovered=await f.run({action:'recover'});assert.equal(recovered.binding.preparationState,'unprepared');
 await f.run({action:'prepare'});assert.equal(readBinding(f.root,f.task).preparationState,'ready');
});

test('remove rejects commits not preserved in the approved reference',async t=>{
 const f=fixture(t),created=await f.run();
 const target=created.binding.worktreePath;
 writeFileSync(join(target,'code.txt'),'new commit');
 execFileSync('git',['-C',target,'add','code.txt']);
 execFileSync('git',['-C',target,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','unintegrated fixture']);
 await assert.rejects(f.run({action:'remove',integratedInto:f.git('rev-parse','HEAD')}),/merge-base/);
 assert.ok(existsSync(target));
});

test('stale target can be explicitly unbound without deleting branch',async t=>{
 const f=fixture(t),created=await f.run();rmSync(created.binding.worktreePath,{recursive:true});
 const result=await f.run({action:'remove'});assert.match(result.note,/Removed/);assert.equal(readBinding(f.root,f.task),undefined);
});
