# 第二轮实施计划

## 前置
- [x] 核实 index discovery、skill 入口、JSONL loading 与初始化模板边界，更新 PRD/design。
- [x] 用户批准本轮现有方案实施及逐阶段本地提交，限定当前主会话直接实施/自检。
- [x] 刷新 git/status 与并行所有权，读全部 owning specs/相关代码和已批准任务材料。
- [x] 主会话自检；基线仅字面路径变更、字节不变，不改校验契约。未进行独立审查，两 unused manifests 保空，不将 validate 空清单诊断称 PASS。

## 阶段 1：基线数据迁移（已提交 `0d31790`，82/82）
- [x] 以已提交 docs/agent-baseline.json 原字节创建 resources/agent-baseline.json，保用户删除旧路径。
- [x] 仅更改 initialization/engine、sync-agents、agent-documents test 的读写路径及当前引用；完整搜索验证 no active old references。
- [x] 主核 reader/generator/test 同一路径及原 hash/字节；机械路径迁移主自检，无独立检查。
- [x] 验证：`env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs tests/initialization.test.mjs tests/manifest-provenance.test.mjs`（缺宿主 peer 时只在 subprocess 指向已安装 PI_TRELLIS_TEST_HOST，不安装）。对比原 JSON 字节/hash、`git diff --check`。
- [x] 验证并核范围后追加阶段 commit，不 amend/history rewrite；记录 hash/结果。

## 阶段 2：规范/功能文档收敛（16/16 focused，408/408 full）
- [x] 创建 development/index 与 testing/index/tmux，提炼安全约束映射，不机械拼接。
- [x] guides 保精简兼容入口，移除 scripts/extension/documentation 专题文件，更新 current refs/活动 JSONL。
- [x] docs 仅功能/使用/必要 provenance，删 docs/testing，接纳两 plans 删除并清 current refs；README 导航对齐。
- [x] 规范英文，docs 中文；所有命令/API/hash 不翻译。
- [x] 本地 Markdown 全 targets/anchors/whitespace 含 untracked，活动 JSONL parse/existence 与 `get_context.py --mode packages`，`git diff --check`。
- [x] 聚焦 `env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs tests/workflow-policy.test.mjs tests/worktree-protocol.test.mjs`；若因当前协议 hardcoded path 出现 failure，先核是否误删必要入口，不改产品/测试断言扩范围。
- [x] 核 docs 不再含开发/测试教程、spec 没有重复模块手册、安全约束不丢、历史归档未改；追加阶段 commit。

## 最终集成
- [x] 相关输入变化后重跑受影响测试；基线读路径影响广泛，评估完整 `env -u TRELLIS_CONTEXT_ID npm test`，记录自然退出和全部 NOT_RUN。
- [x] 记录每个阶段与 final evidence，不用首轮 16/16 和链接 PASS 代替本轮结果。
- [x] 用户手动删除、当前 tracked/untracked 与并行改动最终核对，不 stage runtime-tool-names 或其他工作。
- [x] 任务待用户验收，未授权 finish 不 archive/deactivate/journal/push。

不执行真实 tmux/provider/线上模型、安装/个人 sync/reload，不改包 skills/templates/runtime/workflow 或资源 hash。若必须扩展这些范围才能迁移，报告后停。

## 检查记录
阶段一 commit `0d31790`；阶段二 focused 16/16，packages development/testing，16 Markdown/71 本地链接/锚点与 source paths/空白通过。六个活动 JSONL 均空，无待迁移 file rows；validate 两空清单错误保留。完整套件 408/408 自然退出 0；详见 research/round2-verification.md 与 constraint-map.md。

## 第三阶段：来源页删除与角色声明同步
- [x] 用户批准删两来源页并合并职责/定制到 dispatch；进一步批准修改 bundled 角色与 adapted hash。
- [x] README/docs/spec清引用；固定artifact核验方法留testing，来源数据留resources，License保真实文件。
- [x] 三角色与generator仅注释目标变更，原source hash不变，adapted hash一致；来源测试加强真实声明/新引用/旧引用不存在断言。
- [x] 14 Markdown/52 links/anchors/whitespace与角色仅注释差异检查PASS。
## 收尾验收
用户已确认“收尾吧”，接受最终交付并授权归档、清本会话绑定和 journal。第二阶段 commit `bc7980d`，第三阶段 commit `bb6c73b`；最终来源测试 8/8、联合 focused90/90、full408/408 自然退出0。第三阶段的角色注释/adapted hash 变更是后续明确授权，覆盖前述不改资源hash限制，仅限这三角色对应adapted字段。无真实tmux/provider、独立review、安装/个人sync/reload/push；unused manifests 的validate两错误仍如实保留。

任务直接在 main 实施，branch/base_branch 都是 main、从未PR-backed；归档使用 CLI 文档允许的 `--skip-branch-validation`，不冒称PR合入。归档与journal仅提交精确自有任务/工作记录，保并行改动。

