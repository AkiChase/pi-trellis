import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { DefaultResourceLoader, DefaultPackageManager, SettingsManager, createAgentSession, SessionManager, ModelRuntime } from '@earendil-works/pi-coding-agent';
import { installRuntimeFixture } from './runtime-fixture.mjs';
import { packageRoot } from '../lib/initialization/engine.ts';
import { projectSkillPaths, adapterConfigured } from '../lib/adapter-resources.ts';

async function fixture(t, valid=false, options={}) {
 const base=mkdtempSync(join(tmpdir(),'trellis-sdk-')),root=join(base,'project'),agentDir=join(base,'agent');mkdirSync(root);mkdirSync(agentDir);
 t.after(()=>rmSync(base,{recursive:true,force:true}));
 if(valid)installRuntimeFixture(root);
 const settingsPath=join(agentDir,'settings.json');writeFileSync(settingsPath,JSON.stringify({packages:[packageRoot]}));
 const previous=process.env.PI_CODING_AGENT_DIR;process.env.PI_CODING_AGENT_DIR=agentDir;
 t.after(()=>{if(previous===undefined)delete process.env.PI_CODING_AGENT_DIR;else process.env.PI_CODING_AGENT_DIR=previous;});
 const settings=SettingsManager.create(root,agentDir,{projectTrusted:true});
 const loader=new DefaultResourceLoader({cwd:root,agentDir,settingsManager:settings,noContextFiles:true,...options});await loader.reload();assert.deepEqual(loader.getExtensions().errors,[]);
 const runtime=await ModelRuntime.create({authPath:join(agentDir,'auth.json'),modelsPath:null,refreshOnCreate:false,allowModelNetwork:false});
 const {session}=await createAgentSession({cwd:root,agentDir,settingsManager:settings,resourceLoader:loader,modelRuntime:runtime,sessionManager:SessionManager.inMemory(root)});
 t.after(()=>session.dispose());await session.bindExtensions({onError:e=>{throw Error(e.message);}});
 const commands=()=>loader.getExtensions().extensions.flatMap(ext=>[...ext.commands.keys()]);
 const tools=()=>session.getAllTools().map(t=>t.name);
 const skills=()=>loader.getSkills().skills.filter(s=>s.name.startsWith('trellis-'));
 return {root,agentDir,settings,settingsPath,loader,session,commands,tools,skills};
}

test('real SDK fresh bind has only init; reload after deployment enables command/tool/skills then withdraws invalid runtime',async t=>{
 const f=await fixture(t);assert.deepEqual(readdirSync(f.root),[]);assert.deepEqual(f.commands(),['trellis-init']);assert.ok(!f.tools().includes('trellis_dispatch'));assert.ok(!f.session.getActiveToolNames().includes('trellis_dispatch'));assert.equal(f.skills().length,0);assert.doesNotMatch(f.session.systemPrompt,/trellis-workflow|trellis-start/);
 installRuntimeFixture(f.root);await f.session.reload();assert.ok(f.commands().includes('trellis-task-viewer'));assert.ok(f.tools().includes('trellis_dispatch'));assert.ok(f.session.getActiveToolNames().includes('trellis_dispatch'));assert.equal(f.skills().length,10);
 assert.match(f.session.systemPrompt,/trellis-start/);
 await f.session.reload();assert.equal(f.skills().length,10);assert.equal(f.commands().filter(n=>n==='trellis-task-viewer').length,1);
 rmSync(join(f.root,'.trellis/scripts/task.py'));await f.session.reload();assert.deepEqual(f.commands(),['trellis-init']);assert.ok(!f.tools().includes('trellis_dispatch'));assert.ok(!f.session.getActiveToolNames().includes('trellis_dispatch'));assert.equal(f.skills().length,0);assert.doesNotMatch(f.session.systemPrompt,/trellis-start/);
});

test('real SDK clone missing local identity retains full activation and immutable resources',async t=>{
 const f=await fixture(t,true);const bytes=readFileSync(join(f.root,'.trellis/scripts/task.py'));rmSync(join(f.root,'.trellis/.developer'));await f.session.reload();assert.equal(f.skills().length,10);assert.ok(f.commands().includes('trellis-task-viewer'));assert.deepEqual(readFileSync(join(f.root,'.trellis/scripts/task.py')),bytes);
});

test('conditional resolver preserves native default/empty/delta/whitelist/additive/trust filters',async t=>{
 const f=await fixture(t,true),project=join(f.root,'.pi/settings.json');
 const cases=[ [{source:packageRoot,skills:[]},0], [{source:packageRoot,autoload:false,skills:[]},10], [{source:packageRoot,autoload:false,skills:['-skills/trellis-check/SKILL.md']},9], [{source:packageRoot,skills:['skills/trellis-check/SKILL.md']},1], [{source:packageRoot,skills:['+skills/trellis-check/SKILL.md']},10] ];
 for(const [entry,n]of cases){writeFileSync(project,JSON.stringify({packages:[entry]}));const before=readFileSync(project);assert.equal((await projectSkillPaths(f.root,true,f.agentDir)).length,n);assert.deepEqual(readFileSync(project),before);}
 writeFileSync(project,JSON.stringify({packages:[{source:packageRoot,skills:[]}]}));assert.equal((await projectSkillPaths(f.root,false,f.agentDir)).length,10);
 await f.session.reload();assert.equal(f.skills().length,0);
});


test('real SDK noSkills permits explicit extension discovery, matching host semantics',async t=>{
 const f=await fixture(t,true,{noSkills:true});assert.equal(f.skills().length,10);
});

test('explicit one-shot extension loads conditional skills without claiming persistent adapter',async t=>{
 const f=await fixture(t,true,{additionalExtensionPaths:[join(packageRoot,'extensions/trellis.ts')]});writeFileSync(f.settingsPath,'{}');await f.session.reload();assert.equal(f.skills().length,10);assert.ok(f.tools().includes('trellis_dispatch'));assert.equal(await adapterConfigured(f.root),false);assert.equal(readFileSync(f.settingsPath,'utf8'),'{}');
});

test('user and project declarations deduplicate skills and preserve both config bytes',async t=>{
 const f=await fixture(t,true);const project=join(f.root,'.pi/settings.json');writeFileSync(project,JSON.stringify({packages:[packageRoot]}));const user=readFileSync(f.settingsPath),local=readFileSync(project);await f.session.reload();assert.equal(f.skills().length,10);assert.equal(f.commands().filter(n=>n==='trellis-task-viewer').length,1);assert.deepEqual(readFileSync(f.settingsPath),user);assert.deepEqual(readFileSync(project),local);
});

for(const option of [{packages:[]},{packages:[{source:packageRoot,extensions:[]}]}])test(`real SDK disabled package or extension has no automatic Trellis resources (${JSON.stringify(option)})`,async t=>{
 const f=await fixture(t,true);writeFileSync(f.settingsPath,JSON.stringify(option));await f.session.reload();assert.deepEqual(f.commands(),[]);assert.ok(!f.tools().includes('trellis_dispatch'));assert.equal(f.skills().length,0);assert.doesNotMatch(f.session.systemPrompt,/trellis-start/);
});

test('real SDK untrusted project does not load project-only package; user package retains native precedence',async t=>{
 const f=await fixture(t,true),project=join(f.root,'.pi/settings.json');writeFileSync(project,JSON.stringify({packages:[packageRoot]}));writeFileSync(f.settingsPath,'{}');f.settings.setProjectTrusted(false);await f.session.reload();assert.deepEqual(f.commands(),[]);assert.equal(f.skills().length,0);assert.ok(!f.tools().includes('trellis_dispatch'));
 writeFileSync(f.settingsPath,JSON.stringify({packages:[packageRoot]}));writeFileSync(project,JSON.stringify({packages:[{source:packageRoot,skills:[]}]}));await f.session.reload();assert.equal(f.skills().length,10);assert.ok(f.tools().includes('trellis_dispatch'));
});

test('explicit static skills remain host-owned in fresh project, without activating viewer or dispatch',async t=>{
 const f=await fixture(t,false,{additionalSkillPaths:[join(packageRoot,'skills/trellis-check/SKILL.md')]});assert.deepEqual(f.commands(),['trellis-init']);assert.ok(!f.tools().includes('trellis_dispatch'));assert.deepEqual(f.skills().map(s=>s.name),['trellis-check']);assert.match(f.session.systemPrompt,/trellis-check/);
});

test('discovery rechecks runtime after asynchronous public resolution and rejects a foreign context cwd',async t=>{
 const f=await fixture(t,true),extension=f.loader.getExtensions().extensions.find(ext=>ext.commands.has('trellis-init')),handler=extension.handlers.get('resources_discover')[0];
 const ctx={cwd:f.root,hasUI:false,isProjectTrusted:()=>true},event={type:'resources_discover',cwd:f.root,reason:'reload'};
 assert.equal(await handler(event,{...ctx,cwd:f.agentDir}),undefined);
 const resolve=DefaultPackageManager.prototype.resolve;t.mock.method(DefaultPackageManager.prototype,'resolve',async function(...args){const result=await resolve.apply(this,args);rmSync(join(f.root,'.trellis/scripts/task.py'));return result;});
 assert.equal(await handler(event,ctx),undefined);assert.equal(existsSync(join(f.root,'.trellis/scripts/task.py')),false);
});

test('real SDK command parser init confirmation and resource repair both reload full activation',async t=>{
 const f=await fixture(t),notices=[],selections=['Initialize project'];let reloads=0;
 const ui={theme:{fg:(_color,text)=>text,bold:text=>text},notify:(text,type)=>notices.push({text,type}),select:async(_title,choices)=>{const choice=selections.shift();assert.ok(choices.includes(choice),`${choice} not in ${choices}`);return choice;},confirm:async()=>true,setWidget:()=>{},setStatus:()=>{}};
 await f.session.bindExtensions({uiContext:ui,mode:'rpc',commandContextActions:{reload:async()=>{reloads++;await f.session.reload();}},onError:e=>{throw Error(e.message);}});
 await f.session.prompt('/trellis-init --user Fixture');assert.equal(reloads,1);assert.ok(f.commands().includes('trellis-task-viewer'));assert.ok(f.tools().includes('trellis_dispatch'));assert.equal(f.skills().length,10);assert.ok(!notices.some(n=>n.type==='error'),JSON.stringify(notices));
 const file=join(f.root,'.trellis/scripts/task.py'),before=readFileSync(file);rmSync(file);await f.session.reload();assert.deepEqual(f.commands(),['trellis-init']);assert.equal(f.skills().length,0);assert.ok(notices.some(n=>n.type==='error'&&/runtime execution is blocked/.test(n.text)));notices.length=0;
 selections.push('Update project resources');await f.session.prompt('/trellis-init');assert.equal(reloads,2);assert.deepEqual(readFileSync(file),before);assert.equal(f.skills().length,10);assert.ok(f.commands().includes('trellis-task-viewer'));assert.ok(!notices.some(n=>n.type==='error'),JSON.stringify(notices));
});
