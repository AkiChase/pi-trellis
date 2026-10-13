import { createHash, randomUUID } from "node:crypto";
import { closeSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalPath, containsPath, taskSlug } from "./config.ts";

export interface WorktreeBinding {
	version: 1;
	bindingId: string;
	taskDir: string;
	sourceRoot: string;
	worktreePath: string;
	repositoryIdentity: string;
	branch: string;
	baseCommit: string;
	contextId: string;
	preparationState: "creating" | "unprepared" | "preparing" | "ready" | "error";
	preparedFiles?: Record<string, string>;
	materials?: { version: 1; revision: string; snapshotId: string };
	createdAt: string;
	lastError?: string;
}

export function runtimeDirectory(root: string): string {
	root = canonicalPath(root);
	const path = join(root, ".trellis", ".runtime", "pi-trellis");
	if (!containsPath(root, canonicalPath(path))) throw new Error("pi-trellis runtime cannot symlink outside the project");
	return path;
}

export function bindingFile(root: string, taskDir: string): string {
	taskSlug(taskDir);
	const directory = runtimeDirectory(root);
	const file = join(directory, "bindings", `${createHash("sha256").update(taskDir).digest("hex")}.json`);
	if (!containsPath(directory, canonicalPath(file))) throw new Error("Binding file cannot symlink outside pi-trellis runtime");
	return file;
}

export function markerFile(root: string): string { return join(runtimeDirectory(root), "binding.json"); }

export function parseBinding(value: unknown): WorktreeBinding {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid worktree binding");
	const b = value as WorktreeBinding;
	if (b.version !== 1 || !["creating", "unprepared", "preparing", "ready", "error"].includes(b.preparationState)) throw new Error("Unsupported worktree binding version/state");
	for (const key of ["bindingId", "taskDir", "sourceRoot", "worktreePath", "repositoryIdentity", "branch", "baseCommit", "contextId", "createdAt"] as const) {
		if (typeof b[key] !== "string" || !b[key] || /[\0\r\n]/.test(b[key])) throw new Error(`Invalid binding ${key}`);
	}
	taskSlug(b.taskDir);
	if (!/^[a-f0-9]{40,64}$/.test(b.baseCommit) || !/^[A-Za-z0-9_-]+$/.test(b.contextId) || !/^[A-Za-z0-9-]+$/.test(b.bindingId)) throw new Error("Invalid binding base/context/binding id");
	for (const key of ["sourceRoot", "worktreePath", "repositoryIdentity"] as const) {
		if (canonicalPath(b[key]) !== b[key]) throw new Error(`Binding ${key} must be a canonical absolute path`);
	}
	if (b.materials !== undefined) {
		const m = b.materials;
		if (!m || m.version !== 1 || Object.keys(m).sort().join(",") !== "revision,snapshotId,version" || ![m.revision, m.snapshotId].every((v) => typeof v === "string" && /^[A-Za-z0-9-]{1,80}$/.test(v))) throw new Error("Invalid material descriptor");
	}
	return b;
}

function readRecord(file: string): WorktreeBinding | undefined {
	try {
		const stat = lstatSync(file);
		if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error(`Binding must be a regular file under 1 MiB: ${file}`);
		return parseBinding(JSON.parse(readFileSync(file, "utf8")));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}
export function readBinding(root: string, taskDir: string): WorktreeBinding | undefined { return readRecord(bindingFile(root, taskDir)); }
export function readMarker(root: string): WorktreeBinding | undefined { return readRecord(markerFile(root)); }

export function atomicJson(file: string, value: unknown): void {
	const requireRegular = () => {
		try { if (!lstatSync(file).isFile()) throw new Error(`Record must be a local regular file: ${file}`); }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
	};
	requireRegular();
	const parent = join(file, "..");
	mkdirSync(parent, { recursive: true });
	const temp = join(parent, `.binding-${randomUUID()}.tmp`);
	try {
		writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
		requireRegular();
		renameSync(temp, file);
	} finally {
		try { unlinkSync(temp); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
	}
}

export function atomicRecord(file: string, value: WorktreeBinding): void { atomicJson(file, value); }

/** Immutable identity survives a failed two-record publication; mutable preparation state is authoritative at source. */
export function sameIdentity(a: WorktreeBinding, b: WorktreeBinding): boolean {
	return ["version", "bindingId", "taskDir", "sourceRoot", "worktreePath", "repositoryIdentity", "branch", "baseCommit", "contextId", "createdAt"].every((key) => a[key as keyof WorktreeBinding] === b[key as keyof WorktreeBinding]);
}

/** One source-project lock serializes path/branch reservations across distinct tasks. No stale lock guessing. */
export function acquireBindingLock(root: string): () => void {
	const directory = runtimeDirectory(root);
	mkdirSync(directory, { recursive: true });
	const file = join(directory, "worktrees.lock");
	let fd: number;
	try { fd = openSync(file, "wx", 0o600); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Worktree operation already locked; inspect ${file} before explicitly recovering a stale lock`);
		throw error;
	}
	try { writeFileSync(fd, `${JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() })}\n`); }
	catch (error) { closeSync(fd); unlinkSync(file); throw error; }
	return () => { closeSync(fd); unlinkSync(file); };
}
