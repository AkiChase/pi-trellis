# 实施结果：因清单语义冲突停止（未完成迁移）

## 当前结论

当前 HEAD 为 `2e8e73cc18eaf937a41ec023a3fbd9f295642496`，runtime 已提交于 `d738148`，init 已提交于 `2e8e73c`。已完整阅读父子授权/计划、盘点、初始化引擎与相关规格。按派发中的明确停止条件，本轮没有执行产品迁移：现有 schema v1 不能如实表达本仓库被保留的旧版/定制模板的初始指纹。

未运行真实仓库 fresh init、安装、reload、task lifecycle、journal、commit/push；未修改引擎、runtime 算法、installer、AGENTS、workflow、config、spec 或 `.pi`。仅新增本任务的研究证据与本报告。

## 阻塞的准确位置

`lib/initialization/engine.ts`：

- 第 111–124 行 `packageResources()` 将 32 runtime、3 agents、8 templates 放入同一清单。模板的 `sha256` 是当前包内新模板字节，`mode` 是 0644，`source` 为 `resources/templates/...`。
- 第 126–135 行 `validateManifest()` 要求完整集合和每项全部字段都等于 `packageResources()`；无法把 template 指纹写成保留的项目字节，也不能省略 template 项。
- 第 145–153 行 `verifiedManifest()` 仅重查 runtime 当前 hash/mode；模板当前字节允许变化，但这不意味着可以伪造“曾部署新模板”的初始 provenance。
- `docs/initialization.md` 第 33–36、53–55 行明确说明 template hashes 是初始指纹，运行时验证仍要求准确的规范资源集/来源/初始 hash。

项目 8 个模板路径中，7 个现存文件均与新模板不同；`.trellis/spec/index.md` 原本不存在。尤其 config、workflow、workspace/index 和项目规格属于要求保留的用户内容。允许定点更新文档指令，也不等于曾安装新模板。

### 可重复证据

一次性 Node 脚本只在 `mkdtemp` 临时项目构造规范 fresh plan，不调用 apply；复制临时 runtime/agents 和真实项目现有模板后，测试三份 manifest。临时目录在 finally 删除。

完整结果见 [manifest-conflict-proof.json](manifest-conflict-proof.json)：

1. 写入真实保留模板 hash：拒绝，`Malformed project resource provenance: .trellis/workflow.md`。
2. 只登记 runtime/agents：拒绝，`Incomplete or unknown managed resource entries`。
3. 写入规范新模板 hash，但保留旧模板字节/缺失 spec/index：接受。这只证明校验器支持初始化后的模板编辑；它不能证明真实仓库曾安装规范模板，本轮明确没有将这种虚假指纹发布到真实项目。

因此无法同时满足“支持现有严格 manifest”“准确初始指纹”“不覆盖定制”“不伪造 fresh init”四项。继续需要主会话明确决定清单的所有权/语义设计，不是 migration agent 可自行扩大范围的修补。

## 已保护的精确范围

[preflight-snapshot.json](preflight-snapshot.json) 记录 381 个 file/directory/missing 项的路径、完整 SHA-256、模式、大小，以及 HEAD/status。它是只读证据，不是恢复授权；本轮无发布，所以没有需要恢复的旧字节备份。

[preservation-check.json](preservation-check.json) 复查 380 个既存路径，变化为零。覆盖：

- tasks/archive、spec、workspace、`.developer`、`.runtime`、config、workflow；本任务新增研究证据不参与原文件比较。
- `.trellis/scripts` 28 个旧 Python 文件均匹配 `runtime-baseline.json.upstream.sourceHashes`，无替换或退役。
- `.agents` 46 个 tracked 文件全部保留，零删除；不扫描或操作全局/其他项目 `.agents`。
- package `runtime` 32 文件完整 hash 验证通过，未改 source；3 个 `.pi/agents` 仍与 package agents 字节一致。
- `.trellis/.pi-trellis.json` 和 `.runtime/init-operation.json` 仍不存在；没有 bootstrap/onboarding/身份写入。
- 保留旧 `.version` / `.template-hashes.json` 原字节；没有重标来源、刷新 hashes。
- `hooks/linear_sync.py` 原样保留；没有退休 `__init__.py`、`common/cli_adapter.py` 或 `common/task_queue.py`。

测试期间观察到并行新增 `.trellis/tasks/10-13-task-browser/`；未读取内容、修改、删除或恢复，未把它当作本任务改动。

## 实际验证

环境：Node `v24.14.1`，Python `3.14.7`，真实已安装 Pi 1.2.0 peers：

```bash
HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST="$HOST" npm test
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST="$HOST" \
  node --import ./tests/host-tui.mjs --test tests/skill-resources.test.mjs
```

- 全量现有基线 **241/241**，见 [baseline-tests.log](baseline-tests.log)。这是前置 baseline，不是迁移完成证明。
- 技能资源 **4/4**，见 [skill-tests.log](skill-tests.log)：10 技能/36 文件的 hashes、闭包、真实 Pi loader、npm 发布闭包通过。
- 当前源码 runtime32 完整 hashes 通过；真实部署仍为旧 scripts28，**不报告 source/deployed 一致**。
- `python3 -B .trellis/scripts/get_context.py --mode packages`：单仓库，extension/scripts 层。
- `python3 -B .trellis/scripts/task.py current --json`：本实现子会话 `session:pi-child-cc8aa3d5e779`，migration task 有效，stale=false。仅常规宿主绑定，未显式改变指针。
- 父/runtime/init/migration 四任务的 `python3 -B .trellis/scripts/task.py validate <path>` 全通过。
- `git diff --check` 通过（产品无 diff）；研究文件/报告另查新增内容。未宣称任务或父 AC 已验收。
- lint/typecheck 不可用，未标 Passed；无真实安装/reload、真实终端视觉、模型/provider 或完整 Python/平台矩阵测试。

## 主会话所需决定

建议先明确将“固定包模板基线”与“项目初始部署/保留来源”分开，或定义经过审阅的一次性非-init provenance，使保留文件/缺失入口能如实记录；具体 schema/校验策略由主会话确认，不在本轮擅自实施。不得靠把旧模板伪装成已编辑的新模板、伪造 init-operation 或整体复制新模板解锁。

该决定和独立检查完成前，installer/docs/AGENTS 更新、scripts32 发布、退休文件、删除 `.agents46` 和父 AC 集成验收均保持未完成；任务状态不由本子代理改写。
