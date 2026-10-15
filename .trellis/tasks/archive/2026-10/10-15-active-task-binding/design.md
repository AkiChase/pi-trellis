# 技术设计

## active：暴露已有纯绑定能力

在 `runtime/task.py` 新增 `cmd_active`、usage/parser/dispatch。复用 `resolve_context_key`、任务引用/记录验证、`resolve_active_task` 和 `set_active_task`，不调用 `_record_start_state`、curated context gate 或 hook。验证完成后仅写自身 `.trellis/.runtime/sessions/<key>.json`，沿用 `io.write_json` 的临时文件＋`os.replace`；不添加锁、不扫描或删除其他会话、不区别主/子会话 owner。

同任务重复调用返回成功且不重写指针。现存 unsafe/invalid caller pointer 不静默覆盖为正常绑定；先诊断，用户可使用既有 deactivate 清理。无当前任务可正常绑定；从合法旧绑定切换只改变自身。参数和路径规则与 start/current 共用；非法 task/identity 或写失败不改 task/hook/其他 session。

保持 current provenance、task_error、child 独立绑定、create/start/deactivate/archive 合同。更新受影响 runtime 文件的 `resources/runtime-baseline.json` adapted hash 与 releaseId，保留原始历史来源 metadata；不部署到本项目/个人 host。

## continue 合并

完整读取 start/continue，把 continue 的按 status＋artifact＋stage 记录恢复路由合并到 start，避免 in_progress 一律回到 2.1。恢复先确认当前 stage 完成/检查/提交证据；保留已授予批准范围，不重复批准，也不凭存在文档推断检查通过。无绑定时引导 active 选择用户明确指定的任务，不猜其他 session。

删除 continue 目录及 skill-baseline 条目，更新 start/support refs adapted hashes。当前 README、模板、包文档与测试同步；归档任务不改。包技能少一个，实际数量以当前目录/清单验证，不仅机械减硬编码。workflow/template 改动保持 project/custom ownership，不运行 template apply。若本项目 workflow 有并行 hunk，只提交明确本任务 hunk或保留不动并报告。

## 验证与集成

S1：runtime fixture 覆盖纯绑定、双主/child共享、合法切换、幂等、错误/unsafe/I/O 失败、无 hooks/state/其他指针/锁副作用；runtime hash/import closure 与原 lifecycle 回归。
S2：技能发现及隔离真实 SDK loader、workflow 恢复路由、来源 hash、包发布 closure，README active 用法。
S3：完整 Node/Python检查＋隔离真实宿主模拟（临时完整初始化项目/agent目录、现有 SDK、离线/无需模型），验证不同会话绑定/续接与技能发现。模拟不是在线行为/终端视觉证明。

独立检查针对公共 CLI/跨语言来源合同；主会话核实际 diff 和结果，修正后重测。原始日志/临时驱动仓外；只保存最小最终总结。最终通过按用户授权归档/journal，保持并行修改不变，不 push/install/reload 个人资源。
