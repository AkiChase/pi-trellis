# 阶段 2 独立只读审查

## 结论

**未发现阻塞项。** 审查基线为 `4cbeadc983950ce686d025ada84d9c895bb237a7`，仅覆盖阶段 2 dirty scope。基线后的 viewer 代码、归档及 journal 提交和未跟踪 runtime-tool-names 任务均排除。未修改产品、提交或执行生命周期。

## 审查范围与结果

- 已读取 PRD/design/implement、check.jsonl 及注入的全部引用；检查 README、docs/{dispatch,index,worktree-execution,runtime-baseline}.md、workflow 包模板、meta agents 引用、两份 extension 通用契约和 provider harness。
- 对照实际 `lib/subagent-rpc.ts`、`lib/source-executions.ts`、Python manager/records：无 binding 才 source；绑定失败不回退；同任务 source starting/running/unknown 阻塞，不同任务不独占目录；create/adopt preview 和确认锁内检查；stop 回复不释放占用；source 无 recover/currentness/自动 PID 解锁。短提醒、当前材料、独立 child pointer、无自动 Review base 与实现一致。
- source terminal/shutdown 条件写共用 reservation 锁、请求重查及延迟重试；文档正确保留退出前 flush 不保证的限制，没有宣称文件系统隔离。managed terminal/stop 的原有 no-lock 边界没有被误扩为 source。
- native provenance 改为“最初 unchanged，后续 explicit modified 输出”，未继续宣称当前 native 全部 byte-identical。只修改包 workflow 模板，没有 deployed `.trellis/workflow.md` diff；功能说明在 docs，spec 保留通用边界。
- 新 harness 通过真实 loader 注册工具 → `trellis_dispatch.execute` → public spawn → result 工具，临时 Git 项目/完整 runtime/兼容角色/持久 adapter settings；在调用期间显式 `process.chdir(root)`，并 finally 恢复。断言 source mode/cwd、真实 ID 对应 result、真实 child 写文件、SOURCE 材料和短提醒、无 TARGET 材料。不是把旧 direct RPC 测试重新称为 unified 集成。
- main 在并发审查期间补齐 template/skill 独立 manifest；最终两份输出 hashes 与实际文件匹配，source 元数据保留，runtime release 不需要变化。

## 实际验证与限制

- `node --check tests/provider-contracts.mjs`：通过（仅语法）。
- `git diff --check`：通过。
- Python 静态检查上述 Markdown 相对文件链接：通过；两份新增耦合 manifest 的 SHA-256 检查：通过。
- 没运行 provider/network/install/full suite，也未重复 main 正在运行的 focused 检查。真实 provider probe **Not run**；syntax/静态数据流审查不构成 real-host/provider 执行证据。最终完整测试结果由 main 的修正后重跑确认。
- 无 lint/typecheck script；未将直接 TS 执行称为静态类型验证。

非阻塞文案建议：design §7 可显式列出 `template-baseline.json` / `skill-baseline.json`，与已修正 implement 的独立 inventory 表述保持一致（当前 design 并未声称可以跳过这两份 manifest）。
