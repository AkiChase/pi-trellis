# 实施计划

## 状态与授权

用户已批准规划并指示开始实施，任务已 start。此前 planning 边界已满足；批准范围为上述两阶段和 scoped local checkpoints，不 push、安装、个人 sync/reload、真实 worktree create/prepare 或归档。保留并行任务 `10-14-runtime-tool-names` 及后续并行改动。

## 执行与审查选择

- 主 agent 直接实施：上下文已掌握，不为该任务创建 managed worktree。
- 每阶段需要独立审查：改动涉及公共派发工具、持久记录和跨 Python/TS 契约。
- `check.jsonl` 预备真实 spec/research 引用；`implement.jsonl` 有意为空，主 agent 直接读取材料。
- 当前运行中的工具还是旧 managed-only，实施期间不能假设新工具已加载。未绑定本任务可通过普通 `Agent`、`trellis-check` role、`isolation: off` 做独立审查，遵守当前 gate 并注入短共享提醒。若当前可用 provider/角色不满足独立审查，报告 blocker，不悄悄换临时 worktree或称 self-review 为独立审查。
- 审查明确仅看本阶段文件/hunks和 scoped base，不处理其他任务问题。main 核实际 diff、修复和测试后才接受。

## 阶段 1：统一工具与执行生命周期（独立可验收 checkpoint）

### 实施

- [ ] 读 PRD/design、check 所列 spec，记录阶段起始 commit 和原有 dirty scope。
- [ ] 新增严格 source 记录 owner，复用 contained atomic persistence，不改 managed v1 schema。
- [ ] 拆共同入口与 source/managed 路由、锁内重查；source current task in_progress 校验。
- [ ] 实现 source starting/真实 ID/early terminal/unknown/shutdown/跨会话 stop，按 request 防旧事件覆写。
- [x] source 同任务占用，不同任务并发；managed 分支检查同任务 source 残留。
- [ ] Python create/adopt 在 preview 与锁内阻止同任务 source 活跃执行，严格跨语言格式互证。
- [x] source 动态短提醒、结果 mode/cwd，managed 信息保持兼容。
- [x] 工具 description 和源 overview 更新，不能依旧诱导必须建 worktree。
- [x] 同阶段更新受影响原生资源 hashes/content-derived release，不改 deployed 项目 runtime。
- [ ] 增加 source 记录/dispatch/Python 竞态回归，保留原 managed 首测（原先无 binding 拒绝断言改为 source 成功，未 prepare binding 仍拒绝）。

### 验证与审查

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs tests/agent-context-integration.test.mjs tests/task-context.test.mjs tests/worktree.test.mjs tests/worktree-cli.test.mjs tests/preparation.test.mjs tests/material-sync.test.mjs tests/worktree-protocol.test.mjs tests/runtime-contracts.test.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s tests/python
# 记录实际 Node/Python 版本；无 lint/typecheck script，不伪称通过。
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

新测试文件若改名，在证据中同步实际命令。检查 scope 同时读 tracked/untracked；核未发生 start/hooks、父指针变化、source code/index 的无关覆盖。独立 check 后 main 审实际 diff，精确 stage 本阶段代码/测试/资源/task evidence，commit `feat: support shared-source Trellis dispatch`。记录 hash/命令，不等待全部文档阶段才首次提交。

## 阶段 2：用户说明、包级路由与最终集成（第二 checkpoint）

- [x] 新建根目录 `docs/dispatch.md` 并链接 `docs/index.md`。
- [x] README/managed protocol 清楚区分可选目录、source unknown 手动核查限制、不支持 source recover 和无 filesystem isolation。
- [x] 更新包级 skill 说明和 workflow template；不改用户维护的项目 workflow，不新增功能 spec。
- [x] 维护 `resources/template-baseline.json` 和 `resources/skill-baseline.json` 的精确输出 hashes，保留 source 元数据；它们独立于 Python runtime inventory，本阶段不修改 runtime release，不改 bundled role/provenance。
- [ ] 扩展 optional `tests/provider-contracts.mjs` 的统一 source 工具路径，使用临时 Git 项目、真实 loader/provider 和 offline faux；不把原有直接 RPC 检查当成统一 dispatch 集成。
- [ ] 独立 review 说明/工具/schema/manifest 一致性，并核所有新增相对链接。

验证：

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/worktree-protocol.test.mjs tests/agent-documents.test.mjs tests/runtime-contracts.test.mjs tests/dispatch.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
python3 .trellis/scripts/task.py validate .trellis/tasks/10-14-dispatch-shared-source
```

validate 会报告有意为空的 implement manifest，不记录为完全通过。对于可选 provider probe：实施批准不包含新增安装或依赖获取。若已有 provider/host 路径且获得所需 probe 授权，记录解析出的真实路径运行：

```bash
env -u TRELLIS_CONTEXT_ID node tests/provider-contracts.mjs --host <已存在的Pi-node_modules> --provider <已存在的provider-package-root>
```

没运行则标 Not run，并单列真实 provider/在线模型行为未验证。main 核独立审查后 commit `docs: clarify shared-source dispatch workflow`，耦合模板/skill/资源/harness 保同阶段。

## 阶段 checkpoint

阶段 1 已接受并提交 `4cbeadc983950ce686d025ada84d9c895bb237a7`：独立初审 F1–F4 已修复，8ceddce7 独立复核批准；main 完整 407/407 和 Python18/18，source diagnostics4/4。阶段 2 当前实施中。

## 最终验收

- [ ] 对照 PRD AC1–AC8，区分 mock RPC、real SDK offline、真实在线 provider/模型证据。
- [ ] 确认各阶段 checkpoint、final diff、tracked/untracked 与并行 scope，任何最后修复重跑受影响测试并单独 scoped commit。
- [ ] reusable contracts 的 spec 更新仅在确有通用架构变化时评估，不把 `docs/dispatch.md` 搬入 spec。
- [ ] 限制：source unknown 不自动恢复；工具无法覆盖其他普通 Agent/会话/手动进程的活动；共享目录没有文件隔离。
- [ ] 未获得 finish-work 授权前任务留 active，不归档、记录 journal 或 push。

## start 前门禁

PRD/design/implement 与上下文就绪，独立审查路径可用，用户明确批准计划实施后才运行：

```bash
python3 .trellis/scripts/task.py start .trellis/tasks/10-14-dispatch-shared-source --allow-empty-context
```

此 flag 只用于 intentionally empty implement manifest，不绕过 reviewer context 或实施授权。
