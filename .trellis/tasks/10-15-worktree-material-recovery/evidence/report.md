# Worktree 权威材料来源与派发恢复：完成报告

日期：2026-10-15。用户已接受实施成果，并授权合并报告、清理执行残留及归档收尾。

## 实施结果

主 worktree 是 task、spec、workflow 和角色 JSONL 的唯一权威来源；子 worktree 只承担代码与测试执行。派发提供经宿主校验的绝对源路径和独立执行根，不注入材料正文，不以 hash 声称已读完。源材料无效时拒绝，不回退目标旧副本。

- **S1 — `9ec131f`**：严格 binding v2、按角色验证源材料、结构化诊断；prepare 只写忽略的 runtime，不复制任务/spec，不改目标 task.json，不运行目标 start/hooks。删除 refresh/collect、双副本 snapshots/ancestry 和旧格式兼容。
- **S2 — `176619d`**：native 查询、路径型派发、源材料/目标代码双根、源 runtime 中独立 child pointer；保留身份、锁、占用和未知 spawn 不重试。现有 common 模块显式 repo_root 参数足够，未增加全局根覆盖。
- **S3 — `3d12127`**：直接维护三个包内角色，删除生成脚本；统一技能、政策、中文用户文档、英文开发规范、测试和资源 hash。保留历史来源与 AGPL 声明；未覆盖项目部署角色。

各阶段由不同实施者与独立审查者执行，主核对实际改动并复测后精确提交。并行 viewer、初始化诊断、项目配置及非本任务 workflow hunk未混入提交。

## 自动化与独立审查

| 阶段 | 最终有效证据 |
| --- | --- |
| S1 | 主 focused 91/91，独立 Python 28/28；33 个 runtime hashes 匹配 |
| S2 | 主及独立 focused 104/104，附加回归 54/54 |
| S3 | 独立 focused 95/95；主最终全量 486/486，自然 exit 0，记录的测试输入结束复核无漂移 |

主最终全量命令：

```sh
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  npm test
```

实际环境：Darwin、Node v24.14.1、Python 3.14.7，使用既有 Pi SDK 1.2.0，无依赖安装。资源 hash/provenance、JSONL 引用和差异检查通过；空 implement.jsonl 未被报告为完整 task validate 通过。仓库没有 lint/static typecheck 脚本。

审查修复包括文件描述符/路径竞争、图尾重检、内部 symlink、完整 reference hash、immutable binding、祖先路径与绝对 CLI cwd、metadata 边界、缺 marker 隔离，以及 research 持久化显式授权和技能双根一致性断言。

过程中的失败未当作通过：S2 独立全量曾为 468/469，唯一失败是新增 runtime 模块后旧资源数量常量，由 S3 改为 baseline 条目数 + 3；S3 独立全量 485/485 运行期间有并行 viewer 输入漂移，因此最终使用主后续无记录输入漂移的 486/486。中间 fixture 错误和旧环境结果不替代最终证据。

## tmux 真实离线机制实测

使用 tmux 3.6a、Pi CLI 1.2.0，独立 server、临时 HOME/config 和 disposable 原生 Git worktree fixture；fullscreen/dark、140×45。加载当前 Trellis adapter 与邻 preset task-composition，模型响应来自现有 faux API 的离线脚本，不使用个人凭据或在线模型。

- 实际 `trellis_dispatch` 派发 managed implement，ID `a417097b-5ffd-499`、run 1，通过 `task_manage wait` 返回 completed。
- 六次真实 read 对 source PRD、design、implement、workflow、implement.jsonl 和 spec 的绝对路径、调用 ID、顺序及结果正文逐项匹配。首请求无 PRD 正文，正文随后从 read 结果出现，未出现 stale target 正文。
- 子 overview 的 source/execution 双根正确，task_error 为 0；子 bash 实际 cwd 为 target，context 为 `pi-child-ec8d90313901`。
- child pointer 独立写入 source runtime，parent pointer 不变，target 无该 pointer；prepare 前后 target Git 状态相同，派发前后 seed 后的 target status/diff 和双方 task.json 不变。
- 删除 disposable source spec 后再派发，明确报 `material_missing` 和 `implement.jsonl:1`；新增 spawn 为 0，不借用 stale target spec。
- Ctrl+O 展开真实错误，Ctrl+D 正常退出 0；观察到父子 shutdown。主复核 owned PID/PGID、唯一 tmux server 均退出，临时目录已删除。

首次启动等待误期待 provider/model 完整 footer，实际仅显示 model id，导致 fixture timeout；修正等待依据后在同一实例继续，未改产品、未放宽 authority 断言。首次委派超时后的继续运行不将启动成功冒充派发成功。

本次终端加载时没有记录全部源码/provider hash，且期间有并行初始化诊断改动；因此这是列出的单次真实行为证据，不声称整个 checkout 或邻 provider 冻结验收。

## 验证边界

**未覆盖**：自主或在线模型遵从、大文件分页、check/research 角色实派发、shared-source、resume/stop/unknown race、完整 create→代码修改→commit/merge 生命周期，以及 regular/light/resize、物理鼠标/IME。离线脚本决定工具调用顺序，不能证明模型主动遵守阅读与写入范围；工具/cwd 合同也不是 OS 沙箱。

`tests/provider-contracts.mjs` 本轮只做源码静态审查和 syntax 检查，未把其语法通过当作完整 probe 行为通过。后续 tmux 最小实测补齐了所列 source pointer、overview、read 结果、拒绝与退出观测，但未覆盖该脚本的全部场景。

未安装、部署、同步个人资源、reload 或 push；未创建真实用户项目 worktree。用户接受当前实施和已报告验证范围后授权收尾，未覆盖项不是已知故障，也不被改写为 PASS。

## 证据整理

按用户要求，仓库只保留本报告，不保留执行日志、文件 hash 快照、屏幕转储、临时脚本和重复阶段报告。49 个未跟踪产物移出仓库保存，旧阶段报告另行备份后合并；不重写既有提交历史。任务规划中的报告引用统一指向本文件，收尾提交只涉及本任务及本会话日志。
