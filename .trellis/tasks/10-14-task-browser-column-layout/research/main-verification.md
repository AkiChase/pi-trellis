# 主会话验证记录

## 范围与执行方式

用户批准后单阶段主会话直接实施并自检，无独立 review。修改列表组件、布局回归测试、用户指南及本任务材料；不改变 reader、详情、命令语义或存储。未安装、同步、重载、推送或执行归档/会话记录。

布局采用 2 单元标记、13 单元状态与 1 单元间隔；常规布局目录名列不超过 48 单元及剩余区域的 60%，标题使用余宽（扣除 ` · `）。剩余区域小于 36 单元（窗口小于 52）时隐藏标题，极窄窗口整行兜底截断。所有字段先 sanitize，再用真实 Pi `visibleWidth` / `truncateToWidth` 裁剪和填充。完整列表计算列宽并按宽度缓存，刷新及 invalidate 清除缓存；详情沿用原有 taskLabel。

## 环境

macOS，Node v24.14.1；测试子进程使用已安装 Pi 1.2.0：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/task-browser-reader.test.mjs tests/task-browser-ui.test.mjs
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID npm test
```

## 执行记录（保留首次失败）

- `b2dpd4ir7`：未指定现有 host 的首次聚焦执行 FAIL，缺本地 Pi peer；未安装依赖，后续仅在测试子进程指定 host。
- `bfe1ko26z`：聚焦 FAIL 1，另会话同步改了同一测试文件的 command fixture，`findRoot: cwd => cwd` 令已删除项目仍打开；修正该并行 fixture 为存在性检测，但 fixture 及其 imports 有意不进入本阶段提交。
- `bszu9uox9`：聚焦 FAIL 1，新状态起点断言把树前缀的 3 单元缩进算进状态后空白，19 != 16；修断言为目录名含树前缀的单元起点，不改产品行为。
- `bqjywxbfr`：全量 FAIL，413/415；上述断言失败及 `initialization.test.mjs:99` 不支持 release 的消息断言失败。
- `bfgzwpxcs`：最终共享工作区聚焦 PASS，57/57，exit 0。
- `bhdoky7an`：最终共享工作区全量 FAIL，414/415；唯一失败为并行 activation 改动下 `initialization.test.mjs:102` 的 `messages.at(-1).content` 未定义，未越界修改初始化逻辑/断言。

## 隔离提交内容验证

为避免依赖并行未提交代码，以当时 `git archive HEAD` 在 `/tmp/pi-layout-stage-*` 解包普通临时测试副本（不是 Git worktree，不含任务执行绑定/派发）。仅覆盖本阶段的 component、docs 和已筛选暂存版本的 UI tests；保留基线原命令 fixture。用字节对比证明暂存版本和测试副本三个文件一致。

- `bfw5zqpir`：隔离副本聚焦 PASS，57/57，exit 0。
- `bt6dgpncc`：隔离副本全量 FAIL，409/410；唯一失败为 `runtime-contracts.test.mjs:225` 的历史 `git show`，普通 archive 副本无 `.git`。为测试副本 `git init` 并在其 `.git/objects/info/alternates` 指向源仓库历史对象只读访问（不创建分支/commit/worktree，不写源仓库）；后续重跑保留原历史校验。
- `b6h29n5fc`：修正副本环境后的隔离全量 PASS，410/410，exit 0。最终三文件与暂存内容逐字节一致；共享工作区仍保留并行 integration FAIL，不将其报告为整体全绿。
- `git diff --check`、`git diff --cached --check`、任务 JSON 状态/材料 whitespace、用户文档相对链接检查 PASS。

## 覆盖与限制

新增混合状态及未知长状态、中英/emoji/组合字符、层级前缀、独立双省略、同名标题、状态颜色/背景、滚动不跳列、resize/refresh 重新预算、精确填满无省略；逐宽度 1–125 校验行宽，覆盖阈值 51/52。既有详情长字段可达、readonly 文件/指针/index 保持及原生 overlay focus/theme 回归保留。

无需新增 spec：现有 development/testing 已要求终端单元宽度、数据清理和只读保留，列宽数字是插件展示细节，用户行为补入 `docs/task-viewer.md`。仓库无 lint/typecheck 脚本，未报告静态检查通过；未做真实 tmux/PTY 视觉验收。

## 提交隔离

UI tests 存在并行 imports/commandFixture hunks，仅暂存本阶段布局断言与新增两用例。该文件的并行 hunks 和所有其他任务改动保留，不混入提交。当前空派发 JSONL 是有意 unused，不宣称 `task.py validate` 全通过。main/base_branch 提示只影响将来 PR/archive，本阶段不做生命周期。
