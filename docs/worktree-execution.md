# 托管 worktree 执行

未绑定任务可直接在共享源目录派发，见[任务派发](dispatch.md)。本页适用于主动选择托管 worktree 的任务；首次管理操作前阅读。所有命令从**源项目根目录**执行固定入口 `python3 .trellis/scripts/worktree.py`，精确选项见各命令 `--help`。

## 创建与准备

先按项目 workflow 批准并 start 源任务。预览不会写入；只有用户批准后才重复加 `--confirm`：

```bash
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/<slug>
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/<slug> --confirm
python3 .trellis/scripts/worktree.py prepare --task .trellis/tasks/<slug>
python3 .trellis/scripts/worktree.py prepare --task .trellis/tasks/<slug> --confirm
python3 .trellis/scripts/worktree.py status --task .trellis/tasks/<slug> --json
```

- `create` 创建新分支目录；`adopt --path <已注册worktree>` 接纳同仓库、分支支持的已有目录。不接受随意目录或 detached worktree。
- 默认从 HEAD 创建；预览不是预留，HEAD 可变。需固定时用 `--base <完整commit>`。创建不复制源代码、安装依赖、启动任务或子代理。
- 默认目录为源根 `.worktree/`；可在 `.pi/pi-trellis.json` 配置 `{ "worktree": { "directory": ".worktree" } }`。相对路径从源根解析，新配置只影响新创建；既有绑定保原路径。
- 源目录应忽略 worktree 目录和 `.trellis/.runtime/`，目标也需忽略 runtime；CLI 只检查，不自动改 `.gitignore`。
- `prepare` 只复制选中的当前任务材料，不复制代码/spec/config。目标需已有兼容已提交运行时；基线引用差异或目标冲突会拒绝，不自动补装。
- 准备确认会在目标用独立身份运行 task start，可能执行已配置的 after_start hook，预览应先审查。重复 prepare 只验证，不偷偷同步需求。

## 派发与状态

主 Pi 会话保持源根目录。准备完成后调用：

```json
{ "agent": "trellis-implement", "task": ".trellis/tasks/<slug>", "prompt": "实施已批准范围" }
```

`trellis_dispatch` 返回真实 agent ID，可用于结果查询和 steering。provider 使用已存在的目标目录和 `isolation: off`；不临时创建 worktree，绑定损坏或未准备不会回退源目录。需要持久 adapter 配置，父进程一次性 `-e` 不足以保证子会话加载。

状态报告材料变化、冲突和已完成检查是否仍有效。检查完成不等于验收；需求或目标变化可使旧结果过时，仍需主会话读报告与实际 diff。

## 更新材料与收集输出

源需求变更获批后，预览 `refresh --task ...`，审查路径与 diff，再批准确认。重复 prepare 不代替 refresh。单边源修改可同步；目标修改会保留；双边冲突整次拒绝，不自动文本合并或 force。基线代码/spec 不复制，需另行协调。刷新不重新 start 或运行 hooks。

`collect --task ...` 无文件参数仅列候选；确认收集需重复明确的 `--file <当前任务项目相对路径>`。只选当前任务文档和文本研究/证据，不收代码、runtime、其他任务、隐藏凭据、binary 或 task.json；不接受目录/glob/全部选择。新增材料依赖需一并明确选择，目标删除不传播为源删除。

收集不会提交、合并或归档，也不代表输出已接受。先由主会话审查，再按已批准 workflow 集成。源任务是唯一归档主体，不独立归档执行副本。

## 停止、恢复与清理

starting/running/unknown 阻止同步和清理。`trellis_dispatch { "action": "stop", "task": "..." }` 仅请求停止，终态证据才释放占用。超时、关闭或不确定启动保留 unknown，需查实际 provider/进程；工具不自动重试派发。

托管 `recover` 需证明 owner 已死，重置准备状态后还需处理材料问题并准备；不能修复任意身份或缺失运行时。共享源执行不适用此 recover，见[派发说明](dispatch.md)。残留锁需人工检查，不猜 stale 删除。

`remove --task ... --integrated-into <保留提交的引用>` 先预览 ignored 文件风险，获批后确认；目标必须干净且提交已被该引用保留。普通 Git removal 不 force、不删分支、不删当前 cwd。任务材料常令目标 dirty，应先批准收集/集成保存，不强制清空。已手动移除的目标可明确解除绑定，分支仍留。

多文件操作中断保留已写内容与错误状态，不承诺整次回滚。worktree 与角色规则不是 OS 沙箱；工具不自动推进阶段、安装、提交、合并或归档。
