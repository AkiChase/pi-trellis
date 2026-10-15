# 实施与验证记录

## 实际改动

workflow 模板与本项目 workflow 新增材料分类与主会话边界；角色生成器及三个输出加入 research 专属研究结果、其他角色 evidence 报告边界；check skill 增加新增材料检查项。现有 testing spec 与 tmux 指南各一句 research 保存结果/日志/终端证据规则同步纠正，不新增规范文件。

collectible 仅改变 collection 资格：research 只收 Markdown，evidence 保持六种文本格式；通用 references、material graph、refresh、安全与冲突处理未改。

## 角色来源与资源

既有 `/Users/jyxc-dz-0101322/tools/test/.claude/agents` 三个原始角色 SHA-256 与提交基线的 source 字段精确一致。使用这些固定输入运行 `node scripts/sync-agents.mjs <目录>` 与 `--check` 成功，无依赖下载。保留 upstream version/source hashes 与许可；只更新 adapted hashes。

materials 当前 hash/modified 与 runtime releaseId，以及 workflow template hash，按现有 package identity 算法同步。对本项目 `resourcePlan(root, 'update')` 的首次预览无冲突，仅列出 materials 部署与三个角色更新；第二次带变化集断言的命令在 apply 前拒绝：实际 changes 已为空，而断言期望四项。此失败是预览后的资源状态变化，不是成功发布记录；未由该命令执行 applyResourcePlan。

随后实测 package/local materials 与三角色逐字节一致、resourcePlan 无 changes/conflicts、verifyRuntime 成功，但稍后本地四文件与 runtime manifest 又恢复旧版本（HEAD 不变、索引空）。这两次资源状态变化来源未证实，不能将中间观察当作持久发布证明。

主会话对最新预览重新核对：无冲突、只允许本任务 materials 与三个角色四路径，然后实际执行 `applyResourcePlan()`；同一命令 `verifyRuntime()` 成功，输出明确列出四个应用路径。此次主会话受支持发布已得到执行证据。workflow 是显式手动编辑，manifest 按 preserved-project 记录，与实际 hash 一致。未改 provenance 校验或手改部署 runtime 绕过哈希。

## 已完成检查

环境：macOS，Node v24.14.1，Python 3.14.7。需要 Pi peer 的测试子进程指定既有 host：`PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，仅子进程移除 `TRELLIS_CONTEXT_ID`，未安装依赖。

- Python：`python3 -B -m unittest discover -s tests/python -p 'test_*.py'`，20/20，exit 0。
- 聚焦：`env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/material-sync.test.mjs tests/agent-documents.test.mjs tests/trellis-patches.test.mjs tests/manifest-provenance.test.mjs tests/initialization.test.mjs tests/workflow-policy.test.mjs`，job b7f1amniw，126/126，exit 0。
- `git diff --check`、任务材料 whitespace、check.jsonl 解析/引用存在、已归档历史任务指纹保持：PASS。
- 全量首次：job bnkj127nf，445/446，exit 1；唯一失败为 `trellis-check/SKILL.md` 的 skill-baseline 哈希遗漏。已只更新 `resources/skill-baseline.json` 该项 sha256，未弱化校验；最终全量 job bp9b2i947，446/446，exit 0。
- 独立只读审查：agent 39d9ef9e-4170-431 完整 review 发现 P2：现行 tmux 指南还把证据导向 research；已只改该句为当前任务 evidence，独立复核确认此前 P2 解决、无新 blocker。独立 Node 定向7/7、Python3/3、skill hash1/1、生成器check均 PASS；首次遗漏 host preload 的 skill测试失败保留，纠正环境重跑 PASS。

新增测试覆盖 research 五种非 Markdown 文本格式预览排除、显式 preview/confirm 拒绝且文件不动，research Markdown/evidence 六格式成功收集，拒绝期间 snapshot/target pointer 保持，以及历史非 Markdown references/prepare/refresh 正常。Python 同时保留安全文件名与其他格式拒绝矩阵。

## 边界

不修改历史任务。其他会话正更新自己的 planning 文件，因此不能声称全部 active task 指纹不变；本任务不接管或提交这些变化。无 lint/typecheck 脚本；未运行 PTY/在线 provider，不涉及 UI 改动。已安装旧版插件在 tool-call 前检测到新的本项目 releaseId 后拒绝过一次包含 Trellis CLI 的 bash 调用；该调用未执行。后续通过包源码的 verifyRuntime/resourcePlan 核对当前资源健康，不绕过旧版校验，不调用 install/sync/reload。任务材料状态更新用直接文件工具。

未安装、同步已安装包、重载、push、归档或 journal。本任务代码与证据检查已完成，准备 scoped local commit；归档与 journal 尚无授权。
