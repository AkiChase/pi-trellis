# 阶段 2 待核文档位置

阶段 1 完成/独立审查/commit 前只做定位，不提前实施阶段 2。

- README:119 managed-only `existing ready directory` 应链接统一 dispatch docs，并区分 source/managed。
- README:160 recover 必须明确仅 managed，不让用户把 source unknown 当可由 worktree recover 解除。
- README:262、docs/runtime-baseline.md:18/:113 与 extension architecture 通用 owner 说明中的 unchanged move 需变成历史迁移基线 + 当前原生修改保 source hashes/modified=true，不能伪称现版本字节未变。
- docs/index.md 加 dispatch 链接；docs/worktree-execution.md 在开头链接统一入口，其 first execution 是选择 managed 后的步骤。
- skills/trellis-meta/references/platform-files/agents.md 更新 managed-only描述。
- resources/templates/workflow.md 77–83 增量说明 unbound source/short reminder，不改部署项目 workflow。
- 可选 provider harness 原工具为 direct public RPC，不足以覆盖新版工具；需要临时 Git/adapter config + `trellis_dispatch` tool execute 路径，不加载到个人配置。
