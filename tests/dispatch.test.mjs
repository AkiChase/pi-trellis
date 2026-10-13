import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { canonicalPath } from '../lib/config.ts';
import { manageWorktree } from '../lib/worktree-manager.ts';
import { registerDispatchTool } from '../lib/subagent-rpc.ts';
import { readExecution } from '../lib/executions.ts';
import { readBinding } from '../lib/bindings.ts';

function fixture(t) {
 const root=canonicalPath(mkdtempSync(join(tmpdir(),'pi-dispatch-')));
 const cwd=process.cwd();process.chdir(root);t.after(()=>{process.chdir(cwd);rmSync(root,{recursive:true,force:true});});
 const put=(path,data)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),data);};
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');put('.gitignore','/.worktree/\n/.trellis/.runtime/\n/.pi/\n');put('code.txt','base');put('.trellis/spec/spec.md','BASE target spec');
 put('.trellis/scripts/task.py',`import sys,json,os,pathlib
p=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')
if sys.argv[1]=='start':
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps({'dir':sys.argv[2]}))
else: print(json.dumps({'current_task':json.loads(p.read_text()),'source':'session:'+os.environ['TRELLIS_CONTEXT_ID']}))
`);
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
 let seq=0;
 bus.on('subagents:rpc:spawn',params=>{replies.push(params);bus.emit('subagents:rpc:spawn:reply:'+params.requestId,{success:true,data:{id:'agent-'+(++seq)}});});
 const dispatch=(agent='trellis-implement')=>tools.get('trellis_dispatch').execute('tool',{agent,prompt:'work'},undefined,undefined,{cwd:root});
 return {root,task,put,run,dispatch,bus,replies,handlers};
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
 await assert.rejects(f.dispatch(),/running\/unknown/);
});

test('changed target pointer or incompatible customized agent rejected without RPC spawn',async t=>{
 const f=fixture(t),c=await f.run();await f.run({action:'prepare'});
 f.put('.pi/agents/trellis-implement.md','---\nname: trellis-implement\nisolation: worktree\n---\n');
 await assert.rejects(f.dispatch(),/conflicts/);assert.equal(f.replies.length,0);
 writeFileSync(join(c.binding.worktreePath,'.trellis/.runtime/sessions',c.binding.contextId+'.json'),'{"dir":".trellis/tasks/other"}');
 await assert.rejects(f.dispatch(),/does not match/);assert.equal(f.replies.length,0);
});
