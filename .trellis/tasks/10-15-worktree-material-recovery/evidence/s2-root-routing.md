# S2 接线核对（实施期间只读）

## 2026-10-15 完整阅读

已通读 `runtime/common/{paths,session_context,active_task}.py`、`lib/task-context.ts`、`extensions/trellis.ts`、`lib/project-state.ts`；S1 native owner 已完整通读并单独派普通 Agent 实施。

- common `get_repo_root()` 以 cwd 为根；session_context 同时把 repo_root 用于管理路径和 Git 信息。全局将 get_repo_root 改成source会把代码Git状态也换成主根，不能这样做。
- active_task 的 set_active_task(task,repo_root) 已接受明确根；源root + 独立child key即可在source忽略runtime登记，无需target task副本、无需start/hooks。
- extension `Session` 当前只有root，所有task/workflow/context读取及runPython都使用它；应该区分 executionRoot/source materialRoot，进程cwd不切换。source脚本从source cwd运行且传child key，不用让任意env强行重定向公共path API。
- `findProjectRoot`、project registration按实际cwd进行；startup registration在首次prompt前完成，因此不能只在inheritDispatchTask里改root并让registeredRoot跟着source跳转。应保留registered执行root身份，将验证后的子authority事实以session map保存，单独对materialRoot加载workflow/task、CLI；执行目标配置/marker校验独立进行。
- parser当前三行header不足以证明authority；新prompt事实需结合已验证binding（managed）、source同根（unbound）验证task/source/execution，不能信任prose root。
- 普通Agent入口在source调用和managed RPC均需路径contract，不能只改RPC。
- 前台readTaskRecord直读可复用sourceroot，目标checkout中的旧task不能介入；read/diff/source Git不可混成同一个global根。

## 最小化建议（S2实施前落实design）

优先不修改common paths/session_context/active_task：现有显式repo_root参数足够，extension用source cwd执行受支持source CLI，source pointer独立key；目标Git状态在TS target snapshot或单独目标Git只读调用取得。这样避免新环境source override扩散到所有任务/lifecycle消费者。需在S1 checkpoint后对桥接与child接线验证，再根据测试证据决定是否真正需要common修改；若不需要，更新design清单而非为了计划机械修改。

当前只是调用分析，不作为通过测试或真实宿主证据。S2尚未开始产品修改。
