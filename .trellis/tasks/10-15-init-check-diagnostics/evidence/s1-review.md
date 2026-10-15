# S1 独立审查（2026-10-15）

结论：**S1 PASS（限定静态阶段），不是 R1–R7/A1–A8 全任务验收**。无提供 Review base，因此仅审查 staged/unstaged/untracked 与完整相关 owner/caller/tests；未把 committed history 纳入 review。未 commit、start/lifecycle、部署、安装、reload 或递归派发。

## 审查与修复

完整读 PRD/design/implement/check.jsonl、两项 research（含截断续读）、开发/测试/cross-layer specs、diagnostics/command/engine/resources/adoption/project-state、整个 extension、task record/pointer Python authority、相关 tests。docs/initialization.md 与 README 的父会话 Check 文案 delta 已核对；导航/其他工作流不改。

独立负例首轮 **48/55，7 FAIL**（`/tmp/init-review-first-tests.log`）确认并自修：
- command:160–166：保留 resolver 的有界具体原因，同时 blocked，绝不借 key/root/pointer。
- diagnostics:84–109：descriptor 消费前复核 root/祖先、regular/fstat，持续祖先替换（同 inode hardlink）在读取前拒绝；FIFO/nonblock 围栏保留。非 openat/OS sandbox，瞬时祖先 ABA/多文件原子性仍不保证。
- diagnostics:154–218：包失败前仍验证 manifest envelope；completed operation 的 plan/action/guard 类型、completion 与 envelope hash 验证，不执行/重建输出、不读取历史任务。坏/旧 manifest 不产生 pass execution 结论。
- diagnostics:221–224：task identity/status 的 Python 空白字符语义（NEL/U+001C–001F 与 BOM差异）及 Unicode codepoint 长度。
- diagnostics:336–383：固定 template route 元数据漏检补齐；独立 required documents 不受 package 校验失败吞掉，无法取得固定包清单时显式 blocked。
- diagnostics:244–252,390–406：输出全部类别去 control/format 字符；保留实际 omitted categories，16 KiB 总报告与限长原因/影响/建议；不打印配置/恢复内容/正常完整 hash。
- diagnostics:92–107：进一步修复累计 read budget 已耗尽仍每文件多读 64 KiB，以及 text 超额误伤独立 runtime inventory。每域最多一个 sentinel byte，真实 read spy 验证总量；未扩大 S2。

新增 10 个负例，包括 production extension 双会话 resolver、失败 child authority 不借旧 pointer；缺/坏 key、managed marker、cross-root 零 stat/open、external source store 例外与内部/session redirect、无材料/history/目录枚举、无写/子进程、bytes/mode/index/外部 victim 保存均复核。255/256 轮的唯一 FAIL 为 fixture FD 复用误记，close 清理并加强 same-inode 替换后通过，未弱化产品断言。

## 实际验证

环境 darwin、Node **v24.14.1**、Python **3.14.7**；已有 Pi **1.2.0** peer。所有测试 subprocess：`PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID`。

- **PASS 259/259，exit 0**：`node --import ./tests/host-tui.mjs --test tests/init-diagnostics.test.mjs tests/init-command.test.mjs tests/init-menu-safety.test.mjs tests/project-activation-host.test.mjs tests/initialization.test.mjs tests/adopt-project.test.mjs tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/agent-context-integration.test.mjs tests/manifest-provenance.test.mjs`（`/tmp/init-review-final-gate.log`）。
- **PASS 545/545，exit 0**：`npm test`（`/tmp/init-review-full-final.log`），对应最终 source，非实现者旧 200/200 重用。
- 早一轮 full **506/543，37 FAIL**：并行 evidence-retention 改 workflow template 尚未同步 baseline，35 个 top-level fixture hash 失败、2 个 nested hash 失败、1 个 provenance 指纹失败（counts 含 nested）；`/tmp/init-review-full.log`。预算 targeted 当时 0/2 同样被 fixture hash 阻断。未改并行资源；baseline 同步后以上 focused/full 实跑重验通过。
- **PASS**：`git diff --check`；`node --check` diagnostics.ts/command.ts/init-diagnostics.test.mjs（仅语法，不是 typecheck）；untracked whitespace；check.jsonl JSON parse/file 存在；README/initialization 本地链接目标存在。
- **NOT_AVAILABLE**：lint/typecheck（package 无脚本）。**NOT_RUN**：单独 Python suite/task validate、真实终端/在线模型/provider/用户项目主动诊断。

最终 focused 前后及 full 完成后，下方八 owned 文件 hashes 相同；engine/runtime/agent baseline 与项目 manifest/workflow 的 review 起始指纹不变。并行发布 template/skill baseline 变化由其 owner 负责，未覆盖。

## 最终 SHA-256（owned）

```text
0bee6fbf386f14aa165432948476373daac35f5672267a0aaa825065865ac77d  lib/initialization/diagnostics.ts
3aacb7ac774a4f79fdda778b2d6aab7e7afe72920371dbf6530ae5315fb799a8  lib/initialization/command.ts
e46c99139d8f8080e0e543d704c3dc2053a4b447db06ed422d4cfa4cfea9c9d4  extensions/trellis.ts
e5bf0b91d5187a17897e715dcc530492872ffbee006b3566e22ff7b494f87823  tests/init-diagnostics.test.mjs
b1bd13e24d0314bc4c60bb13216dff0bc12d72b85046d43d5953e7d6795c4147  tests/init-command.test.mjs
8b6132267f18ee9e3140c26d5209e9271273a1cd7ecb7c7b6e7846484d0b429d  tests/init-menu-safety.test.mjs
aa4770dd7a6d6706758cba4b84b49d892b8c6f699690012acf5d82044cc87664  docs/initialization.md
d0729629b98dbc18d5c453c7f89f8eacededeae7dbbb1da1e1067e625b173b28  README.md
```

## 留给主会话的门禁

S1 static projection 不是 shared strict validator/执行或写授权；S2 必须复用 provenance/consumer seams、可终止 worker/runner，而非消费本阶段 facts。Python/effective config/YAML parsing/runtime identity/worktree native proof/硬 20 秒预算/迟到生命周期围栏尚未实施，报告明确 blocked/skipped；S1 无跨 await 活跃 probe。现有 menuSnapshot 在 Check 选择前原静态读取仍是既有行为，未重写菜单；完整 hostile import/pyc/Git/helper/temp/进程清理与跨 root native proof 留 S2/S3。

README 旧 worktree 概览仍含“同步材料/收集”等非本次 owning paragraph，未擅改，应由文档 owner 后续按当前 source-authority 合同校正。原始日志保持仓库外；本文件为唯一新增 review 摘要。主会话确认最终 diff/hashes 与 stage 接受后方可提交。
