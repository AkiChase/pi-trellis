import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export function containsPath(root: string, path: string): boolean {
	const rel = relative(root, path);
	return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

/** Resolve existing ancestors, including symlinks, without creating any directory. */
export function canonicalPath(path: string): string {
	let current = resolve(path);
	const suffix: string[] = [];
	for (;;) {
		let exists = true;
		try { lstatSync(current); }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; exists = false; }
		// realpath errors on dangling symlinks must not be treated as a free destination.
		if (exists) return resolve(realpathSync(current), ...suffix.reverse());
		const parent = dirname(current);
		if (parent === current) throw new Error(`No existing ancestor for ${path}`);
		suffix.push(basename(current)); current = parent;
	}
}

export function validateText(value: unknown, label: string): asserts value is string {
	if (typeof value !== "string" || !value.trim() || /[\0\r\n]/.test(value)) throw new Error(`${label} must be a non-empty string without NUL/newlines`);
}

export function taskSlug(taskDir: string): string {
	if (!/^\.trellis\/tasks\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(taskDir)) throw new Error("Task must be .trellis/tasks/<safe full task slug>");
	return taskDir.slice(".trellis/tasks/".length);
}

export function worktreeDirectory(sourceRoot: string): string {
	const file = join(sourceRoot, ".pi", "pi-trellis.json");
	if (!existsSync(file)) return canonicalPath(join(sourceRoot, ".worktree"));
	const config: unknown = JSON.parse(readFileSync(file, "utf8"));
	if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("pi-trellis.json must contain an object");
	const section = (config as Record<string, unknown>).worktree;
	if (section === undefined) return canonicalPath(join(sourceRoot, ".worktree"));
	if (!section || typeof section !== "object" || Array.isArray(section)) throw new Error("worktree config must be an object");
	const directory = (section as Record<string, unknown>).directory;
	if (directory === undefined) return canonicalPath(join(sourceRoot, ".worktree"));
	validateText(directory, "worktree.directory");
	const managed = canonicalPath(resolve(sourceRoot, directory));
	if (containsPath(managed, sourceRoot)) throw new Error("worktree.directory cannot equal or contain the source root");
	return managed;
}
