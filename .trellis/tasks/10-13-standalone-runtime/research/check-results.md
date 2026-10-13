# 独立 runtime 检查结果

## 结论

独立检查发现并自修 **5 类范围内边界问题**，最终真实完整 runtime 定向 **23/23**、全量 **167/167**，均 exit 0。可将本子任务固定源码/契约交给 init 集成，但不代表已部署、父任务整体验收或真实 provider/TUI 验收。

最终 `releaseId`：
`pi-trellis-runtime-v1-bba8fd834a8b249ad08a703091f6434c8822dd4a44d23a98855097db4cb31304`

实施报告中的旧 releaseId/16、160 是修复前证据，不能用于检查后发行内容；以本报告和最终 `resources/runtime-baseline.json` 为准。

## 审阅范围与来源

- 已加载完整 curated check.jsonl 的 8 项、子任务 PRD/design/implement、相关完整 extension/scripts/guides specs、统一授权及实施报告；另检查实际 staged/unstaged/untracked 文件。
- 包内 runtime 32 文件，来源元数据、docs/runtime-baseline.md、真实 runtime tests；特别检查 task/context/package/journal/developer 的入口、共享路径/记录层、start/current/finish/hooks/archive/staging 的实际调用链。
- 路径迁移的 query/deployer/tests/README/specs，核对删除 python/ 对应新增 runtime/；未根据空 git diff 推断无工作。
- 本次未提供 `Review base`，不推断其他历史审阅范围。当前 HEAD 为 `9af75d2f52f78ee932bb31563cc29fe7ce5a9b73`；仅按原生来源清单明确记录的修订逐字节核对原文件。
- 独立定位 `/opt/homebrew/lib/node_modules/@mindfoldhq/trellis`，确认 package version **0.6.16**，模板原始 **28/28 hashes** 匹配。未调用全局 CLI 生成资源、没有网络/安装。
- runtime 最终 **32/32 hashes** 与清单匹配；native **7/7** 与记录修订的 `git show <revision>:python/...` 字节一致，仍 MIT，无算法修改。上游/适配 AGPL 文件均有 SPDX，来源/许可分离，未虚称上游 Git revision。
- AST 依赖闭包、全部源码 in-memory compile/3.10 syntax、npm pack dry-run 内容/AGPL license 由真实测试核对；全部 common 模块被覆盖，无全局路径导入依赖。

## 发现与修复

1. `runtime/common/task_records.py:16`：safe_segment 在 trim 前检查 `.`/`..`，`" . "` 可先创建 workspace 和错误 identity，随后才报错。改为检查 trimmed dot segment，同时保留对原始控制字符的拒绝。测试覆盖普通/Unicode 空白包围的 dot，断言 identity/workspace **无写入**。
2. `runtime/common/active_task.py:102,195,299,364`：原逻辑仅拒绝最终 pointer symlink，sessions/runtime 父目录仍可重定向外部，导致 current 授权外部 pointer、finish 清除目标、start 写入。新增本地目录链校验（不借用外部 source task-store 例外），start 拒绝最终 pointer link，current 保留 invalid-pointer，finish 仅可删除最终 link 本身，非法父目录拒绝。内部 lifecycle pointer reader 同时改为 bounded regular read并容错深层 JSON，避免 archive/rename 枚举读取外部 link。archive 先校验 runtime 再修改 task。测试验证 victim bytes、status、hooks 均不动。
3. `runtime/common/task_utils.py:113`、`task_store.py:1226`：archive/月份父目录及 dangling destination links 未在 mutation 前检查，任务会移动到 store 外并误报成功。预检准确 destination 路由/目录类型，拒绝链接及越界；实际 mover 再检查。负例验证 task/child/pointer bytes、外部目录不变；已有目标 collision 也在 mutation 前拒绝。不改变原生 worktree 算法。
4. `runtime/common/paths.py:87`：developer identity 最终软链接被当作本机有效身份，init 同名返回成功。拒绝非 regular/link identity，测试 identity/workspace links 均保留外部字节并拒绝发布。
5. `runtime/common/task_context.py:159`：`task.py validate` 仍直接 raw read task.json，可对外部 redirect/坏 record 报成功，nonobject 还可崩溃。改为共享 bounded record authorization + branch string projection；坏/外部 record 明确失败，optional malformed branch 不崩溃。

以上修复同步更新 final hashes/releaseId 和 runtime contract 文档；新增 7 组测试（原16→23），包括真实 create→curated manifests→start→current→finish、准确 hook TASK_JSON_PATH、坏 hook scalar 诊断以及 Git 原始字节/许可断言。

## 真实验证

环境：macOS，Node **v24.14.1**，Python **3.14.7**；使用实际已安装 Pi host，不安装依赖。

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  node --import ./tests/host-tui.mjs --test tests/runtime-contracts.test.mjs
# 最终 23/23，exit 0，14.51s；check-focused.log

env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  npm test
# 修复前独立160/160；最终167/167，exit 0，78.77s；check-full.log

python3 -B .trellis/scripts/task.py validate .trellis/tasks/10-13-standalone-runtime
# 两个 manifests 各8项，通过；只读校验，不执行真实项目 lifecycle。
python3 -B .trellis/scripts/get_context.py --mode packages
# single-repo，extension/scripts，exit0。
bash -n scripts/install.sh
# 仅语法，exit0；不是安装/全 lint。
git diff --check
# 通过。
```

所有产品行为测试复制 **完整 runtime** 到 disposable Git fixtures，Git commits/hooks/pointers/journal/archive/identity/symlinks只在 fixture 运行。已实际验证 foreign/noidentity/empty/invalid override、坏/stale/oversized/nonregular record、允许外部 source task store及拒绝外部 raw refs、child bind/finish/不复活/失败不借parent、exact archived journal path、basename victim、exact archive destination/source delete/edited child.json，以及 unrelated staged index 与旧归档/child artifact 保留。PATH 仅 git 时运行 supported CLI，禁用 bytecode，未产生 runtime __pycache__/update markers。

补充独立 guard-removal 实验：`check-mutants.log`，5个边界在修复版本拒绝副作用；只在临时完整副本移除各自防护后，**5/5 重现坏结果**，包括 dot identity 写入、external pointer授权、外部 archive移动、identity link读取、raw validator误报成功。实验不修改用户项目源码。新增 actual hook-path 测试首次因 macOS `/var` 与 `/private/var` 别名断言失败，修复测试为 realpath 对比，产品不需修改；最终定向/全量均重跑通过。

Lint/静态 TypeCheck：本包无命令，**不可用，未声称 Passed**；Node TS execution 不是静态检查。Python3.10只验证语法，不是3.10实机矩阵。真实 provider/model/TUI、Windows、插件安装/重载均未运行。

## 未修复/后续边界

- UI error/task-state投影、strict TS override/command tool scoping、发行就绪/有效 adapter 配置仍在 init 集成子任务，不因 runtime 单独通过而称已解决。
- hierarchy cycles/render/filter、rename pointer redesign、journal semantic retry、snapshot symlink/mode属于已暂缓范围，不扩展修复。工作树快照不是完整安全扫描。
- inherited 上游 context CLI 的多平台/monorepo help/探测仍存在；runtime 本子任务没有添加平台布局、init project detection或多package生成。Pi-only UX/skill/模板裁剪由后续集成审阅，不能把本报告当作全产品已裁剪证明。
- trusted hooks 仍执行任意 shell；逐文件原子发布/读前校验不是目录事务或OS沙箱，不保证消除编辑器/文件系统竞争。没有新增大范围并发状态设计。
- 初始化 frontend/backend/package/bootstrap及 `.agents` 迁移未做，本次没有部署 runtime 到当前项目。

## 保留性与收尾

当前项目 `.trellis/scripts` 原始 **28/28 hashes 不变**；native7文件保持字节一致。未编辑 `.trellis/workspace`、`.developer`、项目 `.agents`；未写真实 session pointers；未编辑 parent/init/migration planning材料。未 install/reload/stage/commit/push/切分支，未运行真实项目 finish/archive/add_session/init。任务仍 in_progress，生命周期和后续验收由主会话决定。
