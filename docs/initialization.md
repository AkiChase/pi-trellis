# 项目初始化

## 命令与确认

```text
/trellis-init
/trellis-init --user "Your Name"
/trellis-init --check
/trellis-init --help
```

命令在没有 `.trellis/` 时也注册。只有原生 UI 确认授权写入；无 UI 调用返回状态/指引，不触发模型回合或写文件。未知、重复、缺值参数先失败，无 force、任意上游迁移或非交互写协议。菜单、help、通知保持英文，`--user` 跳过选名字，不跳过最终确认。

`lib/initialization/engine.ts` 管理 inspect/plan/apply，`command.ts` 管理交互。包的 `runtime/` 是源码，不依赖外部 CLI 或 trellis-core 生成项目。任务默认结构来自 `common.task_store.task_skeleton`，开发者/journal 来自 `common.developer.developer_skeleton`，CLI 创建复用相同工厂。

新项目创建固定 runtime、三角色、可编辑 Pi workflow/config/spec 入口与 thinking guides、identity/workspace 和 bootstrap 任务。支持的 clone 设置 identity 时只补缺失 identity/workspace/onboarding，保留历史与其他任务。同名无操作，异名冲突；保留合理 Unicode/空格，拒绝危险路径片段。Onboarding 使用上游兼容的小写/NFKD slug，复用时核实际 creator/assignee/record/PRD，冲突报错；已归档 onboarding 不阻止重建缺失活动目录。不生成 frontend/backend 规则或自动扫描代码。

## 更新托管资源

已初始化项目提供 `Update project resources`、`View project status`、`Cancel`；健康 ready 项目还提供 `Apply template`。更新也修复缺失托管文件，无独立 repair 菜单；无变化显示 `Project resources are up to date.`。状态列出 installed/available runtime ID 和每个文件的 missing、modified、current、safe-update、preserved 状态，而非只有菜单摘要。Skills 从已安装包加载。

`lib/initialization/resources.ts` 构建只读预览：匹配已记录指纹的文件才可更新，缺失 owned 文件可恢复；修改过的 runtime/role 阻止发布，不能强制覆盖。未改 package-default 文档可更新，定制文档和原先 preserved 文档仍属用户。不会重建已有 identity/tasks/logs/session/bootstrap/onboarding。未知 inventory/schema 需明确处理，不是通用旧版迁移 API。

确认后加锁、重新检查，manifest 最后写入。单文件原子发布，不是多文件事务；中断保留已写文件，重试只接受精确新包字节作为已执行结果，不接受任意修改。旧完成 init record 作为审计保留，不参与 live recovery。成功刷新宿主并 reload；`--check` 只读。

## 接管无 manifest 的已有项目

已有 `.trellis/` 但无托管 manifest 的 unsupported 项目，只有显式 `Adopt existing project` 能转成托管项目。`lib/initialization/adoption.ts` 的 `adoptPlan()` 只读；已发布 manifest、init operation record、锁、托管 worktree 绑定、HOME、不支持的 Python 或 managed 路径 symlink/nonregular 都在写前拒绝。

原生 select/confirm 标题无 viewport，`boundedDialog()` 将 body 限 14 行并提示 `/trellis-init --check`。接管确认显示各状态计数和 legacy 路径数量，完整路径报告在 status/`--check`：35 个 runtime/role 路径的 `Install`/`Replace`，缺失模板的 `Create`，已有模板的 `Preserve`，字节/模式相同的 `Current`，根文件的 `Replace block`/`Append block`/`Create`/`Append journal attribute`。`.trellis/.version`、`.trellis/.template-hashes.json`、`.pi/.pi-trellis-hashes.json`、`.trellis/agents` 与非 inventory 脚本标 `Legacy — left in place`。Legacy 枚举有深度/总量限制，symlink 只列出不跟随，报告省略数量。

接管经过用户确认后**无备份替换**旧 runtime/role 与 AGENTS/gitignore managed block。存在 marker 时，`replaceBlock()` 要求唯一完整成对标记，只替换区域，保留外围字节；无 marker 则按严格 `appendBlock()` 添加；重复/不完整/畸形/未知标记拒绝。保留原文件 mode，不删除任何内容。

已有模板不写入，来源记为 `preserved-project`，使用实际指纹和项目 Git revision（或 null）。Identity/tasks/journals/spec/config 字节不变，不建 bootstrap/onboarding；无 identity 的项目进入 supported 后复用独立身份流程。计划仍只读时必须通过权威 manifest validator。

`applyAdoptPlan()` 重建/比较签名、取得共享 init.lock、每次写前重查，manifest 最后发布，再要求 `verifyRuntime()` 与 ready/supported inspection。没有 operation record：中断保留 unsupported 状态和已写资源，下次预览标 Current，重新确认才能完成。错误明确说明保留部分文件、无备份/回滚。不能接管时，`--check`/status 退回普通 inspection 摘要。

## 显式采用模板

健康已有源项目的 `Apply template` 可选 Workflow、Spec 或 Workflow + Spec。一份 Replace/Create/Same 列表确认，无 diff viewer 或逐文件选取；取消只读。它**明确替换用户文档**，不同于安全资源更新。

- Workflow 只选 `.trellis/workflow.md`。
- Spec 只选 bundled `spec/index.md` 与三份 `spec/guides/` index/reuse/cross-layer 文档。
- 其他项目 spec/config/runtime/agents/identity/tasks/journals 不变。
- Same 指字节与 mode 相同，不写；选中模板（含 Same）的来源改为精确 package-default，供以后安全更新识别。

`templatePlan()` 重建固定 allowlist 和包字节，要求当前未修改 runtime，保护 manifest、init operation 与选中文档。`applyTemplatePlan()` 在共享锁下重查；替换前把原文档（含 mode）及 manifest 备份到 `.trellis/.runtime/template-backups/<uuid>/`，保留相对路径并报告位置。Symlink、nonregular、oversized、伪造/过时计划与包 hash 变化拒绝；manifest 发布前，即使文档已换，仍核当前包 provenance。

单文件原子而非事务；失败保留备份和已写文件，错误指向 backup，不自动回滚/隐式恢复。Manifest 最后发布。成功只刷新 context，无 runtime 部署、hooks、任务激活、安装或自动 reload；不支持远程模板。

## Manifest 与来源

`resources/runtime-baseline.json` 是运行时来源/产物与 release identity；template/skill-baseline 保存 curated resource hashes/licensing；`resources/agent-baseline.json` 独立记录角色来源。来源与许可详见[运行时基线](runtime-baseline.md)。

项目 `.trellis/.pi-trellis.json` schemaVersion 2 恰有 `schemaVersion`、`runtimeReleaseId`、`files`、`templates` 四字段；替换未发布 schema 1，无 schema-1 fallback 或通用迁移 API。Runtime baseline 自身 schema/release ID 不变。

| 字段 | 校验与含义 |
| --- | --- |
| files | 恰 32 runtime + 3 role 路径；每条恰 sha256/mode/kind（runtime 或 agent）/source，四值须符合包基线。运行前核 runtime 字节/mode；角色只在获准 init 发布，身份设置保留已部署角色及定制 |
| templates | 恰八个已知 workflow/config/ignore/workspace index/spec entry/thinking-guide 路径，不能任意加路径；每条恰 origin/sha256/mode/source |
| package-default | Fresh init 使用精确包初始 hash、0644 与 canonical resources/templates 来源；伪造 hash/mode/source 拒绝 |
| preserved-project | 明确接管/已审核一次性迁移保留的内容，不是安装产物；实际初始小写 64-hex hash 与 0–0777 mode，缺失时两者同时 null；source 恰 kind: project-snapshot 和 revision: null 或小写 40/64-hex |

Revision 仅诊断快照，不是文件/可执行来源或 fetch/read/write 授权。未知字段、畸形 hash/mode、混合 null、错误标签/revision/target 拒绝。模板 provenance 是有界初始声明，不是历史部署认证或覆盖用户改动权限；当前文档无需匹配初始 hash，初始缺失可继续缺失，但 managed 路径/祖先仍拒绝 symlink/nonregular。

普通 fresh init 不能直接请求 preserved provenance 或接管无 manifest legacy；接管使用独立显式菜单。支持 clone 身份设置保留完整 manifest 和模板；fresh init 遇未知/custom role 冲突并保留。

AGENTS/ignore 根 block 仅在缺失时添加或复用精确已知 block，未知/定制/重复/畸形冲突；保留外围字节与 mode。Journal merge=union 属性只添加，冲突拒绝。Managed 路径/祖先 symlink（含 dangling）和 nonregular 拒绝，root 本身可正常 resolve；HOME 和 managed worktree 初始化拒绝。

## 中断与恢复边界

持久记录不可信：planHash 检测漂移，不能授予写权限。Validator 拒绝未知字段，从包资源与共享 skeleton 重建 runtime/role/template/identity/task 字节；非根 action 只建缺失文件，根 action 必须证明原前缀 hash 并添加 canonical block，保留 mode、拒绝重复/冲突 marker/attribute。

核完整固定 resource set/source/kind/hash/mode 与独立模板 provenance；fresh init/recovery 必须 canonical package-default 输出，不能仅凭有效 installed manifest。Preserved provenance 不授权模板 action、任意输出、身份阶段模板写入或旧项目初始化。最终 manifest 与完成前核所需输出；operation 未完成即阻 runtime，即使 manifest 已写。

Apply 使用 `.trellis/.runtime/init.lock` 与有界 schema-1 init-operation.json，记录精确 planHash/original-output guards/completed steps；锁前/发布前重查。文件通过独占同目录临时替换，manifest 在所需输出后写，持久 identity/runtime/results 验证后才标 complete。失败保留文件，不删除任务/历史回滚；重试只接受同 operation/release/developer，且字节/mode 为原始或 owned 输出。漂移冲突，残留锁不猜 stale/自动删。首个 operation record 前的目录创建与 OS 并发祖先替换仍需保守人工处理，不是全项目事务或 OS 沙箱。

## 宿主集成

- 原生 dialog 可用于 interactive/RPC UI；input 第二参数是 placeholder，不是 Git identity 预填。历史候选有界，跳过危险名字。Git/Python 使用 argv、净化环境、`-B`/no-bytecode。Init 不运行 hooks/绑定/install/代码扫描/模型回合。
- 成功清 context/task/section/display caches。Fresh init 用 command context reload 根 instructions/roles 后立即返回。Skills 是包资源，不复制到 `.pi/skills` 或 extension bridge。
- Adapter guard 用实际 Pi resolver，含 project precedence 与 autoload:false delta；缺来源跳过，不安装。可信 source host 的持久配置不同于父进程一次性 `-e`。
- Pointer 错误保持 task_error，不变成 no_task。只有 command-bearing bash/bash_bg/monitor 显式 session export，WebSocket/其他工具不变；相关结果使缓存失效。
- 所有已部署 release（含 manifest-less）在 session adaptation、task/context Python、child binding 前须完整 manifest/hash/mode 成功；缺失/畸形/不完整/不匹配给 task_error 与 `/trellis-init --check`，不是 No active task。
- Unsupported root 阻止可识别 task/context/developer/journal/worktree shell 调用、常见 wrapper/module import 与 Trellis role launch；普通读取/搜索、无关 shell、其他 agent、WebSocket 仍可用。识别不是任意 shell 解释器或沙箱，动态构造命令、外部 provider/独立 subprocess 不保证拦截，native worktree 算法不变。

## 验证边界

临时完整 runtime 项目覆盖 init/clone/no-op/collision/partial retry、phase parser、task/context/journal；fake dialog 覆盖英文流程与取消，真实 Pi loader/resolver 覆盖 resource discovery/filter。已有 unsupported-execution 红证据属于历史，不能当当前行为；修复后回归在 `tests/initialization.test.mjs` 等测试中。

这些证据不等于真实视觉 TUI、在线模型/provider、用户项目部署或全面 Python/平台矩阵。无 lint/typecheck script，Node TS 执行不是静态检查。[tmux 指南](testing/tmux.md)与[provider 探针](testing/provider.md)是另行授权的操作，不是本页通过记录。
