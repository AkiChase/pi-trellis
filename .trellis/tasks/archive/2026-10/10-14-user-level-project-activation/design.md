# 用户级安装与项目级激活设计

## 授权边界

用户已批准按完整方案在当前工作区实施；主直接实施，每阶段独立审查、验证及本地commit。不创建worktree，不包含并行修改。无个人配置、安装、push、archive 或真实用户 reload 授权。

## 1. 能力类型和状态

明确分开：`/trellis-init`、`/trellis-task-viewer` 是 slash commands；`trellis_dispatch` 是 model tool；`/skill:trellis-*` 是宿主根据 skill 资源生成的指令，不用 registerCommand 伪造。

| 状态 | 注册 commands | 注册本包 tool | 自动 skills | 新 prompt/UI |
| --- | --- | --- | --- | --- |
| 无 Trellis | init | 无 | 无 | 无 |
| 旧版/损坏/中断/不安全标记 | init | 无 | 无 | 无完整注入/UI；UI有限诊断指向 init --check |
| verifyRuntime 成功，含 clone 缺本地身份 | init、viewer | dispatch | 按有效资源过滤加载 | 现有 context/display；身份不足由现有 init/CLI 提示 |

无身份但有效部署继续激活，保持现有 supported clone 行为；身份状态不等同 runtime 不受支持。无 Agent provider 不影响 viewer/init，只在已激活人类 UI 会话保留现有 warning。

常驻显示以runtime激活为前提，不以当前任务是否存在为前提。无Trellis/旧版/损坏/中断时 `clearDisplay` 清除widget和status两套surface；不能显示零/未知计数或空trellis标签。有效项目无当前session任务仍保留现有未完成计数。对 widget/status/off 模式分别验证，并覆盖之前有显示→runtime失效/reload→清除的转换；错误诊断是有限notice，不替换为常驻task_error标签。

## 2. 根目录统一

新增小型 `lib/project-state.ts`（或同等单一 owner）负责 discovery/activation，不搬迁 task/dispatch/runtime algorithms。

从 resolve(ctx.cwd) 逐级查找：先查看本级 `.trellis`（lstat 识别非目录/悬空标记也不能跳过继承祖先），再查看 `.git` 文件/目录；最近 Git 边界停止。无 Git 则到 filesystem root。标记异常/读取失败保守诊断，不能视为不存在后跨边界激活其他项目。完整 runtime 合法性沿用 verifyRuntime，不能用 init inspect：inspect 含 Python/Git probe，不适合普通项目自动探测。

初始化目标：发现 Trellis root 用该 root；没有 Trellis但发现 Git 边界用边界 root；两者都无用 ctx.cwd。命令仍在确认摘要显示绝对目标；HOME/managed target/symlink 等写入限制由 engine 保留。命令 completion 可沿 process.cwd 解析目标（接口没有 ctx），handler 必须用 ctx.cwd，不能把 completion 当执行事实。Apply template/resourceStatus/adopt/plan 等都用同一个确定的 root，不改变 engine 的明确 root API。

## 3. 注册生命周期

factory 只无条件注册 init 和必要生命周期观察 handlers；不在 factory 运行子进程、建文件、启动 watcher 或 RPC订阅。

session_start 使用 ctx.cwd 获取激活快照；有效时本 runner 一次性调用 registerTaskBrowserCommand 与 registerDispatchTool，避免恢复会话重复订阅。无效时不调用二者。普通项目可注册空行为 event handlers，但没有 command/tool 占位，不能先注册 dispatch 再 inactive/hidden 冒充不注册。

初始化/接管/资源恢复成功通过 ctx.reload 重建资源和 registry，然后新 session_start 注册完整能力。已有 init reload 分支复用；身份设置/模板更改只刷新既有上下文，不强制无关 reload。

执行阶段仍重新核对 cwd/root/runtime：注册不是运行时授权。runtime 被删除/修改后拒绝相关操作，清 UI，不新增其他 root 上下文；指令/tool 从 registry 完全撤回以 `/reload`/新宿主重建为界（公开 API 无通用 command 注销）。当前 Pi SDK cwd 固定于 AgentSession 创建，不承诺热切换到任意 cwd 后即时注销。若某 host 注入不同 ctx.cwd，原 runner 不为另一 root 注册新完整能力，提示重新加载；不得使用 process.chdir 改父进程。

不清空历史消息、用户 AGENTS 或旧会话记录；只保证当前新注入正确，不声称删除历史。

## 4. 条件 skills 和过滤

package.json 显式 `pi.skills: []`，防止缺省静态资源加载；源码 skills 目录及36文件 provenance 不搬迁、不复制到项目。

resources_discover 仅有效项目返回候选 SKILL.md，普通项目返回空。读取实际用户/受信任项目配置，使用 `SettingsManager.fromStorage` 构造只读虚拟视图，仅对当前本包缺省 skills entry 补候选 glob；显式 skills arrays 与 autoload:false delta 原样保留。通过公开 DefaultPackageManager.resolve(onMissing=>skip) 计算有效 paths，然后只挑本包 canonical 路径返回。用宿主 source 身份/installed path 匹配本包，不自造 npm/git解析器，不访问 private API，不落盘配置，不安装 missing source。

可以扩展 `lib/adapter-resources.ts` 复用 resolver 建立，保留 adapterConfigured 的真实永久配置校验。没有永久包配置、只有 -e 时按显式加载的包缺省提供有效项目 skills，不能把这个 fallback 当永久配置满足 managed dispatch。信任由 ctx.isProjectTrusted 传给 SettingsManager，不用 true 绕过项目 trust。

宿主 noSkills、显式 resources/CLI路径和 package filtering 要有真实 SDK测试：自动发现不可撤回用户主动选取的静态 skill 或其他来源同名资源，文档明确自动启用保证，不接管其他包。动态资源 config provenance 与宿主原生 package skills 不同，不能声称 Pi config 仍逐项同样呈现；已有 package skill filters 用只读 resolver 兼容。

## 5. 文件变更边界

- extensions/trellis.ts：接入统一 discovery，session_start 条件 command/tool 注册，条件 skills hook、缓存/诊断。
- lib/project-state.ts：仅共享 root/state/初始化目标，不新建复杂状态机。
- lib/initialization/command.ts：统一命令目标root。
- lib/adapter-resources.ts：只读资源解析复用，不能放宽子代理永久配置 gate。
- package.json：skills空数组、描述/最低版本说明按实际验证。
- scripts/install.sh：默认用户级安装，新增明确 --local 保留项目安装；check/dry-run仍无副作用。
- tests：对应现有模块及新的 project-activation/host验收文件，调整旧静态skills假设；不改 dispatch schema/action/lease协议。
- README、docs/initialization.md、docs/task-display.md、docs/task-viewer.md、docs/dispatch.md、docs/index.md：集中使用者说明；task-display必须同步未初始化完全不显示/有效项目无任务仍显示和清理边界；必要现有spec段落更新，不新增功能专用spec。

文档职责按用户最新边界及刚完成的并行提交 bc7980d：docs 面向使用者功能/命令/配置；开发/测试规范在 .trellis/spec/development/index.md 与 testing/index.md。规划阅读期间旧 extension/scripts 分层被并行删除，check.jsonl 已改为当前5项真实引用并补读新spec；本任务不迁移文档目录。

## 6. 验证、兼容与失败

已检查 Pi 1.2.0 public API；不能沿 README 的 ≥1.1.0 无证据宣称兼容。实施验收范围为1.2.0，更新最低要求为1.2.0；不安装旧宿主测矩阵。无必要新增dependency。

真实 SDK临时 HOME/agentDir、local package配置、无网络model runtime或faux provider，验证 commands registry、tools registry、skills/system prompt 和 reload；不装/修改个人环境。自动无项目探测不调用 Python，即使 Python 不在PATH也应保留init。init真正运行仍需原有Python要求。

rollback 用用户级remove/revert明确提交，不删项目数据、不改历史。资源发现异常有限诊断并不加载skill；运行时异常阻执行，不自动修复。runtime/template/role/skill文件内容不变，无理由重写provenance hashes；如实施确需改变，先核实际耦合范围并评估授权。
