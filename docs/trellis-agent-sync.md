# Trellis 角色与来源

## 三个角色

本包角色通过已配置的子代理 provider 执行；pi-trellis 不实现 provider，也不自动安装搜索服务。

| 角色 | 职责 |
| --- | --- |
| `trellis-implement` | 读取任务材料，在已批准范围实施并验证，不提交或管理任务生命周期 |
| `trellis-check` | 审查指定范围，修复清晰的范围内问题，验证最终版本；设计争议或无关问题交主会话处理 |
| `trellis-research` | 只读研究，把实际证据写入任务 research；不改产品代码，不自行派发实施 |

角色会读取自己的 JSONL 与任务材料；缺失、截断或无任务时不能猜测需求。主会话选择实施、检查和阶段推进，不因角色结束而自动验收。派发和停止见[任务派发](dispatch.md)。

## Pi 适配

角色来源是 **`@mindfoldhq/trellis@0.6.17`** 在隔离项目生成的 **Claude Code** 文档，不是官方 Pi 文件的逐字复制，也不代表 Claude 与 Pi 运行环境完全相同。

适配包括 Pi 工具名、第一行派发任务优先、完整材料标记与补读、检查 staged/untracked 及明确指定 base 的已提交变更、范围内自修复与未运行检查报告。研究只使用实际可用外部工具，没有搜索工具时如实说明。所有角色使用 `isolation: off`；托管目录由主会话显式管理，不让 provider 创建临时 worktree。

内建工具名单和角色规则不是 shell 沙箱。继承 extensions/skills 时仍须审查配置；不兼容定制不会被派发工具静默覆盖。

## 发布与定制

角色由确认后的 `/trellis-init` 初始化、接管或资源更新发布，启动会话不部署或升级。可编辑项目 `.pi/agents/` 定制角色：安全资源更新保留定制并报告冲突；明确接管旧项目则按确认替换旧角色。详见[初始化](initialization.md)。更新文件不会改写已运行子代理。

## 来源记录与许可

[角色基线](../resources/agent-baseline.json)记录版本、平台、日期及完整来源/适配 SHA-256。固定 npm artifact integrity 为：

```text
sha512-u65OJbzR3OBzFWybX/uzBXaZdzn+71Afaknodu0GUcFIrTyp3ZegK9rHNeTX0guHow35WXkqDVuyrhn8vVzSQg==
```

上游为 <https://github.com/mindfold-ai/Trellis>。当时 npm gitHead 未返回，不声称对应已核实的 Git commit。此前官方 Pi 文档同步属于历史版本，不是当前基线。

上游文档与适配保留 **AGPL-3.0-only**，转换代码和角色中保留修改声明，全文见 [AGPL](../licenses/trellis-AGPL-3.0.txt)。原创集成/native 为 [MIT](../LICENSE)，固定 Trellis 0.6.16 派生运行时仍属 AGPL，见[运行时来源](runtime-baseline.md)。本包不是完整 MIT-only；这些说明不是对所有下游组合的法律意见。
