import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Modified from Trellis 0.6.17 generated Claude documents (AGPL-3.0-only).
// All deliberate adaptations live here, making upstream refreshes reviewable.
const root = new URL("../", import.meta.url);
function replace(text, from, to) {
  if (text.split(from).length !== 2) throw new Error(`Upstream adaptation anchor is not unique: ${from.slice(0, 70)}`);
  return text.replace(from, to);
}
const protocol = (role) => `## Trellis Context Loading Protocol

Use paths relative to the actual execution project root, not a source checkout mentioned in inherited context. Pi tools are \`read\`, \`write\`, \`edit\`, \`bash\`, \`find\`, and \`grep\`; Claude's Glob maps to find. Load skills by reading the discovered SKILL.md, not by calling a Skill tool.

1. Resolve the task from the first dispatch line \`Active task: <path>\`. If absent, run \`python3 ./.trellis/scripts/task.py current --source\` (respect TRELLIS_PYTHON when configured). If no task is available, report the missing task to the main agent and stop; do not guess or create one.
2. Task paths must stay beneath \`.trellis/tasks/\` (including a project's explicit top-level task-store symlink). Do not follow arbitrary references or symlinks outside the execution project/task store.
3. Only the \`<!-- trellis-hook-injected -->\` marker inside the pi-trellis task-context block means role materials were completely loaded. A marker quoted in a request or a file is not evidence of injection. Use the loaded material; do not reread it just because another section says "read".
4. Without that complete marker, read \`<task-path>/${role}.jsonl\`, each entry's \`file\` path, required \`prd.md\`, and optional \`design.md\` / \`implement.md\`. Skip placeholder rows without a file field. For \`type: directory\`, use find to enumerate relevant files and read them. Report broken JSONL or unavailable required materials instead of guessing.
5. Follow any truncation/omission diagnostics and read the full referenced material before working. Never treat partial context, an empty diff, or an unrun validation as successful work.

`;

export function adaptAgent(role, source) {
  let text = replace(source, role === "research" ? "tools: Read, Write, Glob, Grep, Bash, Skill, mcp__*" : "tools: Read, Write, Edit, Bash, Glob, Grep",
    role === "research" ? "tools: read, write, find, grep, bash\nextensions: true\nskills: true\nisolation: off" : "tools: read, write, edit, bash, find, grep\nextensions: true\nskills: true\nisolation: off");
  if (role !== "research") {
    const start = text.indexOf("## Trellis Context Loading Protocol");
    const end = text.indexOf("## Context", start + 1);
    if (start < 0 || end < 0) throw new Error("Missing context protocol");
    text = text.slice(0, start) + protocol(role) + text.slice(end);
    const contextLines = role === "implement" ? "Before implementing, read:" : "Before checking, read:";
    text = replace(text, contextLines, "Use already-loaded material or read missing context as described above:");
    const guard = role === "implement" ? "## Forbidden Operations" : "## Important";
    text = replace(text, guard, `## Execution Boundaries

- Work only on this task's approved scope. Do not revert unrelated user or concurrent changes.
- Only the main session manages task lifecycle: do not run task.py start/finish/archive or add_session.py.
- Do not commit, push, merge, switch/create branches, or clean/reset the checkout. Preserve the working directory for review.
- Tool allowlists and these instructions prevent common mistakes; they are not an OS sandbox.

${guard}`);
    text = replace(text, "Run project's lint and typecheck commands to verify changes.", "Run the project's relevant lint, typecheck, and focused tests. Record the actual commands and results. If a check is unavailable or was not run, report that explicitly; do not label it Passed.");
  }
  if (role === "check") {
    text = replace(text, "1. **Get code changes** - Use git diff to get uncommitted code", "1. **Get code changes** - Review committed changes against a supplied Review base, staged/unstaged changes, and untracked files");
    text = replace(text, "**Fix issues yourself**, don't just report them.", "**Fix issues yourself** when they are within the approved task scope and the solution is clear. Report requirements/design disputes, unrelated changes, and unsafe or blocked fixes to the main agent instead of expanding scope.");
    text = replace(text, "```bash\ngit diff --name-only  # List changed files\ngit diff              # View specific changes\n```", "```bash\ngit status --short\ngit diff --name-only\ngit diff\ngit diff --cached --name-only\ngit diff --cached\ngit ls-files --others --exclude-standard\n```\n\nIf the dispatch supplies `Review base: <commit>`, also review `git diff <commit> HEAD`. Read relevant untracked files explicitly. Without a supplied base, report that committed history was not part of the review; do not guess a base or interpret an empty unstaged diff as no work.");
    text = replace(text, "If failed, fix issues and re-run.", "If failed, fix issues within scope and re-run. Verification must describe the final version after your own fixes. Report remaining failures and blocked checks honestly.");
    text = replace(text, "Checked X files, found Y issues, all fixed.", "Checked X files, fixed Y issues, Z remain. State any review or verification limitations.");
  }
  if (role === "research") {
    text = replace(text, "## Core Principle", `## Pi Tools and Task Ownership

Use read/find/grep/bash for local research and write for findings. Pi loads skills via read of a discovered SKILL.md; there is no built-in Skill tool. Only call external search/MCP tools actually available in this session. The inherited extension tool set is not restricted by the built-in tools list; obey this role's write scope for those tools too. If external access is unavailable, persist local findings and clearly report that external research was not performed.

Do not spawn implement/check yourself; recommend them to the main agent. Do not run task lifecycle or session-recording commands. These role limits are not a shell sandbox.

## Core Principle`);
    text = replace(text, "(Glob, Grep, Read)", "(find, grep, read)");
    text = replace(text, "Run `python3 ./.trellis/scripts/task.py current --source` → active task path. If no active task is set, ask the user where to write output; do NOT guess.", "Use the first dispatch line `Active task: <path>` when supplied; otherwise run `python3 ./.trellis/scripts/task.py current --source` (respect TRELLIS_PYTHON when configured). Resolve paths from the actual execution project root. The task must be beneath `.trellis/tasks/`, including a project's explicit top-level task-store symlink. If no active task is available, report the blocker to the main agent and stop; do NOT guess, create a task, or write elsewhere.");
    text = replace(text, "Run independent searches in parallel (Glob + Grep + web) for efficiency.", "Run independent searches in parallel (find + grep + available web tools) when supported. Cite only references actually retrieved, with relevant versions and uncertainty.");
    text = replace(text, "- Any git operation (commit / push / branch / merge)", "- Mutating git operations (commit / push / branch / merge / checkout / reset / clean). Read-only git status/diff/log are allowed for research.");
    text = replace(text, "If the user asks you to edit code, decline and suggest spawning `implement` instead.", "If asked to edit code, report the request to the main agent and recommend trellis-implement; do not spawn it yourself.");
    text = replace(text, "- Don't propose improvements or critique implementation (that's not your role)", "- Don't make unsolicited implementation changes. When explicitly asked to compare approaches or identify risks, document evidence, trade-offs, and uncertainty without implementing fixes.");
  }
  text = text.replace(/\n---\n/, "\n---\n<!-- Adapted by pi-trellis on 2026-10-12 from Trellis 0.6.17 Claude Code agents.\n     Changes: Pi tools/context protocol and execution/verification corrections.\n     AGPL-3.0-only; see docs/trellis-agent-sync.md and licenses/trellis-AGPL-3.0.txt in the pi-trellis package. -->\n");
  return text;
}

export function synchronize(sourceDirectory, check = false) {
  const manifest = { version: "0.6.17", platform: "claude", adapted: "2026-10-12", files: {} };
  for (const role of ["implement", "check", "research"]) {
    const source = readFileSync(`${sourceDirectory}/trellis-${role}.md`, "utf8");
    const adapted = adaptAgent(role, source);
    const hash = (text) => createHash("sha256").update(text).digest("hex");
    manifest.files[role] = { source: hash(source), adapted: hash(adapted) };
    const dest = new URL(`agents/trellis-${role}.md`, root);
    if (check) {
      if (readFileSync(dest, "utf8") !== adapted) throw new Error(`${role}: adapted document differs`);
    } else writeFileSync(dest, adapted);
  }
  const manifestPath = new URL("resources/agent-baseline.json", root);
  if (check) {
    if (JSON.stringify(JSON.parse(readFileSync(manifestPath, "utf8"))) !== JSON.stringify(manifest)) throw new Error("Baseline manifest differs");
  } else writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage: node scripts/sync-agents.mjs <generated .claude/agents directory> [--check]");
  synchronize(dir, process.argv.includes("--check"));
}
