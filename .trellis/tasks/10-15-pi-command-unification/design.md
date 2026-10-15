# 指令统一设计

## 接口

仅 `/trellis-init` 与既有 `/trellis-task-viewer`，均不接受参数。空参数打开原生菜单；任何非空参数给出迁移提示，不做旧 flag 解析/用户名补全，不执行 inspect/Python。Help 改为菜单项；用户名始终走原 chooseUsername 流程。

## 菜单与预检

入口先建立 Check/Help/Cancel 的安全基础菜单，再通过只读、无 Python 的发现/执行授权快照决定 Initialize/Adopt/Set identity/Update/Apply template 可用性。不先调用会运行 Python、扫描 workspace 的 inspect 后才给用户 Check/Help；包/项目/身份发现异常仍能显示基础菜单，写操作入口失败时保留事实与指引。

选择实际写操作后再复用 inspect/plan/原确认链；不因新的菜单快照放宽 apply 验证。既有候选身份、工作区复用、取消、更新/模板/接管警告和确认语义不变。

本任务 Check 使用原有 resourceStatus/接管状态等只读事实，标明资源检查的范围，不宣称深入运行诊断；不能 apply/refresh/reload/model。它后续通过单一内部 callback/owner 接入 init-check-diagnostics 的 collector，不再新增 slash 参数。

Help 使用静态文本，不依赖 Python；Cancel 不运行探测。非交互无选择能力时只发静态使用指引；RPC 原生 select/confirm 已支持时仍可交互，不按 mode 字符串误杀。读/写行为由真实 hasUI 与公开宿主合同验证。

## 所有导航与确认

统一导航为 `/trellis-init` 后选择 `Check`。覆盖 extensions runtimeDiagnostic、task-browser unavailable、command 异常、adoptionDialog、docs/initialization 及对应 tests；Python worktree CLI 的 --help/--task/--confirm 不变。

boundedDialog 与 adoptionDialog 不再说 check 可查看完整写清单。每个确认摘要固定保留 project/scope、动作分类计数、preserved 范围、destructive/no-backup 警告后，才截断路径样例，取消默认安全。不能靠移除旧提示削弱知情确认。

## 验证与依赖

合法项目/无 manifest/fresh/坏 runtime/中断/managed target 的基础菜单可访问。菜单组装、Help、Cancel、非法参数、headless 均零 Python/写锁/模型；选择 Check 或写操作后的探测按其原合同，不以菜单组装测试证明深入诊断。

本任务不修改 Python runtime/baseline 或部署资源。用户指引还覆盖 README、trellis-meta 的架构参考与新项目 AGENTS 模板；模板文案更改必须与 `resources/template-baseline.json` 的对应单文件 hash 同阶段耦合，不部署到现有项目。若小抽取需要 engine 的纯读 validator，保留现有生产语义及负例，禁止调用 inspect 偷完成基础菜单。

先完成本任务，再由诊断任务接替 Check collector；旧 task 的 --check 产品约定由该决策覆盖。不给参数兼容后门，也不删除 Python CLI 参数。
