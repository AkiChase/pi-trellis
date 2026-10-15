# 实施与验证计划

## 状态与授权

用户已明确批准最终方案及实施：内部 renderLayoutFrame 隔离适配、原生 ScrollView、公开 wheel bridge、保留全窗口 overlay。授权包括 scoped 本地 stage commit，不包括安装/同步/个人重载、真实终端、push 或归档。

## 最小变更边界

行为缺口位于 TaskBrowser 正文视口：现有手动截取无法参与原生滚动条/滚轮路由。只改浏览器展示与输入，不修改 reader 的存储校验、任务状态、生命周期或 Pi 本体。

预期涉及：

- `lib/task-browser/native-layout.ts`：唯一宿主内部布局接入，解析实际包位置，校验能力与错误诊断，不复制布局实现。
- `lib/task-browser/component.ts`：接入原生 ScrollView 和固定区域布局；替换旧滚动状态；移除翻页键处理及提示。
- `lib/task-browser/command.ts`：根据已核实的公开挂载方案调整 custom 工厂；全窗口浏览效果为目标，overlay 不作为强制实现约束，保留模式检查与关闭完成回调。
- `tests/task-browser-ui.test.mjs`：把直接检查旧 offsets/数组截取的测试更新为实际原生视口行为，增加鼠标与滚动条覆盖；不得通过降低断言绕过回归。
- `docs/task-viewer.md`：更新用户操作与两种模式的限制，不放开发测试教程。

## 已解决的接口决策

公开 overlay/非 overlay 路径不能直接满足原生布局。用户接受隔离内部 layout 适配，具体设计见 design.md 的已批准方案。保留 overlay 以安全恢复焦点，不替换主 layoutRoot。

## S1：原生滚动整合（一个完整验证与提交检查点）

- [x] 核实公开 ScrollView/Stack/layout 接口和 overlay 在 Regular/Fullscreen 中的真实渲染路径，完成 design.md。
- [x] 完成 PRD 收敛与最终审阅，用户明确批准内部适配方案和实施。
- [x] 正文接入原生 ScrollView，常驻滚动条，固定标题/页签/底栏（独立审查及主最终全量通过）。
- [x] 原生视口状态为唯一权威；分别保存列表及四个详情页位置，不继续使用旧数组 slice 分页（主全文核对）。
- [x] 键盘选择触发 ensure-visible，滚轮不触发强制回拉；切页签/返回/刷新/缩放保留或收敛位置。
- [x] 移除 PageUp/PageDown 输入和提示，保留其他键位。
- [x] 原生滚轮边界 containment 不影响底层主对话；不扩任务行点击与拖动交互。
- [x] 更新测试与用户文档，审阅实际 scoped diff。
- [x] scoped 实施及独立 check 完成，主会话核对实际 diff/修复/完整新增用例；独立报告见 evidence/s1-independent-review.md。
- [ ] 全部可运行验收通过、限制准确记录后，由主会话提交此完整 stage，代码/测试/docs 保持同一检查点。保留其他会话改动。

## S1 当前验证记录

实施者候选五文件已完成，主会话全文读取 native-layout/component/command/UI tests/docs，启动独立 trellis-check `68e87a99-b8e5-4ab`；审查尚在进行，不能称为独立 PASS 或 stage 完成。

- 实施者：focused 84/84、full 478/478 自然 exit0；保留首次缺 peer、负面 fixture 和并行 role hash 失败，详见 `evidence/implementation-handoff.md`。
- 主会话首次 focused `bpo3gkmww` 自然 exit1，因未配置本地缺失的 pi-tui peer（0/3 文件启动），日志 `evidence/s1-main-focused.log`；不安装依赖。
- 主会话修正子进程环境后 `bfxv8n2gk` focused 84/84，自然 exit0，使用已有 `PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules` 与 `env -u TRELLIS_CONTEXT_ID`；全文核对 `evidence/s1-main-focused-host.log`。
- 以上为实现者自检及主 focused，不是最终独立审查后代码验收。独立 reviewer 可在 scope 内修复，修复后需核对新 diff 与最终复测。
- 主已提示独立 reviewer 关注列表选择边界键是否也恢复旧选中项可见、frame 失效/鼠标 coalescing、能力失效边界。
- 独立 check 已结束，5 个 P2 修复已由主全文核对：边界选择 reveal、queued wheel、未绘制页签首滚动键、畸形 native geometry 拒绝、late scroll API 异常安全关闭；完整测试新增用例逐项核对。独立 focused 91/91、full486/486，自然exit0，报告和失败复现见 evidence/s1-independent-review.md。
- 主最终 `b1ugzwxv7` 采用同一既有 host/environment 全量486/486、0fail/skip，自然exit0，日志 evidence/s1-main-final-full.log；主提取汇总并再次核对5个review hashes全部一致（bjty9tlyw）。共享checkout全量结果不冒充独立干净基线。
- 通用spec更新评估：现有公开/内部依赖、只读、测试分层规范足够；不为单个Viewer新增spec，功能说明仅docs更新。
- 真实终端/物理滚轮 NOT_RUN，未安装/同步/个人重载/push/archive；准备立即提交此 verified stage。

## 自动化验证

在现有宿主依赖可用时执行，不安装依赖；缺失则使用规范允许的既有 PI_TRELLIS_TEST_HOST 测试子进程路径。

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/task-browser-ui.test.mjs tests/task-browser-reader.test.mjs tests/task-display.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

没有仓库 lint/typecheck 脚本，不能把直接 TS 执行称为静态类型检查。

### 必须覆盖的用例

1. 原生布局分配后恰好占满 overlay，标题/页签/底栏固定，不泄露主对话字符；不能只调用 ScrollView.render 后检查全部子内容。
2. 列表/诊断/Overview/PRD/Design/Implement 长内容可达末尾；超大受限文档与 Markdown source fallback 不发生参数栈溢出。
3. 滚轮正负方向、连续滚动、边界 containment；滚轮后旧选中项不把视口拉回，方向键选择后才确保可见。
4. PageUp/PageDown 不再移动列表选择或正文位置，提示不包含分页键。
5. 各页位置独立，返回列表保留视口，刷新/删除/当前树重排保留身份并合理 clamp。
6. 预留滚动条列后的中文、emoji、ANSI、宽度 1–125 和高度 1/2/3 等极窄布局不越界，主题变化同时更新正文与滚动条。
7. 两种实际宿主 TUI 的 mounted overlay 布局与退出恢复，保留编辑器文本与焦点。
8. 所有导航/刷新/关闭及滚轮操作保持文件、session pointers、Git index 字节不变，无 model/lifecycle 调用。

## 真实终端验收边界

组件/宿主布局测试不能证明物理滚轮行为。真实 Pi Fullscreen 和 Regular 的输入/画面验证需单独明确授权，并按 `.trellis/spec/testing/tmux.md` 执行，不对当前个人会话 reload 或安装。未授权/未运行必须记录 NOT_RUN，不勾选真实终端验收，不冒充功能全部验收。

## 收尾边界

局部提交按已批准实施范围执行；不得 push、archive、journal、安装、同步资源、修改 Pi 本体或强制切换个人 TUI 模式。任务完工后的归档需另行验收授权。
