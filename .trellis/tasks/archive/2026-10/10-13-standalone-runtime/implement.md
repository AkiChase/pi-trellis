# 固定运行时与脚本修复：实施计划

状态：planning，待最终批准。仅此子任务先行，init/migration 不实施。

## 有序步骤

- [ ] 实施前读父任务及本任务 PRD/design，刷新 status/HEAD 和 scripts/extension/guides specs；确认无并行代码冲突。
- [ ] 记录 0.6.16 源码 28/28 字节对比证据，列出入口和 AST/运行导入依赖闭包；建立 runtime 与来源/hash/许可清单。
- [ ] 包内集成严格 session、授权任务有效性结果；更新路径/记录包装与 task start/current/finish 契约。
- [ ] 更新 context/packages/journal 下游，不让 stale 引用进入文件读取、元数据或提交；精确 journal/archive 暂存范围。
- [ ] 校验 developer 名字和既有身份结果，抑制 bytecode，删除外部 trellis 探测；不生成前后端 spec 或多 package 功能。
- [ ] 将既有 worktree 源码由 python/ 迁到 runtime/ 并更新 deploy/query/tests 路径，保持当前材料和管理逻辑，不部署到本项目。
- [ ] 增加完整 runtime 临时项目测试：无身份/错误记录/外部路径/hooks/精确提交/用户名/无 trellis PATH/无 pycache。
- [ ] 运行现有 worktree/派发/材料/显示全量回归，独立检查实际 diff 并修正本范围问题。
- [ ] 更新相关 source/runtime 归属与许可文档，整理证据和 runtime 契约作为 init 子任务输入。

## 验证

```bash
# PI_TRELLIS_TEST_HOST 如需则显式指定实际 Pi node_modules，不安装新依赖。
env -u TRELLIS_CONTEXT_ID npm test
python3 .trellis/scripts/task.py validate .trellis/tasks/10-13-standalone-runtime
git diff --check
```

新增 runtime 定向测试需先红后绿；所有变异实验只在临时副本中。包内 Python 编译在内存进行，CLI subprocess 设置 PYTHONDONTWRITEBYTECODE/-B。没有 lint/typecheck 脚本，不声称验证。git提交只允许 disposable fixture；不执行本项目 task.py finish/archive、init 或安装。

## 暂停/回滚边界

来源不匹配、导入闭包缺失、当前 worktree 协议被改动、范围扩大均停下报告。回退仅本子任务源码差异，不能 reset/clean 或覆盖 .trellis 项目数据。无一般升级/迁移流程。

## 执行门禁

本计划展示给用户后，新的明确批准才运行 task.py start。完成后先汇报证据和边界，不自动开展第二子任务、不自动安装、提交或删除 .agents。
