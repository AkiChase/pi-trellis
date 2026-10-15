import assert from 'node:assert/strict';
import test from 'node:test';
import fs, { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, chmodSync, readdirSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { collectDiagnostics, formatDiagnostics, DIAGNOSTIC_LIMITS } from '../lib/initialization/diagnostics.ts';
import { registerInitCommand } from '../lib/initialization/command.ts';
import { installRuntimeFixture } from './runtime-fixture.mjs';
import { verifyRuntime, packageRoot } from '../lib/initialization/engine.ts';
import trellis, { __internals } from '../extensions/trellis.ts';

function fixture(t, supported=false) {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'trellis-diagnostic-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 if(supported)installRuntimeFixture(root);
 const put=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),typeof value==='object'&&!Buffer.isBuffer(value)?JSON.stringify(value):value);};
 const task=(ref='.trellis/tasks/own',record={id:'own',status:'planning'})=>{put(ref+'/task.json',record);return ref;};
 const pointer=(value,key='own')=>put(`.trellis/.runtime/sessions/${key}.json`,{current_task:value});
 const check=(scope={})=>collectDiagnostics({cwd:root,contextId:'own',sessionId:'visible-session',...scope});
 return {root,put,task,pointer,check};
}
const item=(result,id)=>result.items.find(row=>row.id===id);
function snapshot(root) {
 const out={};
 const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name),s=lstatSync(path);out[path.slice(root.length)]=[s.mode,s.isSymbolicLink()?readlinkSync(path):s.isDirectory()?'directory':s.isFile()?readFileSync(path).toString('base64'):'special'];if(s.isDirectory())walk(path);}};
 walk(root);return out;
}
function guards(t,{forbidden=[]}={}) {
 const calls=[],reads=[],open=fs.openSync;
 for(const name of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])t.mock.method(childProcess,name,()=>{calls.push(name);assert.fail(`Forbidden subprocess: ${name}`);});
 for(const name of ['writeFileSync','mkdirSync','unlinkSync','renameSync','rmSync','chmodSync','fchmodSync','appendFileSync','truncateSync','symlinkSync'])t.mock.method(fs,name,()=>{calls.push(name);assert.fail(`Forbidden write: ${name}`);});
 t.mock.method(fs,'openSync',(path,flags,...args)=>{assert.equal(typeof flags,'number');assert.equal(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_APPEND),0);const text=String(path);reads.push(text);assert.ok(!forbidden.some(p=>text===p||text.startsWith(p+'/')),`Forbidden read: ${text}`);return open(path,flags,...args);});
 t.mock.method(fs,'readdirSync',()=>assert.fail('No task/session/history/material or directory enumeration'));
 syncBuiltinESMExports();
 const restore=()=>{t.mock.restoreAll();syncBuiltinESMExports();};t.after(restore);
 return {calls,reads,restore};
}

test('supported static report is short, no normal hashes/file inventory and no runtime health claim',t=>{
 const f=fixture(t,true);assert.ok(verifyRuntime(f.root));const before=snapshot(f.root),g=guards(t);
 const r=f.check(),report=formatDiagnostics(r);g.restore();
 assert.equal(item(r,'package').status,'pass');assert.equal(item(r,'manifest').status,'pass');assert.equal(item(r,'inventory:runtime').status,'pass');assert.equal(item(r,'documents').status,'pass');assert.equal(item(r,'current-task').status,'pass');assert.match(report,/No current task/);
 assert.equal(item(r,'runtime-probe').status,'blocked');assert.equal(item(r,'effective-config').status,'skipped');assert.equal(item(r,'worktree-probe').status,'skipped');assert.doesNotMatch(report,/All checks passed|allHealthy|[a-f0-9]{64}|scripts\/task\.py/);assert.ok(Buffer.byteLength(report)<5000);assert.equal(report.match(/Trellis Check ·/g).length,1);assert.deepEqual(g.calls,[]);assert.deepEqual(snapshot(f.root),before);
});

test('fresh project stops at nearest Git and does not report every missing runtime file',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.git'));const child=join(f.root,'nested');mkdirSync(child);const g=guards(t);const r=f.check({cwd:child});g.restore();
 assert.equal(r.scope.executionRoot,f.root);assert.equal(item(r,'project').summary,'Not initialized');assert.equal(item(r,'current-task').status,'skipped');assert.ok(!r.items.some(i=>i.id.startsWith('inventory:')));assert.doesNotMatch(formatDiagnostics(r),/Missing:|not initialized.*failure/i);assert.deepEqual(g.calls,[]);
});

test('malformed manifest, invalid JSON config and corrupt own pointer accumulate independently, zero subprocess/writes',t=>{
 const f=fixture(t,true);f.put('.trellis/.pi-trellis.json','{bad');f.put('.pi/settings.json','{"secret":"do-not-echo",bad}');f.put('.trellis/.runtime/sessions/own.json','broken');f.put('.git/index',Buffer.from([0,255,1]));f.pointer(f.task('.trellis/tasks/foreign'),'foreign');
 const before=snapshot(f.root),g=guards(t,{forbidden:[join(f.root,'.trellis/.runtime/sessions/foreign.json'),join(f.root,'.trellis/tasks/foreign')]});const r=f.check();g.restore();
 assert.equal(item(r,'manifest').status,'issue');assert.equal(item(r,`config:${f.root}:.pi/settings.json`).status,'issue');assert.equal(item(r,'current-task').status,'issue');assert.equal(item(r,'inventory:runtime').status,'pass');assert.doesNotMatch(formatDiagnostics(r),/do-not-echo/);assert.deepEqual(g.calls,[]);assert.deepEqual(snapshot(f.root),before);
});

for(const kind of ['absent','null','empty','object-empty','malformed','array','number','missing-task','invalid-task'])test(`own pointer ${kind} is classified without borrowing a foreign session`,t=>{
 const f=fixture(t,true);const foreign=f.task('.trellis/tasks/foreign');f.pointer(foreign,'foreign');
 if(kind==='null')f.pointer(null);if(kind==='empty')f.pointer('');if(kind==='object-empty')f.put('.trellis/.runtime/sessions/own.json','{}');if(kind==='malformed')f.put('.trellis/.runtime/sessions/own.json','{');if(kind==='array')f.put('.trellis/.runtime/sessions/own.json','[]');if(kind==='number')f.pointer(42);if(kind==='missing-task')f.pointer('.trellis/tasks/missing');if(kind==='invalid-task')f.pointer(f.task('.trellis/tasks/own',{}));
 const g=guards(t,{forbidden:[join(f.root,'.trellis/.runtime/sessions/foreign.json'),join(f.root,foreign)]});const r=f.check();g.restore();
 assert.equal(item(r,'current-task').status,['absent','null','empty','object-empty'].includes(kind)?'pass':'issue');assert.deepEqual(g.calls,[]);
});

test('exact planning record ignores empty unused JSONL/materials and explicit child/pinned keys select only their own pointer',t=>{
 const f=fixture(t,true);const ref=f.task();f.pointer(ref,'actual-child');f.put(ref+'/implement.jsonl','');f.put(ref+'/prd.md','not part of Check');f.pointer('.trellis/tasks/invalid','own');
 const g=guards(t,{forbidden:[join(f.root,ref,'prd.md'),join(f.root,ref,'implement.jsonl'),join(f.root,'.trellis/.runtime/sessions/own.json')]});const r=f.check({contextId:'actual-child'});g.restore();assert.equal(r.scope.taskRef,ref);assert.equal(item(r,'current-task').status,'pass');assert.match(formatDiagnostics(r),/Planning is legal/);assert.deepEqual(g.calls,[]);
});

for(const value of [{},{title:42},{status:''},{name:'x'.repeat(8193)},[],{foo:'not-task'}])test(`task record semantic validation rejects ${JSON.stringify(value).slice(0,50)}`,t=>{
 const f=fixture(t,true);f.pointer(f.task('.trellis/tasks/own',value));assert.equal(item(f.check(),'current-task').status,'issue');
});

test('external source top-level task store is allowed; internal task/record redirects are rejected',t=>{
 const f=fixture(t,true),external=fixture(t);external.put('own/task.json',{id:'external',status:'planning'});rmSync(join(f.root,'.trellis/tasks'),{recursive:true});symlinkSync(external.root,join(f.root,'.trellis/tasks'));f.pointer('.trellis/tasks/own');assert.equal(item(f.check(),'current-task').status,'pass');
 const victim=fixture(t);victim.put('task.json',{id:'victim'});symlinkSync(victim.root,join(external.root,'escape'));f.pointer('.trellis/tasks/escape');assert.equal(item(f.check(),'current-task').status,'issue');
 f.pointer('.trellis/tasks/own');rmSync(join(external.root,'own/task.json'));symlinkSync(join(victim.root,'task.json'),join(external.root,'own/task.json'));const before=snapshot(victim.root),g=guards(t,{forbidden:[victim.root]});assert.equal(item(f.check(),'current-task').status,'issue');g.restore();assert.deepEqual(snapshot(victim.root),before);
});

for(const path of ['.trellis/.runtime/sessions','.trellis/.runtime/sessions/own.json','.pi/settings.json'])test(`symlink ${path} rejects external reads and preserves victim`,t=>{
 const f=fixture(t,true),victim=fixture(t);victim.put('own.json',{current_task:null});victim.put('settings.json',{});mkdirSync(dirname(join(f.root,path)),{recursive:true});symlinkSync(path.endsWith('own.json')?join(victim.root,'own.json'):path.endsWith('settings.json')?join(victim.root,'settings.json'):victim.root,join(f.root,path));
 const before=snapshot(victim.root),g=guards(t,{forbidden:[victim.root]});const r=f.check();g.restore();assert.ok(r.items.some(i=>i.status==='issue'&&i.evidence.some(e=>e.includes(path))));assert.deepEqual(snapshot(victim.root),before);
});

for(const bytes of [Buffer.from([0xff]),Buffer.from('nul\0bad'),Buffer.alloc(1024*1024+1,32)])test(`invalid pointer text bytes (${bytes.length}) bounded before parse`,t=>{
 const f=fixture(t,true);f.put('.trellis/.runtime/sessions/own.json',bytes);assert.equal(item(f.check(),'current-task').status,'issue');
});

test('special/directory and denied descriptors fail explicitly, independent configuration still runs',t=>{
 const f=fixture(t,true);mkdirSync(join(f.root,'.trellis/.runtime/sessions/own.json'),{recursive:true});f.put('.pi/settings.json','{');let r=f.check();assert.equal(item(r,'current-task').status,'issue');assert.equal(item(r,`config:${f.root}:.pi/settings.json`).status,'issue');
 const open=fs.openSync;t.mock.method(fs,'openSync',(path,...args)=>{if(String(path).endsWith('/.trellis/.developer'))throw Object.assign(Error('Permission denied'),{code:'EACCES'});return open(path,...args);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});r=f.check();assert.equal(item(r,'developer').status,'issue');assert.match(item(r,'developer').summary,/Permission denied/);
});

test('runtime missing/hash/mode, missing role and required docs collect fixed inventory while customization stays legal',t=>{
 const f=fixture(t,true);f.put('.trellis/workflow.md','custom workflow');f.put('.trellis/spec/index.md','custom spec');assert.equal(item(f.check(),'documents').status,'pass');
 rmSync(join(f.root,'.trellis/scripts/task.py'));f.put('.trellis/scripts/get_context.py','changed');chmodSync(join(f.root,'.trellis/scripts/get_developer.py'),0o600);rmSync(join(f.root,'.pi/agents/trellis-check.md'));rmSync(join(f.root,'.trellis/spec/guides/index.md'));
 const r=f.check(),report=formatDiagnostics(r);assert.match(report,/Missing: .trellis\/scripts\/task.py/);assert.match(report,/Hash mismatch: .trellis\/scripts\/get_context.py/);assert.match(report,/Mode mismatch: .trellis\/scripts\/get_developer.py/);assert.equal(item(r,'inventory:agent').status,'issue');assert.equal(item(r,'documents').status,'issue');assert.equal(item(r,'runtime-probe').status,'blocked');
});

test('legal empty resource lock and completed audit never execute recovery or re-read historical task',t=>{
 const f=fixture(t,true);f.put('.trellis/.runtime/init.lock','');const r=f.check();assert.match(item(r,'lock').summary,/legal empty lock/);assert.doesNotMatch(item(r,'lock').summary,/JSON/);assert.equal(item(r,'operation').status,'pass');
 // Completed init record references the removed bootstrap task; no historical file is opened.
 const g=guards(t,{forbidden:[join(f.root,'.trellis/tasks/00-bootstrap-guidelines')]});assert.equal(item(f.check(),'operation').status,'pass');g.restore();
 const op=JSON.parse(readFileSync(join(f.root,'.trellis/.runtime/init-operation.json')));op.status='incomplete';f.put('.trellis/.runtime/init-operation.json',op);assert.equal(item(f.check(),'operation').status,'issue');op.plan.root='/foreign';f.put('.trellis/.runtime/init-operation.json',op);assert.equal(item(f.check(),'operation').status,'issue');
});

test('cross-root source hints never stat/open another source before native identity proof',t=>{
 const f=fixture(t,true),source=fixture(t,true);source.pointer(source.task(),'actual-child');const original=fs.lstatSync,real=fs.realpathSync;
 t.mock.method(fs,'lstatSync',(path,...args)=>{assert.ok(!String(path).startsWith(source.root),'cross-root stat forbidden');return original(path,...args);});t.mock.method(fs,'realpathSync',(path,...args)=>{assert.ok(!String(path).startsWith(source.root),'cross-root realpath forbidden');return real(path,...args);});syncBuiltinESMExports();
 const g=guards(t,{forbidden:[source.root]});const r=f.check({authorityRoot:source.root,contextId:'actual-child'});g.restore();assert.equal(item(r,'authority').status,'blocked');assert.match(item(r,'authority').summary,/Cross-root authority is blocked/);assert.equal(item(r,'current-task').status,'blocked');assert.ok(!r.scope.taskRef);assert.deepEqual(g.calls,[]);
});

for(const resolver of [undefined,()=>{throw Error('bad memo');},()=>({contextId:'invalid/key'})])test(`menu Check missing/failed/invalid resolver blocks pointer, does not infer env or session`,async t=>{
 const f=fixture(t,true);f.pointer(f.task());let command;const notices=[];registerInitCommand({registerCommand:(_n,v)=>command=v},async()=>assert.fail('refresh forbidden'),resolver);
 const g=guards(t,{forbidden:[join(f.root,'.trellis/.runtime/sessions/own.json')]});await command.handler('',{cwd:f.root,hasUI:true,sessionManager:{getSessionId:()=>assert.fail('no key inference')},reload:()=>assert.fail('no reload'),ui:{select:async()=> 'Check',notify:text=>notices.push(text)}});g.restore();assert.equal(notices.length,1);assert.match(notices[0],/pointer check blocked/);assert.deepEqual(g.calls,[]);
});

test('package descriptor malformed source inventory is separate from project errors and never reads unlisted victim paths',t=>{
 const f=fixture(t,true),read=fs.readSync,open=fs.openSync,fds=new Set();
 t.mock.method(fs,'openSync',(path,...args)=>{const fd=open(path,...args);if(String(path)===join(packageRoot,'resources/runtime-baseline.json'))fds.add(fd);return fd;});
 t.mock.method(fs,'readSync',(fd,buffer,offset,length,position)=>{if(fds.has(fd)){fds.delete(fd);const count=read(fd,buffer,offset,length,position);const fake=Buffer.from('{"schemaVersion":1,"pythonMinimum":"3.10","releaseId":"x","files":{}}');buffer.fill(32,offset,offset+count);fake.copy(buffer,offset);return count;}return read(fd,buffer,offset,length,position);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 f.put('.pi/settings.json','{');const r=f.check();assert.equal(item(r,'package').status,'issue');assert.match(item(r,'package').summary,/Unsupported package runtime baseline/);assert.equal(item(r,`config:${f.root}:.pi/settings.json`).status,'issue');assert.equal(item(r,'runtime-probe').status,'blocked');
});

test('cooperative cancelled input and bounded formatter retain honest omission/runtime boundaries',t=>{
 const f=fixture(t,true),controller=new AbortController();controller.abort();const r=collectDiagnostics({cwd:f.root,contextId:'own'},{signal:controller.signal});assert.ok(r.items.some(i=>i.status==='cancelled'));assert.match(formatDiagnostics(r),/Cancelled/);
 const item={id:'bad',category:'configuration',status:'issue',severity:'error',summary:'bad\x1b[31m\n'+ '字'.repeat(500),evidence:['字'.repeat(500)],impact:'字'.repeat(500),advice:'字'.repeat(500)};
 const report=formatDiagnostics({...r,items:Array.from({length:64},()=>item),omitted:2});assert.ok(Buffer.byteLength(report)<=DIAGNOSTIC_LIMITS.report);assert.match(report,/omitted by the report budget/);assert.match(report,/no hard 20-second deadline/);assert.doesNotMatch(report,/\x1b/);
});

for(const mutation of [m=>{m.schemaVersion=1;},m=>{delete m.files['.trellis/scripts/task.py'];},m=>{m.files['.trellis/scripts/evil.py']=m.files['.trellis/scripts/task.py'];delete m.files['.trellis/scripts/task.py'];},m=>{m.files['.trellis/scripts/task.py'].source='../victim';},m=>{m.templates['.trellis/workflow.md'].origin='preserved-project';m.templates['.trellis/workflow.md'].source={kind:'project-snapshot',revision:'/victim'};},m=>{m.extra=true;}])test('static manifest projection rejects strict engine provenance attack without authorizing execution',t=>{
 const f=fixture(t,true),manifest=JSON.parse(readFileSync(join(f.root,'.trellis/.pi-trellis.json')));mutation(manifest);f.put('.trellis/.pi-trellis.json',manifest);assert.throws(()=>verifyRuntime(f.root));const r=f.check();assert.equal(item(r,'manifest').status,'issue');assert.equal(item(r,'runtime-probe').status,'blocked');assert.equal(item(r,'inventory:runtime').status,'pass');
});

test('old release is distinct from missing/empty manifest and never grants current execution',t=>{
 const f=fixture(t,true),manifest=JSON.parse(readFileSync(join(f.root,'.trellis/.pi-trellis.json')));manifest.runtimeReleaseId='pi-trellis-runtime-v1-'+ 'a'.repeat(64);f.put('.trellis/.pi-trellis.json',manifest);const r=f.check();assert.match(item(r,'manifest').summary,/Unsupported project runtime release/);assert.equal(item(r,'runtime-probe').status,'blocked');
});

test('FIFO and descriptor replacement cannot hang or authorize reads',t=>{
 if(process.platform==='win32'){t.skip('POSIX FIFO fixture');return;}
 const f=fixture(t,true),file=join(f.root,'.trellis/.runtime/sessions/own.json');mkdirSync(dirname(file),{recursive:true});childProcess.execFileSync('mkfifo',[file]);let g=guards(t);assert.equal(item(f.check(),'current-task').status,'issue');g.restore();
 rmSync(file);f.pointer(null);const open=fs.openSync;let swapped=false;
 t.mock.method(fs,'openSync',(path,...args)=>{if(String(path)===file&&!swapped){swapped=true;rmSync(file);childProcess.execFileSync('mkfifo',[file]);}return open(path,...args);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});assert.equal(item(f.check(),'current-task').status,'issue');assert.ok(swapped);
});

test('text/config read totals are shared and oversized task records fail without broadening scope',t=>{
 const f=fixture(t,true);f.put('.trellis/config.yaml','x'.repeat(DIAGNOSTIC_LIMITS.file));f.put('.pi/pi-trellis.json',' '.repeat(DIAGNOSTIC_LIMITS.file-2)+'{}');f.put('.pi/settings.json','{}');f.pointer(f.task('.trellis/tasks/own',{id:'own',description:'x'.repeat(DIAGNOSTIC_LIMITS.record)}));const r=f.check();assert.ok(r.items.some(i=>/byte budget exceeded/.test(i.summary)));assert.equal(item(r,'current-task').status,'issue');assert.equal(item(r,'runtime-probe').status,'blocked');
});

test('package runtime byte drift is detected separately through the bounded descriptor reader',t=>{
 const f=fixture(t,true),open=fs.openSync,read=fs.readSync,fds=new Set();
 t.mock.method(fs,'openSync',(path,...args)=>{const fd=open(path,...args);if(String(path)===join(packageRoot,'runtime/task.py'))fds.add(fd);return fd;});
 t.mock.method(fs,'readSync',(fd,buffer,...args)=>{const count=read(fd,buffer,...args);if(fds.has(fd)&&count){buffer[args[0]]^=1;fds.delete(fd);}return count;});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});const r=f.check();assert.equal(item(r,'package').status,'issue');assert.match(item(r,'package').summary,/Package runtime hash mismatch/);assert.equal(item(r,'manifest').status,'blocked');assert.equal(item(r,'runtime-probe').status,'blocked');
});

test('menu resolver receives discovered current root and explicit own key; Check preserves pointers/index/config/modes',async t=>{
 const f=fixture(t,true),ref=f.task();f.pointer(ref,'caller-key');f.pointer('.trellis/tasks/foreign','foreign');f.put('.git/index',Buffer.from([9,0,255]));f.put('.pi/settings.json','{}');const sub=join(f.root,'src');mkdirSync(sub);let command,seen;const notices=[];
 registerInitCommand({registerCommand:(_n,v)=>command=v},async()=>assert.fail('refresh forbidden'),(ctx,root)=>{seen=[ctx.cwd,root];return {authorityRoot:root,contextId:'caller-key',sessionId:'session-visible',isProjectTrusted:false};});
 const before=snapshot(f.root),g=guards(t,{forbidden:[join(f.root,'.trellis/.runtime/sessions/foreign.json')]});await command.handler('',{cwd:sub,hasUI:true,reload:()=>assert.fail('reload forbidden'),ui:{select:async()=> 'Check',notify:text=>notices.push(text)}});g.restore();assert.deepEqual(seen,[sub,f.root]);assert.equal(notices.length,1);assert.match(notices[0],/Own current task record verified/);assert.match(notices[0],/Current task: .trellis\/tasks\/own/);assert.deepEqual(g.calls,[]);assert.deepEqual(snapshot(f.root),before);
});

test('cancellation during fixed inventory never leaves a passed inventory item or escapes collector',t=>{
 const f=fixture(t,true),controller=new AbortController(),open=fs.openSync,read=fs.readSync;const fds=new Set();
 t.mock.method(fs,'openSync',(path,...args)=>{const fd=open(path,...args);if(String(path)===join(f.root,'.trellis/scripts/task.py'))fds.add(fd);return fd;});
 t.mock.method(fs,'readSync',(fd,...args)=>{const count=read(fd,...args);if(fds.has(fd)){controller.abort();fds.delete(fd);}return count;});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});const r=collectDiagnostics({cwd:f.root,contextId:'own'},{signal:controller.signal});assert.equal(item(r,'inventory:runtime').status,'cancelled');assert.equal(item(r,'inventory:agent').status,'cancelled');assert.ok(!r.items.some(i=>i.id==='inventory:runtime'&&i.status==='pass'));assert.match(formatDiagnostics(r),/Cancelled/);
});

test('fresh project with explicit resolver remains not-applicable; unsafe target marker cannot fall through to local pointer',t=>{
 const fresh=fixture(t);assert.equal(item(fresh.check({authorityRoot:fresh.root}),'current-task').status,'skipped');
 const f=fixture(t,true),victim=fixture(t);f.pointer(f.task());mkdirSync(join(f.root,'.trellis/.runtime/pi-trellis'),{recursive:true});symlinkSync(join(victim.root,'missing'),join(f.root,'.trellis/.runtime/pi-trellis/binding.json'));const g=guards(t,{forbidden:[victim.root,join(f.root,'.trellis/.runtime/sessions/own.json')]});const r=f.check();g.restore();assert.equal(item(r,'marker').status,'issue');assert.equal(item(r,'current-task').status,'blocked');
});

test('resolver failure retains its bounded cause without reading any pointer',async t=>{
 const f=fixture(t,true);f.pointer(f.task());let command;const notices=[];
 registerInitCommand({registerCommand:(_n,v)=>command=v},async()=>assert.fail('refresh'),()=>{throw Error('Managed startup authority failed: binding mismatch\u202e\x1b[31m');});
 const g=guards(t,{forbidden:[join(f.root,'.trellis/.runtime/sessions/own.json')]});await command.handler('',{cwd:f.root,hasUI:true,ui:{select:async()=> 'Check',notify:text=>notices.push(text)}});g.restore();
 assert.equal(notices.length,1);assert.match(notices[0],/Managed startup authority failed: binding mismatch/);assert.doesNotMatch(notices[0],/[\u202e\x1b]/);assert.match(notices[0],/pointer check blocked/);
});

test('package failure never hides malformed manifest or missing required documents',t=>{
 const f=fixture(t,true);f.put('.trellis/.pi-trellis.json','{}');rmSync(join(f.root,'.trellis/workflow.md'));
 const open=fs.openSync;t.mock.method(fs,'openSync',(path,...args)=>{if(String(path)===join(packageRoot,'resources/runtime-baseline.json'))throw Error('Package descriptor unavailable');return open(path,...args);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const r=f.check();assert.equal(item(r,'package').status,'issue');assert.equal(item(r,'manifest').status,'issue');assert.equal(item(r,'documents').status,'issue');assert.equal(item(r,'inventory:runtime').status,'blocked');
});

test('unsafe non-required template route cannot masquerade as a valid runtime snapshot',t=>{
 const f=fixture(t,true),victim=fixture(t);rmSync(join(f.root,'.trellis/.gitignore'));symlinkSync(join(victim.root,'missing'),join(f.root,'.trellis/.gitignore'));
 assert.throws(()=>verifyRuntime(f.root));const g=guards(t,{forbidden:[victim.root]});const r=f.check();g.restore();assert.equal(item(r,'template-routes').status,'issue');assert.equal(r.facts.runtimeStaticValid,false);
});

test('Python whitespace-only task identity fields are invalid in the static projection',t=>{
 const f=fixture(t,true);f.pointer(f.task('.trellis/tasks/own',{id:'\u0085',status:'planning'}));assert.equal(item(f.check(),'current-task').status,'issue');
});

test('malformed completed operation plan metadata cannot pass as a valid audit envelope',t=>{
 const f=fixture(t,true),op=JSON.parse(readFileSync(join(f.root,'.trellis/.runtime/init-operation.json')));delete op.plan.schemaVersion;op.plan.actions[0].mode='0644';f.put('.trellis/.runtime/init-operation.json',op);
 const r=f.check();assert.equal(item(r,'operation').status,'issue');assert.equal(r.facts.runtimeStaticValid,false);
});

test('ancestor replacement at descriptor open is rejected before victim bytes are read',t=>{
 const f=fixture(t,true),victim=fixture(t);f.put('.pi/settings.json','{}');const parent=join(f.root,'.pi'),backup=join(f.root,'saved-pi'),file=join(parent,'settings.json');fs.linkSync(file,join(victim.root,'settings.json'));let swapped=false,readVictim=false;const open=fs.openSync,read=fs.readSync,close=fs.closeSync;const victimFds=new Set();
 t.mock.method(fs,'openSync',(path,...args)=>{if(String(path)===file&&!swapped){swapped=true;fs.renameSync(parent,backup);symlinkSync(victim.root,parent);}const fd=open(path,...args);if(String(path)===file)victimFds.add(fd);return fd;});
 t.mock.method(fs,'closeSync',fd=>{victimFds.delete(fd);return close(fd);});t.mock.method(fs,'readSync',(fd,...args)=>{if(victimFds.has(fd))readVictim=true;return read(fd,...args);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const r=f.check();assert.ok(swapped);assert.equal(item(r,`config:${f.root}:.pi/settings.json`).status,'issue');assert.equal(readVictim,false);
});

test('exhausted text budget does not drain or suppress independent fixed inventory',t=>{
 const f=fixture(t,true);f.put('.trellis/config.yaml','x'.repeat(DIAGNOSTIC_LIMITS.file));f.put('.pi/pi-trellis.json',' '.repeat(DIAGNOSTIC_LIMITS.file-2)+'{}');f.put('.pi/settings.json','{}');
 const open=fs.openSync,close=fs.closeSync,read=fs.readSync,fds=new Map();let textBytes=0;
 t.mock.method(fs,'openSync',(path,...args)=>{const fd=open(path,...args);fds.set(fd,String(path));return fd;});t.mock.method(fs,'closeSync',fd=>{fds.delete(fd);return close(fd);});
 t.mock.method(fs,'readSync',(fd,...args)=>{const count=read(fd,...args),path=fds.get(fd);if(path&&!path.includes('/runtime/')&&!path.includes('/scripts/')&&!path.includes('/agents/')&&!path.includes('/resources/templates/'))textBytes+=count;return count;});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const r=f.check();assert.equal(item(r,'inventory:runtime').status,'pass');assert.ok(textBytes<=DIAGNOSTIC_LIMITS.text+1,`actual text bytes ${textBytes}`);assert.ok(r.items.some(i=>/byte budget exceeded/.test(i.summary)));
});

test('production extension resolver preserves two exact session keys without Python during Check',async t=>{
 const f=fixture(t,true),commands=new Map(),events=new Map(),notices=[];
 trellis({registerCommand:(name,value)=>commands.set(name,value),on:(name,value)=>events.set(name,value)});
 const ctx=name=>({cwd:f.root,hasUI:true,sessionManager:{getSessionId:()=>name,getSessionFile:()=>undefined},ui:{select:async()=> 'Check',notify:text=>notices.push(text)}});
 const a=ctx('real-a-'+f.root),b=ctx('real-b-'+f.root),aKey=__internals.contextKey(f.root,a),bKey=__internals.contextKey(f.root,b);assert.notEqual(aKey,bKey);
 f.pointer(f.task('.trellis/tasks/a'),aKey);f.pointer(f.task('.trellis/tasks/b'),bKey);
 let g=guards(t,{forbidden:[join(f.root,`.trellis/.runtime/sessions/${bKey}.json`),join(f.root,'.trellis/tasks/b')]});await commands.get('trellis-init').handler('',a);g.restore();assert.match(notices.at(-1),/Current task: .trellis\/tasks\/a/);
 g=guards(t,{forbidden:[join(f.root,`.trellis/.runtime/sessions/${aKey}.json`),join(f.root,'.trellis/tasks/a')]});await commands.get('trellis-init').handler('',b);g.restore();assert.match(notices.at(-1),/Current task: .trellis\/tasks\/b/);
});

test('production child authority failure retains cause and never borrows its original pointer',async t=>{
 const f=fixture(t,true),commands=new Map(),events=new Map(),notices=[];
 trellis({registerCommand:(name,value)=>commands.set(name,value),on:(name,value)=>events.set(name,value),sendMessage:()=>{}});
 const ctx={cwd:f.root,hasUI:false,sessionManager:{getSessionId:()=> 'failed-diagnostic-child-'+f.root,getSessionFile:()=>undefined},ui:{}};
 const old=__internals.contextKey(f.root,ctx);f.pointer(f.task(),old);
 await events.get('before_agent_start')({prompt:'Active task: .trellis/tasks/own\nTrellis context id: old\n\nIncomplete header',systemPromptOptions:{sections:{}}},ctx);
 const child=__internals.contextKey(f.root,ctx);assert.notEqual(child,old);
 const g=guards(t,{forbidden:[join(f.root,`.trellis/.runtime/sessions/${old}.json`),join(f.root,`.trellis/.runtime/sessions/${child}.json`)]});await commands.get('trellis-init').handler('',{...ctx,hasUI:true,ui:{select:async()=> 'Check',notify:text=>notices.push(text)}});g.restore();
 assert.match(notices.at(-1),/Incomplete\/invalid source authority header/);assert.match(notices.at(-1),/pointer check blocked/);
});

test('formatter identifies omitted categories without leaking category controls',t=>{
 const f=fixture(t),r=f.check();const row={id:'issue',category:'secret-category\u202e',status:'issue',severity:'error',summary:'字'.repeat(500),evidence:Array.from({length:12},()=> '字'.repeat(500)),impact:'impact',advice:'next'};
 const report=formatDiagnostics({...r,items:Array.from({length:64},()=>row)});assert.ok(Buffer.byteLength(report)<=DIAGNOSTIC_LIMITS.report);assert.match(report,/Omitted categories: secret-category/);assert.doesNotMatch(report,/\u202e/);
});
