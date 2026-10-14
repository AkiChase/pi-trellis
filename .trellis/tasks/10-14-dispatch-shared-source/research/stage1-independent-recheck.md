# 阶段 1 独立复核：F1–F4

## 结论

**批准本次 F1–F4 阶段修正；限定复核范围内未复现剩余 blocker。** 不代表阶段 2、全项目验收或提交授权。reviewer 只读产品/测试，唯一仓库写入是本报告；未修改 index、产品、任务状态或并行 viewer/runtime-tool-names 改动。

已使用完整注入的 PRD/design/implement/spec，阅读前次 `stage1-independent-review.md` 及本次完整相关 owner/test。检查 tracked diff、空 cached diff、untracked 文件；没有提供 Review base，故 committed history 不在本次复核范围。没有重新展开无关架构审查。

## 四项修正

| 发现 | 复核结果 |
| --- | --- |
| F1：旧 terminal/shutdown 覆盖新 request | source 发布现在经与 reservation 相同的 `acquireBindingLock()`；锁内严格重读身份/request/active state 才写。遇竞争保留 pending，25ms unref 重试；dispatch 持锁时可 drain，避免同步嵌套取锁。terminal 和 shutdown 两个 deterministic newer-reservation 回归通过；独立 probe 另外证明 queued terminal 在下次 dispatch 持锁时被消费，并且旧 retry 不覆盖新 agent。 |
| F2：terminal 先于新 host 首次 stop 丢失 | 首次可信 task query 后按磁盘 agentId 消费 bounded early cache，经上述条件发布后重读。terminal-before-first-call 回归将 unknown 转为 completed，并允许下一次同任务预留；原 stop-before-terminal 回归仍通过。没有宣称从未查询 identity 的 host 会主动扫描/释放。 |
| F3：无关坏记录吞掉合法终态 | 已校验 agent→record 可直接定位；一般跨 host discovery 逐 entry 隔离坏记录，保留 bounded console warning，直接 task read 仍严格失败。新增单元回归通过；独立 probe 先用另一任务建立 identity，再放入 12 个 null/坏 JSON/错误 identity 邻居，证明一般 discovery 仍将目标写为 completed、警告可见且最多 8 条、坏文件未改、直接读坏 task 仍抛错。 |
| F4：Python/TS 字符串长度差异 | Python 对 identifier/agentId/error 统一 `utf-16-le` + `surrogatepass` / 2，匹配 TS code unit。产品 regression 覆盖 astral/lone-surrogate requestId 临界值；独立 probe 对 requestId/ownerToken/createdAt/agentId/error 五字段各测 BMP、astral、lone-surrogate 的有效边界和超界，共 30 对 TS/Python 解码结果一致。坏 completed 记录不成为无占用。 |

### 明确保留的边界

- 持锁发布是 **source-only 协议修正**，不是原无锁 read/check/write 已有 CAS；阶段 2 维护说明时需同步这一区别。
- pending 因持锁或持久化失败而重试，不提供退出前 durable flush 保证。unref timer 不让进程永驻；退出/持久化失败仍保留原 conservative occupancy，不能宣称 unknown 自动释放或恢复。此 MVP 边界不作为 F1–F4 未修复问题。

## 实际独立验证

环境：Node `v24.14.1` / Python `3.14.7`。Node 命令均使用仅子进程环境：

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs
```

- **34/34 PASS，exit 0，自然结束**；日志 `/tmp/pi-bg/bxfp8bxao.log`。31 个 dispatch + 当时 3 个 source unit。
- main 随后仅增加 diagnostic unit，reviewer 重读最终文件并单独运行同环境 `--test tests/source-executions.test.mjs`：**4/4 PASS，exit 0，自然结束**。不是把旧 34 数量改称 35。
- 同环境 `--test --test-name-pattern='recorded native provenance' tests/runtime-contracts.test.mjs`：**1/1 PASS**，验证耦合 native hash/provenance。
- `node --import ./tests/host-tui.mjs --input-type=module` 的 disposable fixture probes：**3/3 PASS，exit 0，自然结束**；日志 `/tmp/pi-bg/b162813zi.log`，覆盖表中的 queue-drain、generic discovery、30 对 UTF-16 边界。首个 probe 因 data-URL 相对 fixture import 未解析而未执行（`/tmp/pi-bg/b8js4tmn8.log`）；修正 probe imports 后上述三项通过，不是产品失败。临时 fixture 自动清理，未持久写测试文件。
- `git diff --check`：**PASS**；cached diff 仍为空。

未运行：全量 suite、Python unittest 全量、真实 provider/网络、安装/reload。lint/typecheck 无 package scripts，**Unavailable**。main 报告 final full `bk255dhqq` 407/407，此处仅归为 main 证据，不称 reviewer 独立全量验证。

## 最终快照

复核及独立 probes 前后产品 hashes 保持不变：

- `lib/subagent-rpc.ts`：`9bdfaee99e5df83471a35792c159d341837482fd41d36b4022882c332e978cf3`
- `lib/source-executions.ts`：`c082e4ab665eb218acde09c95e2d96047428b93d75ed5143425b5fd7fefb6e33`
- `runtime/pi_trellis_worktree/records.py`：`66f197f5f3a5227105843ba19b36ef96e8eaca7c1fc2eb41cf3309a79e812605`
- `tests/dispatch.test.mjs`：`30bb53344f81abf8526443b551be2753080808c75c0f34f4848d5739c48bd259`
- 最终 `tests/source-executions.test.mjs`：`6032b184e0f8201d877c70623f9f16f3a687827848259e1a9553bbed70044c86`

本复核只允许 main 接受四项修正后继续既定阶段流程；未 commit/start/archive/install/network，也未触碰并行改动。
