# 实施与验收记录

## 已批准范围

原生 ScrollView、常驻滚动条；用隔离内部 renderLayoutFrame 适配保留全窗口 overlay，通过公开 handleMouse 转交 wheel。移除 PageUp/PageDown，保留键盘选择、详情独立位置、只读边界及安全退出。不修改 Pi 本体或主布局，不自制滚动条。用户明确接受内部接口升级风险。

## 实施检查点

- [x] `lib/task-browser/native-layout.ts`：实际宿主解析、能力及布局几何校验。
- [x] `component.ts`：原生视口、固定标题/底栏、滚轮不改变选择，键盘按需 reveal。
- [x] `command.ts`：原 overlay 生命周期，能力失效可见拒绝和安全关闭。
- [x] UI 回归及 `docs/task-viewer.md` 用户说明。
- [x] 独立审查修复五项 P2：边界 reveal、queued wheel、新页签首键、畸形几何、late scroll 异常。
- [x] 主会话核对最终代码、测试和五文件指纹，单 stage 提交 `fbc2988`。

## 验证

既有 Pi1.2.0 / Node24.14.1，测试子进程使用已有 PI_TRELLIS_TEST_HOST 并 unset TRELLIS_CONTEXT_ID，不安装依赖。

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<existing-Pi-node_modules> node --import ./tests/host-tui.mjs --test tests/task-browser-ui.test.mjs tests/task-browser-reader.test.mjs tests/task-display.test.mjs
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<existing-Pi-node_modules> npm test
git diff --check
```

独立 focused91/91、独立及主最终 full486/486，自然exit0。共享checkout全量不冒充干净独立基线。最初缺peer启动失败及并行资源失败经修正环境/资源稳定后复测，未弱化产品断言。无lint/typecheck脚本，直接TS执行不是静态类型检查。

真实隔离 tmux 验证见 [精简验收报告](evidence/acceptance.md)。物理鼠标/IME/任意插件组合未测。

## 清理与收尾

用户明确接受任务并授权清理、归档及会话记录。删除本任务所有批量中间证据，仅保留上述最终报告；不改其他任务证据，不将原始失败全量材料入Git。报告如实保留失败分类及最终复测结论。

代码无进一步变化，不重跑与文件清理无关的产品测试。未安装、同步、个人重载、push或改写历史。现有通用规范足够，本任务不新增专用spec；证据留存规则的调整另行讨论。
