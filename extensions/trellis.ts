/**
 * pi-trellis — a project-local pi extension that adapts pi to a Trellis project.
 *
 * Scope (see design doc §2):
 *   M1  session / task context injection via systemPrompt sections + per-turn state message
 *   M2  active-task status in the footer
 *   M3  `Active task:` pointer handed to trellis-* subagents
 *   M4  agent definitions deployed to .pi/agents/ (hash-guarded)
 *   M5  skill bridge: point pi at skill directories that already exist on disk
 *
 * This extension contains no Trellis source code. It talks to Trellis through
 * documented surfaces only: the `task.py` / `get_context.py` CLIs, the
 * TRELLIS_CONTEXT_ID environment variable, and on-disk paths under `.trellis/`.
 * Everything here is written to fail silently rather than take a session down.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Window in which a `get_context.py` result is reused instead of re-spawning python. */
const CONTEXT_TTL_MS = 1500;

/**
 * Window in which the active task is reused. This exists for the negative
 * case: with no session pointer on disk every lookup would otherwise spawn
 * `task.py current` once per turn. Any `task.py` call invalidates it, so the
 * footer and the injected state still react immediately to a real change.
 */
const TASK_TTL_MS = 10000;

/** Hard cap on the workflow excerpt that enters the system prompt. */
const WORKFLOW_MAX_CHARS = 14000;

/** Total width budget for the footer status chip, including the `trellis: ` prefix. */
const STATUS_MAX_CHARS = 34;

const PYTHON = process.env.TRELLIS_PYTHON || (process.platform === "win32" ? "python" : "python3");

/**
 * `full` / `compact` force the injection size; anything else auto-selects
 * (compact when there is no UI: subagent sessions and `pi -p`). Useful when
 * `pi -p` drives the real workflow in CI and wants the whole payload.
 */
const CONTEXT_MODE = process.env.TRELLIS_PI_CONTEXT?.trim().toLowerCase();

const SECTION_OVERVIEW = "session-overview";
const SECTION_WORKFLOW = "trellis-workflow";
const STATE_MESSAGE_TYPE = "trellis-task-state";
const STATUS_KEY = "trellis";
const AGENT_PREFIX = "trellis-";
const ACTIVE_TASK_MARKER = "Active task:";
const HASH_FILE = ".pi-trellis-hashes.json";

/** Candidate skill roots, in priority order. Only the first that exists is bridged (M5). */
const SKILL_DIRS = [
	join(".agents", "skills"),
	join(".claude", "skills"),
	join(".cursor", "skills"),
];

// ---------------------------------------------------------------------------
// Module state
//
// NOTE: pi caches extension factories per path (loader.js:461-488), so this
// state is shared between the top-level session and subagent sessions in the
// same process. That is deliberate for `envOwnerRoot` — it is how a child
// session inherits the parent's context key (design doc §3.10(6)).
// ---------------------------------------------------------------------------

/** root -> TRELLIS_CONTEXT_ID */
const keyByRoot = new Map<string, string>();
/** The root that claimed process.env.TRELLIS_CONTEXT_ID. */
let envOwnerRoot: string | undefined;

/** cacheKey -> memoized prompt sections. Must stay byte-stable for the process lifetime. */
const sectionCache = new Map<string, { overview?: string; workflow?: string }>();
/** cacheKey -> last state text handed to the model, for dedup. */
const lastStateSent = new Map<string, string>();
/** root -> cached `get_context.py --mode default` payload. */
const contextCache = new Map<string, { at: number; value: Promise<TrellisContext | undefined> }>();
/** cacheKey -> cached active task, including cached absence. */
const taskCache = new Map<string, { at: number; value: Promise<ActiveTask | undefined> }>();
/** root -> parsed workflow.md, invalidated by mtime. */
const workflowCache = new Map<string, { mtimeMs: number; head: string; states: Map<string, string> }>();

let warnedMissingAgentTool = false;
let warnedBrokenCli = false;
const deployedRoots = new Set<string>();

// ---------------------------------------------------------------------------
// Types (shapes we read, not shapes we own)
// ---------------------------------------------------------------------------

interface TrellisTaskNode {
	dir?: string;
	name?: string;
	status?: string;
	parent?: string | null;
	children?: unknown[];
}

interface TrellisContext {
	developer?: string;
	git?: { isRepo?: boolean; branch?: string; isClean?: boolean; uncommittedChanges?: number };
	tasks?: { active?: TrellisTaskNode[]; directory?: string };
	journal?: { file?: string; lines?: number; nearLimit?: boolean };
}

interface ActiveTask {
	/** Repo-relative task directory, e.g. `.trellis/tasks/00-bootstrap`. */
	dir: string;
	status: string;
	title?: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * Walk up from `cwd` looking for a `.trellis/` directory.
 *
 * Resolved on every use rather than captured once: a session's cwd can change
 * during its lifetime (RPC / pi-web / project switch), and baking a root in
 * would leak project A's context into project B.
 */
function findRoot(cwd: string | undefined): string | undefined {
	let dir = resolve(cwd || process.cwd());
	for (;;) {
		if (existsSync(join(dir, ".trellis"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

function scriptPath(root: string, name: string): string {
	return join(root, ".trellis", "scripts", name);
}

function hasScripts(root: string): boolean {
	return existsSync(scriptPath(root, "task.py")) && existsSync(scriptPath(root, "get_context.py"));
}

function shortHash(input: string): string {
	return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

/** Directory this extension was loaded from, used to find the bundled `agents/`. */
function packageDir(): string {
	return dirname(dirname(fileURLToPath(import.meta.url)));
}

// ---------------------------------------------------------------------------
// Context key
// ---------------------------------------------------------------------------

/**
 * Derive the Trellis context id for this session, and publish it to the
 * process environment.
 *
 * Trellis uses the value verbatim as a filename under
 * `.trellis/.runtime/sessions/`, so it must stay filesystem-safe.
 *
 * Inheritance matters: a subagent session has no handle on its spawner
 * (agent-runner.js:740-757), so without inheriting the parent's key it would
 * compute a different one and see "no active task". The parent claims
 * `process.env.TRELLIS_CONTEXT_ID` first; same-process children read it back.
 * A different project root never inherits — that would cross-contaminate.
 */
function contextKey(root: string, ctx: ExtensionContext): string {
	const cached = keyByRoot.get(root);
	if (cached) {
		publishKey(root, cached);
		return cached;
	}

	const inherited = process.env.TRELLIS_CONTEXT_ID?.trim();
	let key: string;
	if (inherited && (envOwnerRoot === undefined || envOwnerRoot === root)) {
		// Either a parent session in this project claimed it, or the user pinned
		// one by hand before starting pi. Both are intentional; honour them.
		key = inherited;
	} else {
		let sessionFile: string | undefined;
		try {
			sessionFile = ctx.sessionManager?.getSessionFile?.();
		} catch {
			sessionFile = undefined;
		}
		// Session file keeps the pointer stable across restarts of the same
		// conversation; root keeps it stable for unsaved sessions.
		key = `pi-${shortHash(sessionFile || root)}`;
	}

	keyByRoot.set(root, key);
	publishKey(root, key);
	return key;
}

function publishKey(root: string, key: string): void {
	process.env.TRELLIS_CONTEXT_ID = key;
	envOwnerRoot = root;
}

function cacheKeyFor(root: string, key: string): string {
	return `${key}::${root}`;
}

// ---------------------------------------------------------------------------
// Trellis CLI
// ---------------------------------------------------------------------------

function runScript(
	root: string,
	key: string,
	script: string,
	args: string[],
	timeoutMs = 15000,
): Promise<{ code: number; stdout: string } | undefined> {
	return new Promise((done) => {
		try {
			execFile(
				PYTHON,
				[scriptPath(root, script), ...args],
				{
					cwd: root,
					timeout: timeoutMs,
					env: { ...process.env, TRELLIS_CONTEXT_ID: key },
					maxBuffer: 8 * 1024 * 1024,
					windowsHide: true,
				},
				(err, stdout) => {
					const text = typeof stdout === "string" ? stdout : String(stdout ?? "");
					if (err && typeof (err as { code?: unknown }).code !== "number") {
						// Spawn failure (python missing, timeout kill): no usable result.
						done(undefined);
						return;
					}
					done({ code: (err as { code?: number } | null)?.code ?? 0, stdout: text });
				},
			);
		} catch {
			done(undefined);
		}
	});
}

/** Parse the first top-level JSON object in `text`, tolerating leading notices. */
function parseJson<T>(text: string): T | undefined {
	const start = text.indexOf("{");
	if (start < 0) return undefined;
	try {
		return JSON.parse(text.slice(start)) as T;
	} catch {
		return undefined;
	}
}

/**
 * Caches the promise, not the result: a fan-out of subagent sessions starts
 * concurrently, and caching only settled values would let each one spawn its
 * own python process.
 */
function loadContext(root: string, key: string): Promise<TrellisContext | undefined> {
	const cached = contextCache.get(root);
	if (cached && Date.now() - cached.at < CONTEXT_TTL_MS) return cached.value;

	const value = runScript(root, key, "get_context.py", ["--mode", "default", "--json"])
		.then((result) => (result ? parseJson<TrellisContext>(result.stdout) : undefined))
		.catch(() => undefined);
	contextCache.set(root, { at: Date.now(), value });
	return value;
}

// ---------------------------------------------------------------------------
// Active task (read from disk; python is the fallback)
// ---------------------------------------------------------------------------

/**
 * Resolve the active task without spawning python.
 *
 * The session pointer file is a Trellis implementation detail, not a public
 * contract, so every read is defensive and a miss simply degrades to the CLI.
 */
function readActiveTaskFromDisk(root: string, key: string): ActiveTask | undefined {
	try {
		const pointer = join(root, ".trellis", ".runtime", "sessions", `${key}.json`);
		if (!existsSync(pointer)) return undefined;
		const data = parseJson<{ current_task?: unknown }>(readFileSync(pointer, "utf8"));
		const dir = typeof data?.current_task === "string" ? data.current_task : undefined;
		if (!dir) return undefined;

		const record = parseJson<{ status?: unknown; title?: unknown }>(
			readFileSync(join(root, dir, "task.json"), "utf8"),
		);
		const status = typeof record?.status === "string" && record.status ? record.status : "task_error";
		return { dir, status, title: typeof record?.title === "string" ? record.title : undefined };
	} catch {
		return undefined;
	}
}

function readActiveTask(root: string, key: string): Promise<ActiveTask | undefined> {
	const cacheKey = cacheKeyFor(root, key);
	const cached = taskCache.get(cacheKey);
	if (cached && Date.now() - cached.at < TASK_TTL_MS) return cached.value;

	const value = resolveActiveTask(root, key).catch(() => undefined);
	taskCache.set(cacheKey, { at: Date.now(), value });
	return value;
}

function invalidateTask(root: string, key: string): void {
	taskCache.delete(cacheKeyFor(root, key));
}

async function resolveActiveTask(root: string, key: string): Promise<ActiveTask | undefined> {
	const fromDisk = readActiveTaskFromDisk(root, key);
	if (fromDisk) return fromDisk;

	const result = await runScript(root, key, "task.py", ["current", "--json"], 10000);
	if (!result) return undefined;
	const data = parseJson<{ current_task?: { dir?: unknown; status?: unknown; title?: unknown } | null }>(
		result.stdout,
	);
	const task = data?.current_task;
	if (!task || typeof task.dir !== "string") return undefined;
	return {
		dir: task.dir,
		status: typeof task.status === "string" && task.status ? task.status : "task_error",
		title: typeof task.title === "string" ? task.title : undefined,
	};
}

// ---------------------------------------------------------------------------
// workflow.md
// ---------------------------------------------------------------------------

/**
 * Split `workflow.md` into the stable head (everything before the first
 * per-turn breadcrumb block) and the breadcrumb blocks themselves.
 *
 * Breadcrumbs are `[workflow-state:<status>] ... [/workflow-state:<status>]`.
 * Platform-scoped blocks are bracket lines listing platform names; blocks that
 * do not name Pi are dropped so the model never reads another platform's
 * instructions.
 */
function loadWorkflow(root: string): { head: string; states: Map<string, string> } | undefined {
	const file = join(root, ".trellis", "workflow.md");
	let mtimeMs: number;
	try {
		mtimeMs = statSync(file).mtimeMs;
	} catch {
		return undefined;
	}

	const cached = workflowCache.get(root);
	if (cached && cached.mtimeMs === mtimeMs) return cached;

	let text: string;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return undefined;
	}

	const lines = text.split("\n");
	const states = new Map<string, string>();
	const headLines: string[] = [];
	let headDone = false;

	// A bracket line is a platform scope only when its exact close tag exists.
	// That distinguishes `[Kilo]` (a block) from `[x]`, `[1]`, or `[link](...)`.
	const closeTags = new Set<string>();
	for (const line of lines) {
		const match = /^\[\/(.+)\]$/.exec(line.trim());
		if (match) closeTags.add(match[1]);
	}

	/** Name of the platform block currently being skipped, if any. */
	let skipping: string | undefined;
	/** Status name of the breadcrumb block currently being collected. */
	let stateName: string | undefined;
	let stateLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (stateName !== undefined) {
			if (trimmed === `[/workflow-state:${stateName}]`) {
				states.set(stateName, stateLines.join("\n").trim());
				stateName = undefined;
				stateLines = [];
			} else {
				stateLines.push(line);
			}
			continue;
		}

		const stateOpen = /^\[workflow-state:([^\]]+)\]$/.exec(trimmed);
		if (stateOpen) {
			headDone = true;
			stateName = stateOpen[1];
			stateLines = [];
			continue;
		}

		if (headDone) continue;

		if (skipping !== undefined) {
			if (trimmed === `[/${skipping}]`) skipping = undefined;
			continue;
		}

		const platforms = platformList(trimmed, closeTags);
		if (platforms) {
			if (!platforms.some((name) => name.toLowerCase() === "pi")) {
				skipping = trimmed.slice(1, -1);
			}
			continue;
		}
		if (/^\[\/.+\]$/.test(trimmed) && closeTags.has(trimmed.slice(2, -1))) continue; // close of a kept block

		headLines.push(line);
	}

	let head = headLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	if (head.length > WORKFLOW_MAX_CHARS) {
		head = `${head.slice(0, WORKFLOW_MAX_CHARS)}\n\n[...truncated by pi-trellis; read .trellis/workflow.md for the rest]`;
	}

	const parsed = { mtimeMs, head, states };
	workflowCache.set(root, parsed);
	return parsed;
}

/**
 * Recognize a platform-scope bracket line such as
 * `[Claude Code, Cursor, Pi, ZCode]`, returning the platform names.
 *
 * The test is structural, not lexical: the line must have a matching `[/...]`
 * close tag somewhere in the document. Markdown checkboxes, footnote markers
 * and link labels have none, so they stay in the prose.
 */
function platformList(trimmed: string, closeTags: Set<string>): string[] | undefined {
	if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;
	const inner = trimmed.slice(1, -1);
	if (!inner || inner.startsWith("/") || inner.includes("[") || inner.includes("]")) return undefined;
	if (inner.startsWith("workflow-state:")) return undefined;
	if (!closeTags.has(inner)) return undefined;
	return inner.split(",").map((part) => part.trim());
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderOverview(root: string, key: string, context: TrellisContext | undefined): string {
	const lines: string[] = [
		"Trellis-managed project. Snapshot taken when this session started;",
		`live task state arrives as <${STATE_MESSAGE_TYPE}> messages.`,
		"",
		`Project root: ${root}`,
		`Trellis context id: ${key}`,
	];

	if (context?.developer) lines.push(`Developer: ${context.developer}`);

	const git = context?.git;
	if (git?.isRepo) {
		const bits = [git.branch || "unknown branch"];
		if (git.isClean === false && typeof git.uncommittedChanges === "number") {
			bits.push(`${git.uncommittedChanges} uncommitted`);
		}
		lines.push(`Git: ${bits.join(", ")}`);
	}

	const journal = context?.journal;
	if (journal?.file) {
		const near = journal.nearLimit ? ", near line limit — consider rotating" : "";
		lines.push(`Journal: ${journal.file} (${journal.lines ?? "?"} lines${near})`);
	}

	const active = context?.tasks?.active ?? [];
	if (active.length > 0) {
		lines.push("", "Active tasks at startup:");
		for (const task of active) {
			const name = task.dir || task.name || "?";
			const kids = Array.isArray(task.children) && task.children.length > 0
				? `, ${task.children.length} child task(s)`
				: "";
			lines.push(`  - ${name} [${task.status ?? "unknown"}${kids}]`);
		}
	} else {
		lines.push("", "No active tasks at startup.");
	}

	lines.push(
		"",
		`Task directory: ${context?.tasks?.directory ?? ".trellis/tasks"}`,
		"Trellis CLI (run from the project root):",
		`  ${PYTHON} ./.trellis/scripts/task.py current --json`,
		`  ${PYTHON} ./.trellis/scripts/get_context.py --mode default --json`,
		`  ${PYTHON} ./.trellis/scripts/get_context.py --mode phase --step <N.N>`,
		`  ${PYTHON} ./.trellis/scripts/get_context.py --mode packages`,
		`The session pointer is keyed by TRELLIS_CONTEXT_ID (already exported as ${key}).`,
	);

	return lines.join("\n");
}

function renderWorkflowSection(head: string): string {
	return [
		head,
		"",
		"---",
		"Excerpt of .trellis/workflow.md (stable part only; platform blocks that do not name Pi were removed).",
		"Per-phase detail is not included here — load it on demand:",
		`  ${PYTHON} ./.trellis/scripts/get_context.py --mode phase --step <N.N>`,
		"Read .trellis/workflow.md directly when you need the full document.",
	].join("\n");
}

function renderState(root: string, task: ActiveTask | undefined, states: Map<string, string> | undefined): string {
	const lines: string[] = [];
	if (task) {
		const title = task.title ? ` — ${task.title}` : "";
		lines.push(`${ACTIVE_TASK_MARKER} ${task.dir}${title}`);
		lines.push(`Status: ${task.status}`);
	} else {
		lines.push("No active task for this session.");
	}

	const breadcrumb = states?.get(task ? task.status : "no_task");
	if (breadcrumb) lines.push("", breadcrumb);

	if (task) {
		lines.push(
			"",
			`Task artifacts: ${task.dir}/prd.md, ${task.dir}/design.md, ${task.dir}/implement.md (whichever exist).`,
		);
	}
	return lines.join("\n");
}

function renderStatus(task: ActiveTask | undefined): string | undefined {
	if (!task) return undefined;
	const prefix = "trellis: ";
	const separator = " ▸ ";
	const slug = basename(task.dir);
	const status = task.status;
	const budget = Math.max(6, STATUS_MAX_CHARS - prefix.length - separator.length - status.length);
	const short = slug.length > budget ? `${slug.slice(0, budget - 1)}…` : slug;
	return `${prefix}${short}${separator}${status}`;
}

// ---------------------------------------------------------------------------
// M4 — agent definitions
// ---------------------------------------------------------------------------

/**
 * Copy bundled agent definitions into `<root>/.pi/agents/`.
 *
 * pi package manifests cannot declare agents and pi-subagents reads them from
 * disk (custom-agents.js:25-43), so the extension deploys them at runtime.
 * A file the user edited is never overwritten: that is the supported way to
 * customize an agent per project.
 */
function deployAgents(root: string, ctx: ExtensionContext): void {
	if (deployedRoots.has(root)) return;
	deployedRoots.add(root);

	const sourceDir = join(packageDir(), "agents");
	if (!existsSync(sourceDir)) return;

	let files: string[];
	try {
		files = readdirSync(sourceDir).filter((name) => name.endsWith(".md"));
	} catch {
		return;
	}
	if (files.length === 0) return;

	const targetDir = join(root, ".pi", "agents");
	const hashFile = join(root, ".pi", HASH_FILE);
	let recorded: Record<string, string> = {};
	try {
		if (existsSync(hashFile)) {
			recorded = parseJson<Record<string, string>>(readFileSync(hashFile, "utf8")) ?? {};
		}
	} catch {
		recorded = {};
	}

	const skipped: string[] = [];
	let wrote = false;

	for (const name of files) {
		try {
			const content = readFileSync(join(sourceDir, name), "utf8");
			const packageHash = shortHash(content);
			const target = join(targetDir, name);

			if (!existsSync(target)) {
				mkdirSync(targetDir, { recursive: true });
				writeFileSync(target, content, "utf8");
				recorded[name] = packageHash;
				wrote = true;
				continue;
			}

			const currentHash = shortHash(readFileSync(target, "utf8"));
			if (currentHash === packageHash) {
				if (recorded[name] !== packageHash) {
					recorded[name] = packageHash;
					wrote = true;
				}
				continue;
			}
			if (recorded[name] !== undefined && currentHash === recorded[name]) {
				// Untouched copy of an older package version — safe to update.
				writeFileSync(target, content, "utf8");
				recorded[name] = packageHash;
				wrote = true;
				continue;
			}
			skipped.push(name);
		} catch {
			// A single unreadable/unwritable file must not stop the others.
		}
	}

	if (wrote) {
		try {
			mkdirSync(dirname(hashFile), { recursive: true });
			writeFileSync(hashFile, `${JSON.stringify(recorded, null, 2)}\n`, "utf8");
		} catch {
			// Losing the manifest only costs us the "safe to update" fast path.
		}
	}

	if (skipped.length > 0 && ctx.hasUI) {
		ctx.ui?.notify?.(
			`pi-trellis: keeping your edited ${skipped.join(", ")} in .pi/agents/ (package version not applied)`,
			"info",
		);
	}
}

// ---------------------------------------------------------------------------
// M5 — skill bridge
// ---------------------------------------------------------------------------

/**
 * Point pi at Trellis skills that already exist in the project.
 *
 * `trellis init` writes skills per platform, and none of its default targets
 * are directories pi discovers (design doc §3.11). Rather than generating a
 * fourth copy, hand pi the files that are already there. Only `trellis-*`
 * skills are bridged — the rest of a platform directory is not ours to lift.
 */
function bridgeSkills(root: string): string[] {
	for (const relative of SKILL_DIRS) {
		const dir = join(root, relative);
		if (!existsSync(dir)) continue;

		// pi discovers `.agents/skills/` natively; bridging it would only create
		// name collisions with itself.
		if (relative === SKILL_DIRS[0]) return [];

		try {
			const paths: string[] = [];
			for (const entry of readdirSync(dir)) {
				if (!entry.startsWith(AGENT_PREFIX)) continue;
				const file = join(dir, entry, "SKILL.md");
				if (existsSync(file)) paths.push(file);
			}
			return paths;
		} catch {
			return [];
		}
	}
	return [];
}

// ---------------------------------------------------------------------------
// Shared per-event work
// ---------------------------------------------------------------------------

interface Session {
	root: string;
	key: string;
	cacheKey: string;
}

function session(ctx: ExtensionContext): Session | undefined {
	const root = findRoot(ctx.cwd);
	if (!root || !hasScripts(root)) return undefined;
	const key = contextKey(root, ctx);
	return { root, key, cacheKey: cacheKeyFor(root, key) };
}

async function refreshStatus(ctx: ExtensionContext, known?: Session): Promise<void> {
	try {
		const current = known ?? session(ctx);
		if (!ctx.hasUI || !ctx.ui?.setStatus) return;
		if (!current) {
			ctx.ui.setStatus(STATUS_KEY, undefined);
			return;
		}
		const task = await readActiveTask(current.root, current.key);
		ctx.ui.setStatus(STATUS_KEY, renderStatus(task));
	} catch {
		try {
			ctx.ui?.setStatus?.(STATUS_KEY, undefined);
		} catch {
			// Status is cosmetic. Never let it surface.
		}
	}
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

/**
 * Pure helpers, exported for tests only. Not a stable API — the extension's
 * contract is its event handlers.
 */
export const __internals = {
	findRoot,
	loadWorkflow,
	platformList,
	renderOverview,
	renderWorkflowSection,
	renderState,
	renderStatus,
	readActiveTaskFromDisk,
	bridgeSkills,
	shortHash,
};

export default function (pi: ExtensionAPI): void {
	// ---- M1 / M4 / M2: session bootstrap -----------------------------------

	pi.on("session_start", async (_event, ctx) => {
		const current = session(ctx);
		if (!current) return;

		deployAgents(current.root, ctx);

		// Behavioural version check: if the CLI contract moved, say so once
		// instead of degrading silently.
		const probe = await loadContext(current.root, current.key);
		if (!probe && ctx.hasUI && !warnedBrokenCli) {
			warnedBrokenCli = true;
			ctx.ui?.notify?.(
				"pi-trellis: get_context.py did not return usable JSON — Trellis context injection is degraded. Check the Trellis version.",
				"warning",
			);
		}

		// Q2: pi-subagents provides Agent/SubagentWorkflow. Warn only where a
		// human can see it — a subagent session legitimately has no Agent tool.
		if (ctx.hasUI && !warnedMissingAgentTool) {
			try {
				const hasAgentTool = pi.getAllTools().some((tool) => tool.name === "Agent");
				if (!hasAgentTool) {
					warnedMissingAgentTool = true;
					ctx.ui?.notify?.(
						"pi-trellis: no Agent tool found — install a subagent extension (e.g. pi install @tintinweb/pi-subagents) to dispatch trellis-* agents.",
						"warning",
					);
				}
			} catch {
				// Tool enumeration is best-effort.
			}
		}

		await refreshStatus(ctx, current);
	});

	// ---- M1: prompt sections -----------------------------------------------

	pi.on("before_agent_start", async (event, ctx) => {
		try {
			const current = session(ctx);
			if (!current) return;

			const sections = event.systemPromptOptions?.sections;
			if (!sections) return;

			// Headless sessions (subagents, `pi -p`) get the compact payload: the
			// workflow excerpt is the largest block and the least useful to a
			// single-purpose agent. TRELLIS_PI_CONTEXT overrides the guess.
			const compact = CONTEXT_MODE === "compact" || (CONTEXT_MODE !== "full" && !ctx.hasUI);

			let cached = sectionCache.get(current.cacheKey);
			if (!cached) {
				cached = {};
				sectionCache.set(current.cacheKey, cached);
			}

			if (cached.overview === undefined) {
				const context = await loadContext(current.root, current.key);
				cached.overview = renderOverview(current.root, current.key, context);
			}
			sections[SECTION_OVERVIEW] = cached.overview;

			if (!compact) {
				if (cached.workflow === undefined) {
					const workflow = loadWorkflow(current.root);
					cached.workflow = workflow ? renderWorkflowSection(workflow.head) : "";
				}
				if (cached.workflow) sections[SECTION_WORKFLOW] = cached.workflow;
			}

			// Volatile state never enters the prompt: a section that changes every
			// turn invalidates the provider's prefix cache from byte zero.
			const task = await readActiveTask(current.root, current.key);
			const state = renderState(current.root, task, loadWorkflow(current.root)?.states);
			if (lastStateSent.get(current.cacheKey) !== state) {
				lastStateSent.set(current.cacheKey, state);
				pi.sendMessage({
					customType: STATE_MESSAGE_TYPE,
					content: state,
					display: false,
				});
			}
		} catch {
			// A failed injection costs context, not the session.
		}
	});

	// ---- M3 / session isolation: tool_call ---------------------------------

	pi.on("tool_call", async (event, ctx) => {
		try {
			const current = session(ctx);
			if (!current) return;

			if (event.toolName === "bash") {
				// The key already sits in process.env (republished just above by
				// `session()`), and spawned shells inherit it. The inline export is
				// only needed when two project roots are live in one process, where
				// a concurrent call could flip the variable between publish and spawn.
				if (keyByRoot.size < 2) return;
				const input = event.input as { command?: unknown };
				if (typeof input.command !== "string") return;
				if (!/\btrellis\b|task\.py|get_context\.py/.test(input.command)) return;
				if (input.command.includes("TRELLIS_CONTEXT_ID=")) return;
				input.command = `export TRELLIS_CONTEXT_ID=${current.key}\n${input.command}`;
				return;
			}

			if (event.toolName !== "Agent") return;
			const input = event.input as { subagent_type?: unknown; prompt?: unknown };
			if (typeof input.subagent_type !== "string" || !input.subagent_type.startsWith(AGENT_PREFIX)) return;
			if (typeof input.prompt !== "string") return;
			if (input.prompt.includes(ACTIVE_TASK_MARKER)) return; // idempotent

			const task = await readActiveTask(current.root, current.key);
			if (!task) return;

			// One line, by design. The child session loads this extension too and
			// injects the task context itself (design doc §3.10) — repeating the
			// artifacts here would bill the same context twice.
			input.prompt = `${ACTIVE_TASK_MARKER} ${task.dir} (status: ${task.status})\n\n${input.prompt}`;
		} catch {
			// Never block a tool because our patching failed.
		}
	});

	// ---- M2: status refresh ------------------------------------------------

	pi.on("tool_result", async (event, ctx) => {
		try {
			if (event.toolName !== "bash") return;
			const command = (event.input as { command?: unknown }).command;
			if (typeof command !== "string" || !/task\.py/.test(command)) return;
			const current = session(ctx);
			if (current) invalidateTask(current.root, current.key);
			await refreshStatus(ctx, current);
		} catch {
			// ignore
		}
	});

	pi.on("agent_end", async (_event, ctx) => {
		await refreshStatus(ctx);
	});

	// ---- M5: skill bridge --------------------------------------------------

	pi.on("resources_discover", (event) => {
		try {
			const root = findRoot(event.cwd);
			if (!root) return {};
			const skillPaths = bridgeSkills(root);
			return skillPaths.length > 0 ? { skillPaths } : {};
		} catch {
			return {};
		}
	});

	// ---- Cleanup -----------------------------------------------------------

	pi.on("session_shutdown", (_event, ctx) => {
		try {
			ctx.ui?.setStatus?.(STATUS_KEY, undefined);
		} catch {
			// ignore
		}
	});
}
