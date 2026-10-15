import { lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { adoptPlan, applyAdoptPlan, adoptionSummary, adoptionDialog } from "./adoption.ts";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { applyResourcePlan, read, resourcePlan, resourceStatus, templatePlan, applyTemplatePlan, type TemplateScope } from "./resources.ts";
import { initializationRoot } from "../project-state.ts";
import { inspect, plan, apply, checkedPath, packageResources, defaultTemplates, verifyRuntime, validateUsername, type Inspection, type InitPlan } from "./engine.ts";

export const INIT_HELP = "Usage: /trellis-init — no arguments. Choose an operation, Check, Help or Cancel in the native menu.\nInitializes a new project, adopts an existing manifest-less project, or sets up identity on a supported clone. Usernames are selected or entered in the native UI.\nCheck currently reports resource and adoption facts only, not full project or runtime health.\nAll writes require native UI confirmation. Managed resources can be updated without resetting user data. Apply template explicitly replaces selected Workflow/Spec documents with backups. No force, active task selection, hooks, model turn, installation or Git changes.";
const MIGRATION_NOTICE = "/trellis-init no longer accepts arguments (including --user, --check and --help). Run /trellis-init without arguments, then choose an operation, Check or Help. Select or enter the username in the native UI. No inspection or changes were performed.";
const INTERACTION_GUIDE = "/trellis-init requires native interaction. Open /trellis-init without arguments in interactive mode or an RPC client supporting native dialogs, then choose an operation, Check or Help. No inspection or changes were performed.";
const DIALOG_LINES = 14;
// Root/path names may contain line breaks or terminal controls; keep facts on one physical line.
const dialogPath = (value: string) => value.replace(/[\p{C}\p{Zl}\p{Zp}]/gu, char => `\\u{${char.codePointAt(0)!.toString(16)}}`);
/** Core confirmation facts precede optional path examples; only examples may be omitted. */
export function boundedDialog(text: string): string {
	const lines = text.split("\n");
	if (lines.length <= DIALOG_LINES) return text;
	return [...lines.slice(0, DIALOG_LINES - 1), `… ${lines.length - DIALOG_LINES + 1} additional path examples omitted.`].join("\n");
}
export function statusSummary(state: Inspection): string {
	return [`Project: ${dialogPath(state.root)}`, `Status: ${state.state}`, `Developer: ${state.developer ?? "Not set"}`, `Workspace: ${state.developer ? `.trellis/workspace/${state.developer}` : "Not set"}`, `Runtime release: ${state.releaseId}`, ...state.diagnostics].join("\n");
}
function counts(rows: { state: string }[]): string {
	const totals = new Map<string, number>();
	for (const row of rows) totals.set(row.state, (totals.get(row.state) ?? 0) + 1);
	return [...totals].map(([state, count]) => `${state}: ${count}`).join("  ") || "Changes: 0";
}
export function planSummary(value: InitPlan): string {
	return [
		`Project: ${dialogPath(value.root)}`, `Operation: ${value.operation === "initialize" ? "Initialize project" : "Set up developer identity"}`,
		`Scope: ${value.operation === "initialize" ? "Runtime, roles, templates, owned root blocks, identity, workspace and onboarding task" : "Identity, workspace and onboarding task"}`,
		`Developer: ${value.user}`, `Workspace: .trellis/workspace/${value.user} (${value.workspaceReused ? "reuse" : "create"})`,
		`Runtime release: ${value.releaseId}`, `Task: ${value.task} (${value.taskReused ? "reuse" : "create"})`,
		counts(value.actions.map(a => ({ state: a.original ? "Update owned block" : "Create" }))),
		"Existing user bytes, tasks and journals are preserved; only missing files or owned root blocks are written.",
		...(value.operation === "identity" ? ["Runtime, config, spec and workflow remain unchanged."] : []),
		"No active task will be selected. No hooks, model turn, installation or Git actions.",
		"No backups or automatic rollback; partial files are preserved on failure.",
		...value.actions.map(a => `${a.original ? "Update owned block" : "Create"}: ${dialogPath(a.path)}`),
	].join("\n");
}

interface MenuSnapshot { state: Inspection; operations: string[] }
const INITIALIZE = "Initialize project", RETRY = "Retry interrupted initialization", IDENTITY = "Set up developer identity";
const ADOPT = "Adopt existing project", UPDATE = "Update project resources", TEMPLATE = "Apply template";
/** Discovery only: explicit resource/identity paths, no workspace inventory, Python or Git. Not apply authority. */
function menuSnapshot(cwd: string): MenuSnapshot {
	const state: Inspection = { root: resolve(cwd), state: "conflict", workspaces: [], diagnostics: [], releaseId: "Not verified" };
	try {
		state.root = realpathSync(initializationRoot(cwd));
		const root = state.root;
		if (!lstatSync(root).isDirectory() || root === realpathSync(homedir())) throw new Error("Initialization requires a project directory, not HOME");
		const present = (path: string) => {
			try { lstatSync(checkedPath(root, path)); return true; }
			catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
		};
		if (present(".trellis/.runtime/pi-trellis/binding.json")) throw new Error("Manage initialization from the source project, not a managed worktree");
		if (present(".trellis/.runtime/init.lock")) throw new Error("Initialization lock exists; inspect its owner before retrying. It is never removed automatically.");
		// Validate package integrity and local parent routes, even in a fresh project.
		checkedPath(root, ".pi/agents");
		packageResources(); defaultTemplates();
		const manifest = read(root, ".trellis/.pi-trellis.json");
		if (manifest !== undefined && !manifest.length) throw new Error("Managed project manifest is empty; explicit reconciliation is required");
		const operation = read(root, ".trellis/.runtime/init-operation.json");
		if (operation) {
			const record = JSON.parse(operation.toString("utf8"));
			if (record?.schemaVersion === 1 && record.status === "incomplete" && record.plan?.root === root && typeof record.plan.user === "string" && typeof record.plan.releaseId === "string" && Array.isArray(record.completed)) {
				validateUsername(record.plan.user);
				state.state = "incomplete"; state.releaseId = record.plan.releaseId;
				state.diagnostics.push("Interrupted initialization: selection revalidates the recorded operation before retrying.");
				return { state, operations: [RETRY] };
			}
		}
		if (manifest === undefined) {
			// This also rejects invalid/incomplete operation records without executing them.
			verifyRuntime(root);
			state.state = present(".trellis") ? "unsupported" : "fresh";
			if (state.state === "unsupported") state.diagnostics.push("Existing Trellis project has no supported manifest. Adoption requires a separate preview and confirmation.");
			return { state, operations: [state.state === "fresh" ? INITIALIZE : ADOPT] };
		}
		let runtimeError: unknown;
		try { state.manifest = verifyRuntime(root); state.releaseId = state.manifest!.runtimeReleaseId; }
		catch (error) { runtimeError = error; state.diagnostics.push(String(error)); }
		const identity = read(root, ".trellis/.developer");
		if (identity !== undefined) {
			const names = identity.toString("utf8").split(/\r?\n/).filter(line => line.startsWith("name="));
			if (names.length !== 1) throw new Error("Developer identity is malformed");
			state.developer = validateUsername(names[0].slice(5));
			checkedPath(root, `.trellis/workspace/${state.developer}`);
		}
		if (!runtimeError) {
			state.state = state.developer ? "ready" : "supported";
			return { state, operations: state.developer ? [UPDATE, TEMPLATE] : [IDENTITY, TEMPLATE] };
		}
		// Missing/older owned resources may still be safely restored; modified resources never authorize writes.
		const update = resourcePlan(root, "update");
		state.releaseId = update.report.installed;
		return { state, operations: update.report.conflicts.length ? [] : [UPDATE] };
	} catch (error) {
		state.state = "conflict"; state.diagnostics.push(String(error));
		return { state, operations: [] };
	}
}

/** Single read-only Check owner, to be replaced by the diagnostics collector in its own task. */
export function checkProject(cwd: string): string {
	const snapshot = menuSnapshot(cwd), state = snapshot.state;
	const scope = "Check · Resource facts only\nScope: managed resources, template provenance and adoption availability; not full project health. Python/runtime execution, task/worktree readiness and end-to-end diagnostics are not validated by this Check.";
	let facts: string;
	if (state.state === "unsupported") {
		try { facts = adoptionSummary(adoptPlan(state.root)); }
		catch (error) { facts = `Adoption is not available: ${String(error)}`; }
	} else facts = resourceStatus(state.root);
	return `${scope}\n${statusSummary(state)}\n${facts}\nRead-only: no files changed, active task selection, hooks, model turn, refresh or reload.`;
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
async function applyTemplates(ctx: ExtensionCommandContext, root: string, notify: (text: string) => void): Promise<boolean> {
	const scopes: Record<string, TemplateScope> = { "Workflow": "workflow", "Spec": "spec", "Workflow + Spec": "both" };
	const choice = await ctx.ui.select("Apply template · Choose scope", [...Object.keys(scopes), "Cancel"]);
	if (!choice || !Object.hasOwn(scopes, choice)) return false;
	const value = templatePlan(root, scopes[choice]);
	const summary = [
		`Apply template · ${choice}`, `Project: ${dialogPath(root)}`, `Scope: ${choice}`, counts(value.rows),
		"Replace files will be overwritten; backups will be saved under .trellis/.runtime/template-backups/.",
		"Same files will not be written. Other project files, identity, tasks and journals remain unchanged.",
		"No automatic rollback; backups and partial files are preserved on failure.",
		...value.rows.map(row => `${row.state}  ${dialogPath(row.path)}`),
	].join("\n");
	if (await ctx.ui.select(boundedDialog(summary), ["Cancel", "Apply template"]) !== "Apply template") return false;
	const backup = applyTemplatePlan(value);
	notify(`Template applied.${backup ? `\nBackup: ${backup}` : " No files changed."}`);
	return true;
}
export function registerInitCommand(pi: ExtensionAPI, refresh: (ctx: ExtensionCommandContext, root: string) => Promise<void>): void {
	pi.registerCommand("trellis-init", {
		description: "Open Pi Trellis initialization, resource Check and Help menu (no arguments)",
		handler: async (args, ctx) => {
			const notify = (text: string, type: "info" | "error" = "info") => {
				if (ctx.hasUI) ctx.ui.notify(text, type);
				else pi.sendMessage({ customType: "trellis-init-status", content: text, display: true });
			};
			if (args.trim()) { notify(MIGRATION_NOTICE, "error"); return; }
			if (!ctx.hasUI) { notify(INTERACTION_GUIDE); return; }
			try {
				const snapshot = menuSnapshot(ctx.cwd);
				const choice = await ctx.ui.select(boundedDialog(statusSummary(snapshot.state)), [...snapshot.operations, "Check", "Help", "Cancel"]);
				if (choice === "Help") { notify(INIT_HELP); return; }
				if (choice === "Check") { notify(checkProject(ctx.cwd)); return; }
				if (!choice || !snapshot.operations.includes(choice)) return;
				// A menu snapshot cannot authorize publication: inspect and each plan/apply recheck current state.
				const state = inspect(snapshot.state.root);
				if (choice === ADOPT) {
					const value = adoptPlan(state.root);
					if (await ctx.ui.select(adoptionDialog(value), ["Cancel", ADOPT]) !== ADOPT) return;
					const result = applyAdoptPlan(value);
					notify(statusSummary(result) + "\nProject adopted.\n" + value.legacy.slice(0, 256).map(p => `Legacy — left in place: ${p}`).join("\n") + (value.legacy.length > 256 ? `\n${value.legacy.length - 256} additional legacy paths omitted.` : "") + (result.state === "supported" ? "\nNext: /trellis-init to set up developer identity." : ""));
					await refresh(ctx, result.root); await ctx.reload(); return;
				}
				if (choice === TEMPLATE) {
					if (!["ready", "supported"].includes(state.state)) throw new Error(statusSummary(state));
					if (await applyTemplates(ctx, state.root, notify)) await refresh(ctx, state.root);
					return;
				}
				if (choice === UPDATE) {
					const update = resourcePlan(state.root, "update");
					if (update.report.conflicts.length) throw new Error(`Modified managed files are preserved: ${update.report.conflicts.join(", ")}`);
					if (!update.changes.length && update.manifest.runtimeReleaseId === update.report.installed) { notify("Project resources are up to date."); return; }
					const summary = [
						`Project: ${dialogPath(state.root)}`, "Operation: Update project resources", "Scope: manifest-owned resources and unchanged package templates",
						counts(update.changes.map(c => ({ state: c.before ? "Update" : "Restore" }))),
						"Identity, tasks, journals and user-modified documents remain unchanged.",
						"Only unmodified owned resources are replaced; missing resources are restored. No backups or automatic rollback.",
						"Partial files are preserved on failure. No active task selection, hooks, model turn, installation or Git actions.",
						...update.changes.map(c => `${c.before ? "Update" : "Restore"}: ${dialogPath(c.path)}`),
					].join("\n");
					if (await ctx.ui.select(boundedDialog(`Confirm project resource changes\n${summary}`), ["Cancel", UPDATE]) !== UPDATE) return;
					applyResourcePlan(update); notify("Project resources updated."); await refresh(ctx, state.root); await ctx.reload(); return;
				}
				const expected = choice === INITIALIZE ? "fresh" : choice === RETRY ? "incomplete" : "supported";
				if (state.state !== expected) throw new Error(`Project changed or operation unavailable. ${statusSummary(state)}`);
				const user = await chooseUsername(state, ctx);
				if (user === undefined) return;
				const value = plan(state.root, user);
				if (!value) { notify(statusSummary(inspect(state.root)) + "\nAlready ready; no files changed."); return; }
				if (await ctx.ui.select(boundedDialog(`Confirm Pi Trellis initialization\n${planSummary(value)}`), ["Cancel", choice]) !== choice) return;
				const result = apply(value);
				notify(statusSummary(result) + `\nTask: ${value.task} (${value.taskReused ? "reused" : "created"}).\nNo active task selected. Next: /skill:trellis-start; review the task before starting work.`);
				await refresh(ctx, result.root);
				if (value.operation === "initialize") { await ctx.reload(); return; }
			} catch (error) { notify(`Pi Trellis initialization failed: ${String(error)}\nAny partial files are preserved. Run /trellis-init and choose Check before retrying.`, "error"); }
		},
	});
}
