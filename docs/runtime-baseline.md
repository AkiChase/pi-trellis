# 固定运行时基线

## 来源与许可

`resources/runtime-baseline.json` schema v1 记录固定 **Trellis 0.6.16** 来源。原项目 28 个 Python 文件与已安装 npm release 的 `dist/templates/trellis/scripts/` 逐字节比较；包只收录五个支持入口及 AST import closure（24 个原文件），不含未使用的 cli_adapter.py/task_queue.py/root __init__.py/hooks/linear_sync.py。Manifest 保留完整原始 SHA-256 inventory，不声称已核上游 Git revision。

Trellis 派生 entries/common 保留 **AGPL-3.0-only**、Mindfold LLC attribution 与修改声明，完整许可在 `licenses/trellis-AGPL-3.0.txt`。新增 `common/task_records.py` 属 AGPL 适配。Native `runtime/pi_trellis_worktree/`、worktree.py、private query-worktree.py 保持原创 **MIT**：最初从 python/ 字节一致迁入，后续修改保留原始 source hash/revision，记录不同 output hash 与 `modified: true`。角色来源是独立 **0.6.17**，见 [角色基线](../resources/agent-baseline.json)，不能混版本。

每个 runtime 文件有 sourceSha256、最终 sha256、source path、origin、license。Release ID 是 `pi-trellis-runtime-v1-` 加 compact sorted JSON `{schemaVersion, files: {path: outputHash}}` 的 SHA-256，package version 本身不授权部署。Python **3.10** 是 AST feature_version=(3,10) 与内存编译核验的语法下限；执行证据是 macOS/Python 3.14.7，不是完整 3.10–3.14 或 Windows 测试矩阵。

## 部署与更新

包 runtime/ 是源码，项目 CLI 执行 `.trellis/scripts/`。安装包不自动部署项目；明确确认的 `/trellis-init` 管理创建、接管与资源更新，见[初始化](initialization.md)。`scripts/install.sh` 现为 Pi-only wrapper，不执行历史 patch/部署；`scripts/patch-trellis.py` 是历史工具，`scripts/deploy-worktree.py` 只部署 native CLI/modules，不部署 Trellis common/query，不能绕过 manifest 作为全项目初始化。Native 算法只有一份，不再并存 python/ 实现。

支持固定入口：task.py/get_context.py/add_session.py/init_developer.py/get_developer.py/worktree.py；query 是 private host 入口。均 suppress bytecode。Task/context/developer 不需 global trellis，去除 update/version probe 与 update marker 写入。Config 保留现有 package-related 读取兼容，不新建 frontend/backend/package detection。

## 任务与会话契约

- Pi 推导 key，Python 只接显式 trimmed TRELLIS_CONTEXT_ID，须匹配 `[A-Za-z0-9_-]{1,128}`；畸形 override 失败，不 sanitize 到另一 key。无 platform/ticket/sole-session 推断，即使旧 fallback 参数为 true。
- ActiveTask.valid 只授权有效有界 record 的既有任务。畸形引用保留 raw_ref/error/state/source 供诊断，但 task_path/get_current_task() 为 None。
- 路径须为 `.trellis/tasks` lexical descendant，realpath 位于 resolved store；只允许 top-level source external task store，非任意 external/task link。task.json 须同 store 内 regular file、最多 1 MiB、nonempty object 且至少一 identity/status 字段。Present identity 非空 string；status 最多 128 字符，其他 projected string 最多 8192；可选 malformed 不崩 reader，children 只投影前 512 项 safe string。
- start 在 pointer/status/hooks 前要求 identity 与有效 record，缺失/畸形失败。current --json 遇坏 pointer/task 返回 null 与 diagnostic，区别 no-task/no-identity；坏任务与无任务均非零 exit。
- deactivate 只 unlink 自己 key，成功后才返回先前授权。Session runtime 祖先必须本地目录，symlink 祖先不授权读/start/deactivate/archive。Final pointer symlink 无效，可只删 link 不碰 target；清坏/stale pointer 报诊断无 hook，重复/缺失也无 hook，unlink 失败非零退出。有效 deactivate 调 after_deactivate 一次，不改 status/archive/journal；旧 finish/after_finish 不支持。
- Context/package/journal reader 拒绝坏 pointer；直接 reader 保 task_error。Raw stale ref 不选择 task files/package/journal/hook path，hook 再校验；task.py validate 复用有界 record 授权，不直接信任外部 metadata。
- Journal 只 stage developer journal/index 与**精确验证 task path**（含归档 month），不按 basename。External store 不属于本地 Git，跳过而不映射到本地同名对象。
- Archive 只 stage 实际 moved destination、source deletion、显式改动 child task.json，不整个 archive/child directory。显式 commit pathspec 保留无关 staged；destination ancestor/dangling link 在改 status/child/pointer 前拒绝。Git subprocess 清 inherited GIT_*，可信 hook 仍可执行 shell。

## 开发者身份

名字 trimmed 为 safe single segment，可合理 Unicode/空格；拒绝 empty/dot/traversal/separator（含 padded dot）、control/format/surrogate、超过 255 字符。有效 identity 不切换：同名 no-op，异名失败并报告实际名字。危险 env/file identity 不用于 workspace path；identity/workspace/file symlink 拒绝初始化。已有 journal/index 保留；scaffold 完成后 exclusive create identity，不是通用 init 事务。

## 验证与历史边界

`tests/runtime-contracts.test.mjs` 把完整 runtime 放入 disposable Git project，核真实 script effects、禁止 read/hook/commit、child bind/deactivate/non-resurrection、identity/index/history、source/output hashes、import closure、syntax 和 npm pack --dry-run。使用 real host preload（host-tui.mjs；必要时 PI_TRELLIS_TEST_HOST）。Fixture commit 不是用户仓库 commit 授权。Native worktree/material/dispatch 回归另核当前行为和 provenance。

早期 runtime 子任务曾把 hierarchy/rename/journal retry/snapshot/provider adapter/init UI/repository migration 列为后续；这是一段历史范围，不代表这些领域今天全部未实现。当前初始化/adapter/迁移状态见[初始化](initialization.md)，层级浏览见[任务浏览器](task-viewer.md)，材料与派发见[执行协议](worktree-execution.md)。未覆盖的平台或行为仍须按当次验证报告说明。

这些测试不是真实模型/provider/TUI 验收或 OS 沙箱证明。无 lint/typecheck script，直接 TS 执行不是静态检查；实际宿主/终端操作分别见[provider 探针](testing/provider.md)和[tmux 指南](testing/tmux.md)。
