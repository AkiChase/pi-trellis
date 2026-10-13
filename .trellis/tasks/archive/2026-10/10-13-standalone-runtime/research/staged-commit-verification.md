# 运行时分阶段提交验证

用户明确授权先提交可提交内容。已从live树单独组装runtime提交边界：runtime源码/当前纯skeleton helper及hash基线、native路径迁移、必要测试/source ownership specs、父任务规划和runtime任务证据。未暂存init extension/engine/skills/package manifest/未验收门禁修复。

`lib/worktree-query.ts` 仅暂存package Python入口路径迁移，未暂存init verifyRuntime集成。`tests/runtime-contracts.test.mjs` 暂存版本沿用完整runtime fixture，未引用正在修复中的runtime-fixture/初始化引擎。源码中的纯skeleton helpers随runtime交付，已有init独立check未发现其缺陷，不包含UI/部署逻辑。

测试使用git checkout-index导出的精确暂存快照及显式实际Pi host，测试子进程unset TRELLIS_CONTEXT_ID，Python禁止bytecode。首次166/167，唯一失败是导出目录无Git历史导致git show原native来源失败；向快照提供只读Git历史入口后重新完整运行167/167，fail0，自然退出。未修改产品修复此环境问题。

最终测试命令：env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<实际已安装Pi node_modules> PYTHONDONTWRITEBYTECODE=1 npm test。原始日志 `/tmp/pi-bg/bpcoukfdu.log`；提交前cached diff-check通过。没有真实插件安装/本仓库runtime部署/删除.agents/push。初始化和迁移仍未完成，不随commit归档或宣称父任务完成。
