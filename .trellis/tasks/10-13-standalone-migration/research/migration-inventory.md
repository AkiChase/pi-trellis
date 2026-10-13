# 本仓库迁移盘点（只读，2026-10-13）

## 结论与门禁

已读 migration PRD/design/implement、父授权、实际资源/源技能闭包、配置/文档/上下文及部署测试。只写本文件；未运行 lifecycle/init/install、修改产品、删除目录或改变状态。父授权允许顺序实施，但 **init checker 5463 未取得最终结果**；本报告不重复其引擎/安全审查，不能据此开始迁移。

快照 HEAD：`9af75d2f52f78ee932bb31563cc29fe7ce5a9b73`。旧 `.agents`、28个生成脚本、AGENTS/config/workflow 均无Git改动且匹配模板hash；不存在要覆盖的旧源码定制。已有dirty成果包括 `extensions/trellis.ts`、`lib/{subagent-rpc,worktree-query}.ts`、package/README/deployer、相关tests、7个旧python文件删除，以及新增runtime/resources/skills/init模块；下述8份spec中除scripts/index外7份已dirty，不能覆盖。当前 runtime32/skills36 的输出 hashes 全匹配；runtime release 为 `pi-trellis-runtime-v1-56affc3695c933701b71c8f4ccfc0afa80ee526927759088c173c5c3ac7e608b`，已经不同于 runtime checker 报告旧 ID；实施须重新核验最终清单，不能冻结此值。

## 1. 精确 `.agents` 库存

共 **46 个 tracked 文件**，无未追踪/ignored 文件；全部匹配旧 `.template-hashes.json`，没有来源定制。下列路径均相对 `.agents/skills/`；集合展开即完整库存：

- `trellis-{before-dev,brainstorm,break-loop,channel,check,continue,finish-work,meta,session-insight,spec-bootstrap,start,update-spec}/SKILL.md`（12）。
- `trellis-channel/references/{command-reference,forum,progress-debugging,workers,workflows}.md`（5）。
- `trellis-session-insight/references/{cli-quick-reference,triggering-patterns}.md`（2）。
- `trellis-spec-bootstrap/references/{mcp-setup,repository-analysis,spec-task-planning,spec-writing}.md`（4）。
- `trellis-meta/references/customize-local/{add-project-local-conventions,change-agents,change-context-loading,change-hooks,change-skills-or-commands,change-spec-structure,change-task-lifecycle,change-workflow,overview}.md`（9）。
- `trellis-meta/references/local-architecture/{bundled-skills,context-injection,generated-files,multi-agent-channel,overview,spec-system,task-system,workflow,workspace-memory}.md`（9）。
- `trellis-meta/references/platform-files/{agents,hooks-and-settings,overview,platform-map,skills-and-commands}.md`（5）。

完整 path→SHA256 排序紧凑 JSON 的摘要：`e8c31dccb4be83cdd752af2fdc3212926843b75f7194911d44766370ca8dcfd2`。

## 2. 新技能与入向引用

`skills/` 已有 **10 技能、36 文件**：保留上述8个日常入口、meta22refs、bootstrap4refs；36文件全部经过适配，无原样副本。准确排除10文件：channel6、session-insight3、meta的 `multi-agent-channel.md`。不补替代技能；保留排除清单/旧hash证据，不把旧能力重新暴露给 Pi。AGPL/source/output 记录保留。

需处理的**活动指引**：

- `AGENTS.md:16` 改为包技能与 `.pi/agents`；只改 TRELLIS 块，保留块外字节（目前仅换行）。
- `README.md` legacy installer/requirements/uninstall/design notes 与 `scripts/install.sh` 的全局 trellis、neutral-skills、patch/deploy/bridge 指引移除。
- `.trellis/workflow.md` 保留原内容/步骤，定点替换虚构 `/trellis:*`、外部 update/不存在 spec/hooks 引用及过期 no_task 分流，不整体套新模板；config 不复制默认模板，现有 channel 值/注释保留为用户配置。
- owning specs：`scripts/{index,installation-and-patching,agent-sync-and-provenance}.md`、`extension/{architecture,quality-guidelines,worktree-lifecycle}.md`、`guides/{code-reuse-thinking-guide,cross-layer-thinking-guide}.md` 更新当前安装/部署/role ownership；这些多数已 dirty，必须逐 hunk 合并。
- 父/runtime/init/migration 的8份活动 JSONL 都已全文读取：**没有 `.agents` 引用、缺失目标**。migration context 应追加本盘点及最终交付证据，不重写其他子任务。

`resources/skill-baseline.json.sourcePath` 是历史来源，不是运行时读取依赖；`tests/skill-resources.test.mjs` 当前不读取已删源，保留来源字段并持续测36输出/闭包。父子规划/实施报告中的 `.agents` 是迁移对象描述；archive 下 bootstrap 的 `outside-scope-baseline.json`、`source-review-findings.md`、persistent-display `check-results.md` 均保留，不全局替换历史。

`.pi/settings.json` 仅已安装 git source，没有旧技能路径；三份 `.pi/agents` 当前与包字节完全相同。不修改实际安装声明；旧12位 `.pi/.pi-trellis-hashes.json` 不充当新清单。

## 3. 脚本接管与清单

真实 `.trellis/scripts` 仍 **28/28 原始0.6.16**，未部署native，两个安装清单均不存在。固定runtime32 = 原闭包24 + native7（含private query）+ task_records1；旧 deployer只发布native6，不发布common/query，也不写新 `.trellis/.pi-trellis.json`，不能作为整包迁移器。

建议主会话一次性、显式列文件复制：先保存原hash/mode和备份，核验24既有文件仍等于 `upstream.sourceHashes`、8新增无碰撞；逐文件复查后原子替换，既有0755保留，新文件采用源码模式。最后发布schema1清单：32个runtime的实际SHA256/mode/kind/source、3个已核验roles；保留的config/workflow/spec/workspace不登记为新模板输出，不伪造init-operation/bootstrap/join。

退休候选仅 root `__init__.py`、`common/{cli_adapter,task_queue}.py`；读取确认无当前外部消费者，保存证据后可精确移除。`hooks/linear_sync.py` 虽不在发行闭包，仍是独立hook：当前无注册/本地配置，先保留、清单外管理；任何定制hooks禁止随目录清理。

## 4. 元数据与安装策略

旧 `.version=0.6.16`、`.template-hashes.json` schema2/87项，当前均未改。建议作为**停用的上游来源证据原样保留**并说明不再被支持更新器消费；不改成包版本、不刷新成虚假模板来源。若后续精简，先完整移至migration evidence，再精确退役两文件，不能删除其他 `.trellis` 状态。

推荐 `install.sh` 薄包装：保留 source/check/dry-run/help，正常仅 `pi install -l --approve <source>`，英文提示随后显式 `/trellis-init`；旧 neutral-skills/no-patch 明确拒绝，不隐式换义。patch/deployer可暂留为非支持开发证据但绝不被installer调用；若删，先适配 `trellis-patches.test.mjs` 安装模式断言、`worktree-cli.test.mjs` 部署/fixture、`preparation.test.mjs:33`，将保留性/无自动修复断言迁到受控fixture部署测试，不简单丢覆盖。

## 5. 实施阻塞与保留验证

等待checker结束、取得无并发写入窗口；runtime/init的extensions/lib/tests/resources/skills及README/package dirty成果不可用HEAD覆盖。迁移前后比对tasks/archive/spec/workspace/.developer/.runtime、config/workflow与根块外bytes；runtime状态若有合法并发变化应协调而非恢复旧快照。

**公开init会拒绝本legacy项目：不得在真实仓库运行fresh init。** 本次未部署/测试迁移；主会话后续需验证新清单、全量回归、活动JSONL和历史证据分类，确认包技能可发现后才精确删除仅项目 `.agents`，不动全局/其他项目。
