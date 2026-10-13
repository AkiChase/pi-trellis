import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { TaskBrowser } from "./component.ts";

export function registerTaskBrowserCommand(pi: ExtensionAPI, dependencies: {
	findRoot: (cwd: string) => string | undefined;
	currentTask: (root: string, ctx: ExtensionCommandContext) => string | undefined;
}): void {
	pi.registerCommand("trellis-task", {
		description: "Browse Trellis tasks and planning documents (read-only)",
		handler: async (args, ctx) => {
			const notice = (content: string) => {
				if (ctx.hasUI) ctx.ui.notify(content, "info");
				else pi.sendMessage({ customType: "trellis-task-status", content, display: true });
			};
			if (args.trim()) { notice("Usage: /trellis-task — browse tasks without changing them."); return; }
			if (ctx.mode !== "tui") { notice("/trellis-task requires interactive terminal mode. Custom task browsing is unavailable in RPC, print, and JSON modes."); return; }
			const root = dependencies.findRoot(ctx.cwd);
			if (!root) { notice("No Trellis project found. Open /trellis-task inside a project with .trellis/tasks."); return; }
			await ctx.ui.custom<void>((tui, _theme, _keys, done) => new TaskBrowser(
				root, tui, () => ctx.ui.theme, () => done(), () => dependencies.currentTask(root, ctx),
			), { overlay: true, overlayOptions: { width: "100%", maxHeight: "100%", anchor: "top-left", margin: 0 } });
		},
	});
}
