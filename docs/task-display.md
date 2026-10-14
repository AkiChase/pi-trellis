# 常驻任务显示

任务数量 widget/footer 属 `extensions/trellis.ts` 的显示功能，独立于只读[任务浏览器](task-viewer.md)。

## 行为与配置

- `readUnfinishedTaskCount(root)` 在既有 display refresh 事件重新读项目直属任务目录。排除 completed 和 canonical archive descendants，canonical alias 去重，沿用 task-store containment；枚举不可读/畸形显示未知，不用部分计数冒充零。
- 默认 widget 无 session task 时显示 `▸ trellis(N)`，有任务时追加原有任务详情。正数 accent、零 dim、未知 `(?)` muted。`TRELLIS_PI_STATUS=status` 改为 footer；off/unsupported 清显示。上下文注入不随显示模式改变。
- Footer 用宿主 visibleWidth()/truncateToWidth()，先裁剪后 theme，预算 34 个 terminal column；净化控制字符，保数量与能放下的 name/status。Byte length 不是终端宽度：`trellis(3): current ▸ in_progress` 为 33 列，应完整保留。
- Session start、turn end、task.py bash result 刷新；没有轮询或文件 watch。Footer 与其他扩展 status 共用行，宿主合并后的整体宽度仍可能裁剪。

## 验证

`tests/task-display.test.mjs` 覆盖数量/alias、持久显示与刷新、theme/error degradation、Unicode/control width。生产用 Pi loader 解析 TUI；直接 TS 测试用 real peer 和 test-only preload，见[质量规范](../.trellis/spec/extension/quality-guidelines.md)。组件测试不等于真实终端验收；实际操作见 [tmux 指南](testing/tmux.md)。

详细配置见 [README](../README.md#where-the-task-display-goes)，其他文档见[索引](index.md)。
