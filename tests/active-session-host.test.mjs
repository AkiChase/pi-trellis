import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { DefaultResourceLoader, SettingsManager, createAgentSession, SessionManager, ModelRuntime } from '@earendil-works/pi-coding-agent';
import { installRuntimeFixture } from './runtime-fixture.mjs';
import { packageRoot } from '../lib/initialization/engine.ts';

// The same existing host supplies both public SDK and public tool pipeline.
const { runToolCall } = await import(new URL('../../pi-agent-core/dist/index.js', import.meta.resolve('@earendil-works/pi-coding-agent')).href);

test('offline real SDK persisted sessions share active task, survive stop/new/resume and preserve lifecycle',async t=>{
 const base=mkdtempSync(join(tmpdir(),'trellis-active-sdk-')),root=join(base,'project'),agentDir=join(base,'agent'),sessionsDir=join(base,'sessions');
 mkdirSync(root);mkdirSync(agentDir);mkdirSync(sessionsDir);t.after(()=>rmSync(base,{recursive:true,force:true}));
 installRuntimeFixture(root);writeFileSync(join(agentDir,'settings.json'),JSON.stringify({packages:[packageRoot]}));
 const previous=process.env.PI_CODING_AGENT_DIR;process.env.PI_CODING_AGENT_DIR=agentDir;
 t.after(()=>{if(previous===undefined)delete process.env.PI_CODING_AGENT_DIR;else process.env.PI_CODING_AGENT_DIR=previous;});
 const task='.trellis/tasks/resume',other='.trellis/tasks/other';
 for(const path of [task,other]){mkdirSync(join(root,path));writeFileSync(join(root,path,'task.json'),JSON.stringify({id:path.split('/').at(-1),title:'Resume fixture',description:'Offline acceptance',status:'planning',branch:null}));writeFileSync(join(root,path,'prd.md'),'Planning only');writeFileSync(join(root,path,'implement.jsonl'),'');writeFileSync(join(root,path,'check.jsonl'),'');}
 const taskBytes=readFileSync(join(root,task,'task.json')),otherBytes=readFileSync(join(root,other,'task.json')),runtimeBytes=readFileSync(join(root,'.trellis/scripts/task.py')),settingsBytes=readFileSync(join(agentDir,'settings.json'));
 writeFileSync(join(root,'.trellis/config.yaml'),'hooks:\n  after_start:\n    - echo started >> hook-marker\n  after_deactivate:\n    - echo cleared >> hook-marker\n');
 const instances=[];t.after(()=>instances.forEach(s=>s.dispose()));
 const open=async manager=>{
  const settings=SettingsManager.create(root,agentDir,{projectTrusted:true});
  const loader=new DefaultResourceLoader({cwd:root,agentDir,settingsManager:settings,noContextFiles:true});await loader.reload();assert.deepEqual(loader.getExtensions().errors,[]);
  const runtime=await ModelRuntime.create({authPath:join(agentDir,'auth.json'),modelsPath:null,refreshOnCreate:false,allowModelNetwork:false});
  const {session}=await createAgentSession({cwd:root,agentDir,settingsManager:settings,resourceLoader:loader,modelRuntime:runtime,sessionManager:manager});instances.push(session);await session.bindExtensions({onError:e=>assert.fail(e.message)});
  const names=loader.getSkills().skills.filter(s=>s.name.startsWith('trellis-')).map(s=>s.name);assert.equal(names.length,9);assert.ok(names.includes('trellis-start'));assert.ok(!names.includes('trellis-continue'));
  return session;
 };
 let count=0;
 const call=async(session,command)=>{
  const toolCall={type:'toolCall',id:`offline-${++count}`,name:'bash',arguments:{command}};
  const usage={input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}};
  const assistantMessage={role:'assistant',content:[toolCall],api:'fixture',provider:'fixture',model:'offline',usage,stopReason:'toolUse',timestamp:Date.now()};
  const agent=session.agent;
  const result=await runToolCall(toolCall,{tools:agent.state.tools,context:{messages:agent.state.messages,tools:agent.state.tools},assistantMessage,beforeToolCall:agent.beforeToolCall,afterToolCall:agent.afterToolCall});
  assert.equal(result.isError,false,JSON.stringify(result));return result.result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 };
 const managerA=SessionManager.create(root,sessionsDir);managerA.appendMessage({role:'user',content:'Offline fixture only',timestamp:Date.now()});
 const a=await open(managerA),fileA=managerA.getSessionFile();assert.ok(fileA);
 await call(a,`python3 .trellis/scripts/task.py active ${task}`);
 const keyA='pi-'+createHash('sha256').update(fileA).digest('hex').slice(0,12),pointerA=join(root,'.trellis/.runtime/sessions',keyA+'.json'),bytesA=readFileSync(pointerA);
 a.dispose();
 const managerB=SessionManager.create(root,sessionsDir);managerB.appendMessage({role:'user',content:'New session continuing task',timestamp:Date.now()});const b=await open(managerB);
 assert.notEqual(managerA.getSessionId(),managerB.getSessionId());await call(b,`python3 .trellis/scripts/task.py active ${task}`);
 assert.deepEqual(readFileSync(pointerA),bytesA);const currentB=JSON.parse(await call(b,'python3 .trellis/scripts/task.py current --json'));assert.equal(currentB.current_task.dir,task);assert.equal(currentB.current_task.id,'resume');assert.equal(currentB.current_task.status,'planning');assert.equal(currentB.state,'valid');assert.equal(currentB.stale,false);b.dispose();
 const keyB='pi-'+createHash('sha256').update(managerB.getSessionFile()).digest('hex').slice(0,12),pointerB=join(root,'.trellis/.runtime/sessions',keyB+'.json'),bytesB=readFileSync(pointerB);
 const resumed=await open(SessionManager.open(fileA,sessionsDir));assert.equal(resumed.sessionId,managerA.getSessionId());const currentA=JSON.parse(await call(resumed,'python3 .trellis/scripts/task.py current --json'));assert.equal(resumed.sessionFile,fileA);assert.equal(currentA.current_task.dir,task);assert.equal(currentA.current_task.id,'resume');assert.equal(currentA.state,'valid');assert.equal(currentA.stale,false);assert.equal(currentA.source,`session:${keyA}`);
 await call(resumed,`python3 .trellis/scripts/task.py active ${other}`);
 const switched=JSON.parse(await call(resumed,'python3 .trellis/scripts/task.py current --json'));assert.equal(switched.current_task.dir,other);assert.equal(switched.current_task.id,'other');assert.equal(switched.state,'valid');assert.equal(switched.stale,false);
 assert.equal(JSON.parse(readFileSync(pointerB)).current_task,task);assert.deepEqual(readFileSync(pointerB),bytesB);
 assert.equal(JSON.parse(readFileSync(pointerA)).current_task,other);
 assert.deepEqual(readFileSync(join(root,task,'task.json')),taskBytes);assert.deepEqual(readFileSync(join(root,other,'task.json')),otherBytes);
 assert.deepEqual(readFileSync(join(root,'.trellis/scripts/task.py')),runtimeBytes);assert.deepEqual(readFileSync(join(agentDir,'settings.json')),settingsBytes);
 assert.ok(!readdirSync(root).includes('hook-marker'));
 assert.ok(!readdirSync(join(root,'.trellis/.runtime/sessions')).some(n=>n.includes('lock')));
});
