import { closeSync, fchmodSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { checkedPath, defaultTemplates, digest, packageResources, packageRoot, runtimeBaseline, type InstalledManifest } from "./engine.ts";

const MANIFEST = ".trellis/.pi-trellis.json";
const OPERATION = ".trellis/.runtime/init-operation.json";
const LOCK = ".trellis/.runtime/init.lock";
type Stamp = { sha256: string; mode: number };
export interface ResourceReport { root: string; installed: string; available: string; rows: { path: string; state: string }[]; conflicts: string[] }
interface Change { path: string; data: Buffer; mode: number; before: Stamp | null }
export interface ResourcePlan { report: ResourceReport; mode: "update" | "repair"; changes: Change[]; manifest: InstalledManifest; original: string }
function read(root: string, path: string): Buffer | undefined {
 const p = checkedPath(root, path);
 try { const s = lstatSync(p); if (!s.isFile() || s.size > 4 * 1024 * 1024) throw new Error(`Invalid resource file: ${path}`); return readFileSync(p); }
 catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw e; }
}
function stamp(root: string, path: string): Stamp | null { const b = read(root,path); return b ? { sha256:digest(b),mode:lstatSync(checkedPath(root,path)).mode & 0o777 } : null; }
function equal(a: Stamp | null,b: Stamp | null): boolean { return a?.sha256 === b?.sha256 && a?.mode === b?.mode; }
function oldManifest(root: string): { manifest: InstalledManifest; raw: Buffer } {
 const raw=read(root,MANIFEST); if (!raw) throw new Error("No managed project manifest. General migration is not available. Initialize a new project first.");
 const m=JSON.parse(raw.toString()) as InstalledManifest;
 const expected=packageResources(), templates=defaultTemplates();
 if (!m || m.schemaVersion!==2 || !/^pi-trellis-runtime-v1-[a-f0-9]{64}$/.test(m.runtimeReleaseId) || !m.files || !m.templates || Object.keys(m).sort().join()!==["files","runtimeReleaseId","schemaVersion","templates"].sort().join()) throw new Error("Invalid managed project manifest");
 if (Object.keys(m.files).sort().join()!==Object.keys(expected).sort().join() || Object.keys(m.templates).sort().join()!==Object.keys(templates).sort().join()) throw new Error("Unsupported resource inventory; explicit reconciliation is required");
 for(const [path,r] of Object.entries(m.files)) {
  const e=expected[path]; if(!r || Object.keys(r).sort().join()!==["sha256","mode","kind","source"].sort().join() || r.source!==e.source || r.kind!==e.kind || !/^[a-f0-9]{64}$/.test(r.sha256) || !Number.isInteger(r.mode) || r.mode<0 || r.mode>0o777) throw new Error(`Invalid resource ownership: ${path}`);
 }
 for(const [path,r] of Object.entries(m.templates)) {
  if(!r || Object.keys(r).sort().join()!==["origin","sha256","mode","source"].sort().join()) throw new Error(`Invalid template provenance: ${path}`);
  if(r.origin==="package-default") { if(r.source!==templates[path].source) throw new Error(`Invalid template source: ${path}`); }
  else if(r.origin==="preserved-project") { if(!r.source || typeof r.source!=="object" || Object.keys(r.source).sort().join()!=="kind,revision" || r.source.kind!=="project-snapshot" || !(r.source.revision===null || /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(r.source.revision))) throw new Error(`Invalid preserved source: ${path}`); }
  else throw new Error(`Invalid template origin: ${path}`);
  if(r.origin==="preserved-project" && r.sha256===null && r.mode===null) continue;
  if(!r.sha256 || !/^[a-f0-9]{64}$/.test(r.sha256) || !Number.isInteger(r.mode) || (r.mode as number)<0 || (r.mode as number)>0o777) throw new Error(`Invalid template fingerprint: ${path}`);
 }
 const op=read(root,OPERATION); if(op && JSON.parse(op.toString()).status!=="complete") throw new Error("Initialization is incomplete; finish or inspect it before updating resources");
 return {manifest:m,raw};
}
export function resourcePlan(rootInput: string, mode: "update" | "repair"): ResourcePlan {
 if (mode!=="update" && mode!=="repair") throw new Error("Invalid resource operation");
 const root=realpathSync(rootInput); if(root===realpathSync(homedir())) throw new Error("Project directory required, not HOME");
 if(read(root,".trellis/.runtime/pi-trellis/binding.json")) throw new Error("Manage resources from the source project, not a worktree");
 const {manifest:old,raw}=oldManifest(root);const expected=packageResources(),defaults=defaultTemplates();
 const report:ResourceReport={root,installed:old.runtimeReleaseId,available:runtimeBaseline().releaseId,rows:[],conflicts:[]};
 const changes:Change[]=[],next:InstalledManifest=JSON.parse(JSON.stringify(old));
 for(const [path,want] of Object.entries(expected)) {
  const prior=old.files[path],actual=stamp(root,path);
  if(actual && equal(actual,want)) { report.rows.push({path,state:"Current"});next.files[path]=want;continue; }
  if(actual && !equal(actual,prior)) { report.rows.push({path,state:"Modified — preserved"});report.conflicts.push(path);continue; }
  if(mode==="repair" && actual) {report.rows.push({path,state:"Update available"});continue;}
  const data=readFileSync(checkedPath(packageRoot,want.source));
  if(digest(data)!==want.sha256) throw new Error(`Package hash mismatch: ${path}`);
  changes.push({path,data,mode:want.mode,before:actual});next.files[path]=want;report.rows.push({path,state:actual?"Safe update":"Missing — repair"});
 }
 for(const [path,want] of Object.entries(defaults)) {
  const prior=old.templates[path],actual=stamp(root,path);
  if(prior.origin==="preserved-project" || actual && !equal(actual,{sha256:prior.sha256!,mode:prior.mode!})) {report.rows.push({path,state:"User document — preserved"});if(prior.origin==="package-default")next.templates[path]={origin:"preserved-project",sha256:actual!.sha256,mode:actual!.mode,source:{kind:"project-snapshot",revision:null}};continue;}
  if(actual && equal(actual,want)) {report.rows.push({path,state:"Current template"});next.templates[path]=want;continue;}
  if(mode==="repair" && actual) {report.rows.push({path,state:"Template update available"});continue;}
  const data=readFileSync(checkedPath(packageRoot,want.source));
  changes.push({path,data,mode:want.mode,before:actual});next.templates[path]=want;report.rows.push({path,state:actual?"Safe template update":"Missing template — repair"});
 }
 if(Object.entries(expected).every(([p,r])=>equal(next.files[p],r))) next.runtimeReleaseId=report.available;
 return {report,mode,changes,manifest:next,original:digest(raw)};
}
export function resourceStatus(root:string):string {
 try { const {report}=resourcePlan(root,"update");return ["Project resource health",`Project: ${report.root}`,`Installed runtime: ${report.installed}`,`Available runtime: ${report.available}`,`Runtime version: ${report.installed===report.available?"Current":"Update available"}`, `Developer: ${(()=>{try{return read(report.root,".trellis/.developer")?.toString().split(/\r?\n/).find(l=>l.startsWith("name="))?.slice(5) ?? "Not set";}catch{return "Invalid identity";}})()}`,"",...report.rows.map(r=>`${r.state}: ${r.path}`),"","Skills: loaded from the installed Pi package; no project copies.","Identity, tasks, journals and runtime session state are never reset."].join("\n"); }
 catch(e){return `Project resource health\n${String(e)}\nNo resources changed.`;}
}
export function applyResourcePlan(value:ResourcePlan):void {
 if(value.mode!=="update" && value.mode!=="repair")throw new Error("Invalid resource operation");
 const fresh=resourcePlan(value.report.root,value.mode);
 const signature=(p:ResourcePlan)=>digest(JSON.stringify({original:p.original,mode:p.mode,changes:p.changes.map(c=>({...c,data:c.data.toString("base64")})),manifest:p.manifest}));
 if(signature(fresh)!==signature(value)) throw new Error("Project or package changed since preview; review again");
 if(fresh.report.conflicts.length) throw new Error(`Modified managed files preserved; resolve conflicts before updating: ${fresh.report.conflicts.join(", ")}`);
 const root=fresh.report.root,lock=checkedPath(root,LOCK);mkdirSync(dirname(lock),{recursive:true});const fd=openSync(lock,"wx",0o600);closeSync(fd);
 const atomic=(path:string,data:Buffer,mode:number,before:Stamp|null)=>{
  const target=checkedPath(root,path);if(!equal(stamp(root,path),before)) throw new Error(`Concurrent change preserved: ${path}`);
  mkdirSync(dirname(target),{recursive:true});checkedPath(root,path);const tmp=target+"."+randomUUID()+".update-tmp";let f:number|undefined;
  try {f=openSync(tmp,"wx",mode);writeFileSync(f,data);fchmodSync(f,mode);closeSync(f);f=undefined;if(!equal(stamp(root,path),before))throw new Error(`Concurrent change preserved: ${path}`);renameSync(tmp,target);}finally{if(f!==undefined)closeSync(f);try{unlinkSync(tmp);}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}}
 };
 try {
  if(signature(resourcePlan(root,value.mode))!==signature(fresh))throw new Error("Resources changed before publication; review again");
  const manifestBefore=stamp(root,MANIFEST);
  if(digest(read(root,MANIFEST)!)!==fresh.original)throw new Error("Manifest changed since preview");
  for(const c of fresh.changes)atomic(c.path,c.data,c.mode,c.before);
  // A completed init audit record describes the previous release; it grants no update authority.
  // Retain it as history, outside the initializer's live recovery record.
  const op=read(root,OPERATION);if(op){const archive=".trellis/.runtime/init-completed-"+digest(op)+".json";if(!read(root,archive))atomic(archive,op,0o600,null);if(!read(root,OPERATION)?.equals(op))throw new Error("Initialization record changed");unlinkSync(checkedPath(root,OPERATION));}
  atomic(MANIFEST,Buffer.from(JSON.stringify(fresh.manifest,null,2)+"\n"),0o644,manifestBefore);
 } finally {unlinkSync(lock);}
}
