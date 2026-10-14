import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,chmodSync,lstatSync,symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,dirname } from 'node:path';
import test from 'node:test';
import { adoptPlan,applyAdoptPlan,adoptionSummary } from '../lib/initialization/adoption.ts';
import { inspect,verifyRuntime,digest } from '../lib/initialization/engine.ts';
function fixture(t) {
 const root=mkdtempSync(join(tmpdir(),'pi-adopt-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(p,s)=>{mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),s);};
 put('.trellis/.developer','name=Old User\ninitialized_at=legacy\n');put('.trellis/scripts/task.py','legacy runtime');put('.trellis/scripts/extra.py','custom script');put('.trellis/.version','0.6.16');put('.trellis/workflow.md','custom workflow\r\n');put('.trellis/config.yaml','custom config');put('.trellis/tasks/old/task.json','history');put('.trellis/workspace/Old User/journal-1.md','journal');put('AGENTS.md','prefix\r\n<!-- TRELLIS:START -->old<!-- TRELLIS:END -->\r\nsuffix');chmodSync(join(root,'AGENTS.md'),0o640);
 return {root,put};
}
test('adopts legacy with exact runtime, preserved documents/modes, no backups/deletion/onboarding',t=>{
 const f=fixture(t),p=adoptPlan(f.root);assert.equal(inspect(f.root).state,'unsupported');assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));assert.match(adoptionSummary(p),/Legacy — left in place: .trellis\/scripts\/extra.py/);
 assert.equal(applyAdoptPlan(p).state,'ready');const m=verifyRuntime(f.root);
 for(const [path,r] of Object.entries(m.files)){assert.equal(digest(readFileSync(join(f.root,path))),r.sha256);assert.equal(lstatSync(join(f.root,path)).mode&0o777,r.mode);}
 assert.equal(m.templates['.trellis/workflow.md'].origin,'preserved-project');assert.equal(m.templates['.trellis/spec/index.md'].origin,'package-default');
 for(const [path,text] of [['.trellis/workflow.md','custom workflow\r\n'],['.trellis/config.yaml','custom config'],['.trellis/tasks/old/task.json','history'],['.trellis/workspace/Old User/journal-1.md','journal'],['.trellis/scripts/extra.py','custom script'],['.trellis/.version','0.6.16']])assert.equal(readFileSync(join(f.root,path),'utf8'),text);
 const agents=readFileSync(join(f.root,'AGENTS.md'),'utf8');assert.ok(agents.startsWith('prefix\r\n'));assert.ok(agents.endsWith('\r\nsuffix'));assert.equal(lstatSync(join(f.root,'AGENTS.md')).mode&0o777,0o640);
 assert.ok(!existsSync(join(f.root,'.trellis/.runtime/adopt-backups')));assert.ok(!existsSync(join(f.root,'.trellis/.runtime/init-operation.json')));assert.ok(!existsSync(join(f.root,'.trellis/tasks/00-bootstrap-guidelines')));assert.throws(()=>adoptPlan(f.root));
});
test('missing identity adopts as supported and interrupted manifest-less adoption can be reconfirmed',t=>{
 const f=fixture(t);rmSync(join(f.root,'.trellis/.developer'));assert.throws(()=>applyAdoptPlan(adoptPlan(f.root),{afterWrite:()=>{throw Error('interrupted');}}),/Partial files/);assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));assert.ok(!existsSync(join(f.root,'.trellis/.runtime/init.lock')));assert.equal(applyAdoptPlan(adoptPlan(f.root)).state,'supported');
});
for(const [path,text] of [['.trellis/.runtime/init.lock','owner'],['.trellis/.runtime/init-operation.json','{}'],['.trellis/.pi-trellis.json','{}'],['.trellis/.runtime/pi-trellis/binding.json','{}'],['AGENTS.md','<!-- TRELLIS:START -->']])test(`reject ${path} before writes`,t=>{const f=fixture(t);f.put(path,text);assert.throws(()=>adoptPlan(f.root));assert.equal(readFileSync(join(f.root,'.trellis/scripts/task.py'),'utf8'),'legacy runtime');});
test('forged/stale plans and symlink targets reject without modifying legacy runtime',t=>{
 const f=fixture(t),p=adoptPlan(f.root);p.changes[0].data=Buffer.from('arbitrary');assert.throws(()=>applyAdoptPlan(p),/changed since/);const q=adoptPlan(f.root);f.put('.trellis/workflow.md','new edits');assert.throws(()=>applyAdoptPlan(q),/changed since/);assert.equal(readFileSync(join(f.root,'.trellis/scripts/task.py'),'utf8'),'legacy runtime');
 rmSync(join(f.root,'.trellis/scripts/task.py'));symlinkSync('/tmp/missing-adopt-victim',join(f.root,'.trellis/scripts/task.py'));assert.throws(()=>adoptPlan(f.root),/symlink/);
});
test('concurrent preserved-template edit during publication leaves manifest unpublished',t=>{const f=fixture(t);assert.throws(()=>applyAdoptPlan(adoptPlan(f.root),{afterWrite:()=>f.put('.trellis/workflow.md','concurrent')}),/Concurrent change/);assert.ok(!existsSync(join(f.root,'.trellis/.pi-trellis.json')));assert.equal(readFileSync(join(f.root,'.trellis/workflow.md'),'utf8'),'concurrent');});
