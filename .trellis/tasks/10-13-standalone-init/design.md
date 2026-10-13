# 初始化向导与资源部署：技术设计

## 授权与依赖

父任务统一自主执行授权见 `../10-13-pi-trellis-standalone/research/execution-authorization.md`。不再逐项索要批准，仍执行规划/规格/验证门禁。产品实施须等待 standalone-runtime 的真实脚本检查通过；本设计可先准备。最终 runtime 文件和 manifest schema 以交付结果核验，不能猜测当前实现。

## 模块与公开入口

- `extensions/trellis.ts` 无条件 registerCommand('trellis-init')，不要求已有 .trellis。
- `lib/initialization/` 分离 inspection、plan、apply 和 dialog orchestration；UI 不拼接 shell 命令。
- `resources/templates/` 保存 Pi 原生 workflow/config/ignore、根指令块、通用 guides 和 bootstrap/onboarding 文案。不包含 frontend/backend spec，不检测项目类型、不写 packages/default_package。
- `skills/` 纳入所需 Trellis 工作流及其完整 references；package.json pi.skills 加载，不复制 .pi/skills。
- `runtime/` 使用第一子任务已验证的固定源码；初始化从包位置读取，部署到项目 .trellis/scripts。worktree query/deployer使用同源实现，初始化不复制另一份算法。

命令：`/trellis-init`、`--user <name>`、`--help`、`--check`。未知/重复/缺值参数拒绝。无UI模式只提供状态/明确操作说明，不推断确认。无force/full-reinit/旧项目upgrade功能。

## 初始化状态

1. 新项目：检查 root/interpreter/冲突，英文 menu Initialize project/Cancel，选择用户名，再展示逐项文件及任务创建摘要并确认。
2. 已初始化支持项目且无 .developer：Set up developer identity/View project status/Cancel；仅身份、缺失 workspace 文件与 00-join-<slug>，不重写 runtime/config/spec/workflow。
3. 本机已有相同身份：显示实际 Developer/Workspace，就绪无写入。
4. 不同身份：冲突，不切换、不宣称requested身份已成功。
5. 未知上游/不兼容资源：只读诊断，拒绝一般迁移。
6. 中断的本操作：只对同一操作记录授权且原样内容继续，不能对用户新增/修改文件覆盖。

用户名候选历史有效 workspace、独立 Git建议、Enter a different username/Cancel；input明确验证安全单路径片段、允许合理Unicode/空格。历史workspace保持字节不变。onboarding仍按原先是否有 .developer判断；不因历史用户名省略。不选择active task，不触发 create/start hooks或模型回合。

## 文件所有权和部署

Manifest记录schema、固定发行标识、安装路径/full hashes/modes、模板初始指纹。runtime/agents受管，task/spec/workspace用户所有，config/workflow与根文件保留定制。只在确认后修改，所有冲突先扫描，发布前后再次验证实际身份/必要文件。

固定 `.trellis/.pi-trellis.json` 作为初始化完成/资源清单；专用操作记录用于部分发布恢复（字段/路径实现时与runtime基线核验）。只读 inspect/check 不写locks/caches/bytecode。apply锁+同目录原子单文件写，非全文件事务；确认后失败披露完成项、保留状态、安全重试，不自动删除task/history。受管目标与祖先symlink/dangling link拒绝，根 canonicalize后使用；HOME/managed target init拒绝。Git环境不继承重定向，用户名字走argv。

新项目 `.trellis/spec` 只建立供以后按需使用的入口和可保留的通用guides；bootstrap PRD不引用不存在前后端模板，不自动扫描填规范。只有本仓库迁移子任务才允许接管已核验legacy脚手架；公开init不会套用该例外。

## 宿主与派发边界

- 固定运行时未就绪时禁止危险支持命令/派发，不静默安装修复；普通非Trellis探查不拦截。
- 区分无绑定与task_error，corrupt不能注入no_task批准暗示。
- command-carrying bash/bash_bg/monitor按实际可用tool schema注入context，不全局改process.env；结果按相关task/context命令刷新，不碰ws monitor。
- 从包加载skills，移除旧bridge；版本已受管后agents仅init发布，session_start不自动覆盖升级。
- effective adapter配置以Pi实际优先级/资源过滤验证，不能接受已禁用插件的派发。
- 初始化成功使context/task/section cache失效；若需要reload，只用命令上下文且reload后不继续使用旧runtime。

## 不在本任务内

不删除本仓库.agents，不部署本仓库旧脚手架，不执行安装/提交。runtime深层修复由首子任务交付，不新增完整upstream异常整改、多package/远程模板、channel/mem或旧worktree兼容。

## 验证

临时项目真runtime+英文fake dialogs覆盖所有菜单/用户名/参数、取消点/无UI、已有identity/history/onboarding、冲突/部分失败/重试、manifest/路径/无trellis环境。真实host资源发现验证package skills、命令在无scripts时可用；保持现有display、materials、worktree、dispatch回归。未做真实交互终端时明确说明，不将fake UI称视觉验收。
