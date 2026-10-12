import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adaptAgent } from "../scripts/sync-agents.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const baseline = JSON.parse(read("docs/agent-baseline.json"));
function agent(role) {
  const text = read(`agents/trellis-${role}.md`);
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  assert.ok(header);
  assert.match(header[1], new RegExp(`^name: trellis-${role}$`, "m"));
  return { text, tools: /^tools:\s*(.+)$/m.exec(header[1])[1].split(",").map((s) => s.trim()) };
}
for (const role of ["implement", "check", "research"]) {
  test(`${role} has locked adapted Claude provenance and Pi tool names`, () => {
    const { text, tools } = agent(role);
    assert.equal(createHash("sha256").update(text).digest("hex"), baseline.files[role].adapted);
    assert.equal(baseline.platform, "claude");
    assert.equal(baseline.version, "0.6.17");
    assert.equal(baseline.files[role].source.length, 64);
    assert.deepEqual(tools, role === "research" ? ["read", "write", "find", "grep", "bash"] : ["read", "write", "edit", "bash", "find", "grep"]);
    assert.match(text, /isolation: off/);
    assert.doesNotMatch(text, /tools:.*(?:Read|Glob|Skill|mcp__\*|\*)/);
  });
}
test("check fixes only within scope, includes staged/untracked files, and validates final fixes", () => {
  const { text, tools } = agent("check");
  assert.ok(tools.includes("edit"));
  assert.match(text, /within the approved task scope/);
  assert.match(text, /git diff --cached/);
  assert.match(text, /git ls-files --others --exclude-standard/);
  assert.match(text, /Review base/);
  assert.match(text, /final version after your own fixes/);
  assert.match(text, /Do NOT spawn another/);
  assert.match(text, /### Issues Not Fixed/);
});
test("implement/check context protocol supports honest injection, fallback, placeholders and directories", () => {
  for (const role of ["implement", "check"]) {
    const { text } = agent(role);
    assert.ok(text.includes(`<task-path>/${role}.jsonl`));
    assert.match(text, /marker inside the pi-trellis task-context block/);
    assert.match(text, /Skip placeholder rows/);
    assert.match(text, /type: directory/);
    assert.match(text, /do not guess or create one/);
    assert.match(text, /task.py start\/finish\/archive/);
    assert.match(text, /not an OS sandbox/);
    assert.match(text, /was not run, report that explicitly/);
    assert.doesNotMatch(text, /Windows \+ Claude Code|hooks disabled, etc/);
  }
});
test("research persists output, resolves dispatch task first, and reports unavailable external tools", () => {
  const { text } = agent("research");
  assert.match(text, /first dispatch line/);
  assert.match(text, /external research was not performed/);
  assert.match(text, /Read-only git status\/diff\/log are allowed/);
  assert.match(text, /When explicitly asked to compare approaches/);
  assert.match(text, /Write FORBIDDEN/);
  assert.match(text, /do not spawn it yourself/);
  assert.match(text, /### External References/);
});
test("adaptation rejects unreviewed upstream drift", () => {
  assert.throws(() => adaptAgent("implement", "unreviewed upstream text"), /anchor/);
});
test("upstream documents retain attribution and license", () => {
  assert.equal(JSON.parse(read("package.json")).license, "(MIT AND AGPL-3.0-only)");
  assert.match(read("licenses/trellis-AGPL-3.0.txt"), /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(read("docs/trellis-agent-sync.md"), /0\.6\.17/);
  assert.doesNotMatch(read("README.md"), /This extension contains no Trellis source code/);
});
