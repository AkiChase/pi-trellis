# 本仓库迁移与独立发行集成：实施计划

按父任务execution-authorization.md自主推进，等待runtime/init独立检查通过后实施。

- [ ] 核对前两个子任务真实交付、final manifests、测试证据，不猜agent摘要。
- [ ] 更新本任务context到已存在的sources/spec/research；检查status/current root和并行内容。
- [ ] 保存本仓库受影响文件before hashes/inventory与.agents完整reference清单；用户state/历史文件不作为overwrite目标。
- [ ] 先验证package技能和引用/许可完整，再生成本仓库scaffold迁移diff，主会话核查每条受管替换。
- [ ] 在确认无冲突的范围部署固定runtime/manifest；保留config/workflow/spec/history，不运行fresh init。
- [ ] 移除.agents以及旧bridge引用，更新当前AGENTS/task context/文档到surviving resources，保留不可盲改历史证据。
- [ ] 简化installer/README/TESTING，旧patch入口不再属于支持安装路径；移除不适用外部trellis更新引导。
- [ ] 用后迁移scripts及package实际资源做定向/全量回归、hash与reference closure、user-state-before-after对比。
- [ ] 独立check final差异，自修范围内问题；确认parent AC1–AC7证据及残留限制。
- [ ] 更新规格/所有父子任务进度并汇报；不自动commit/archive/install/push。

验证：env -u TRELLIS_CONTEXT_ID npm test；所有parent/child task.py validate；git diff --check；真实runtime资源hash检查。临时fixture init/commit限fixture，不在本项目调用具有自动commit副作用的lifecycle命令。无lint/typecheck脚本不标绿。不可安全保留冲突需停下来报告，不推断用户授权覆盖。
