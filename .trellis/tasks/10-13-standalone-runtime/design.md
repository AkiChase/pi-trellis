# 固定运行时与脚本修复：技术设计

状态：待最终实施批准；不修改当前项目生成脚本。

## 已验证来源

本项目 `.trellis/.version` 为 0.6.16。2026-10-13 逐字节对比 `.trellis/scripts/` 下 28 个 Python 文件与本机安装的 Trellis 0.6.16 模板，28/28 完全一致。因此以这些已提交脚本及其完整 SHA-256 记录作为固定上游源码基线。角色文档 0.6.17 来源是独立来源类别，不能混记。本子任务保存 AGPL 许可、源路径、版本和原始/修改后 hashes。

## 源码与改动位置

- `runtime/` 是包内运行时源码目录，项目执行入口仍为 `.trellis/scripts/`；不在本子任务对本项目部署新脚本。
- task.py/get_context.py/add_session.py/init_developer.py/get_developer.py 及实际需要的 common 导入依赖纳入 runtime。以 AST/实际进口验证导入闭包，排除未使用脚本和其他平台入口，而非凭文件名删依赖。
- 现有 `python/` 中 worktree 原创实现迁入同一 runtime 源码树，更新 package query/deployer/tests/docs 路径；只移动所有权不复制或改写管理算法。工作树材料同步、锁、派发协议保持行为。
- 基线元数据记录每个源文件的许可证/来源及修改，未来更新由发行版审核，不使用 install-time textual patch。

## 修复契约

1. 显式 session 身份、无单会话推断；child 独立 key、失败不继承 parent、finish 只清自身。
2. 活动任务解析保留诊断与授权区别。有效路径必须属于任务存储，task.json 对象及字段类型安全、大小有界；支持当前明确允许的外部来源 task store，但受管目标运行时仍本地。
3. current/context/packages/journal 不能从 raw stale 路径读取或授权。字符串包装返回有效任务或 None；需要诊断的调用方保留结构化结果。没有身份的 start 失败且不推进状态/hooks；无 task.json 目录不能绑定。
4. finish 清除损坏/失效的自身指针可返回诊断，但不执行任务 hooks；unlink 失败不得返回成功或触发 hooks。
5. journal 暂存采用完整已验证任务路径，不能用 basename 猜测本地任务；保留调用前无关 staged 文件。
6. archive 暂存只含实际归档目标、源删除及明确修改的子任务，不覆盖整个 archive 目录。
7. 开发者入口拒绝危险目录片段，保留合理 Unicode/空格及既有 identity/workspace；避免初始脚本误报身份切换。安全 argv 调用不含 shell 用户输入。
8. 删除运行时对 trellis --version/update 的外部探测和引导；版本事实使用发行版元数据。所有只读入口抑制 bytecode。

## 验证与交付

- 完整 runtime 在临时项目运行 CLI，而不是由补丁常量构造 fixture。
- 对 foreign/missing/empty/corrupt/stale/outside-task 指针测试读取、hooks、提交和保留性；临时 marker/Git 实验不碰本项目。
- 缺身份 start、坏 task.json、恶意 username、外部允许 store 与不允许路径分别验证。
- exact journal/archive staging 测试确认旧归档文件和无关 index 内容不进入提交。
- 测试 worktree 模块路径迁移前后协议/材料/快照输出不变；所有包内绝对位置按 import.meta.url/文件位置定位。
- 无全局 trellis 的环境中 help/current/context/journal/developer 工作；编译和导入无缓存写入。

## 排除与后续边界

本任务不做 init 菜单、项目初始化部署、本仓库 .agents 删除、一般旧项目/旧 worktree 迁移、全部 hierarchy/rename/journal 重试修复。effective adapter 配置/UI tool scoping/error 呈现属于 init 集成子任务。快照 symlink/mode 问题保留为后续，不混进源码目录移动。

## 发布门禁

修改包内 runtime 及相应路径引用是本子任务产品范围；当前 `.trellis/scripts`、身份、日志和任务指针（正常规划绑定除外）不作为测试写入对象。review 通过后交付 runtime 基线给初始化子任务。本任务实现完成不代表父任务验收、install、commit 或迁移已批准。
