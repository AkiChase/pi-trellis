# 固定运行时来源

## 版本与许可

pi-trellis 随包提供固定运行时，不依赖全局 Trellis CLI。

- 支持的任务、上下文、日志和开发者入口及其公共模块源于 **Trellis 0.6.16**，保留 Mindfold LLC attribution、修改声明和 **AGPL-3.0-only**。
- 原创 native worktree 实现与 Pi 集成为 **MIT**。
- 三个适配角色采用独立 **Trellis 0.6.17** Claude 文档基线，不能与运行时版本混用。

[运行时基线](../resources/runtime-baseline.json)保存完整来源与产物 SHA-256、许可和 release identity；[角色基线](../resources/agent-baseline.json)单独记录角色来源。发布依据是已记录的固定资源，不仅是 package version。来源核验不声称已取得上游 Git revision。

本包元数据为 `(MIT AND AGPL-3.0-only)`，不是完整 MIT-only。许可证见 [MIT](../LICENSE) 与 [AGPL](../licenses/trellis-AGPL-3.0.txt)；角色说明见[角色与来源](trellis-agent-sync.md)。

## 使用与更新

安装包不自动创建或更新项目文件。使用明确确认的 `/trellis-init` 初始化、接管或更新托管资源，见[初始化](initialization.md)。项目运行 `.trellis/scripts/` 下的固定入口，项目 workflow/config/spec/history 保持用户所有。

支持入口为 task.py、get_context.py、add_session.py、init_developer.py、get_developer.py 和 worktree.py。不要运行上游 `trellis update` 替换本发行版脚本，也不要把历史 patch 或 native-only 部署工具当作全项目初始化。

Python 3.10+ 是语法要求；目前 native CLI 执行证据来自 macOS/Python 3.14.7，不代表完整解释器或 Windows 支持矩阵。Windows 的进程死亡恢复保守拒绝无法证明的状态。

任务绑定只属于显式会话，不从其他会话自动猜测。无效指针或运行时会报错，不能当作无任务继续执行；只读浏览仍可使用。任务、材料与派发的具体操作见[任务派发](dispatch.md)、[托管 worktree](worktree-execution.md)和[任务浏览器](task-viewer.md)。
