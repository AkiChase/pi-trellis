# 第二轮实施计划

## 前置
- [x] 核实 index discovery、skill 入口、JSONL loading 与初始化模板边界，更新 PRD/design。
- [x] 用户批准本轮现有方案实施及逐阶段本地提交，限定当前主会话直接实施/自检。
- [x] 刷新 git/status 与并行所有权，读全部 owning specs/相关代码和已批准任务材料。
- [x] 主会话自检；基线仅字面路径变更、字节不变，不改校验契约。未进行独立审查，两 unused manifests 保空，不将 validate 空清单诊断称 PASS。

## 阶段 1：基线数据迁移
- [ ] 以已提交 docs/agent-baseline.json 原字节创建 resources/agent-baseline.json，保用户删除旧路径。
- [ ] 仅更改 initialization/engine、sync-agents、agent-documents test 的读写路径及当前引用；完整搜索验证 no active old references。
- [ ] 独立核 reader/generator/test 同一路径及原 hash/字节，按风险采用独立检查。
- [ ] 验证：`env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs tests/initialization.test.mjs tests/manifest-provenance.test.mjs`（缺宿主 peer 时只在 subprocess 指向已安装 PI_TRELLIS_TEST_HOST，不安装）。对比原 JSON 字节/hash、`git diff --check`。
- [ ] 验证并核范围后追加阶段 commit，不 amend/history rewrite；记录 hash/结果。

## 阶段 2：规范/功能文档收敛
- [ ] 创建 development/index 与 testing/index/tmux，提炼安全约束映射，不机械拼接。
- [ ] guides 保精简兼容入口，移除 scripts/extension/documentation 专题文件，更新 current refs/活动 JSONL。
- [ ] docs 仅功能/使用/必要 provenance，删 docs/testing，接纳两 plans 删除并清 current refs；README 导航对齐。
- [ ] 规范英文，docs 中文；所有命令/API/hash 不翻译。
- [ ] 本地 Markdown 全 targets/anchors/whitespace 含 untracked，活动 JSONL parse/existence 与 `get_context.py --mode packages`，`git diff --check`。
- [ ] 聚焦 `env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs tests/workflow-policy.test.mjs tests/worktree-protocol.test.mjs`；若因当前协议 hardcoded path 出现 failure，先核是否误删必要入口，不改产品/测试断言扩范围。
- [ ] 核 docs 不再含开发/测试教程、spec 没有重复模块手册、安全约束不丢、历史归档未改；追加阶段 commit。

## 最终集成
- [ ] 相关输入变化后重跑受影响测试；基线读路径影响广泛，评估完整 `env -u TRELLIS_CONTEXT_ID npm test`，记录自然退出和全部 NOT_RUN。
- [ ] 记录每个阶段与 final evidence，不用首轮 16/16 和链接 PASS 代替本轮结果。
- [ ] 用户手动删除、当前 tracked/untracked 与并行改动最终核对，不 stage runtime-tool-names 或其他工作。
- [ ] 任务待用户验收，未授权 finish 不 archive/deactivate/journal/push。

不执行真实 tmux/provider/线上模型、安装/个人 sync/reload，不改包 skills/templates/runtime/workflow 或资源 hash。若必须扩展这些范围才能迁移，报告后停。
