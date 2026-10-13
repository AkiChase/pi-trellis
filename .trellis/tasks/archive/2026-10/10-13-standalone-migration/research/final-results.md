# 主会话迁移与最终验收

用户要求直接由主agent完成，不再等待子代理；已停止manifest代理并接手实际迁移，未新开代理。

## 实际完成

- 源码manifest schema2分离运行时受管集合与保留模板来源。主会话检查严格files集合/默认来源/保留来源校验及canonical恢复边界；既有代理全量288/288后，主会话最终live树再次288/288。
- 将核验后的runtime32原样部署到本仓库.trellis/scripts，3roles记录来源/mode，8模板记录实际preserved-project指纹或明确不存在，不伪造默认部署。
- 保存原始内容备份与迁移前保护指纹，核验后删除仅项目.agents46文件，无其他目录删除。
- tasks/spec/workspace/developer/.runtime/config共127保护项前后hash一致；workflow仅改必要命令引用，AGENTS只改受管说明。保留旧上游元数据和legacy剩余模块/独立hook作为非受管证据，不做无必要清理。
- installer薄包装只安装Pi包，check/dry-run不调用项目Python/trellis，不部署或patch；旧options明确拒绝。README/owning specs更新。

## 验证

`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<已安装Pi node_modules> PYTHONDONTWRITEBYTECODE=1 npm test`：288/288，fail0，自然退出；日志/tmp/pi-bg/bfu4o67tt.log。

实际迁移root verifyRuntime成功；当前task.py current JSON为本session migration任务；taskcontext validate、bash -n scripts/install.sh、git diff --check通过。原始backup见migration-before.json，保留摘要见migration-preservation.json。

未实际plugin安装、reload、push；未真实TUI/provider验收。并行task-browser任务和新lib/task-browser不纳入本次提交，也不宣称其完成。父子任务AC只覆盖当前支持范围，不含此前暂缓upstream异常。
