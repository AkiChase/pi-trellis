import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters as plain } from "node:util";
import test from "node:test";
import { getMarkdownTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { Markdown, compositeTuiLine, visibleWidth } from "@earendil-works/pi-tui";
import trellis, { __internals } from "../extensions/trellis.ts";
import { TaskBrowser, readableMarkdown } from "../lib/task-browser/component.ts";

const hostTheme = await import(new URL("./modes/interactive/theme/theme.js", import.meta.resolve("@earendil-works/pi-coding-agent")));
initTheme("dark", false);
const keys = { up: "\x1b[A", down: "\x1b[B", left: "\x1b[D", right: "\x1b[C", pageUp: "\x1b[5~", pageDown: "\x1b[6~", enter: "\r", escape: "\x1b" };
function fixture(t, total = 1) {
  const root = mkdtempSync(join(tmpdir(), "pi-browser-ui-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, value) => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), value); };
  const record = (i, extra = {}) => put(`.trellis/tasks/${String(i).padStart(2, "0")}/task.json`, JSON.stringify({ title: `任务 ${i}`, status: "planning", ...extra }));
  for (let i = 0; i < total; i++) record(i);
  if (!total) mkdirSync(join(root, ".trellis/tasks"), { recursive: true });
  let closeCount = 0, renderCount = 0, current;
  const tui = { terminal: { rows: 12 }, requestRender: () => renderCount++ };
  const browser = new TaskBrowser(root, tui, () => hostTheme.theme, () => closeCount++, () => current);
  const render = (width = 80) => {
    const lines = browser.render(width);
    assert.ok(lines.length <= tui.terminal.rows);
    for (const line of lines) {
      assert.ok(visibleWidth(line) <= width, `${width}: ${plain(line)}`);
      assert.doesNotMatch(plain(line), /[\x00-\x1f\x7f-\x9f]/);
    }
    return lines.map(line => plain(line).trimEnd());
  };
  const press = (key, width = 80) => { browser.handleInput(keys[key] ?? key); return render(width); };
  return { root, put, record, browser, tui, render, press, setCurrent: value => { current = value; }, closed: () => closeCount, requested: () => renderCount };
}

const markdown = `# 中文 Heading

## Subheading

**bold text** and *emphasis* with \`inline code\`.

- parent list
  - nested item
    - deeper item
- [x] checked task
- [ ] unchecked task

3. ordered item
4. next item

> quoted 中文 text

[Documentation](https://example.invalid/docs)

\`\`\`typescript
const greeting = "你好";
\`\`\`

| Name | Description |
| --- | --- |
| 中文 | A very long table cell that must wrap safely in a narrow viewport |
| é🙂 | second cell |

![示意图](https://example.invalid/diagram.png)
![reference image][picture]
[picture]: https://example.invalid/ref.png

<div>HTML literal text</div>
<script>never execute this</script>

\`\`\`mermaid
graph TD
A-->B
\`\`\`
`;

test("viewer shows English identity, original title, explicit metadata and descending order hint", t => {
  const f = fixture(t, 0);
  const dir = "10-14-english-slug";
  f.put(`.trellis/tasks/${dir}/task.json`, JSON.stringify({ name: "english-slug", title: "中文标题", status: "in_progress" }));
  f.press("r");
  f.setCurrent(f.browser.snapshot.tasks[0].identity); f.press("r");
  const list = f.render(100).join("\n");
  assert.match(list, /\* \[in_progress\] 10-14-english-slug · 中文标题/);
  assert.match(list, /Directory descending/);
  assert.match(f.render(39).join("\n"), /\* \[in_progress\] 10-14-english-slug/);
  for (const width of [1, 8, 20, 39, 80]) f.render(width);
  f.tui.terminal.rows = 30;
  const detail = f.press("enter", 100).join("\n");
  for (const text of ["Name: english-slug", "Title: 中文标题", `Path: .trellis/tasks/${dir}`]) assert.ok(detail.includes(text), text);
});

test("current task promotes its complete ancestor tree and refresh preserves selection identity", t => {
  const f = fixture(t, 0);
  const record = (name, extra = {}) => f.put(`.trellis/tasks/${name}/task.json`, JSON.stringify({ title: name, status: "planning", ...extra }));
  record("10-15-new"); record("10-14-parent");
  record("10-13-sibling", { parent: "10-14-parent" });
  record("10-12-nested", { parent: "10-14-parent" });
  record("10-11-current", { parent: "10-12-nested" }); record("10-10-old");
  f.press("r");
  const dirs = () => f.browser.snapshot.rows.map(row => row.task.dir.split("/").at(-1));
  const initial = dirs();
  assert.deepEqual(initial, ["10-15-new", "10-14-parent", "10-13-sibling", "10-12-nested", "10-11-current", "10-10-old"]);
  f.press("down"); f.press("down");
  const selected = f.browser.snapshot.rows[f.browser.selected].task.identity;
  const identity = name => f.browser.snapshot.tasks.find(task => task.dir.endsWith(`/${name}`)).identity;
  f.setCurrent(identity("10-11-current")); f.press("r");
  assert.deepEqual(dirs(), ["10-14-parent", "10-13-sibling", "10-12-nested", "10-11-current", "10-15-new", "10-10-old"]);
  assert.equal(f.browser.snapshot.rows[f.browser.selected].task.identity, selected);
  assert.deepEqual(f.browser.snapshot.rows.slice(0, 4).map(row => row.prefix), ["", "├─ ", "└─ ", "   └─ "]);
  f.setCurrent(identity("10-10-old")); f.press("r");
  assert.deepEqual(dirs(), ["10-10-old", ...initial.slice(0, -1)]);
  assert.equal(f.browser.snapshot.rows[f.browser.selected].task.identity, selected);
  f.setCurrent("missing-identity"); f.press("r"); assert.deepEqual(dirs(), initial);
  f.setCurrent(undefined); f.press("r"); assert.deepEqual(dirs(), initial);
});

test("long directory identifiers precede titles and remain fully scrollable in detail", t => {
  const f = fixture(t, 0);
  const dir = `10-14-${"english-".repeat(20)}END`;
  f.put(`.trellis/tasks/${dir}/task.json`, JSON.stringify({ title: "中文标题", status: "planning" }));
  f.press("r");
  assert.doesNotMatch(f.render(40).join("\n"), /中文标题/);
  f.press("enter", 20);
  const seen = [];
  let previousOffset = -1;
  for (let i = 0; i < 100; i++) {
    const body = f.render(20).slice(3, -1);
    const offset = f.browser.offsets[0];
    if (offset === previousOffset) { seen.push(...body.slice(1)); break; }
    seen.push(body[0]); previousOffset = offset;
    f.press("down", 20);
  }
  assert.ok(seen.join("").includes(dir));
  assert.ok(seen.join("").includes("中文标题"));
});

test("real host Markdown renders required syntax and readable rich-content fallbacks", t => {
  const f = fixture(t);
  f.put(".trellis/tasks/00/prd.md", markdown);
  f.tui.terminal.rows = 500;
  f.press("enter");
  for (const width of [100, 40, 16, 8, 1]) {
    f.press("right", width); // rotate sections, then return to PRD below
    while (f.browser.section !== 1) f.press("right", width);
    f.browser.offsets[1] = 0;
    const all = f.render(width).join("\n");
    if (width >= 16) {
      for (const text of ["Heading", "Subheading", "bold text", "emphasis", "inline code", "parent list", "nested item", "deeper item", "checked task", "unchecked", "ordered item", "quoted", "Documentation", "const", "greeting", "Description", "example.invalid", "diagram.png", "ref.png", "HTML literal", "never execute", "mermaid", "A-->B"]) {
        const flattened = all.replace(/[\s│┃|]/g, "");
        const tableHeader = text === "Description" && width === 16 && all.includes("Descri") && all.includes("ption");
        assert.ok(tableHeader || all.includes(text) || flattened.includes(text.replace(/\s/g, "")), `${width}: missing ${text}`);
      }
      assert.match(all, /\[x\]/);
      assert.match(all, /\[ \]/);
      assert.ok(all.replace(/\s/g, "").includes("3.ordered"));
    }
    assert.equal(f.closed(), 0);
  }
  const native = new Markdown(readableMarkdown(markdown), 0, 0, getMarkdownTheme()).render(60);
  assert.ok(native.some(line => /\x1b\[[^m]*1[;m]/.test(line)), "host bold styles");
  assert.ok(native.some(line => line.includes("│")), "host table borders");
  assert.ok(native.some(line => plain(line).includes("    - nested")), "host nested indentation");
});

test("full-width native overlay hides transcript remnants and stays within resized terminal rows", t => {
  const f = fixture(t);
  for (const rows of [3, 12, 28]) {
    f.tui.terminal.rows = rows;
    for (const width of [8, 40, 90]) {
      const lines = f.browser.render(width);
      assert.equal(lines.length, rows);
      for (const line of lines) {
        assert.equal(visibleWidth(line), width);
        assert.equal(plain(compositeTuiLine("X".repeat(width), line, 0, width, width)), plain(line));
      }
    }
  }
});

test("image fallback leaves fenced code untouched and preserves alt text and source", () => {
  const source = '![alt](https://example.invalid/a "Title")\n~~~text\n![literal](local.png)\n~~~';
  const adapted = readableMarkdown(source);
  assert.match(adapted, /` !\[alt\]\(https:\/\/example.invalid\/a "Title"\) `/);
  assert.match(adapted, /~~~text\n!\[literal\]\(local.png\)\n~~~/);
  assert.doesNotThrow(() => readableMarkdown(`![alt](local.png) ${"`x".repeat(100000)}`));
});

test("image fallback preserves native tables, styled lists/headings and shared reference links", () => {
  const source = '# **Heading** ![diagram](local.png)\n\n- [x] **checked** ![alt](https://example.invalid/a(b).png)\n\n| Name | Picture |\n| --- | --- |\n| **bold** | ![a\\|b](local.png) |\n| after | text |\n\n[Docs][shared]\n\n![image][shared]\n\n[shared]: https://example.invalid/shared';
  const adapted = readableMarkdown(source);
  assert.match(adapted, /^# \*\*Heading\*\*/);
  assert.match(adapted, /- \[x\] \*\*checked\*\*/);
  assert.match(adapted, /^\[shared\]: https:\/\/example.invalid\/shared$/m);
  const emphasized = [];
  const markdownTheme = getMarkdownTheme();
  const native = new Markdown(adapted, 0, 0, { ...markdownTheme, bold: text => { emphasized.push(plain(text)); return markdownTheme.bold(text); } }).render(100);
  const all = native.map(plain).join("\n");
  assert.match(all, /Heading/);
  assert.match(all, /- \[x\] checked/);
  assert.match(all, /│ bold\s+│ !\[a\|b\]\(local.png\)\s+│/);
  assert.match(all, /│ after\s+│ text/);
  assert.match(all, /Docs/);
  assert.doesNotMatch(all, /\[Docs\]\[shared\]/);
  assert.match(all, /https:\/\/example.invalid\/shared/);
  for (const text of ["Heading", "checked", "bold"]) assert.ok(emphasized.includes(text), `${text}: native emphasis token remains active`);
  for (const source of ['unmatched ` prose ![alt](local.png)', '- parent\n    - ![nested](https://example.invalid/nested.png)']) {
    const rendered = new Markdown(readableMarkdown(source), 0, 0, getMarkdownTheme()).render(100).map(plain).join("\n");
    assert.match(rendered, /!\[/);
    assert.match(rendered, /(?:local\.png|example\.invalid\/nested\.png)/);
  }
  for (const code of ['`![inline](local.png)`', '\\![escaped](local.png)', '    ![indented](local.png)', '> ~~~text\n> ![quoted code](local.png)\n> ~~~', '- ~~~text\n  ![list code](local.png)\n  ~~~']) {
    assert.equal(readableMarkdown(code), code);
  }
});

test("valid bounded large Markdown and overview remain scrollable without argument-stack overflow", t => {
  const f = fixture(t);
  f.record(0, { description: "line\n".repeat(70000) + "METADATA END" }); f.press("r");
  f.press("enter"); f.render(10);
  f.browser.offsets[0] = Number.MAX_SAFE_INTEGER;
  assert.match(f.render(10).join("\n").replace(/\s/g, ""), /METADATAEND/);
  f.put(".trellis/tasks/00/prd.md", "line\n\n".repeat(70000) + "DOCUMENT END");
  f.press("right", 10);
  f.browser.offsets[1] = Number.MAX_SAFE_INTEGER;
  assert.match(f.render(10).join("\n").replace(/\s/g, ""), /DOCUMENTEND/);
});

test("host Markdown parser errors show scrollable original source and recover on refresh", t => {
  const f = fixture(t);
  f.put(".trellis/tasks/00/prd.md", "# 中文 source\n" + "body\n".repeat(30) + "SOURCE END");
  f.press("enter");
  const original = Markdown.prototype.render;
  try {
    Markdown.prototype.render = () => { throw new RangeError("Host parser limit"); };
    const first = f.press("right");
    assert.match(first.join("\n"), /Unable to render Markdown/);
    assert.match(first.join("\n"), /# 中文 source/);
    f.browser.offsets[1] = Number.MAX_SAFE_INTEGER;
    assert.match(f.render().join("\n"), /SOURCE END/);
  } finally { Markdown.prototype.render = original; }
  f.browser.offsets[1] = 0;
  assert.doesNotMatch(f.press("r").join("\n"), /Unable to render Markdown/);
});

test("long list navigation, Escape return and close preserve selection and viewport", t => {
  const f = fixture(t, 40);
  f.render();
  for (let i = 0; i < 23; i++) f.press("down");
  const before = f.render(), selected = f.browser.selected, offset = f.browser.listOffset;
  assert.equal(selected, 23);
  assert.ok(offset > 0);
  const detail = f.press("enter");
  assert.match(detail.join("\n"), /任务 16/);
  assert.equal(f.browser.mode, "detail");
  assert.deepEqual(f.press("escape"), before);
  assert.equal(f.browser.selected, selected);
  assert.equal(f.browser.listOffset, offset);
  f.press("escape"); f.press("escape");
  assert.equal(f.closed(), 1);
  assert.ok(f.requested() >= 25);
});

test("detail scrolling keeps fixed header/footer, full long title and per-section offsets", t => {
  const f = fixture(t);
  const title = "中文长标题".repeat(30) + " TITLE END";
  f.record(0, { title }); f.press("r");
  for (const section of ["prd", "design", "implement"]) f.put(`.trellis/tasks/00/${section}.md`, `# ${section}\n\n${Array.from({ length: 70 }, (_, i) => `Line ${i} 中文 content`).join("\n")}\n${section} END`);
  f.press("enter"); f.press("right");
  let screen = f.render(40);
  const seen = [];
  for (let i = 0; i < 150; i++) {
    seen.push(...screen.slice(3, -1));
    assert.equal(screen[0], "Trellis Tasks");
    assert.match(screen[1], /Overview \| PRD \| Design \| Implement/);
    assert.match(screen.at(-1), /Esc Back/);
    screen = f.press("down", 40);
  }
  assert.match(seen.join(""), /TITLE END/);
  assert.match(seen.join("\n"), /prd END/);
  const prdOffset = f.browser.offsets[1];
  f.press("right", 40);
  assert.equal(f.browser.offsets[2], 0);
  f.press("pageDown", 40);
  assert.equal(f.browser.offsets[2], f.browser.bodyHeight);
  f.press("left", 40);
  assert.equal(f.browser.offsets[1], prdOffset);
  f.press("pageUp", 40);
  assert.equal(f.browser.offsets[1], prdOffset - f.browser.bodyHeight);
  f.press("left", 40);
  assert.equal(f.browser.offsets[0], 0);
});

test("refresh rereads title, current identity and documents; removal does not jump to a different task", t => {
  const f = fixture(t, 12);
  f.render(); for (let i = 0; i < 8; i++) f.press("down");
  const identity = f.browser.snapshot.rows[8].task.identity;
  f.setCurrent(identity); f.record(3, { title: "Fresh 中文 title" }); f.press("r");
  assert.equal(f.browser.snapshot.rows[f.browser.selected].task.identity, identity);
  assert.match(f.render().join("\n"), /\* \[planning\] 03 · Fresh 中文 title/);
  f.press("enter"); f.press("right");
  assert.match(f.render().join("\n"), /Document not created/);
  f.put(".trellis/tasks/03/prd.md", "# New document");
  f.press("r"); assert.match(f.render().join("\n"), /New document/);
  f.put(".trellis/tasks/03/prd.md", ""); f.press("r"); assert.match(f.render().join("\n"), /Document is empty/);
  f.put(".trellis/tasks/03/prd.md", "# same-size edit"); f.press("r"); assert.match(f.render().join("\n"), /same-size edit/);
  rmSync(join(f.root, ".trellis/tasks/03/prd.md")); f.press("r"); assert.match(f.render().join("\n"), /Document not created/);
  f.put(".trellis/tasks/03/prd.md", Buffer.from([0xff])); f.press("r"); assert.match(f.render().join("\n"), /Unable to read document/);
  rmSync(join(f.root, ".trellis/tasks/03"), { recursive: true }); f.press("r");
  assert.match(f.render().join("\n"), /Task no longer available/);
  f.press("escape");
  assert.equal(f.browser.snapshot.tasks.length, 11);
  assert.notEqual(f.browser.snapshot.rows[f.browser.selected].task.identity, identity);
});

test("refresh preserves canonical identity through alias changes and clamps after deletion", t => {
  const f = fixture(t, 15);
  f.render(); for (let i = 0; i < 14; i++) f.press("down");
  const identity = f.browser.snapshot.rows[14].task.identity;
  symlinkSync("00", join(f.root, ".trellis/tasks/zz-alias"));
  f.press("r");
  assert.equal(f.browser.snapshot.rows[f.browser.selected].task.identity, identity);
  assert.equal(f.browser.snapshot.tasks.length, 15);
  rmSync(join(f.root, ".trellis/tasks/zz-alias"));
  rmSync(join(f.root, ".trellis/tasks/00"), { recursive: true });
  f.press("r");
  assert.ok(f.browser.selected < 14);
  assert.ok(f.browser.listOffset <= f.browser.selected);
});

test("empty and invalid stores differ, and every bounded diagnostic is scrollable", t => {
  const f = fixture(t, 0);
  assert.match(f.render().join("\n"), /No tasks found/);
  f.record(0, { children: [{ toString: null }] }); f.press("r");
  f.press("enter"); assert.match(f.render().join("\n"), /toString/); f.press("escape");
  rmSync(join(f.root, ".trellis/tasks/00"), { recursive: true });
  for (let i = 0; i < 45; i++) f.put(`.trellis/tasks/${i}/task.json`, "null");
  f.press("r");
  const first = f.render().join("\n");
  assert.match(first, /Incomplete data/);
  assert.doesNotMatch(first, /No tasks found/);
  for (let i = 0; i < 40; i++) f.press("down");
  assert.match(f.render().join("\n"), /Further diagnostics omitted/);
  f.press("enter"); assert.equal(f.browser.mode, "list");
});

test("narrow Unicode/control widths, resize clamping and actual host theme invalidation", t => {
  const f = fixture(t, 20);
  f.record(0, { title: "\x1b]0;bad\x07任务 é👨‍👩‍👧‍👦👍🏽".repeat(20), status: "in_progress" });
  f.put(".trellis/tasks/00/prd.md", `# Styled heading\n\n${markdown}\n${"超长".repeat(100)}`);
  f.press("r");
  for (const width of [1, 2, 4, 8, 20, 34, 80]) f.render(width);
  for (let i = 0; i < 19; i++) f.press("down");
  f.press("enter"); f.press("right");
  for (const height of [1, 2, 3, 4, 8, 30]) {
    f.tui.terminal.rows = height;
    for (const width of [1, 2, 4, 8, 20, 34, 80]) { f.render(width); f.press("pageDown", width); }
  }
  f.tui.terminal.rows = 50; f.browser.offsets[1] = 0;
  hostTheme.setTheme("dark", false); f.browser.invalidate(); const dark = f.browser.render(70);
  hostTheme.setTheme("light", false); f.browser.invalidate(); const light = f.browser.render(70);
  assert.notDeepEqual(light, dark);
  assert.deepEqual(light.map(plain), dark.map(plain));
  hostTheme.setTheme("dark", false); f.browser.invalidate();
});

function capture(root) {
  const result = {};
  const walk = path => {
    for (const name of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, name.name);
      if (name.isDirectory()) walk(file);
      else if (name.isFile()) result[file.slice(root.length)] = readFileSync(file).toString("base64");
    }
  };
  walk(root); return result;
}
function commandFixture(f) {
  const commands = new Map(), messages = [], notices = [];
  trellis({ registerCommand: (name, value) => commands.set(name, value), registerTool: () => {}, on: () => {}, events: { on: () => () => {} }, sendMessage: message => messages.push(message) });
  let component, customCount = 0, completed = 0;
  const ctx = { cwd: f.root, mode: "tui", hasUI: true, sessionManager: { getSessionId: () => "browser-only", getSessionFile: () => undefined }, ui: {
    get theme() { return hostTheme.theme; }, notify: value => notices.push(value),
    custom: async (factory, options) => {
      assert.deepEqual(options, { overlay: true, overlayOptions: { width: "100%", maxHeight: "100%", anchor: "top-left", margin: 0 } });
      customCount++; component = factory(f.tui, hostTheme.theme, {}, () => completed++);
    }
  } };
  return { commands, ctx, messages, notices, component: () => component, customCount: () => customCount, completed: () => completed };
}

test("registered command uses command-time root and disk-only own session without a runtime deployment", async t => {
  const f = fixture(t, 2), g = fixture(t, 1), harness = commandFixture(f);
  assert.equal(harness.commands.has("trellis-task"), false);
  const command = harness.commands.get("trellis-task-viewer"); assert.ok(command);
  const key = __internals.contextKey(f.root, harness.ctx);
  f.put(`.trellis/.runtime/sessions/${key}.json`, JSON.stringify({ current_task: ".trellis/tasks/01" }));
  f.put(".trellis/.runtime/sessions/foreign.json", JSON.stringify({ current_task: ".trellis/tasks/00" }));
  await command.handler("", harness.ctx);
  const lines = harness.component().render(80).map(plain);
  assert.match(lines.join("\n"), /\* \[planning\] 01 · 任务 1/);
  assert.doesNotMatch(lines.join("\n"), /\* \[planning\] 00 · 任务 0/);
  harness.component().handleInput(keys.escape); assert.equal(harness.completed(), 1);
  harness.ctx.cwd = g.root;
  await command.handler("", harness.ctx);
  assert.match(harness.component().render(80).map(plain).join("\n"), /1 tasks/);
  assert.doesNotMatch(harness.component().render(80).map(plain).join("\n"), /\* \[planning\]/);
  assert.equal(harness.messages.length, 0);
  assert.equal(harness.notices.length, 0);
});

test("missing, malformed, escaping or unreadable current pointer never blocks general browsing", async t => {
  const f = fixture(t), harness = commandFixture(f), command = harness.commands.get("trellis-task-viewer");
  const key = __internals.contextKey(f.root, harness.ctx), path = `.trellis/.runtime/sessions/${key}.json`;
  for (const value of [undefined, "not JSON", '{"current_task":"../escape"}', '{"current_task":null}']) {
    if (value === undefined) rmSync(join(f.root, path), { force: true }); else f.put(path, value);
    await command.handler("", harness.ctx);
    assert.match(harness.component().render(80).map(plain).join("\n"), /1 tasks/);
  }
  f.put("outside-pointer.json", '{"current_task":".trellis/tasks/00"}');
  rmSync(join(f.root, path)); symlinkSync(join(f.root, "outside-pointer.json"), join(f.root, path));
  await command.handler("", harness.ctx);
  assert.doesNotMatch(harness.component().render(80).map(plain).join("\n"), /\* \[planning\]/);
  rmSync(join(f.root, path)); f.put(path, '{"current_task":".trellis/tasks/00"}');
  if (process.getuid?.() !== 0) {
    chmodSync(join(f.root, path), 0);
    await command.handler("", harness.ctx);
    assert.doesNotMatch(harness.component().render(80).map(plain).join("\n"), /\* \[planning\]/);
    chmodSync(join(f.root, path), 0o600);
  }
});

test("current task FIFO record cannot block command open or refresh", async t => {
  const f = fixture(t, 2), harness = commandFixture(f), command = harness.commands.get("trellis-task-viewer");
  const key = __internals.contextKey(f.root, harness.ctx);
  f.put(`.trellis/.runtime/sessions/${key}.json`, '{"current_task":".trellis/tasks/00"}');
  rmSync(join(f.root, ".trellis/tasks/00/task.json"));
  execFileSync("mkfifo", [join(f.root, ".trellis/tasks/00/task.json")]);
  await command.handler("", harness.ctx);
  const browser = harness.component();
  assert.doesNotMatch(browser.render(80).map(plain).join("\n"), /\* \[planning\]/);
  browser.handleInput("r");
  assert.match(browser.render(80).map(plain).join("\n"), /Incomplete data/);
  browser.handleInput(keys.escape);
  assert.equal(harness.completed(), 1);
});

test("actual host custom overlay lifecycle restores focus and invalidates active Markdown theme in both TUI modes", async t => {
  const interactive = await import(new URL("./modes/interactive/interactive-mode.js", import.meta.resolve("@earendil-works/pi-coding-agent")));
  for (const tuiMode of ["regular", "fullscreen"]) {
    const f = fixture(t), harness = commandFixture(f);
    f.put(".trellis/tasks/00/prd.md", "# Theme heading\n\n**bold** and `code`");
    const terminal = { columns: 80, rows: 20, hideCursor() {}, showCursor() {}, write() {}, stop() {} };
    const tui = interactive.createInteractiveTui({ terminal, tuiMode });
    tui.stopped = true; // No terminal start, writes or PTY; exercise mounted-component contracts only.
    const editor = { getText: () => "preserved input", render: () => [], invalidate() {} };
    tui.setFocus(editor);
    harness.ctx.ui.custom = (factory, options) => interactive.InteractiveMode.prototype.showExtensionCustom.call({ editor, ui: tui }, factory, options);
    hostTheme.onThemeChange(() => { tui.invalidate(); tui.requestRender(); });
    try {
      const pending = harness.commands.get("trellis-task-viewer").handler("", harness.ctx);
      await new Promise(resolve => setImmediate(resolve));
      const browser = tui.focusedComponent;
      assert.ok(browser instanceof TaskBrowser);
      assert.equal(tui.hasOverlay(), true);
      browser.handleInput(keys.enter); browser.handleInput(keys.right);
      hostTheme.setTheme("dark", false); const dark = browser.render(80);
      assert.ok(browser.cachedBody);
      hostTheme.setTheme("light", false);
      assert.equal(browser.cachedBody, undefined, "host invalidation reaches overlay");
      const light = browser.render(80);
      assert.notDeepEqual(light, dark);
      assert.deepEqual(light.map(plain), dark.map(plain));
      terminal.columns = 20; terminal.rows = 8;
      assert.equal(browser.render(20).length, 8);
      browser.handleInput(keys.escape); browser.handleInput(keys.escape);
      await pending;
      assert.equal(tui.hasOverlay(), false);
      assert.equal(tui.focusedComponent, editor);
      assert.equal(editor.getText(), "preserved input");
    } finally {
      hostTheme.onThemeChange(undefined); hostTheme.setTheme("dark", false);
      tui.stop();
    }
  }
});

test("non-TUI guards, missing project and usage return English explanations without custom UI", async t => {
  const f = fixture(t), harness = commandFixture(f), command = harness.commands.get("trellis-task-viewer");
  for (const mode of ["rpc", "print", "json"]) {
    harness.ctx.mode = mode; harness.ctx.hasUI = mode === "rpc";
    await command.handler("", harness.ctx);
  }
  assert.equal(harness.customCount(), 0);
  assert.match(harness.notices[0], /requires interactive terminal mode/);
  assert.equal(harness.messages.length, 2);
  for (const message of harness.messages) { assert.match(message.content, /requires interactive/); assert.equal(message.triggerTurn, undefined); }
  harness.ctx.mode = "tui"; harness.ctx.hasUI = true;
  await command.handler("unexpected", harness.ctx); assert.match(harness.notices.at(-1), /Usage/);
  rmSync(join(f.root, ".trellis"), { recursive: true });
  await command.handler("", harness.ctx); assert.match(harness.notices.at(-1), /No Trellis project found/);
  assert.equal(harness.customCount(), 0);
});

test("browser navigation/refresh/close preserve all files, session pointers, Git index and invoke no model/lifecycle", async t => {
  const f = fixture(t, 3), harness = commandFixture(f);
  f.put(".trellis/tasks/00/prd.md", markdown);
  const key = __internals.contextKey(f.root, harness.ctx);
  f.put(`.trellis/.runtime/sessions/${key}.json`, '{"current_task":".trellis/tasks/00"}');
  f.put(".trellis/.current-task", ".trellis/tasks/02\n");
  f.put(".trellis/scripts/task.py", 'raise RuntimeError("must never run task lifecycle")\n');
  f.put(".trellis/scripts/get_context.py", 'raise RuntimeError("must never run context CLI")\n');
  execFileSync("git", ["init", "-q", f.root]);
  const git = args => execFileSync("git", ["-C", f.root, ...args], { env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  // Only stage disposable fixture data, never the user's checkout.
  git(["add", "."]);
  f.put("untracked.txt", "Unrelated user content");
  const before = capture(f.root), status = git(["status", "--porcelain=v1"]);
  await harness.commands.get("trellis-task-viewer").handler("", harness.ctx);
  const browser = harness.component();
  browser.render(60); browser.handleInput(keys.down); browser.handleInput(keys.down); browser.handleInput(keys.enter); browser.handleInput(keys.right); browser.render(60);
  for (let i = 0; i < 20; i++) { browser.handleInput(keys.pageDown); browser.render(30); }
  browser.handleInput("r"); browser.render(80); browser.handleInput(keys.escape); browser.handleInput(keys.down); browser.handleInput(keys.enter); browser.render(40); browser.handleInput(keys.escape); browser.handleInput(keys.escape);
  assert.deepEqual(capture(f.root), before);
  assert.deepEqual(git(["status", "--porcelain=v1"]), status);
  assert.equal(harness.messages.length, 0);
  assert.equal(harness.notices.length, 0);
  assert.equal(harness.completed(), 1);
});
