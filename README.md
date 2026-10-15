# pi-trellis

pi-trellis 是 [Pi](https://pi.dev) 的扩展，基于 [Trellis](https://www.npmjs.com/package/@mindfoldhq/trellis) 的任务、规范和工作记录体系，提供项目初始化、任务上下文、状态显示和角色派发。

安装一次，再在需要使用的项目中运行 `/trellis-init`。项目规范、任务和工作记录保存在项目的 `.trellis/` 下，由你和团队维护。

## 与原版 Trellis 的关系

pi-trellis 针对 Pi 重新组织了默认工作流，并调整了角色、技能和配套脚本。它不是把原版配置直接搬到 Pi：从需求规划、任务执行到检查和收尾，都按当前的 Pi 使用方式进行了调整。

使用时只需安装本扩展，再通过 `/trellis-init` 初始化项目，**无需另外安装上游 `trellis` CLI**。本包会部署所需的项目脚本；执行这些脚本仍需要本机安装 Python 3.10+。已有项目的接管和资源更新见 [项目初始化](docs/initialization.md)。

当前默认配置主要面向 **Pi + [my-pi-preset](https://github.com/AkiChase/my-pi-preset)**，部分工具和交互能力依赖 preset 中的配套插件。单独安装 pi-trellis 不等于获得这套组合的完整体验。

相应地，它也不再以原版 Trellis 的跨 Harness 使用方式为目标。初始化后的工作流和角色不保证直接适用于其他 Harness；混用或迁移需要自行调整。同时，本包只维护当前使用范围内的 Trellis 能力，不提供上游 CLI 的全部功能。

## 功能概览

- **任务上下文**：向模型提供项目工作流、当前任务和执行阶段，按需读取开发规范与任务材料。
- **常驻任务显示**：在编辑器上方显示项目未完成任务数，以及当前会话的任务状态；也可移到页脚或关闭。
- **任务浏览器**：通过 `/trellis-task-viewer` 查看任务列表、层级和 PRD、设计、实施文档，不切换任务或修改文件。
- **角色派发**：提供 `trellis-implement`、`trellis-check`、`trellis-research` 三个角色，分别负责实现、检查和研究。
- **托管 worktree**：需要隔离代码修改时，支持创建和准备任务工作目录、同步任务材料，并向该目录派发角色。

Trellis 功能只在受支持的项目中启用；普通项目仍可使用 `/trellis-init`。

## 安装与开始使用

### 环境要求

- Pi ≥ 1.2.0。
- Python ≥ 3.10，用于初始化和执行项目运行时；普通启动不需要 Python。
- 若要派发子代理，还需安装 [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents)。不安装也可使用其他功能。

Windows 尚未验证，建议在 macOS 或 Linux 上使用。

### 1. 安装扩展

```bash
pi install --approve git:github.com/AkiChase/pi-trellis

# 可选：安装子代理扩展
pi install @tintinweb/pi-subagents
```

默认安装到用户级配置，多个项目共用。需要仅在当前项目安装时，在 `pi install` 中加 `-l`。

### 2. 打开项目并初始化

在项目目录启动 Pi，按宿主提示授予项目信任，然后执行：

```text
/trellis-init
```

按提示选择开发者身份并确认。初始化会创建项目运行时、角色定义、工作流与规范入口，以及初始任务；不会自动选择当前任务、安装依赖或提交 Git。

已有 Trellis 项目也从这个命令进入，根据项目状态设置本地身份、接管旧项目或更新资源。**接管旧项目可能替换旧运行时和角色，请先查看计划再确认。**

打开 `/trellis-init` 后选择 `Check` 查看只读诊断报告，或选择 `Help` 查看帮助；指令不接受参数。

完整操作与更新规则见 [项目初始化](docs/initialization.md)。无需安装全局 Trellis CLI。

## 基本使用

在已初始化的项目中，可以直接向 Pi 描述需求。工作流会引导模型先了解项目、明确范围，再实施和检查；只读探索不需要创建任务。

也可以显式调用技能：

| 入口 | 用途 |
|---|---|
| `/skill:trellis-start` | 开始或恢复开发会话，读取任务记录并确定下一步 |
| `/skill:trellis-finish-work` | 在确认工作完成后，按授权归档任务并记录进度 |
| `/trellis-task-viewer` | 只读浏览任务及规划文档 |

新会话续接已有任务时，可以让 Pi 将任务绑定到当前会话：

```bash
python3 .trellis/scripts/task.py active <任务目录或名称>
```

`active` 只绑定，不改任务状态、不运行启动 hook；多个会话可以绑定同一任务，旧会话的绑定保留。`start` 则用于批准实施后启动任务，会推进状态、记录分支并运行启动 hook。绑定后说“继续”，或使用 `trellis-start` 恢复任务上下文即可。

默认会在编辑器上方显示任务信息，例如：

```text
▸ trellis(3) · 10-14-example · in_progress · prd ✓ design · impl ·
```

没有当前会话任务时，仍显示项目未完成任务数。任务浏览器与状态显示只负责查看，不会自动开始或切换任务。

需要子代理时，可以让主会话使用 `trellis_dispatch` 派发实现、检查或研究角色。默认在共享源目录执行；绑定托管 worktree 的任务必须在准备好的对应目录执行。详细说明见 [任务派发](docs/dispatch.md)。

## 使用文档

README 提供入门入口，各功能的操作、配置和限制放在 `docs/`：

| 文档 | 内容 |
|---|---|
| [项目初始化](docs/initialization.md) | 新建与接管项目、本地身份、资源更新和模板替换 |
| [任务浏览器](docs/task-viewer.md) | 任务列表、层级、文档查看与键位 |
| [常驻任务显示](docs/task-display.md) | 任务计数、显示位置与刷新行为 |
| [任务派发](docs/dispatch.md) | 三个角色、定制、并发、停止和执行状态 |
| [托管 worktree](docs/worktree-execution.md) | 创建、准备、材料同步、收集与安全清理 |
| [文档索引](docs/index.md) | 全部使用文档入口 |

## 配置

通常无需额外配置。以下环境变量可按需设置：

| 变量 | 用途 |
|---|---|
| `TRELLIS_PI_STATUS` | `widget`（默认，编辑器上方）、`status`（页脚）或 `off`（关闭） |
| `TRELLIS_PYTHON` | 指定 Python 解释器，默认使用 `python3`（Windows 为 `python`） |
| `TRELLIS_PI_CONTEXT` | `full` 或 `compact`，覆盖上下文注入的默认选择 |

项目工作流、开发规范和运行配置位于 `.trellis/`。角色定义位于 `.pi/agents/`，可以按项目需要定制。worktree 目录配置和高级使用规则见对应功能文档。

## 注意事项

- **安装不等于初始化。** 启动不会自动部署或修复项目资源；运行时异常时先打开 `/trellis-init` 并选择 `Check` 查看。
- **项目数据由你维护。** 不要忽略 `.trellis/.pi-trellis.json`，也不要用上游 `trellis update` 替换本包管理的固定运行时。
- **自动协作不等于自动授权。** 派发不自动推进阶段、提交或合并代码；worktree 和角色指令也不是系统级沙箱。
- **卸载保留项目文件。** 使用 `pi remove git:github.com/AkiChase/pi-trellis` 卸载用户级扩展；项目级卸载加 `-l`。运行时、配置与任务历史不会被删除。

开发与测试方法见 [开发规范](.trellis/spec/development/index.md) 和 [测试规范](.trellis/spec/testing/index.md)。

<a id="license"></a>

## 许可证

本包包含不同许可的代码与资源，并非全部采用 MIT：

- 原创 Pi 集成和原生 worktree 代码采用 [MIT](LICENSE)。
- 基于 Trellis 0.6.16 的运行时代码，以及基于 Trellis 0.6.17 的三个角色定义，保留上游 [AGPL-3.0-only](licenses/trellis-AGPL-3.0.txt) 许可。

具体来源、改动与校验记录见 [运行时来源清单](resources/runtime-baseline.json) 和 [角色来源清单](resources/agent-baseline.json)。
