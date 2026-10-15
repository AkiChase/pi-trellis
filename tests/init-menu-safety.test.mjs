import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs, { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import test from 'node:test';
import * as commandModule from '../lib/initialization/command.ts';
import { apply, plan } from '../lib/initialization/engine.ts';

function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'pi-init-menu-safety-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(path,bytes)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);};
 let command,refreshes=0,reloads=0;const selections=[],dialogs=[],notices=[],messages=[];
 const pi={registerCommand:(name,value)=>{assert.equal(name,'trellis-init');command=value;},sendMessage:(message,options)=>{assert.ok(!options?.triggerTurn);assert.equal(message.triggerTurn,undefined);messages.push(message);},sendUserMessage:()=>assert.fail('no user/model message'),exec:()=>assert.fail('no host subprocess')};
 commandModule.registerInitCommand(pi,async()=>{refreshes++;});
 const ctx={cwd:root,hasUI:true,mode:'rpc',reload:async()=>{reloads++;},ui:{notify:(text,type)=>notices.push({text,type}),select:async(title,options)=>{dialogs.push({title,options});return selections.shift();},confirm:()=>assert.fail('read-only menu must not confirm'),input:()=>assert.fail('read-only menu must not input')}};
 return {root,put,ctx,selections,dialogs,notices,messages,run:args=>command.handler(args,ctx),command,get refreshes(){return refreshes;},get reloads(){return reloads;}};
}
function snapshot(root) {
 const output={};
 function walk(dir) {for(const name of readdirSync(dir)){const path=join(dir,name),info=lstatSync(path),key=path.slice(root.length);output[key]=[info.mode,info.isSymbolicLink()?readlinkSync(path):info.isDirectory()?'directory':readFileSync(path).toString('base64')];if(info.isDirectory())walk(path);}}
 walk(root);return output;
}
function spySubprocesses(t) {
 const calls=[];
 for(const name of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])t.mock.method(childProcess,name,(...args)=>{calls.push([name,...args]);throw Error('subprocess must not run during static interaction');});
 syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});return calls;
}

test('legacy arguments and noUI perform zero filesystem reads or subprocesses even with invalid cwd',async t=>{
 const f=fixture(t),calls=spySubprocesses(t);f.ctx.cwd='/missing/should-not-be-resolved';
 for(const name of ['lstatSync','statSync','realpathSync','readFileSync','readdirSync','openSync','mkdirSync','writeFileSync','unlinkSync','renameSync'])t.mock.method(fs,name,()=>assert.fail(`${name} must not run`));
 syncBuiltinESMExports();
 try {
  for(const args of ['--user "李 小明"','--check','--help','unknown','"unterminated','x'.repeat(10000)])await f.run(args);
  assert.ok(f.notices.every(n=>/no longer accepts arguments/.test(n.text)));
  f.ctx.hasUI=false;await f.run('');await f.run(' \n ');assert.equal(f.messages.length,2);assert.ok(f.messages.every(m=>/requires native interaction/.test(m.content)));
  assert.deepEqual(calls,[]);assert.equal(f.dialogs.length,0);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);
  assert.equal(commandModule.parseInitArguments,undefined);assert.equal(f.command.getArgumentCompletions,undefined);
 } finally {t.mock.restoreAll();syncBuiltinESMExports();}
});

test('package source hash drift leaves only the safe base menu without Python/Git or writes',async t=>{
 for(const source of ['runtime/task.py','agents/trellis-check.md','resources/templates/workflow.md']){
  const f=fixture(t),before=snapshot(f.root),calls=spySubprocesses(t),actualRead=fs.readFileSync;
  t.mock.method(fs,'readFileSync',(path,...args)=>String(path).endsWith('/'+source)?Buffer.from('unverified package bytes'):actualRead(path,...args));syncBuiltinESMExports();
  try {f.selections.push('Help');await f.run('');assert.deepEqual(f.dialogs.at(-1).options,['Check','Help','Cancel']);assert.match(f.dialogs.at(-1).title,/hash mismatch/);assert.deepEqual(calls,[]);assert.deepEqual(snapshot(f.root),before);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);}
  finally {t.mock.restoreAll();syncBuiltinESMExports();}
 }
});

const states=['fresh','manifest-less','ready','supported','missing runtime','modified runtime','empty manifest','malformed manifest','invalid identity','incomplete','invalid operation','external lock','managed target','symlink marker','unsafe workspace','HOME'];
for(const kind of states)test(`${kind}: static native RPC menu always exposes Check/Help/Cancel without Python/Git or writes`,async t=>{
 const f=fixture(t);
 if(['ready','supported','missing runtime','modified runtime','invalid identity','unsafe workspace'].includes(kind))apply(plan(f.root,'Fixture'));
 if(kind==='supported')rmSync(join(f.root,'.trellis/.developer'));
 if(kind==='missing runtime')rmSync(join(f.root,'.trellis/scripts/task.py'));
 if(kind==='modified runtime')f.put('.trellis/scripts/task.py','user modified runtime');
 if(kind==='manifest-less')f.put('.trellis/workflow.md','legacy workflow');
 if(kind==='empty manifest')f.put('.trellis/.pi-trellis.json','');
 if(kind==='malformed manifest')f.put('.trellis/.pi-trellis.json','{bad');
 if(kind==='invalid identity')f.put('.trellis/.developer','');
 if(kind==='incomplete'){const p=plan(f.root,'Fixture');assert.throws(()=>apply(p,{afterWrite:()=>{throw Error('interrupted');}}));}
 if(kind==='invalid operation')f.put('.trellis/.runtime/init-operation.json','{}');
 if(kind==='external lock')f.put('.trellis/.runtime/init.lock','owner');
 if(kind==='managed target')f.put('.trellis/.runtime/pi-trellis/binding.json','{}');
 if(kind==='symlink marker')symlinkSync('missing',join(f.root,'.trellis'));
 if(kind==='unsafe workspace'){rmSync(join(f.root,'.trellis/.developer'));symlinkSync('/missing/workspace',join(f.root,'.trellis/workspace/Unsafe'));}
 const oldHome=process.env.HOME;if(kind==='HOME')process.env.HOME=f.root;
 const before=snapshot(f.root),calls=spySubprocesses(t);
 try {
  for(const selection of ['Cancel','Help',undefined]){f.selections.push(selection);await f.run('');assert.deepEqual(f.dialogs.at(-1).options.slice(-3),['Check','Help','Cancel']);}
  assert.deepEqual(calls,[]);assert.deepEqual(snapshot(f.root),before);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);assert.equal(f.messages.length,0);
  if(['empty manifest','malformed manifest','invalid operation','external lock','managed target','symlink marker','HOME','invalid identity','modified runtime'].includes(kind))assert.deepEqual(f.dialogs[0].options,['Check','Help','Cancel']);
  if(kind==='fresh')assert.ok(f.dialogs[0].options.includes('Initialize project'));
  if(kind==='incomplete')assert.ok(f.dialogs[0].options.includes('Retry interrupted initialization'));
  if(kind==='missing runtime')assert.ok(f.dialogs[0].options.includes('Update project resources'));
 } finally {if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;}
});

const onlyIsolatedProbe=calls=>calls.every(([name,exe,argv])=>name==='spawn'&&typeof exe==='string'&&!/git/.test(exe)&&JSON.stringify(argv.slice(0,5))===JSON.stringify(['-I','-S','-B','-X','utf8']));
for(const kind of ['ready','manifest-less','empty manifest','incomplete','managed target','symlink marker'])test(`${kind}: Check retains failures and scope, preserves bytes and never refreshes/reloads/starts a model turn`,async t=>{
 const f=fixture(t);
 if(kind==='ready')apply(plan(f.root,'Fixture'));
 if(kind==='manifest-less')f.put('.trellis/workflow.md','legacy bytes\r\n');
 if(kind==='empty manifest')f.put('.trellis/.pi-trellis.json','');
 if(kind==='incomplete'){const p=plan(f.root,'Fixture');assert.throws(()=>apply(p,{afterWrite:()=>{throw Error('interrupted');}}));}
 if(kind==='managed target')f.put('.trellis/.runtime/pi-trellis/binding.json','{}');
 if(kind==='symlink marker')symlinkSync('missing',join(f.root,'.trellis'));
 const calls=spySubprocesses(t),before=snapshot(f.root);f.put('.git/index',Buffer.from([0,255,4,3]));if(kind!=='symlink marker')f.put('.trellis/.runtime/sessions/own.json','{"current_task":".trellis/tasks/keep"}');const guarded=snapshot(f.root);f.selections.push('Check');await f.run('');
 const report=f.notices.at(-1).text;assert.match(report,/Trellis Check ·/);assert.match(report,/Runtime probe blocked/);assert.match(report,/Read-only: no files changed/);
 if(kind==='empty manifest')assert.match(report,/File is empty; expected JSON/);
 if(kind==='incomplete')assert.match(report,/incomplete/);
 if(kind==='managed target')assert.match(report,/managed task worktree/);
 if(kind==='symlink marker')assert.match(report,/symlinked/);
 assert.ok(onlyIsolatedProbe(calls),JSON.stringify(calls));assert.deepEqual(snapshot(f.root),guarded);assert.ok(Object.keys(before).every(path=>JSON.stringify(guarded[path])===JSON.stringify(before[path])));assert.equal(f.refreshes,0);assert.equal(f.reloads,0);assert.equal(f.messages.length,0);
});

test('manifest-less Check never runs adoption/project Python/Git and preserves independent failures',async t=>{
 const f=fixture(t);f.put('.trellis/workflow.md','legacy');f.put('.pi/settings.json','{broken');const before=snapshot(f.root),calls=spySubprocesses(t);
 f.selections.push('Check');await f.run('');assert.match(f.notices.at(-1).text,/No managed project manifest/);assert.match(f.notices.at(-1).text,/Invalid configuration JSON/);assert.match(f.notices.at(-1).text,/Runtime probe blocked/);
 assert.ok(onlyIsolatedProbe(calls),JSON.stringify(calls));assert.equal(f.notices.length,1);assert.deepEqual(snapshot(f.root),before);assert.equal(f.refreshes,0);assert.equal(f.reloads,0);
});
