# 修复 viewer 归档任务层级引用误报

## 目标与背景
用户报告未归档父任务引用已归档子任务时出现 `Missing or invalid hierarchy link`。`lib/task-browser/reader.ts:readTasks` 排除归档任务后，`projectTree` 仅从可见任务索引解析层级，混淆了隐藏与缺失。

## 已批准范围与边界
用户在审阅最小修复方案后回复“可以”，批准建任务、规划及实施。仅修改 reader、reader 回归测试与 `docs/task-viewer.md` 的关联契约；主会话直接实现并自检，不使用派发或 worktree。保持现有公开返回类型、UI 排序、只读性与路径安全边界。归档目录只用于解析未命中可见索引的引用，记录继续使用现有 UTF-8、大小、regular-file 与 task-local containment 校验。归档父任务不展示，其可见子任务留在顶层；归档子任务不参加投影。真实缺失、记录损坏和多份不同 canonical identity 的归档重名仍有诊断。

不修改任务记录、归档 CLI、持久任务计数、UI 交互、runtime manifest 或并行修改；不安装、reload、push 或归档本任务。

## 验收标准
- [x] 活跃父任务引用归档子任务，无误报且归档任务不展示。
- [x] 活跃子任务引用归档父任务，无误报且子任务仍展示一次。
- [x] 真正缺失、损坏、越界与歧义引用保留诊断；归档同 canonical aliases 不产生假歧义。
- [x] 名称、任务路径形式与合法 archive alias 引用均能识别；可见索引优先。
- [x] 与本次引用无关的损坏归档记录不导致浏览全部失败；读取不修改 fixture 内容。
- [x] reader/UI focused tests 及完整测试结果如实记录。

## 单阶段计划及检查点
1. 补充上述回归并确认旧代码失败。
2. 在 reader 的引用解析边界识别隐藏归档对象，不加入可见树；复用现有安全读取与验证函数。
3. 更新功能文档（中文新增契约），运行 focused tests 与完整 `npm test`，自检实际 diff、空白与文件范围。
4. 提交仅本阶段 reader、测试、文档及本任务规划/验证记录。保留其他会话未提交内容。无独立 reviewer：本次为私有 reader 内部小范围行为修复，不改变公开接口或权限契约，采用主会话自检与安全负例测试。

验证环境：`PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，测试子进程 `env -u TRELLIS_CONTEXT_ID`。
命令：`node --import ./tests/host-tui.mjs --test tests/task-browser-reader.test.mjs tests/task-browser-ui.test.mjs`；`npm test`；`git diff --check`。没有 lint/typecheck 脚本；不声称真实 PTY 验收。
