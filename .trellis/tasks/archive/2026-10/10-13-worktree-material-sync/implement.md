# 实施计划：Worktree 材料同步与渐进式执行协议

## 门禁

- [x] 用户批准创建 task，认可 PRD 方向。
- [x] 核对新 Python CLI/宿主边界，完成材料及协议研究。
- [x] 用户否决旧 worktree 兼容，移除迁移/legacy baseline 范围。
- [x] 完成最终 design/implement 草案与真实规范清单。
- [x] 用户已明确批准最新 design.md/implement.md 与实施，主会话已将源 task start 为 in_progress；本子代理不执行生命周期。

## 实施顺序

### 1. Python 选择、快照和差异

- [x] 阅读现有核心/完整测试，复用 selection 与完整材料校验；增加 overlay 文件读取用于无写入预检。
- [x] 首次 prepare 建立有界 hash-only 快照、accepted source 与共同祖先；task.json 要求投影保留生命周期。
- [x] binding/query schema 校验新增 descriptor；不写旧 worktree 迁移逻辑。
- [x] 三方分类覆盖新增/删除、引用移除 detached、已改 orphan、双角色/目录引用；保留目标单侧祖先。

### 2. refresh/collect CLI

- [x] operation-specific parser/help：refresh、collect 重复 --file 合法，但同路径/alias重复拒绝；未知/空/不适用参数无写入。
- [x] 沿用预览→批准→confirm；不新增 --expect/token。confirm 锁内重算，全量预检、逐文件重查。
- [x] refresh 不 start/hooks，不复制业务/基线文件；冲突/active/unknown 拒绝；失败保留现场/error。
- [x] collect 无选择仅列候选；显式文件、逆向冲突、依赖同时选择、task.json禁收/目标删除不传播。
- [x] 快照 publication/revision 与 remove 成功后的绑定私有快照清理，保持原 clean/ancestry 安全。

### 3. 新鲜度、宿主与动态事实

- [x] Python status/query 有界 summary；源漂移/双侧冲突阻断派发，目标单侧变化报告不新加角色矩阵。
- [x] host 锁内 latest query/render/最终重查；Python唯一规则 owner，TS仅使用 opaque revision/fingerprints。
- [x] prompt/执行记录加入本次材料版本，保留头部解析与 marker 防伪、字节预算 fallback。
- [x] check 当前性加入要求版本/源漂移判断；保留原 checkout snapshot/terminal 状态，不虚构 acceptance。
- [x] 回归 early terminal、pending shutdown、stop 不清 lease、真 ID 与 cwd/off。

### 4. 渐进式协议

- [x] 实施前完整阅读官方 Pi extensions.md 及相关 API 文档，核对现有 sections/event 用法。
- [x] docs/worktree-execution.md 最短正常路径+按需分节，管理命令固定项目入口，参数交给 CLI help。
- [x] 收敛现有 renderOverview 两行到约3–4行与包内可读文档路径；主/子角色按派发事实区分，不用 hasUI。
- [x] 角色变化失效对应缓存，子代理不加载管理教程；保留独立 pointer、workflow/state 的职责。
- [x] 工具描述/拒绝文案短说明，不重复教程，缺文档/CLI明确诊断不安装。

### 5. 验证与收尾

- [x] focused/default suite 包含所有新增测试及 Python 入口。
- [x] README/英文正式 spec 更新，不修改项目 workflow/定制 agents；相关 JSONL/链接/实际diff检查。
- [x] 独立 trellis-check 已完成审阅、范围内修复与最终验证；见 research/check-results.md。
- [x] 主会话核实实际修复并重跑最终全量测试：144/144 通过；用户验收及提交/部署仍待单独授权。
- [x] 汇报成果，不自行部署/重载/stage/commit/push/archive/清理真实worktree。

## 验证矩阵

- 首次未提交task prepare、hook目标分歧、源代码/index/指针保留。
- 无变化/源单侧/目标单侧/相同收敛/双侧冲突；保留目标祖先后再次源更新必须冲突。
- 新增/删除/移除引用但文件还在、双角色共用、目录图、缺依赖、unsafe path/symlink/UTF8/数量边界。
- preview不写文件/快照/缓存；confirm重查变化与中途失败保留；active/unknown无变更。
- collect显式新报告、幂等、源冲突、清单依赖、task.json禁收、目标删除不删源；未选源漂移仍存在。
- 源PRD/投影/引用变化无spawn；render期间变化不派发；最新revision进record/prompt；refresh无目标字节改变旧check也过期。
- 主会话/无UI主会话/受管子代理说明、角色缓存切换、文档包路径含空格或移动、缺文件无自动修复。
- 现有 strict CLI、部署保护、stop/unknown 与 cwd/off 回归；无旧worktree迁移测试。

```bash
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
env -u TRELLIS_CONTEXT_ID node --test tests/worktree-cli.test.mjs tests/preparation.test.mjs tests/material-sync.test.mjs tests/worktree-protocol.test.mjs tests/dispatch.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
python3 .trellis/scripts/task.py validate 10-13-worktree-material-sync
git diff --check
```

补充新增 material-sync 测试到 focused 命令；记录真实环境。无lint/typecheck脚本不虚构通过，Python最低版本语法不等于实际运行；真实provider/部署测试另需授权。

## 风险/回滚点

先快照与算法，后CLI，后query/host，最后注入；各步测试验证，不交付半完成规则。多文件/跨目录publish不是事务，source lock不锁外部编辑器，保留error及材料，不自动rollback/reset。快照hash用于版本/冲突判断，不是全沙箱。同步与证据可追溯到本次记录，不新增历史ledger。

## 实施证据

产品实现、自检、独立检查与主会话最终复核已完成；用户验收和提交/部署另行授权。主会话核对 identity/overlay ancestor/task symlink/regular-file 修复后，运行 `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test`：144/144，fail 0，自然结束，日志 `/tmp/pi-material-main-final.log`；`git diff --check` 通过。实施命令与并发边界见 [implementation-results](research/implementation-results.md)；独立修复、最终命令与限制见 [check-results](research/check-results.md)。
