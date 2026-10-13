import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { randomUUID } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { acquireBindingLock, readBinding } from "./bindings.ts";
import { activeExecution, processToken, readExecution, writeExecution, worktreeSnapshot, type ExecutionRecord } from "./executions.ts";
import { sourceFor, bindingProblems } from "./worktree-manager.ts";
import { validateReady } from "./preparation.ts";
import { canonicalPath } from "./config.ts";
import { repository } from "./worktree.ts";
import { assembleDispatchPrompt, buildTaskContext, isTrellisRole, readTaskRecord } from "./task-context.ts";

function adapterConfigured(sourceRoot: string): boolean {
	const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
	const adapter = canonicalPath(join(packageRoot, "extensions/trellis.ts"));
	const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi/agent");
	for (const directory of [join(sourceRoot, ".pi"), agentDir]) {
		let settings: { extensions?: unknown[]; packages?: unknown[] };
		try { settings = JSON.parse(readFileSync(join(directory, "settings.json"), "utf8")); } catch { continue; }
		if (settings.extensions?.some((value) => typeof value === "string" && !value.startsWith("-") && canonicalPath(resolve(directory, value)) === adapter)) return true;
		if (settings.packages?.some((value) => {
			const entry = typeof value === "string" ? { source: value } : value as { source?: string; extensions?: unknown[] };
			if (!entry || typeof entry.source !== "string" || entry.extensions !== undefined) return false;
			return entry.source === "git:github.com/AkiChase/pi-trellis" || entry.source === "npm:pi-trellis" || canonicalPath(resolve(directory, entry.source)) === canonicalPath(packageRoot);
		})) return true;
	}
	return false;
}

interface RpcReply { success: boolean; data?: { id?: string; version?: number }; error?: string }
export function rpc(pi: ExtensionAPI, method: string, payload: Record<string, unknown>, timeout = 15000): Promise<RpcReply> {
	return new Promise((done, reject) => {
		const requestId = typeof payload.requestId === "string" ? payload.requestId : randomUUID();
		const timer = setTimeout(() => { off(); reject(new Error(`Subagent ${method} reply timed out; execution may already exist`)); }, timeout);
		const off = pi.events.on(`subagents:rpc:${method}:reply:${requestId}`, (reply) => { clearTimeout(timer); off(); done(reply as RpcReply); });
		try { pi.events.emit(`subagents:rpc:${method}`, { ...payload, requestId }); } catch (error) { clearTimeout(timer); off(); reject(error); }
	});
}

export function registerDispatchTool(pi: ExtensionAPI, activeTask: (ctx: ExtensionContext) => Promise<string | undefined>): void {
	const owned = new Map<string, { binding: import("./bindings.ts").WorktreeBinding; record: ExecutionRecord }>();
	const early = new Map<string, { state: "completed" | "failed"; error?: string }>();
	const off = ["subagents:completed", "subagents:failed"].map((event) => pi.events.on(event, (data: any) => {
		if (typeof data?.id !== "string") return;
		const state = event === "subagents:completed" ? "completed" : "failed";
		const current = owned.get(data.id);
		if (!current) { if (early.size >= 128) early.delete(early.keys().next().value!); early.set(data.id, { state, error: data.error }); return; }
		try {
			const disk = readExecution(current.binding);
			if (disk?.requestId === current.record.requestId) {
				let finalSnapshot: string | undefined;
				try { finalSnapshot = worktreeSnapshot(current.binding); } catch { /* no snapshot means verification is not current */ }
				writeExecution(current.binding, { ...current.record, state, error: data.error, finalSnapshot });
			}
		} finally { owned.delete(data.id); }
	}));
	pi.on("session_shutdown", () => {
		off.forEach((unsubscribe) => unsubscribe());
		for (const { binding, record } of owned.values()) {
			try { writeExecution(binding, { ...record, state: "unknown", error: "Host session shut down; verify/stop the provider execution before reuse" }); } catch { /* runtime persists conservative prior lease */ }
		}
		early.clear(); owned.clear();
	});
	pi.registerTool({
		name: "trellis_dispatch", label: "Trellis Dispatch",
		description: "Dispatch an approved Trellis task role to its existing ready worktree using the subagent public cwd RPC. Never creates temporary isolation or falls back to source. Returns a real agent ID for get_subagent_result/steer_subagent; main agent chooses subsequent phases.",
		parameters: { type: "object", properties: { agent: { type: "string", enum: ["trellis-implement", "trellis-check", "trellis-research"] }, task: { type: "string" }, prompt: { type: "string" } }, required: ["agent", "prompt"], additionalProperties: false } as unknown as Parameters<ExtensionAPI["registerTool"]>[0]["parameters"],
		executionMode: "sequential",
		async execute(_id, input, signal, _update, ctx) {
			const args = input as { agent: string; task?: string; prompt: string };
			if (!isTrellisRole(args.agent)) throw new Error("Unknown Trellis role");
			const { source, local } = await sourceFor(ctx.cwd, signal);
			if (canonicalPath(process.cwd()) !== source.root || canonicalPath(ctx.cwd) !== source.root) throw new Error("Dispatch from a Pi host opened at the source project root; provider role discovery/config must not silently fall back to generic agents");
			if (!adapterConfigured(source.root)) throw new Error("Persist pi-trellis in source/user settings (not only a one-shot -e path), so child sessions can load the context adapter");
			const task = args.task ?? local?.taskDir ?? await activeTask(ctx);
			if (!task) throw new Error("No approved active task");
			const binding = readBinding(source.root, task);
			if (!binding || binding.preparationState !== "ready") throw new Error("No ready worktree binding; create/bind then prepare first");
			if (readTaskRecord(source.root, task).status !== "in_progress") throw new Error("Source task is not approved/in_progress for managed execution");
			const errors = await bindingProblems(binding, source, signal); if (errors.length) throw new Error(errors.join("; "));
			await validateReady(binding, signal);
			// Preserve custom agents; reject config that would silently defeat cwd/context rather than overwrite it.
			const definition = readFileSync(join(source.root, ".pi/agents", `${args.agent}.md`), "utf8");
			const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(definition)?.[1];
			const name = header && /^name:\s*(.+)$/m.exec(header)?.[1].trim();
			const isolation = header && /^isolation:\s*(.+)$/m.exec(header)?.[1].trim();
			const extensions = header && /^extensions:\s*(.+)$/m.exec(header)?.[1].trim();
			if (!header || name !== args.agent || isolation !== "off" || extensions !== "true" || /^\s*(?:isolated:\s*true|enabled:\s*false)\s*$/m.test(header)) throw new Error("Agent definition disables required context or conflicts with existing-directory execution; require isolation: off and extensions: true (custom file preserved)");
			const tools = header && /^tools:\s*(.+)$/m.exec(header)?.[1].split(",").map((name) => name.trim());
			const required = args.agent === "trellis-research" ? ["read", "write", "bash", "find", "grep"] : ["read", "write", "edit", "bash", "find", "grep"];
			if (!tools || required.some((name) => !tools.includes(name))) throw new Error("Custom agent tool list omits required role capabilities; file is preserved");
			const ping = await rpc(pi, "ping", {}, 3000); if (!ping.success) throw new Error(ping.error || "Subagent provider unavailable");
			const context = buildTaskContext({ executionRoot: binding.worktreePath, taskDir: task, role: args.agent });
			// validateReady checked all references without budget; partial inlining keeps child fallback active.
			const prompt = assembleDispatchPrompt({ prompt: `Execution directory: ${binding.worktreePath}\nReview base: ${binding.baseCommit}\n\n${args.prompt}`, taskDir: task, contextId: binding.contextId, role: args.agent, context });
			const release = acquireBindingLock(source.root);
			try {
				const problems = await bindingProblems(binding, await repository(source.root, signal), signal);
				if (problems.length) throw new Error(problems.join("; "));
				if (readBinding(source.root, task)?.preparationState !== "ready") throw new Error("Preparation state changed before dispatch");
				if (activeExecution(binding)) throw new Error("Worktree already has running/unknown execution; do not dispatch concurrently");
				signal?.throwIfAborted();
				const record: ExecutionRecord = { bindingId: binding.bindingId, requestId: randomUUID(), role: args.agent, state: "starting", ownerPid: process.pid, ownerToken: processToken, createdAt: new Date().toISOString() };
				writeExecution(binding, record);
				try {
					// No call-time abort forwarded: cancellation of waiting cannot prove the detached child stopped.
					const reply = await rpc(pi, "spawn", { requestId: record.requestId, type: args.agent, prompt, options: { cwd: binding.worktreePath, isolation: "off" } });
					if (!reply.success || typeof reply.data?.id !== "string") throw new Error(reply.error || "Spawn returned no valid agent id");
					record.agentId = reply.data.id;
					const finished = early.get(record.agentId!); early.delete(record.agentId!);
					record.state = finished?.state ?? "running"; record.error = finished?.error;
					if (finished) { try { record.finalSnapshot = worktreeSnapshot(binding); } catch { /* unverified snapshot */ } }
					writeExecution(binding, record);
					if (!finished) owned.set(record.agentId!, { binding, record });
					return { content: [{ type: "text", text: `Agent ID: ${record.agentId}\nWorktree: ${binding.worktreePath}\nBinding: ${binding.bindingId}\nUse the existing result/steering tools. No automatic next phase or cleanup.` }], details: { agentId: record.agentId, bindingId: binding.bindingId, cwd: binding.worktreePath } };
				} catch (error) { record.state = "unknown"; record.error = String(error); writeExecution(binding, record); throw error; }
			} finally { release(); }
		},
	});
}
