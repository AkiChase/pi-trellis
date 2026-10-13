import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { randomUUID } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { acquireBindingLock, sameIdentity } from "./bindings.ts";
import { activeExecution, processToken, readExecution, writeExecution, worktreeSnapshot, type ExecutionRecord } from "./executions.ts";
import { queryWorktree } from "./worktree-query.ts";
import { canonicalPath, validateText } from "./config.ts";
import { assembleDispatchPrompt, buildTaskContext, isTrellisRole } from "./task-context.ts";

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
	let shuttingDown = false;
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
		shuttingDown = true;
		off.forEach((unsubscribe) => unsubscribe());
		for (const { binding, record } of owned.values()) {
			try { writeExecution(binding, { ...record, state: "unknown", error: "Host session shut down; verify/stop the provider execution before reuse" }); } catch { /* runtime persists conservative prior lease */ }
		}
		early.clear(); owned.clear();
	});
	pi.registerTool({
		name: "trellis_dispatch", label: "Trellis Dispatch",
		description: "Dispatch (default action) or request provider stop for an approved Trellis task role to its existing ready worktree using the subagent public cwd RPC. Never creates temporary isolation or falls back to source. Returns a real agent ID for get_subagent_result/steer_subagent. Stop uses task only and retains occupancy until terminal evidence. Manage via python3 .trellis/scripts/worktree.py; main agent chooses phases.",
		parameters: { type: "object", properties: { action: { type: "string", enum: ["dispatch", "stop", ""] }, agent: { type: "string", enum: ["trellis-implement", "trellis-check", "trellis-research", ""] }, task: { type: "string" }, prompt: { type: "string" } }, anyOf: [{ properties: { action: { const: "stop" } }, required: ["action"] }, { properties: { action: { enum: ["dispatch", ""] } }, required: ["agent", "prompt"] }], additionalProperties: false } as unknown as Parameters<ExtensionAPI["registerTool"]>[0]["parameters"],
		executionMode: "sequential",
		async execute(_id, input, signal, _update, ctx) {
			if (shuttingDown) throw new Error("Host session shut down; reload before execution");
			const args = { ...(input as { action?: string; agent?: string; task?: string; prompt?: string }) };
			const action = args.action === "" || args.action === undefined ? "dispatch" : args.action;
			if (!["dispatch", "stop"].includes(action)) throw new Error("Unknown execution action");
			for (const key of ["task", "agent", "prompt"] as const) if (args[key] === "") args[key] = undefined;
			if (args.task !== undefined) validateText(args.task, "task");
			if (action === "stop" && (args.agent !== undefined || args.prompt !== undefined)) throw new Error("Stop accepts task only; agent/prompt are dispatch-only fields");
			if (action === "dispatch") {
				if (!isTrellisRole(args.agent)) throw new Error("Unknown Trellis role");
				// Prompt is prose, not a CLI identifier: preserve newlines/tabs.
				if (typeof args.prompt !== "string" || !args.prompt.trim() || args.prompt.includes("\0")) throw new Error("prompt must be non-empty text without NUL");
			}
			const { source, local } = await queryWorktree(ctx.cwd, undefined, false, signal);
			if (canonicalPath(process.cwd()) !== source.root || canonicalPath(ctx.cwd) !== source.root) throw new Error("Dispatch from a Pi host opened at the source project root; provider role discovery/config must not silently fall back to generic agents");
			if (!adapterConfigured(source.root)) throw new Error("Persist pi-trellis in source/user settings (not only a one-shot -e path), so child sessions can load the context adapter");
			const task = args.task ?? local?.taskDir ?? await activeTask(ctx);
			if (!task) throw new Error("No approved active task");
			const { binding: initialBinding } = await queryWorktree(ctx.cwd, task, action === "dispatch", signal);
			if (!initialBinding) throw new Error("No worktree binding; use python3 .trellis/scripts/worktree.py create/prepare first");
			if (action === "stop") {
				const execution = readExecution(initialBinding);
				if (!execution?.agentId) throw new Error("No known agent id; inspect unknown startup before recovery");
				const reply = await rpc(pi, "stop", { agentId: execution.agentId });
				if (!reply.success) throw new Error(reply.error || "Stop failed; lease retained");
				return { content: [{ type: "text", text: "Stop requested through provider. Lease retained until terminal evidence; directory/code preserved." }], details: { agentId: execution.agentId } };
			}
			if (!isTrellisRole(args.agent)) throw new Error("Unknown Trellis role");
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
			const release = acquireBindingLock(source.root);
			try {
				const latest = await queryWorktree(ctx.cwd, task, true, signal);
				if (!latest.binding || !sameIdentity(latest.binding, initialBinding)) throw new Error("Binding changed before dispatch");
				const executionBinding = latest.binding;
				const facts = latest.materials;
				if (!facts || facts.state !== "valid" || !facts.revision || !facts.sourceFingerprint || !facts.targetFingerprint) throw new Error("Python query returned no valid material facts");
				if (activeExecution(executionBinding)) throw new Error("Worktree already has running/unknown execution; do not dispatch concurrently");
				const context = buildTaskContext({ executionRoot: executionBinding.worktreePath, taskDir: task, role: args.agent });
				const prompt = assembleDispatchPrompt({ prompt: `Execution directory: ${executionBinding.worktreePath}\nReview base: ${executionBinding.baseCommit}\n\n${args.prompt}`, taskDir: task, contextId: executionBinding.contextId, role: args.agent, context, materials: { revision: facts.revision, sourceFingerprint: facts.sourceFingerprint, targetFingerprint: facts.targetFingerprint } });
				const final = await queryWorktree(ctx.cwd, task, true, signal);
				if (!final.binding || !sameIdentity(final.binding, executionBinding) || final.materials?.revision !== facts.revision || final.materials?.sourceFingerprint !== facts.sourceFingerprint || final.materials?.targetFingerprint !== facts.targetFingerprint) throw new Error("Materials changed during prompt rendering; inspect and retry dispatch");
				signal?.throwIfAborted();
				if (shuttingDown) throw new Error("Host session shut down before spawn");
				const binding = executionBinding;
				const record: ExecutionRecord = { bindingId: binding.bindingId, requestId: randomUUID(), role: args.agent, state: "starting", ownerPid: process.pid, ownerToken: processToken, createdAt: new Date().toISOString(), materialRevision: facts.revision, sourceFingerprint: facts.sourceFingerprint, targetFingerprint: facts.targetFingerprint };
				writeExecution(binding, record);
				try {
					// No call-time abort forwarded: cancellation of waiting cannot prove the detached child stopped.
					const reply = await rpc(pi, "spawn", { requestId: record.requestId, type: args.agent, prompt, options: { cwd: binding.worktreePath, isolation: "off" } });
					if (!reply.success || typeof reply.data?.id !== "string") throw new Error(reply.error || "Spawn returned no valid agent id");
					record.agentId = reply.data.id;
					if (shuttingDown) throw new Error("Host session shut down during spawn; execution may already exist");
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
