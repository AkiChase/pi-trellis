// Optional real-host/real-provider probe. No model network or user configuration is used.
// node tests/provider-contracts.mjs --host <Pi node_modules> --provider <package-root> [...]
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { assembleDispatchPrompt, buildTaskContext } from "../../../../../lib/task-context.ts";
import { installRuntimeFixture } from "../../../../../tests/runtime-fixture.mjs";

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
const workspace = realpathSync(mkdtempSync(join(tmpdir(), "pi-trellis-live-acceptance-")));
const evidence = resolve(".trellis/tasks/10-14-dispatch-shared-source/research/live-validation");
const audit = { pid: process.pid, workspace, started: new Date().toISOString(), checks: [], ids: [], terminals: [], errors: [], processes: [], execution: "real SDK/loader/agent-tasks with offline faux; no CLI/tmux/online model" };
const save = () => writeFileSync(join(evidence, "final.json"), JSON.stringify(audit, null, 2));
const pass = (name, details) => { audit.checks.push({ name, status: "PASS", details }); save(); console.log(name + " PASS"); };
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
audit.productHashesBefore = Object.fromEntries(execFileSync("git", ["ls-files", "lib", "extensions", "runtime", "resources", "agents", "tests/provider-contracts.mjs", "docs/dispatch.md"], {encoding:"utf8"}).trim().split("\n").map(file => [file, hash(file)]));
audit.gitBefore = execFileSync("git", ["status", "--short"], {encoding:"utf8"});
audit.head = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
const liveSessions = new Set();
save();
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
    for (const role of ["implement", "check", "research"]) put(root, `.pi/agents/trellis-${role}.md`, readFileSync(resolve(`agents/trellis-${role}.md`), "utf8"));
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
    liveSessions.add(main);
    await main.bindExtensions({ onError: (error) => { audit.errors.push(error); save(); throw new Error(error.message); } });
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
    pass("Existing harness unified source dispatch", { canonicalCwd: root, sourceWrite: readFileSync(join(root,"shared-source.txt"),"utf8") });
    // Extended acceptance drives real public provider tools and events, never mocked RPC replies.
    const taskB = ".trellis/tasks/concurrent-b";
    put(root, `${taskB}/task.json`, '{"status":"in_progress"}');
    put(root, `${taskB}/prd.md`, "SECOND TASK current uncommitted material");
    for (const role of ["implement", "check"]) put(root, `${taskB}/${role}.jsonl`, JSON.stringify({file:`${taskB}/prd.md`}));
    const parentKey = `pi-${createHash("sha256").update(`${root}::${main.sessionManager.getSessionId()}`).digest("hex").slice(0,12)}`;
    const parentPointer = `.trellis/.runtime/sessions/${parentKey}.json`;
    put(root, parentPointer, JSON.stringify({current_task: taskB, current_run:null, acceptanceSentinel:"unchanged"}));
    const parentBytes = readFileSync(join(root,parentPointer),"utf8");
    const terminals = audit.terminals;
    const offCompleted = bus.on("subagents:completed", data => { terminals.push({event:"completed", data, time:Date.now()}); save(); });
    const offFailed = bus.on("subagents:failed", data => { terminals.push({event:"failed", data, time:Date.now()}); save(); });
    const spawnRequests = [];
    const offSpawn = bus.on("subagents:rpc:spawn", data => { spawnRequests.push(data); });
    const terminalFor = id => terminals.find(event => event.data.id === id);
    const bounded = (promise, label, ms=15000) => new Promise((done,reject) => { const timer=setTimeout(()=>reject(Error(`Timed out: ${label}`)),ms); promise.then(value=>{clearTimeout(timer);done(value);},error=>{clearTimeout(timer);reject(error);}); });
    const gate = label => { let resolveResponse, resolveSeen; const seen=new Promise(done=>resolveSeen=done); const held=new Promise(done=>resolveResponse=done); return {label,seen,release:()=>resolveResponse(fauxAssistantMessage(`${label} done`)),response:(context,options)=>{resolveSeen({context,sessionId:options?.sessionId});return held;}}; };
    const a=gate("concurrent A"), b=gate("concurrent B");
    faux.setResponses([a.response,b.response,fauxAssistantMessage("steering accepted done"),fauxAssistantMessage("spare done")]);
    const sourceFiles = () => readdirSync(join(root,".trellis/.runtime/pi-trellis/source-executions")).map(name=>JSON.parse(readFileSync(join(root,".trellis/.runtime/pi-trellis/source-executions",name),"utf8")));
    const recordFor = task => sourceFiles().find(record=>record.taskDir===task);
    const originalExtendedCwd=process.cwd(); process.chdir(root);
    try {
      const startA=await dispatch.execute("concurrent-a",{task:taskDir,agent:"trellis-implement",prompt:"Acceptance A; no product edits"},undefined,undefined,parent);
      const seenA=await bounded(a.seen,"first child model request");
      const startB=await dispatch.execute("concurrent-b",{task:taskB,agent:"trellis-check",prompt:"Acceptance B; no product edits"},undefined,undefined,parent);
      const seenB=await bounded(b.seen,"second child model request");
      const idA=startA.details.agentId,idB=startB.details.agentId; audit.ids.push(idA,idB); save();
      assert.ok(idA && idB && idA!==idB);
      assert.equal(startA.details.cwd,root); assert.equal(startB.details.cwd,root);
      assert.equal(recordFor(taskDir).state,"running"); assert.equal(recordFor(taskB).state,"running");
      assert.equal(terminalFor(idA),undefined); assert.equal(terminalFor(idB),undefined);
      assert.equal(spawnRequests.length,2);
      for (const request of spawnRequests) {assert.equal(request.options.cwd,root);assert.equal(request.options.isolation,"off");}
      pass("Different tasks concurrently running in same source cwd",{idA,idB,records:sourceFiles(),spawnRequests});
      const warning="Shared directory: Other agents may be working here. Stay within your assigned scope, preserve unrelated changes, and report overlapping edits to the main agent.";
      for (const seen of [seenA,seenB]) assert.ok(JSON.stringify(seen.context).includes(warning));
      for (const started of [startA,startB]) assert.ok(JSON.stringify(started).includes("Shared source directory — no filesystem isolation. Coordinate overlapping edits."));
      assert.ok(JSON.stringify(seenB.context).includes("SECOND TASK current uncommitted material"));
      pass("Exact short child and parent warnings plus uncommitted task materials");
      const pointers = readdirSync(join(root,".trellis/.runtime/sessions")).filter(name=>name.startsWith("pi-child-")).map(name=>({name,...JSON.parse(readFileSync(join(root,".trellis/.runtime/sessions",name),"utf8"))}));
      assert.ok(pointers.some(pointer=>pointer.current_task===taskDir)); assert.ok(pointers.some(pointer=>pointer.current_task===taskB));
      assert.equal(readFileSync(join(root,parentPointer),"utf8"),parentBytes);
      pass("Independent child session pointers preserve parent bytes",{parentKey,pointers,childModelSessionIds:[seenA.sessionId,seenB.sessionId]});
      let rejected;try {rejected=await dispatch.execute("same-task",{task:taskDir,agent:"trellis-check",prompt:"must reject"},undefined,undefined,parent);}catch(error){rejected={isError:true,error:String(error)};}
      assert.ok(rejected.isError);assert.match(JSON.stringify(rejected),/running\/unknown source execution/);assert.equal(spawnRequests.length,2);
      pass("Same-task overlap rejected before provider spawn",rejected);
      const steered=await steer.execute("live-steer",{agent_id:idA,message:"Acceptance steering: finish now"},undefined,undefined,parent);
      assert.ok(!steered.isError); assert.ok(!JSON.stringify(steered).includes("not found"));
      a.release();b.release();
      const resultA=await bounded(getResult.execute("live-result-a",{agent_id:idA,wait:true},undefined,undefined,parent),"result A");
      const resultB=await bounded(getResult.execute("live-result-b",{agent_id:idB,wait:true},undefined,undefined,parent),"result B");
      assert.ok(JSON.stringify(resultA).includes("done"));assert.ok(JSON.stringify(resultB).includes("concurrent B done"));
      assert.ok(terminalFor(idA));assert.ok(terminalFor(idB));
      assert.equal(recordFor(taskDir).state,"completed");assert.equal(recordFor(taskB).state,"completed");
      pass("Real IDs public steering results and terminal records",{steered,resultA,resultB});
      const stopped=gate("stopped child");faux.setResponses([stopped.response]);
      const startStop=await dispatch.execute("live-stop-start",{task:taskDir,agent:"trellis-implement",prompt:"Acceptance stop target"},undefined,undefined,parent);
      const stopId=startStop.details.agentId; audit.ids.push(stopId);save();await bounded(stopped.seen,"stop target request");
      let offStopTerminal;
      const stopTerminal=new Promise(done=>{offStopTerminal=bus.on("subagents:failed",data=>{if(data.id===stopId){offStopTerminal();done(data);}});});
      assert.equal(recordFor(taskDir).state,"running");assert.equal(terminalFor(stopId),undefined);
      const stopResponse=await dispatch.execute("live-stop",{action:"stop",task:taskDir},undefined,undefined,parent);
      assert.ok(!stopResponse.isError);assert.match(JSON.stringify(stopResponse),/Lease retained until terminal evidence/);
      const immediateAfterStop={record:recordFor(taskDir),terminal:terminalFor(stopId)??null};
      if (!terminalFor(stopId)) {
        assert.ok(["running","unknown"].includes(recordFor(taskDir).state));
        let retained;try{retained=await dispatch.execute("stop-retained",{task:taskDir,agent:"trellis-check",prompt:"must stay occupied"},undefined,undefined,parent);}catch(error){retained={isError:true,error:String(error)};}
        assert.ok(retained.isError);pass("Stop reply alone retains occupancy",retained);
      } else audit.checks.push({name:"Observable stop-reply-before-terminal window",status:"NOTRUN",details:"Real provider emitted terminal synchronously during stop; no artificial delayed terminal injected"});
      stopped.release();
      const stoppedResult=await bounded(getResult.execute("stopped-result",{agent_id:stopId,wait:true},undefined,undefined,parent),"stop terminal result");
      await bounded(stopTerminal,"actual provider stopped terminal event");
      assert.ok(terminalFor(stopId));assert.equal(recordFor(taskDir).state,"failed");
      pass("Real provider stop terminal releases task occupancy",{stopId,stopResponse,immediateAfterStop,stoppedResult,record:recordFor(taskDir)});
      faux.setResponses([fauxAssistantMessage("next dispatch after stop done")]);
      const next=await dispatch.execute("after-stop",{task:taskDir,agent:"trellis-check",prompt:"Acceptance next dispatch"},undefined,undefined,parent);
      assert.ok(!next.isError);assert.notEqual(next.details.agentId,stopId);audit.ids.push(next.details.agentId);
      const nextResult=await bounded(getResult.execute("next-result",{agent_id:next.details.agentId,wait:true},undefined,undefined,parent),"next result");
      assert.ok(JSON.stringify(nextResult).includes("next dispatch after stop done"));assert.equal(recordFor(taskDir).state,"completed");
      assert.equal(readFileSync(join(root,parentPointer),"utf8"),parentBytes);
      const worktrees=execFileSync("git",["worktree","list","--porcelain"],{cwd:root,encoding:"utf8"});
      assert.equal(worktrees.split("\n").filter(line=>line.startsWith("worktree ")).length,1);
      assert.ok(!existsSync(join(root,".worktree")));assert.ok(!existsSync(join(root,".trellis/.runtime/pi-trellis/bindings")) || readdirSync(join(root,".trellis/.runtime/pi-trellis/bindings")).length===0);
      pass("Next dispatch succeeds after stop terminal; no worktree created",{next,nextResult,worktrees});
    } finally { a.release();b.release();process.chdir(originalExtendedCwd);offCompleted();offFailed();offSpawn(); }
    await main.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
    await assert.rejects(rpc("ping", {}, 100), /RPC timeout/);
    main.dispose();liveSessions.delete(main);
    console.log(`${provider}: public RPC cwd/missing directory + real id/result/steering + unavailable-service timeout PASS`);
  }
  pass("Existing real provider parser runner loader public RPC regressions");
  audit.status="PASS";
} catch (error) {audit.status="FAIL";audit.failure=error.stack??String(error);throw error;}
finally {
  for (const session of liveSessions) {try {await session.extensionRunner.emit({type:"session_shutdown",reason:"quit"});}catch(error){audit.errors.push(String(error));}try{session.dispose();}catch(error){audit.errors.push(String(error));}}
  audit.processes=execFileSync("ps",["-axo","pid,ppid,command"],{encoding:"utf8"}).split("\n").filter(line=>line.includes(workspace)||line.includes("live-validation/driver.mjs"));
  rmSync(workspace, { recursive: true, force: true });
  audit.workspaceGone=!existsSync(workspace);audit.finished=new Date().toISOString();
  audit.productHashesAfter=Object.fromEntries(Object.keys(audit.productHashesBefore).map(file=>[file,hash(file)]));
  audit.changedProductFiles=Object.keys(audit.productHashesBefore).filter(file=>audit.productHashesBefore[file]!==audit.productHashesAfter[file]);
  audit.gitAfter=execFileSync("git",["status","--short"],{encoding:"utf8"});
  save();console.log(`Cleanup workspace gone=${audit.workspaceGone}, product hash changes=${audit.changedProductFiles.length}, pid=${process.pid}`);
}
