import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { applyResourcePlan, resourcePlan, resourceStatus } from "./resources.ts";
import { inspect, plan, apply, validateUsername, type Inspection, type InitPlan } from "./engine.ts";

export const INIT_HELP = "Usage: /trellis-init [--user <username>] [--check | --help]\nInitializes a new project or sets up identity on a supported clone.\nAll writes require native UI confirmation. Managed resources can be updated or repaired without resetting user data. No force, active task selection, hooks, install or Git actions.";
export function parseInitArguments(args: string): { user?: string; check: boolean; help: boolean } {
	if (args.length > 4096) throw new Error("Initialization arguments are too long");
	const tokens: string[] = [];
	let token = "", quote = "", active = false, escaped = false;
	for (const char of args) {
		if (escaped) { token += char; escaped = false; active = true; }
		else if (quote === '"' && char === "\\") { escaped = true; }
		else if (quote) { if (char === quote) quote = ""; else token += char; active = true; }
		else if (char === "'" || char === '"') { quote = char; active = true; }
		else if (/\s/.test(char)) { if (active) tokens.push(token); token = ""; active = false; }
		else { token += char; active = true; }
	}
	if (quote || escaped) throw new Error("Unclosed quote in initialization arguments");
	if (active) tokens.push(token);
	const result: { user?: string; check: boolean; help: boolean } = { check: false, help: false };
	const seen = new Set<string>();
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!["--user", "--help", "--check"].includes(token)) throw new Error(`Unknown argument: ${token}. ${INIT_HELP}`);
		if (seen.has(token)) throw new Error(`Repeated argument: ${token}`);
		seen.add(token);
		if (token === "--user") {
			if (tokens[i + 1] === undefined || tokens[i + 1].startsWith("--")) throw new Error("--user requires a username");
			result.user = validateUsername(tokens[++i]);
		} else result[token.slice(2) as "check" | "help"] = true;
	}
	if (result.check && result.help) throw new Error("Choose either --check or --help");
	return result;
}
export function statusSummary(state: Inspection): string {
	return [`Project: ${state.root}`, `Status: ${state.state}`, `Developer: ${state.developer ?? "Not set"}`, `Workspace: ${state.developer ? `.trellis/workspace/${state.developer}` : "Not set"}`, `Runtime release: ${state.releaseId}`, ...state.diagnostics].join("\n");
}
export function planSummary(value: InitPlan): string {
	return [`Project: ${value.root}`, `Operation: ${value.operation === "initialize" ? "Initialize project" : "Set up developer identity"}`, `Developer: ${value.user}`, `Workspace: .trellis/workspace/${value.user} (${value.workspaceReused ? "reuse" : "create"})`, `Runtime release: ${value.releaseId}`, `Task: ${value.task} (${value.taskReused ? "reuse" : "create"})`, "No active task will be selected. No hooks, model turn, installation or Git actions.", ...(value.operation === "identity" ? ["Runtime, config, spec and workflow remain unchanged."] : []), ...value.actions.map(a => `${a.original ? "Update owned block" : "Create"}: ${a.path}`)].join("\n");
}
async function chooseUsername(state: Inspection, ctx: ExtensionCommandContext): Promise<string | undefined> {
	const candidates = new Map(state.workspaces.map(name => [`${name} — Existing workspace`, name]));
	if (state.gitSuggestion) candidates.set(`${state.gitSuggestion} — Suggested from Git`, state.gitSuggestion);
	const custom = "Enter a different username";
	const choice = await ctx.ui.select("Choose developer username", [...candidates.keys(), custom, "Cancel"]);
	if (!choice || choice === "Cancel") return undefined;
	if (candidates.has(choice)) return candidates.get(choice);
	if (choice !== custom) return undefined;
	for (;;) {
		const name = await ctx.ui.input("Enter developer username", "Safe single directory name; Unicode and spaces are allowed");
		if (name === undefined) return undefined;
		try { return validateUsername(name); } catch (error) { ctx.ui.notify(String(error), "error"); }
	}
}
export function registerInitCommand(pi: ExtensionAPI, refresh: (ctx: ExtensionCommandContext, root: string) => Promise<void>): void {
	pi.registerCommand("trellis-init", {
		description: "Initialize Pi Trellis or set up developer identity (with confirmation)",
		getArgumentCompletions: async prefix => {
			try {
				const flags = ["--user", "--check", "--help"];
				if (prefix.startsWith("--user ")) {
					const state = inspect(process.cwd());
					return [...state.workspaces, ...(state.gitSuggestion ? [state.gitSuggestion] : [])].filter(n => n.startsWith(prefix.slice(7))).map(n => ({ value: `--user ${JSON.stringify(n)}`, label: n }));
				}
				return flags.filter(f => f.startsWith(prefix)).map(f => ({ value: f, label: f }));
			} catch { return null; }
		},
		handler: async (args, ctx) => {
			const notify = (text: string, type: "info" | "error" = "info") => {
				if (ctx.hasUI) ctx.ui.notify(text, type);
				else pi.sendMessage({ customType: "trellis-init-status", content: text, display: true });
			};
			try {
				const parsed = parseInitArguments(args);
				if (parsed.help) { notify(INIT_HELP); return; }
				const state = inspect(ctx.cwd);
				if (parsed.check || !ctx.hasUI) { notify(resourceStatus(state.root) + (!ctx.hasUI ? "\nUse /trellis-init in interactive or RPC UI to review and confirm writes." : "")); return; }
				if (state.developer && parsed.user && parsed.user !== state.developer) throw new Error(`Developer conflict: actual ${state.developer}; requested ${parsed.user}. Existing identity preserved.`);
				if (state.state === "unsupported") { notify(resourceStatus(state.root), "error"); return; }
				if (state.state === "ready" && parsed.user) { notify(statusSummary(state) + "\nAlready ready; no files changed."); return; }
				const menu = ["Update project resources", "View project status", "Cancel"];
				if (state.state !== "fresh" && state.state !== "incomplete" && state.state !== "supported") {
					const choice = await ctx.ui.select(statusSummary(state), menu);
					if (choice === "View project status") { notify(resourceStatus(state.root)); return; }
					if (choice === "Update project resources") {
						const update = resourcePlan(state.root, "update");
						if (update.report.conflicts.length) throw new Error(`Modified managed files are preserved: ${update.report.conflicts.join(", ")}`);
						if (!update.changes.length && update.manifest.runtimeReleaseId === update.report.installed) { notify("Project resources are up to date."); return; }
						const summary = [`Project: ${state.root}`, ...update.changes.map(c => `${c.before ? "Update" : "Restore"}: ${c.path}`), "Identity, tasks, journals and user-modified documents remain unchanged."].join("\n");
						if (await ctx.ui.confirm("Confirm project resource changes", summary) !== true) return;
						applyResourcePlan(update); notify("Project resources updated."); await refresh(ctx, state.root); await ctx.reload(); return;
					}
					return;
				}
				if (!["fresh", "supported", "incomplete"].includes(state.state)) { notify(statusSummary(state), "error"); return; }
				const action = state.state === "fresh" ? "Initialize project" : state.state === "incomplete" ? "Retry interrupted initialization" : "Set up developer identity";
				const choice = await ctx.ui.select(statusSummary(state), [action, ...(state.state !== "fresh" ? ["View project status"] : []), "Cancel"]);
				if (choice === "View project status") { notify(resourceStatus(state.root)); return; }
				if (choice !== action) return;
				const user = parsed.user ?? await chooseUsername(state, ctx);
				if (user === undefined) return;
				const value = plan(state.root, user);
				if (!value) { notify(statusSummary(inspect(state.root)) + "\nAlready ready; no files changed."); return; }
				if (await ctx.ui.confirm("Confirm Pi Trellis initialization", planSummary(value)) !== true) return;
				const result = apply(value);
				notify(statusSummary(result) + `\nTask: ${value.task} (${value.taskReused ? "reused" : "created"}).\nNo active task selected. Next: /skill:trellis-start; review the task before starting work.`);
				await refresh(ctx, result.root);
				// Refresh AGENTS context and project role discovery. Reload ends this handler.
				if (value.operation === "initialize") { await ctx.reload(); return; }
			} catch (error) { notify(`Pi Trellis initialization failed: ${String(error)}\nAny partial files are preserved. Run /trellis-init --check before retrying.`, "error"); }
		},
	});
}
