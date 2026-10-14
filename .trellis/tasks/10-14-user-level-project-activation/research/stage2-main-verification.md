# Stage 2 主验证（进行中）

Stage1检查点568634f。Stage2仅条件skills/公开resolver/真实SDK测试，尚未提交/接受。

- b9tb75x6j focused技能资源+context PASS，exit0。
- b5nwfrjf3 SDK初次失败：测试误用不存在session.getExtensionRunner；改为公开loader.getExtensions，未访问session私有runner。
- b58f2h9dc真实SDK3项PASS，exit0：fresh→deployment/reload→complete→invalid/reload withdrawal；clone无身份；native filter matrix/配置byte preservation/trust。
- 新增noSkills（宿主允许extension explicit discoveries）、临时-e和重复user/project声明；full b92h1h7mq运行中。
- Stage2独立checker ddf9863c-0108-4a3运行中，主不与其重复审查或写同文件。

测试均隔离临时agentDir/project，已有Pi1.2.0 SDK、不安装、无model network，不是真实个人reload/PTY/provider验收。静态typecheck/lint unavailable。
