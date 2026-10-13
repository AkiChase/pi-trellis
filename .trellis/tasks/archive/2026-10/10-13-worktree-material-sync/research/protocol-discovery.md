# 协议发现与注入边界研究

## 当前证据

- `extensions/trellis.ts:renderOverview()` 的现有两行负责 CLI 子命令发现与正常流程；不应再叠加第四种常驻协议注入。
- `before_agent_start` 通过 `systemPromptOptions.sections` 缓存 overview/workflow；headless compact 仅省略 workflow，并不省略 overview。因此不能用 hasUI 判断主/子角色：无 UI 的主 Pi 也需要管理协议。
- `parseDispatchFacts(event.prompt)` 与 `taskBySession` 已识别派发任务；此格式是上下文来源信息，不是安全认证。角色展示选择可使用有效 Trellis role 的派发事实并记忆会话角色，不能将该判定当工具授权依据。
- 子代理独立 key 在 inheritDispatchTask 中生成；传入绑定 context 是 provenance，目标准备指针与具体子会话指针并非必须完全相同，不改变已有隔离实现。
- renderState 负责当前 task/阶段/binding 状态，不需要承载完整教程。assembleDispatchPrompt 负责执行事实及动态材料，不能将材料 revision 放到稳定 overview 前缀。

## 推荐落点

1. 包内新增 `docs/worktree-execution.md`，由插件用 import.meta.url 解析到包的真实位置，注入可直接 read 的绝对路径。管理命令始终是固定项目入口 `.trellis/scripts/worktree.py`，文档路径不用于执行命令。不新增用户项目文档部署、摘要或定制保护体系。
2. overview 的现有两行收敛到不超过四行：管理入口、dispatch/stop、主会话留源目录和临时 isolation 禁止、首次受管操作前 read 协议路径。缺 CLI 保留简短明确诊断，不自动安装；缺包文档也显示诊断。
3. 角色来源与缓存一起处理：有效 Trellis 派发 role 的会话显示执行边界而非管理教程；不以 headless/hasUI 判断。首次角色识别或变化时使对应稳定 sections 缓存失效，不能复用主会话说明。现有 taskBySession 的不复活语义保持。
4. 不改项目 workflow.md、renderWorkflowSection 的正文源及现有阶段 breadcrumb。文档给出正常路径/刷新/收集/故障分节，参数细节引用 CLI help。
5. 工具描述与拦截消息保持短说明/具体下一步，必要时给同一文档引用，不能每个错误展开一份教程。

## 验证建议

- renderOverview 主会话说明行数/协议文件存在断言；无 UI 主会话仍有协议引用。
- 实际 before_agent_start 的主/子角色和缓存切换测试，普通 prompt 中提到 task/角色不能触发错误抑制。
- 子代理 context fallback/独立指针测试不回退；协议 revision 只在动态 dispatch，稳定 system sections 不随材料更新改变。
- 包路径含空格、安装目录移动时文档由当前包路径解析；文件缺失诊断，不尝试安装或写用户项目。

## 尚需实施前阅读

改变 Pi event/sections API 前完整阅读官方 extensions.md 及相关引用；若只使用现有 sections 接口，也记录实际 API 兼容验证，不将 fixture 当真实 provider 证据。
