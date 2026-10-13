import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { acquireBindingLock, atomicRecord, bindingFile, markerFile, readBinding, readMarker, runtimeDirectory, sameIdentity, type WorktreeBinding } from "./bindings.ts";
import { prepareWorktree, validateReady } from "./preparation.ts";
import { activeExecution, ownerAlive, readExecution, writeExecution, worktreeSnapshot } from "./executions.ts";
import { removeWorktree } from "./cleanup.ts";
import { canonicalPath, containsPath, taskSlug, validateText, worktreeDirectory } from "./config.ts";
import { readTaskRecord } from "./task-context.ts";
import { assertDestination, git, pathExists, repository, requireIgnored, resolveBase, validateBranch, type Repository } from "./worktree.ts";

export interface WorktreeRequest {
	action: "create" | "bind" | "status" | "prepare" | "remove" | "recover";
	integratedInto?: string;
	cwd: string;
	task?: string;
	path?: string;
	base?: string;
	branch?: string;
	confirm?: boolean;
	signal?: AbortSignal;
	onPlan?: (plan: WorktreePlan) => void;
}
export interface WorktreePlan {
	action: "create" | "bind";
	taskDir: string;
	sourceRoot: string;
	worktreePath: string;
	branch: string;
	baseCommit: string;
	note: string;
}
export interface WorktreeResult {
	plan?: WorktreePlan;
	binding?: WorktreeBinding;
	preview?: boolean;
	reused?: boolean;
	gitStatus?: string;
	problems?: string[];
	note: string;
}

function sameBinding(a: WorktreeBinding, b: WorktreeBinding): boolean { return sameIdentity(a, b); }

export async function bindingProblems(binding: WorktreeBinding, source: Repository, signal?: AbortSignal): Promise<string[]> {
	const problems: string[] = [];
	try {
		if (binding.sourceRoot !== source.root || binding.repositoryIdentity !== source.commonDir) throw new Error("Source repository identity does not match binding");
		const target = await repository(binding.worktreePath, signal);
		const row = source.worktrees.find((tree) => tree.path === binding.worktreePath);
		if (!row || row.bare || target.root !== binding.worktreePath || target.commonDir !== source.commonDir) throw new Error("Target is not this repository's registered worktree");
		if (row.branch !== binding.branch) throw new Error("Target branch differs from binding");
		const marker = readMarker(binding.worktreePath);
		if (!marker || !sameBinding(marker, binding)) throw new Error("Target marker and source binding differ or marker is missing");
	} catch (error) { problems.push(String(error)); }
	return problems;
}

/** A marker is only a hint: verify against source registration and the authoritative source record. */
export async function sourceFor(cwd: string, signal?: AbortSignal): Promise<{ source: Repository; local?: WorktreeBinding }> {
	const localRepo = await repository(cwd, signal);
	const marker = readMarker(localRepo.root);
	if (marker) {
		const source = await repository(marker.sourceRoot, signal);
		const authoritative = readBinding(source.root, marker.taskDir);
		if (!authoritative || !sameBinding(marker, authoritative)) throw new Error("Untrusted target marker: source binding missing or mismatched");
		const problems = await bindingProblems(authoritative, source, signal);
		if (problems.length) throw new Error(problems.join("; "));
		if (localRepo.root !== marker.worktreePath) throw new Error("Marker is not in its bound worktree");
		return { source, local: authoritative };
	}
	if (localRepo.worktrees[0]?.path !== localRepo.root) throw new Error("Unbound linked worktree: manage tasks from the source project or explicitly bind this directory there");
	return { source: localRepo };
}

/** W1 only: create/bind leaves unprepared. Never starts a task, dispatches, installs, commits, or removes. */
export async function manageWorktree(request: WorktreeRequest): Promise<WorktreeResult> {
	if (!["create", "bind", "status", "prepare", "remove", "recover"].includes(request.action)) throw new Error("Unsupported worktree action");
	request.signal?.throwIfAborted();
	const { source, local } = await sourceFor(request.cwd, request.signal);
	const taskDir = request.task ?? local?.taskDir;
	if (!taskDir) throw new Error("Specify an existing task or select an active task; no task is created automatically");
	taskSlug(taskDir);
	let binding = readBinding(source.root, taskDir);
	if (binding && (binding.sourceRoot !== source.root || binding.repositoryIdentity !== source.commonDir || binding.taskDir !== taskDir)) throw new Error("Authoritative binding identity does not match source/task");
	if (request.action === "status") {
		if (!binding) return { note: "No worktree binding for this task." };
		const problems = await bindingProblems(binding, source, request.signal);
		let gitStatus: string | undefined;
		if (!problems.length) gitStatus = await git(binding.worktreePath, ["status", "--short"], request.signal);
		const execution = readExecution(binding);
		let verification = "not verified";
		if (execution?.role === "trellis-check" && execution.state === "completed") {
			try { verification = execution.finalSnapshot && execution.finalSnapshot === worktreeSnapshot(binding) ? "check ended on current snapshot (inspect its report; not automatic acceptance)" : "check snapshot stale or unavailable"; } catch { verification = "check snapshot unavailable"; }
		}
		return { binding, problems, gitStatus, note: `Preparation: ${binding.preparationState}. Execution: ${execution?.state ?? "none"}. ${verification}.` };
	}
	if (["prepare", "remove", "recover"].includes(request.action)) {
		if (!binding) throw new Error("Task has no worktree binding; create or bind first");
		const problems = await bindingProblems(binding, source, request.signal);
		if (request.action !== "remove" && request.action !== "recover" && problems.length) throw new Error(problems.join("; "));
		if (request.action === "recover") {
			const target = await repository(binding.worktreePath, request.signal);
			if (target.root !== binding.worktreePath || target.commonDir !== binding.repositoryIdentity || !target.worktrees.some((tree) => tree.path === binding!.worktreePath && tree.branch === binding!.branch)) throw new Error("Cannot recover a missing or changed worktree identity");
		}
		if (request.action === "remove" && problems.length && pathExists(binding.worktreePath)) throw new Error(problems.join("; "));
		if (request.action === "recover") {
			const record = readExecution(binding);
			if (record && activeExecution(binding) && ownerAlive(record)) throw new Error("Execution owner process is still alive; stop through the provider instead of releasing its lease");
			if (!request.confirm) return { binding, preview: true, note: "Recovery resets the preparation to unprepared and releases only a dead-owner execution; no files are overwritten." };
			const release = acquireBindingLock(source.root);
			try {
				if (record && activeExecution(binding)) {
					const latest = readExecution(binding)!;
					if (ownerAlive(latest)) throw new Error("Execution owner is alive; cannot recover lease");
				}
				if (record) writeExecution(binding, { ...record, state: "stopped", error: "Explicit recovery after owner process exited" });
				binding.preparationState = "unprepared"; delete binding.lastError;
				atomicRecord(markerFile(binding.worktreePath), binding); atomicRecord(bindingFile(source.root, taskDir), binding);
				return { binding, note: "Recovered to unprepared; run prepare before dispatch." };
			} finally { release(); }
		}
		if (activeExecution(binding)) throw new Error("Task worktree has an active/unknown execution");
		if (request.action === "remove") {
			const release = request.confirm ? acquireBindingLock(source.root) : () => {};
			try {
				const fresh = await repository(source.root, request.signal);
				const currentProblems = await bindingProblems(binding, fresh, request.signal);
				if (currentProblems.length && pathExists(binding.worktreePath)) throw new Error(currentProblems.join("; "));
				const result = await removeWorktree(binding, canonicalPath(request.cwd), request.integratedInto, !!request.confirm, request.signal);
				return { binding, preview: !request.confirm, note: `${request.confirm ? "Removed/unbound" : "Removal preview"}. Ignored files at risk:\n${result.ignored || "(none)"}. No branch deleted.` };
			} finally { release(); }
		}
		if (binding.preparationState === "ready") { await validateReady(binding, request.signal); return { binding, reused: true, note: "Already prepared; current target context validated." }; }
		if (["error", "creating", "preparing"].includes(binding.preparationState)) throw new Error("Preparation state requires explicit recover first");
		const preview = await prepareWorktree(binding, false, request.signal);
		if (!request.confirm) return { binding, preview: true, note: `Copy selected task materials: ${preview.files.join(", ")}. Runs target task.py start (records branch, runs configured after_start hooks). Source task must already be in_progress; source lifecycle is unchanged.` };
		const release = acquireBindingLock(source.root);
		try {
			if (activeExecution(binding)) throw new Error("Execution appeared before preparation");
			const currentProblems = await bindingProblems(binding, await repository(source.root, request.signal), request.signal);
			if (currentProblems.length) throw new Error(currentProblems.join("; "));
			binding.preparationState = "preparing"; binding.preparedFiles = preview.hashes; atomicRecord(bindingFile(source.root, taskDir), binding);
			try {
				const prepared = await prepareWorktree(binding, true, request.signal);
				binding.preparationState = "ready"; binding.preparedFiles = prepared.hashes; delete binding.lastError;
			} catch (error) { binding.preparationState = "error"; binding.lastError = String(error); throw error; }
			finally { atomicRecord(bindingFile(source.root, taskDir), binding); atomicRecord(markerFile(binding.worktreePath), binding); }
			return { binding, note: "Ready: task materials and independent target context validated. No agent dispatched." };
		} finally { release(); }
	}
	// Config intentionally affects only new creates; it cannot break status or reuse of an absolute binding.
	if (binding) {
		const problems = await bindingProblems(binding, source, request.signal);
		if (problems.length) throw new Error(problems.join("; "));
		if (request.path !== undefined && canonicalPath(resolve(source.root, request.path)) !== binding.worktreePath) throw new Error("Task already bound to a different path");
		if (request.branch !== undefined && request.branch !== binding.branch) throw new Error("Task already bound to a different branch");
		if (request.base !== undefined && await resolveBase(source.root, request.base, request.signal) !== binding.baseCommit) throw new Error("Task already bound to a different base commit");
		if (["error", "creating", "preparing"].includes(binding.preparationState)) throw new Error("Binding requires explicit recover before reuse");
		return { binding, reused: true, note: `Existing worktree reused after identity validation; ${binding.preparationState}.` };
	}
	if (request.action !== "create" && request.action !== "bind") throw new Error("Unsupported management action");
	readTaskRecord(source.root, taskDir);
	let destination: string;
	if (request.action === "bind") {
		validateText(request.path, "path for bind");
		const path = resolve(source.root, request.path);
		if (!pathExists(path)) throw new Error("Worktree to bind does not exist");
		destination = canonicalPath(path);
	} else {
		if (request.path !== undefined) throw new Error("Create uses worktree.directory plus the task slug, not an arbitrary path");
		const directory = worktreeDirectory(source.root);
		if (containsPath(directory, source.root)) throw new Error("Managed directory cannot equal or contain the source root");
		destination = canonicalPath(join(directory, taskSlug(taskDir)));
	}
	if (containsPath(destination, source.root)) throw new Error("Destination cannot equal the source or contain it");
	if ([source.commonDir, join(source.root, ".trellis"), join(source.root, ".pi")].some((directory) => containsPath(directory, destination))) {
		throw new Error("Worktree destination cannot be inside Git/Trellis/Pi metadata directories");
	}
	const targetRow = source.worktrees.find((tree) => tree.path === destination);
	if (request.action === "bind") {
		const target = await repository(destination, request.signal);
		if (!targetRow || target.root !== destination || target.commonDir !== source.commonDir || targetRow.bare || !targetRow.branch) throw new Error("Bind requires a branch-backed registered Git worktree of this repository");
		if (readMarker(destination)) throw new Error("Destination already contains a binding marker");
		assertDestination(source.root, destination, source.worktrees.filter((tree) => tree.path !== destination));
	} else {
		assertDestination(source.root, destination, source.worktrees);
		if (pathExists(destination)) throw new Error(`Destination already exists: ${destination}; nothing will be overwritten`);
	}
	const branch = request.branch ?? (request.action === "bind" ? targetRow!.branch! : `trellis/${taskSlug(taskDir)}`);
	await validateBranch(source.root, branch, request.signal);
	if (request.action === "bind" && branch !== targetRow!.branch) throw new Error("Requested branch does not match the existing worktree");
	if (request.action === "create" && (await git(source.root, ["for-each-ref", "--format=%(refname)", `refs/heads/${branch}`], request.signal)).split("\n").includes(`refs/heads/${branch}`)) {
		throw new Error(`Branch already exists: ${branch}; bind its existing worktree explicitly`);
	}
	const baseCommit = await resolveBase(source.root, request.base ?? (request.action === "bind" ? targetRow!.head : "HEAD"), request.signal);
	const plan: WorktreePlan = { action: request.action, taskDir, sourceRoot: source.root, worktreePath: destination, branch, baseCommit, note: "No staged, unstaged or untracked source changes are copied. W1 leaves the binding unprepared; no task/agent is started." };
	await requireIgnored(source.root, runtimeDirectory(source.root), request.signal);
	if (containsPath(source.root, destination)) await requireIgnored(source.root, destination, request.signal);
	if (request.action === "bind") await requireIgnored(destination, runtimeDirectory(destination), request.signal);
	if (!request.confirm) return { plan, preview: true, note: "Preview only. Repeat with confirm:true after user authorization to create/bind." };
	request.onPlan?.(plan);
	const release = acquireBindingLock(source.root);
	try {
		request.signal?.throwIfAborted();
		if (readBinding(source.root, taskDir)) throw new Error("Task was bound by another operation; query status and retry");
		readTaskRecord(source.root, taskDir);
		if (canonicalPath(destination) !== destination) throw new Error("Destination parent changed through a symlink; inspect and retry");
		await requireIgnored(source.root, runtimeDirectory(source.root), request.signal);
		if (containsPath(source.root, destination)) await requireIgnored(source.root, destination, request.signal);
		const fresh = await repository(source.root, request.signal);
		if (request.action === "create") {
			assertDestination(source.root, destination, fresh.worktrees);
			if (pathExists(destination)) throw new Error("Destination appeared before creation; refusing to overwrite");
		} else if (!fresh.worktrees.some((tree) => tree.path === destination && tree.branch === branch)) throw new Error("Worktree changed before binding");
		const id = randomUUID();
		binding = { version: 1, bindingId: id, taskDir, sourceRoot: source.root, worktreePath: destination, repositoryIdentity: source.commonDir, branch, baseCommit, contextId: `pi-wt-${id}`, preparationState: "creating", createdAt: new Date().toISOString() };
		atomicRecord(bindingFile(source.root, taskDir), binding);
		try {
			if (request.action === "create") {
				mkdirSync(join(destination, ".."), { recursive: true });
				await git(source.root, ["worktree", "add", "-b", branch, "--", destination, baseCommit], request.signal);
			}
			const target = await repository(destination, request.signal);
			const actual = target.worktrees.find((tree) => tree.path === destination);
			if (target.root !== destination || target.commonDir !== source.commonDir || actual?.branch !== branch) throw new Error("Created/bound worktree identity does not match plan");
			if (request.action === "create" && actual.head !== baseCommit) throw new Error("Created worktree is not at the pinned base commit");
			await requireIgnored(destination, runtimeDirectory(destination), request.signal);
			if (readMarker(destination)) throw new Error("Target marker appeared during creation/bind");
			request.signal?.throwIfAborted();
			binding.preparationState = "unprepared";
			atomicRecord(markerFile(destination), binding);
			atomicRecord(bindingFile(source.root, taskDir), binding);
		} catch (error) {
			binding.preparationState = "error";
			binding.lastError = String(error);
			atomicRecord(bindingFile(source.root, taskDir), binding);
			throw new Error(`${String(error)}. Directory/branch and error record were retained; no cleanup was attempted.`);
		}
		return { plan, binding, note: "Worktree is bound but unprepared. Use prepare to copy selected task materials and validate independent context, then trellis_dispatch." };
	} finally { release(); }
}
