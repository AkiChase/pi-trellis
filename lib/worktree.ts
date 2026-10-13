import { execFile } from "node:child_process";
import { lstatSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalPath, containsPath, validateText } from "./config.ts";

export async function git(root: string, args: string[], signal?: AbortSignal, allowedCodes = [0]): Promise<string> {
	const env = { ...process.env };
	// A parent shell's repository/index override must never redirect this operation.
	for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
	env.GIT_OPTIONAL_LOCKS = "0";
	return new Promise((done, reject) => {
		execFile("git", ["-C", root, ...args], { env, signal, timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
			if (error && !allowedCodes.includes(Number((error as NodeJS.ErrnoException).code))) {
				reject(new Error(`git ${args[0]} failed: ${String(stderr).trim() || error.message}`));
			} else done(String(stdout).trim());
		});
	});
}

export interface RegisteredWorktree { path: string; head: string; branch: string | null; bare: boolean }
export interface Repository { root: string; commonDir: string; worktrees: RegisteredWorktree[] }

export async function repository(cwd: string, signal?: AbortSignal): Promise<Repository> {
	const root = realpathSync(await git(cwd, ["rev-parse", "--show-toplevel"], signal));
	const commonDir = realpathSync(resolve(root, await git(root, ["rev-parse", "--git-common-dir"], signal)));
	const output = await git(root, ["worktree", "list", "--porcelain", "-z"], signal);
	const worktrees: RegisteredWorktree[] = [];
	let row: RegisteredWorktree | undefined;
	for (const field of output.split("\0")) {
		if (field.startsWith("worktree ")) {
			row = { path: canonicalPath(field.slice(9)), head: "", branch: null, bare: false };
			worktrees.push(row);
		} else if (row && field.startsWith("HEAD ")) row.head = field.slice(5);
		else if (row && field.startsWith("branch refs/heads/")) row.branch = field.slice(18);
		else if (row && field === "bare") row.bare = true;
	}
	return { root, commonDir, worktrees };
}

export async function resolveBase(root: string, base = "HEAD", signal?: AbortSignal): Promise<string> {
	validateText(base, "base");
	const sha = await git(root, ["rev-parse", "--verify", "--end-of-options", `${base}^{commit}`], signal);
	if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error("base did not resolve to a full commit id");
	return sha;
}

export async function validateBranch(root: string, branch: string, signal?: AbortSignal): Promise<void> {
	validateText(branch, "branch");
	if (branch.startsWith("-") || branch.includes("@{") || branch === "HEAD") throw new Error("Invalid branch name");
	await git(root, ["check-ref-format", "--branch", branch], signal);
}

export async function requireIgnored(root: string, path: string, signal?: AbortSignal): Promise<void> {
	if (!containsPath(root, path) || root === path) throw new Error("Ignore check must be beneath the project root");
	const output = await git(root, ["check-ignore", "--", path], signal, [0, 1]);
	if (!output) throw new Error(`Git must ignore ${path}; add an ignore rule explicitly (pi-trellis will not edit .gitignore)`);
	if (await git(root, ["ls-files", "--", path], signal)) throw new Error(`Runtime/managed directory contains tracked files: ${path}`);
}

export function assertDestination(sourceRoot: string, destination: string, registered: RegisteredWorktree[]): void {
	if (containsPath(destination, sourceRoot)) throw new Error("Worktree destination cannot equal the source or contain it");
	for (const tree of registered) {
		if (tree.path === sourceRoot) continue;
		if (containsPath(destination, tree.path) || containsPath(tree.path, destination)) throw new Error(`Destination overlaps registered worktree ${tree.path}`);
	}
}

export function pathExists(path: string): boolean {
	try { lstatSync(path); return true; } catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}
