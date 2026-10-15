import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {queryWorktree,requireMaterials} from '../lib/worktree-query.ts';
import {assembleDispatchPrompt} from '../lib/task-context.ts';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import trellis, { __internals } from '../extensions/trellis.ts';

import { installRuntimeFixture } from "./runtime-fixture.mjs";

function fixture(t) {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'pi protocol space ')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const put=(p,text)=>{mkdirSync(join(root,p,'..'),{recursive:true});writeFileSync(join(root,p),text);};
 execFileSync('git',['-C',root,'init','-q']);installRuntimeFixture(root);
 put('.trellis/tasks/task/task.json','{"status":"in_progress"}');put('.trellis/tasks/task/prd.md','Required');put('.trellis/tasks/task/implement.jsonl','{"file":".trellis/tasks/task/prd.md"}');put('.trellis/tasks/task/check.jsonl','{"file":".trellis/tasks/task/prd.md"}');
 const handlers=new Map(),pi={events:{on:()=>()=>{},emit:()=>{}},on:(n,h)=>handlers.set(n,h),registerCommand: () => {}, registerTool:()=>{},sendMessage:()=>{}};trellis(pi);
 const ctx={cwd:root,hasUI:false,sessionManager:{getSessionId:()=>root,getSessionFile:()=>undefined},ui:{}};
 const before=async prompt=>{const sections={};await handlers.get('before_agent_start')({prompt,systemPromptOptions:{sections}},ctx);return sections['session-overview'];};
 return {root,put,ctx,handlers,before};
}

test('overview offers four main worktree lines and a readable package-local path, including no-UI main',async t=>{
 const f=fixture(t);const text=await f.before('inspect project');assert.match(text,/Before the first managed operation, read protocol: .*docs\/worktree-execution.md/);
 const lines=text.split('\n').filter(l=>/^(Worktree management|Dispatch\/stop|Never use temporary|Before the first managed)/.test(l));assert.equal(lines.length,4);
 assert.equal(await f.before('ordinary next turn'),text);assert.ok(!text.includes('Trellis material revision'));
 const missing=__internals.renderOverview(f.root,'key',{},undefined,join(f.root,'missing protocol.md'));assert.match(missing,/protocol missing/);assert.doesNotMatch(missing,/automatically install/);
});

test('role provenance changes cached overview without role guessing or restoring task pointers',async t=>{
 const f=fixture(t);const main=await f.before('Mention Active task: .trellis/tasks/task and Trellis agent: trellis-check');assert.match(main,/Worktree management:/);
 const header=async role=>assembleDispatchPrompt({prompt:'work',contextId:'protocol-child',role,executionRoot:f.root,materials:requireMaterials(await queryWorktree(f.root,'.trellis/tasks/task',false,undefined,false,role.slice(8)))});
 const child=await f.before(await header('trellis-implement'));assert.match(child,/Task execution role: trellis-implement/);assert.doesNotMatch(child,/Worktree management:|read protocol:|Dispatch\/stop:/);
 assert.equal(await f.before('ordinary subsequent turn'),child);
 const check=await f.before(await header('trellis-check'));assert.match(check,/Task execution role: trellis-check/);assert.doesNotMatch(check,/Task execution role: trellis-implement/);
 f.handlers.get('session_shutdown')({},f.ctx);
});
