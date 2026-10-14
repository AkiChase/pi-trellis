import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import test from 'node:test';
import trellis from '../extensions/trellis.ts';
import { plan, apply, inspect } from '../lib/initialization/engine.ts';
import { parseInitArguments, registerInitCommand } from '../lib/initialization/command.ts';

function fixture(t,{hasUI=true,selections=[],inputs=[],confirm=false}={}) {
 const root=mkdtempSync(join(tmpdir(),'pi-init-command-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dialogs=[],notices=[],commands=new Map(),events=new Map();let reloads=0,refreshes=0;
 const ctx={cwd:root,hasUI,ui:{notify:(text,type)=>notices.push({text,type}),select:async(title,options)=>{dialogs.push({title,options});const choice=selections.shift();return typeof choice==='number'?options[choice]:choice;},input:async(title,placeholder)=>{dialogs.push({title,placeholder});return inputs.shift();},confirm:async(title,message)=>{dialogs.push({title,message});return confirm;}},reload:async()=>{reloads++;},sessionManager:{getSessionId:()=>root,getSessionFile:()=>undefined}};
 const pi={registerCommand:(name,command)=>commands.set(name,command),registerTool:()=>{},on:(name,fn)=>events.set(name,fn),events:{on:()=>()=>{},emit:()=>{}},sendMessage:(message,options)=>{assert.ok(!options?.triggerTurn);notices.push({text:message.content,type:'info'});}};
 trellis(pi);registerInitCommand(pi,async()=>{refreshes++;});
 const run=args=>commands.get('trellis-init').handler(args,ctx);
 return {root,ctx,dialogs,notices,commands,run,selections,inputs,get reloads(){return reloads;},get refreshes(){return refreshes;}};
}

test('native command exists without scripts; strict flags/help/check/noUI never write',async t=>{
 const f=fixture(t);assert.ok(f.commands.has('trellis-init'));await f.run('--help');await f.run('--check');assert.deepEqual(readdirSync(f.root),[]);assert.match(f.notices[0].text,/Usage: \/trellis-init/);assert.equal(f.dialogs.length,0);
 for(const args of ['--force','--user','--user --check','--check --check','--user A --user B','--help --check','--user ""','--user "../escape"','--user "unterminated']){assert.throws(()=>parseInitArguments(args));await f.run(args);assert.equal(f.notices.at(-1).type,'error');assert.deepEqual(readdirSync(f.root),[]);}
 assert.deepEqual(parseInitArguments('--user "李 小明"'),{user:'李 小明',check:false,help:false});
 const headless=fixture(t,{hasUI:false});await headless.run('--user Dev');assert.deepEqual(readdirSync(headless.root),[]);assert.match(headless.notices.at(-1).text,/interactive or RPC UI/);assert.equal(headless.dialogs.length,0);
});

for(const options of [{selections:[]},{selections:['Cancel']},{selections:['Initialize project','Cancel']},{selections:['Initialize project','Enter a different username'],inputs:[]},{selections:['Initialize project','Enter a different username'],inputs:['Dev'],confirm:false},{selections:['Initialize project'],confirm:undefined}]) {
 test(`cancel before publish leaves no files (${JSON.stringify(options)})`,async t=>{const f=fixture(t,options);await f.run(options.selections.length===1?'--user Dev':'');assert.deepEqual(readdirSync(f.root),[]);assert.equal(f.reloads,0);assert.equal(f.refreshes,0);});
}

test('custom input retries validation; English summary and actual persistent identity; reload is terminal',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['../unsafe',' . ','Dev 名字'],confirm:true});await f.run('');assert.equal(inspect(f.root).developer,'Dev 名字');assert.equal(f.reloads,1);assert.equal(f.refreshes,1);assert.equal(f.notices.filter(n=>n.type==='error').length,2);
 assert.match(f.dialogs.find(d=>d.message).message,/Developer: Dev 名字/);assert.match(f.dialogs.find(d=>d.message).message,/No active task will be selected/);assert.match(f.notices.at(-1).text,/No active task selected/);assert.ok(!existsSync(join(f.root,'.trellis/.runtime/sessions')));assert.match(f.dialogs.find(d=>d.placeholder).placeholder,/Safe single directory/);
});

test('--user skips username selection, not operation menu or final confirmation',async t=>{
 const f=fixture(t,{selections:['Initialize project'],confirm:true});await f.run('--user "Test User"');assert.equal(f.dialogs.length,2);assert.equal(inspect(f.root).developer,'Test User');assert.equal(f.reloads,1);
 const before=readFileSync(join(f.root,'.trellis/.developer'));await f.run('--user "Test User"');assert.deepEqual(readFileSync(join(f.root,'.trellis/.developer')),before);assert.match(f.notices.at(-1).text,/Already ready/);await f.run('--user Other');assert.match(f.notices.at(-1).text,/actual Test User; requested Other/);assert.deepEqual(readFileSync(join(f.root,'.trellis/.developer')),before);
});

test('historical identity menu/onboarding preserves bytes and runtime; status/cancel route is read-only',async t=>{
 const f=fixture(t);apply(plan(f.root,'Historical User'));rmSync(join(f.root,'.trellis/.developer'));writeFileSync(join(f.root,'.trellis/workspace/Historical User/journal-1.md'),'history');f.selections.push('View project status');await f.run('');assert.equal(existsSync(join(f.root,'.trellis/.developer')),false);
 f.selections.push('Set up developer identity','Historical User — Existing workspace');f.ctx.ui.confirm=async(title,message)=>{f.dialogs.push({title,message});return true;};await f.run('');assert.equal(inspect(f.root).developer,'Historical User');assert.equal(readFileSync(join(f.root,'.trellis/workspace/Historical User/journal-1.md'),'utf8'),'history');assert.equal(f.reloads,0);assert.equal(f.refreshes,1);assert.ok(existsSync(join(f.root,'.trellis/tasks/00-join-historical-user/task.json')));assert.match(f.dialogs.at(-1).message,/Runtime, config, spec and workflow remain unchanged/);
 f.selections.push('View project status');await f.run('');assert.match(f.notices.at(-1).text,/Developer: Historical User/);
});

test('unsafe history/symlinks are skipped; bounded candidate list labels Git separately and no fake prefill',async t=>{
 const f=fixture(t);apply(plan(f.root,'Owner'));rmSync(join(f.root,'.trellis/.developer'));
 for(let i=0;i<30;i++)mkdirSync(join(f.root,'.trellis/workspace',`Dev-${String(i).padStart(2,'0')}`));mkdirSync(join(f.root,'.trellis/workspace','bad\nname'));
 f.selections.push('Set up developer identity','Cancel');await f.run('');const options=f.dialogs.at(-1).options;assert.ok(options.filter(o=>o.endsWith('Existing workspace')).length<=20);assert.ok(!options.some(o=>o.includes('bad\n')));assert.ok(f.dialogs[0].title.includes('Skipped unsafe workspace'));
});

test('unknown runtime and interrupted divergence notify error without writes or claimed success',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis'));f.selections.push('View project status');await f.run('--user Dev');assert.match(f.notices.at(-1).text,/Adopt existing project/);assert.ok(f.dialogs[0].options.includes('Adopt existing project'));assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));
 const g=fixture(t,{selections:['Retry interrupted initialization'],confirm:true});const p=plan(g.root,'Dev');assert.throws(()=>apply(p,{afterWrite:()=>{throw Error('forced');}}));writeFileSync(join(g.root,p.actions[0].path),'divergent');await g.run('--user Dev');assert.equal(g.notices.at(-1).type,'error');assert.match(g.notices.at(-1).text,/preserved/);assert.equal(g.reloads,0);assert.equal(existsSync(join(g.root,'.trellis/.developer')),false);
});

test('username completion quotes Unicode/spaces/quotes reversibly and requires no UI writes',async t=>{
 const f=fixture(t),cwd=process.cwd();apply(plan(f.root,'A "Quoted" 名字'));rmSync(join(f.root,'.trellis/.developer'));process.chdir(f.root);
 try {const items=await f.commands.get('trellis-init').getArgumentCompletions('--user A');assert.equal(items.length,1);assert.equal(parseInitArguments(items[0].value).user,'A "Quoted" 名字');}finally{process.chdir(cwd);}
 assert.equal(existsSync(join(f.root,'.trellis/.developer')),false);
});

test('Apply template uses scope selection and one action-list confirmation, cancel is read-only',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));writeFileSync(join(f.root,'.trellis/workflow.md'),'custom');
 const before=readFileSync(join(f.root,'.trellis/workflow.md'));
 f.selections.push('Apply template','Workflow + Spec','Cancel');await f.run('');
 assert.deepEqual(readFileSync(join(f.root,'.trellis/workflow.md')),before);assert.ok(!existsSync(join(f.root,'.trellis/.runtime/template-backups')));
 assert.deepEqual(f.dialogs.at(-1).options,['Cancel','Apply template']);assert.match(f.dialogs.at(-1).title,/Replace  .trellis\/workflow.md/);assert.match(f.dialogs.at(-1).title,/Same  .trellis\/spec\/index.md/);
 f.selections.push('Apply template','Workflow + Spec','Apply template');await f.run('');
 assert.notDeepEqual(readFileSync(join(f.root,'.trellis/workflow.md')),before);assert.equal(f.refreshes,1);assert.equal(f.reloads,0);assert.match(f.notices.at(-1).text,/Template applied.*\nBackup:/);
 assert.ok(!f.dialogs.some(d=>d.message));
});

test('Apply template is available without developer identity and hidden for unhealthy runtime',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));rmSync(join(f.root,'.trellis/.developer'));f.selections.push('Apply template','Spec','Apply template');await f.run('');assert.ok(!existsSync(join(f.root,'.trellis/.developer')));assert.equal(f.refreshes,1);
 rmSync(join(f.root,'.trellis/scripts/task.py'));f.selections.push('Cancel');await f.run('');assert.ok(!f.dialogs.at(-1).options.includes('Apply template'));
});

test('update restores missing resources with confirmation and status contains per-file health',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));rmSync(join(f.root,'.trellis/scripts/task.py'));
 f.selections.push('View project status');await f.run('');assert.match(f.notices.at(-1).text,/Missing — will restore/);
 assert.ok(f.dialogs.at(-1).options.includes('Update project resources'));assert.ok(!f.dialogs.at(-1).options.includes('Repair missing resources'));
 f.selections.push('Update project resources');f.ctx.ui.confirm=async()=>false;await f.run('');assert.equal(existsSync(join(f.root,'.trellis/scripts/task.py')),false);
 f.selections.push('Update project resources');f.ctx.ui.confirm=async()=>true;await f.run('');assert.ok(existsSync(join(f.root,'.trellis/scripts/task.py')));assert.equal(f.notices.at(-1).text,'Project resources updated.');
 f.selections.push('Update project resources');await f.run('');assert.equal(f.notices.at(-1).text,'Project resources are up to date.');
});

 test('Adopt native menu confirms once, cancels read-only, then reloads with supported runtime',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis'));writeFileSync(join(f.root,'.trellis/workflow.md'),'legacy workflow');
 await f.run('--check');assert.match(f.notices.at(-1).text,/Adopt existing project/);assert.match(f.notices.at(-1).text,/Preserve  \.trellis\/workflow\.md/);assert.equal(f.dialogs.length,0);assert.deepEqual(readdirSync(join(f.root,'.trellis')),['workflow.md']);
 f.selections.push('Adopt existing project','Cancel');await f.run('');assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));assert.deepEqual(f.dialogs.at(-1).options,['Cancel','Adopt existing project']);assert.match(f.dialogs.at(-1).title,/without backups/);assert.ok(f.dialogs.at(-1).title.split('\n').length<=14,'adoption confirmation must stay bounded');assert.equal(f.reloads,0);assert.equal(f.refreshes,0);
 f.selections.push('Adopt existing project','Adopt existing project');await f.run('');assert.equal(inspect(f.root).state,'supported');assert.equal(f.reloads,1);assert.equal(f.refreshes,1);assert.match(f.notices.at(-1).text,/Project adopted/);assert.equal(readFileSync(join(f.root,'.trellis/workflow.md'),'utf8'),'legacy workflow');
 });

test('dialog text stays bounded for huge legacy inventories and long plans; full report stays in --check',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis/scripts/hooks'),{recursive:true});
 for(let i=0;i<300;i++)writeFileSync(join(f.root,`.trellis/scripts/legacy-${i}.py`),'legacy');
 await f.run('--check');const report=f.notices.at(-1).text;assert.ok(report.split('\n').length>300);assert.match(report,/legacy-299.py/);
 f.selections.push('Adopt existing project','Cancel');await f.run('');
 for(const dialog of f.dialogs){const lines=(dialog.title??'').split('\n');assert.ok(lines.length<=14,`dialog title too tall: ${lines.length}`);}
 assert.match(f.dialogs.at(-1).title,/Legacy — left in place: 30[0-9] paths/);assert.match(f.dialogs.at(-1).title,/\/trellis-init --check/);
 assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));
 const g=fixture(t,{selections:['Initialize project'],confirm:true});await g.run('--user Dev');
 const message=g.dialogs.find(d=>d.message).message;assert.ok(message.split('\n').length<=14,'initialization confirmation must stay bounded');assert.match(message,/more lines; run \/trellis-init --check/);
});


test('init from Git subdirectory targets nearest repository root, not cwd',async t=>{
 const f=fixture(t,{selections:['Initialize project'],confirm:true});mkdirSync(join(f.root,'.git'));const sub=join(f.root,'src');mkdirSync(sub);f.ctx.cwd=sub;
 await f.run('--user Dev');assert.equal(inspect(f.root).state,'ready');assert.equal(existsSync(join(sub,'.trellis')),false);assert.ok(f.dialogs.some(d=>(d.title??'').includes(f.root)));assert.equal(f.reloads,1);
});

test('existing project template action from subdirectory uses discovered root',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));const sub=join(f.root,'src');mkdirSync(sub);f.ctx.cwd=sub;writeFileSync(join(f.root,'.trellis/workflow.md'),'custom');
 f.selections.push('Apply template','Workflow','Apply template');await f.run('');assert.notEqual(readFileSync(join(f.root,'.trellis/workflow.md'),'utf8'),'custom');assert.equal(existsSync(join(sub,'.trellis')),false);assert.equal(f.refreshes,1);assert.ok(f.dialogs.at(-1).title.includes(`Project: ${inspect(f.root).root}`));
});
