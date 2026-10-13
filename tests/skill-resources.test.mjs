import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { DefaultPackageManager, DefaultResourceLoader, SettingsManager } from '@earendil-works/pi-coding-agent';
import { adapterConfigured } from '../lib/adapter-resources.ts';
import { packageRoot, digest } from '../lib/initialization/engine.ts';

const expected=['trellis-before-dev','trellis-brainstorm','trellis-break-loop','trellis-check','trellis-continue','trellis-finish-work','trellis-meta','trellis-spec-bootstrap','trellis-start','trellis-update-spec'].sort();
function fixture(t) {
 const base=mkdtempSync(join(tmpdir(),'pi resources ')),root=join(base,'project'),agentDir=join(base,'agent');mkdirSync(root);mkdirSync(agentDir);t.after(()=>rmSync(base,{recursive:true,force:true}));
 const put=(path,data)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(data));};
 return {base,root,agentDir,put};
}

test('ten curated package skills and complete bounded reference set have accurate hashes and no excluded commands/paths',()=>{
 const manifest=JSON.parse(readFileSync(join(packageRoot,'package.json')));assert.deepEqual(manifest.pi.skills,['skills']);assert.deepEqual(readdirSync(join(packageRoot,'skills')).sort(),expected);
 const baseline=JSON.parse(readFileSync(join(packageRoot,'resources/skill-baseline.json')));assert.equal(Object.keys(baseline.files).length,36);
 for(const [path,record] of Object.entries(baseline.files)){const text=readFileSync(join(packageRoot,'skills',path),'utf8');assert.equal(digest(text),record.sha256,path);assert.equal(record.license,'AGPL-3.0-only');assert.doesNotMatch(text,/\.agents\/|trellis (?:init|update|channel|mem)|trellis_subagent|--platform codex|src\/templates|\{\{[A-Z_]+\}\}/,path);
  for(const match of text.matchAll(/\]\((references\/[^)]+)\)/g)){assert.ok(existsSync(resolve(dirname(join(packageRoot,'skills',path)),match[1])),`${path}: ${match[1]}`);}
  if(path.endsWith('/SKILL.md')){assert.match(text,/^---\nname: [a-z0-9-]+\ndescription: .+\n/m);}
 }
 assert.equal(Object.keys(baseline.files).filter(p=>p.startsWith('trellis-meta/references/')).length,22);assert.equal(Object.keys(baseline.files).filter(p=>p.startsWith('trellis-spec-bootstrap/references/')).length,4);
});

test('real Pi resource loader discovers package skills once and loads init extension in a project without scripts',async t=>{
 const f=fixture(t);f.put(join(f.root,'.pi/settings.json'),{packages:[packageRoot]});
 const settings=SettingsManager.create(f.root,f.agentDir,{projectTrusted:true});
 const loader=new DefaultResourceLoader({cwd:f.root,agentDir:f.agentDir,settingsManager:settings,noContextFiles:true});await loader.reload();
 const resources=loader.getSkills();assert.deepEqual(resources.skills.map(s=>s.name).filter(n=>n.startsWith('trellis-')).sort(),expected);assert.equal(resources.diagnostics.filter(d=>d.type==='collision').length,0);assert.deepEqual(loader.getExtensions().errors,[]);
 assert.ok(loader.getExtensions().extensions.some(ext=>ext.commands.has('trellis-init')));assert.equal(existsSync(join(f.root,'.trellis')),false);assert.equal(existsSync(join(f.root,'.pi/skills')),false);
});

test('real Pi package resource filters and autoload:false project delta govern adapter readiness without installing missing packages',async t=>{
 const f=fixture(t),old=process.env.PI_CODING_AGENT_DIR;process.env.PI_CODING_AGENT_DIR=f.agentDir;t.after(()=>{if(old===undefined)delete process.env.PI_CODING_AGENT_DIR;else process.env.PI_CODING_AGENT_DIR=old;});
 const user=join(f.agentDir,'settings.json'),project=join(f.root,'.pi/settings.json');f.put(user,{packages:[packageRoot]});assert.equal(await adapterConfigured(f.root),true);
 f.put(project,{packages:[{source:packageRoot,autoload:false,skills:[]}]});assert.equal(await adapterConfigured(f.root),true);
 const resources=await new DefaultPackageManager({cwd:f.root,agentDir:f.agentDir,settingsManager:SettingsManager.create(f.root,f.agentDir,{projectTrusted:true})}).resolve(async()=>{throw Error('must not install');});assert.ok(resources.extensions.some(r=>r.enabled&&r.path.endsWith('/extensions/trellis.ts')));assert.equal(resources.skills.filter(r=>r.enabled&&r.metadata.packageRoot===packageRoot).length,10);
 f.put(project,{packages:[{source:packageRoot,autoload:false,extensions:[]}]});assert.equal(await adapterConfigured(f.root),true);
 f.put(project,{packages:[{source:packageRoot,autoload:false,extensions:['-extensions/trellis.ts']}]});assert.equal(await adapterConfigured(f.root),false);
 f.put(project,{packages:[{source:packageRoot,extensions:['+extensions/trellis.ts']}]});assert.equal(await adapterConfigured(f.root),true);
 f.put(project,{packages:[{source:packageRoot,extensions:['!extensions/trellis.ts']}]});assert.equal(await adapterConfigured(f.root),false);
 // Top-level overrides filter top-level/autodiscovered entries, not this package resource.
 f.put(project,{extensions:['-'+join(packageRoot,'extensions/trellis.ts')]});assert.equal(await adapterConfigured(f.root),true);
 f.put(project,{packages:[{source:packageRoot,extensions:[]}]});const untrusted=SettingsManager.create(f.root,f.agentDir,{projectTrusted:false});const paths=await new DefaultPackageManager({cwd:f.root,agentDir:f.agentDir,settingsManager:untrusted}).resolve(async()=> 'skip');assert.ok(paths.extensions.some(r=>r.enabled&&r.metadata.scope==='user'&&r.path.endsWith('/extensions/trellis.ts')));
 f.put(user,{});f.put(project,{packages:['npm:pi-trellis-does-not-exist@0.0.0']});assert.equal(await adapterConfigured(f.root),false);assert.equal(existsSync(join(f.agentDir,'npm/node_modules/pi-trellis-does-not-exist')),false);
});

test('npm package closure includes all fixed runtime/templates/skills/agents/licenses without project-only dependency',()=>{
 const listing=spawnSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{cwd:packageRoot,env:{...process.env,npm_config_cache:join(tmpdir(),'pi-init-npm-cache')},encoding:'utf8'});assert.equal(listing.status,0,listing.stderr);const paths=JSON.parse(listing.stdout)[0].files.map(f=>f.path);
 const walk=(root,prefix='')=>readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(root,e.name),prefix+e.name+'/'):[prefix+e.name]);
 for(const folder of ['runtime','resources/templates','skills','agents','licenses'])for(const path of walk(join(packageRoot,folder)))assert.ok(paths.includes(folder+'/'+path),folder+'/'+path);
});
