# 阶段 2 与最终验证

阶段 1 checkpoint：4cbeadc983950ce686d025ada84d9c895bb237a7，独立F1–F4复核已接受。

阶段 2 scope：统一dispatch docs/README/managed protocol、包 workflow模板/meta agents reference、两份通用extension spec契约（非功能说明）、native历史来源措辞、模板/skill输出hash manifests、optional provider harness source工具链。

- 最终 `PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules env -u TRELLIS_CONTEXT_ID npm test`：bh9bguptl **408/408 PASS**，自然结束。数量含并行viewer新增测试，不全归为本任务。
- `node --check tests/provider-contracts.mjs`：PASS。
- Changed Markdown 相对链接/whitespace：PASS；`git diff --check` PASS。
- `task.py validate`：check7条PASS；implement有意为空仍报1error，不称全通过。
- 独立审查02fc8865报告无阻塞，已主读取；核 source/managed边界、条件锁、短提示、provenance和实际hash manifests。

保留失败：bw09lrkkn首次full发现workflow模板hash缺同步；main修resources/template-baseline.json和skill-baseline.json实际受影响hash，保留原source元数据后重跑绿。Python runtime release未改变；这些是独立inventory，未虚构release更新。

真实provider probe Not run（未获得对应probe授权）；只扩展可选harness并静态/语法检查，没有声称真实loader/provider本轮执行通过。无online/TUI/install/reload/个人sync。lint/typecheck无script，Unavailable。

spec评估：补通用source/managed记录、conditional serialization、跨任务坏记录隔离、UTF16共同schema、provenance边界；功能用法保留docs/dispatch.md。项目.trellis/workflow.md未改，role生成文档未改，未扩upstream同步链。

最终已满足本地自动化验收，任务保持in_progress待用户接受和finish授权。不会自动archive/journal/push。
