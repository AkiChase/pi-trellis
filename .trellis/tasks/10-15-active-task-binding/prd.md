# Active task binding and continue cleanup

## 目标与背景

允许新会话续接已有任务而不启动实施，删除重复的 continue 技能。现有绑定保存在 `.trellis/.runtime/sessions/<key>.json`；`set_active_task()` 只写当前会话文件，已有多会话共享 task 的模型保持不变。`start` 则同时推进状态、记录分支并运行 hook。源码依据：`runtime/task.py`、`runtime/common/active_task.py`、`runtime/common/io.py`、`skills/trellis-{start,continue}/SKILL.md`。

## 要求

- R1：新增 `task.py active <任务>`，复用现有路径/记录/identity 验证与单文件原子写入，仅修改当前会话绑定；不改任务状态、branch，不运行 hooks，不要求 implement/check manifest 非空，不代表实施批准。同任务重复绑定幂等成功。
- R2：保持多个 session 可绑定同一 task；不扫描、删除或改写其他 session。无冲突检测、`--takeover`、新增锁、负责人或租约模型。旧会话/子代理绑定保留，进程不停止。归档既有全任务绑定清理行为不变。
- R3：删除包技能 `trellis-continue`，恢复任务时读取状态与实际实施记录并选择步骤的逻辑合并至 `trellis-start`。保留原有批准、阶段检查/提交和派发角色来源边界，不让恢复变成自动批准。
- R4：同步当前 README、模板、技能支持文档、清单、测试和必要 spec；README 简短说明 active/start 的区别及多会话绑定。历史归档/旧聊天引用不改写。保留来源 attribution 与未删除资源的历史来源 hash，更新 adapted hash。

## 验收

- [ ] A1：no-task session 使用 active 绑定 planning/in_progress 任务，current 返回目标；task.json 字节、branch、hooks、Git/workspace 不变；空 manifest 不阻止。
- [ ] A2：两个普通 session 和子 session 均可绑定同一任务，切换当前 session 到另一任务时其他指针字节不变，不新增锁文件。
- [ ] A3：重复 active 不写额外数据；无/坏 identity、坏/缺失/越界任务、unsafe symlink 和无效当前指针不产生非法绑定。I/O 失败如实报告，不修改 task/hook/其他指针。
- [ ] A4：continue 不再作为包技能发布/发现，start 保留恢复路由；当前使用引用同步，历史归档保留。
- [ ] A5：技能发现、workflow policy、资源来源/hash/数量与 CLI help、真实 runtime fixture 测试全部一致。
- [ ] A6：focused/full Node 与 Python、隔离真实宿主模拟验收记录实际结果；不把模拟当成在线模型质量或真实终端视觉验证。

## 范围外与风险

不做跨会话执行互斥/取消/接管/锁/过期指针清理，不改变 create/start/deactivate 语义，不修改 Pi session transcript。历史绑定是本地记录而非“仍在执行”的证明，两个会话同时写代码由使用者协调。不安装依赖、不联网模型、不发布/重载个人安装、不 push；产品修改仅 `runtime/`，不手改项目部署副本或 manifest 绕过来源校验。保留并行修改。

## 授权

用户已批准上述简化方案，要求更新任务后开工、逐阶段提交；最终检查通过可直接收尾归档与记录进度。另授权模拟真实环境验收：使用隔离临时 project/agent dirs 与现有宿主，不访问个人凭据或在线模型。无阻塞产品问题。
