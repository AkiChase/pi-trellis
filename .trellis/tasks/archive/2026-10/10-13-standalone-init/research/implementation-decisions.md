# 初始化实施衔接决策

主会话按统一授权收敛技术衔接，未增加产品能力。

- 运行时来源清单使用已交付 `resources/runtime-baseline.json`；项目完成清单 `.trellis/.pi-trellis.json` schemaVersion=1，记录 runtimeReleaseId、受管相对路径/full hashes/modes、模板/agent provenance。不要冻结当前 releaseId，实时核验包内文件。
- 模板初始hash仅诊断，不授权以后替换用户编辑。runtime mismatch拒绝危险操作；身份-only不重写runtime。
- 专用初始化操作记录与锁置于安全本地 `.trellis/.runtime/` 下，确认前不创建；记录planned originals/outputs与操作身份，部分发布仅一致同操作恢复。最终manifest完成前不能冒充supported ready。新root无.trellis时需保证首次写目录后可保守记录/恢复，并清楚披露非事务。
- 配置显式 session_auto_commit=false，无默认执行hooks；archive已有独立行为不能仅凭这个配置宣称不提交，init本身不调用archive。
- 任务canonical骨架从runtime现有工厂契约提取或新增纯helper，一份schema由runtime维护。若helper改变runtime文件需更新baseline hashes和回归，不能复制另一宽松TS任务工厂。无需trellis-core运行依赖。
- 复用同名onboarding必须验证有效task.json/PRD及实际developer，slug碰撞/损坏半任务明确冲突，不覆盖；同操作已创建文件可依据operation记录恢复。归档后active目录不存在允许重建，与上游实证对应。
- Root AGENTS/ignore受管块只追加至无块或复用匹配模板块；重复/不闭合/customized块冲突。精确journal attributes若已有非union规则冲突，不用泛正则判定成功。保留块外字节。
- Supported clone identity分支由有效manifest及此前无developer决定，不因tasks空去full init；fresh init只创建bootstrap，不选active task。
- `autoload:false` 实际是Pi project过滤delta，不应笼统解释为禁用；effective adapter guard需按真实资源解析/优先级验证，不采用前次只读审计的不完整推断。
- 保留10skills/必要refs并裁剪到Pi，现有来源.agents留到migration。不要把meta22refs作为必须实现22功能，仅保留对当前支持功能自洽的references并验证closure。
