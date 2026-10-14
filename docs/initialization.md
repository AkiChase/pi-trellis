# 项目初始化

## 命令

```text
/trellis-init
/trellis-init --user "Your Name"
/trellis-init --check
/trellis-init --help
```

安装包后即可使用，项目不需要已有 `.trellis/` 或全局 Trellis CLI。需要 Python 3.10+。菜单、帮助和通知为英文；`--user` 跳过名字选择，不跳过最终确认。只有原生 UI 确认才写入；无 UI 时只返回状态与指引。`--check` 只读，不安装或执行模型回合。

## 新项目与已有 clone

新项目创建固定运行时、三个角色、可编辑 workflow/config/spec 入口、开发者身份、workspace 和 bootstrap 任务。不自动选择当前任务、运行 hooks、提交 Git 或安装依赖，也不自动扫描代码生成各层规范。

支持的 clone 缺少本地身份时，可选择历史名字或输入名字，只补缺失身份、workspace 与 onboarding 任务，保留历史。同名为无操作，不同已有身份会报冲突；支持合理 Unicode 和空格，危险路径名字会拒绝。

## 更新项目资源

已初始化项目提供 `Update project resources`、`View project status` 和 `Cancel`。状态可查看已安装与可用版本，以及各文件的缺失、修改、当前或保留状态。Skills 从安装包加载，不复制到项目。

安全更新可更新未修改的托管文件或恢复缺失文件；修改过的运行时或角色会阻止更新，不强制覆盖。定制的 workflow/spec 等文档保留，不重建身份、任务和日志。未知或不兼容项目需先明确处理。

确认更新后重新检查资源，成功刷新宿主并 reload。发布是逐文件进行的：中断保留已写文件，不承诺整项目回滚；重试时若资源已被其他操作修改，会报告冲突。遗留锁需检查，不自动删除。

## 接管无 manifest 的旧项目

已有 `.trellis/` 但无支持的托管 manifest 时，可选择 `Adopt existing project`。确认前列出将安装、替换、创建、保留的路径；旧版非托管内容留在原处。

**接管会无备份替换旧运行时、角色，以及 AGENTS/gitignore 的托管区域。** 区域外内容、已有 workflow/config/spec、身份、任务和日志保留；不会创建 onboarding 或删旧文件。重复或不完整标记、危险路径、不支持的运行环境会拒绝接管。

接管与安全更新不是同一动作。若接管中断，已写资源保留，需重新查看计划并确认；没有自动回滚。接管成功后仍缺身份的项目再单独设置身份。

## 采用包模板

健康源项目提供 `Apply template`，可选 Workflow、Spec 或两者。一次确认展示 Replace/Create/Same 路径，取消不写入；无逐文件选择、diff viewer 或自动合并。

这是**明确替换选中文档**，不是保留定制的安全更新：Workflow 选 `.trellis/workflow.md`，Spec 选包自带入口与三个 thinking-guide 文档。其他项目规范、配置、运行时、角色、身份和任务不变。

替换前会备份原文档和 manifest 到 `.trellis/.runtime/template-backups/<uuid>/` 并报告位置。失败保留备份和已写文件，不自动恢复。成功只刷新上下文，不部署运行时、启动任务、运行 hooks 或自动 reload。不支持远程模板。

## 使用边界

项目 `.trellis/.pi-trellis.json` 记录托管资源来源与版本，不应忽略或手工绕过。项目 workflow/config/spec/history 仍归用户所有；不要用上游 `trellis update` 替换固定脚本。

初始化必须在源项目而非 HOME 或托管 worktree 执行。危险 symlink、非普通文件、未知碰撞和定制托管标记会报错，不覆盖。文件级原子发布不等于全项目事务或 OS 沙箱。

运行时缺失、畸形、不完整或版本不匹配时，任务执行报 task_error，请用 `/trellis-init --check` 查看。普通只读浏览不受任务门禁阻断；不能把错误当作 No active task 继续执行。宿主识别常见 Trellis 命令并非完整 shell 沙箱，外部独立进程仍需调用者负责。
