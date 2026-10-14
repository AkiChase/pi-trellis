# 只读宿主核验

环境：Pi 1.2.0，Node v24.14.1。规划期间只读宿主文件；临时 fixture 写入并删除，没有修改产品或个人配置。

## 宿主证据

- 已完整读宿主 docs/packages.md、extensions.md、skills.md、settings.md 和 examples/extensions/dynamic-resources/index.ts。
- dist/core/agent-session.js: bindExtensions 先 emit session_start 再 extendResourcesFromExtensions；后者调用 resources_discover 并重建 system prompt。
- reload 关闭旧 runner、重新加载资源、重建工具 registry，再执行 session_start/discovery；无通用 unregisterCommand，不应直接删除内部 map。
- ExtensionAPI registerTool 会刷新工具 registry；registerCommand 更新当前 extension commands，runner.getCommands 动态解析。故 session_start 可条件注册，真实 SDK 验收仍必需。
- 当前 AgentSession 的 _cwd 仅构造赋值，不提供跨项目热切换 public setter。支持新宿主/重新加载和同 cwd 会话替换，不虚构任意 cwd 热注销能力。
- resources_discover 只追加资源，动态 paths 带 temporary/top-level provenance；不会自动套用 package filters。
- DefaultPackageManager、SettingsManager.fromStorage/getGlobalSettings/getProjectSettings/isProjectTrusted 为公开 API；filter 实现不是公开 API，禁止调用 private 方法。

## 临时 resolver 实验

fixture 包 manifest skills: []，保留 skills 目录；实际 Pi DefaultPackageManager 测试，无 install，退出后删除 fixture。

第一次实验 5 项通过，第 6 项误把 `+path` 当白名单而失败：Pi 1.2.0 实际 `+path` 是加法，默认保留所有候选。这是实验预期错误，不是产品缺陷。

修正后使用 SettingsManager.fromStorage 的只读虚拟设置（为本包缺省 skills 注入候选 glob，显式过滤和 delta 保留），7 项通过：default10、normal empty0、delta empty10、delta exclusion9、plain whitelist1、plus native semantics10、untrusted ignores project filter10。证明可用宿主 resolver 复用过滤，不需要手写 glob 或改磁盘设置。

## 实施仍需验证

- 与真实本包安装身份匹配，只改选中的本包虚拟 entry；不修改其他包，不自动补造永久安装 entry。
- command/tool 注册在真实 SDK bind/reload 中可见，未初始化 registry 没有 viewer/dispatch。
- noSkills 的宿主规则、CLI临时 -e、用户/项目重复 source/ref 身份、trust拒绝、显式选项行为。
- 用户显式手动 skills 路径或强制静态资源 filter 由 Pi 控制，不能声称本插件能撤回其他资源来源；本任务保证自动路径不注入。
- 旧会话历史已有 Trellis 消息/AGENTS 属宿主历史/项目内容，不清空历史。本任务保证不新增错误项目上下文。

源项目并行 dirty（部署runtime、manifest、workflow/spec、历史plans删除及runtime-tool-names任务）均保留，不纳入本任务。
