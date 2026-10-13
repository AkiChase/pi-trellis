# 初始化子任务独立检查结果

## 结论

**已完成独立检查和局部自修，但仍有 1 个 standalone 验收阻塞，不能勾选全部验收。** 未提供 Review base，未猜测提交基线；检查覆盖当前 unstaged diff、cached（为空）、相关 untracked 源码/资源/测试和任务资料。没有其他 agent 派发，没有安装/网络/提交/切换分支/真实项目 init；没有修改实际 `.trellis/scripts`、`.agents`、workspace/developer/current pointers 或迁移器。只写本子任务 research，保留已有 runtime/并行 specs 改动。

## 已阅读范围与依据

完整读取父/子 PRD/design/implement、授权、upstream init audit、UX、implementation-decisions/results/template inventory，check JSONL 所列材料和 extension/scripts owning specs/共享 guides。完整读取初始化 engine/command、adapter resources、extension、RPC/query、共享 developer/task_store helpers、相关新测试、36 个包技能与引用闭包、13 个模板、发布/来源文档。Native 7 文件按 runtime baseline 原 Git bytes 比对，无算法改动。

实际宿主：`/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`（Pi 1.2.0）。阅读本机 docs/extensions/tui/settings/packages/skills/rpc-extension-ui、reload-runtime 例子和 PackageManager resolve/filter 实现。真实 loader/resolver suite 验证无脚本也发现 init command/10 skills；normal `extensions:[]` 禁用，`autoload:false` 的空数组为空 delta、不禁用；显式排除禁用，project precedence 和无缺失包安装有效。Native select/input/confirm、RPC hasUI、placeholder、command-only reload 用法与文档吻合；没有视觉 TUI/provider 验收声明。

## 发现并修复

1. `lib/initialization/engine.ts:249`：重算未认证 planHash 可伪造 incomplete operation，写任意 `.trellis/scripts/custom.py`、替换 runtime/root bytes、把现有 identity/history 原 hash 作为覆盖许可。现严格字段/schema/type/path 集合；所有非 root actions 原 fingerprint 必须 null；从包资源和共享 runtime skeleton 重建 exact output/mode/kind，要求全部必需输出、manifest 最后发布。root 只允许 canonical block 增量，验证 original prefix hash/mode，拒绝 duplicate/custom/conflicting attributes；支持的 identity 操作先核验现有 release。保留 unknown custom hook，但绝不把它列为可恢复受管写入。
2. `engine.ts:126`：资源 manifest 仅校验 runtime 及宽泛 kind，接受未知 template/source/缺 role/伪造 initial hash。现校验精确 32 runtime + 3 role + 8 editable-template 元数据集合、source/kind/full hashes/modes；模板指纹仍不要求当前 editable bytes 不变、不授权覆盖定制。
3. `engine.ts:333,137`：输出被删除仍可能发布清单并宣称 ready；清单已写但 operation incomplete 仍能通过 runtime guard。现发布清单前和完成前验证全部 required output，失败保留 task/history；incomplete/invalid operation 即使有清单也拒绝执行。身份-only恢复先核验 supported manifest，避免写身份后才发现不支持。
4. `engine.ts:244`：同名 onboarding 的 name/status/title/list 字段畸形仍可复用。现复用校验 canonical identity/name、合法状态、标题/description、字符串数组与非空 PRD，不重写用户任务。
5. `extensions/trellis.ts:297`：TS disk fast path 把 `{}`/无效 title/status/非task对象当 Active task，绕过真实 CLI invalid-record。现在投影 path/artifacts 前校验与 fixed runtime 一致的 bounded nonempty identity fields，invalid 落 CLI task_error，不注入 Active task。

只改 `lib/initialization/engine.ts`、`extensions/trellis.ts` 本任务局部、`docs/initialization.md` 和新增 `tests/init-review.test.mjs`（22 tests）。没有修改 runtime 源码/hash；runtime release 仍为 `pi-trellis-runtime-v1-56affc3695c933701b71c8f4ccfc0afa80ee526927759088c173c5c3ac7e608b`。

## 红→绿证据

仅 temporary fixtures，拒绝断言伴随完整 bytes/modes/directory snapshot 保留。

- `/tmp/pi-init-check-red.log`：14 tests，2 pass / **12 fail**，覆盖伪造 operation 和 manifest。
- `red2.log`：16 tests，14 pass / **2 fail**，root duplicate/skip 与 malformed task reuse。
- `red3.log`：19 tests，17 pass / **2 fail**，required output 删除和 incomplete runtime authorization。
- `red4.log`：21 tests，19 pass / **2 fail**，attributes conflict bypass、unsupported identity publish（原实现在失败前已改 fixture 文件）。
- `red5.log`：invalid disk authorization **0/1**；`green5.log` **1/1**。
- 最终含全部 22 adversarial tests 的全量 suite 全绿（下文），不是以删负测/生产 bypass 达成。

## 未修复阻塞

**`extensions/trellis.ts:731` session() 忽略 verifyRuntime(root) 的 undefined，manifest-less 旧运行时仍获执行。** Disposable 脚本 writes `executed-unverified`；before_agent_start 后 marker 存在，command-bearing bash task.py finish 不 block，发出 `No active task`。详细复现 `check-legacy-probe.md`。

这违反父/子“未知运行时只读”的安全目标；不是 native algorithm 问题。当前 integration/display/protocol/runtime-child fixtures 使用无清单假脚本，修复须主会话统一迁移这些 fixture 到真实发行基线并保留 session provenance、child failure/non-resurrection 负测。checker 没有为维持绿测加 legacy bypass，也未大范围改造所有 fixture。**全量测试通过不等于该要求已验收。** 建议先修此 guard + fixture 体系，再进入 migration；普通非Trellis探索仍保持不拦截，真实 shell/provider 不是 sandbox。

## 实际最终验证

全部 Node 命令使用 `PI_TRELLIS_TEST_HOST=<上文实际路径> env -u TRELLIS_CONTEXT_ID`，只改测试子进程环境。Node v24.14.1 / Python 3.14.7 / macOS。

- focused：`node --import ./tests/host-tui.mjs --test tests/init-review.test.mjs tests/initialization.test.mjs tests/init-command.test.mjs tests/skill-resources.test.mjs tests/runtime-contracts.test.mjs tests/dispatch.test.mjs`，**105/105**（final disk fix 前）；log `/tmp/pi-init-check-focused-final2.log`。
- 最后 disk fix 后：`node --import ./tests/host-tui.mjs --test tests/init-review.test.mjs tests/agent-context-integration.test.mjs tests/task-display.test.mjs tests/initialization.test.mjs`，**81/81**；log `/tmp/pi-init-check-final-disk.log`。
- **最终 npm test：235/235，0 failures，118.97s**；log `/tmp/pi-init-check-final-full.log`。覆盖最终全部修改。此前 232/232、234/234 是中间版本，不冒称最终。
- `PYTHONDONTWRITEBYTECODE=1 python3 -B .trellis/scripts/task.py validate .trellis/tasks/10-13-standalone-init`：implement/check 各 8 条通过，只读。
- `python3 -B .trellis/scripts/get_context.py --mode packages`：single repo，extension/scripts 两层。
- `bash -n scripts/install.sh`、`git diff --check`：通过；installer 未执行。
- 重算 runtime32 / skills36 / templates13 全 hashes 一致；原生 files 与记录 Git baseline byte-identical。真实 pack closure/import/Python3.10 AST 测试在 full 中通过。
- Lint / static TypeCheck：项目没有支持命令，**不可用**，不把 TS 执行当 typecheck。

## 限制与后续

未做 real visual TUI、真实 provider/model、跨平台/多Python版本、真实部署/安装/reload。本次保留 package-owned input trust与用户受管路径边界，不做通用 OS sandbox；祖先竞态/逐文件非事务/操作记录出现前极早失败/死锁人工核对等已有限制继续披露。严格 recovery schema 只支持本次新操作，不新增 legacy migration。

主会话后续需要同步 owning specs 的 init/资源/无清单边界（现有 session/installation specs 有历史行为，不能当最终 standalone 契约）、修剩余 guard 并重新验证。未自动勾 PRD/finish/archive/commit。
