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
  put(".trellis/scripts/task.py", "print('{}')");
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
test("child accepts explicit task/context header and uses that task rather than its own pointer", async (t) => {
  const f = setup(t), parent = f.ctx("parent"), child = f.ctx("child");
  f.pointer(parent, "a"); f.pointer(child, "b");
  const input = { subagent_type: "trellis-implement", prompt: "implement" };
  await f.call(parent, input);
  const sections = {};
  await f.handlers.get("before_agent_start")({ prompt: input.prompt, systemPromptOptions: { sections } }, child);
  assert.equal(__internals.contextKey(f.root, child), __internals.contextKey(f.root, parent));
  assert.match(f.messages.at(-1).content, /Active task: .trellis\/tasks\/a/);
  assert.ok(!Object.hasOwn(sections, "trellis-workflow"));
  const shell = { command: "python3 .trellis/scripts/task.py current --source" };
  await f.call(child, shell, "bash");
  assert.ok(shell.command.startsWith(`export TRELLIS_CONTEXT_ID=${__internals.contextKey(f.root, parent)}\n`));
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
