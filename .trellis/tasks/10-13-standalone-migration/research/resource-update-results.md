# 已初始化项目资源更新与状态补充

用户确认需要已初始化项目更新/修复，并要求status有实际内容；主agent直接实现，不派子代理。

新增 lib/initialization/resources.ts：只读扫描受管inventory、已记录/实际/当前包hash与mode比对。旧发行必须相同受支持schema及资源路径集合，不提供一般迁移。更新只有实际文件等于记录版本或已等于包版本，缺失受管文件可恢复；修改runtime/roles冲突拒绝，保留用户文档。自定义原默认模板转换为真实preserved-project记录，避免新版默认hash误标来源。

菜单新增Update project resources/Repair missing resources，写入前摘要+确认。View project status和--check报告安装/可用release、身份及每资源状态。写入锁、重新生成plan比较、每文件原始指纹复查、manifest最后写；完成的旧init操作保存为audit记录，不拿旧release恢复计划阻塞更新。无身份任务日志重置/创建、无hooks/install/Git副作用。部分失败非事务，原manifest保留且新包完整字节可重试，不强制覆盖。

测试：完整独立快照（HEAD加本次源码/tests）排除并行task-browser尚未完成的TypeScript改动，最终292/292、fail0自然退出。真实已安装Pi host preload，subprocess unsetcontext；log /tmp/pi-bg/bpf5q5hay.log。新增3个引擎测试+1个菜单确认/取消/修复测试；原初始化/伪造plan/manifest负例保留。实际本仓库只读resourceStatus可显示真实健康；未在真实项目执行update/repair，不reload/install/push。git diff --check通过。

限制：只支持同资源inventory的本发行版更新，新增/删除运行时入口会明确要求reconciliation而非猜测；任意shell/OS版本矩阵及真实视觉UI未验证。
