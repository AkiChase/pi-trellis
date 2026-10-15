# 技术设计

## 最小行为差距

公开子代理工具已改名，但 pi-trellis 普通调用的安全检查与材料注入仍匹配 `Agent`。修复位于 `extensions/trellis.ts` 的实际事件 owner；结果管理属于 preset，不在 Trellis 新建映射 registry。

## preset 实际合同（2026-10-15 只读核对）

前置已在邻仓源码落地，不再等待草案冻结。关联材料在 `../my-pi-preset/.trellis/tasks/archive/2026-10/10-14-runtime-task-tools/`；其实施记录明确外部 pi-trellis 组合 NOT_RUN。研究代理读取结果由主会话核对下面的 contracts/management/composition/RPC/source owner 后采用；代理早期看到的“本任务仅 PRD”已过时，不采纳为当前状态。

以下 `P` 指 `../my-pi-preset/extensions/`：

- `P/agent-tasks/src/index.ts:1677-1740`：`subagent_run` 必填 `prompt/description/subagent_type`，后台默认 true，resume 使用真实 agent ID；workflow 参数见 `:2574-2624`。普通 role 检查不依赖 description，但测试公开调用需补必填字段。
- `P/agent-tasks/src/source.ts:13-15`：task ID 直接沿用 record.id；不生成 Trellis 映射 ID。
- `P/runtime-tasks/contracts.ts:78-113`：按动作严格拒绝多余字段。list/stats 可带 `task_type`；status/output/wait/stop 只指定 `task_id` 和可选 `run_id`，不能附 `task_type`。verbose 仅子代理 output/wait，offset/limit 仅进程。不要把所有 optional schema 字段填成默认值。
- `P/runtime-tasks/facade.ts:35-67`：省略 run ID 时入口冻结当前轮次，显式旧值返回 stale；真实 RPC ID 可以直接定位。list 逐项身份位于正文，metadata 提供 count，不是结构化任务数组。
- `P/agent-tasks/src/management.ts:35-55`：list/status 不消费；终态 output 和成功 wait 消费精确 run 结果并抑制重复通知，取消／释放 wait 不停止执行。消费不删除记录，也不替代 Trellis 终态占用处理。
- `P/runtime-tasks/contracts.ts:20-34`：正文在 content，`details.runtimeTask` version=1，携带 action/task_id/run_id/task_type/status/raw_status/stats；wait 另有 wait_outcome。错误通过 error_code 和 isError 表示。
- `P/agent-tasks/src/index.ts:2934-2970`：message 输入 `{agent_id,message}`，不是 task_id/run_id；运行中的 ID／handle 可指导，尚未建立 session 时排队。
- `P/agent-tasks/src/cross-extension-rpc.ts:28-33/:75-102/:119-242`：公开 RPC v2 保持原 envelope/requestId；spawn 等 startup 返回 data.id，stop/consume 输入 agentId，成功没有 data。consume 不带 run_id，不能假定有显式轮次保护；服务缺席／关闭后无回复，由调用方超时。ping v2 不证明新工具存在。

推荐公开调用（仅示例，本次未执行）：

```js
{ action: "list", task_type: "subagent" }              // task_manage
{ action: "status", task_id: rpcReply.data.id }          // 从回复获取 run_id
{ agent_id: rpcReply.data.id, message: "收敛并报告" }     // subagent_message，仍在运行时
{ action: "wait", task_id: rpcReply.data.id, run_id }     // task_manage，完整回答且消费
{ action: "output", task_id: rpcReply.data.id, run_id }   // task_manage，可再次读取保留结果
```

## 本仓库迁移决策

### 1. 普通新入口

将能力诊断和普通 role 事件判断改为 `subagent_run`，继续读取 `subagent_type/prompt/isolation`。所有成功、阻断和异常分支一起迁移；只改主分支会遗留 unsupported-runtime 漏口。

保留 `isTrellisRole()` 的三个角色边界、材料 loader／prompt assembler、完整标记校验和子会话独立 task binding。非 Trellis 调用不注入、不阻断；`subagent_workflow` 不是新增的递归门禁，不能声称覆盖第三方内部 spawn。

能力提示只证明工具是否在注册列表中，不把工具存在等同于公共 RPC 可用；`trellis_dispatch` 仍以原有 ping／spawn 失败语义为准。提示不新增自动安装或 fallback provider。

### 2. shell 与刷新

白名单收敛为 `bash/monitor`。`bash.run_in_background` 不改变入口名，仍沿用显式 session key 前缀。保留 `invokesRuntime()` 识别、runtime 失效阻断和 `tool_result` 的任务命令刷新规则；不扩展到所有 `task_manage` 结果，也不修改 Python CLI。

### 3. 受管派发

`lib/subagent-rpc.ts` 保持 RPC owner。`RpcReply.data.id` 直接保存在 execution record 并返回 `details.agentId`，source/managed 使用相同真实 ID。只更新 description／返回指引，不增加新的返回 ID 字段或强制 task_manage run_id。

- 查询／读取／等待由 preset 新管理入口承担。
- 指导消息由 `subagent_message` 承担。
- 停止 Trellis 任务推荐 `trellis_dispatch {action:"stop",task}`，由既有 RPC 和终态监听维护占用。
- `task_manage.stop` 即使成功，也不授权 Trellis 删除 lease；取消等待不代表子代理取消。成功等待／终态读取会消费结果，但不证明 Trellis 终态落盘。

本仓库 `rpc()` 保持 envelope/requestId、现有 timeout；ping/spawn/stop 及 completed/failed 监听保持。consume 通道由 provider 提供，当前 Trellis 产品不调用；新增 probe 对其验证不等于扩展产品调用范围。

### 4. 资源与说明

预期产品文件：`extensions/trellis.ts`、`lib/subagent-rpc.ts` 和对应 tests。活跃用户指引集中在 `docs/dispatch.md`；开发规范只做已有普通调用约束名称校正，不加入新功能教程。

已核对的 package 资源：`resources/templates/workflow.md`、`skills/trellis-meta/references/local-architecture/context-injection.md`、`skills/trellis-meta/references/platform-files/agents.md`，分别更新 template/skill baseline 中受影响条目。其余 skill、角色文档是否涉及入口以最终实际搜索／全文为准；当前角色的 “Main Agent” 是身份称谓，不替换。

不生成角色、不下载 upstream、不修改 agent/runtime hashes 来掩盖无关变化，不直接改 `.pi/agents`、部署脚本、用户 settings 或项目 manifest。与并行资源修改发生冲突时协调同一最终内容和 hash，不恢复旧基线。

## 验证设计

### 离线回归

事件测试 fixture 全面改用新名；不能保留默认 `Agent` 让正例测试只覆盖旧分支。新增前后台 bash／命令 monitor 和 ws monitor 的差异断言。unsupported/foreign/invalid binding 的测试还要观察没有 spawn／Python 执行／指针变动，不只匹配错误文本。

普通无任务／截断材料仍保留子侧 fallback；加载正确材料、session key 隔离、完整标记、已绑定任务拒绝、早到终态与未知 lease 等回归继续存在。新入口无旧 alias；历史／上游文本的旧名不作为全仓禁词。

### 真实组合探针

现有 `tests/provider-contracts.mjs` 假定 provider `src/index.ts` 同时注册结果／指导工具；这个假定必须拆开。原生 provider 单独保留 RPC／旧工具测试套件，其通过只证明该 provider 机制，不作为 Trellis 旧名兼容层。

新组合只加载本仓库 `extensions/trellis.ts` 和邻仓 `extensions/task-composition.ts`。后者内部注册 process/agent 后端并唯一注册 task_manage（`:23-36`）；单独 agent-tasks/src/index.ts 只提供 management capability。不要并载独立 agent 后端／原生 pi-subagents，避免重复工具、manager、RPC 服务。组合覆盖 builtin bash 是预期行为，需检查最终 schema 含后台参数。

两模式使用独立隔离进程。临时 settings 持久写入组合的两个入口，child reload 不能只依赖 parent additionalExtensionPaths；保留角色 `extensions:true/isolation:off` 和所需管理能力。

新组合必须调用公开 task_manage/subagent_message tool execute（schema形状与实际 runtime约束均有效），验证 RPC 返回的真实 ID 而非普通 subagent_run 另起的 ID。probe 可显式加载 provider 源作为测试依赖，产品不能 import provider 私有 manager；不注册假的 task_manage 来凑通过。

使用临时 project/agentDir、faux offline response、无网络／个人凭据，保留真实 child cwd、source 材料与持久 adapter 配置验证。新组合未跑前不得把 preset 自身已通过测试或旧 provider PASS 记作跨仓库验收。

## 失败与停止边界

找不到新工具、schema 不同、真实 ID 不可管理、RPC reply／终态不兼容均作为阻碍报告，不增加兼容 shim 或改 preset。测试缺少已授权依赖时 NOT_RUN。实现后的 scoped 修复用后续提交，不自动 rebase/amend/回滚并行文件。

本次出现的 runtime-release 门禁拒绝按 [PRD 启动前置](prd.md#启动前置)处理：源 manifest 与 baseline 一致不证明已加载扩展一致，不自动 init/reload，不绕过阻断运行生命周期命令。
