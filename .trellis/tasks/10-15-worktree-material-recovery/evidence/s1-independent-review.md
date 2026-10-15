# S1 独立审查（2026-10-15）

## 结论

**S1 在下列定向自修及最终验证后通过独立审查，可交主会话复核并形成 stage checkpoint；不是 S2/S3 或最终验收。** 未提交、未执行生命周期、未安装/部署/reload、未创建真实项目 worktree。测试中的 Git worktree/资源发布仅发生在 disposable fixture。

没有提供 Review base，本次检查 HEAD 之上的实际 unstaged/staged/untracked 范围，不包含已提交历史审查。index 为空；并行 `.trellis/.pi-trellis.json`、`.trellis/workflow.md`、其他任务 planning 和 `.pi/agents/` 未由审查者修改。

## 完整检查范围

- `runtime/pi_trellis_worktree/{materials,manager,records,cli,diagnostics}.py`
- `lib/bindings.ts`、`resources/runtime-baseline.json`
- `tests/{preparation,worktree-cli,worktree,manifest-provenance}.test.mjs`、`tests/python/test_worktree.py`
- 已删除 `tests/material-sync.test.mjs` 的完整 diff；删除的是复制/同步/ancestry合同，通用路径/占用/身份/恢复/移除负例仍在保留测试中。
- 调用与验证辅助：`lib/{config,worktree-query,executions}.ts`、`scripts/deploy-worktree.py`、`tests/{worktree-fixture.mjs,python-worktree.test.mjs}`。
- 当前 `prd.md`、`design.md`、`implement.md`、`check.jsonl` 全部及其六条实际引用、`evidence/s1-native-handoff.md`。旧复制/生成器规范按已批准方案由 S3 替换，不用其废弃语义拒绝 S1。

## 审查者发现并修复

1. **`materials.py:73–105`：pathname stat 不能证明读到的 fd。** 复现：暂时移走 task 祖先目录、在同路径打开另一个 PRD、随后恢复祖先；原文件完整 stat 不变，旧实现却成功返回 alien bytes。改为 bounded fd read，打开/读完分别 fstat，对比初始 dev/inode/mode/size/mtime/ctime，核实际读字节数，再校路径身份；排除 read-induced atime。使用可用的 O_NOFOLLOW/O_NONBLOCK 防 final symlink/FIFO 替换陷入阻塞。添加祖先恢复、读取中替换、FIFO替换负例。
2. **`materials.py:137–170,250–264` / `manager.py:53`：图早期输入与完成时事实可漂移。** selected task.json 的 approval 和要求投影现来自同一次完整读取；图尾按既有 file/byte bounds 复读 raw hash/path/bytes，复核展开目录身份、optional artifact 集合及 task/spec authority路径。先前 common文件/manifest/ref 在后续引用读取时被改，不再返回虚假稳定图。添加 common/task/manifest/ref、directory新增、optional artifact新增负例。局部围栏不是全局框架，不声称 filesystem transaction 或 ABA 全检测。
3. **`materials.py:57–62`：内部 spec/workflow 文件或目录 symlink 未被拒绝。** 原逻辑仅拒绝本 task 内的 symlink，和批准的“仅 source 顶层 task-store 可链接”合同不符。现拒绝所有其他 lexical material symlink，保留真实 root 以外显式 top-level task-store 的读取并测试该例外及 task 内 alias 拒绝。
4. **`materials.py:213–219`：引用 task.json 的 sha256 并非原始全文 hash。** 该文件的 requirements projection hash 不应标作 reference raw sha256。references 改用完整 raw bytes hash；sourceFingerprint 仍使用投影，生命周期变化不改要求指纹。添加精确 raw hash + lifecycle投影负例。
5. **`materials.py:242–250`：JSONL 包装丢掉 nextAction。** 保留底层 `nextAction`，因此 missing reference 给出“核实 source 路径、在已有维护授权内修源 manifest、重试本角色”，同时保留 code/role/path/manifest/line。Python与 CLI 测试不再仅断言 key 存在，检查修源建议内容。
6. **`materials.py:188–215`：空 directory 引用可被 count 判为有效 context。** 明确选择的目录需至少产出一个 regular material reference；空 nested folder 不阻断有真实文件的目录选择。保留原 128-directory limit 负例并添加空目录/empty-child负例。
7. **`cli.py:45,73–75`：移除旧 actions/candidates 显示分支。** 非 JSON status 输出现在展示结构化 issues；--confirm 说明改为在既有 user-approved scope 内执行、preview不是授权，而非要求每次另批 preview。添加 CLI help断言。

审查者仅修改 `materials.py`、`manager.py`、`cli.py`、两项相关测试和 `runtime-baseline.json`。同步三个实际修改的 native sha256 与 releaseId；历史 source hashes/license/revision 未改。

最终 release：`pi-trellis-runtime-v1-c40917c03bf8fadb57d27dfaee0e922eabdd282d9c10abebb467620c98d3c90c`。

## 保持有效的 S1 合同

- strict v2，未知/旧 binding 明确拒绝且不转换/删除；Python/TS immutable identity 对齐。
- role graph 仅 common + 当前 role，research无需 manifest；另 role invalid不阻断当前role。源未提交材料合法，无 target comparison/fallback。
- prepare preview无写；confirm仅 source binding/target marker等忽略 runtime 状态，无 task复制、target task.json修改、task start/hooks/target CLI执行。fixture status/diff/cached diff前后完全相同；已有目标旧材料保留且真正 dirty仍阻止remove。
- source/marker/repository/branch身份、source锁、active/unknown占用、dead-owner recover、无force/no branch deletion的remove负例通过。
- completed check currentness要求当前 `materials.check.sourceFingerprint` + 当前 target snapshot；另 implement图变化不直接过时 check，common要求/code变化会过时。该状态不是 acceptance。
- Material 16 MiB、record/manifest 1 MiB、graph 64 MiB/2048file、512refs/entries、128directories、4096path、512 KiB authority envelope边界保留。图尾复读在相同 bounded graph内，增加有界 I/O，不保留正文副本。

## 后续 consumer 约束（不是 S1 bug）

1. `lib/worktree-query.ts` 必须在 ready query传短 role，验证 strict v2/source facts/issues，不能继续把旧 MaterialSummary当可信结果。直接无role ready现按设计拒绝。
2. `lib/subagent-rpc.ts` 必须以 sourceRoot/taskPath/specRoot/workflowPath 的实际权威 facts构造路径派发，不从target读材料；两次 query比较当前role sourceFingerprint/revision，targetFingerprint由实际执行 checkout snapshot取得，不再期待native材料targetFingerprint。
3. S2子session/common CLI接线必须source材料/target执行分根、独立child key/source runtime pointer、no parent pointer/start/hooks/target task fallback；runtime release与 persistent target adapter/role配置校验仍由host保留。
4. references.sha256是 raw全文hash；sourceFingerprint对task.json使用要求投影。不能把两者混淆，也不能把 initial/final fingerprint相同解释为 agent已完整阅读。
5. S3仍需删生成器并统一包内角色/技能/docs/spec/template旧语义；本次仅局部CLI去旧分支/说明。测试 local helper仍直接native；不是真实S2 host适配验证。

## 实际验证

环境：darwin，Node v24.14.1、Python3.14.7；真实已安装 Pi1.2.0 peer仅提供测试宿主TUI依赖，没有安装或修改其内容。

最终 frozen source命令：

```bash
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
env -u TRELLIS_CONTEXT_ID \
 PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
 node --import ./tests/host-tui.mjs --test \
 tests/python-worktree.test.mjs tests/preparation.test.mjs \
 tests/worktree-cli.test.mjs tests/worktree.test.mjs tests/manifest-provenance.test.mjs
git diff --check
```

- 最终 Python：**28/28，exit0**。
- 最终 focused：**91/91，exit0**（其中 Python suite含上述28项），自然终止。日志见 `s1-review-final-verification.log`。
- 最终 git diff --check：**exit0**。
- TypeCheck/Lint：**UNAVAILABLE**，package.json无相应script；Node直接执行TS不称static typecheck。
- npm全量：**NOT_RUN**，S2/S3旧协议尚未接，不将预期阶段不兼容弱化为成功，也不称最终A1–A7通过。
- 真实provider/TTY/agent完整源read/分页/双根bash/真实worktree：**NOT_RUN**。

保留过程证据：修改前91/91 `bxjinr8lo`；定向漏洞复现 `s1-review-pre-fix-reproduction.log`；后续27/27 Python和91/91 `bw3f9cx99`为中间版本。一次审查者在测试运行期间继续编辑materials造成 hash gate失配，`blonz7cqa` exit1（未旁路，也不算PASS），保留 `s1-review-intermediate-failed-verification.log`。最终等待所有旧运行终止，刷新hash、冻结源码后独立复跑 `bohc3dtmd` 获得上述最终通过。

## 限制与剩余问题

**无已确认的 S1 blocking issue 留待主处理。** 源要求是 live filesystem，任何 sequential read/recheck都不是 OS沙箱/瞬时事务，ABA/恶意并发及 read证明仍按设计限制说明；必须保持 S2 prompt前后围栏和最终证据复核。当前阶段仅 native/TS record互操作、fixture合同有效；最终host合同由后续stage验证。
