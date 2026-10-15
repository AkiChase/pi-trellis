// Optional real-host probe. Scripted offline responses, no installation or personal config.
// node tests/provider-contracts.mjs --host <Pi node_modules> (--provider <root> [...] | --preset <root>)
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { randomUUID, createHash } from "node:crypto";

const usage = "Pass --host <Pi node_modules> and either --preset <preset-root> or --provider <package-root> (repeat --provider for isolated probes).";
function parseArgs(args) {
  const options = { providers: [] };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!["--host", "--provider", "--preset"].includes(flag)) throw new Error(`Unknown argument: ${flag}. ${usage}`);
    const value = args[++i];
    if (!value?.trim() || value.startsWith("--")) throw new Error(`Missing value for ${flag}. ${usage}`);
    if (flag === "--provider") options.providers.push(resolve(value));
    else {
      const key = flag.slice(2);
      if (options[key]) throw new Error(`Duplicate ${flag}. ${usage}`);
      options[key] = resolve(value);
    }
  }
  if (!options.host || (!!options.preset === !!options.providers.length)) throw new Error(usage);
  if (new Set(options.providers).size !== options.providers.length) throw new Error("Duplicate --provider path.");
  return options;
}
const options = parseArgs(process.argv.slice(2));
function requirePath(path, directory = false) {
  let stat;
  try { stat = statSync(path); } catch (cause) { throw new Error(`Required ${directory ? "directory" : "file"} unavailable: ${path}`, { cause }); }
  assert.ok(directory ? stat.isDirectory() : stat.isFile(), `Invalid ${directory ? "directory" : "file"}: ${path}`);
  return realpathSync(path);
}
const hostRoot = requirePath(options.host, true);
const repository = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionPath = requirePath(join(repository, "extensions/trellis.ts"));
const aliases = Object.fromEntries(["pi-coding-agent", "pi-ai", "pi-agent-core", "pi-tui"].map(name =>
  [`@earendil-works/${name}`, requirePath(join(hostRoot, `@earendil-works/${name}/dist/index.js`))]));
aliases.typebox = requirePath(join(hostRoot, "typebox/build/index.mjs"));
const jitiPath = requirePath(join(hostRoot, "jiti/lib/jiti.mjs"));
const entries = options.preset
  ? [extensionPath, requirePath(join(options.preset, "extensions/task-composition.ts"))]
  : [extensionPath, ...options.providers.map(root => requirePath(join(root, "src/index.ts")))];
for (const root of options.providers) requirePath(root, true);
const provider = options.preset ? requirePath(join(options.preset, "extensions/agent-tasks"), true) : options.providers[0];
for (const name of ["custom-agents", "agent-types", "agent-runner"]) requirePath(join(provider, `src/${name}.ts`));
const packageVersion = root => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(typeof pkg.version, "string", `Missing version: ${root}`);
  return `${pkg.name ?? "package"}@${pkg.version}`;
};
const hostVersion = packageVersion(join(hostRoot, "@earendil-works/pi-coding-agent"));
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
gitEnv.GIT_OPTIONAL_LOCKS = "0";
const revision = root => {
  try { return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "unavailable (not a Git checkout)"; }
};
// Repeated native implementations do not share module registries, managers or RPC services.
if (options.providers.length > 1) {
  for (const root of options.providers) execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--host", hostRoot, "--provider", root], { stdio: "inherit" });
} else {
  await probe();
}

async function probe() {
  const mode = options.preset ? "preset" : "native-provider";
  console.log(`Probe mode=${mode}; Node ${process.version}; ${hostVersion}; host=${hostRoot}`);
  console.log(`${packageVersion(options.preset ?? provider)}; revision=${revision(options.preset ?? provider)}; provider source=${provider}`);
  console.log(`Trellis revision=${revision(repository)}; entries=${JSON.stringify(entries)}`);
  console.log(`Loaded entry SHA-256=${JSON.stringify(entries.map(path => ({ path, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") })))}`);
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), "pi-trellis-real-probe-")));
  console.log(`Disposable workspace=${workspace}`);
  const agentDir = join(workspace, "config"), root = join(workspace, "project"), target = join(workspace, "target");
  mkdirSync(agentDir); mkdirSync(root);
  const previousEnv = { ...process.env }, originalCwd = process.cwd();
  const sessions = new Set(), cleanups = new Set(), holds = new Set();
  let main, mainShutdown = false, hook, probeFailure;
  const put = (base, path, content) => { mkdirSync(dirname(join(base, path)), { recursive: true }); writeFileSync(join(base, path), content); };
  const log = message => console.log(`${mode}: ${message} PASS`);
  const bounded = async (promise, label, ms = 15000) => {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Probe timeout: ${label}`)), ms); })]); }
    finally { clearTimeout(timer); }
  };
  const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
  };
  const text = result => result.content.filter(block => block.type === "text").map(block => block.text).join("\n");
  const delay = ms => new Promise(done => {
    const cleanup = () => { clearTimeout(timer); cleanups.delete(cleanup); };
    const timer = setTimeout(() => { cleanup(); done(); }, ms);
    cleanups.add(cleanup);
  });
  try {
    // The temporary agent dir is inherited by real child reloads. Do not consult the user's settings/packages.
    for (const key of Object.keys(process.env)) if (key.startsWith("PROCESS_TASKS_") || key === "PI_CODING_AGENT_SESSION_DIR") delete process.env[key];
    process.env.PI_CODING_AGENT_DIR = agentDir;
    const settings = { packages: [], extensions: entries, compaction: { enabled: false }, retry: { enabled: false }, defaultTools: ["read", "write", "edit", "bash", "find", "grep"] };
    put(agentDir, "settings.json", JSON.stringify({ packages: [], compaction: { enabled: false }, retry: { enabled: false } }));
    put(agentDir, "process-tasks.json", JSON.stringify({ logDir: join(workspace, "process-logs") }));
    put(agentDir, "agent-tasks.json", JSON.stringify({ rememberAgents: false, outputTranscript: false, schedulingEnabled: false, workflowsEnabled: true, agentMentions: "off", maxSubagentDepth: 1 }));
    // The direct-TS fixture uses the same installed host, just as host-tui.mjs does.
    hook = registerHooks({ resolve(specifier, context, nextResolve) {
      return nextResolve(aliases[specifier] ? pathToFileURL(aliases[specifier]).href : specifier, context);
    } });
    const { createJiti } = await import(pathToFileURL(jitiPath));
    const jiti = createJiti(import.meta.url, { alias: aliases, moduleCache: true });
    const sdk = await import(pathToFileURL(aliases["@earendil-works/pi-coding-agent"]));
    const { fauxProvider, fauxAssistantMessage, fauxToolCall } = await import(pathToFileURL(join(hostRoot, "@earendil-works/pi-ai/dist/providers/faux.js")));
    const { assembleDispatchPrompt, parseDispatchFacts } = await import("../lib/task-context.ts");
    const { queryWorktree, requireMaterials } = await import("../lib/worktree-query.ts");
    const { installRuntimeFixture } = await import("./runtime-fixture.mjs");
    const runtime = await sdk.ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, refreshOnCreate: false, allowModelNetwork: false });
    const faux = fauxProvider({ provider: "trellis-offline", api: "trellis-offline", models: [{ id: "test", reasoning: false }] });
    runtime.registerNativeProvider(faux.provider);
    const model = faux.getModel(), registry = new sdk.ModelRegistry(runtime);
    function heldResponse() {
      const seen = deferred(), held = deferred();
      const release = (message = fauxAssistantMessage("cleanup response")) => { held.resolve(message); holds.delete(release); };
      holds.add(release);
      return { seen: seen.promise, release, response: context => { seen.resolve(context); return held.promise; } };
    }
    execFileSync("git", ["init", "-q", root], { env: gitEnv });
    const taskDir = ".trellis/tasks/test";
    installRuntimeFixture(root);
    put(root, ".gitignore", "/.trellis/.runtime/\n/.pi/\n");
    put(root, `${taskDir}/task.json`, '{"status":"in_progress"}');
    put(root, `${taskDir}/prd.md`, "SOURCE material");
    for (const role of ["implement", "check"]) put(root, `${taskDir}/${role}.jsonl`, JSON.stringify({ file: `${taskDir}/prd.md` }));
    // Disposable native-authority fixture, not a real project worktree/probe authorization.
    execFileSync("git", ["-C", root, "add", "."], { env: gitEnv });
    execFileSync("git", ["-C", root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "offline fixture"], { env: gitEnv });
    execFileSync("git", ["-C", root, "worktree", "add", "-b", "probe-target", "--", target, "HEAD"], { env: gitEnv });
    const nativeManage = (action, extra = []) => JSON.parse(execFileSync(process.env.TRELLIS_PYTHON || "python3", ["-B", join(repository, "runtime/worktree.py"), action, "--cwd", root, "--task", taskDir, ...extra, "--confirm", "--json"], { env: gitEnv, encoding: "utf8" }));
    const binding = nativeManage("adopt", ["--path", target]).binding;
    nativeManage("prepare", ["--role", "implement"]);
    put(target, `${taskDir}/prd.md`, "STALE execution-checkout body");
    put(target, ".pi/settings.json", JSON.stringify(settings));
    const materialFacts = async role => requireMaterials(await queryWorktree(root, taskDir, false, undefined, false, role));
    const rolePrompt = (materials, workingDir = target) => {
      const prompt = assembleDispatchPrompt({ prompt: "Work only on code.txt; research is explicitly authorized to write the source task research/topic.md. Read all required source materials first.", contextId: workingDir === target ? binding.contextId : "source-probe", role: `trellis-${materials.role}`, materials, executionRoot: workingDir });
      const facts = parseDispatchFacts(prompt);
      assert.equal(facts.sourceRoot, root); assert.equal(facts.materialRoot, root);
      assert.equal(facts.taskPath, join(root, taskDir)); assert.equal(facts.executionRoot, workingDir);
      assert.equal(facts.requirementsFingerprint, materials.sourceFingerprint);
      assert.ok(!prompt.includes("SOURCE material") && !prompt.includes("STALE execution-checkout body"));
      assert.ok(!prompt.includes("<!-- trellis-hook-injected -->"));
      return prompt;
    };
    const sourceReadCalls = materials => {
      const paths = [...new Set([
        ...["prd.md", "design.md", "implement.md"].map(name => join(materials.taskPath, name)).filter(path => materials.artifacts.includes(path)),
        materials.workflowPath, ...(materials.manifest ? [materials.manifest] : []), ...materials.references.map(ref => ref.path),
      ])];
      return paths.map((path, index) => index ? fauxAssistantMessage(fauxToolCall("read", { path })) : context => {
        const initial = JSON.stringify(context);
        assert.ok(initial.includes(materials.taskPath));
        assert.ok(!initial.includes("SOURCE material") && !initial.includes("STALE execution-checkout body"), "source body must only arrive through actual read results");
        return fauxAssistantMessage(fauxToolCall("read", { path }));
      });
    };
    const assertSourceReads = (session, materials) => {
      const results = session.messages.filter(message => message.role === "toolResult" && message.toolName === "read");
      assert.equal(results.length, sourceReadCalls(materials).length);
      assert.ok(results.every(message => !message.isError));
      assert.ok(JSON.stringify(results).includes("SOURCE material"));
      assert.ok(!JSON.stringify(results).includes("STALE execution-checkout body"));
    };
    // .pi is ignored in the committed checkout; seed the three exact published roles
    // in both disposable configs so target runtime validation is genuinely supported.
    for (const role of ["implement", "check", "research"]) {
      const definition = readFileSync(join(repository, `agents/trellis-${role}.md`), "utf8");
      put(root, `.pi/agents/trellis-${role}.md`, definition);
      put(target, `.pi/agents/trellis-${role}.md`, definition);
    }
    put(root, ".pi/settings.json", JSON.stringify(settings));
    put(root, ".pi/extensions/probe.ts", 'import { Type } from "typebox"; export default function(pi) { pi.on("session_start",()=>pi.registerTool({name:"probe_search",description:"Offline search fixture",parameters:Type.Object({}),execute:async()=>({content:[{type:"text",text:"fixture search"}],details:undefined})})); }');
    // Factories discover process.cwd(): the actual host is opened at this disposable source root.
    process.chdir(root);
    const custom = await jiti.import(join(provider, "src/custom-agents.ts"));
    const types = await jiti.import(join(provider, "src/agent-types.ts"));
    const runner = await jiti.import(join(provider, "src/agent-runner.ts"));
    const agents = custom.loadCustomAgents(root, true);
    types.registerAgents(agents); runner.setRememberAgents(false);
    for (const role of ["implement", "check", "research"]) {
      assert.ok(agents.get(`trellis-${role}`).builtinToolNames.includes("write"));
      assert.equal(agents.get(`trellis-${role}`).extensions, true);
      assert.equal(agents.get(`trellis-${role}`).isolation, "off");
    }
    const parent = { cwd: root, model, modelRegistry: registry, sessionManager: sdk.SessionManager.inMemory(root), getSystemPrompt: () => "parent prompt", isProjectTrusted: () => true };
    const pi = { getAllTools: () => [], getActiveTools: () => [] };
    for (const role of ["implement", "check", "research"]) {
      const content = role === "research" ? "persisted findings" : "final code";
      const path = role === "research" ? join(root, taskDir, "research/topic.md") : "code.txt";
      const materials = await materialFacts(role);
      let observed;
      const responses = [...sourceReadCalls(materials), context => { observed = context; return fauxAssistantMessage(fauxToolCall("write", { path, content })); }];
      if (role === "check") {
        responses.push(fauxAssistantMessage(fauxToolCall("edit", { path, oldText: content, newText: "fixed final code" })));
        responses.push(fauxAssistantMessage(fauxToolCall("bash", { command: "test \"$(head -1 code.txt)\" = 'fixed final code'" })));
      }
      if (role === "research") responses.push(fauxAssistantMessage(fauxToolCall("probe_search", {})));
      responses.push(fauxAssistantMessage("done")); faux.setResponses(responses);
      const prompt = rolePrompt(materials);
      const result = await bounded(runner.runAgent(parent, `trellis-${role}`, prompt, {
        pi, cwd: target, configCwd: root, model, maxTurns: 16,
        onSessionOwned: session => sessions.add(session),
        onSessionCreated: session => {
          sessions.add(session);
          const active = session.getActiveToolNames();
          assert.ok(active.includes("write"));
          if (role === "check") assert.ok(active.includes("edit"));
          if (role === "research") assert.ok(active.includes("probe_search"), "late session_start external tool must survive the scope gate");
          if (options.preset) assert.ok(active.includes("task_manage"), "persistent composition must survive child reload");
        },
      }), `runner ${role}`);
      assert.equal(result.failure, undefined);
      assert.equal(readFileSync(role === "research" ? path : join(target, path), "utf8"), role === "check" ? "fixed final code" : content);
      for (const message of result.session.messages.filter(message => message.role === "toolResult")) assert.ok(!message.isError, `${role}: ${message.toolName}: ${JSON.stringify(message.content)}`);
      assertSourceReads(result.session, materials);
      assert.ok(JSON.stringify(observed).includes("SOURCE material"));
      assert.ok(!JSON.stringify(observed).includes("STALE execution-checkout body"));
      await bounded(result.session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" }), `runner ${role} shutdown`);
      result.session.dispose(); sessions.delete(result.session);
    }
    log("real parser/runner + native source authority + absolute source read results + target code cwd/write/edit + authorized source research + late external search + child shutdown");
    // Shared-source checks use a distinct unbound source task, not this target binding.
    const sourceTask = ".trellis/tasks/source";
    put(root, `${sourceTask}/task.json`, '{"status":"in_progress"}');
    put(root, `${sourceTask}/prd.md`, "SOURCE material");
    for (const role of ["implement", "check"]) put(root, `${sourceTask}/${role}.jsonl`, JSON.stringify({ file: `${sourceTask}/prd.md` }));
    const sharedMaterials = requireMaterials(await queryWorktree(root, sourceTask, false, undefined, false, "implement"));
    const bus = sdk.createEventBus();
    const settingsManager = sdk.SettingsManager.create(root, agentDir, { projectTrusted: true });
    const loader = new sdk.DefaultResourceLoader({ cwd: root, agentDir, eventBus: bus, additionalExtensionPaths: entries, noSkills: true, noContextFiles: true, settingsManager });
    await loader.reload(); assert.deepEqual(loader.getExtensions().errors, []);
    ({ session: main } = await sdk.createAgentSession({ cwd: root, agentDir, resourceLoader: loader, modelRuntime: runtime, model, sessionManager: sdk.SessionManager.inMemory(root), settingsManager }));
    await main.bindExtensions({ onError: error => { throw new Error(`${error.extensionPath}: ${error.message}`); } });
    const ctx = main.extensionRunner.createContext();
    const tools = loader.getExtensions().extensions.flatMap(extension => [...extension.tools.values()].map(tool => tool.definition));
    const tool = name => { const matches = tools.filter(tool => tool.name === name); assert.equal(matches.length, 1, `Expected one ${name}`); return matches[0]; };
    const execute = (name, params, signal, update) => bounded(tool(name).execute(`probe-${randomUUID()}`, params, signal, update, ctx), `${name} ${JSON.stringify(params)}`);
    const rpc = (method, payload, ms = 10000) => new Promise((done, reject) => {
      const requestId = `probe-${randomUUID()}`;
      let off = () => {};
      const cleanup = () => { clearTimeout(timer); off(); cleanups.delete(cleanup); };
      const timer = setTimeout(() => { cleanup(); reject(new Error(`RPC timeout: ${method}`)); }, ms);
      off = bus.on(`subagents:rpc:${method}:reply:${requestId}`, reply => { cleanup(); done(reply); });
      cleanups.add(cleanup);
      try { bus.emit(`subagents:rpc:${method}`, { requestId, ...payload }); } catch (error) { cleanup(); reject(error); }
    });
    const ping = await rpc("ping", {});
    assert.deepEqual(ping, { success: true, data: { version: 2 } });
    const badStop = await rpc("stop", { agentId: "missing-id" });
    assert.equal(badStop.success, false); assert.match(badStop.error, /not found/i);
    const missing = await rpc("spawn", { type: "trellis-implement", prompt: "work", options: { cwd: join(root, "missing"), isolation: "off" } });
    assert.equal(missing.success, false); assert.match(missing.error, /does not exist/);
    const terminalEvents = new Map(), terminalWaiters = new Map();
    for (const event of ["subagents:completed", "subagents:failed"]) {
      const off = bus.on(event, data => { terminalEvents.set(data.id, { event, data }); terminalWaiters.get(data.id)?.resolve({ event, data }); });
      cleanups.add(off);
    }
    const terminal = id => {
      if (terminalEvents.has(id)) return Promise.resolve(terminalEvents.get(id));
      const wait = deferred(); terminalWaiters.set(id, wait);
      return bounded(wait.promise, `terminal ${id}`).finally(() => terminalWaiters.delete(id));
    };
    const checkMaterials = await materialFacts("check");
    const prompt = rolePrompt(checkMaterials);
    const spawnHeld = async (response, role = "trellis-check", workingDir = target) => {
      faux.appendResponses([...sourceReadCalls(checkMaterials), response.response]);
      const started = await rpc("spawn", { type: role, prompt, options: { cwd: workingDir, isolation: "off" } });
      assert.equal(started.success, true, JSON.stringify(started));
      assert.deepEqual(Object.keys(started.data), ["id"]);
      assert.equal(typeof started.data.id, "string"); assert.ok(started.data.id);
      const observed = await bounded(response.seen, "child request");
      assert.ok(JSON.stringify(observed).includes("SOURCE material"));
      assert.ok(!JSON.stringify(observed).includes("STALE execution-checkout body"));
      assert.ok(!terminalEvents.has(started.data.id), "spawn reply is startup, not terminal evidence");
      return started.data.id;
    };
    if (options.preset) {
      for (const name of ["task_manage", "subagent_run", "subagent_workflow", "subagent_message", "bash", "monitor", "trellis_dispatch"]) {
        tool(name); assert.ok(main.getAllTools().some(tool => tool.name === name));
      }
      for (const name of ["Agent", "SubagentWorkflow", "steer_subagent", "get_subagent_result", "jobs", "bash_bg"]) assert.ok(!main.getAllTools().some(tool => tool.name === name), `Old alias ${name} must be absent`);
      assert.equal(tool("bash").parameters.properties.run_in_background.type, "boolean");
      assert.equal(tool("bash").parameters.properties.notify.type, "boolean");
      assert.ok(tool("subagent_run").parameters.required.includes("description"));
      assert.deepEqual(tool("subagent_message").parameters.required, ["agent_id", "message"]);
      assert.deepEqual(loader.getExtensions().extensions.map(extension => realpathSync(extension.path)).sort(),
        [...entries, join(root, ".pi/extensions/probe.ts")].sort(), "only adapter + composition + offline search fixture may load");
      console.log(`Registered public tools=${JSON.stringify(main.getAllTools().map(tool => tool.name))}`);
      log("unique six new tools, no old alias, bash background schema, RPC v2 startup envelope");
      const manage = (params, signal, update) => execute("task_manage", params, signal, update);
      const metadata = result => {
        assert.equal(result.details.runtimeTask.version, 1);
        assert.ok(!result.isError, text(result)); return result.details.runtimeTask;
      };
      const error = (result, code) => { assert.equal(result.isError, true); assert.equal(result.details.runtimeTask.error_code, code); };
      // Keep the real parent streaming while checking notification suppression. No fake task_manage or manager reads.
      const parentHeld = heldResponse();
      faux.setResponses([parentHeld.response]);
      const parentRun = main.prompt("Offline parent notification observation");
      parentRun.catch(() => {});
      await bounded(parentHeld.seen, "parent request");
      const baselineCalls = faux.state.callCount;
      const child = heldResponse();
      const id = await spawnHeld(child);
      const listed = await manage({ action: "list", task_type: "subagent" });
      assert.match(text(listed), new RegExp(`task_id=${id}\\b`)); assert.ok(metadata(listed).count >= 1);
      const status = metadata(await manage({ action: "status", task_id: id }));
      assert.equal(status.task_id, id); assert.equal(status.task_type, "subagent"); assert.equal(status.status, "running"); assert.ok(status.run_id);
      console.log(`RPC id=${id}; task_manage status=${JSON.stringify(status)}; list count=${listed.details.runtimeTask.count}`);
      const run_id = status.run_id;
      for (const action of ["status", "output", "wait", "stop"]) {
        error(await manage({ action, task_id: id, task_type: "subagent" }), "invalid_arguments");
        error(await manage({ action, task_id: "missing-id" }), "not_found");
        error(await manage({ action, task_id: id, run_id: "not-the-current-run" }), "stale");
      }
      const runningConsume = await rpc("consume", { agentId: id });
      assert.equal(runningConsume.success, false); assert.match(runningConsume.error, /still running/);
      const cancelled = new AbortController(), waiting = deferred();
      const cancelledWait = manage({ action: "wait", task_id: id, run_id }, cancelled.signal, update => { if (update.details.runtimeTask.wait_outcome === "waiting") waiting.resolve(); });
      await bounded(waiting.promise, "wait registered"); cancelled.abort();
      assert.equal(metadata(await cancelledWait).wait_outcome, "cancelled");
      const afterCancel = metadata(await manage({ action: "status", task_id: id, run_id }));
      assert.equal(afterCancel.status, "running"); assert.ok(!terminalEvents.has(id), "cancelled wait did not stop child");
      const steer = await execute("subagent_message", { agent_id: id, message: "wrap up with the complete RPC answer" });
      assert.match(text(steer), /Steering message (?:sent|queued)/);
      faux.appendResponses([fauxAssistantMessage("rpc done: complete answer after guidance")]);
      const completedWait = manage({ action: "wait", task_id: id, run_id });
      child.release(fauxAssistantMessage("rpc initial answer"));
      const answer = await completedWait;
      assert.equal(metadata(answer).wait_outcome, "completed"); assert.equal(answer.details.runtimeTask.status, "completed");
      assert.ok(text(answer).includes("rpc done: complete answer after guidance"));
      assert.equal((await terminal(id)).event, "subagents:completed");
      // A wait-only control: do not let output/RPC consume hide a broken wait consume.
      // Cancelling a new retrieval on this settled run reconsiders notifications without
      // consuming again, distinguishing consumed state from a cancelled notice timer.
      const reconsiderWait = new AbortController(); reconsiderWait.abort();
      const reconsidered = await manage({ action: "wait", task_id: id, run_id }, reconsiderWait.signal);
      assert.equal(metadata(reconsidered).wait_outcome, "cancelled");
      log("real RPC ID list/status/run, invalid/notfound/stale, running message, cancelled wait preserves execution, complete wait-only answer");
      // A separately settled, previously unread run is consumed through terminal output.
      const outputChild = heldResponse(), outputId = await spawnHeld(outputChild);
      const outputRun = metadata(await manage({ action: "status", task_id: outputId })).run_id;
      outputChild.release(fauxAssistantMessage("terminal output complete answer")); await terminal(outputId);
      assert.match(text(await manage({ action: "list", task_type: "subagent" })), new RegExp(`task_id=${outputId}\\b`));
      assert.equal(metadata(await manage({ action: "status", task_id: outputId })).status, "completed");
      assert.ok(text(await manage({ action: "output", task_id: outputId, run_id: outputRun })).includes("terminal output complete answer"));
      // Independent protocol consume has no run_id and retains readable results.
      const consumeChild = heldResponse(), consumeId = await spawnHeld(consumeChild);
      consumeChild.release(fauxAssistantMessage("RPC consume complete answer")); await terminal(consumeId);
      assert.deepEqual(await rpc("consume", { agentId: consumeId }), { success: true });
      assert.equal(metadata(await manage({ action: "status", task_id: consumeId })).status, "completed");
      // Positive control: list/status alone must NOT consume a settled result.
      const unreadChild = heldResponse(), unreadId = await spawnHeld(unreadChild);
      unreadChild.release(fauxAssistantMessage("unread notification positive control")); await terminal(unreadId);
      assert.match(text(await manage({ action: "list", task_type: "subagent" })), new RegExp(`task_id=${unreadId}\\b`));
      assert.equal(metadata(await manage({ action: "status", task_id: unreadId })).status, "completed");
      // Observe the real notification hold, then let the parent's queued turn run.
      await bounded(delay(300), "notification hold window", 1000);
      let notificationContext;
      faux.appendResponses([context => { notificationContext = context; return fauxAssistantMessage("notification observed by real parent"); }]);
      parentHeld.release(fauxAssistantMessage("parent observation done"));
      await bounded(parentRun, "parent completion");
      assert.equal(faux.state.callCount - baselineCalls, 4 * sourceReadCalls(checkMaterials).length + 6, "four children's source reads, five child requests (including the steering turn), and exactly one unread-result parent turn");
      const notices = main.messages.filter(message => message.role === "custom" && message.customType === "subagent-notification");
      assert.deepEqual(notices.map(message => message.details.id), [unreadId], "wait/output/consume suppress only their results; list/status do not consume");
      assert.ok(JSON.stringify(notificationContext).includes("unread notification positive control"));
      const result = await manage({ action: "output", task_id: id, run_id });
      assert.ok(text(result).includes("rpc done: complete answer after guidance"));
      assert.equal(metadata(result).run_id, run_id);
      assert.ok(text(await manage({ action: "output", task_id: consumeId })).includes("RPC consume complete answer"));
      assert.ok(text(await manage({ action: "output", task_id: unreadId })).includes("unread notification positive control"));
      log("successful wait + unread terminal output + RPC consume suppress real notifications; list/status positive control does not consume");
      // Resume the RPC-spawned ID through the public launcher: reject an actual previous run, not just invented input.
      const resumedChild = heldResponse(); faux.setResponses([resumedChild.response]);
      terminalEvents.delete(id);
      const resumed = await execute("subagent_run", { prompt: "Continue the completed RPC run", description: "Probe real run resume", resume: id, run_in_background: true });
      assert.equal(resumed.details.runtimeLaunch.task_id, id);
      await bounded(resumedChild.seen, "resumed child request");
      const newRun = metadata(await manage({ action: "status", task_id: id })).run_id;
      assert.notEqual(newRun, run_id);
      for (const action of ["status", "output", "wait", "stop"]) error(await manage({ action, task_id: id, run_id }), "stale");
      const resumedWait = manage({ action: "wait", task_id: id });
      resumedChild.release(fauxAssistantMessage("new run complete answer"));
      const resumedAnswer = await resumedWait;
      assert.equal(metadata(resumedAnswer).run_id, newRun); assert.equal(resumedAnswer.details.runtimeTask.wait_outcome, "completed");
      assert.ok(text(resumedAnswer).includes("new run complete answer"));
      log("public subagent_run resume retains RPC ID; actual old run stale; omitted run_id binds new run at admission");
      // Exercise the real bash override, workflow launcher and monitor validation (no external WebSocket/network).
      const bash = await execute("bash", { command: "printf 'offline background output\\n'", run_in_background: true, notify: false, description: "Offline background probe" });
      assert.equal(bash.details.runtimeLaunch.task_type, "bash"); assert.equal(bash.details.runtimeLaunch.mode, "background");
      assert.ok(text(await manage({ action: "wait", task_id: bash.details.runtimeLaunch.task_id })).includes("offline background output"));
      await assert.rejects(execute("monitor", { command: "printf fixture", ws: { url: "ws://localhost:0" }, description: "Invalid dual source" }), /either.*command.*ws/);
      const workflow = await execute("subagent_workflow", { script: 'export const meta = { name: "Offline probe", description: "No agents or network" }; return "workflow full return";' });
      assert.equal(workflow.details.runtimeLaunch.task_type, "workflow");
      const workflowAnswer = await manage({ action: "wait", task_id: workflow.details.runtimeLaunch.task_id });
      assert.equal(metadata(workflowAnswer).wait_outcome, "completed");
      assert.ok(text(workflowAnswer).includes("workflow full return"));
      log("six public tool execute paths including background bash, workflow return and monitor XOR rejection without network");
      // A real source dispatch uses its returned provider ID directly, not a probe-generated mapping.
      let sourceObserved;
      faux.setResponses([...sourceReadCalls(sharedMaterials), context => { sourceObserved = context; return fauxAssistantMessage(fauxToolCall("write", { path: "shared-source.txt", content: "shared source execution" })); }, fauxAssistantMessage("source done: full answer")]);
      const source = await execute("trellis_dispatch", { task: sourceTask, agent: "trellis-implement", prompt: "Write the scoped source output" });
      assert.equal(source.details.mode, "source"); assert.equal(source.details.cwd, root); assert.ok(source.details.agentId);
      const sourceAnswer = await manage({ action: "wait", task_id: source.details.agentId });
      assert.equal(metadata(sourceAnswer).task_id, source.details.agentId); assert.equal(sourceAnswer.details.runtimeTask.wait_outcome, "completed");
      assert.ok(text(sourceAnswer).includes("source done: full answer"));
      assert.equal(readFileSync(join(root, "shared-source.txt"), "utf8"), "shared source execution");
      assert.ok(JSON.stringify(sourceObserved).includes("SOURCE material"));
      assert.ok(JSON.stringify(sourceObserved).includes("Shared directory: Other agents may be working here."));
      assert.ok(!JSON.stringify(sourceObserved).includes("STALE execution-checkout body"));
      log("source trellis_dispatch real child write/cwd/material/ID + public task_manage full wait");
      // Stop acknowledgement is not Trellis terminal publication/lease release; regression owners cover that race.
      const stopped = heldResponse(); faux.setResponses([]);
      const stoppedId = await spawnHeld(stopped);
      const stop = await manage({ action: "stop", task_id: stoppedId });
      assert.equal(metadata(stop).task_id, stoppedId); assert.match(text(stop), /Cancellation is cooperative/);
      assert.ok(!terminalEvents.has(stoppedId), "acknowledgement must not be mistaken for drained terminal execution");
      stopped.release();
      assert.equal((await terminal(stoppedId)).event, "subagents:failed");
      assert.equal(metadata(await manage({ action: "wait", task_id: stoppedId })).status, "stopped");
      log("public stop acknowledgement distinct from terminal drain (no Trellis lease-release inference)");
    } else {
      // Native provider compatibility is tested separately, never as product old-name aliases.
      const child = heldResponse(); faux.setResponses([]);
      const id = await spawnHeld(child);
      const steered = await execute("steer_subagent", { agent_id: id, message: "wrap up" });
      assert.ok(!text(steered).includes("not found"));
      faux.appendResponses([fauxAssistantMessage("rpc done")]); child.release(fauxAssistantMessage("rpc done"));
      const retrieved = await execute("get_subagent_result", { agent_id: id, wait: true });
      assert.ok(text(retrieved).includes("rpc done"));
      let sourceObserved;
      faux.setResponses([...sourceReadCalls(sharedMaterials), context => { sourceObserved = context; return fauxAssistantMessage(fauxToolCall("write", { path: "shared-source.txt", content: "shared source execution" })); }, fauxAssistantMessage("source done")]);
      const source = await execute("trellis_dispatch", { task: sourceTask, agent: "trellis-implement", prompt: "Write the scoped source output" });
      assert.equal(source.details.mode, "source"); assert.equal(source.details.cwd, root);
      assert.ok(text(await execute("get_subagent_result", { agent_id: source.details.agentId, wait: true })).includes("source done"));
      assert.equal(readFileSync(join(root, "shared-source.txt"), "utf8"), "shared source execution");
      assert.ok(JSON.stringify(sourceObserved).includes("SOURCE material"));
      assert.ok(JSON.stringify(sourceObserved).includes("Shared directory: Other agents may be working here."));
      assert.ok(!JSON.stringify(sourceObserved).includes("STALE execution-checkout body"));
      log("native public RPC real id/result/steering + shared source dispatch (not preset new-tool evidence)");
    }
    await bounded(main.extensionRunner.emit({ type: "session_shutdown", reason: "quit" }), "main shutdown"); mainShutdown = true;
    await assert.rejects(rpc("ping", {}, 100), /RPC timeout/);
    main.dispose(); main = undefined;
    assert.equal(holds.size, 0, "all faux holds released");
    log("main/child shutdown + unavailable RPC timeout + released response holds");
    console.log(`${hostVersion} real loader ${mode} PASS; no online model, installed-session reload, full managed lifecycle or terminal-visual claim.`);
  } catch (error) {
    probeFailure = error;
    throw error;
  } finally {
    const cleanupErrors = [];
    const attempt = async operation => { try { await operation(); } catch (error) { cleanupErrors.push(error); } };
    for (const release of holds) await attempt(() => release());
    if (main) {
      if (!mainShutdown) await attempt(() => bounded(main.extensionRunner.emit({ type: "session_shutdown", reason: "quit" }), "failure main shutdown"));
      await attempt(() => main.dispose());
    }
    for (const session of sessions) {
      await attempt(() => bounded(session.extensionRunner?.emit({ type: "session_shutdown", reason: "quit" }), "failure child shutdown"));
      await attempt(() => session.dispose());
    }
    for (const cleanup of cleanups) await attempt(cleanup);
    await attempt(() => hook?.deregister());
    await attempt(() => process.chdir(originalCwd));
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
    await attempt(() => rmSync(workspace, { recursive: true, force: true }));
    if (cleanupErrors.length) throw new AggregateError([...(probeFailure ? [probeFailure] : []), ...cleanupErrors], "Probe cleanup failed (all owned cleanup paths attempted)");
    console.log(`Cleanup complete: ${workspace}; no force-exit (process must exit naturally).`);
  }
}
