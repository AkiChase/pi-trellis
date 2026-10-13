# 技术设计：原生 Python 管理 CLI

## 1. 已确定的架构

用户要求干净的原生 Python 实现，不采用 Python 包装 Node/TS，也不让调用者定位 pi-trellis 包绝对路径。

```text
主 Pi（留在源项目）
  ├─ bash → python3 .trellis/scripts/worktree.py <子命令>
  │           └─ 原生 Python：Git、关联记录、准备、恢复、删除
  └─ trellis_dispatch（派发 / 停止）
              └─ 宿主 pi.events 公共 RPC → 目标目录子代理
```

管理 CLI 不导入 TS、不启动 Node、不依赖 Pi SDK或第三方 Python 包。使用 argparse、subprocess、pathlib 等标准库。Pi 宿主仍使用 TS，这是宿主 API 的实现，不是管理 CLI 的运行时依赖。

## 2. 项目内入口与源文件

固定用户入口：

```bash
python3 .trellis/scripts/worktree.py create --task .trellis/tasks/10-13-example
python3 .trellis/scripts/worktree.py prepare --task .trellis/tasks/10-13-example
python3 .trellis/scripts/worktree.py status --task .trellis/tasks/10-13-example
```

包中保存独立 Python 源文件和所需私有模块；部署到项目 `.trellis/scripts/` 下，私有模块使用 pi-trellis 专属命名空间，避免覆盖上游 common 模块。只调用目标已有 task.py，不要求修改上游 task.py。

新增部署机制与 `scripts/patch-trellis.py` 分开：后者继续仅做 active_task.py 的精确安全补丁。安装流程部署 CLI，支持检查、dry-run、幂等更新；记录版本/内容摘要，只更新未定制文件。未知已有同名文件或用户改动必须拒绝覆盖并说明冲突，禁止默默恢复默认。不会写死包路径，部署后管理脚本可独立于原包目录运行。

不在每次 CLI 运行时安装、更新或联网修复；缺少依赖模块/目标 task.py 时明确失败。目标 worktree 基线缺少 CLI/必要 Trellis 文件时报告需要提交或显式更新，不在 prepare 时偷偷部署源未提交脚本。真实项目安装/更新另需用户授权。

## 3. 命令与输出契约

| 子命令 | 专用参数 | 行为 |
| --- | --- | --- |
| create | --base、--branch | 新建，目录由配置目录加 task slug决定，不接受 path |
| adopt | --path（必需）、--base、--branch | 接管同仓库已有带分支注册 worktree |
| status | 无 | 只读查询 |
| prepare | 无 | 选定材料与独立目标上下文 |
| recover | 无 | 已死亡 owner 的占用恢复 |
| remove | --integrated-into | 现存目标要求有效提交保留引用 |

公共选项：`--task` 必需；`--cwd` 默认进程 cwd；`--json` 提供机器输出。可变更操作允许 `--confirm`，省略则只预览；status 不接受 confirm。help 不访问或写入仓库。

使用 argparse 子解析器，并禁用参数缩写；重复选项、未知/不适用参数、缺值、显式空值/全空白、控制字符均在变更前拒绝。合法非空值不随意 trim，不靠空占位触发默认。

普通输出使用“创建预览 / 目录已创建，尚未准备 / 可以派发”等用户语言。JSON stdout只输出一个完整对象，进度和诊断走stderr；失败非零退出并提供失败对象，不把未知异常当成功。不能用 confirm 证明用户已批准。

## 4. Python 管理核心迁移

按行为和安全契约迁移，不逐行翻译 TS：

- 仓库/source/target/common-Git身份、注册工作树和可信 marker校验；
- 路径规范化、symlink/metadata/重叠/任务目录校验；
- 配置读取、base/branch解析与Git有效ignore检查；
- v1关联记录、原子发布、source全局锁与错误状态保留；
- 选定任务材料复制、target branch元数据例外、ready校验；
- clean/ancestry/cwd/占用约束下的remove；
- 保守检查owner存活、明确恢复而非自动清理。

Git以argv运行，清理继承的Git重定向环境，不调用shell拼接命令；错误保留产物，禁止force或自动删除分支。记录格式、路径、锁名、权限和状态语义保持兼容。

准备继续显式在目标 cwd 设置绑定独立 TRELLIS_CONTEXT_ID 调用目标 task.py start/current；源任务必须已in_progress。不能继承源ID写目标指针，不能改变源task状态或复制源pointer/代码/配置。选定清单与材料限制需要移植等价验证，通过恶意路径、冲突、symlink和预算无关完整校验的fixture证明，不降低成“文件存在即可ready”。

## 5. Python 与宿主的边界

Python 是管理/准备规则的唯一实现。宿主派发需要的只读身份与ready检查，通过包内Python查询接口获得机器结果；不再保留第二份TS preparation/cleanup管理逻辑。内部查询不是新的注册工具，不向用户暴露第二套生命周期命令。

TS继续拥有provider RPC、执行lease、terminal-event/snapshot与stop。宿主与Python共享v1关联/执行记录及source锁协议；底层读写/锁互操作需要专门测试。宿主在锁内重新核实Python只读查询结果，再预留执行记录；只读查询不重复获取同一锁，避免死锁。禁止将ownerPid改成短生命周期管理脚本PID。

原TS manager/preparation/cleanup迁移后删除或退役；仍被其他模块使用的读取/锁/配置代码按调用关系收敛，不能删除活调用或让旧实现继续成为隐蔽备用路径。迁移中必须完整检查task-context、bindings、executions、extension及测试的依赖。

## 6. 最小宿主工具

保留 `trellis_dispatch` 及旧 `{agent, task?, prompt}` 调用。可选action=dispatch/stop，省略视为dispatch。dispatch按动作要求真实agent/prompt；stop使用任务记录中已知agentId，不要求agent/prompt。只在保留宿主入口将可选字符串精确空串当未提供，必需值仍严格验证。

stop通过宿主RPC发请求，回复成功不清lease。保持真实ID、早终态、shutdown unknown、源宿主/config/role检查和目标cwd/off契约，不改provider、不引入daemon/IPC。

## 7. 发现、兼容与发布

主会话提示使用固定项目CLI入口，不注入包绝对路径。脚本缺失时说明需明确安装/更新，不静默部署。同步更新README、Agent阻断提示、旧计划现状说明与测试；不覆盖生成workflow或定制agents。

新会话不再注册trellis_worktree；旧调用主动迁移到CLI，不保留两套管理入口。旧dispatch调用兼容，持久记录无迁移。扩展注册变化需重载/重启，部署和重载不等于方案审阅授权。

## 8. 风险与回滚

本方案包含安全核心迁移，不再按小型空值补丁估算。以原fixture的行为与负例为基线，新增跨语言锁/记录和纯Python子进程测试。特别覆盖PID存活、atomic/symlink、byte/UTF-8限制、Git环境和source/target指针。

管理CLI应在Node不可用时仍能运行help及完整管理fixture。真实Pi/provider仍需其自身运行时，这不影响CLI纯Python要求。

回滚恢复入口与实现，不改v1记录、不删除用户worktree/材料/分支或重置指针。准备/hook非原子失败继续保留诊断。Python版本与跨平台存活检测按实际支持范围记录，不未经验证承诺完全等价。

## 9. 审阅状态

用户已批准本版完整迁移与部署方案，并要求在当前 checkout 直接实施；任务 in_progress。真实安装/更新、重载、提交及清理仍需单独授权。实际进度与限制记录在 implement.md。
