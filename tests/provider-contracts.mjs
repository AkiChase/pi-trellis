// Optional real-host/real-provider probe. No model network or user configuration is used.
// node tests/provider-contracts.mjs --host <Pi node_modules> --provider <package-root> [...]
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { assembleDispatchPrompt, buildTaskContext } from "../lib/task-context.ts";
import { installRuntimeFixture } from "./runtime-fixture.mjs";

const args = process.argv.slice(2);
const host = args[args.indexOf("--host") + 1];
const providers = args.flatMap((value, i) => value === "--provider" ? [resolve(args[i + 1])] : []);
if (!host || !providers.length) throw new Error("Pass --host <Pi node_modules> --provider <package-root>, repeat --provider for both implementations");
const hostRoot = resolve(host);
const { createJiti } = await import(pathToFileURL(join(hostRoot, "jiti/lib/jiti.mjs")));
const aliases = Object.fromEntries(["pi-coding-agent", "pi-ai", "pi-agent-core", "pi-tui"].map((name) => [`@earendil-works/${name}`, join(hostRoot, `@earendil-works/${name}/dist/index.js`)]));
aliases["typebox"] = join(hostRoot, "typebox/build/index.mjs");
const jiti = createJiti(import.meta.url, { alias: aliases, moduleCache: true });
const sdk = await import(pathToFileURL(aliases["@earendil-works/pi-coding-agent"]));
const { fauxProvider, fauxAssistantMessage, fauxToolCall } = await import(pathToFileURL(join(hostRoot, "@earendil-works/pi-ai/dist/providers/faux.js")));
const { Type } = await jiti.import("typebox");
const workspace = mkdtempSync(join(tmpdir(), "pi-trellis-real-probe-"));
const agentDir = join(workspace, "config");
mkdirSync(agentDir);
process.env.PI_CODING_AGENT_DIR = agentDir;
const put = (root, path, content) => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), content); };
const runtime = await sdk.ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: null, refreshOnCreate: false, allowModelNetwork: false });
const faux = fauxProvider({ provider: "trellis-offline", api: "trellis-offline", models: [{ id: "test", reasoning: false }] });
runtime.registerNativeProvider(faux.provider);
const model = faux.getModel();
const registry = new sdk.ModelRegistry(runtime);
const extensionPath = resolve("extensions/trellis.ts");
try {
  for (const provider of providers) {
    const root = join(workspace, `project-${providers.indexOf(provider)}`), target = join(root, "target");
    mkdirSync(target, { recursive: true });
    execFileSync("git", ["init", "-q", root]);
    const taskDir = ".trellis/tasks/test";
    for (const dir of [root, target]) {
      installRuntimeFixture(dir);
      put(dir, `${taskDir}/task.json`, '{"status":"in_progress"}');
      put(dir, `${taskDir}/prd.md`, dir === target ? "TARGET material" : "SOURCE material");
      for (const role of ["implement", "check"]) put(dir, `${taskDir}/${role}.jsonl`, JSON.stringify({ file: `${taskDir}/prd.md` }));
    }
    for (const role of ["implement", "check", "research"]) put(root, `.pi/agents/trellis-${role}.md`, readFileSync(new URL(`../agents/trellis-${role}.md`, import.meta.url), "utf8"));
    put(root, ".pi/settings.json", JSON.stringify({ extensions: [extensionPath], compaction: { enabled: false }, defaultTools: ["read", "write", "edit", "bash", "find", "grep"] }));
    put(root, ".pi/extensions/probe.ts", `import { Type } from "typebox"; export default function(pi) { pi.on("session_start",()=>pi.registerTool({name:"probe_search",description:"Offline search fixture",parameters:Type.Object({}),execute:async()=>({content:[{type:"text",text:"fixture search"}],details:undefined})})); }`);
    const custom = await jiti.import(join(provider, "src/custom-agents.ts"));
    const types = await jiti.import(join(provider, "src/agent-types.ts"));
    const runner = await jiti.import(join(provider, "src/agent-runner.ts"));
    const agents = custom.loadCustomAgents(root, true);
    types.registerAgents(agents);
    runner.setRememberAgents(false);
    for (const role of ["implement", "check", "research"]) {
      assert.ok(agents.get(`trellis-${role}`).builtinToolNames.includes("write"));
      assert.equal(agents.get(`trellis-${role}`).extensions, true);
    }
    const parent = { cwd: root, model, modelRegistry: registry, sessionManager: sdk.SessionManager.inMemory(root), getSystemPrompt: () => "parent prompt", isProjectTrusted: () => true };
    const pi = { getAllTools: () => [], getActiveTools: () => [] };
    for (const role of ["implement", "check", "research"]) {
      const content = role === "research" ? "persisted findings" : "final code";
      const path = role === "research" ? `${taskDir}/research/topic.md` : "code.txt";
      let observed;
      const responses = [
        (context) => { observed = context; return fauxAssistantMessage(fauxToolCall("write", { path, content })); },
      ];
      if (role === "check") {
        responses.push(fauxAssistantMessage(fauxToolCall("edit", { path, oldText: content, newText: "fixed final code" })));
        responses.push(fauxAssistantMessage(fauxToolCall("bash", { command: "test \"$(head -1 code.txt)\" = 'fixed final code'" })));
      }
      if (role === "research") responses.push(fauxAssistantMessage(fauxToolCall("probe_search", {})));
      responses.push(fauxAssistantMessage("done"));
      faux.setResponses(responses);
      const prompt = assembleDispatchPrompt({ prompt: "work", taskDir, contextId: "probe-session", role: `trellis-${role}`, context: buildTaskContext({ executionRoot: target, taskDir, role: `trellis-${role}` }) });
      const result = await runner.runAgent(parent, `trellis-${role}`, prompt, {
        pi, cwd: target, configCwd: root, model, maxTurns: 8,
        onSessionCreated: (session) => {
          const active = session.getActiveToolNames();
          assert.ok(active.includes("write"));
          if (role === "check") assert.ok(active.includes("edit"));
          if (role === "research") assert.ok(active.includes("probe_search"), "late session_start extension tool must survive the scope gate");
        },
      });
      assert.equal(result.failure, undefined);
      assert.equal(readFileSync(join(target, path), "utf8"), role === "check" ? "fixed final code" : content);
      for (const message of result.session.messages.filter((message) => message.role === "toolResult")) assert.ok(!message.isError, `${role}: tool ${message.toolName} failed`);
      assert.ok(JSON.stringify(observed).includes("TARGET material"));
      assert.ok(!JSON.stringify(observed).includes("SOURCE material"));
      result.session.dispose();
    }
    console.log(`${provider}: real parser/runner + target cwd + injected material + write/edit + late external tool PASS`);
    // Load the real extension factory and drive only its public tools/events.
    put(root, ".pi/settings.json", JSON.stringify({ compaction: { enabled: false }, defaultTools: ["read", "write", "edit", "bash", "find", "grep"] }));
    const bus = sdk.createEventBus();
    const loader = new sdk.DefaultResourceLoader({ cwd: root, agentDir, eventBus: bus, additionalExtensionPaths: [extensionPath, join(provider, "src/index.ts")], noSkills: true, noContextFiles: true, settingsManager: sdk.SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } }) });
    await loader.reload();
    assert.deepEqual(loader.getExtensions().errors, []);
    const { session: main } = await sdk.createAgentSession({ cwd: root, agentDir, resourceLoader: loader, modelRuntime: runtime, model, sessionManager: sdk.SessionManager.inMemory(root), settingsManager: sdk.SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } }) });
    await main.bindExtensions({ onError: (error) => { throw new Error(error.message); } });
    // Persist the adapter for child reload; additionalExtensionPaths alone is parent-only.
    put(root, ".pi/settings.json", JSON.stringify({ extensions: [extensionPath], compaction: { enabled: false }, defaultTools: ["read", "write", "edit", "bash", "find", "grep"] }));
    const rpc = (method, payload, timeout = 10000) => new Promise((done, reject) => {
      const requestId = `probe-${Date.now()}-${Math.random()}`;
      const timer = setTimeout(() => { off(); reject(new Error(`RPC timeout: ${method}`)); }, timeout);
      const off = bus.on(`subagents:rpc:${method}:reply:${requestId}`, (reply) => { clearTimeout(timer); off(); done(reply); });
      bus.emit(`subagents:rpc:${method}`, { requestId, ...payload });
    });
    assert.equal((await rpc("ping", {})).success, true);
    const badStop = await rpc("stop", { agentId: "missing-id" });
    assert.equal(badStop.success, false);
    const missing = await rpc("spawn", { type: "trellis-implement", prompt: "work", options: { cwd: join(root, "missing"), isolation: "off" } });
    assert.equal(missing.success, false);
    assert.match(missing.error, /does not exist/);
    let releaseResponse, sawRequest;
    const saw = new Promise((done) => { sawRequest = done; });
    const held = new Promise((done) => { releaseResponse = done; });
    faux.setResponses([(context) => { sawRequest(context); return held; }, fauxAssistantMessage("rpc done")]);
    const prompt = assembleDispatchPrompt({ prompt: "work", taskDir, contextId: "rpc-probe", role: "trellis-check", context: buildTaskContext({ executionRoot: target, taskDir, role: "trellis-check" }) });
    const started = await rpc("spawn", { type: "trellis-check", prompt, options: { cwd: target, isolation: "off" } });
    assert.equal(started.success, true);
    const seen = await saw;
    assert.ok(JSON.stringify(seen).includes("TARGET material"));
    const tools = loader.getExtensions().extensions.flatMap((extension) => [...extension.tools.values()].map((tool) => tool.definition));
    const getResult = tools.find((tool) => tool.name === "get_subagent_result");
    const steer = tools.find((tool) => tool.name === "steer_subagent");
    assert.ok(getResult && steer);
    const steered = await steer.execute("probe-steer", { agent_id: started.data.id, message: "wrap up" }, undefined, undefined, parent);
    assert.ok(!JSON.stringify(steered).includes("not found"));
    releaseResponse(fauxAssistantMessage("rpc done"));
    const retrieved = await getResult.execute("probe-result", { agent_id: started.data.id, wait: true }, undefined, undefined, parent);
    assert.ok(JSON.stringify(retrieved).includes("rpc done"));
    const dispatch = tools.find((tool) => tool.name === "trellis_dispatch");
    assert.ok(dispatch);
    let sourceObserved;
    faux.setResponses([(context) => { sourceObserved = context; return fauxAssistantMessage(fauxToolCall("write", { path: "shared-source.txt", content: "shared source execution" })); }, fauxAssistantMessage("source done")]);
    const originalCwd = process.cwd();
    process.chdir(root);
    try {
      const startedSource = await dispatch.execute("probe-source", { task: taskDir, agent: "trellis-implement", prompt: "Write the scoped source output" }, undefined, undefined, parent);
      assert.equal(startedSource.details.mode, "source");
      assert.equal(startedSource.details.cwd, root);
      const sourceResult = await getResult.execute("source-result", { agent_id: startedSource.details.agentId, wait: true }, undefined, undefined, parent);
      assert.ok(JSON.stringify(sourceResult).includes("source done"));
      assert.equal(readFileSync(join(root, "shared-source.txt"), "utf8"), "shared source execution");
      assert.ok(JSON.stringify(sourceObserved).includes("SOURCE material"));
      assert.ok(JSON.stringify(sourceObserved).includes("Shared directory: Other agents may be working here."));
      assert.ok(!JSON.stringify(sourceObserved).includes("TARGET material"));
    } finally { process.chdir(originalCwd); }
    console.log(`${provider}: unified trellis_dispatch shared source cwd + real child write/result + short warning PASS`);
    await main.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
    await assert.rejects(rpc("ping", {}, 100), /RPC timeout/);
    main.dispose();
    console.log(`${provider}: public RPC cwd/missing directory + real id/result/steering + unavailable-service timeout PASS`);
  }
  console.log("Pi 1.1 real extension loader PASS; all sessions used offline scripted responses, not a language model.");
} finally { rmSync(workspace, { recursive: true, force: true }); }
