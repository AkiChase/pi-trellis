# S2 独立审查（2026-10-15）

## 结论与边界

S2 四个 owner 及对应 7 个测试/fixture 已完整审查；发现并自修 4 类 scoped 缺口，另补 startup/snapshot/policy 保留负例。最终 focused 104/104 已自然 exit0，附加稳定回归54/54已 exit0，最终全量468/469 exit1（唯一S3旧literal资源数量）。**S2产品合同通过本次独立审查，交主复核checkpoint；不是S3/全任务或真实agent行为验收。**本审查者未提交、start/hooks/安装/部署/reload/push/生命周期、真实项目 worktree、递归派发。

Review base `9ec131f8328a830cb1566748cc67d651052d76e5`；开始 HEAD 即此 S1 checkpoint，没有 S2 已提交内容。期间并行 init 主提交 `5d3b4e472e26a8e32c2f63effb8f434ceefd77d2`，`git diff 9ec131f HEAD` 中的 20 文件；其内容不是 S2。已检查 supplied-base committed diff 的范围和 `extensions/trellis.ts` runtimeDiagnostic 单行，保留不计入 S2。最终 unstaged S2 仍完整，index 为空。审查者没有改并行 init owners/tests、S3 agents/docs/skills/spec/scripts/templates、runtime/common/native/baselines。

## 完整阅读范围

- 必需 task `prd/design/implement/check.jsonl`、6 个实际 check references；S1 native handoff/independent review、S2 root routing/implementation 和主 review 进度；主随后补入 design/implement 的 S3 finalscope fixture/probe接线已经阅读。
- `lib/{worktree-query,task-context,subagent-rpc}.ts`、`extensions/trellis.ts` 全文及完整 S2 diff。
- `tests/{dispatch,source-executions,task-context,agent-context-integration,runtime-contracts,worktree-protocol}.test.mjs`、`tests/worktree-fixture.mjs` 全文及完整diff；附加 unsupported-runtime/project-activation/task-browser-reader 全文。
- 调用/合同 owner：`lib/{bindings,config,executions,project-state}.ts`、runtime common `paths/active_task/session_context` 全文、native `materials/records/manager` 全文、runtime fixture、optional `tests/provider-contracts.mjs` 全文（只读未运行）。
- development/testing/shared cross-layer guide/当前 workflow/检查 skill。旧复制/正文complete marker/生成器规范按批准的 S3替换计划处理，不拿废弃语义拒绝 S2。

## 发现并自修

1. **`extensions/trellis.ts:795–845`：子会话未记住 immutable binding，后续普通turn只比 source/target path。** 同task同path同时替换source binding和target marker，native校验新binding确实合法，但旧child不应继续用旧身份。现startup保存 native identity，首次header核旧identity，绑定后保留snapshot；普通turn与tool boundary都按既有 `sameIdentity` 比对local/selected binding（含bindingId/contextId/baseCommit/branch/createdAt等），失败记authority fence且不借旧pointer。新增5项真实native replacement负例，assert新记录native有效、旧child shell在新turn之前即blocked、pointer不变。
2. **`extensions/trellis.ts:839–843` / `lib/worktree-query.ts:40–55`：材料存在性只lstat最终file，祖先symlink替换可绕过。** 新 `requireSourcePath` 复用同一source路径解析，重查task/spec/workflow/artifact/manifest/ref lexical ancestry→realpath→expected identity/type；仅允许显式顶层source task-store route，不hash live正文、不把status/内容改动变自动取消。新增ancestor replacement负例和内容/status变化仍可工作正例。共享viewer alias reader未收紧，native materials仍是策略owner。
3. **`extensions/trellis.ts:1194–1204`：单CLI shell只cd source，却可能跑绝对target/foreign脚本或--cwd target。** managed runtime单命令要求source `.trellis/scripts/<known CLI>`（相对或绝对source路径）、禁止cwd override和shell expansion/mixed组合；未知inline/global runtime拒绝并提示改正/拆开，不默默搬产品cwd。新增target绝对脚本/foreign脚本/显式target --cwd拒绝和source绝对CLI真实执行成功；现有wrapper幂等、普通product shell targetcwd负例保留。此为受支持识别边界，不声称任意shell/环境为OS沙箱。
4. **`lib/task-context.ts:58–75` / `lib/worktree-query.ts:31,40,80,95`：metadata路径与native bounds不完整。** parser补artifacts/manifest/ref控制字符、lone surrogate、path 4096 codepoints、reference traversal/backslash、16MiB bytes与safe task slug；native envelope明确undefined local/binding不能伪装null、material authority512KiB、source label同native path约束。facts语法仍不授权路径，child必须比真实native。新增恶意metadata矩阵，现有nonempty-role/research/nullhash/strictv2与structured diagnostics保留。

额外startup自修：**`extensions/trellis.ts:992–1017`** linked Git checkout缺marker过去不进入managed startup gate，可先读target旧pointer。现在`.git` file也先native鉴别并隔离；缺marker/unbound linked checkout拒绝而不读旧pointer。native确认source同根时才恢复原source key；不会凭gitfile猜source。新增missing-marker真实linked target负例。额外nonstandard separate-git-dir fixture最初错误假定该布局受native支持；实际Git worktree list返回git-metadata，native既有明确拒绝，此测试已修为assert native拒绝、isolation/error/no old pointer，未扩大native支持。

审查者自改6文件：`extensions/trellis.ts`、`lib/{worktree-query,task-context}.ts`、`tests/{dispatch,task-context,agent-context-integration}.test.mjs`；RPC/source-executions/native/common owners未由审查者改。新增target checkout在第二native query后改变→spawn0/无lease负例，确认targetFingerprint fence不是仅source hash。

## 保持合同

- source-only PRD/design/implement/workflow/selected manifest/ref；target旧task/spec、缺targettask、坏targetpointer不fallback；path-only没有正文/complete marker/预算遗漏，rawhash不作actualread proof。
- 主active source pointer决定ordinary subagent_run，caller forged/legacy/坏source header不覆盖；startup/header失败独立child key、source runtime独立pointer；no start/hooks/parent pointer变化；deactivate重复header不复活。
- 当前角色native graph验证，other role坏不阻断；两次role hash围栏和target actualsnapshot围栏；reserve/early terminal/unknown无retry/shutdown/stop待terminal没有改状态owner。
- common三模块保持显式source CLIcwd接线，无global env sourceoverride/get_repo_root修改；product code/test cwdtarget。权限/工具不是OS沙箱。

## 验证命令与结果

环境darwin、Node v24.14.1、Python3.14.7，测试真实existing host1.2.0 peer只经子进程env，无安装。每次命令前缀：

```bash
env -u TRELLIS_CONTEXT_ID \
 PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules
```

最终 focused：
```bash
# 上述env前缀后
node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs tests/runtime-contracts.test.mjs tests/worktree-protocol.test.mjs
```
**104/104 PASS，natural exit0，日志 `s2-review-final-focused.log`，job bp5fqv4ct。**

最终附加：
```bash
node --import ./tests/host-tui.mjs --test tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/task-browser-reader.test.mjs
```
**54/54 PASS，exit0，job bkakwx4b0**，对应最终产品版本；后续仅修非标准gitfile新fixture预期，产品未改。日志 `s2-review-final-regressions.log`。

全量：上述env前缀后 `npm test`，job b7ufh22ug：**468/469，FAIL，natural exit1**。唯一失败 `tests/initialization.test.mjs:20`：36≠35（S1新增diagnostics后的旧literal资源数量，主已归S3 fixture维护）；未弱化或修改该断言。并行init菜单用例此最终运行通过，不沿用历史case失败归S2。完整日志 `s2-review-final-full.log`。

- TypeCheck/Lint：**UNAVAILABLE**，package.json只有test/test:provider；Node直接执行TS不是static typecheck。
- `git diff --check`：exit0；`check.jsonl`全部6条JSON parse/file existence真实有效（不称空implement.jsonlvalidate全过）。最终11个S2files SHA256见 `s2-review-final-file-hashes.json`，指纹是源码冻结核验而非agent实际read证明。
- provider-contracts/真实SDK managed provider/在线模型/PTY视觉/真实项目worktree/真正agent完整源read与分页：**NOT_RUN**。fixture真实native CLI、source路径读取与source CLI执行仅合同/路由证据，不等同真实agent遵从。

## 过程失败与未修范围

保留初始独立focused91/91 PASS（pre-fix，不能代表发现边界已覆盖）；新增4类漏洞复现9/9 FAIL日志 `s2-review-pre-fix-reproduction.log`，其中symlink case最初是审查者漏建fixture目录导致ENOENT，不当漏洞复现PASS；修fixture后最终负例通过。第一次局部修复8/9通过、1 fixtureENOENT，真实保留。后续focused/全量非标准gitfilefixture错误预期均FAIL；诊断Git/native facts后修fixture为既有拒绝合同，不改native、不弱化managed合法身份要求；最终整套重跑。

首独立全量463/464 FAIL、后一轮467/468 FAIL均唯一 `tests/initialization.test.mjs:20` literal35而S1新增diagnostics得到36；后非标准gitfile错误fixture那轮两fail不得当成功。最终全量仍需保留相同资源数量失败的准确归属；该file已由主明确纳入S3 baseline+3维护，审查者不改。并行init菜单历史FAIL本次前两全量未复现，不沿用旧失败或伪称旧证据通过。

S3剩余旧角色/技能/workflow/docs/生成器合同与resource hashes不能归S2已验收。optional `provider-contracts.mjs:127,177,237` 仍调用已删buildTaskContext/旧renderer，且assert TARGET正文；只读确认，不运行、不宣称probe可用；主已在design/implement纳入S3最小测试接线。

**本次没有剩余已确认的S2产品blocking issue；最终全量gate与S3/真实宿主限制须主继续处理。**
