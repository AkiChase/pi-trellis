# 初始化向导与资源部署：实施计划

授权：父任务 execution-authorization.md，已确认范围内自主完成；无需再逐项批准。当前先准备计划，等待runtime验收才开始产品实施。

- [ ] 主会话核对runtime实际交付、manifest/imports/解释器契约；独立check通过后推进本任务状态。
- [ ] 读spec indexes和上下文；确认当前并行改动和runtime归属。
- [ ] 建立Pi专用模板/skills完整引用闭包，排除channel/session-insight及外部trellis指令；无前后端spec、多package检测。
- [ ] 实现inspect/plan/apply，预览无写入，严格原字节/路径/锁/manifest/中断恢复和用户内容保护。
- [ ] 实现英文registerCommand与native dialogs、历史/自定义用户名、已验证的identity/bootstrap/onboarding行为。
- [ ] 公开init拒绝旧运行时迁移，受支持clone身份恢复不重写脚本，真实持久身份验证。
- [ ] 集成package技能和受控agents发布，清cache/reload生命周期；不自动bootstrap/模型执行。
- [ ] 实现task_error状态、command tools context注入及effective adapter检查，保持existing display/worktree协议。
- [ ] 用完整runtime临时项目与fake command context红绿验证；独立check检查实际code/files，修本任务scope问题。
- [ ] 更新说明/记录交付证据给migration；此阶段仍不删.agents或实际安装/提交。

验证命令：env -u TRELLIS_CONTEXT_ID npm test（如需PI_TRELLIS_TEST_HOST指定真实host）；task.py validate本任务；git diff --check。新增initialize/command/skill tests按实际命名执行。所有初始化试验在temporary root中、Python不写bytecode；forced publish失败要验证保留而不是只断言错误。API/loader实际host验证需路径已安装且无网络，未做realTUI/provider明确记录。

阶段完成只标验收证据，不自动commit/archive；按统一授权继续migration前重新检查依赖、资源清单和并行用户内容。
