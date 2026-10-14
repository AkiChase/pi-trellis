import { DefaultPackageManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalPath } from "./config.ts";
import { packageRoot } from "./initialization/engine.ts";

/** Use Pi's real package identity, project precedence and delta filters. Missing sources never install. */
export async function adapterConfigured(sourceRoot: string): Promise<boolean> {
	const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi/agent");
	const settingsManager = SettingsManager.create(sourceRoot, agentDir, { projectTrusted: true });
	if (settingsManager.drainErrors().length) throw new Error("Pi resource settings are unreadable or invalid");
	const manager = new DefaultPackageManager({ cwd: sourceRoot, agentDir, settingsManager });
	const resources = await manager.resolve(async () => "skip");
	const adapter = canonicalPath(join(packageRoot, "extensions/trellis.ts"));
	return resources.extensions.some(resource => resource.enabled && canonicalPath(resource.path) === adapter && resource.metadata.scope !== "temporary");
}

/** Discover this package's conditional skills through Pi's public filter resolver.
 * Virtual defaults never persist settings or install a missing source.
 */
export async function projectSkillPaths(cwd: string, projectTrusted: boolean, agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi/agent")): Promise<string[]> {
	const actual = SettingsManager.create(cwd, agentDir, { projectTrusted });
	if (actual.drainErrors().length) throw new Error("Pi resource settings are unreadable or invalid");
	const manager = new DefaultPackageManager({ cwd, agentDir, settingsManager: actual });
	const own = manager.listConfiguredPackages().filter(entry => entry.installedPath && canonicalPath(entry.installedPath) === canonicalPath(packageRoot));
	// Local source strings are relative to their scope. An identical spelling in
	// the other scope may name a different package and must keep its defaults.
	const sources = new Set(own.map(entry => `${entry.scope}\0${entry.source}`));
	if (!sources.size) {
		return readdirSync(join(packageRoot, "skills"), { withFileTypes: true })
			.filter(entry => entry.isDirectory())
			.map(entry => join(packageRoot, "skills", entry.name, "SKILL.md"))
			.filter(path => existsSync(path));
	}
	const defaults = (settings: ReturnType<SettingsManager["getSettings"]>, scope: "user" | "project") => ({
		...settings,
		packages: settings.packages?.map(entry => {
			const source = typeof entry === "string" ? entry : entry.source;
			if (!sources.has(`${scope}\0${source}`)) return entry;
			if (typeof entry === "string") return { source: entry, skills: ["skills/**/SKILL.md"] };
			return entry.autoload === false || entry.skills !== undefined ? entry : { ...entry, skills: ["skills/**/SKILL.md"] };
		}),
	});
	const global = defaults(actual.getGlobalSettings(), "user"), project = defaults(actual.getProjectSettings(), "project");
	const virtual = SettingsManager.fromStorage({ withLock(scope, fn) { fn(JSON.stringify(scope === "global" ? global : project)); } }, { projectTrusted });
	const resources = await new DefaultPackageManager({ cwd, agentDir, settingsManager: virtual }).resolve(async () => "skip");
	return resources.skills.filter(resource => resource.enabled && resource.metadata.packageRoot && canonicalPath(resource.metadata.packageRoot) === canonicalPath(packageRoot)).map(resource => resource.path);
}
