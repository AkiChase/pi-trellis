# 托管 worktree 执行

`trellis_dispatch` 同时支持未绑定任务在共享源目录执行，见[统一派发](dispatch.md)。以下只适用于选择托管执行时。任务有 active source execution 时，终态证据记录前不能 create/adopt；managed CLI 不恢复 source execution。

首次管理操作前读本协议。命令从**源项目根目录**运行 `python3 .trellis/scripts/worktree.py`，本包文档不是 CLI 入口。精确 flags 读各命令 --help；缺 CLI/文档需明确 installation/update，不自动安装。

## 首次执行

1. 按项目 workflow 批准并 start 源任务；worktree 可选，不是所有任务必需。
2. 预览 create --task .trellis/tasks/<slug>，或 adopt 已注册 branch-backed worktree。获批后 --confirm；结果是 pinned reported base 的 unprepared 目录，不复制源代码或启动 agent。预览不是 reservation，默认 HEAD 可变；需要固定时显式 --base 完整 commit。
3. 预览/批准 prepare，只复制选中当前任务文档（可含未提交材料）。外部引用须与 target baseline 一致且 source 无未提交差异；target 已有 committed Trellis/native CLI scaffold，不自动补装。
4. Confirm prepare 用独立 context 执行**target** task.py start 与配置 after_start hook。生成 hash-only source snapshot；hook 改动仍为 target divergence，不当批准源需求。
5. `trellis_dispatch {agent, task, prompt}` 派发 approved role。主 Pi host 留 source root；provider 收既有 target cwd/isolation: off，返回真实 ID 给 result/steering。禁止临时 isolation 或 source fallback。

项目决定 phase，管理操作不自动 check/commit/merge/install/archive。Child 只在 supplied task/root/role 范围工作，补读省略完整材料，不管理 worktree 或源 lifecycle。

## 检查与时效

Python 核 identity、独立 target context、完整 refs 与当前批准 source requirements。Dispatch 在锁内 query 最新事实、渲染 target materials、再次核 fingerprints 后才 reserve；动态 prompt/record 带 revision/sourceFingerprint/targetFingerprint。

status --task ... --json 给有界 drift/change/conflict 与 check freshness。Completed check **不是验收**，须读 report。Current 要求 final checkout snapshot 与 starting material revision 匹配，无 source drift/conflict。Snapshot 排除项和大文件 size/mtime fallback 不是穷尽变更检测。

## 更新批准需求

在 source 编辑已批准材料，再预览 refresh --task ...；重复 prepare 只验证，不暗中 refresh。Drift 阻派发直到明确处理。审 paths/hashes 和实际 diff 后获批 --confirm；确认锁内重算，不是 token/reservation。Source-only 更新 target，target-only 保原 common ancestor，equal converge；不同双边改动在写前拒整 plan，无 text merge/force。

Deselected reference 在源文件仍在时保 target detached；物理 source deletion 只删 unchanged target copy，edited 留 orphan。缺 selected refs 报错。Baseline spec/code 永不复制，须明确协调。task.json 同步 whole requirements projection，保 target branch/worktree_path/status/completedAt/commit/pr_url；id/name 变动需身份处理，base_branch/meta/unknown fields 仍属 requirement。

Refresh 不 start/hooks/pointer/business code。批准 requirement/reference change 即使 target bytes 已等也 advance revision，使旧 check stale。Target-only change 没有新 role-policy matrix，role scope 仍必需。

## 集成/归档前收集

collect --task ... 无 --file 仅列有界 task-local candidates。重复显式 --file <project-relative-current-task-file> 逐个选，无 glob/directory/--all。先 preview/read diff/获批，再 confirm。

Reverse hash-only three-way 保护 source，冲突/unknown ancestry 不授权 overwrite，缺 target 不删 source。task.json/runtime/other tasks/code/symlink/hidden credential/binary 不可收集。Manifest 的新 task-local dependency 须同时显式选或已与 source 匹配，不偷偷复制。

重复 collect 幂等。收执行 input 只更新 selected accepted inputs/ancestry，保其他 source drift、使旧 lineage stale；unreferenced report 可不 advance revision。Main 仍审，collect 不批准 scope 或 passing check。

Target task 是执行副本：先 source collect/review，再按已批准 workflow 做 Git integration 和**唯一 source archive**，不独立 archive child。Collect 不 commit/merge/archive/task metadata。

## 占用、恢复与清理

Starting/running/unknown 阻 refresh/collect/remove。`trellis_dispatch {action: "stop", task}` 只请求 provider stop，终态证据才释放；stop success 不证明 child 已停。Shutdown/ambiguous spawn 留 unknown，dead-owner recovery 前查实际 ID/provider。

确认重查 plan 与每次 write contained regular path/hash，保 mode；source lock 不锁 editor。多文件/source-target publication 非事务，后续失败保已写文件、旧 snapshot、error binding，无 rollback/reset/force cleanup。Recover 只释放已证明死亡 ownership/重置 preparation，不修材料冲突或缺 scaffold；须明确处理后复用。仅新 prepared snapshots，无 old-worktree migration/baseline reconstruction。

Remove 另需 user-approved clean target 与保留提交的 --integrated-into ref；preview 披露 ignored files 风险。用普通 Git remove，不 force/删 branch/删实际 cwd；成功才清本 binding private snapshots。已手工移除 target 可显式 unbind，branch 留存。先 approved collect/integration 保存输出再清理。
