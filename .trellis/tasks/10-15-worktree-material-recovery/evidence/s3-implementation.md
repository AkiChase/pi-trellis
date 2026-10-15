# S3 实施交接：角色、政策与源权威指引

## 状态与边界

仅实施 S3；S1 `9ec131f`、S2 `176619d` 产品 owners 未改。本实现者没有 commit、start/finish/archive、递归派发、安装/部署/reload、真实项目 worktree 或真实 provider probe。最终focused94/94、全量478/478自然exit0；optional provider仅syntax，NOT_RUN。源项目 `/Users/jyxc-dz-0101322/tools/pi-trellis`，执行目录相同；本轮按已批准的普通实现派发读取任务，不把本次旧普通派发文本当成 S2 完整 authority header 的验证证明。

当前是实现者自检交接，不是独立审查或主验收。主会话需核实际 diff/证据、处理下述范围外残余，再独立检查、复测和精确 stage。

## 实際修改

- 删除 `scripts/sync-agents.mjs`，不留替代生成入口。
- 直接维护 `agents/trellis-{implement,check,research}.md`：严格四行 authority + 空行、native authority 非纯文本授权、绝对源材料路径、执行代码根、完整分页、无 local-current/目标副本 fallback、无 complete-injection 捷径、实际阅读报告和 hash 局限。
- implement/check 默认只读源材料，返回结果/证据；仅明确路径范围授权写源任务 `evidence/`。research 无 implement/check manifest 要求，只有明确授权才写源任务 research，未获写授权返回研究结果而不是擅自建目录。保留工具/frontmatter、递归/生命周期/提交限制、来源和 AGPL 声明，新增直接维护修改说明。
- `skills/trellis-{start,continue}/SKILL.md`、workflow 模板和项目 workflow 对齐源材料/执行代码双根与主引用恢复职责。项目 workflow 的既有 `ordinary Agent`→`ordinary subagent_run` 并行 hunk 保留；主提交时不要把该旧改动误归 S3。
- 中文 `docs/{worktree-execution,dispatch}.md` 对齐实际 CLI：prepare `--role implement|check|research`、零复制/目标 start/hooks、live source 引用修复、严格 v2/no migration、占用/unknown/恢复/移除。`/trellis-init` 使用无参数菜单 Check，明确仅资源事实，不写旧 `--check`。
- 英文 development/testing spec 仅修当前契约，删除生成器教程、material-sync 矩阵和双副本/ancestry要求，保留原上游 artifact integrity、历史来源及开发测试方法职责。
- `tests/{agent-documents,workflow-policy,manifest-provenance,worktree-protocol}.test.mjs` 更新直接角色/source authority/分页/写授权/来源合同。
- `tests/initialization.test.mjs` 唯一 literal35 改 `Object.keys(runtimeBaseline().files).length + 3`，不修改并行菜单/初始化 owners。
- `tests/provider-contracts.mjs`（默认 glob 外）移除已删除 loader API；用 `queryWorktree`→`requireMaterials`→`assembleDispatchPrompt`→`parseDispatchFacts`。原任意 target 目录不再能获得合法 authority，因此脚本内部建立临时同仓库注册 worktree、native adopt/prepare 后才调用 runner。实际 read tool calls 读取绝对 source paths；断言正文不在首请求、仅出现在成功 read results，target stale body不成为权威。research输出改绝对源 research、产品在目标；共享 source probe 用另一个 unbound task；resume 不传 trellis role 触发绑定旁路。临时 `.pi` 被忽略，脚本需显式种三角色以满足真实 runtime验证。未运行这些 provider 行为，只有语法检查。
- 只更新三角色 adapted hashes、两个 skill当前 hashes、workflow模板当前hash；全部历史source/platform/version/adapted-date/sourceSha256及license/origin未变。`resources/runtime-baseline.json` 无需更新，33当前native文件全hash匹配；发布 executable总数动态为33+3=36，不伪重算历史来源。

修改范围共20现存文件 + 删除1文件，详见 `s3-owned-file-hashes.json`。该hash清单不包含并行产品文件，项目workflow整文件hash包含保留的既有ordinary工具名hunk，不代表那部分授权归属。

## 完整阅读记录

已完整读本任务 PRD/design/implement、空 implement.jsonl、项目workflow、development/testing及shared guides（含cross-layer/reuse）；trellis-before-dev/meta/check技能和相关meta引用。产品全文：`lib/{task-context,worktree-query,subagent-rpc}.ts`、`extensions/trellis.ts`（50KB首次截断后offset1173补至1297）、native `cli.py/manager.py/records.py/materials.py`。读实际init command确认无参数Check菜单；读三角色、生成器、两个skill、模板、两docs、四baseline。

测试全文：agent-documents/workflow-policy/manifest-provenance/initialization/worktree-protocol、provider-contracts、runtime/worktree fixtures、preparation/dispatch。provider脚本修改后再次完整阅读全文与实际diff。未读或执行第三方provider作为产品依赖；只搜索其现存runner路径帮助确认接线，不改provider。

源任务当前 implement manifest为空（本轮普通明确scope dispatch）；check manifest已有6有效引用。JSONL parse/existence通过不称空implement完整validate成功，主独立review前仍应确认实际check scope。

## 验证（真实命令/结果）

环境：Darwin，Node `v24.14.1`，Python `3.14.7`；宿主peer来自已有 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，无安装。

1. focused初次 `bonja08rl`：自然exit0，94/94。随后research外部不可用持久化句补授权围栏；初次结果不冒充最终资源字节。
2. 最终focused `bmc2yl18i`：自然exit0，94/94。命令：

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/agent-documents.test.mjs tests/worktree-protocol.test.mjs tests/manifest-provenance.test.mjs tests/initialization.test.mjs
```

3. 全量初次 `b9st1qlwo`：自然exit0，476/476；在最后research句修正前，保留为中间成功证据，不代表最终全量。
4. 最终全量 `btd2bwyup`：自然exit0，478/478（并行task-viewer新增用例使计数较初次476增加2）；最终S3相关输入已冻且hash复核一致。结果见 `s3-full-final.log`，不代替独立验收。命令：

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
```

5. `node --check tests/provider-contracts.mjs`：exit0；这只是syntax，不是provider行为PASS。默认glob不执行provider-contracts.mjs。
6. `git diff --check` exit0；affected Markdown13个相对链接目标存在，anchors从全文检查；`get_context.py --mode packages` exit0，实际development/testing两层；源角色JSONL可解析，check6行引用存在，implement0不称完整验证。
7. native current33hash与baseline一致，S1/S2 product owners和项目 `.pi/agents/` diff为空。未改项目manifest、并行task-viewer/其他task；full包含并行当时版本不等于本任务独立验收。
8. Lint/静态TypeCheck：package无对应script，NOT_AVAILABLE，不称Passed。真实模型完整读取/分页、真实终端/真实provider、真实project worktree/部署流程：NOT_RUN。

## 残余与主决策

最终当前指引grep发现范围外旧要求，未擅自改：

- `skills/trellis-meta/references/customize-local/change-context-loading.md:3` 仍要求 `material budget`/`complete-injection provenance`；`references/platform-files/hooks-and-settings.md:3`仍称config控制material budgets。这两引用不在本轮两个skill scope；建议主批准最小合同修正并仅更新own skill hashes。
- 其他skill尾部仍称所有 `.trellis/...` relative to execution project（before-dev/check等）；新角色优先协议已明确source绝对读取，但generic skill仍有歧义。未经范围扩大不批量改。
- `extensions/trellis.ts`文件头仍有失效`docs/trellis-agent-sync.md`注释链接，S2 owner不得擅改；本轮仅报告。
- `.trellis/scripts/` 是未部署旧runtime，仍有refresh/collect/copy实现；`.pi/agents/`旧角色也是部署/custom副本，不改不deploy。历史任务/日志中的旧术语不批量改。
- docs/spec当前匹配项主要是“没有complete-injection/no refresh/collect/无targetcopy”等明确否定说明，provider marker仅负断言；删除的sync-agents只在tests否存在与历史任务中出现，当前产品调用无残留。

本轮未发现需改S1/S2源权威产品逻辑的合同bug；主需对optional provider wiring做独立只读审查，真实probe未授权，不可为填PASS运行。
