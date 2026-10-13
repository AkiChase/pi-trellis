# 实施计划：原生 Python CLI 重构

## 前置门禁

- [x] 用户认可CLI管理+最小Pi执行入口，明确原生Python与固定项目内入口，不采用Python调用TS。
- [x] 中文PRD/设计/计划已同步到新方向。
- [x] 用户审阅本版完整安全核心迁移和部署方案并批准实施（本次派发已明确授权；不在子代理执行生命周期命令）。
- [x] 完整阅读相关Pi扩展文档、项目extension/scripts/shared规格、现有管理核心和所有调用测试。
- [x] 用户明确要求直接在当前本地工作区实施，不另建执行worktree、不添加忽略规则。安装、重载、提交及清理仍单独授权。

## 执行顺序

### 1. 行为基线与模块边界

- [x] 读取manager/config/worktree/bindings/preparation/cleanup/executions/task-context及其调用，列出安全契约与Python/TS保留范围。
- [x] 为Python材料验证制定等价规则，不把ready弱化为文件存在；确认支持Python版本与平台存活检测限制。
- [x] 迁移现有fixture断言至CLI子进程测试，保持源码/index/指针/产物保留断言；记录原测试基线。

### 2. 原生Python实现

- [x] 新增包内Python入口及私有模块，使用argparse/subprocess/pathlib等标准库，不依赖Node或SDK。
- [x] 实现create/adopt/status/prepare/recover/remove、明确task/cwd/json/confirm及严格解析。
- [x] 移植Git环境隔离、身份/路径/ignore、v1记录、atomic/source锁、错误保留。
- [x] 移植材料选择/冲突/ready、目标独立ID的task.py调用、删除/恢复边界。
- [x] JSON stdout稳定，诊断stderr；确认及错误路径无隐式副作用。

### 3. 项目入口部署

- [x] 独立部署`.trellis/scripts/worktree.py`和专属私有模块，不混入active_task.py补丁。
- [x] 安装check/dry-run/幂等更新与摘要机制，拒绝未知同名文件和定制内容覆盖。
- [x] 部署后不依赖包绝对路径，Node不可用时仍可独立执行；不在管理/prepare时自动安装或联网。
- [x] 用临时安装fixture验证脚本版本、文件权限、冲突和只读模式，不安装真实项目。

### 4. 宿主收敛

- [x] Python暴露只读机器查询，宿主派发复用其身份/ready检查；源锁内查询不再拿锁。
- [x] 保留TS的Pi事件/RPC、lease、snapshot和终态监听，验证跨语言记录/锁互操作与TOCTOU重查。
- [x] trellis_dispatch兼容旧调用并加入stop，可选空task恢复fallback；必需dispatch值仍严格。
- [x] 删除旧trellis_worktree注册和迁移完成的TS管理实现，检查所有活调用避免两套core/隐藏fallback。

### 5. 指南与整体验证

- [x] 更新主会话提示、普通Agent阻断、README为固定项目CLI入口和主流程；说明缺失部署、重载与旧接口迁移。
- [x] 更新历史计划现状标记和英文正式spec，不覆盖用户定制agents/生成workflow。
- [x] 完整独立trellis-check逐项PRD审阅并自修复，修正后重跑；这是代码审阅证据，不替用户宣布任务完成。

## 验证矩阵

- CLI解析：help、不适用/未知/重复/缩写/缺值/空值/控制字符，无写入。
- 管理：create/adopt/status及v1复用，身份/路径/symlink/metadata/ignore/锁/cancel/错误保留。
- preparation：完整材料、byte/UTF-8/引用/冲突/外部路径负例；显式源pin下目标独立ID，源状态与指针不变。
- 删除恢复：clean/ancestry/cwd/有效引用/活owner拒绝；预览无变更，确认不force/不删分支。
- 部署：临时项目check/dry-run/幂等、未知/定制文件保护、包目录移动后可用、Node不可用时Python管理可用。
- 宿主：旧派发兼容、stop等待终态、配置/角色/ready/源fallback拒绝、早终态/shutdown/占用；Python-TS锁记录互操作。

## 验证命令

```bash
python3 --version
# Python标准库unittest：按落地测试目录细化
python3 -m unittest discover -s tests/python -p 'test_*.py'
# CLI与宿主集成测试：命名暂定
env -u TRELLIS_CONTEXT_ID node --test tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/preparation.test.mjs tests/dispatch.test.mjs tests/trellis-patches.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
python3 ./.trellis/scripts/task.py validate 10-13-worktree-empty-strings
```

Python套件应进入项目测试入口，避免默认测试遗漏。记录实际运行环境及不支持平台；没有现成lint/typecheck不虚构通过。文档链接及未跟踪Markdown单独检查。真实安装/provider probe/monitor恢复不默认执行。

## 回滚与交付

整个入口/核心/部署/说明作为同一验收单元，不提前发布半迁移接口。v1格式不改，可恢复旧实现，禁止自动删除已创建目录、分支、材料或会话指针。准备/hook失败按保留状态诊断。

- [x] 记录所有验收结果和限制。
- [x] 明确spec复盘结论。
- [ ] 报告diff，单独请求提交/归档/部署许可，不自动推送或清理worktree。


## 2026-10-13 实施进度与证据

### 已完成

- 原生核心 `python/pi_trellis_worktree/{records,materials,manager,cli}.py` 与入口 `python/worktree.py`；标准库、Python ≥3.10语法，固定部署入口不依赖包位置或Node。
- create/adopt/status/prepare/recover/remove严格子命令；所有管理任务显式指定。未知、不适用、缩写、重复、缺值、空白和控制字符参数在变更前拒绝；JSON单对象，目标start/hook进度走stderr，入口禁写bytecode。
- v1源关联、目标marker、execution路径及source锁协议保留；Git重定向环境清理、canonical/dangling-link、ignore与身份规则迁移。确认下重查，失败保留产物，无force/branch删除。
- Python完整材料验证使用UTF-8流式检查、JSONL/目录数量界限、不受prompt byte预算影响；selected task-only复制、baseline字节/源status检查、target metadata仅branch例外、source pin不写目标指针。
- 新部署器 `scripts/deploy-worktree.py` 与active_task补丁分开；installer即使--no-patch仍部署CLI。摘要、未知/定制/缺失/unsafe path保护、check/dry-run/幂等/mode测试均覆盖；未部署到当前真实项目。
- 宿主 `lib/worktree-query.ts` 只读调用同一Python核心；派发锁内再次query不嵌套拿锁，lease PID仍是宿主进程。`trellis_dispatch`保留旧调用、支持action=stop、optional精确空串占位；stop成功不直接释放执行记录。
- 删除TS manager/preparation/cleanup/Git/tool管理模块（5个文件），移除TS旧worktree配置与ownerAlive死调用；保留host persistence/prompt/RPC/lease/terminal/snapshot。
- extensions不再注册trellis_worktree；overview固定CLI发现与缺部署提示、普通Agent拒绝文案、README、历史计划标记及英文正式spec均更新。未改workflow、bundled/custom agents、provider。

### 实际验证

环境：macOS，Python **3.14.7**，Node **v24.14.1**。

| 命令/检查 | 结果 |
| --- | --- |
| 改动前 `env -u TRELLIS_CONTEXT_ID npm test` | 67/67通过 |
| `python3 -B -m unittest discover -s tests/python -p 'test_*.py'` | 6/6通过，已由tests/python-worktree.test.mjs纳入默认npm test |
| `env -u TRELLIS_CONTEXT_ID node --test tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/preparation.test.mjs tests/dispatch.test.mjs tests/trellis-patches.test.mjs` | **47/47通过** |
| `env -u TRELLIS_CONTEXT_ID npm test`（最终代码） | **81/81通过** |
| Python `ast.parse(..., feature_version=(3,10))` 全部新Python源 | 通过；只是3.10语法检查，不代表在3.10解释器执行 |
| `bash -n scripts/install.sh` | 语法通过，不是lint |
| Markdown相对文件链接（README、历史计划、完整spec，共13文件） | 通过；未做anchor存在性检查 |
| `python3 ./.trellis/scripts/task.py validate 10-13-worktree-empty-strings` | implement/check JSONL各7条通过 |
| `get_context.py --mode packages` | 单仓库，extension/scripts发现正常 |
| `git diff --check` | 已修正首次发现的EOF/尾随空白，最终通过 |

测试中全部Git工作树/提交/安装器执行只发生在临时fixture，fake pi/trellis，不是当前真实项目。证据日志本机临时路径：`/tmp/pi-trellis-baseline.log`、`/tmp/pi-final-focused.log`、`/tmp/pi-trellis-final.log`；这些不作为需提交的稳定产物。

### 验收覆盖与限制

- AC1-AC9、AC11均有CLI/宿主fixture证据；AC10默认和focused套件通过。原worktree/preparation断言通过test-only CLI adapter运行真实Python，不留TS管理fallback。source staged/unstaged/untracked内容、**原始index bytes**、source指针/状态和target冲突文件有保留断言。
- 本节为实施代理当时记录；独立trellis-check已由主会话派发，结果见下方审阅记录。lint/typecheck脚本不存在，均**不可用/未运行**，不把Node执行当类型检查。
- 真实Pi/provider probe未运行，未安装/重载到当前项目，未恢复monitor，未提交/归档。当前`.trellis/scripts/worktree.py`仍不存在是刻意保留安装授权边界，不是自动部署遗漏。
- native Python只在macOS/Python3.14.7执行；3.10仅语法兼容证据，Linux/Windows本次未验证。非POSIX owner存活采用保守拒绝恢复，不用Windows os.kill(0)推断死亡。
- 部署多文件不是事务；中断/recorded文件缺失要求明确处理而非无条件修复。prepared旧target若缺本版native CLI/modules，需单独批准baseline/target更新；v1记录不迁移、不重建、不自动清理。
- preview/confirm、材料写入/hooks、跨目录record发布仍有既有非原子边界；snapshot不覆盖所有文件，大文件mtime只作保守新鲜度证据，completed不等验收。

### spec复盘

已将唯一Python管理/readiness owner、固定入口/严格参数、source-lock查询不加锁、host PID lease、stop终态、v1互操作、独立摘要部署和平台/事务限制写入英文正式spec。prompt rendering仍由TS负责byte预算与marker，不复制管理核心。下一步由主会话安排check并请求用户批准提交/归档/安装；当前子代理不执行这些操作。

## 2026-10-13 独立 trellis-check 审阅与自修复

审阅范围：全部实际 tracked diff、staged（为空）、untracked Python/部署/query/CLI fixture/任务文件；逐个完整对照 HEAD 已删除的 manager/preparation/cleanup/worktree/tool 实现与新 Python 核心。没有提供独立 Review base，未将其他已提交历史纳入审阅；HEAD 只用于上述工作区变更基线对照。已读 check.jsonl 全部引用与中文 PRD/design/implement，未使用摘要代替完整核心审阅。

### 确认并修复的问题

| 严重度 | 位置 | 问题与修复 |
| --- | --- | --- |
| 高 | records.py:read_json/json_value | 现存 JSON null 被当成记录缺失，可能绕过占用或覆写无效状态。现存记录必须为 JSON object；拒绝 NaN/Infinity，缺失仅限 FileNotFoundError。CLI 回归验证 execution/binding 原字节、目标和状态保留。 |
| 高 | records.py:owner_alive | 负数/0 PID 是进程组语义，ESRCH 不足以证明 owner 死亡。非正、非整数、权限错误与非POSIX均保守占用；仅正PID的明确ProcessLookupError可判死亡。 |
| 高 | materials.py:task_cli | 直接Git命令隔离了环境，但目标task.py/hooks继承Git重定向，可能查询或操作源repo/index。共享git_environment用于两条路径，目标CLI fixture内部断言无污染且git root是目标。 |
| 高 | subagent-rpc.ts | prompt在锁外组装，锁内Python查询期间材料更新后仍带旧完整marker。现在先锁内query，再同步render当前目标材料；回归在第二次current中修改spec并断言spawn只能看到新材料。 |
| 高 | subagent-rpc.ts | shutdown发生在spawn回复之前，owned尚为空，晚回复会复活running lease且监听器已卸载。增加shutdown状态，晚回复保留真实ID并记录unknown，不再派发；覆盖pending spawn时序。 |
| 中 | subagent-rpc.ts | 严格CLI字符串校验误用于prompt，正常多行/制表文本被拒绝。prompt单独验证非空/NUL，完整保留旧调用与多行正文；task等标识仍严格。 |
| 中 | manager.py:remove | --cwd可隐藏实际进程cwd，CLI能尝试删除自己所在目录。删除同时校验真实os.getcwd与显式cwd，拒绝且保留target/binding。 |
| 中 | deploy-worktree.py | null manifest被当作首次部署、true与数字1等价、摘要值未校验。现存清单严格object/int版本/64位小写SHA256；check/dry-run/normal都拒绝并保留原字节。补祖先symlink保留断言。 |
| 中 | materials.py:references | canonical去重可让PRD空文件通过alias隐藏；独立验证required PRD，不受引用顺序影响。Python文本自动换行转换还曾把裸CR当JSONL分隔，现仅按LF/CRLF，与宿主一致。 |
| 中 | manager.py:snapshot | Python codepoint排序与Node UTF16排序不同，emoji/私用区文件名使同一host快照误报stale。采用UTF16排序，host写snapshot/Python status与后续变更断言互操作。 |
| 中 | bindings.ts:atomicJson | 宿主原子写入未拒绝最终symlink，和Python及spec契约不一致。写前/rename前lstat校验，拒绝并保留link和被指向文件。 |
| 低 | README/英文spec | 修正installer实际顺序（CLI→patch→install）、Git隔离范围、真实cwd、shutdown/PID、snapshot排序与JSON object说明，避免超出实际行为。 |

此外补齐task.json/JSONL 1MiB、128目录/512条目/512引用、流式UTF8跨chunk、空PRD别名、PID不确定性等负例。未修改工作流、provider、ignore、bundled/custom agents或真实项目脚本。

### 最终验证

| 命令 | 实际结果 |
| --- | --- |
| 审阅开始 `env -u TRELLIS_CONTEXT_ID npm test` | 81/81通过（仍发现上述未覆盖问题） |
| `python3 -B -m unittest discover -s tests/python -p 'test_*.py'` | **11/11通过** |
| `env -u TRELLIS_CONTEXT_ID node --test tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/preparation.test.mjs tests/dispatch.test.mjs tests/trellis-patches.test.mjs` | **54/54通过** |
| `env -u TRELLIS_CONTEXT_ID npm test`（全部自修复后） | **88/88通过** |
| 12项guard mutation（临时源码副本） | 全部检测到：null record、PID、PRD alias、target Git环境、null manifest、actual cwd、多行prompt、inflight shutdown、旧prompt、Unicode顺序、bare CR、host symlink guard。每项移除guard均使对应断言失败，未修改工作区源码做mutation。 |
| 3.10 AST syntax / `bash -n scripts/install.sh` | 8个Python源语法通过；shell语法通过，均不等于lint/typecheck |
| Markdown文件链接/尾随空白 | README、历史计划、完整spec、任务Markdown共16文件通过；未检查anchor |
| task.py validate / get_context.py --mode packages / git diff --check | JSONL各7条通过；extension/scripts发现正常；diff通过 |

环境仍为macOS/Python3.14.7/Node24.14.1。审阅临时日志：`/tmp/pi-check-final.log`、`/tmp/pi-check-final-focused.log`、`/tmp/pi-mutation-*.log`，不是提交必需的稳定产物。

### 未解决限制与交付边界

- 无剩余已确认的范围内代码阻断；任务继续in_progress，用户验收/提交/归档/部署由主会话处理。
- 无lint/typecheck脚本，不标为通过；未运行真实Pi/provider probe，未安装/重载真实项目，未启动monitor或建立实际项目worktree，未提交/推送。
- Python3.10只语法证据，Linux/Windows未执行。POSIX PID复用可保守阻断恢复；owner死亡也不能从OS证明所有detached child已停，维持明确用户recover语义。
- source锁串行化本管理器/宿主reservation，不锁外部Git/编辑器/第三方RPC；query无递归锁。仍有多文件部署、跨目录record发布、selected copy/hooks和最终symlink祖先竞争等非事务边界，不声称OS沙箱/原子安全。
- snapshot排除目录/大文件mtime限制不变。材料完整验证流式读取但copy仍读取完整selected文件；子进程output先spool到临时磁盘再检查上限，不是实时磁盘配额。
- 旧v1记录保留格式与路径，但旧target缺native CLI/modules仍需单独批准target/baseline更新；实际`.trellis/scripts/worktree.py`保持未部署。JSON null等无效记录明确拒绝而不是迁移/删除。


## 主会话最终复核

- 核对独立check的实际源码修复与范围；另补stop非空agent/prompt不适用字段拒绝，测试断言无stop RPC且lease不变。
- 最终 `env -u TRELLIS_CONTEXT_ID npm test`：88/88通过，exit 0；包含Python unittest入口。`git diff --check`通过。
- 生命周期spec补充可执行接口、JSON/环境契约、错误矩阵、正负例、测试断言和Wrong/Correct；正式spec英文，任务证据中文。
- 未部署/安装/重载、提交/归档、创建实际worktree或恢复monitor；待用户验收及提交许可。
