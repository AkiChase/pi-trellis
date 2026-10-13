import { isUtf8 } from "node:buffer";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export type TrellisRole = "trellis-implement" | "trellis-check" | "trellis-research";
export const INJECTED_MARKER = "<!-- trellis-hook-injected -->";
export const CONTEXT_OPEN = "<!-- pi-trellis:task-context:start -->";
export const CONTEXT_CLOSE = "<!-- pi-trellis:task-context:end -->";
export const DEFAULT_LIMITS = { max_file_bytes: 32768, max_artifact_bytes: 65536, max_total_bytes: 131072 };
export interface ContextLimits { max_file_bytes: number; max_artifact_bytes: number; max_total_bytes: number }
export interface ContextDiagnostic { path: string; reason: string }
export interface ContextReference { path: string; reason: string; artifact: boolean }
export interface TaskContext {
	text: string;
	complete: boolean;
	loaded: string[];
	diagnostics: ContextDiagnostic[];
	references: ContextReference[];
}

export function isTrellisRole(value: unknown): value is TrellisRole {
	return value === "trellis-implement" || value === "trellis-check" || value === "trellis-research";
}

/** Parse only the documented top-level context_injection mapping; this is not a YAML parser. */
export function readContextLimits(root: string): ContextLimits {
	const limits = { ...DEFAULT_LIMITS };
	let text: string;
	try { text = readFileSync(join(root, ".trellis", "config.yaml"), "utf8"); } catch { return limits; }
	let section = false;
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith("#")) continue;
		if (!section) { section = /^context_injection\s*:\s*(?:#.*)?$/.test(line); continue; }
		if (!/^\s/.test(line)) break;
		const match = /^\s+([a-z_]+)\s*:\s*(.*?)\s*(?:\s+#.*)?$/.exec(line);
		if (!match || !Object.hasOwn(limits, match[1])) continue;
		const raw = match[2].replace(/^(['"])(.*)\1$/, "$2");
		const value = Number(raw);
		if (/^\d+$/.test(raw) && Number.isSafeInteger(value)) limits[match[1] as keyof ContextLimits] = value;
	}
	return limits;
}

function contained(root: string, path: string): boolean {
	const rel = relative(root, path);
	return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

/** Trust the execution root and narrowly the explicit top-level Trellis task store symlink. */
export function resolveTaskPath(executionRoot: string, taskDir: string): string {
	const root = realpathSync(executionRoot);
	if (!taskDir || taskDir.includes("\0") || /[\r\n]/.test(taskDir)) throw new Error("Invalid task path");
	const tasks = resolve(root, ".trellis", "tasks");
	const path = resolve(root, taskDir);
	if (!contained(tasks, path) || path === tasks) throw new Error("Task must be beneath .trellis/tasks");
	const store = realpathSync(tasks);
	const actual = realpathSync(path);
	if (!contained(store, actual) || !statSync(actual).isDirectory()) throw new Error("Task escapes its Trellis task store");
	return path;
}

/** Validate a task record through the same narrow realpath boundary used for materials. */
export function readTaskRecord(executionRoot: string, taskDir: string): Record<string, unknown> {
	const root = realpathSync(executionRoot);
	const task = resolveTaskPath(root, taskDir);
	const store = realpathSync(join(root, ".trellis", "tasks"));
	const path = realpathSync(join(task, "task.json"));
	if (!contained(root, path) && !contained(store, path)) throw new Error("task.json escapes execution root/task store");
	if (statSync(path).size > 1024 * 1024) throw new Error("task.json exceeds 1 MiB");
	const record = JSON.parse(readFileSync(path, "utf8"));
	if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Invalid task.json");
	return record;
}

/** No persistent material cache: every dispatch observes the current files, including same-mtime edits. */
export function buildTaskContext(options: {
	executionRoot: string; taskDir: string; role: TrellisRole; limits?: ContextLimits;
}): TaskContext {
	const result: TaskContext = { text: "", complete: false, loaded: [], diagnostics: [], references: [] };
	const fail = (path: string, reason: string) => {
		if (result.diagnostics.length < 64) result.diagnostics.push({ path, reason });
		else if (result.diagnostics.length === 64) result.diagnostics.push({ path: options.taskDir, reason: "Further diagnostics omitted; inspect the task JSONL/files manually" });
	};
	let root: string, task: string, store: string;
	const limits = options.limits ?? readContextLimits(options.executionRoot);
	for (const value of Object.values(limits)) {
		if (!Number.isSafeInteger(value) || value < 0) throw new Error("Context limits must be non-negative safe integers");
	}
	try {
		root = realpathSync(options.executionRoot);
		task = resolveTaskPath(root, options.taskDir);
		store = realpathSync(join(root, ".trellis", "tasks"));
		readTaskRecord(root, options.taskDir);
	} catch (error) {
		fail(options.taskDir, String(error));
		result.text = renderDiagnostics(result.diagnostics);
		return result;
	}
	const display = (path: string) => relative(root, path).split(sep).join("/");
	const safePath = (path: string): string => {
		const lexical = resolve(root, path);
		if (!contained(root, lexical)) throw new Error("Path leaves execution root");
		const actual = realpathSync(lexical);
		// External task stores are allowed only through the canonical .trellis/tasks route.
		if (!contained(root, actual) && !(contained(join(root, ".trellis", "tasks"), lexical) && contained(store, actual))) {
			throw new Error("Symlink leaves execution root/task store");
		}
		return actual;
	};
	const seenFiles = new Set<string>();
	const seenDirectories = new Set<string>();
	let entries = 0;
	const add = (path: string, reason: string, artifact = false, directory = false): void => {
		const label = display(resolve(root, path));
		try {
			const actual = safePath(path);
			const stat = statSync(actual);
			if (stat.isDirectory()) {
				if (!directory) throw new Error("Directory reference must declare type: directory");
				if (seenDirectories.has(actual)) return;
				seenDirectories.add(actual);
				if (seenDirectories.size > 128) throw new Error("Directory expansion limit reached");
				for (const name of readdirSync(resolve(root, path)).sort()) {
					if (entries++ >= 512) { fail(label, "Directory entry limit reached; read the directory explicitly"); break; }
					add(join(path, name), reason, artifact, true);
				}
				return;
			}
			if (!stat.isFile()) throw new Error("Not a regular file");
			if (seenFiles.has(actual)) return;
			seenFiles.add(actual);
			result.references.push({ path: label, reason, artifact });
		} catch (error) { fail(label, String(error)); }
	};

	if (options.role !== "trellis-research") {
		const list = join(task, `${options.role.slice("trellis-".length)}.jsonl`);
		try {
			const actual = safePath(list);
			if (statSync(actual).size > 1024 * 1024) throw new Error("JSONL exceeds 1 MiB; load manually");
			const lines = readFileSync(actual, "utf8").split(/\r?\n/);
			let refs = 0;
			for (const [i, line] of lines.entries()) {
				if (!line.trim()) continue;
				try {
					const row = JSON.parse(line);
					if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Expected a JSON object");
					if (!Object.hasOwn(row, "file")) continue; // Trellis placeholder rows
					if (typeof row.file !== "string" || !row.file.trim()) throw new Error("Invalid file reference");
					if (++refs > 512) { fail(display(list), "JSONL reference limit reached; read manually"); break; }
					add(row.file, typeof row.reason === "string" ? row.reason : "Task context", false, row.type === "directory");
				} catch (error) { fail(`${display(list)}:${i + 1}`, String(error)); }
			}
			if (refs === 0) fail(display(list), "No valid file references; read task context manually");
		} catch (error) { fail(display(list), String(error)); }
	}
	for (const name of ["prd.md", "design.md", "implement.md"]) {
		const path = join(task, name);
		if (name === "prd.md" || existsSync(path)) add(path, "Task artifact", true);
	}

	let used = 0;
	const blocks: string[] = [];
	for (const ref of result.references) {
		let fd: number | undefined;
		try {
			const path = safePath(ref.path);
			const size = statSync(path).size;
			const cap = ref.artifact ? limits.max_artifact_bytes : limits.max_file_bytes;
			const header = `=== ${ref.path} ===\n`;
			if (limits.max_total_bytes !== 0 && used + Buffer.byteLength(header) + 2 > limits.max_total_bytes) {
				fail(ref.path, "Total context budget exhausted; read the full file"); continue;
			}
			const remaining = limits.max_total_bytes === 0 ? Infinity : Math.max(0, limits.max_total_bytes - used - Buffer.byteLength(header) - 2);
			const length = Math.min(size, cap || Infinity, remaining);
			if (length <= 0 && size > 0) { fail(ref.path, "Total context budget exhausted; read the full file"); continue; }
			fd = openSync(path, "r");
			const buffer = Buffer.alloc(length);
			const count = readSync(fd, buffer, 0, length, 0);
			let bytes = buffer.subarray(0, count);
			if (bytes.includes(0)) throw new Error("Binary content; read with a suitable tool");
			// A capped prefix can end inside one UTF-8 character, never replace it with U+FFFD.
			if (count < size) {
				for (let trim = 0; trim < 4 && !isUtf8(bytes); trim++) bytes = bytes.subarray(0, Math.max(0, bytes.length - 1));
			}
			if (!isUtf8(bytes)) throw new Error("Non-UTF-8 content; read with a suitable tool");
			const block = `${header}${bytes.toString("utf8")}`;
			if (size === 0 && ref.path === display(join(task, "prd.md"))) fail(ref.path, "Required PRD is empty; ask the main agent for requirements");
			blocks.push(block);
			used += Buffer.byteLength(block) + 2;
			result.loaded.push(ref.path);
			if (bytes.length < size) fail(ref.path, `Truncated (${bytes.length}/${size} bytes); read the full file`);
		} catch (error) { fail(ref.path, String(error)); }
		finally { if (fd !== undefined) closeSync(fd); }
	}
	result.complete = result.diagnostics.length === 0 && result.loaded.length > 0;
	result.text = [...blocks, renderDiagnostics(result.diagnostics)].filter(Boolean).join("\n\n");
	return result;
}

function renderDiagnostics(diagnostics: ContextDiagnostic[]): string {
	if (diagnostics.length === 0) return "";
	return "Context not fully loaded. Read the listed files/JSONL before working; do not bypass path boundaries:\n" +
		diagnostics.map(({ path, reason }) => `- ${path}: ${reason}`).join("\n");
}

export interface DispatchFacts { taskDir: string; contextId?: string; role?: TrellisRole }
/** Facts are a contiguous first-line header, not a substring in prose or a quoted example. */
export function parseDispatchFacts(prompt: string): DispatchFacts | undefined {
	const lines = prompt.split(/\r?\n/);
	const first = /^Active task:\s+(.+?)(?: \(status: [^\r\n]+\))?$/.exec(lines[0]);
	if (!first) return undefined;
	const facts: DispatchFacts = { taskDir: first[1] };
	for (const line of lines.slice(1)) {
		if (!line.trim()) break;
		const key = /^Trellis context id: ([A-Za-z0-9_-]{1,128})$/.exec(line);
		if (key) facts.contextId = key[1];
		const role = /^Trellis agent: (.+)$/.exec(line)?.[1];
		if (isTrellisRole(role)) facts.role = role;
	}
	return facts;
}

/** Removes markers supplied by the caller; only fresh, owned material can assert injection. */
export function assembleDispatchPrompt(options: {
	prompt: string; taskDir: string; contextId: string; role: TrellisRole; context: TaskContext;
	materials?: { revision: string; sourceFingerprint: string; targetFingerprint: string };
}): string {
	let request = options.prompt.replace(/<!-- pi-trellis:task-context:start -->[\s\S]*?<!-- pi-trellis:task-context:end -->/g, "")
		.replaceAll(INJECTED_MARKER, "");
	if (parseDispatchFacts(request)) request = request.replace(/^Active task:[^\r\n]*(?:\r?\n(?:Trellis context id:|Trellis agent:)[^\r\n]*)*\r?\n?/, "");
	request = request.replace(/^Trellis material (?:revision|source fingerprint|target fingerprint):[^\r\n]*(?:\r?\n|$)/gm, "");
	const facts = options.materials;
	const materialFacts = facts ? `\nTrellis material revision: ${facts.revision}\nTrellis material source fingerprint: ${facts.sourceFingerprint}\nTrellis material target fingerprint: ${facts.targetFingerprint}` : "";
	const header = `Active task: ${options.taskDir}\nTrellis context id: ${options.contextId}\nTrellis agent: ${options.role}${materialFacts}`;
	const materialText = options.context.text.replaceAll(INJECTED_MARKER, "[marker quoted in task material]")
		.replaceAll(CONTEXT_OPEN, "[context delimiter quoted in task material]").replaceAll(CONTEXT_CLOSE, "[context delimiter quoted in task material]");
	const material = [CONTEXT_OPEN, options.context.complete ? INJECTED_MARKER : "", materialText, CONTEXT_CLOSE].filter(Boolean).join("\n");
	return `${header}\n\n${request.trim()}\n\n${material}`;
}
