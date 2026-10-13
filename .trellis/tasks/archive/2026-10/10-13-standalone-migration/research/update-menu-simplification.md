# Update 菜单简化

按用户要求由主会话直接修改：移除独立 Repair missing resources 菜单，Update 同时更新旧的未定制受管资源并补齐缺失文件。无修改时只提示 `Project resources are up to date.`；更新后只提示 `Project resources updated.`。资源健康报告保留真实逐文件状态，删除 Skills loaded/no project copies 和 identity never reset 等重复说明。

保留底层已有repair模式兼容内部测试，不作为用户入口；没有更改覆盖/冲突/保留数据规则。

精确范围隔离快照 full292/292、fail0；实际Pi host preload，测试子进程unsetcontext、禁bytecode。log `/tmp/pi-bg/b2nux88gw.log`。diff-check通过。并行task-browser/adaptive-execution源码与技能模板改动未纳入本次提交。未install/reload/push。
