# Stage 3 独立检查

## 范围与边界

2026-10-14，仅检查 `.trellis/tasks/10-14-user-level-project-activation` 的 Stage 3。任务由首行 dispatch 明确指定；随后收到“本会话 no active task / 修改代码先审批”，因此本次不修改产品、测试或使用文档，只按原 dispatch 要求保存本研究报告。没有 task start/finish/archive、commit、install、个人 settings/reload、递归 agent 或 managed worktree 操作。

Stage 1 `568634f`、Stage 2 `740824c` 是已接受检查点，不重新评审其 committed changes。dispatch 未另给 `Review base:`；本次 Stage 3 变更均在 unstaged，index 为空。检查了实际 status、unstaged diff、cached diff 和 untracked 清单，没有把空 index 当成无工作。

完整读取的 Stage 3 文件共 10 个：

- `scripts/install.sh`
- `tests/trellis-patches.test.mjs`
- `README.md`
- `docs/{initialization,task-display,task-viewer,dispatch,index}.md`
- `.trellis/spec/{development,testing}/index.md`

使用完整注入 PRD/design/implement/current check refs、两份 thinking guide、host lifecycle 研究；加载适用 trellis-check skill。为核对文字，完整读取 `extensions/trellis.ts`、`lib/project-state.ts`、`lib/adapter-resources.ts`、`lib/initialization/{engine,command,resources,adoption}.ts`、`lib/task-browser/command.ts`、`lib/subagent-rpc.ts` 及相关 activation/host/skill/display 测试。宿主核对使用已有 Pi 1.2.0 的完整 package CLI 文件和完整 bind/reload/discovery/resource methods，不访问 private API 执行产品行为。

并行 `.trellis/.pi-trellis.json`、部署 manager.py/records.py、`.trellis/workflow.md` 和 `10-14-runtime-tool-names` 保留、未读取其内容或编辑、不纳入 Stage 3 审查；全量测试是当前树验证，不等于评审这些并行变更。

## 发现（未自修）

### 1. installer 的 strict argument 计划尚未完整落实

`scripts/install.sh:10-14` 只拒绝重复 `--local`；重复 `--source`、`--check`、`--dry-run` 仍接受。`tests/trellis-patches.test.mjs:144-163` 只覆盖 scope、read-only 和 obsolete flags，缺 strict invalid/repeated/help/source argv 的持久回归。

实际一次性 disposable fake Pi 复现：

- `--source git:first --source git:second`：exit 0，并调用 fake Pi，argv 为 `install`, `--approve`, `git:second`。
- `--check --check`、`--dry-run --dry-run`：exit 0，不调用 Pi。
- `--local --local`：exit 1，不调用 Pi。
- `--help`：exit 0，不调用 Pi；unknown、缺 source、空 `--source=`：exit 1，不调用 Pi。
- `--local --check`、本地路径 `--source <tmp> --dry-run`：exit 0，不调用 Pi。

这是既有 parser 接受行为未被 Stage 3 的 strict argument 计划收紧，而不是默认用户级安装失败。建议主会话明确重复选项策略；若遵循严格单次策略，对所有 singleton flags/source（含 `--source=` 混合拼写）拒绝重复，并加入不调用 Pi、不改 fixture 的回归。最新只读边界下未改代码。

### 2. 接管确认的文档高估了 per-path 展示

`README.md:41-43` 说一次确认列出 Install/Replace/Create/Preserve/Current resources 和 legacy paths；`docs/initialization.md:42` 同样说确认前列出具体路径。实际 `lib/initialization/adoption.ts:77-84` 的 `adoptionDialog()` 只显示各类数量、legacy 数量、绝对根及破坏性提示；完整路径通过 `/trellis-init --check` 的 `adoptionSummary()` 查看。

建议仅校正文档为“确认显示分类计数；先用 --check 查看完整路径”，不要为了文档修改已有安全 UI 设计。此为原有文字的当前 scoped 准确性问题，非 Stage 3 新增产品缺陷。

### 3. 模板 Spec 文件描述不准确

`docs/initialization.md:52` 写“包自带入口与三个 thinking-guide 文档”。实际 `lib/initialization/resources.ts:118-124` 的 Spec 四文件是 `spec/index.md`、`spec/guides/index.md`、`spec/guides/code-reuse-thinking-guide.md`、`spec/guides/cross-layer-thinking-guide.md`，即两个 index 和两个 thinking guide。建议用这些实际四文件或“两份索引与两份 thinking guide”说明，不改模板/manifest。

除上述计划/文字问题外，未发现 Stage 3 默认用户级/--local、command vs tool、无效项目无常驻显示、有效无当前任务保留计数、Git 根发现、reload/静态 skills/noSkills/filter/trust、Pi 最低版本 1.2.0 的新问题。

## 验证与证据

环境：darwin/macOS，Node `v24.14.1`，Python `3.14.7`，已有 Pi `1.2.0`。host 路径为 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`；版本从其 `@earendil-works/pi-coding-agent/package.json` 实读。

首轮独立 focused 未指定 host peer：三个 test-file 在 preload 因缺本地 `pi-tui` 失败，0 PASS / 3 FAIL；不是产品失败。日志 `/tmp/pi-bg/booae51vc.log`。该复合命令末尾成功导致整体 exit 0，不能把 job exit 0 报成测试成功。未安装依赖，改为现有 host 路径后显式 `set -e` 重跑。

最终 focused：

```bash
set -e
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test \
  tests/trellis-patches.test.mjs tests/skill-resources.test.mjs tests/project-activation-host.test.mjs
bash -n scripts/install.sh
python3 -B .trellis/scripts/get_context.py --mode packages
git diff --check
```

**25/25 PASS，exit 0**；0 skipped/cancelled。日志 `/tmp/pi-bg/bjz6p07oy.log`。Shell syntax PASS；spec discovery 为 `development, testing`，实际均为有内容 index；diff whitespace PASS。主会话 focused `bsj1d86e1` 也为 25/25，但不替代本次独立运行。

最终 full：

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  npm test
```

**442/442 PASS，exit 0**；0 skipped/cancelled，耗时 `128430.653ms`。日志 `/tmp/pi-bg/btji155hf.log`。运行期间本审查员没有修改任何输入。

只读 Python 检查器核完整 scoped Markdown 的相对 links/anchors 与 final newline/尾部空白：**8 文件、34 本地 links/anchors PASS**。task required artifacts存在、check.jsonl 5 条 file parse/existence PASS；implement.jsonl 故意为空，未把 task validate 说成 PASS。实际 untracked 是并行 runtime-tool-names；没有相关未读新产品文件。保存本报告后再核 untracked 本报告空白和 diff。

Lint / static TypeCheck：**Unavailable**，package.json 无相应 scripts；Node 执行 TS 不等于静态检查。

专门 Python unittest、真实 PTY/在线 provider/model、持久会话 resume/switch 和旧 Pi 版本矩阵：**NOT_RUN**。npm suite 的 runtime fixture/真实 SDK registry/filter/command parser/reload 是实际离线机制验证；fake UI 回答不是物理终端，不删除旧会话历史，不宣称任意 cwd 热注销。

## 结论

Stage 3 独立审查完成，当前代码测试通过，但 strict argument 计划与两处当前文档准确性仍需主会话处理或明确接受。零产品自修、三项发现未修；不宣布整个任务验收或生命周期完成。用户级默认和项目级显式安装行为已确认，read-only wrapper不调用真实 Pi；没有个人安装/reload或项目自动初始化。

## 主修复后的最终复核

2026-10-14，主会话重新派发只读 Stage 3 verification，并要求追加本结论。完整读取最终 `scripts/install.sh`、`tests/trellis-patches.test.mjs`、README 和初始化文档，核实际 diff/status/index/untracked。产品、测试与使用文档均未由审查员编辑。

三项发现均已解决：

1. Installer 用共享 `SOURCE_SEEN` 拒绝两种 source 拼写的重复，`--check`、`--dry-run`、`--local` 同样拒绝重复，均在调用 Pi 前 exit 1。新负面 test 覆盖 check/dry-run/local 和 source 两种混合顺序，断言 `Repeated`、未调用 fake Pi、原 fixture 文件字节不变。原默认用户级、显式 local、read-only、obsolete flag 回归保留。
2. README 与初始化文档改为确认摘要显示分类数量，先用 `/trellis-init --check` 查看完整逐文件列表，与实际 adoptionDialog/adoptionSummary 一致。
3. 初始化文档明确模板 Spec 是两个索引与两个 thinking guide，与实际四目标一致。

最终 affected focused 实际命令（同步执行，exit 0）：

```bash
set -e
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test \
  tests/trellis-patches.test.mjs tests/skill-resources.test.mjs tests/project-activation-host.test.mjs
bash -n scripts/install.sh
git diff --check
```

**26/26 PASS，0 failed/skipped/cancelled，耗时 10424.032ms**，包括新增 duplicate-option 回归；shell syntax 与 diff whitespace PASS。主会话 `bk7urads4` 也为 26/26，但最终判断使用上述独立执行。

完整 scoped 文档再次通过 **8 文件、34 local links/anchors、5 check.jsonl references** 检查，包含 final newline/尾部空格。

`git diff --quiet 740824c -- extensions lib runtime resources package.json` exit 0：Stage 1/2 产品 owner 与已接受 Stage 2 HEAD 字节一致。`git diff --name-only 740824c -- tests` 仅有本阶段 `tests/trellis-patches.test.mjs`。因此上轮独立 full **442/442** 仍是未改变 Stage 1/2 产品及既有 suite 的有效证据；此次改变的 installer 与新增 regression 已由最终 26/26 focused 重新覆盖。**未再次执行最终 full，不称 443/443 full PASS**；不要把历史全量计数当成新增测试已在全量重跑的证据。

最终 verdict：**无剩余 blocking 或 nonblocking findings**，Stage 3 三项问题已主修复且独立复核通过，可以由主会话核 scope 后决定接受/提交。Lint/static TypeCheck 仍 Unavailable；真实 PTY/provider、旧 Pi 矩阵及持久 resume/switch 仍 NOT_RUN。index 为空，并行部署 runtime/manifest/workflow/runtime-tool-names 保留；没有提交、安装、个人 reload、递归 agent 或生命周期操作。
