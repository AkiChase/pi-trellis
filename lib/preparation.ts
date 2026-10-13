import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalPath, containsPath } from "./config.ts";
import { type WorktreeBinding, runtimeDirectory } from "./bindings.ts";
import { buildTaskContext, readTaskRecord } from "./task-context.ts";
import { git, pathExists, requireIgnored } from "./worktree.ts";

const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
export async function taskCli(binding: WorktreeBinding, args: string[], signal?: AbortSignal): Promise<string> {
	const script = join(binding.worktreePath, ".trellis/scripts/task.py");
	if (!containsPath(binding.worktreePath, canonicalPath(script)) || !lstatSync(script).isFile()) throw new Error("Target Trellis CLI must be a local regular file in the worktree");
	return new Promise((done, reject) => execFile(process.env.TRELLIS_PYTHON || (process.platform === "win32" ? "python" : "python3"), [script, ...args], {
		cwd: binding.worktreePath, env: { ...process.env, TRELLIS_CONTEXT_ID: binding.contextId }, timeout: 15000, maxBuffer: 1024 * 1024, signal,
	}, (error, stdout, stderr) => error ? reject(new Error(`Trellis CLI failed: ${String(stderr).trim() || String(stdout).trim() || error.message}`)) : done(String(stdout))));
}

/** Target task store/runtime must be local, never a symlink into source or another task store. */
export async function validateReady(binding: WorktreeBinding, signal?: AbortSignal): Promise<void> {
	const root = binding.worktreePath;
	if (!containsPath(root, canonicalPath(join(root, ".trellis/tasks")))) throw new Error("Target task store cannot symlink outside the worktree");
	await requireIgnored(root, runtimeDirectory(root), signal);
	if (!containsPath(root, canonicalPath(join(root, ".trellis/.runtime/sessions")))) throw new Error("Target sessions runtime cannot symlink outside worktree");
	for (const role of ["trellis-implement", "trellis-check"] as const) {
		const context = buildTaskContext({ executionRoot: root, taskDir: binding.taskDir, role, limits: { max_file_bytes: 0, max_artifact_bytes: 0, max_total_bytes: 0 } });
		if (!context.complete) throw new Error(context.text);
	}
	const record = readTaskRecord(root, binding.taskDir);
	if (record.status !== "in_progress" || record.branch !== binding.branch) throw new Error("Target task must be in_progress with its bound branch before dispatch");
	const current = JSON.parse(await taskCli(binding, ["current", "--json"], signal));
	if (current.current_task?.dir !== binding.taskDir || current.source !== `session:${binding.contextId}` || current.stale || current.error) throw new Error("Trellis current task/context does not match target binding");
}

export async function prepareWorktree(binding: WorktreeBinding, confirm: boolean, signal?: AbortSignal): Promise<{ files: string[]; hashes: Record<string, string> }> {
	const source = binding.sourceRoot, target = binding.worktreePath;
	const record = readTaskRecord(source, binding.taskDir);
	if (record.status !== "in_progress") throw new Error("Start/approve the source task through the normal workflow first; preparation does not advance a planning task");
	if (!containsPath(target, canonicalPath(join(target, ".trellis/tasks")))) throw new Error("Target task store must be local to worktree");
	const files = new Set([`${binding.taskDir}/task.json`, `${binding.taskDir}/prd.md`, `${binding.taskDir}/implement.jsonl`, `${binding.taskDir}/check.jsonl`]);
	for (const name of ["design.md", "implement.md"]) if (pathExists(join(source, binding.taskDir, name))) files.add(`${binding.taskDir}/${name}`);
	for (const role of ["trellis-implement", "trellis-check"] as const) {
		const context = buildTaskContext({ executionRoot: source, taskDir: binding.taskDir, role, limits: { max_file_bytes: 0, max_artifact_bytes: 0, max_total_bytes: 0 } });
		if (!context.complete) throw new Error(context.text);
		for (const ref of context.references) {
			if (ref.path.startsWith(`${binding.taskDir}/`)) files.add(ref.path);
			else {
				const original = readFileSync(join(source, ref.path));
				const destination = join(target, ref.path);
				if (!pathExists(destination) || !containsPath(target, canonicalPath(destination)) || !original.equals(readFileSync(destination))) throw new Error(`Referenced baseline material differs/missing in target: ${ref.path}; commit or explicitly reconcile it before preparing`);
				if (await git(source, ["status", "--porcelain", "--", ref.path], signal)) throw new Error(`Referenced baseline has uncommitted source differences: ${ref.path}`);
			}
		}
	}
	const copies = new Map<string, Buffer>();
	for (const file of files) {
		const sourcePath = join(source, file), destination = join(target, file);
		if (!containsPath(canonicalPath(join(source, binding.taskDir)), canonicalPath(sourcePath)) || !lstatSync(sourcePath).isFile()) throw new Error(`Task material must be a regular task-local file: ${file}`);
		if (!containsPath(target, canonicalPath(destination))) throw new Error(`Target file escapes worktree: ${file}`);
		const originalData = readFileSync(sourcePath);
		let data = originalData;
		if (file.endsWith("/task.json")) {
			const task = JSON.parse(data.toString("utf8"));
			task.branch = binding.branch;
			data = Buffer.from(`${JSON.stringify(task, null, 2)}\n`);
		}
		const prior = binding.preparedFiles?.[file];
		if (pathExists(destination) && !data.equals(readFileSync(destination)) && !(file.endsWith("/task.json") && originalData.equals(readFileSync(destination)))) {
			if (file.endsWith("/task.json") && prior) {
				const from = JSON.parse(data.toString("utf8")), to = JSON.parse(readFileSync(destination, "utf8"));
				delete from.branch; delete to.branch;
				if (JSON.stringify(from) !== JSON.stringify(to)) throw new Error(`Target material conflict: ${file}`);
			} else throw new Error(`Target material conflict: ${file}; no overwrite attempted`);
		}
		copies.set(file, data);
	}
	await requireIgnored(target, runtimeDirectory(target), signal);
	await requireIgnored(target, join(target, ".trellis/.runtime/sessions"), signal);
	if (!containsPath(target, canonicalPath(join(target, ".trellis/.runtime/sessions")))) throw new Error("Target sessions runtime cannot symlink outside worktree");
	if (!pathExists(join(target, ".trellis/scripts/task.py"))) throw new Error("Target base has no Trellis scripts; commit the project scaffolding first");
	const hashes = Object.fromEntries([...copies].map(([file, data]) => [file, hash(data)]));
	if (!confirm) return { files: [...copies.keys()], hashes };
	for (const [file, data] of copies) {
		signal?.throwIfAborted();
		const destination = join(target, file);
		if (!containsPath(target, canonicalPath(destination))) throw new Error(`Target changed: ${file}`);
		if (!pathExists(destination)) { mkdirSync(join(destination, ".."), { recursive: true }); writeFileSync(destination, data, { flag: "wx" }); }
		else if (!data.equals(readFileSync(destination))) {
			if (!file.endsWith("/task.json")) throw new Error(`Target changed before copying: ${file}`);
			const expected = JSON.parse(data.toString("utf8")), current = JSON.parse(readFileSync(destination, "utf8"));
			delete expected.branch; delete current.branch;
			if (JSON.stringify(expected) !== JSON.stringify(current)) throw new Error(`Target task changed before copying: ${file}`);
			writeFileSync(destination, data);
		}
	}
	// This documented CLI writes the target pointer/branch and may run target after_start hooks.
	// The prepare preview explicitly discloses those hooks; no source lifecycle command is run.
	await taskCli(binding, ["start", binding.taskDir], signal);
	await validateReady(binding, signal);
	return { files: [...copies.keys()], hashes };
}
