# 固定运行时实施证据

## 范围与实际变更

- 基于 `9af75d2f52f78ee932bb31563cc29fe7ce5a9b73` 当前 checkout 实施，不切分支、不创建临时 worktree。
- `runtime/` 纳入 Trellis 0.6.16 的 5 个支持入口和实际 AST 导入闭包：共 24 个上游源文件。排除根 `__init__.py`、`cli_adapter.py`、`task_queue.py`、`hooks/linear_sync.py`，但保留全部 28 个原始源文件 hashes。
- 现有 `python/` 的 7 个原创 worktree/query 文件移至 `runtime/`，逐字节对比 HEAD 原文件，7/7 一致；只有 source locator/deployer/tests/specs 改路径，不改材料同步、锁、快照、管理算法。
- 新增 `runtime/common/task_records.py` 统一词法/真实 task-store 边界、1 MiB 记录读取和有界投影。task.json 的通用 mutation reader 也复用此校验，拒绝经过 task.json 软链接的受害文件修改。
- `active_task` 改为显式 Pi key，仅自身 pointer，无推断（兼容参数 true 也不能恢复推断）；无效 raw ref 为诊断，不返回授权 task_path。`start` 身份/记录失败不推进 status/hooks；`current` 明确 JSON 状态和非零退出；`finish` 成功 unlink 自身后才可授权有效 task hook。
- context/package/journal 的 CLI 与直接 context reader 保留 task_error；无效 raw path 不用于任务读取/package/journal/hook。journal 提交使用准确验证路径（含归档月份），外部允许 store 不伪造本地 basename；archive 只 stage 实际目标、源删除、明确修改 child task.json，不 stage 全 archive/child。
- developer 名字允许空格/Unicode，拒绝控制字符、路径片段逃逸；原始输入先校验后 trim。既有有效 identity 同名不写、不同名失败并披露实际结果，workspace journal/index 保持字节。所有只读入口抑制 bytecode；运行时移除全局 trellis 版本/update 探测及 marker 写入。
- `resources/runtime-baseline.json` schema v1 保存原始/最终 SHA-256、许可证/源路径、native HEAD 修订与内容派生 releaseId。上游 npm 未提供已验证 git revision，不虚构。角色来源仍单独 0.6.17。
- README、`docs/runtime-baseline.md` 和相关维护 specs 更新 source ownership/paths/license/testing；明确 installer 尚为 legacy，此子任务不部署固定 runtime。

## 红→绿

`research/runtime-red.log`：先复制完整未修复的 vendored runtime，在 disposable Git 项目运行新增 11 组负例，**0/11 通过**。失败包含 foreign fallback、无身份 start/hooks、外部 stale 读取/finish hook、unlink failure、external store、畸形 children、basename victim、旧 archive dirty 提交、developer 和 pycache。

同一测试在 owned runtime 修复后 **11/11 通过**。随后增加真实 extension + 完整 runtime child bind/finish/重复头不复活/失败绑定隔离、1 MiB/非常规 record、外部 store journal、来源/导入闭包/Python3.10语法/npm pack、全 lifecycle mutation 重定向拒绝，共 **16/16 通过**，最终证据 `research/runtime-focused.log`。

没有从 patch 常量构造产品 fixture；固定 runtime 完整复制到临时项目。Git commits、hooks marker、symlink、identity/journal/pointer mutations 只在 disposable fixtures 执行。

## 验证命令与结果

实际环境：Node v24.14.1；Python 3.14.7；macOS；真实已安装 host `node_modules` 为 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，无安装。

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test tests/runtime-contracts.test.mjs
# 最终 16/16，通过。日志 research/runtime-focused.log

env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  npm test
# 前期 155/155、增加 child 测试后 159/159、shared mutation guard 后 160/160。
# 最后微调 raw developer 校验/来源元数据后 delivery 全量另见下方最终补记。

python3 -B .trellis/scripts/task.py validate .trellis/tasks/10-13-standalone-runtime
# implement.jsonl/check.jsonl，各 8 entries，通过。
python3 -B .trellis/scripts/get_context.py --mode packages
# single-repo，extension/scripts layers，成功。
git diff --check
# 通过。
```

定向 tests 内实际执行：所有 runtime 源在内存编译，AST feature_version=(3,10)；import closure 没有缺失 module/额外 common；`npm pack --dry-run --json --ignore-scripts` 确认所有 32 个 runtime 文件、baseline 清单及 AGPL license 在包中，不生成 tarball。没有 lint/typecheck 脚本，不称通过。验证维护 Markdown 相对链接均存在。

自查曾发现路径替换误改 Windows 默认解释器为 `runtime`，在最终验证前恢复为 `python`。新 releaseId 回归曾用 localeCompare 与 Python ASCII sort 不一致导致失败，改为稳定 ASCII `.sort()` 后通过；没有修改 manifest 以绕过失败。

## 保留边界

反复校验当前 `.trellis/scripts/` 原始 **28/28 hashes 不变**；Git diff 不包含生成脚本、`.trellis/workspace`、`.agents`。未写本项目 developer/session/runtime pointers，未运行 finish/archive/add_session/init/install/reload、stage/commit/push；未更改 parent/init/migration 任务材料（主会话自身授权记录不属于本代理修改）。

未运行真实 provider/TUI、未安装任何依赖、未宣称 Python3.10实机/Windows矩阵。hierarchy/rename/journal semantic retry、snapshot symlink/mode、effective adapter 检测仍暂缓。task 继续 in_progress，独立 check 和后续 init/migration 由主会话安排。

## 最终 delivery 补记

最后 raw developer 校验（包括边缘换行/tab）、record RecursionError 容错、native 固定 HEAD 来源和最终 hashes 已冻结后，再跑完整命令：**160/160 通过，exit 0，76.64 秒**，日志 `research/runtime-full.log`。定向最终 **16/16 通过**。这些是本代理最终源码版本的结果，不是之前版本套用。最终 releaseId：`pi-trellis-runtime-v1-04c95acdc091fb5bb1c24ff2cd43d33fa9210ee59b51fa645b00624d9da58f2d`。
