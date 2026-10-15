# Research: 当前会话只读诊断的最小运行契约

- **Query**：专用内部 diagnostics runtime、真实配置消费者、当前任务/context、worktree identity-only/no-materials、隔离 Python 与有界子进程的源码可行性。
- **Scope**：mixed（当前源码、本机 Pi 1.2.0 声明、官方 Python/Git/Node 文档）。
- **Date**：2026-10-15

## Findings

### Files Found / 接口落点

| 当前文件与锚点 | 建议的最小接缝；以下新名字均不存在于当前产品 |
|---|---|
| `lib/initialization/command.ts:86,105-114` | `--check` 在 `inspect()` 前调用内部 `runDiagnostics(scope)`；一次事实集、一次报告。不增加命令、verbose、详略参数或面板。 |
| `extensions/trellis.ts:223-235,779-781,869-874,1158-1175` | registration 注入现有 `contextKey(root,ctx)` 与 session/root generation；不能调用会要求 runtime 的 `session()`、读缓存或复制 key 算法。 |
| `lib/initialization/engine.ts:53-93,165-182`；`lib/project-state.ts:6-39` | 保留发现边界和严格 release gate；另提供已校验源字节快照。`inspect()` 的 Python/skeleton/候选枚举不是诊断入口。 |
| `runtime/common/{active_task,task_records,config,workflow_phase}.py` | 新 `runtime/diagnostics.py` 的内部 `collect(request)` 只组合这些共享叶子；不 import CLI handler、session_context 或材料管理器。 |
| `runtime/pi_trellis_worktree/records.py:70-83,143-208,311-345` | 新窄 identity helper；复用 binding schema/IDENTITY/same_identity，不复用 `source_for()`/`binding_problems()` 的全 registration 查询。 |
| `lib/task-context.ts:26-40`；`lib/bindings.ts:46-82`；`lib/task-browser/reader.ts:42-60` | TS 配置纯解析、binding 运输和安全 descriptor reader 的落点；现有吞错 reader 不能作为诊断结果。 |

### 真实配置消费者：不要建立另一套理想 schema

| 来源 / 字段 | 当前实际消费与差异 |
|---|---|
| `.trellis/config.yaml` → `context_injection.*` | Pi 注入用 `lib/task-context.ts:26-40,85`：digits + JS safe integer，默认 32768/65536/131072，0=不限。源/目标各读自身配置：`lib/subagent-rpc.ts:157,181`。Python `config.py:184-232` 用 `int()`，`task_context.py:302` 仅取 file cap 作提示；native `materials.py:1-5` 验证不受 prompt 预算影响。 |
| journal/session | `config.py:105-139` 的 commit message、max journal lines、auto_commit 被 `add_session.py:1094,1113,1237` 和 `task_store.py:1460` 消费；bool aliases 复用 `coerce_config_bool:37-63`。journal 的 `int()` 不拒负数；应报实际值及影响，不偷偷改约束。 |
| hooks | `config.py:265-303` 校验 event→list，错误形态告警/忽略。实际事件为 after_create/start/deactivate/archive（`task_store.py:686,1432`、`task.py:261,284`）；只报事件/条数/忽略原因，不执行或回显命令内容。 |
| packages/default_package/session.spec_scope | `config.py:311-341,423-488`；`packages_context.py:94-125,183-187`、`session_context.py:243`。非 mapping package 被过滤，未知推断值被跳过；声明/引用关系可验证，但不得因此扫描 package、spec 或 Git 历史。 |
| codex/prompt_injection/channel | codex 有 CLI/shared workflow 消费者（`task_store.py:244`、`workflow_phase.py:178-197`），不是 Pi dispatch 开关。`get_prompt_injection_config()` 在当前 runtime 无调用；channel 无该 runtime 消费者。未知/别的平台设置不是本地故障。 |
| `.pi/pi-trellis.json` → worktree.directory | `records.py:110-125`：缺文件默认 `.worktree`，相对权威 source root，允许绝对路径；坏新配置不令既有绝对 binding 失效（`tests/worktree.test.mjs:57-63`）。不检查/创建未来 destination。 |
| Pi user/project settings | `adapter-resources.ts:9-17,22-48` 使用宿主 settings/filters；不是上述 Trellis YAML。诊断只用现存文本 + `SettingsManager.fromStorage` 的只读快照，保留 `ctx.isProjectTrusted()`；不调用 create、资源 resolve、npm 或 install。 |

**必要小抽取**：`parseContextLimits(text)` 供既有 TS reader 和诊断共同调用；Python getter 的映射→生效值逻辑提成共享纯 helpers（或显式 snapshot 参数），保留现有默认/告警，避免 diagnostics 复制规则、monkey-patch `_load_config`，或每个 getter 重读无上限文件。worktree directory 同样分离 JSON 值解析与文件读取。

`trellis_config.py:59-197,200-242` 是 YAML 子集，重复键覆盖、部分无效行静默跳过、unsupported 构造 stderr 后忽略；`config.py:81-103` 读失败回退 `{}`，UTF-8 decode 异常并不在其 OSError 捕获中。须先保留 bounded raw-read 状态，再记录消费者值/回退/忽略。有效空配置≠文件坏后默认；JSON/YAML 解析成功≠全部配置有效。缺 strict YAML API 是约束，不是引入另一 parser 的理由。

### Python：固定 `-I -S` + 内存源加载，不能只加 `-B`

推荐启动形态（代码示意，不是本轮已实现/执行的程序）：

```text
spawn(PYTHON, ["-I", "-S", "-B", "-X", "utf8", "-c", PACKAGE_BOOTSTRAP],
      {shell:false, cwd:executionRoot, stdio:["pipe","pipe","pipe"], windowsHide:true})
stdin = 一个限长 JSON：scope、固定源表（base64 bytes）、已收集的事实；随后关闭 stdin。
```

1. bootstrap 是 package 的固定字面代码；不从项目路径加载 bootstrap，不把项目路径/文本拼成 Python 程序。解释器仍按 TRELLIS_PYTHON 或平台默认选择，作为一个 executable，不 shell-split。
2. host 用 `runtimeBaseline()` 验 package；支持项目先 `requireProjectRuntime()`/`verifyRuntime()`。随后对固定 import closure 的源文件用 bounded nofollow descriptor 读字节，再比对 baseline hash/manifest mode，传**这些字节**给 child，不让 child 验后再从路径重读代码。
3. 私有 `diagnostics.py` 必须纳入 runtime baseline/deployment inventory；不是只放 package 里然后宣称旧部署已跑通。fresh/unsupported/incomplete 不装载项目源表；可独立跑仅 stdlib 的 version/flags 环境探测，其他静态项继续。
4. `-I` 排除 cwd/script-dir/user site 并忽略 PYTHON*；`-S` 禁用 site startup/.pth/sitecustomize/usercustomize；`-B` 才在 `-I` 忽略 PYTHONDONTWRITEBYTECODE 时可靠禁止 cache 写入。验 `sys.flags`、version>=3.10 和未加载 site，使用显式失败分支，不依赖 assert。
5. 安装一个只处理固定 `common`、`pi_trellis_worktree`、diagnostics 名称的 MetaPathFinder。不存在于可信源表的保留 namespace 模块直接抛 ModuleNotFoundError，不能 return None 后落到默认搜索。不得把 `.trellis/scripts`、package root 或任何项目目录插入 sys.path。
6. loader 只执行 `compile(captured_bytes, diagnostic_origin, "exec", dont_inherit=True)`；普通源码 loader/runpy/spec_from_file_location 仍可能读旧 pyc，不采用。真实 package `__init__.py` 也从源表加载，不捏造空 namespace 绕过初始化语义。

最小 loader 机制如下；源表、flags、大小/schema 和保留 namespace 校验由固定 bootstrap 完成：

```python
class CapturedSource:
    def __init__(self, row): self.row = row
    def create_module(self, spec): return None
    def exec_module(self, module):
        module.__file__ = self.row.origin
        exec(compile(self.row.bytes, self.row.origin, "exec", dont_inherit=True), module.__dict__)
# Finder.find_spec(name,path,target=None):
# 保留 namespace 缺 row => raise ModuleNotFoundError；其它名称 => return None。
# 有 row => importlib.util.spec_from_loader(name,CapturedSource(row),
#                                        origin=row.origin,is_package=row.is_package)
# package spec.submodule_search_locations=[]，不指向任何磁盘目录。
```

`common/__init__.py:62-101` 的真实 import closure 为 paths→git/task_records、active_task→io；这些模块顶层未调用 Git、mkdir、atomic write。`pi_trellis_worktree/__init__.py` 只有 docstring。诊断可 import records，但不 import manager/cli/materials；closure 与每个 imports 的无调用性质需要随 baseline 回归。

**保证边界**：上述路径使 Trellis 依赖只执行已捕获 `.py`，不读项目 pyc/额外同名模块，也不写 pyc。解释器自己的 stdlib/zip/扩展及其中 pyc 属解释器可信基，不是全部 Python 字节码都被禁止；任意用户 wrapper、解释器安装篡改、native preload、Windows `_pth` 配置不受此方案沙箱化。

### 当前任务 / context：仅身份，不读取任务材料

- scope 固定 `{executionRoot,sessionId,contextId,requestId,generation}`，contextId 来自 extension resolver；child memoized key 优先于 pin/hash。只在 child env 注入该 key，绝不修改共享 process.env。
- 实际叶子 `resolve_active_task(root)`（`active_task.py:299-343`）只读 own pointer + exact record；没有任务正常。新协议可 exit 0 表示结果传输成功，同时保留 valid/no-task/invalid-pointer/invalid-task；不能照搬 `task.py current` 的 no-task exit1 当运行失败。
- 复用 `task_records.py:23-94` 的 lexical task-store route、1 MiB、identity/status 校验和 `task_projection()`；最好抽取 `task.py:287-316` 的 current payload 组合为共享 helper，确保诊断与真实 CLI 不各自造结果。
- 允许显式顶层 external task store 和 archive **exact ref**；不枚举 sessions/tasks/archive，不读 children 的 task.json，不读 PRD/JSONL/research/references。记录 task.json 的 package/branch/status 不授予实施或 readiness。
- bounded workflow text → 从 `workflow_phase.py:65-100` 提取共享 `phase_index_from_text(text)`，再调用既有 Pi filter；只给解析结果/字节数，不输出整段工作流。无 Phase Index 是对应 context 能力未验证/不可用，不是用户定制违反模板哈希。
- 不调用 `buildTaskContext()`、task validate、get_developer 或 get_context CLI。`session_context.py:326-388` 默认路径会统计 journal、枚举活动任务和 Git history；新窄 projector必须共享 production 叶子，不能称已执行该全量入口。
- identity/workspace 只读有效开发者对应目录及有限现存文件；`paths.py:109-159` 的 main-checkout fallback 通过 `git.py:172-201` 枚举 registration 且无 timeout，不能直接调用。无 local/env identity、无已授权 source 时明确 fallback 未检查，不猜 commonDir.parent 或扫其他 worktree 找身份。

### Worktree：新增 identity-only，不包装现有 query

- `manager.py:34-60` 即使 ready=false，有 materials descriptor 仍调用 `material_summary()`；ready 路径还执行 target CLI。`lib/worktree-query.ts:21-43` 默认不强制 supported target。两者均不用于本诊断。
- 新 entry 只接触当前 checkout marker、own task 的 exact source binding、相关 target marker 和 Git identity。marker 是提示：先验证 claimed source 与本 checkout common Git 身份，再读 exact authority；own pointer 与 marker task 不一致要报事实，不能替换当前任务。
- 复用 `records.py:143-208` 的 parse/read/same_identity；可以报告 descriptor schema 错，但不读材料 snapshot、preparedFiles 指向文件、JSONL、任何材料 hash/graph，不能据 preparationState=ready 报 readiness PASS。
- targeted Git 最小集合：固定 `rev-parse --show-toplevel`、`--absolute-git-dir`、`--git-common-dir`，`symbolic-ref -q HEAD`；绝不 status/log/remote/commit 解引用。只启动已选 source/target，Git 输出交给 native helper解释，TS 不复制身份政策。
- 注册验证读该 target 的 `.git`→private gitdir、commondir、private gitdir/gitdir backlink，确认 private dir 属 commonDir/worktrees 且反向指回 target。支持相对链接；不 glob worktrees，也不 canonicalize 无关 registration。用 Git解析 refs，不自行读 packed-refs。separate git-dir/bare/不支持布局须显式未验证，不凭 commonDir 相同就通过。
- `records.repository()`/`binding_problems()` 没有上述窄 API：需要从 records 抽取共享 local identity/record equality，再补 targeted registration 检查；不改材料模块来加“skip materials”后假装 reader已窄化。
- 相关 target release只用 host `verifyRuntime(target)` 静态检查；不运行 target `task.py current`，不读取 binding.contextId 的 pointer。该 contextId 只是 binding identity 字段；current-session限定不会自动授权 target 其他会话读取。
- no-task/no-binding/notprepared 是正常或未使用；planning只影响执行授权。普通 linked checkout 的 worktree管理限制不等于本地 runtime损坏。锁/lease只作为现存证据，不获取、删除或推断 owner dead。

### 有界子进程：host统一 runner，Python 不启动下级程序

- 最简单的结构是 Python仅做 scoped reads/共享解析；Git是 host 同一个 async runner 的独立 child，传原始事实到内部 entry 的 identity分项。必要时固定两个内部阶段，仍是一条 `--check`、一份报告；不建立交互式请求执行任意 argv 的通道。
- 用 `spawn` + 同时排空两条 pipe，按 Buffer bytes计数、限长 stdin；超量马上终止且不解析被截断 JSON。建议起点：单项 3–5s、全程15s、每stream256KiB、read1MiB/累计8MiB、结果64项/报告16KiB；数值仍待设计确认，独立于用户“0=不限”的注入配置。
- 同一 monotonic deadline分配剩余预算；静态独立失败继续收集。收取 requestId/scope/schema，禁止从垃圾前缀搜索第一个 `{`。结构化区分 spawn/version/timeout/output-limit/protocol/exit/cancel/blocked，不把 stderr告警等同于执行失败。
- timeout/abort触发 TERM→短grace→强制kill；处理 error/exit/close/stdin EPIPE、清理timer/listener、终态只结算一次。不用 Promise.race丢弃仍存活的 child。受信任 entry不 fork、不调用 tempfile，所以无需嵌套 spool或常规进程树；任意解释器wrapper的子孙cleanup仍无跨平台保证。
- Git child env移除继承 GIT_* 后设 GIT_OPTIONAL_LOCKS=0，并关闭 core.fsmonitor；不屏蔽全部真实repo配置来伪造 identity。无 shell、npm、hooks、模型、target CLI或磁盘spool；TMPDIR指向项目也不写临时输出。Windows `.cmd/.bat` interpreter不以shell补救。
- generation在重复check/session_shutdown/start/reload时废弃并终止旧请求，完成前复核root/session。Pi 1.2.0 `types.d.ts:239-242,637-641`：ctx.signal在idle可能undefined；内部取消/超时可做，不能承诺用户Esc一定取消slash command。

### Exact Tests / 源码已有基础与必补契约

| 文件 / 当前基础 | 后续隔离fixture必须新增的断言；不作为现有PASS证据 |
|---|---|
| `tests/init-command.test.mjs:24-31,136-148` | 一条check、一份正常摘要；verbose/模式参数拒绝；淘汰现有“check必须列300+ legacy行”断言。Python失败仍保留配置/pointer独立异常；零dialog/refresh/reload/model/lifecycle。 |
| `tests/unsupported-runtime.test.mjs:21-72`；`manifest-provenance.test.mjs:72-131` | 坏/旧/缺/incomplete/source hash/mode/package baseline错误不加载任何项目源；stdlib环境探测独立计数，不能混入现有“startup零Python”断言。target gate只静态。 |
| `tests/runtime-fixture.mjs:8-27`；`runtime-contracts.test.mjs:121-143` | 新entry与closure进真实manifest/baseline，Python3.10语法、打包inventory/count同步；fake task.py旧worktree fixture不是supported-runtime证明。 |
| 新 `tests/diagnostic-runtime.test.mjs` | 在fixture放sitecustomize/usercustomize、site `.pth`、PYTHONPATH、cwd json/common影子、同mtime/size恶意timestamp pyc、unchecked-hash pyc和sourceless pyc；全部marker未执行。源码替换在capture前拒绝/capture后只执行原已验bytes；缺allowlist模块不得fallback。 |
| 同上 runner组 | 缺解释器、低版本、flags失败、UTF8/空/多个JSON/错scope、stdout/stderr flood、TERM不退出、stdin EPIPE、abort前/中、晚close、shutdown/repeated-check；验证实际owned PID退出和timer/listener清理，不仅Promise结束。 |
| `tests/task-context.test.mjs:90-94`；新增config组 | 共享snapshot与真实getters parity：0/quoted/+1/超JS整数/负数、重复section/key、unsupported YAML、invalidUTF8/permission、bool aliases、hook错误形态、default package失效；报告两个消费者不同值，零材料/包遍历。 |
| `tests/runtime-contracts.test.mjs:31-61,88-101,181-197`；`agent-context-integration.test.mjs:30-85` | 直接setter-free fixture pointer：own null/缺/空正常、invalid不同；child memo key/两session；external store、exact archive；读取spy禁止foreignpointer/其他task/PRD/JSONL，root/session换代晚报告不串。 |
| `tests/worktree.test.mjs:57-63,74-106`；`tests/python/test_worktree.py:31-37` | 原始records helper parity；identity-only对ready/unprepared/planning及坏materials都不打开snapshot/refs；target marker/branch/common/backlink mismatch、relative links/separate git-dir、无关坏registration不影响；零targetCLI/source lock。 |
| 新readonly组；`tests/skill-resources.test.mjs` | settings snapshot保host trust/merge且无settings.json.lock mkdir/unlink；TMPDIR=fixture、fsmonitor trap、no npm/helper/hooks；写/删/open-write syscall spy + before/after bytes/modes/index/pointers/bindings，捕获创建后删除，不能只比最终快照。 |

### External References / Related Specs

- [Python3.10 command line](https://docs.python.org/3.10/using/cmdline.html)；[importlib](https://docs.python.org/3.10/library/importlib.html)：-I/-S/-B与source loader/finder职责；不是OS沙箱文档。
- [Git rev-parse](https://git-scm.com/docs/git-rev-parse)；[worktree DETAILS](https://git-scm.com/docs/git-worktree#_details)：local identity、private gitdir/backlink与相对链接；当前文档新选项不等于现有Git全部支持。
- [Node child_process](https://nodejs.org/api/child_process.html)：pipe排空、shell区别、kill/close与直接child语义；宿主API以本机Pi1.2.0公开声明为准。
- `.trellis/spec/development/index.md`：Python authority、部署/源ownership、own-key、readonly不是沙箱；`.trellis/spec/testing/index.md`：真实fixture/禁止副作用与未执行不能PASS。

## Caveats / Not Found

- 当前没有diagnostics entry、config snapshot/pure统一接口、bounded workflow/current payload projector或targeted identity API；必须小范围新增/抽取并被真实consumer复用。仅诊断自造projector的自测不证明生产链路。
- 任意解释器/stdlib/native library可信度、全平台强制子孙退出、内核/网络文件系统I/O硬预算不由普通child runner保证；无OS级只读沙箱。descriptor nofollow只管最终文件，祖先竞态/多文件瞬时一致性仍有限，变动报告inconclusive，绝不获取写锁“修正”。
- 没有宿主actual loaded resources/settings/SDK agentDir完整snapshot；readonly fromStorage只解释已见文本，不证明所有技能已加载。无授权来源的main-worktree identity fallback、全量default-context wrapper、写权限、模型连通性明确未验证。
- 行号对应读取时工作区；并行修改materials/workflow/baselines须由后续实施重新核对，不能覆盖或为本研究regenerate。仅源码/官方文档阅读；未运行项目probe、测试、hooks或生命周期命令。
