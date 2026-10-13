import assert from "node:assert/strict";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync, symlinkSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters as plain } from "node:util";
import test from "node:test";
import trellis, { __internals as ui } from "../extensions/trellis.ts";

const colors = { accent: 36, success: 32, warning: 33, error: 31, muted: 90, dim: 2, text: 37 };
const theme = { fg: (color, text) => `\x1b[${colors[color]}m${text}\x1b[0m`, bold: text => `\x1b[1m${text}\x1b[0m` };
const task = (dir = ".trellis/tasks/current", status = "in_progress", children = 2) => ({ dir, status, children, artifacts: { prd: true, design: false, implement: true } });

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), "pi-trellis-display-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, value) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), value);
  };
  const record = (name, value = { status: "planning" }) => put(`.trellis/tasks/${name}/task.json`, JSON.stringify(value));
  mkdirSync(join(root, ".trellis/tasks"), { recursive: true });
  put(".trellis/scripts/task.py", "import json,os\nprint(json.dumps({'source':'session:'+os.environ['TRELLIS_CONTEXT_ID'],'current_task':None}))");
  put(".trellis/scripts/get_context.py", "print('{}')");
  const handlers = new Map(), display = { status: undefined, widget: undefined }, messages = [];
  trellis({ events: { on: () => () => {}, emit: () => {} }, registerTool: () => {}, on: (name, fn) => handlers.set(name, fn), sendMessage: message => messages.push(message), getAllTools: () => [{ name: "Agent" }] });
  const ctx = { cwd: root, hasUI: true, sessionManager: { getSessionId: () => "display", getSessionFile: () => undefined }, ui: {
    theme, setWidget: (key, lines, options) => { assert.equal(key, "trellis"); display.widget = lines; display.options = options; },
    setStatus: (key, value) => { assert.equal(key, "trellis"); display.status = value; }
  } };
  const key = ui.contextKey(root, ctx);
  const pointer = name => put(`.trellis/.runtime/sessions/${key}.json`, JSON.stringify({ current_task: `.trellis/tasks/${name}` }));
  const changed = () => handlers.get("tool_result")({ toolName: "bash", input: { command: "python3 .trellis/scripts/task.py finish" } }, ctx);
  return { root, put, record, handlers, display, ctx, key, pointer, changed, messages };
}

test("no-task widget uses tightly appended themed positive, zero and unknown counts", () => {
  for (const [count, color, text] of [[3, "accent", "3"], [0, "dim", "0"], [undefined, "muted", "?"]]) {
    const lines = ui.renderWidget(theme, undefined, count);
    assert.deepEqual(lines.map(plain), [`▸ trellis(${text})`]);
    assert.ok(lines[0].startsWith(theme.fg("muted", "▸ trellis")));
    assert.ok(lines[0].endsWith(theme.fg(color, `(${text})`)));
  }
});

test("active widget keeps full name, status, conditional subtask count and artifacts", () => {
  const lines = ui.renderWidget(theme, task(), 3);
  assert.equal(plain(lines[0]), "▸ trellis(3) · current · in_progress · 2 subtasks · prd ✓ design · impl ✓");
  assert.ok(lines[0].includes(theme.bold(theme.fg("text", "current"))));
  assert.ok(lines[0].includes(theme.fg("accent", "in_progress")));
  assert.ok(lines[0].includes(theme.fg("success", "prd ✓")));
  assert.ok(lines[0].includes(theme.fg("dim", "design ·")));
  assert.match(plain(ui.renderWidget(theme, task(undefined, "planning", 1), 3)[0]), /1 subtask ·/);
  assert.doesNotMatch(plain(ui.renderWidget(theme, task(undefined, "planning", 0), 3)[0]), /subtask/);
});

test("footer preserves fitting ASCII, CJK, combining and emoji names and statuses", () => {
  const cases = [
    ["current", "in_progress"], // 33 columns, formerly clipped to cur…
    ["abcdefghijk", "planning"], // exactly 34 columns
    ["任务任务", "planning"],
    ["e\u0301".repeat(10), "planning"],
    ["🚀".repeat(5), "planning"],
    ["👨‍👩‍👧‍👦".repeat(5), "planning"],
    ["👍🏽".repeat(5), "planning"],
    ["a", "任务任务"],
    ["a", "e\u0301".repeat(15)],
    ["a", "🚀".repeat(7)],
  ];
  for (const [name, status] of cases) {
    const expected = `trellis(3): ${name} ▸ ${status}`;
    assert.ok(visibleWidth(expected) <= 34, expected);
    const result = ui.renderStatus(theme, task(`.trellis/tasks/${name}`, status), 3);
    assert.equal(plain(result), expected);
    assert.ok(result.includes(theme.fg("text", name)));
    assert.ok(result.includes(theme.fg(ui.statusColor(status), status)));
  }
});

test("footer is themed, persistent and capped at 34 terminal columns with complete counts", () => {
  const counts = [[3, "accent", "3"], [0, "dim", "0"], [undefined, "muted", "?"], [Number.MAX_SAFE_INTEGER, "accent", String(Number.MAX_SAFE_INTEGER)]];
  const names = ["a", "long-task-name-".repeat(30), "任务".repeat(200), "e\u0301".repeat(200), "👨‍👩‍👧‍👦".repeat(100), "👍🏽".repeat(100)];
  const statuses = ["planning", "in_progress", "completed", "task_error", "x".repeat(200), "长".repeat(200), "e\u0301".repeat(200), "🚀".repeat(100)];
  for (const [count, color, digits] of counts) {
    const empty = ui.renderStatus(theme, undefined, count);
    assert.equal(plain(empty), `trellis(${digits})`);
    assert.ok(empty.includes(theme.fg(color, `(${digits})`)));
    assert.ok(visibleWidth(empty) <= 34);
    for (const status of statuses) {
      for (const name of names) {
        const result = ui.renderStatus(theme, task(`.trellis/tasks/${name}`, status), count);
        const text = plain(result);
        const prefix = `trellis(${digits}): `, separator = " ▸ ";
        const budget = 34 - visibleWidth(prefix + separator);
        const expectedStatus = plain(truncateToWidth(status, budget - 1, "…"));
        const expectedName = plain(truncateToWidth(name, budget - visibleWidth(expectedStatus), "…"));
        assert.equal(text, prefix + expectedName + separator + expectedStatus);
        assert.ok(visibleWidth(result) <= 34, text);
        assert.ok(result.includes(theme.fg(color, `(${digits})`)));
        // No helper-generated reset can interrupt either semantic color span.
        assert.ok(result.includes(theme.fg("text", expectedName)));
        assert.ok(result.includes(theme.fg(ui.statusColor(status), expectedStatus)));
        assert.doesNotMatch(text, /[\x00-\x1f\x7f-\x9f]/);
      }
    }
  }
  assert.equal(plain(ui.renderStatus(theme, task(), 3)), "trellis(3): current ▸ in_progress");
});

test("footer strips input ANSI and replaces control characters before measuring and theming", () => {
  for (const [name, status, expectedName, expectedStatus] of [
    ["\x1b[31mred\x1b[0m", "\x1b[32mplanning\x1b[0m", "red", "planning"],
    ["\x1b]0;title\x07red", "planning", "red", "planning"],
    ["\x1b]8;;https:example\x1b\\red\x1b]8;;\x1b\\", "planning", "red", "planning"],
    ["a\n\r\t\x00\x07\x7f\x85b", "p\nst", "a       b", "p st"],
  ]) {
    const result = ui.renderStatus(theme, task(`.trellis/tasks/${name}`, status), 3);
    assert.equal(plain(result), `trellis(3): ${expectedName} ▸ ${expectedStatus}`);
    assert.ok(result.includes(theme.fg("text", expectedName)));
    assert.ok(result.includes(theme.fg(ui.statusColor(status), expectedStatus)));
    assert.ok(visibleWidth(result) <= 34);
    assert.doesNotMatch(plain(result), /[\x00-\x1f\x7f-\x9f]/);
  }
});

test("count enumerates valid immediate records independent of children, pointers and assignees", t => {
  const f = setup(t);
  f.record("parent", { status: "planning", children: ["child", "child"], assignee: "someone" });
  f.record("child", { status: "in_progress", parent: "parent" });
  f.record("other-session", { status: "review", assignee: "another" });
  f.record("completed", { status: "completed" });
  f.record("archive/2026-10/old", { status: "in_progress" });
  f.put(".trellis/tasks/nested/group/task.json", JSON.stringify({ status: "planning" }));
  f.put(".trellis/tasks/readme.md", "not a task");
  f.pointer("parent");
  f.put(".trellis/.runtime/sessions/foreign.json", JSON.stringify({ current_task: ".trellis/tasks/other-session" }));
  const before = readFileSync(join(f.root, ".trellis/tasks/parent/task.json"), "utf8");
  assert.equal(ui.readUnfinishedTaskCount(f.root), 3);
  assert.equal(readFileSync(join(f.root, ".trellis/tasks/parent/task.json"), "utf8"), before);
  f.record("other-session", { status: "completed" });
  assert.equal(ui.readUnfinishedTaskCount(f.root), 2);
  f.record("parent", { status: "completed" });
  f.record("child", { status: "completed" });
  assert.equal(ui.readUnfinishedTaskCount(f.root), 0);
});

test("count supports top-level external task store and counts internal directory aliases once, not archives", t => {
  const f = setup(t);
  const external = mkdtempSync(join(tmpdir(), "pi-trellis-store-"));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  rmSync(join(f.root, ".trellis/tasks"), { recursive: true });
  symlinkSync(external, join(f.root, ".trellis/tasks"));
  f.record("a");
  f.record("b");
  f.record("archive/old", { status: "planning" });
  symlinkSync("a", join(external, "alias"));
  symlinkSync("archive/old", join(external, "old-alias"));
  assert.equal(ui.readUnfinishedTaskCount(f.root), 2);
  mkdirSync(join(f.root, "foreign"));
  symlinkSync(join(f.root, "foreign"), join(external, "escape"));
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
});

test("count excludes aliases into a symlinked archive; dangling archive is unknown", t => {
  const f = setup(t);
  f.record("active");
  f.record("retired/old", { status: "in_progress" });
  symlinkSync("retired", join(f.root, ".trellis/tasks/archive"));
  symlinkSync("archive/old", join(f.root, ".trellis/tasks/old-alias"));
  assert.equal(ui.readUnfinishedTaskCount(f.root), 1);
  rmSync(join(f.root, ".trellis/tasks/retired"), { recursive: true });
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
});

for (const bad of ["{broken", "null", "[]", JSON.stringify({ status: 42 }), JSON.stringify({ status: "" })]) {
  test(`invalid count record degrades to unknown, not a verified partial count (${bad})`, async t => {
    const f = setup(t);
    f.record("good");
    f.put(".trellis/tasks/bad/task.json", bad);
    assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
    await f.handlers.get("agent_end")({}, f.ctx);
    assert.equal(plain(f.display.widget[0]), "▸ trellis(?)");
    assert.ok(f.display.widget[0].endsWith(theme.fg("muted", "(?)")));
  });
}

test("empty store is zero; missing, non-directory, oversized and dangling record/store are unknown", t => {
  const f = setup(t);
  assert.equal(ui.readUnfinishedTaskCount(f.root), 0);
  rmSync(join(f.root, ".trellis/tasks"), { recursive: true });
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
  f.put(".trellis/tasks", "not a directory");
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
  rmSync(join(f.root, ".trellis/tasks"));
  f.put(".trellis/tasks/huge/task.json", " ".repeat(1024 * 1024 + 1));
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
  rmSync(join(f.root, ".trellis/tasks/huge"), { recursive: true });
  mkdirSync(join(f.root, ".trellis/tasks/dangling"));
  symlinkSync("missing.json", join(f.root, ".trellis/tasks/dangling/task.json"));
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
});

test("unreadable task record is unknown", t => {
  if (process.getuid?.() === 0) { t.skip("root can read chmod-000 fixtures"); return; }
  const f = setup(t);
  f.record("locked");
  const file = join(f.root, ".trellis/tasks/locked/task.json");
  chmodSync(file, 0);
  t.after(() => { try { chmodSync(file, 0o600); } catch {} });
  assert.equal(ui.readUnfinishedTaskCount(f.root), undefined);
});

test("session start with no task persists; existing task.py results and agent_end update disk count and finish details", async t => {
  const f = setup(t);
  for (const name of ["parent", "child", "other-session"]) f.record(name);
  await f.handlers.get("session_start")({}, f.ctx);
  assert.equal(plain(f.display.widget[0]), "▸ trellis(3)");
  assert.equal(f.display.status, undefined);
  assert.deepEqual(f.display.options, { placement: "aboveEditor" });
  f.record("created", { status: "in_progress" });
  f.pointer("created");
  await f.changed();
  assert.match(plain(f.display.widget[0]), /^▸ trellis\(4\) · created · in_progress/);
  f.record("created", { status: "completed" });
  rmSync(join(f.root, `.trellis/.runtime/sessions/${f.key}.json`));
  await f.changed();
  assert.equal(plain(f.display.widget[0]), "▸ trellis(3)");
  mkdirSync(join(f.root, ".trellis/tasks/archive"), { recursive: true });
  renameSync(join(f.root, ".trellis/tasks/parent"), join(f.root, ".trellis/tasks/archive/parent"));
  await f.changed();
  assert.equal(plain(f.display.widget[0]), "▸ trellis(2)");
  // Agent end rereads count even with cached task absence and startup context.
  f.record("another-session-created");
  await f.handlers.get("agent_end")({}, f.ctx);
  assert.equal(plain(f.display.widget[0]), "▸ trellis(3)");
  await f.handlers.get("before_agent_start")({ prompt: "inspect", systemPromptOptions: { sections: {} } }, f.ctx);
  assert.match(f.messages.at(-1).content, /No active task for this session/);
  await f.handlers.get("session_shutdown")({}, f.ctx);
  assert.equal(f.display.widget, undefined);
  assert.equal(f.display.status, undefined);
});

test("unsupported project clears stale surfaces on refresh and session start; headless does not draw", async t => {
  const f = setup(t);
  await f.handlers.get("agent_end")({}, f.ctx);
  assert.equal(plain(f.display.widget[0]), "▸ trellis(0)");
  f.ctx.hasUI = false;
  f.ctx.ui.setStatus = f.ctx.ui.setWidget = () => assert.fail("headless display called");
  await f.handlers.get("agent_end")({}, f.ctx);
  f.ctx.cwd = join(f.root, "outside");
  rmSync(join(f.root, ".trellis"), { recursive: true });
  await f.handlers.get("session_start")({}, f.ctx);
  const g = setup(t);
  await g.handlers.get("agent_end")({}, g.ctx);
  rmSync(join(g.root, ".trellis/scripts/get_context.py"));
  await g.handlers.get("session_start")({}, g.ctx);
  assert.equal(g.display.widget, undefined);
  g.display.status = "stale";
  await g.handlers.get("agent_end")({}, g.ctx);
  assert.equal(g.display.status, undefined);
  rmSync(join(g.root, ".trellis"), { recursive: true });
  await g.handlers.get("agent_end")({}, g.ctx);
  assert.equal(g.display.widget, undefined);
});

test("throwing theme and UI methods do not reject event handlers", async t => {
  const f = setup(t);
  f.ctx.ui.theme = { fg: () => { throw new Error("theme unavailable"); } };
  await assert.doesNotReject(f.handlers.get("agent_end")({}, f.ctx));
  assert.equal(f.display.widget, undefined);
  f.ctx.ui.setWidget = f.ctx.ui.setStatus = () => { throw new Error("UI unavailable"); };
  await assert.doesNotReject(f.changed());
});

for (const mode of ["status", "off"]) {
  test(`${mode} mode lifecycle uses only selected surface and clears unsupported projects`, t => {
    const f = setup(t);
    for (const name of ["a", "b", "c"]) f.record(name);
    const script = `
      import assert from 'node:assert/strict';
      import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
      import { join } from 'node:path';
      import trellis, { __internals as ui } from ${JSON.stringify(new URL("../extensions/trellis.ts", import.meta.url).href)};
      const root = process.argv[1], mode = process.env.TRELLIS_PI_STATUS;
      const handlers = new Map(), display = {};
      const theme = { fg: (color,text) => '<'+color+'>'+text+'</'+color+'>', bold: text => text };
      trellis({ events: { on: () => () => {}, emit: () => {} }, registerTool: () => {}, on: (name,fn) => handlers.set(name,fn), sendMessage: () => {}, getAllTools: () => [{name:'Agent'}] });
      const ctx = { cwd: root, hasUI: true, sessionManager: {getSessionId: () => 'mode', getSessionFile: () => undefined}, ui: {theme, setStatus: (_key,value) => display.status=value, setWidget: (_key,value) => display.widget=value} };
      await handlers.get('session_start')({},ctx);
      assert.equal(display.widget,undefined);
      assert.equal(display.status,mode === 'off' ? undefined : '<muted>trellis</muted><accent>(3)</accent>');
      const key=ui.contextKey(root,ctx), pointer=join(root,'.trellis/.runtime/sessions',key+'.json');
      mkdirSync(join(pointer,'..'),{recursive:true}); writeFileSync(pointer,JSON.stringify({current_task:'.trellis/tasks/a'}));
      const changed=() => handlers.get('tool_result')({toolName:'bash',input:{command:'task.py finish'}},ctx);
      await changed();
      if(mode==='status') {
        assert.ok(display.status.includes('<warning>planning</warning>'));
        const dir=join(root,'.trellis/tasks/current'); mkdirSync(dir);
        writeFileSync(join(dir,'task.json'),JSON.stringify({status:'in_progress'}));
        writeFileSync(pointer,JSON.stringify({current_task:'.trellis/tasks/current'}));
        await changed();
        assert.equal(display.status,'<muted>trellis</muted><accent>(4)</accent><dim>: </dim><text>current</text><dim> ▸ </dim><accent>in_progress</accent>');
        rmSync(dir,{recursive:true});
      } else assert.equal(display.status,undefined);
      rmSync(pointer); await changed();
      if(mode==='status') assert.equal(display.status,'<muted>trellis</muted><accent>(3)</accent>');
      for(const name of ['a','b','c']) rmSync(join(root,'.trellis/tasks',name),{recursive:true});
      await handlers.get('agent_end')({},ctx);
      if(mode==='status') assert.equal(display.status,'<muted>trellis</muted><dim>(0)</dim>');
      rmSync(join(root,'.trellis/tasks'),{recursive:true}); await changed();
      if(mode==='status') assert.equal(display.status,'<muted>trellis</muted><muted>(?)</muted>');
      rmSync(join(root,'.trellis/scripts/task.py')); await handlers.get('agent_end')({},ctx);
      assert.equal(display.widget,undefined); assert.equal(display.status,undefined);
    `;
    const result = spawnSync(process.execPath, ["--import", new URL("./host-tui.mjs", import.meta.url).href, "--input-type=module", "-e", script, f.root], {
      env: { ...process.env, TRELLIS_PI_STATUS: mode }, encoding: "utf8", timeout: 15000
    });
    assert.equal(result.status, 0, result.stderr);
  });
}
