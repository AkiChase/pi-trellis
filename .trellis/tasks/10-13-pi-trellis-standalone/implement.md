# 实施计划 — Pi 专用独立 Trellis

状态：planning；在用户审阅设计范围并明确批准实施前，不得运行 task.py start。每一步均可独立测试；不得仅为准备本计划而暂存/提交/安装/删除项目文件。

## 0. 规划/审阅门禁

- [ ] 阅读获准 PRD、设计、上游 init 审计和 UX 提案。
- [ ] 落实已确认范围：skills 随包加载、不生成前后端 spec/多 package 配置、拆分子任务；runtime/ 命名为目录建议，实施前审阅子任务计划。
- [ ] 核实准确来源，不假设 CLI/scripts/roles 均来自同一上游版本；将清单持久化到 research/。
- [ ] 确保 manifests 引用将保留的 specs/research，而非计划删除的 skills。
- [ ] 检查当前 HEAD/status 及全部并行任务。规划快照 9af75d2 是证据锚点，不是回退指令。
- [ ] 仅在重新获得明确批准后：校验任务上下文，使用当前会话身份运行 task.py start，并遵循 before-dev/spec 指引。

## 1. 资源盘点与固定运行时打包

- [ ] 枚举支持的命令（task/context/journal/developer/worktree）及全部 Python 导入/默认文件；保留必需 hooks/config 辅助模块，不纳入其他平台 CLI/channel/mem 实现。
- [ ] 建立 runtime、resources/templates 和含来源修订/摘要/声明的基线元数据；当前已提交的原生 python/ worktree 源码单独归为一类来源。
- [ ] 保留来源署名后移植为本发行版维护的运行时，不使用安装时查找/替换补丁。依据完整导入集合检查 Python 最低版本。
- [ ] 将 workflow、bootstrap/onboarding/root/config/ignore/空 spec 入口与按需建设引导引用适配到 Pi 和实际支持的命令。不得复制本仓库业务/项目 specs。
- [ ] 无网络/安装条件下检查打包资源包含情况和完整导入依赖闭包；不得存在未解析的全局 node_modules 或绝对来源路径。

验证：在内存中编译所有内置 Python（不生成 pycache）；在临时解包的包/项目中导入并运行 help，且 trellis 不可用；执行资源 hash/来源/声明测试。门禁：初始化器依赖打包资源前，打包须完整。

## 2. 运行时边界正确性

- [ ] 在内置源码中实现严格显式会话解析和仅清除自身 key；移除受支持调用方的回退机制。
- [ ] 为 wrappers/CLI/context/package/journal 添加共享的任务/路径/记录有效性结果。诊断无效引用，不直接读取未经验证的外部路径。
- [ ] 修正 current/finish/start 有效性及 JSON/错误条件；finish 清理无效指针不能授权 hooks。
- [ ] 将 journal 自动暂存限定到准确的已验证任务；将 archive 自动暂存/提交限定到准确的移动目标/删除项/修改的 child。保留任意此前已暂存工作。
- [ ] 添加上下文枚举所需、容错且有边界的畸形字段投影，不扩展为完整层级重设计。
- [ ] 保持来源外部任务存储支持与目标本地限制一致。

验证：在临时 Git 项目中使用完整内置运行时，测试已识别的缺失/空/其他会话/损坏/失效指针；禁止外部记录读取/hooks；basename 冲突不能暂存本地受害文件；验证准确 archive 范围；其他会话指针/index/history 不变。仅在 fixture 中进行有意安排的提交。展示移除防护后负向回归会失败。

## 3. 独立于 UI 的初始化引擎

- [ ] 添加 inspect/plan/apply 责任模块、基于 import.meta.url 的包资源定位器、规范化目标检查及解释器 argv 探测。
- [ ] 建模 fresh/supported/no-identity/ready/conflict/incomplete/unsupported 状态和所有权分类。
- [ ] 纯预览枚举准确资源动作、任务影响、预期 hash 和模式；不产生锁/缓存/字节码写入。
- [ ] 使用专用 apply 锁，并复查路径/原始内容；使用有大小边界、带版本的操作记录处理中断和最终 manifest。
- [ ] 逐文件原子发布，不宣称整目录事务；仅内容一致且归本操作所有的写入可恢复。
- [ ] 保护未知/定制根 AGENTS/config/workflow/history 及受管软链接目标。明确审阅根受管块/属性的增量修改。
- [ ] 实现已验证的 developer/workspace/bootstrap/onboarding 分支，不隐式绑定会话任务或执行 hook。

验证：纯预览字节快照；取消无写入；发布前错误；强制发布中途失败及安全重试；拒绝并发改动；覆盖全部身份分支，包括历史 workspace、相同/不同本机名字及脚本缺失；保留人工编写的根文件内容。

## 4. 英文 Pi 初始化向导

- [ ] 注册 trellis-init，不依赖 .trellis/session 就绪；描述/help/参数/补全均使用英文。
- [ ] 使用原生 select/input/confirm 流程、按状态区分的菜单、历史用户名候选、安全且不重复的 Git 建议、自定义输入重试和取消。
- [ ] 严格解析 --user/--help/--check；缺少 UI 时不自动写入，不提供 --force/完整 reinit。
- [ ] 发布前审阅操作；包含实际 root/name/workspace、资源冲突、bootstrap/join 任务及不自动选择活动任务的说明。
- [ ] 通知前验证持久化结果；失败时保留/报告部分状态。
- [ ] 刷新会话 context/task/overview 缓存和显示；仅必要时按文档 reload，reload 后绝不复用旧运行时。

验证：使用模拟 extension 命令上下文测试菜单选择、输入校验、全部取消位置、长/Unicode 名字、无 UI/RPC 支持的对话框及参数快捷路径。核对屏幕文案和英文字符串。除非经批准手动测试，否则不得声称完成真实终端视觉验证。

## 5. 包内 skills/agents 及宿主/worktree 集成

- [ ] 筛选包内 skills 并补全全部引用；排除 channel/session-insight，移除保留文档中的 CLI/mem/channel 能力声明。
- [ ] 添加 pi.skills manifest；移除动态 Trellis skill bridge，除非设计变更，否则不保留第二份物理副本。
- [ ] 将角色部署纳入获准初始化，并校验 hash；session_start 不隐式重写版本。
- [ ] 区分 task_error/损坏与 no_task；保留常驻任务计数/主题显示。
- [ ] 按当前 key 为支持的、携带命令的 bash/bash_bg/monitor 工具设定作用域；在适用结果后使状态失效，不转换非命令工具。
- [ ] 危险生命周期/派发操作要求受支持的已部署运行时；保留已提交的准备后目标基线/材料同步。
- [ ] 按真实宿主语义验证实际生效的 Pi package/adapter 配置；被禁用资源不能错误通过 child 就绪检查。

验证：在临时资源加载器中检查包技能发现/重复行为；新项目在脚本存在前即可加载命令；child 绑定/finish/不恢复已清指针；启用/禁用 adapter 设置；已知当前 worktree 就绪/RPC 占用/材料修订测试套件继续通过。

## 6. 安装文档与本仓库定向迁移

- [ ] 将 install.sh 简化为插件安装/预检/help，不要求全局 trellis/init/patch，不自动写入项目。不支持的旧选项须明确报告，不静默重新解释。
- [ ] 将 README/TESTING 及来源/部署/运行时 specs 更新为已实现契约；移除虚构或已排除的命令引用。
- [ ] 在本仓库准备并审阅限定范围的迁移 diff，保留活动/归档任务、spec、developer、workspace/runtime 和并行工作。
- [ ] 确保保留的 skills/引用/config 和任务 manifests 不再依赖项目 .agents。
- [ ] 资源及引用验证后，仅删除本仓库 .agents；保留全局/其他项目文件。
- [ ] 在实施批准范围内取得明确迁移同意后，发布已验证脚手架/manifest。既有开发者不执行新 bootstrap/onboarding；不隐式安装/reload/commit。

回滚门禁：快照记录既有受管字节，验证反向补丁可在不 reset/clean、不删除用户状态的情况下恢复。若其他任务涉及同一脚手架，发布前停止并协调。

## 7. 最终验证与审阅

拟议测试文件（名称可按责任归属调整）：

- tests/initialization.test.mjs — inspect/plan/apply/保护/恢复及完整运行时。
- tests/init-command.test.mjs — 英文对话框和状态转换。
- tests/runtime-contracts.test.mjs — 真实 Python task/context/journal/finish/archive 的路径隔离与范围。
- tests/skill-resources.test.mjs — manifest 资源及引用闭包。
- 既有 task-context、agent integration、task-display、worktree/CLI/preparation/dispatch/material-sync 测试套件。

实施后的命令（使用实际环境，不编造通过结果）：

```bash
# Set PI_TRELLIS_TEST_HOST to an actual installed Pi node_modules if local peers absent.
env -u TRELLIS_CONTEXT_ID npm test
bash -n scripts/install.sh
python3 .trellis/scripts/task.py validate .trellis/tasks/10-13-pi-trellis-standalone
git diff --check
```

Python 语法/导入测试禁用字节码，仅执行内置/临时项目副本；不得为勾选测试清单而在真实项目运行 task.py finish/archive 或安装器。Node 直接运行 TS 测试不等于静态类型检查；本仓库没有 lint/typecheck 脚本。可选真实宿主/provider 测试需要明确路径和单独批准。

- [ ] 在 PATH 中移除 trellis 的全新临时项目可初始化并运行完整受支持生命周期。
- [ ] 测试准确的真实运行时部署快照，断言取消/错误副作用，并验证全部受管资源 hash/声明/链接。
- [ ] 如实报告暂缓的审计异常及平台/视觉/provider 验证局限。
- [ ] 对最终实际 diff 和 specs 进行独立质量审阅；仅在获准范围内修复审阅问题。
- [ ] 从头到尾阅读 PRD，以证据逐项核对 AC1–AC7；不得将实施完成等同于验收通过。
- [ ] 展示结果，并按需分别请求 commit/install/reload/迁移集成/finish 授权。仅规划批准绝不授权这些操作。

## 父子执行顺序

本计划为父任务总体路线，不直接启动全部产品实施。子任务顺序为 standalone-runtime → standalone-init → standalone-migration；初始化不得新增项目类型/前后端 spec/多 package 检测。各子任务完成自己的规划批准后才执行，父任务负责最终 AC1–AC7 集成验收。
