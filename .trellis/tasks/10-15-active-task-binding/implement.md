# 实施计划

## 执行授权与边界

用户批准简化模型实施、逐阶段提交、最终检查通过后归档/journal；授权隔离模拟真实环境验收。不 push/install/联网模型/重载个人资源，不改 deployed scripts/manifest。保留并行修改。主会话实现，独立 reviewer 核公共合同，子代理不提交。

## S1 — active CLI

- [x] 完整读取 runtime task/active_task/io、调用者与真实 fixture；新增 active handler/parser/help，仅当前指针原子写。
- [x] 测试 no-task、planning/in_progress、空 manifest、共享同任务/切换/幂等、非法 identity/task/pointer/symlink、写失败；证明无状态/hook/他人指针/新增锁副作用。
- [x] 更新 runtime-baseline 相关 adapted hash/releaseId，原始来源保持。
- [x] focused runtime 26/26 和 Python32/32；独立检查无阻塞（6/6 focused＋真实 atomic writer 故障探针），主会话吸收双session CLI绑定/真实mkstemp与replace故障回归建议，最终26/26通过。提交 S1。

## S2 — 合并 continue 与同步资源

- [x] 读取完整 skills/start/continue/support refs；合并恢复路由至 start，删除 continue，同步当前 README/workflow 模板/相关 references/必要 spec。
- [x] 更新 skill/template provenance，与实际技能/资源数量及过滤行为测试同步；历史归档不改。
- [x] focused五文件104/104、Python32/32通过；独立 review无阻塞，主核实际diff/provenance/过滤数量。S2提交见下方记录。

## S3 — 全量与验收收尾

- [ ] `env -u TRELLIS_CONTEXT_ID npm test`、`python3 -B -m unittest discover -s tests/python -p 'test_*.py'`，使用现有 peer/host，缺失不安装。
- [ ] 隔离临时 agent/project 的真实 SDK/CLI模拟，证明多 session 共享绑定、session 恢复、start/continue 发现变化；不联网模型/个人资源。
- [ ] JSONL/path/provenance/links/`git diff --check`/实际 diff 核验，最小最终总结与 PRD A1–A6逐项记录。
- [ ] 提交验证完成的最终修正；最终通过后按既有用户授权 finish-work：archive、清自身绑定、journal及适用的 scoped commits。配置禁自动提交时遵守配置。不 push。

## S1 检查记录

Node v24.14.1。首次 focused Node 因本仓缺 pi-tui peer 在加载前失败；使用现有 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules` 的 `PI_TRELLIS_TEST_HOST` 重跑，首次 25/26（新 help 文案被 argparse 换行，断言未允许换行）；仅修正测试 whitespace regex，最终 runtime focused 26/26 exit 0。Python discovery 32/32 exit 0；git diff --check 通过。原始输出均仓外。独立 review 无阻塞；另全量 npm test 548/548 exit 0（相同 host）。吸收非阻塞测试强化后最终 runtime26/26、diffcheck通过，真实 writer fault 无残留且多session各自CLI绑定成功。S1提交 `cd24552`；原始输出均仓外。

## S2 检查记录

删除 continue，start 合并恢复路由；create 提示同步为 start/active，因此 `common/task_store.py` adapted hash/releaseId 一并更新。当前技能9个、资源35个，真实SDK过滤排除一个为8。focused五文件104/104 exit0，Python32/32 exit0；增加删除技能不进入package closure的负向断言后重跑仍104/104。当前用户文档/模板/skills中无continue旧入口。独立 review无阻塞，特别确认未混入并行manifest/workflow provenance hunk。项目 `.trellis/workflow.md` 与 manifest 的既有并行修改未动，新合同仅更新包workflow模板和本项目spec。

## 已知限制与回滚

没有互斥负责人、takeover 或新增锁，多个会话可共用任务。旧指针不是运行状态，归档清理行为不变。模拟不证明真实模型遵循/在线质量或终端视觉。每阶段回滚只涉及对应 own changes，不回滚并行内容。
