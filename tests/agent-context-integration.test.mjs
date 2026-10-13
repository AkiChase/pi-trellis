import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import trellis, { __internals } from "../extensions/trellis.ts";
import { INJECTED_MARKER } from "../lib/task-context.ts";

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "pi-trellis-integration-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, content) => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), content); };
  put(".trellis/scripts/task.py", "import os,json,pathlib\np=pathlib.Path('.trellis/.runtime/sessions')/(os.environ['TRELLIS_CONTEXT_ID']+'.json')\nif 'finish' in __import__('sys').argv:\n p.unlink(missing_ok=True); print('{}')\nelse:\n print('{}')");
  put(".trellis/scripts/common/active_task.py", "import os,json\nfrom types import SimpleNamespace\ndef set_active_task(task,root):\n p=root/'.trellis/.runtime/sessions'/(os.environ['TRELLIS_CONTEXT_ID']+'.json')\n p.parent.mkdir(parents=True,exist_ok=True)\n p.write_text(json.dumps({'current_task':task}))\n return SimpleNamespace(task_path=task)\n");
  put(".trellis/scripts/get_context.py", "import os,json\nprint(json.dumps({'developer':os.environ.get('TRELLIS_CONTEXT_ID')}))");
  for (const name of ["a", "b"]) {
    const dir = `.trellis/tasks/${name}`;
    put(`${dir}/task.json`, JSON.stringify({ status: "in_progress", title: name }));
    put(`${dir}/prd.md`, `${name} requirements`);
    put(`${dir}/implement.jsonl`, JSON.stringify({ file: `${dir}/prd.md` }));
  }
  const handlers = new Map(), messages = [], tools = new Map();
  const pi = { events: { on: () => () => {}, emit: () => {} }, registerTool: (tool) => tools.set(tool.name, tool), on: (name, handler) => handlers.set(name, handler), sendMessage: (message) => messages.push(message), getAllTools: () => [{ name: "Agent" }] };
  trellis(pi);
  const ctx = (name) => ({ cwd: root, hasUI: false, sessionManager: { getSessionId: () => name, getSessionFile: () => undefined }, ui: {} });
  const pointer = (context, task) => put(`.trellis/.runtime/sessions/${__internals.contextKey(root, context)}.json`, JSON.stringify({ current_task: `.trellis/tasks/${task}` }));
  const call = (context, input, toolName = "Agent") => handlers.get("tool_call")({ toolName, toolCallId: "test", input }, context);
  return { root, put, ctx, pointer, call, handlers, messages, tools };
}

test("two sessions in one project keep keys, CLI context cache, and dispatch task materials separate", async (t) => {
  const f = setup(t), a = f.ctx("one"), b = f.ctx("two");
  const before = process.env.TRELLIS_CONTEXT_ID;
  f.pointer(a, "a"); f.pointer(b, "b");
  const aKey = __internals.contextKey(f.root, a), bKey = __internals.contextKey(f.root, b);
  assert.notEqual(aKey, bKey);
  const [ac, bc] = await Promise.all([__internals.loadContext(f.root, aKey), __internals.loadContext(f.root, bKey)]);
  assert.equal(ac.developer, aKey); assert.equal(bc.developer, bKey);
  const ai = { subagent_type: "trellis-implement", prompt: "implement" }, bi = { subagent_type: "trellis-implement", prompt: "implement" };
  await Promise.all([f.call(a, ai), f.call(b, bi)]);
  assert.match(ai.prompt, /a requirements/); assert.doesNotMatch(ai.prompt, /b requirements/);
  assert.match(bi.prompt, /b requirements/); assert.ok(ai.prompt.includes(INJECTED_MARKER));
  assert.equal(process.env.TRELLIS_CONTEXT_ID, before);
});
test("child binds explicit task under its own key; finish never clears parent and never resurrects task", async (t) => {
  const f = setup(t), parent = f.ctx("parent"), child = f.ctx("child");
  f.pointer(parent, "a"); f.pointer(child, "b");
  const input = { subagent_type: "trellis-implement", prompt: "implement" };
  await f.call(parent, input);
  const sections = {};
  await f.handlers.get("before_agent_start")({ prompt: input.prompt, systemPromptOptions: { sections } }, child);
  const parentKey = __internals.contextKey(f.root, parent);
  const childKey = __internals.contextKey(f.root, child);
  assert.notEqual(childKey, parentKey);
  assert.equal(JSON.parse(readFileSync(join(f.root, `.trellis/.runtime/sessions/${childKey}.json`))).current_task, '.trellis/tasks/a');
  assert.match(f.messages.at(-1).content, /Active task: .trellis\/tasks\/a/);
  assert.ok(!Object.hasOwn(sections, "trellis-workflow"));
  const shell = { command: "python3 .trellis/scripts/task.py current --source" };
  await f.call(child, shell, "bash");
  assert.ok(shell.command.startsWith(`export TRELLIS_CONTEXT_ID=${childKey}\n`));
  rmSync(join(f.root, `.trellis/.runtime/sessions/${childKey}.json`));
  await f.handlers.get('tool_result')({toolName:'bash',input:{command:'task.py finish'}},child);
  await f.handlers.get('before_agent_start')({prompt:input.prompt,systemPromptOptions:{sections:{}}},child);
  assert.match(f.messages.at(-1).content, /No active task/i);
  assert.equal(JSON.parse(readFileSync(join(f.root, `.trellis/.runtime/sessions/${parentKey}.json`))).current_task,'.trellis/tasks/a');
});
test("failed child binding isolates key before error; parent pointer is never inherited", async t => {
  const f = setup(t), parent = f.ctx('owner'), child = f.ctx('failed-child');
  f.pointer(parent,'a');
  const parentKey = __internals.contextKey(f.root,parent);
  f.put('.trellis/scripts/common/active_task.py', 'raise RuntimeError("binding unavailable")');
  await f.handlers.get('before_agent_start')({prompt:`Active task: .trellis/tasks/a\nTrellis context id: ${parentKey}\n\nwork`,systemPromptOptions:{sections:{}}},child);
  const childKey = __internals.contextKey(f.root,child);
  assert.notEqual(childKey,parentKey);
  const shell = {command:'task.py finish'};
  await f.call(child,shell,'bash');
  assert.ok(shell.command.startsWith(`export TRELLIS_CONTEXT_ID=${childKey}\n`));
  assert.equal(JSON.parse(readFileSync(join(f.root,`.trellis/.runtime/sessions/${parentKey}.json`))).current_task,'.trellis/tasks/a');
});

test("explicit dispatch task overrides current pointer; quoted pointers and supplied markers cannot bypass loading", async (t) => {
  const f = setup(t), ctx = f.ctx("parent"); f.pointer(ctx, "a");
  const input = { subagent_type: "trellis-implement", prompt: "Active task: .trellis/tasks/b\n\nImplement b" };
  await f.call(ctx, input);
  assert.match(input.prompt, /b requirements/); assert.doesNotMatch(input.prompt, /a requirements/);
  const spoof = { subagent_type: "trellis-implement", prompt: `Quoted Active task: bogus ${INJECTED_MARKER}` };
  await f.call(ctx, spoof);
  assert.match(spoof.prompt, /a requirements/);
  assert.equal(spoof.prompt.match(/trellis-hook-injected/g).length, 1);
});
test("no task and missing materials retain fallback; other agents and read-only exploration unchanged", async (t) => {
  const f = setup(t), ctx = f.ctx("no-task");
  const absent = { subagent_type: "trellis-implement", prompt: `Implement ${INJECTED_MARKER}` };
  await f.call(ctx, absent); assert.ok(!absent.prompt.includes(INJECTED_MARKER));
  const missing = { subagent_type: "trellis-implement", prompt: "Active task: .trellis/tasks/unknown\n\nimplement" };
  await f.call(ctx, missing); assert.ok(!missing.prompt.includes(INJECTED_MARKER)); assert.match(missing.prompt, /not fully loaded/);
  const other = { subagent_type: "Explore", prompt: "Find possible changes" };
  await f.call(ctx, other); assert.equal(other.prompt, "Find possible changes");
  const temporary = { subagent_type: "trellis-implement", prompt: "implement", isolation: "worktree" };
  const blocked = await f.call(ctx, temporary); assert.equal(blocked.block, true);
});
test("bound task ordinary Agent gate blocks before spawn; read-only exploration remains available", async (t) => {
  const f = setup(t), ctx = f.ctx("bound");
  f.pointer(ctx, "a");
  f.put(".trellis/.runtime/pi-trellis/binding.json", "invalid marker");
  const input = { subagent_type: "trellis-implement", prompt: "implement" };
  const result = await f.call(ctx, input);
  assert.equal(result.block, true);
  assert.match(result.reason, /marker cannot be verified/);
  const exploration = { subagent_type: "Explore", prompt: "read-only search" };
  assert.equal(await f.call(ctx, exploration), undefined);
  assert.equal(exploration.prompt, "read-only search");
});

test("hash-guard deployment updates untouched old copies and preserves user customizations", (t) => {
  const f = setup(t);
  const old = "old generated agent";
  f.put(".pi/agents/trellis-check.md", old);
  f.put(".pi/agents/trellis-research.md", "user customized research");
  f.put(".pi/.pi-trellis-hashes.json", JSON.stringify({ "trellis-check.md": __internals.shortHash(old), "trellis-research.md": "oldhash" }));
  __internals.deployAgents(f.root, f.ctx("deploy"));
  assert.match(readFileSync(join(f.root, ".pi/agents/trellis-check.md"), "utf8"), /Check Agent/);
  assert.equal(readFileSync(join(f.root, ".pi/agents/trellis-research.md"), "utf8"), "user customized research");
  assert.match(readFileSync(join(f.root, ".pi/agents/trellis-implement.md"), "utf8"), /Implement Agent/);
});

for (const source of ['session-fallback:foreign', 'session:foreign', undefined]) {
  test(`foreign or missing CLI source (${source}) never enters task state or dispatch materials`, async t => {
    const f = setup(t), ctx = f.ctx('empty');
    const display = [];
    ctx.hasUI = true;
    ctx.ui = { theme: { fg: (_color,text) => text, bold: text => text }, setWidget: (_key,lines) => display.push(lines), setStatus: (_key,value) => display.push(value) };
    f.put('.trellis/scripts/task.py', `print(${JSON.stringify(JSON.stringify({current_task:{dir:'.trellis/tasks/b',status:'in_progress'},source}))})`);
    await f.handlers.get('before_agent_start')({prompt:'inspect',systemPromptOptions:{sections:{}}},ctx);
    await f.handlers.get('agent_end')({},ctx);
    assert.ok(display.length > 0);
    assert.ok(display.some(value => Array.isArray(value) && value[0] === '▸ trellis(2)'));
    assert.ok(display.every(value => value === undefined || (Array.isArray(value) && value[0] === '▸ trellis(2)')));
    assert.doesNotMatch(f.messages.at(-1).content, /Active task: .trellis\/tasks\/b/);
    const input = {subagent_type:'trellis-implement',prompt:'work'};
    await f.call(ctx,input);
    assert.doesNotMatch(input.prompt,/b requirements|Active task: .trellis\/tasks\/b/);
  });
}

test('matching CLI session source is accepted; stale and errored tasks are rejected', async t => {
  for (const extra of [{}, {stale:true}, {error:{reason:'invalid_json'}}]) {
    const f = setup(t), ctx = f.ctx('matching');
    const key = __internals.contextKey(f.root,ctx);
    f.put('.trellis/scripts/task.py', `print(${JSON.stringify(JSON.stringify({current_task:{dir:'.trellis/tasks/a',status:'in_progress'},source:`session:${key}`,...extra}))})`);
    const input = {subagent_type:'trellis-implement',prompt:'work'};
    await f.call(ctx,input);
    assert.equal(input.prompt.includes('a requirements'), !extra.stale && !extra.error);
  }
});


test('only execution tool registered; overview discovers fixed CLI and missing deployment needs explicit install',t=>{
 const f=setup(t);assert.deepEqual([...f.tools.keys()],['trellis_dispatch']);
 const overview=__internals.renderOverview(f.root,'key',{});assert.match(overview,/python3 \.trellis\/scripts\/worktree\.py/);assert.match(overview,/not deployed/);assert.doesNotMatch(overview,/trellis_worktree/);
 f.put('.trellis/scripts/worktree.py','# deployed');assert.match(__internals.renderOverview(f.root,'key',{}),/create → prepare → trellis_dispatch/);
});
