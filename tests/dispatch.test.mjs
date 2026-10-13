import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { canonicalPath } from '../lib/config.ts';
import { manageWorktree } from './worktree-fixture.mjs';
import { registerDispatchTool } from '../lib/subagent-rpc.ts';
import { readExecution } from '../lib/executions.ts';
import { apply, plan } from '../lib/initialization/engine.ts';
import { readBinding } from '../lib/bindings.ts';

function fixture(t) {
 const root=canonicalPath(mkdtempSync(join(tmpdir(),'pi-dispatch-')));
 const cwd=process.cwd();process.chdir(root);t.after(()=>{process.chdir(cwd);rmSync(root,{recursive:true,force:true});});
 const put=(path,data)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),data);};
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');put('.gitignore','/.worktree/\n/.trellis/.runtime/\n/.pi/\n');put('code.txt','base');
 apply(plan(root,'Fixture'));put('.trellis/spec/spec.md','BASE target spec');
 git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','fixture');
 const task='.trellis/tasks/test';
 put('.pi/settings.json',JSON.stringify({extensions:[new URL('../extensions/trellis.ts',import.meta.url).pathname]}));
 put(task+'/task.json','{"status":"in_progress"}');put(task+'/prd.md','Task requirements');
 for(const role of ['implement','check'])put(task+'/'+role+'.jsonl','{"file":".trellis/spec/spec.md"}');
 for(const role of ['implement','check','research'])put('.pi/agents/trellis-'+role+'.md',`---\nname: trellis-${role}\ntools: read, write, edit, bash, find, grep\nextensions: true\nisolation: off\n---\nRole\n`);
 const run=(extra={})=>manageWorktree({cwd:root,task,action:'create',confirm:true,...extra});
 const handlers=new Map(), events=new Map(), tools=new Map();
 const bus={on:(name,handler)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(handler);return()=>events.get(name).delete(handler);},emit:(name,data)=>{for(const handler of [...(events.get(name)||[])])handler(data);}};
 const pi={events:bus,on:(name,fn)=>handlers.set(name,fn),registerTool:tool=>tools.set(tool.name,tool)};
 registerDispatchTool(pi,async()=>task);
 const replies=[];
 bus.on('subagents:rpc:ping',({requestId})=>bus.emit('subagents:rpc:ping:reply:'+requestId,{success:true,data:{version:2}}));
 let seq=0, spawnFailure;
 bus.on('subagents:rpc:spawn',params=>{replies.push(params);bus.emit('subagents:rpc:spawn:reply:'+params.requestId,spawnFailure ? {success:false,error:spawnFailure} : {success:true,data:{id:'agent-'+(++seq)}});});
 const call=input=>tools.get('trellis_dispatch').execute('tool',input,undefined,undefined,{cwd:root});
 const dispatch=(agent='trellis-implement')=>call({agent,prompt:'work'});
 return {root,task,put,run,dispatch,call,bus,replies,handlers,git,failSpawn:error=>{spawnFailure=error;}};
}

test('dispatch requires ready, uses target cwd/off, returns real id and prevents same-dir overlap',async t=>{
 const f=fixture(t);await assert.rejects(f.dispatch(),/ready worktree/);const c=await f.run();
 await assert.rejects(f.dispatch(),/ready worktree/);await f.run({action:'prepare'});
 const first=await f.dispatch();assert.equal(first.details.agentId,'agent-1');
 assert.equal(f.replies[0].options.cwd,c.binding.worktreePath);assert.equal(f.replies[0].options.isolation,'off');
 assert.match(f.replies[0].prompt,/Review base:/);assert.match(f.replies[0].prompt,/BASE target spec/);
 await assert.rejects(f.dispatch('trellis-check'),/running\/unknown/);
 f.bus.emit('subagents:completed',{id:'agent-1'});
 assert.equal(readExecution(c.binding).state,'completed');
 const second=await f.dispatch('trellis-check');assert.equal(second.details.agentId,'agent-2');
 f.bus.emit('subagents:failed',{id:'agent-2',error:'cancelled'});assert.equal(readExecution(c.binding).state,'failed');
});

test('early completed event before RPC reply cannot leave a stale running lease',async t=>{
 const f=fixture(t);const c=await f.run();await f.run({action:'prepare'});
 f.bus.on('subagents:rpc:spawn',()=>f.bus.emit('subagents:completed',{id:'agent-1'}));
 await f.dispatch();assert.equal(readExecution(c.binding).state,'completed');
});

test('check snapshot becomes stale after manual change; terminal event releases directory but never marks acceptance',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 await f.dispatch('trellis-check');f.bus.emit('subagents:completed',{id:'agent-1'});
 const current=await f.run({action:'status'});assert.match(current.note,/current snapshot/);
 writeFileSync(join(c.binding.worktreePath,'code.txt'),'manual change');
 const stale=await f.run({action:'status'});assert.match(stale.note,/stale/);
});

test('shutdown retains unknown lease instead of claiming a running child stopped',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 await f.dispatch();f.handlers.get('session_shutdown')();
 assert.equal(readExecution(c.binding).state,'unknown');
 await assert.rejects(f.dispatch(),/shut down/);
});

test('changed target pointer or incompatible customized agent rejected without RPC spawn',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 f.put('.pi/agents/trellis-implement.md','---\nname: trellis-implement\nisolation: worktree\n---\n');
 await assert.rejects(f.dispatch(),/conflicts/);assert.equal(f.replies.length,0);
 writeFileSync(join(c.binding.worktreePath,'.trellis/.runtime/sessions',c.binding.contextId+'.json'),'{"current_task":".trellis/tasks/other"}');
 await assert.rejects(f.dispatch(),/does not match|Trellis CLI failed/);assert.equal(f.replies.length,0);
});


test('dispatch old call shape/optional empty task works; stop requires no agent/prompt and waits for terminal evidence',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 const first=await f.call({action:'',task:'',agent:'trellis-implement',prompt:'old shape'});assert.equal(first.details.agentId,'agent-1');
 let stopped;
 f.bus.on('subagents:rpc:stop',params=>{stopped=params;f.bus.emit('subagents:rpc:stop:reply:'+params.requestId,{success:true});});
 for(const input of [{action:'stop',agent:'trellis-implement'},{action:'stop',prompt:'ignored prose'}]){
  stopped=undefined;await assert.rejects(f.call(input),/dispatch-only/);assert.equal(stopped,undefined);assert.equal(readExecution(c.binding).state,'running');
 }
 const result=await f.call({action:'stop',task:'',agent:'',prompt:''});assert.equal(stopped.agentId,'agent-1');assert.equal(result.details.agentId,'agent-1');assert.equal(readExecution(c.binding).state,'running');
 await assert.rejects(f.dispatch(),/running\/unknown/);
 f.bus.emit('subagents:completed',{id:'agent-1'});assert.equal(readExecution(c.binding).state,'completed');
 for(const input of [{agent:'trellis-implement',prompt:''},{agent:'trellis-implement',prompt:'   '},{action:'invalid'},{task:' ',agent:'trellis-implement',prompt:'work'},{agent:''}])await assert.rejects(f.call(input));
});

test('host rechecks Python ready rules inside source lock after provider ping; no spawn/lease on changed pointer',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 f.bus.on('subagents:rpc:ping',()=>writeFileSync(join(c.binding.worktreePath,'.trellis/.runtime/sessions',c.binding.contextId+'.json'),'{"current_task":"wrong"}'));
 await assert.rejects(f.dispatch(),/does not match|Trellis CLI failed/);assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
});

test('failed/unknown provider stop retains lease; source task and actual host cwd/config remain required',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 await assert.rejects(f.call({action:'stop'}),/No known agent id/);
 f.put('.pi/settings.json','{}');await assert.rejects(f.dispatch(),/Persist/);assert.equal(f.replies.length,0);
 f.put('.pi/settings.json',JSON.stringify({extensions:[new URL('../extensions/trellis.ts',import.meta.url).pathname]}));
 f.put(f.task+'/task.json','{"status":"planning"}');await assert.rejects(f.dispatch(),/in_progress/);assert.equal(f.replies.length,0);
 f.put(f.task+'/task.json','{"status":"in_progress"}');
 process.chdir(c.binding.worktreePath);try{await assert.rejects(f.dispatch(),/source project root/);}finally{process.chdir(f.root);}
 await f.dispatch();f.bus.on('subagents:rpc:stop',params=>f.bus.emit('subagents:rpc:stop:reply:'+params.requestId,{success:false,error:'stop denied'}));
 await assert.rejects(f.call({action:'stop'}),/stop denied/);assert.equal(readExecution(c.binding).state,'running');
});


test('spawn failure remains unknown with long-lived host owner instead of releasing ambiguous child',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});f.failSpawn('ambiguous spawn failed');
 await assert.rejects(f.dispatch(),/ambiguous spawn/);const record=readExecution(c.binding);assert.equal(record.state,'unknown');assert.equal(record.ownerPid,process.pid);assert.equal(record.agentId,undefined);
 await assert.rejects(f.run({action:'recover'}),/still alive/);assert.equal(readExecution(c.binding).state,'unknown');
});

test('modified target runtime is rejected before execution/spawn, even if it attempts lock-time material changes',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 // Change material during the second query, when the source lock is held.
 writeFileSync(join(c.binding.worktreePath,'.trellis/scripts/task.py'),`import pathlib,os,json
if pathlib.Path(${JSON.stringify(join(f.root,'.trellis/.runtime/pi-trellis/worktrees.lock'))}).exists():
 pathlib.Path(${JSON.stringify(f.task+'/prd.md')}).write_text('LATEST lock-time task material')
p=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')
print(json.dumps({'current_task':json.loads(p.read_text()),'source':'session:'+os.environ['TRELLIS_CONTEXT_ID']}))
`);
 await assert.rejects(f.call({agent:'trellis-implement',prompt:'First line\n\tSecond line'}),/runtime is missing or modified/);
 assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
 assert.equal(readFileSync(join(c.binding.worktreePath,f.task,'prd.md'),'utf8'),'Task requirements');
});

test('shutdown while spawn reply is pending retains unknown with returned id, never revives running lease',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 f.bus.on('subagents:rpc:spawn',()=>f.handlers.get('session_shutdown')());
 await assert.rejects(f.dispatch(),/shut down during spawn/);
 const record=readExecution(c.binding);assert.equal(record.state,'unknown');assert.equal(record.agentId,'agent-1');assert.equal(record.ownerPid,process.pid);
});

test('approved source drift rejects before spawn/lease; refresh permits a versioned dispatch',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});f.put(f.task+'/prd.md','approved update');
 await assert.rejects(f.dispatch(),/drift/);assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
 await f.run({action:'refresh'});await f.dispatch();const record=readExecution(c.binding);assert.equal(record.materialRevision,readBinding(f.root,f.task).materials.revision);assert.match(f.replies[0].prompt,/approved update/);
});

test('target baseline change during locked query is rejected, not silently accepted as task output',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 f.bus.on('subagents:rpc:ping',()=>writeFileSync(join(c.binding.worktreePath,'.trellis/spec/spec.md'),'unapproved target baseline'));
 await assert.rejects(f.dispatch(),/baseline/);assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
});

test('modified target task CLI cannot change material through a ready query',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 writeFileSync(join(c.binding.worktreePath,'.trellis/scripts/task.py'),`import pathlib,os,json
lock=pathlib.Path(${JSON.stringify(join(f.root,'.trellis/.runtime/pi-trellis/worktrees.lock'))})
if lock.exists():
 counter=pathlib.Path('.trellis/.runtime/query-count')
 n=int(counter.read_text())+1 if counter.exists() else 1
 counter.write_text(str(n))
 if n==2: pathlib.Path(${JSON.stringify(f.task+'/prd.md')}).write_text('changed after render')
p=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')
print(json.dumps({'current_task':json.loads(p.read_text()),'source':'session:'+os.environ['TRELLIS_CONTEXT_ID']}))
`);
 await assert.rejects(f.dispatch(),/runtime is missing or modified/);assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
});

test('target-only task identity mismatch rejects all managed roles without a spawn or lease',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 writeFileSync(join(c.binding.worktreePath,f.task,'task.json'),JSON.stringify({status:'in_progress',branch:c.binding.branch,id:'another-task'}));
 for(const role of ['trellis-implement','trellis-check','trellis-research'])await assert.rejects(f.dispatch(role),/conflict/);
 assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
});

test('supported source/target release mismatch rejects before provider ping/spawn or target CLI execution',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});let ping=0;f.bus.on('subagents:rpc:ping',()=>{ping++;});
 const manifest=join(f.root,'.trellis/.pi-trellis.json'),original=readFileSync(manifest);const changed=JSON.parse(original);changed.runtimeReleaseId='unsupported-release';writeFileSync(manifest,JSON.stringify(changed));await assert.rejects(f.dispatch(),/Unsupported project runtime release/);assert.equal(ping,0);assert.equal(f.replies.length,0);writeFileSync(manifest,original);
 const target=join(c.binding.worktreePath,'.trellis/.pi-trellis.json'),record=JSON.parse(readFileSync(target));record.runtimeReleaseId='unsupported-target';writeFileSync(target,JSON.stringify(record));await assert.rejects(f.dispatch(),/Unsupported project runtime release/);assert.equal(f.replies.length,0);assert.equal(readExecution(c.binding),undefined);
});

test('valid multiline dispatch prose retains exact lines on supported real runtime',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});await f.call({agent:'trellis-implement',prompt:'First line\n\tSecond line'});assert.match(f.replies[0].prompt,/First line\n\tSecond line/);assert.equal(readExecution(c.binding).agentId,'agent-1');
});
