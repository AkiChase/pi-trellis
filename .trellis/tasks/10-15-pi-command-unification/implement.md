# 指令统一实施计划

## 状态与执行

`in_progress`，用户已选纯菜单并批准实施。主会话负责协调、文档/导航与局部提交；实现委派仅修改 command/adoption/tests，独立审查 command/初始化确认/公开兼容边界。无安装、部署、reload、push、归档。精确保留并行任务修改。

## 单阶段：菜单入口与全局指引统一

- [x] 阅读 development/testing/shared guides、完整 command/engine/adoption/viewer callers/tests。
- [ ] 移除 init flag parser 与参数补全，非空参数静态迁移提示；Help/Cancel/headless 不运行 Python。
- [ ] 纯静态基础菜单始终含 Check/Help/Cancel，按安全状态提供原操作；选择操作后复用原 inspect/plan/确认链。
- [ ] View project status → Check，现阶段只读资源事实不伪装完整健康通过；预留后续 collector 的单一接缝。
- [ ] 固定确认核心警告与计数，删除 command/adoption 的“check 查看完整写清单”承诺。
- [ ] 统一 extensions/viewer/error/help/docs/README/trellis-meta/AGENTS template 指引；AGENTS template 对应 template-baseline hash 同stage更新，不部署；不改 Python CLI flags。
- [ ] 改 tests 验证菜单/noargs/非法旧参数迁移/Unicode用户名/native RPC/headless/所有状态可访问，原确认与无写负例保留。
- [ ] 主自检、独立公开兼容/安全审阅，主核实际改动后局部提交一个 stage（仅在实施获批后）。

## 实现候选与复核

实现 Agent `d359d28b-92df-49f` 已返回 command/adoption/tests 候选，主会话已完整阅读五份实际产物。移除 parser/completions、静态基础菜单、资源-only Check、原生用户名和 Cancel-first 最终选择；模板、更新、初始化与接管摘要固定核心事实先于路径样例。

主会话已更新用户文档/README、viewer 与 extension 的 Check 指引、新项目 AGENTS template/对应 hash、trellis-meta 引用/对应 hash，以及真实 SDK 用户输入流程。实际 SDK 与资源测试早期版本 20/20；最终实现把 confirm 改成 select，早期结果不能替代最终复测。

独立审查 `5862a5da-f8ae-412` 已启动，可作范围内修复；主 focused `btebzrbna` 实际失败：初始化既有断言资源数 35 vs 并行 runtime 36、真实 SDK 尚未回答新 Cancel-first 最终选择。SDK 修复已交独立审查者负责，主会话不并发改该文件；资源数量归并行任务，不弱化/修改其断言。未验收/未提交；无部署/安装/真实终端/reload/push/archive。

实现者自检 100/100 focused；共享 full 453/455（上述两个失败），均不是独立验收。[实现自检](evidence/implement-self-check.md) 保留完整命令/中间失败/限制。

## 独立审查完成

[独立审查报告](evidence/review.md)：本任务范围无剩余产品缺陷，审查后只改实际 SDK 最终选择/Cancel 验证及包 hash 漂移安全菜单负例。主会话核对最终直接源码/test 字节与审查报告指纹一致。独立 focused 76/76、较广回归 184/184 自然 exit 0；这些不代替主最终全量。

主最终全量 `brz35sj9b` 使用现有 Pi 1.2 peer：**467/468，自然 exit 1**，唯一失败为既有初始化固定数量 35 与并行 runtime inventory 36 不符；SDK最终选择和本任务全部测试通过。保留 full FAIL，不修改其他任务资源/断言，也不声称全量门禁通过。独立 focused 76/76、较广回归184/184及审查字节一致性支持本 stage 范围验证，整体回归仍有上述并行限制。

未运行 lint/typecheck（无 scripts）、真实终端/在线模型。模板/hash/nav/doc 与 check/implement manifest 静态校验通过。局部 stage 提交排除所有并行 worktree/context/runtime 变更，extension 仅包含 runtimeDiagnostic 一行导航。

## 待运行验证

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test \
  tests/init-command.test.mjs tests/adopt-project.test.mjs \
  tests/initialization.test.mjs tests/unsupported-runtime.test.mjs \
  tests/project-activation.test.mjs tests/project-activation-host.test.mjs tests/task-browser-ui.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

命令名/文件存在性在实施时再核对，缺 peer 仅用已有 PI_TRELLIS_TEST_HOST，不安装。产品测试当前 NOT_RUN；无 lint/typecheck script 不报 PASS。真实终端需要另授权，不拿模拟原生选择证明实机画面。

## 顺序与门禁

1. 用户审阅并批准本任务实施后才 start；需要独立检查时准备 check.jsonl 的真实 references，不把空 manifest 报完整 validation PASS。
2. 完成本任务，原 init-check-diagnostics 的入口已改为菜单 Check，但安全/完整本地链路范围保持，单独执行其三阶段与验收。
3. 不因指令统一任务已完成就标原诊断任务完成；实际初始化/资源更改仍只有最终原生确认才写入。
