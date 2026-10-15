## 已批准方案：隔离原生布局适配与核实依据

当前实现以本文件的“已批准方案”段为准；此前的公开接口阻碍保留为方案选择证据，不再是实施阻塞。

## 结论（安装版 pi-tui 1.2.0）

公开原生组件不能直接作为 custom overlay 获得有界布局；已由用户批准的隔离内部适配解决，实施和独立离线审查完成，等待主最终验证与提交。

## 四个技术问题的确认

### 1. 公开布局组件存在，但 overlay 不使用布局求值

`@earendil-works/pi-tui/dist/index.js` 根导出 `VStack`、`ScrollView`、`TuiAltScreen`、`TuiMainScreen`、`isViewportTUI`，未根导出 `renderLayoutFrame` 或 `LAYOUT_NODE`。

`dist/tui.js:958–987` 的 `compositeOverlays()` 对 overlay 直接调用 `component.render(width)` 并按 maxHeight 截取；不调用原生 layout 求值。Stack render 与 ScrollView.render 不是有界视口输出。因此直接组合会让长正文挤掉底栏，ScrollView.viewportHeight 保持 0。

### 2. 两种运行模式的 overlay 均有此限制

`dist/tui-main-screen.js:229–232` 普通模式渲染后调用共享 compositeOverlays。

`dist/tui-alt-screen.js:1440–1455` Fullscreen 主布局调用 `renderLayoutFrame(root, width, height, ...)`，但之后 overlay 仍由共享 compositeOverlays 处理。主布局支持原生 ScrollView，不意味着 overlay 也支持。

### 3. 内部布局求值可证明可行，但不是已批准的公开产品接口

`dist/layout.d.ts` 声明 `renderLayoutFrame()`，实现位于 `dist/layout.js`，可在测试中显式求值组合树，得到正文 viewportHeight 与原生滚动条。该函数未从包根导出；不把安装路径或 dist 内部导入当作稳定公共 API，不将测试探针转成产品依赖。

公开 `ViewportTUI.setLayoutRoot()` 只适用于 viewport 宿主主布局，没有公开读取并恢复旧主布局的对称接口。不能为 Viewer 擅自替换 Pi 全局 layoutRoot 或改变现有 overlay 职责。

### 4. overlay 滚轮须显式消费，contain 不会自动接线

`dist/tui.js:517–542` 只把标准化事件派给 overlay 根 handleMouse。`dist/tui-alt-screen.js:502–515` overlay 未处理的滚轮仍可能进入 routeWheel；`dist/tui-alt-screen.js:795–808` 路由查询主 currentLayout 而非 overlay 布局。因此只设 ScrollView.overscroll=contain 不能阻止 overlay 滚轮影响底层主对话。

可以通过公开 handleMouse 消费 wheel 并调用 ScrollView.scrollBy(event.wheelDelta)，这部分不需要自行解析协议/重复加速。但它解决不了 overlay 缺少公开原生布局求值的问题。

## 无产品写入的宿主探针

Node v24.14.1，直接加载已有安装版 pi-tui 1.2.0；未 start 终端、未请求模型、未安装依赖。使用 HEADER / 30 行正文 / FOOTER 的 VStack，在 30×8 overlay 中分别检查 TuiMainScreen 与 TuiAltScreen：共享 overlay 截取丢失 FOOTER，ScrollView.viewportHeight=0。显式内部 renderLayoutFrame 后 viewportHeight=6，FOOTER 保留，scrollBy(5) 后 scrollTop=5。

第一次探针 b07kk5qex 在断言后因 fixture 未设 stopped=true、showOverlay 的定时渲染触及拒绝写入的假 terminal，最终 exit1，不能记为 PASS；无实际终端输出。修复 fixture 停止标志后重跑 by1uj3duj 自然 exit0，所有断言通过且 terminal writes=0。该内部导入只用于核实，不授权产品实现。

## 非弹层路径补充核实

用户明确质疑是否必须使用弹层。现有全窗口 overlay 是既有实现方式，不把它自动当作用户必须保留的产品要求。

已核实 `pi-coding-agent/dist/modes/interactive/interactive-mode.js:2324–2382`：非 overlay custom 挂到 editorContainer，关闭时恢复编辑器；它不是原生全窗口页面切换。editorContainer 在 `interactive-mode.js:406–407` 用普通 Container 创建。`pi-tui/dist/layout.js:49–68` 将没有原生布局节点的组件作为叶子（children=[]），不会继续识别其内部 ScrollView，因此此路径也不可直接获得原生正文视口。

独立只读 Agent 783e89c0 的离线宿主探针确认：Fullscreen 中 viewer viewport=0、wheel 命中树无 viewer，滚轮会移动主对话；Regular 输出仍为完整无界内容，即便 updateLayout 后 render 也不按 scrollTop 裁剪。真实终端和模型访问均未运行。主会话核对完整报告、官方 TUI README 与关键 layout 叶子分支，结论一致。

官方 `pi-tui/README.md:121,164` 明确说明有界原生 Stack/ScrollView 布局只适用于 TuiAltScreen，不适用于 TuiMainScreen，render(width) 直接调用返回无界内容。

公开 setLayoutRoot 可以在 Fullscreen 切到自有布局，但没有公开 getLayoutRoot 或 push/pop 恢复接口；setLayoutRoot(undefined) 回到隐式文档，不恢复 Pi 原来的 dock，custom done 也只恢复编辑器。它适合独立应用拥有布局，不是当前 Pi 插件安全临时页面入口。

结论：不必须使用 overlay，但去掉 overlay 不能解决本任务。安装版 1.2.0 没有已支持的公共插件挂载方式同时满足原生有界正文/滚动条、固定区域、两种 mode 和安全恢复。目标要完整实现仍需上游公开 bounded-custom 支持，或明确批准内部 layout 适配；原生 ScrollView 选型不变。

## 已批准方案：隔离的原生布局适配

用户于本会话明确批准：保留全窗口 overlay，在独立 `lib/task-browser/native-layout.ts` 中接入宿主内部 `dist/layout.js` 的 renderLayoutFrame；通过实际包解析定位，不写死安装路径、不复制 renderer。TaskBrowser 使用原生 VStack/ScrollView，由适配器求值有界 frame 并返回 lines；公开 handleMouse 消费 wheel、仅正文内转交 active ScrollView.scrollBy，固定区域与边界 wheel 也消费防穿透。Regular 使用同一有界布局输出但不捕获鼠标。关闭继续 custom done，不替换 Pi 主布局。

内部接口风险已明确接受：集中接入、校验能力、不兼容明确拒绝打开，不静默降级自制滚动条；验证宿主 1.2.0 不代表未来所有版本兼容。可使用原生 frame 的正文几何作命中判定，不自建布局算法。唯一滚动权威为各 ScrollView 实例，保留各页位置；键盘选择才 ensure-visible。实现与独立审查按 implement.md 单 stage 完成。

## 历史核实方向（已由上述授权解决）

原定目标不变：原生 ScrollView、常驻滚动条、移除翻页键、不额外点击/拖动、Regular 键盘回退。现需决定接入限制如何处理：

- 推荐依赖上游公开 overlay 布局支持/公开有界原生布局求值，再按原生实现；本仓库产品暂不强行落地。
- 如用户明确接受内部 API 兼容风险，可进一步规划受隔离 adapter 管理的原生 layout 求值与公开 handleMouse wheel bridge；需更新此前“不依赖宿主内部模块”的边界，不能直接实施。
- 不采用自制滚动条，不复制宿主 renderer，不强制替换主布局或切换 Fullscreen，不修改 Pi 本体。

实施方案见 implement.md；必须先解决此接口边界、重新审阅方案，不能将 API 类型存在当作 overlay 功能验收。
