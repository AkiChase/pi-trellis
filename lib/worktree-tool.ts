import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { manageWorktree, type WorktreePlan } from "./worktree-manager.ts";
import { rpc } from "./subagent-rpc.ts";
import { sourceFor } from "./worktree-manager.ts";
import { readBinding } from "./bindings.ts";
import { readExecution } from "./executions.ts";

// Plain JSON Schema accepted by Pi's TypeBox validation; no runtime SDK imports needed.
const parameters = {
	type: "object", additionalProperties: false,
	properties: {
		action: { type: "string", enum: ["create", "bind", "status", "prepare", "remove", "recover", "stop"], description: "Manage task worktree creation, preparation, status and explicitly confirmed cleanup/recovery." },
		task: { type: "string", description: "Existing .trellis/tasks/<full slug>; defaults to current active task when available." },
		path: { type: "string", description: "bind only: existing registered worktree, absolute or relative to source root." },
		base: { type: "string", description: "Fixed base reference: default source HEAD for create, target HEAD for bind." },
		branch: { type: "string", description: "create branch (default trellis/<task slug>); for bind must match target branch." },
		integratedInto: { type: "string", description: "remove: user-approved reference preserving the worktree commits." },
		confirm: { type: "boolean", description: "Only set true after user approval of the preview. Otherwise create/bind is read-only." },
	}, required: ["action"],
} as unknown as Parameters<ExtensionAPI["registerTool"]>[0]["parameters"];

function describe(plan: WorktreePlan): string {
	return `${plan.action}: ${plan.taskDir}\nSource: ${plan.sourceRoot}\nWorktree: ${plan.worktreePath}\nBranch: ${plan.branch}\nBase: ${plan.baseCommit}\n${plan.note}`;
}

export function registerWorktreeTool(pi: ExtensionAPI, activeTask: (ctx: ExtensionContext) => Promise<string | undefined>): void {
	pi.registerTool({
		name: "trellis_worktree", label: "Trellis Worktree",
		description: "Manage a persistent task worktree. create/bind leave unprepared; prepare copies only selected task material and runs target Trellis start (including configured hooks), then validates ready. remove requires clean files and user-approved integratedInto; recover only releases dead-owner execution. Preview first, confirm only after approval. No automatic phases, commits, or branch deletion.",
		parameters, executionMode: "sequential",
		async execute(_id, params, signal, onUpdate, ctx) {
			const input = params as { action: import("./worktree-manager.ts").WorktreeRequest["action"]; task?: string; path?: string; base?: string; branch?: string; integratedInto?: string; confirm?: boolean };
			const task = input.task ?? await activeTask(ctx);
			if ((input.action as string) === "stop") {
				const { source, local } = await sourceFor(ctx.cwd, signal);
				const binding = readBinding(source.root, task ?? local?.taskDir ?? "");
				if (!binding) throw new Error("No worktree binding");
				const execution = readExecution(binding);
				if (!execution?.agentId) throw new Error("No known agent id; inspect unknown startup before recovery");
				const reply = await rpc(pi, "stop", { agentId: execution.agentId });
				if (!reply.success) throw new Error(reply.error || "Stop failed; lease retained");
				return { content: [{ type: "text", text: "Stop requested through provider. Directory/code retained; status remains occupied until the terminal event is observed." }], details: { agentId: execution.agentId } };
			}
			const result = await manageWorktree({ ...input, task, cwd: ctx.cwd, signal,
				onPlan: (plan) => onUpdate?.({ content: [{ type: "text", text: describe(plan) }], details: { plan } }),
			});
			return {
				content: [{ type: "text", text: [result.plan ? describe(result.plan) : "", JSON.stringify(result, null, 2)].filter(Boolean).join("\n\n") }],
				details: result,
			};
		},
	});
}
