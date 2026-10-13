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
 const f=fixture(t);mkdirSync(join(f.root,'.trellis'));await f.run('--user Dev');assert.equal(f.notices.at(-1).type,'error');assert.match(f.notices.at(-1).text,/General migration is not available/);assert.equal(f.dialogs.length,0);
 const g=fixture(t,{selections:['Retry interrupted initialization'],confirm:true});const p=plan(g.root,'Dev');assert.throws(()=>apply(p,{afterWrite:()=>{throw Error('forced');}}));writeFileSync(join(g.root,p.actions[0].path),'divergent');await g.run('--user Dev');assert.equal(g.notices.at(-1).type,'error');assert.match(g.notices.at(-1).text,/preserved/);assert.equal(g.reloads,0);assert.equal(existsSync(join(g.root,'.trellis/.developer')),false);
});

test('username completion quotes Unicode/spaces/quotes reversibly and requires no UI writes',async t=>{
 const f=fixture(t),cwd=process.cwd();apply(plan(f.root,'A "Quoted" 名字'));rmSync(join(f.root,'.trellis/.developer'));process.chdir(f.root);
 try {const items=await f.commands.get('trellis-init').getArgumentCompletions('--user A');assert.equal(items.length,1);assert.equal(parseInitArguments(items[0].value).user,'A "Quoted" 名字');}finally{process.chdir(cwd);}
 assert.equal(existsSync(join(f.root,'.trellis/.developer')),false);
});

test('update restores missing resources with confirmation and status contains per-file health',async t=>{
 const f=fixture(t);apply(plan(f.root,'Dev'));rmSync(join(f.root,'.trellis/scripts/task.py'));
 f.selections.push('View project status');await f.run('');assert.match(f.notices.at(-1).text,/Missing — will restore/);
 assert.ok(f.dialogs.at(-1).options.includes('Update project resources'));assert.ok(!f.dialogs.at(-1).options.includes('Repair missing resources'));
 f.selections.push('Update project resources');f.ctx.ui.confirm=async()=>false;await f.run('');assert.equal(existsSync(join(f.root,'.trellis/scripts/task.py')),false);
 f.selections.push('Update project resources');f.ctx.ui.confirm=async()=>true;await f.run('');assert.ok(existsSync(join(f.root,'.trellis/scripts/task.py')));assert.equal(f.notices.at(-1).text,'Project resources updated.');
 f.selections.push('Update project resources');await f.run('');assert.equal(f.notices.at(-1).text,'Project resources are up to date.');
});
