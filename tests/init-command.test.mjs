import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import trellis from '../extensions/trellis.ts';
import { plan, apply, inspect } from '../lib/initialization/engine.ts';
import { registerInitCommand, planSummary, boundedDialog } from '../lib/initialization/command.ts';

function fixture(t,{hasUI=true,selections=[],inputs=[],confirm=false}={}) {
 const root=mkdtempSync(join(tmpdir(),'pi-init-command-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dialogs=[],notices=[],commands=new Map(),events=new Map();let reloads=0,refreshes=0;const finalConfirm={value:confirm};
 const ctx={cwd:root,hasUI,ui:{notify:(text,type)=>notices.push({text,type}),select:async(title,options)=>{dialogs.push({title,options,...(title.startsWith('Confirm ')?{message:title}: {})});if(title.startsWith('Confirm '))return finalConfirm.value===true?options[1]:undefined;const choice=selections.shift();return typeof choice==='number'?options[choice]:choice;},input:async(title,placeholder)=>{dialogs.push({title,placeholder});return inputs.shift();},confirm:async(title,message)=>{dialogs.push({title,message});return confirm;}},reload:async()=>{reloads++;},sessionManager:{getSessionId:()=>root,getSessionFile:()=>undefined}};
 const pi={registerCommand:(name,command)=>commands.set(name,command),registerTool:()=>{},on:(name,fn)=>events.set(name,fn),events:{on:()=>()=>{},emit:()=>{}},sendMessage:(message,options)=>{assert.ok(!options?.triggerTurn);notices.push({text:message.content,type:'info'});}};
 trellis(pi);registerInitCommand(pi,async()=>{refreshes++;});
 const run=args=>commands.get('trellis-init').handler(args,ctx);
 return {root,ctx,dialogs,notices,commands,run,selections,inputs,finalConfirm,get reloads(){return reloads;},get refreshes(){return refreshes;}};
}

test('native command accepts no arguments; legacy arguments and noUI are static migration/interaction guides',async t=>{
 const f=fixture(t);assert.ok(f.commands.has('trellis-init'));assert.equal(f.commands.get('trellis-init').getArgumentCompletions,undefined);
 for(const args of ['--help','--check','--force','--user','--user Dev','--user --check','--check --check','--user A --user B','--help --check','--user ""','--user "../escape"','--user "unterminated','anything','x'.repeat(5000)]){
  await f.run(args);assert.equal(f.notices.at(-1).type,'error');assert.match(f.notices.at(-1).text,/no longer accepts arguments/);assert.deepEqual(readdirSync(f.root),[]);
 }
 assert.equal(f.dialogs.length,0);
 const headless=fixture(t,{hasUI:false});await headless.run('');assert.deepEqual(readdirSync(headless.root),[]);assert.match(headless.notices.at(-1).text,/interactive mode or an RPC client/);assert.equal(headless.dialogs.length,0);
 f.selections.push('Help');await f.run(' \n ');assert.match(f.notices.at(-1).text,/Usage: \/trellis-init — no arguments/);
});

for(const options of [{selections:[]},{selections:['Cancel']},{selections:['Initialize project','Cancel']},{selections:['Initialize project','Enter a different username'],inputs:[]},{selections:['Initialize project','Enter a different username'],inputs:['Dev'],confirm:false},{selections:['Initialize project'],confirm:undefined}]) {
 test(`cancel before publish leaves no files (${JSON.stringify(options)})`,async t=>{const f=fixture(t,options);await f.run('');assert.deepEqual(readdirSync(f.root),[]);assert.equal(f.reloads,0);assert.equal(f.refreshes,0);});
}

test('custom input retries validation; English summary and actual persistent identity; reload is terminal',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['../unsafe',' . ','Dev 名字'],confirm:true});await f.run('');assert.equal(inspect(f.root).developer,'Dev 名字');assert.equal(f.reloads,1);assert.equal(f.refreshes,1);assert.equal(f.notices.filter(n=>n.type==='error').length,2);
 assert.match(f.dialogs.find(d=>d.message).message,/Developer: Dev 名字/);assert.match(f.dialogs.find(d=>d.message).message,/No active task will be selected/);assert.match(f.notices.at(-1).text,/No active task selected/);assert.ok(!existsSync(join(f.root,'.trellis/.runtime/sessions')));assert.match(f.dialogs.find(d=>d.placeholder).placeholder,/Safe single directory/);
});

test('username uses native menu/input without flags; ready Check preserves existing identity',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['Test User'],confirm:true});await f.run('');assert.equal(f.dialogs.length,4);assert.equal(inspect(f.root).developer,'Test User');assert.equal(f.reloads,1);
 const before=readFileSync(join(f.root,'.trellis/.developer'));f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/Developer: Test User/);assert.deepEqual(readFileSync(join(f.root,'.trellis/.developer')),before);
 await f.run('--user Other');assert.match(f.notices.at(-1).text,/no longer accepts arguments/);assert.deepEqual(readFileSync(join(f.root,'.trellis/.developer')),before);
});

test('historical identity menu/onboarding preserves bytes and runtime; status/cancel route is read-only',async t=>{
 const f=fixture(t);apply(plan(f.root,'Historical User'));rmSync(join(f.root,'.trellis/.developer'));writeFileSync(join(f.root,'.trellis/workspace/Historical User/journal-1.md'),'history');f.selections.push('Check');await f.run('');assert.equal(existsSync(join(f.root,'.trellis/.developer')),false);
 f.selections.push('Set up developer identity','Historical User — Existing workspace');f.finalConfirm.value=true;await f.run('');assert.equal(inspect(f.root).developer,'Historical User');assert.equal(readFileSync(join(f.root,'.trellis/workspace/Historical User/journal-1.md'),'utf8'),'history');assert.equal(f.reloads,0);assert.equal(f.refreshes,1);assert.ok(existsSync(join(f.root,'.trellis/tasks/00-join-historical-user/task.json')));assert.match(f.dialogs.at(-1).message,/Runtime, config, spec and workflow remain unchanged/);
 f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/Developer: Historical User/);
});

test('unsafe history/symlinks are skipped; bounded candidate list labels Git separately and no fake prefill',async t=>{
 const f=fixture(t);apply(plan(f.root,'Owner'));rmSync(join(f.root,'.trellis/.developer'));
 for(let i=0;i<30;i++)mkdirSync(join(f.root,'.trellis/workspace',`Dev-${String(i).padStart(2,'0')}`));mkdirSync(join(f.root,'.trellis/workspace','bad\nname'));
 f.selections.push('Set up developer identity','Cancel');await f.run('');const options=f.dialogs.at(-1).options;assert.ok(options.filter(o=>o.endsWith('Existing workspace')).length<=20);assert.ok(!options.some(o=>o.includes('bad\n')));assert.ok(f.dialogs[0].options.includes('Set up developer identity'));
});

test('unknown runtime and interrupted divergence notify error without writes or claimed success',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis'));f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/Adopt existing project/);assert.ok(f.dialogs[0].options.includes('Adopt existing project'));assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));
 const g=fixture(t,{selections:['Retry interrupted initialization','Enter a different username'],inputs:['Dev'],confirm:true});const p=plan(g.root,'Dev');assert.throws(()=>apply(p,{afterWrite:()=>{throw Error('forced');}}));writeFileSync(join(g.root,p.actions[0].path),'divergent');await g.run('');assert.equal(g.notices.at(-1).type,'error');assert.match(g.notices.at(-1).text,/preserved/);assert.equal(g.reloads,0);assert.equal(existsSync(join(g.root,'.trellis/.developer')),false);
});

test('Unicode/spaces/quotes username is entered natively with no argument completion owner',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['A "Quoted" 名字'],confirm:true});await f.run('');
 assert.equal(f.commands.get('trellis-init').getArgumentCompletions,undefined);assert.equal(inspect(f.root).developer,'A "Quoted" 名字');
});

test('Apply template uses scope selection and one action-list confirmation, cancel is read-only',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));writeFileSync(join(f.root,'.trellis/workflow.md'),'custom');
 const before=readFileSync(join(f.root,'.trellis/workflow.md'));
 f.selections.push('Apply template','Workflow + Spec','Cancel');await f.run('');
 assert.deepEqual(readFileSync(join(f.root,'.trellis/workflow.md')),before);assert.ok(!existsSync(join(f.root,'.trellis/.runtime/template-backups')));
 assert.deepEqual(f.dialogs.at(-1).options,['Cancel','Apply template']);assert.match(f.dialogs.at(-1).title,/Replace  .trellis\/workflow.md/);assert.match(f.dialogs.at(-1).title,/Same  .trellis\/spec\/index.md/);assert.match(f.dialogs.at(-1).title,/Scope: Workflow \+ Spec/);assert.match(f.dialogs.at(-1).title,/Replace: 1.*Same: 4/);assert.ok(f.dialogs.at(-1).title.indexOf('backups will be saved') < f.dialogs.at(-1).title.indexOf('Replace  .trellis'));
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
 f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/Missing: \.trellis\/scripts\/task\.py/);
 assert.ok(f.dialogs.at(-1).options.includes('Update project resources'));assert.ok(!f.dialogs.at(-1).options.includes('Repair missing resources'));
 f.selections.push('Update project resources');f.finalConfirm.value=false;await f.run('');assert.equal(existsSync(join(f.root,'.trellis/scripts/task.py')),false);
 f.selections.push('Update project resources');f.finalConfirm.value=true;await f.run('');assert.ok(existsSync(join(f.root,'.trellis/scripts/task.py')));assert.equal(f.notices.at(-1).text,'Project resources updated.');
 f.selections.push('Update project resources');await f.run('');assert.equal(f.notices.at(-1).text,'Project resources are up to date.');
});

 test('Adopt native menu confirms once, cancels read-only, then reloads with supported runtime',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis'));writeFileSync(join(f.root,'.trellis/workflow.md'),'legacy workflow');
 f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/Adopt existing project/);assert.doesNotMatch(f.notices.at(-1).text,/Preserve  |legacy paths/);assert.equal(f.dialogs.length,1);assert.deepEqual(readdirSync(join(f.root,'.trellis')),['workflow.md']);
 f.selections.push('Adopt existing project','Cancel');await f.run('');assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));assert.deepEqual(f.dialogs.at(-1).options,['Cancel','Adopt existing project']);assert.match(f.dialogs.at(-1).title,/without backups/);assert.ok(f.dialogs.at(-1).title.split('\n').length<=14,'adoption confirmation must stay bounded');assert.equal(f.reloads,0);assert.equal(f.refreshes,0);
 f.selections.push('Adopt existing project','Adopt existing project');await f.run('');assert.equal(inspect(f.root).state,'supported');assert.equal(f.reloads,1);assert.equal(f.refreshes,1);assert.match(f.notices.at(-1).text,/Project adopted/);assert.equal(readFileSync(join(f.root,'.trellis/workflow.md'),'utf8'),'legacy workflow');
 });

test('dialog core warnings stay bounded before path examples; Check is one bounded static diagnostic report',async t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.trellis/scripts/hooks'),{recursive:true});
 for(let i=0;i<300;i++)writeFileSync(join(f.root,`.trellis/scripts/legacy-${i}.py`),'legacy');
 f.selections.push('Check');await f.run('');const report=f.notices.at(-1).text;assert.ok(Buffer.byteLength(report)<=16*1024);assert.doesNotMatch(report,/legacy-299.py/);assert.match(report,/Trellis Check · Issues found/);
 f.selections.push('Adopt existing project','Cancel');await f.run('');
 for(const dialog of f.dialogs){const lines=(dialog.title??'').split('\n');assert.ok(lines.length<=14,`dialog title too tall: ${lines.length}`);}
 assert.match(f.dialogs.at(-1).title,/Legacy — left in place: 30[0-9] paths/);assert.doesNotMatch(f.dialogs.at(-1).title,/--check|Full per-path list/);assert.match(report,/Scope: current session/);assert.match(report,/runtime probe not performed/);assert.match(report,/Effective configuration/);assert.match(report,/worktree identity\/runtime not probed/);
 assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));
 const g=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['Dev'],confirm:true});await g.run('');
 const message=g.dialogs.find(d=>d.message).message;assert.ok(message.split('\n').length<=14,'initialization confirmation must stay bounded');assert.match(message,/additional path examples omitted/);assert.match(message,/No backups or automatic rollback/);assert.match(message,/Create: \d+/);
});


test('init from Git subdirectory targets nearest repository root, not cwd',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['Dev'],confirm:true});mkdirSync(join(f.root,'.git'));const sub=join(f.root,'src');mkdirSync(sub);f.ctx.cwd=sub;
 await f.run('');assert.equal(inspect(f.root).state,'ready');assert.equal(existsSync(join(sub,'.trellis')),false);assert.ok(f.dialogs.some(d=>(d.title??'').includes(f.root)));assert.equal(f.reloads,1);
});

test('existing project template action from subdirectory uses discovered root',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));const sub=join(f.root,'src');mkdirSync(sub);f.ctx.cwd=sub;writeFileSync(join(f.root,'.trellis/workflow.md'),'custom');
 f.selections.push('Apply template','Workflow','Apply template');await f.run('');assert.notEqual(readFileSync(join(f.root,'.trellis/workflow.md'),'utf8'),'custom');assert.equal(existsSync(join(sub,'.trellis')),false);assert.equal(f.refreshes,1);assert.ok(f.dialogs.at(-1).title.includes(`Project: ${inspect(f.root).root}`));
});

test('large init/identity plan summaries keep fixed warnings and category counts before bounded examples',()=>{
 for(const operation of ['initialize','identity']){
  const value={root:'/project',operation,user:'Dev',workspaceReused:true,task:'.trellis/tasks/00-join-dev',taskReused:true,releaseId:'release',actions:Array.from({length:200},(_,i)=>({path:`path-${i}`,original:i%2?{sha256:'hash',mode:0o644}:null}))};
  const text=boundedDialog(planSummary(value));assert.ok(text.split('\n').length<=14);assert.match(text,/Project: \/project/);assert.match(text,/Scope:/);assert.match(text,/Create: 100.*Update owned block: 100/);assert.match(text,/Existing user bytes, tasks and journals are preserved/);assert.match(text,/No active task will be selected/);assert.match(text,/No backups or automatic rollback/);assert.match(text,/additional path examples omitted/);assert.doesNotMatch(text,/--check|full report/);
  if(operation==='identity')assert.match(text,/Runtime, config, spec and workflow remain unchanged/);
 }
});

test('menu snapshot cannot authorize Initialize after project state changes during native selection',async t=>{
 const f=fixture(t,{confirm:true});f.ctx.ui.select=async(title,options)=>{f.dialogs.push({title,options});mkdirSync(join(f.root,'.trellis'));return 'Initialize project';};
 await f.run('');assert.equal(f.notices.at(-1).type,'error');assert.match(f.notices.at(-1).text,/Project changed or operation unavailable/);assert.deepEqual(readdirSync(join(f.root,'.trellis')),[]);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);assert.ok(!f.dialogs.some(d=>d.message));
});

test('large safe update confirmation retains no-backup/preservation warnings before path examples',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));const manifest=JSON.parse(readFileSync(join(f.root,'.trellis/.pi-trellis.json')));
 for(const path of Object.keys(manifest.files))rmSync(join(f.root,path));
 f.selections.push('Update project resources');let summary;
 const original=f.ctx.ui.select;f.ctx.ui.select=async(title,options)=>{if(title.startsWith('Confirm ')){summary=title;assert.deepEqual(options,['Cancel','Update project resources']);return 'Cancel';}return original(title,options);};await f.run('');
 assert.ok(summary.split('\n').length<=14);assert.match(summary,/Scope: manifest-owned resources/);assert.ok(summary.includes(`Restore: ${Object.keys(manifest.files).length}`));assert.match(summary,/Identity, tasks, journals and user-modified documents remain unchanged/);assert.match(summary,/No backups or automatic rollback/);assert.match(summary,/additional path examples omitted/);assert.doesNotMatch(summary,/--check|full report/);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);
 assert.ok(Object.keys(manifest.files).every(path=>!existsSync(join(f.root,path))));
});

test('multiline/control project paths cannot push fixed confirmation warnings below the bound',()=>{
 const value={root:'/project'+('\n'.repeat(30))+'\x1b[31m',operation:'identity',user:'Dev',workspaceReused:true,task:'.trellis/tasks/00-join-dev',taskReused:true,releaseId:'release',actions:Array.from({length:100},()=>({path:'path\nexample',original:null}))};
 const text=boundedDialog('Confirm Pi Trellis initialization\n'+planSummary(value));assert.ok(text.split('\n').length<=14);assert.match(text,/No backups or automatic rollback/);assert.match(text,/Runtime, config, spec and workflow remain unchanged/);assert.doesNotMatch(text,/\x1b/);assert.match(text,/\\u\{a\}/);
});

test('safe final native confirmation defaults to Cancel and cancellation publishes nothing',async t=>{
 const f=fixture(t,{selections:['Initialize project','Enter a different username'],inputs:['Dev']});const original=f.ctx.ui.select;
 f.ctx.ui.select=async(title,options)=>{if(title.startsWith('Confirm ')){assert.deepEqual(options,['Cancel','Initialize project']);return options[0];}return original(title,options);};
 await f.run('');assert.deepEqual(readdirSync(f.root),[]);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);
});
