import { parentPort, workerData } from "node:worker_threads";
import { join } from "node:path";
import { realpathSync } from "node:fs";
import { collectDiagnostics, DiagnosticReader, DIAGNOSTIC_LIMITS, type DiagnosticResult } from "./diagnostics.ts";
import { packageProvenance, verifyRuntime, validateUsername, digest } from "./engine.ts";
import { DIAGNOSTIC_CLOSURE } from "./diagnostic-bootstrap.ts";

const reader = new DiagnosticReader();
const scope = workerData.scope;
let result: DiagnosticResult;
const snapshots = new Map<string, ReturnType<DiagnosticReader["file"]>>();
const routes = new Map<string, { root: string; path: string; limit?: number }>();
const original = reader.file.bind(reader);
reader.file = (root, path, limit, inventory) => { const file = original(root, path, limit, inventory); if (!inventory) { snapshots.set(join(root, path), file); routes.set(join(root, path), { root, path, limit }); } return file; };
const text = (root: string, path: string, error: string | null = null) => {
	const file = snapshots.get(join(root, path));
	return { text: file?.text ?? null, error };
};
const currentError = (id: string) => result.items.find(i => i.id === id && i.status !== "pass" && i.status !== "skipped")?.summary ?? null;
let manifestDigest: string | undefined;
let captured: Record<string, { data: string; sha256: string; mode: number; origin: string; package: boolean }> | undefined;
try {
	result = collectDiagnostics(scope, { reader, scopeError: workerData.scopeError });
	parentPort!.postMessage({ type: "static", result });
	const root = result.scope.executionRoot;
	if (!root || result.facts.project !== "existing") throw Error("No initialized execution root");
	if (workerData.scopeError || !scope.contextId || !/^[A-Za-z0-9_-]{1,128}$/.test(scope.contextId)) throw Error("Explicit current-session scope unavailable");
	if (scope.authorityRoot && scope.authorityRoot !== root || result.facts.managedMarker || currentError("marker") || currentError("authority")) throw Error("Cross-root/managed authority requires S3 native binding identity proof");
	if (currentError("operation")) throw Error("Initialization audit is invalid/incomplete; runtime execution blocked");
	// Execution authority comes ONLY from this shared strict owner. Never runtimeStaticValid.
	const pkg = packageProvenance(reader);
	const manifest = verifyRuntime(root, reader, pkg);
	if (!manifest || !Object.keys(manifest.files).length) throw Error("Nonempty current strict manifest required");
	manifestDigest = digest(JSON.stringify(manifest));
	captured = {};
	for (const [name, path] of Object.entries(DIAGNOSTIC_CLOSURE)) {
		const deployed = `.trellis/scripts/${path}`, expected = manifest.files[deployed];
		if (!expected || expected.kind !== "runtime") throw Error(`Required deployment source missing: ${path}`);
		const source = reader.file(root, deployed, DIAGNOSTIC_LIMITS.file, true);
		if (!source || source.sha256 !== expected.sha256 || source.mode !== expected.mode) throw Error(`Captured deployment source changed: ${path}`);
		captured[name] = { data: source.data.toString("base64"), sha256: source.sha256, mode: source.mode, origin: join(root, deployed), package: path.endsWith("/__init__.py") };
	}
	const taskError = currentError("current-task");
	const pointerSnapshot = text(root, `.trellis/.runtime/sessions/${scope.contextId}.json`);
	let pointerRef: string | undefined;
	try { const value = JSON.parse(pointerSnapshot.text ?? "{}"); if (typeof value?.current_task === "string" && value.current_task) pointerRef = value.current_task; } catch { /* shared consumer retains malformed pointer */ }
	let task = { text: null as string | null, error: pointerRef ? taskError : null };
	let taskStore: string | undefined;
	if (pointerRef) {
		// Only the exact route already authorized/read by the static collector may supply bytes.
		const ref = pointerRef.slice(".trellis/tasks/".length) + "/task.json";
		const entry = [...routes.entries()].find(([, route]) => route.path === ref);
		const file = entry ? snapshots.get(entry[0]) : undefined;
		if (file) {
			taskStore = routes.get(entry![0])!.root;
			if (realpathSync(join(root, ".trellis/tasks")) !== taskStore) throw Error("Source task-store authority changed during capture");
			task = { text: file.text ?? null, error: taskError };
		}
		else if (!task.error) task.error = "Exact task snapshot unavailable";
	}
	let workspace = text(root, `.trellis/workspace/${result.facts.developer}/index.md`, currentError("workspace"));
	if (workerData.developer) {
		try {
			const name = validateUsername(workerData.developer.trim());
			const file = reader.file(root, `.trellis/workspace/${name}/index.md`);
			workspace = { text: file?.text ?? null, error: file?.bytes ? null : "Effective developer workspace index is missing" };
		} catch { workspace = { text: null, error: "Effective developer workspace cannot be safely read" }; }
	}
	const consumerSnapshots = {
		pointer: { ...pointerSnapshot, error: pointerRef ? null : currentError("current-task") },
		task, config: text(root, ".trellis/config.yaml", currentError(`config:${root}:.trellis/config.yaml`)),
		identity: text(root, ".trellis/.developer", currentError("developer")), workflow: text(root, ".trellis/workflow.md", currentError("documents")), workspace,
	};
	parentPort!.postMessage({ type: "capture", root, sources: captured, snapshots: consumerSnapshots, usage: { text: reader.textBytes, inventory: reader.inventoryBytes } });
	parentPort!.on("message", message => {
		if (message?.type !== "recheck") return;
		try {
			if (taskStore && realpathSync(join(root, ".trellis/tasks")) !== taskStore) throw Error("Source task-store authority changed during probe");
			const current = verifyRuntime(root, reader, pkg);
			if (!current || digest(JSON.stringify(current)) !== manifestDigest) throw Error("Runtime/manifest changed during probe");
			for (const [path, before] of snapshots) {
				// Absolute paths are local to previously authorized roots/stores. No new ref discovery.
				const route = routes.get(path)!;
				const after = original(route.root, route.path, route.limit);
				if (before?.sha256 !== after?.sha256 || before?.mode !== after?.mode) throw Error("Consumer snapshot changed during probe");
			}
			parentPort!.postMessage({ type: "rechecked", valid: true, usage: { text: reader.textBytes, inventory: reader.inventoryBytes } });
		} catch (error) { parentPort!.postMessage({ type: "rechecked", valid: false, reason: error instanceof Error ? error.message : "Recheck failed" }); }
	});
} catch (error) {
	parentPort!.postMessage({ type: "blocked", reason: error instanceof Error ? error.message : "Strict execution gate failed", usage: { text: reader.textBytes, inventory: reader.inventoryBytes } });
}
