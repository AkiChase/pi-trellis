
## 实施启动与并行范围

用户批准完整方案在当前工作区执行。task start --allow-empty-context 成功，in_progress/main（CLI提示不能以main向自身发PR，当前不归档）。保留并行部署runtime/manifest/workflow和runtime-tool-names。

Stage1初次focused因未设host peer失败；随后指定现有Pi1.2.0 node_modules重跑，发现旧factory即注册假设、unsupported task-state假设及fake on覆盖shutdown handler问题，正在按新契约修正。日志 /tmp/trellis-stage1-initial.log、/tmp/trellis-stage1.log。不将失败描述为Passed。

实施途中其他会话修改 lib/task-browser/component.ts 和 tests/task-browser-ui.test.mjs（列表列对齐）；本任务仅修改该test的3条import与commandFixture注册两行，提交须精确hunk选择，列对齐变化不能混入。
