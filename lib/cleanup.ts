import { unlinkSync } from "node:fs";
import { bindingFile, markerFile, type WorktreeBinding } from "./bindings.ts";
import { containsPath } from "./config.ts";
import { activeExecution, executionFile } from "./executions.ts";
import { git, pathExists, resolveBase } from "./worktree.ts";

export async function removeWorktree(binding: WorktreeBinding, cwd: string, integratedInto: string | undefined, confirm: boolean, signal?: AbortSignal): Promise<{ ignored: string; stale: boolean }> {
	if (activeExecution(binding)) throw new Error("Cannot remove a running/unknown execution; stop or explicitly recover it first");
	if (containsPath(binding.worktreePath, cwd)) throw new Error("Cannot remove the current working directory");
	const stale = !pathExists(binding.worktreePath);
	let ignored = "", saved: string | undefined;
	if (!stale) {
		if (await git(binding.worktreePath, ["status", "--porcelain"], signal)) throw new Error("Worktree has staged/unstaged/untracked changes; refusing removal");
		if (!integratedInto) throw new Error("Specify integratedInto: the user-approved reference that preserves the worktree commits");
		const tip = await git(binding.worktreePath, ["rev-parse", "HEAD"], signal);
		saved = await resolveBase(binding.sourceRoot, integratedInto, signal);
		await git(binding.sourceRoot, ["merge-base", "--is-ancestor", tip, saved], signal);
		ignored = await git(binding.worktreePath, ["ls-files", "--others", "--ignored", "--exclude-standard"], signal);
	}
	if (!confirm) return { ignored, stale };
	signal?.throwIfAborted();
	if (!stale) {
		// Recheck immediately before invoking Git; use no --force and never delete the branch.
		if (activeExecution(binding) || await git(binding.worktreePath, ["status", "--porcelain"], signal)) throw new Error("Worktree changed before removal");
		const tip = await git(binding.worktreePath, ["rev-parse", "HEAD"], signal);
		await git(binding.sourceRoot, ["merge-base", "--is-ancestor", tip, saved!], signal);
		await git(binding.sourceRoot, ["worktree", "remove", "--", binding.worktreePath], signal);
	}
	for (const file of [bindingFile(binding.sourceRoot, binding.taskDir), executionFile(binding)]) {
		try { unlinkSync(file); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
	}
	return { ignored, stale };
}
