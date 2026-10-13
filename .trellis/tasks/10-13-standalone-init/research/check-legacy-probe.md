# 临时 legacy guard 复现

只在 disposable fixture 执行的只读审阅探针；未初始化/修改本项目。

```text
unverifiedExecuted: true
commandBlocked: false
message: No active task for this session.
```

Fixture 只有无清单 `.trellis/scripts/{task,get_context}.py`，脚本会写 fixture 内 `executed-unverified`。调用真实 extension `before_agent_start` 后该标记存在；随后 command-bearing bash `python3 .trellis/scripts/task.py finish` 没有 block。

原因：`session()` 调用 `verifyRuntime(root)` 但忽略其 undefined 返回，`hasScripts()` 随后允许 legacy 脚本；`verifyRuntime` 的 undefined 是给 init 状态路由使用，不是运行授权。

父设计/子设计要求未知运行时只读，不能执行旧脚本。现有 integration/display/protocol/runtime-child fixtures 全部使用无清单 fake/deployed runtime；直接强制清单会使这些旧 fixture 大量失败，需要主会话统一迁移测试到真实发行基线并保留 CLI provenance/child failure 负向测试，不应为绿测提供生产 bypass。此问题没有安全需求歧义，但牵涉整体 fixture 改造，checker 保留为 **blocking**，未把全量绿测当验收通过。
