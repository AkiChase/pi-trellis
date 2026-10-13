# 本仓库迁移与独立发行集成：技术设计

## 授权与顺序

父任务execution-authorization.md授权范围内自主推进。本任务只能在runtime与init实现/独立检查通过后执行。不会将授权推广为其他用户项目迁移、安装/提交/push。

## 迁移目标

- 将本仓库旧generated .trellis/scripts接管为核验后的固定runtime发行，manifest记录准确字节/版本。
- 保留tasks（含父子规划及archive）、spec内容、workspace日志、developer/runtime指针、config/workflow用户定制和并行改动。
- 所需skills及references先迁入package skills并验证全部引用，然后删除仅本仓库.agents。全局~/.agents和其他项目不扫描删除。
- 更新AGENTS/config/package/docs/任务context中原skills路径；历史文件引用不能盲目全替换或伪造历史，需明确标注替代路径或保留研究证据。
- installer不依赖全局trellis或隐式初始化，不安装时写项目runtime；README指引pi install然后/trellis-init，移除新发行版patch应用流程。

## 迁移机制

作为一次性本仓库集成，而非公开legacy迁移产品。准备before/after清单及backups、验证现有source hashes和非本任务修改；若冲突不覆盖。先读取所有目标/审批过的源码，生成迁移diff，明确保留哪些user-owned文件。无需执行fresh init或新bootstrap；已developer不写新identity/onboarding。可使用init内部受控deploy primitives，但必须由主会话明确指定本仓库核验资源，不能靠任何运行目录隐式允许迁移。

scope代码/文档变更独立于测试fixture; 不自动调用本项目task.py finish/archive、add_session自动commit、package install/reload。删除.agents前记录paths/checksums、迁移需要的skill reference closure，并检查任务JSONL有效。删除后不可再依赖被删skill执行quality/finish，使用包内skill文件。

## 风险与回退

部分部署失败、用户改动交错、init/runtime manifest状态不一致，停下保留已写文件报告；回退仅原字节核验通过的本任务受管路径，不git reset/clean、不删除.trellis。源码与文档其它子任务changes要保留，不用HEAD反向覆盖完整共享文件。

## 最终集成验收

无全局trellis的临时新项目安装资源/初始化/身份恢复/task/context/journal/worktree链路完整；当前本仓库.manifest/scripts/hash/skills/doc引用一致，task/spec/history未损。默认测试与独立check结果以最终live树为准，保留无UI/平台/真实provider限制。父任务AC1–AC7逐项映射证据，不认为单子任务完成等于parent通过。Git commit/push真实安装仍不自动执行。
