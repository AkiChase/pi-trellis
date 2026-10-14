# 已有项目采用 Workflow 与 Spec 模板

## 目标

为已有项目提供显式 Apply template 操作，让用户无需删除文件或手改部署清单即可采用包内 Workflow 与 Spec 基础模板。

## 授权与当前阶段

用户批准主 Agent 轻量执行（PRD-only），沿用已确认需求；实施与验证在主会话完成，独立只读审查用于检查覆盖/备份安全边界。
此前 runtime release 校验阻断创建；用户自行完成资源更新后，本轮 CLI 已可运行。现有 `.trellis/scripts/task.py`、`.trellis/.pi-trellis.json` 和 workspace 的未提交修改保留，不混入后续任务工作。

## 已确认需求

- 在 init 的项目操作中新增 Apply template，与安全 Update resources / Repair 区分。
- 支持 Workflow、Spec、Workflow + Spec；首版仅使用包内模板，不接远程模板源。
- 界面使用英文，仅展示文件动作列表（Replace / Create / Same）及一次统一确认 Cancel / Apply template。
- 不做单文件 diff、详情页、逐行勾选、自动合并或多重确认。
- Replace 文件经确认后整体替换，Create 文件新增，Same 文件不写入。
- 覆盖前保存旧内容备份，其他项目文件保留。
- 确认前重新检查预览对应文件；变化时拒绝使用旧预览覆盖，不增加常规交互步骤。
- 采用后记录真实模板来源与指纹，使未修改的模板可被后续安全资源更新识别。

## 包内模板范围

Workflow 仅 `.trellis/workflow.md`。
Spec 仅以下四个基础文件，不生成项目类型或框架专用规范：

- `.trellis/spec/index.md`
- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

内容源为 `resources/templates/` 对应文件；已有项目独有的其他 spec 文件不删除、不覆盖。

## 不在范围内

- 远程模板、模板市场、项目类型检测、实际项目规范生成。
- 覆盖 config、scripts、agents、tasks、workspace/journal、developer identity、当前任务绑定、AGENTS.md 或 Git 配置/项目代码。
- 自动安装、同步本项目资源、reload、push 或迁移未知 runtime。
- 自动合并、逐文件选择或 diff UI。

## 验收标准

- [x] 已有受支持项目可进入 Apply template，选择范围后展示真实 Replace/Create/Same 清单及一次确认。
- [x] Cancel、预览和失败前校验不写项目内容。
- [x] 确认后仅应用所选模板文件，Same 不写，项目独有 spec 和所有范围外内容保持不变。
- [x] 被替换文件有可定位的备份；不得先丢失旧内容再报告失败。
- [x] 模板来源/指纹记录准确，后续安全更新能识别 adopted package-default 文档。
- [x] 并发变更、symlink/path 逃逸、错误包 hash 与资源清单问题拒绝不安全覆盖。
- [x] 新功能没有额外 diff/详情/逐行确认步骤。
- [x] 测试覆盖实际写入、取消、备份、范围保留及失败路径；报告真实 UI/资源更新验证限制。

## 轻量执行计划

- 主会话直接实现，单阶段检查后提交；不自动归档、不部署本项目。
- `resources.ts` 复用现有 manifest/path/hash 校验与资源锁，新增仅 workflow/spec allowlist 的预览和采用；`command.ts` 新菜单、范围选择与一个原生 confirm 展示动作列表。不新增 diff UI。
- 仅当前已安装 runtime 健康且 release 匹配的源项目可采用；未知/缺失/修改 runtime 须先处理资源更新，不借模板操作修复。
- 覆盖前在 `.trellis/.runtime/template-backups/<uuid>/` 保存全部替换文件及原 manifest，保留相对路径/权限；采用来源存于 manifest。Same 按内容与模式相同判断，不写文件，但可更新其模板来源。
- 确认后重建完整计划、对比所有选中文档/manifest/package，锁内再检查。多文件逐个原子发布，不假称事务；中途失败保留备份与已经写出的文件，明确错误和备份路径，无自动回滚或恢复授权。
- 测试：`env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/resource-update.test.mjs tests/apply-template.test.mjs tests/init-command.test.mjs tests/initialization.test.mjs`；同 env 的 `npm test` 与 `git diff --check`。
- 无 lint/typecheck scripts；未跑实际交互 UI时报告限制。无派发 Trellis 修改角色，unused manifests 保持空，start 显式 `--allow-empty-context`。

## 实施验收证据

主 Agent 已完成；focused 56/56、full 350/350，独立只读复查通过。验收勾选代表 fixture/API 与 native-dialog 模拟证据，不代表真实终端验收。实现细节与完整验证命令见 verification.md。尚未自动应用模板到本项目、reload、归档或记录 journal。
