# 实施计划（已批准）

## 执行方式

主会话直接实施；每阶段独立 trellis-check 审查宿主公共兼容/跨模块契约，主核实际diff和验证后提交该阶段。用户批准完整方案在当前工作区执行，不创建worktree。主实施JSONL故意空；check.jsonl已整理真实refs。task validate 会对空implement报告error，不称全量通过；使用 start --allow-empty-context。

并行dirty部署runtime/manifest/workflow/spec/历史plans/runtime-tool-names必须排除；相同文件混合时精确hunk提交，安全分离不明则停止报告，不提交混合工作。

## Stage 1：统一发现与严格注册

- [x] 实施 lib/project-state.ts，Trellis优先/Git文件或目录边界/无Git到root/异常标记阻继承。
- [x] init的inspect/adopt/resource/template/plan统一目标；engine现有写入安全不变。
- [x] factory仅init；session_start有效runtime才注册viewer command和dispatch tool，一runner只一次；保留执行时安全gate和shutdown lease契约。
- [x] 新增根发现及状态矩阵回归；更新直接调用factory的fixture，显式触发session_start，不能靠process.cwd冒充ctx.cwd。
- [x] 常驻display回归：fresh/unhealthy/中断在widget/status均无标签/计数/详情；有效无当前任务仍显示计数；有显示后runtime失效/reload清两surface；off不绘制，有限diagnostic不变为常驻task_error。
- [x] focused与独立check后阶段提交，记录hash/命令/限制。

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/project-activation.test.mjs tests/init-command.test.mjs tests/unsupported-runtime.test.mjs tests/agent-context-integration.test.mjs tests/task-display.test.mjs tests/dispatch.test.mjs tests/source-executions.test.mjs tests/task-browser-ui.test.mjs
```

实际影响更广的fake handlers需一起改和测试，不能为绿测试取消原安全断言。Stage1保留静态skills现状，PRD整体未完成，不宣称已经做到普通项目只init。

## Stage 2：条件skills和真实宿主验收

- [x] manifest.skills显式空；新增resources_discover，只在有效项目返回skills。
- [x] 公开resolver+只读虚拟Settings视图处理本包default/explicit/delta/trust，永久adapterConfigured不放宽；无install/global修改。
- [x] SDK集成 fixture：user/local settings、fresh/valid/unhealthy/clone无身份，commands/tool registry 与模型声明分别断言，skills资源和命令提示断言。
- [x] init确认→reload后完整能力，repair→reload，reload移除runtime后只有init，恢复/新会话不重复注册订阅。
- [x] 过滤matrix：normal skills[]、plain白名单、+加法、delta empty/exclusion、用户项目重复声明、untrusted、临时-e、noSkills、显式静态来源限制。
- [x] 验证fresh启动没有Trellis子进程/项目写入，错误cwd不注入；不以mock command列表替代真实SDK。
- [x] focused、full与独立check后阶段提交（代码、manifest、耦合tests一同）。

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/skill-resources.test.mjs tests/project-activation.test.mjs tests/project-activation-host.test.mjs tests/agent-context-integration.test.mjs tests/init-command.test.mjs tests/worktree-protocol.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
```

新文件名按此计划创建；host测试使用现有host preload/公开SDK/隔离tmp，不依赖真实subagent provider或在线模型。确需新的真实tmux/provider运行先另获授权，不安装填表。

## Stage 3：安装入口与用户说明

- [x] installer默认不带-l（用户级）；--local明确项目级，帮助/dry-run/strict argument/cancel/write边界和fake Pi测试同步。
- [x] README保持英文；docs中文，说明commands/tools/skills分类、初始化目标、Git停止、运行时状态、reload边界、用户/项目配置过滤及显式强制资源限制。同步docs/task-display.md与README常驻显示：未初始化无任何trellis显示，有效无任务计数仍在，失效清理；相关docs/initialization.md指向一致激活规则。
- [x] 最低Pi版本1.2.0（本地实际核验版本），不声称1.1已验收；Python只init/有效runtime执行需要。
- [x] 在已有架构/session/installation spec维护通用安全/开发契约；不新增专用feature spec，不迁移并行文档任务。
- [x] 完整diff、focused/full、文档links/whitespace及独立check后阶段提交。

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/trellis-patches.test.mjs tests/skill-resources.test.mjs tests/project-activation-host.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
python3 .trellis/scripts/get_context.py --mode packages
git diff --check
```

Markdown相对links/anchors含untracked文件用本仓现有或临时只读检查器；逐一核本任务JSONL存在，不自动修parallel refs。无lint/typecheck script，记录Unavailable，不虚构Passed。

## 最终整合

- [x] PRD每项映射实际evidence；host注入/registry/reload与mock/真实终端/provider分开记录。
- [x] 检查commit scope、剩余dirty、parallel保留，最后变更后重跑受影响check。
- [x] reusable约束收录现有spec；结束报告，不隐式archive/journal/push/个人install。

每阶段检查员只修本任务问题，不递归dispatch、不commit/install/finish；主会话验证实际修复再提交。若改变命令名/dispatch协议/资源目录/初始化写入契约，属于material scope，重新审批。

## Stage 1 验证与检查点

主最终122/122，补充38/38；独立自修后130/130自然exit0、display mode12/12，主核实际diff及报告接受Stage1。静态skills仍属于后续Stage2。检查点hash提交后记录，不含部署runtime/workflow并行修改。

## Stage 2 验证与检查点

独立最终full442/442自然exit0（bj0baztlt），focused95/95，主核自修scope+async revalidation及实际SDK断言后接受。Stage1hash568634f；Stage2提交后记录hash。未PTY/provider/持久会话switch/resume端到端，保留mock会话生命周期和真实SDKreload证据边界。

## 最终验证

Stage1 568634f、Stage2 740824c。Stage3独立最终无剩余问题、26/26focused；主最终全量443/443自然exit0，log /tmp/pi-bg/bcsj9dn2q.log；shell语法、diffcheck、8Markdown34links/anchors、spec layers/5checkrefs通过。产品之外仅PRD/evidence更新，无需重跑运行时。未lint/typecheck（无script）、真实PTY/provider/旧Pi矩阵/持久resume-switch端到端，保留隔离SDKreload与mock生命周期边界。
