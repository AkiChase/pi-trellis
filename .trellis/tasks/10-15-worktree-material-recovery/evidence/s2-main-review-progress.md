# S2 主复核进度

2026-10-15：实现530dc81e返回candidate，主全文读lib/worktree-query、task-context、subagent-rpc、extensions（1264行分页完成）及实施交接。来源root/task/spec/refs直接source，target执行root，path-only无正文/complete marker；common未改符合最小接线方案。

普通独立review77d213af-0a65-4f4已启动，Review base9ec131f，允许S2 scopedfix。主已提示长期child绑定恒等性/源内部路径更换/单CLIwrapper绝对target路径/decoder边界重点，待独立报告。主未复测或验收/commitS2。

实现者最终focused91/91与稳定regressions54/54自然0；full417/424失败不是fullPASS。并行init菜单测试已在source变化，历史失败需最终冻结重跑，不随意改同owner。S1新增diagnostics导致initialization.test literal35需baseline+3，finalscope补最小fixture维护。默认glob外provider-contracts仍调用删去buildTaskContext/旧renderer，纳入S3最小测试接线但不授权真实probe/install；design/implement已明确。

extensions runtimeDiagnostic单行由并行init修改，S2提交必须排除此hunk；其他README/docs/initlibs/taskbrowser/template/skill/resource/projectmanifest/workflow邻task并行内容保持。S1 checkpoint9ec131f，S2仅candidate。无真实worktree/deploy/install/reload/push/archive。
