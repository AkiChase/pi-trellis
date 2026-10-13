# 模板来源与迁移保留清单的衔接修正

迁移前置代理在临时副本复现：schema1要求32runtime+3agents+8模板记录全等于包资源，无法真实表达本仓库保留的项目内容。真实迁移未执行，既有380路径未变。

主会话在统一授权范围内修复该设计缺口，不开放一般legacy迁移、不覆盖用户模板、不伪造默认hash。

## 精确调整

采用显式schemaVersion=2：
- files只包含32runtime+3agents精确受管资源，校验完整集合/source/kind/hash/mode不放宽。runtime执行前继续核验实际runtime文件。
- templates独立集合：known8模板目标各自记录 origin (`package-default` 或 `preserved-project`)、真实初始sha256/mode及来源说明。package-default严格与包资源匹配；preserved-project记录保留内容的实际初始指纹，或明确不存在（null），不声称包模板部署。这些只是用户内容来源诊断，不授权读写运行时代码。
- 新项目init只生成package-default记录；公开init仍拒绝无清单legacy，不能输入preserved标志触发旧迁移。项目身份-only保留已有模板来源，不重写模板。
- schema2替代尚未发布的schema1，仓库源码/测试fixture全部受控更新，无旧项目兼容层。runtimeReleaseId独立，runtime源码不改。
- 一次性本仓库迁移为preserved-project8项填写准确现存指纹/不存在值。字段严格、有界、路径精确；模板source不能任意filepath/执行授权，不允许伪造package-default。接受记录不意味着提供迁移执行API。
- init恢复计划仅来自规范包输出，schema修改不能恢复任意output漏洞。完整操作/锁/完成验证保持。

## 验收

临时fixture证明：真实保留模板及不存在spec/index可表达；canonicalinit真实默认来源；identity恢复不重写模板；错误runtime/agent集合、伪造默认源/错误schema拒绝；incomplete operation、任意恢复output、原始门禁测试保留。完整回归/独立check通过后才迁移本仓库。
