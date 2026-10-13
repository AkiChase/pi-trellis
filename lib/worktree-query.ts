import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorktreeBinding } from "./bindings.ts";

export interface MaterialSummary {
	state: "valid" | "invalid"; revision?: string; sourceFingerprint?: string; targetFingerprint?: string;
	sourceDrift?: { count: number; paths: string[]; omitted: number };
	conflicts?: { count: number; paths: string[]; omitted: number };
}
interface WorktreeQuery {
	ok: true;
	source: { root: string; commonDir: string };
	local?: WorktreeBinding;
	binding?: WorktreeBinding;
	materials?: MaterialSummary;
}

/** Python owns Git identity and readiness. Read-only even inside the host source lock. */
export function queryWorktree(cwd: string, task?: string, ready = false, signal?: AbortSignal): Promise<WorktreeQuery> {
	const script = join(dirname(dirname(fileURLToPath(import.meta.url))), "python/query-worktree.py");
	const args = ["-B", script, "--cwd", cwd];
	if (task !== undefined) args.push("--task", task);
	if (ready) args.push("--ready");
	return new Promise((done, reject) => execFile(process.env.TRELLIS_PYTHON || (process.platform === "win32" ? "python" : "python3"), args, {
		cwd, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, signal, timeout: 30000, maxBuffer: 1024 * 1024,
	}, (error, stdout, stderr) => {
		try {
			const result = JSON.parse(String(stdout));
			if (error || !result?.ok) throw new Error(result?.error || String(stderr).trim() || error?.message || "Worktree query failed");
			if (typeof result.source?.root !== "string" || typeof result.source?.commonDir !== "string") throw new Error("Invalid Python query result");
			done(result);
		} catch (failure) { reject(new Error(`Native worktree query failed: ${String(stderr).trim() || String(failure)}`)); }
	}));
}
