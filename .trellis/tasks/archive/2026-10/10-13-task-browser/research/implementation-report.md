# 实施报告

## 范围与执行边界

按已批准的 PRD/design/implement，在当前 source workspace 直接实施；未创建或管理 worktree，未部署 CLI、安装依赖、reload、stage、commit、push、archive，也未派发其他实施或检查子代理。

本次只修改以下文件：

- `extensions/trellis.ts`：新增 import 与 `/trellis-task` 注册；在命令调用时使用既有 `findRoot`、`contextKey`、`readActiveTaskFromDisk` 与 `resolveTaskPath` 获取项目/当前任务的只读身份，不使用 `session()` 或运行时 CLI fallback。
- `lib/task-browser/reader.ts`（新增）：即时目录枚举、canonical archive 排除和 alias 去重、task-local 常规文件检查、任务记录验证、确定性树投影及有界诊断；PRD/Design/Implement 区分 missing/empty/ready/removed/error。
- `lib/task-browser/component.ts`（新增）：单实例 list/detail 状态、原生键解析、列表选中/视口保留、分 section 滚动、显式 refresh、host Markdown/getMarkdownTheme、宽度/高度限制、resize/theme 缓存失效及不支持富内容的文本回退。
- `lib/task-browser/command.ts`（新增）：English command copy、TUI-only guard、原生 `ctx.ui.custom` 全宽/全高 overlay 与 completion callback。overlay 行填满终端宽度，避免底层 transcript 残留；未创建第二个 renderer。
- `tests/task-browser-reader.test.mjs`（新增）：19 个 reader 边界用例。
- `tests/task-browser-ui.test.mjs`（新增）：13 个 real-host rendering/navigation/command/preservation 用例。
- `README.md`：仅新增 `Browse task documents` 使用说明；既有并行修改保留。
- 本报告。

没有修改任务 PRD/design/implement/JSONL/task.json，也没有修改 count 函数或共享 containment helper。没有修改初始化/资源管理/migration 的实现和测试、其他任务材料或规范文档。独立 check 与最终 spec 判断留给主会话。

## 实现细节与验收证据

1. **列表与身份**：展示非归档任务，包括尚留在 active store 的 completed 记录；这与原有 unfinished count 语义刻意区分。状态颜色、树线、`* Current task` 与原语言标题分开呈现；先保护 marker/status，再截断列表标题。详情全标题/path 放在可滚动的包装内容中。
2. **只读安全**：复用 `resolveTaskPath`/`readTaskRecord`/`containsPath`；明确 top-level task-store symlink 可以外置，但任务记录/文档不得逃出选中任务目录。拒绝 dangling/escaping symlink、目录/FIFO 等 special file、非 UTF-8/NUL 文档；2 MiB 文档上限报错而非静默截断。task.json 延续现有 1 MiB 上限。
3. **层级**：支持 slug/project-relative parent/children 引用与 canonical alias；有效 explicit parent 优先，孤儿/冲突保持可见，多重 child ownership 置顶提示；迭代算法断开循环且不丢失/复制任务。诊断最多 32 条加 omission notice，可以在列表继续向下查看。
4. **导航与刷新**：Up/Down、PageUp/PageDown、Enter、Esc、Left/Right、`r` 通过 host matchesKey；按 canonical identity 保持 refresh 选中，删除后 clamp，不自动切任务；detail 任务消失保留旧身份并提示。文档按 section 缓存，refresh 清除，每个 section 有自己的滚动位置。
5. **Markdown**：使用安装的 Pi 1.2.0 原生 `Markdown` 和 `getMarkdownTheme()`，实际断言 headings/emphasis/inline & fenced code/nested lists/checklists/ordered lists/quotes/links/tables。窄 table 由 host 拆分 cell；需要结合多行判断文本，而不能把源码 byte length 当 terminal width。图片行和引用定义改为 literal Markdown source，保留 alt/URL；HTML、Mermaid 原样文本/代码，不访问网络或执行。进一步包装 host raw HTML/code 行以避免嵌入换行/宽行突破 viewport。
6. **终端适配**：固定 English header/footer 与 bounded body；窄宽度显示当前 section/编号并优先保留 Esc/refresh hints；所有行经 host visibleWidth/truncate/wrap，并按宽度填充。测试覆盖 1/2/4/8/20/34/80 列、1/2/3/4/8/30 行、CJK/combining/emoji/ANSI/control 输入与真实 dark→light theme invalidation。宽度仅容纳少数字符时自然不能完整显示全部提示。
7. **无副作用**：临时 Git fixture 的全部文件 bytes（含 `.git/index`）、session pointer、旧 `.current-task`、task/planning 文件和 porcelain 状态前后完全一致。故意提供会报错的 task/context CLI 文件；浏览不执行它们，无 message/model/lifecycle call，completion 只关闭交互。

## 实际验证

环境：Node `v24.14.1`、macOS；`PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`。只在测试 subprocess 用 `env -u TRELLIS_CONTEXT_ID`，未修改宿主进程环境或指针。

```bash
env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-browser*.test.mjs
# 32/32 passed, 0 failed, 0 skipped

env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/task-browser*.test.mjs tests/task-display.test.mjs tests/task-context.test.mjs tests/agent-context-integration.test.mjs
# final 78/78 passed, 0 failed, 0 skipped

env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules npm test
# final 324/324 passed, 0 failed, 0 skipped

git diff --check
# passed
python3 ./.trellis/scripts/task.py validate .trellis/tasks/10-13-task-browser
# implement.jsonl/check.jsonl: 3 entries each, passed
```

另外对 5 个 untracked code/test 文件逐行检查 trailing whitespace 与末尾 newline，全部通过。报告也在最终检查中复核。

早期 full run 为 322/323，唯一失败是并行维护中的 `tests/init-command.test.mjs` resource repair assertion；单独复现亦失败，未修改其源码/测试。最终重跑当前并行 workspace 全套为 324/324（增加了 overlay composition 用例）；早期失败不被掩盖，但最终 gate 已通过。测试日志在 `/tmp/pi-trellis-task-browser-{new,final-focused,final-full}.log`，早期日志在 `/tmp/pi-trellis-task-browser-{full,unrelated}.log`。

## 未运行与限制

- 没有 lint/typecheck package scripts；未把 Node TypeScript strip-only 执行称为完整静态 typecheck。实现已避免不受 strip-only 支持的 parameter properties。
- 没有实际 Pi PTY 交互 smoke test、regular/fullscreen 实机手动导航、加载/reload 或真实 provider/model probe。组件/真实 host renderer/overlay composition 测试不是用户真实终端交互验收。
- 独立 `trellis-check`、最终 spec 更新判断、AC 勾选与任务生命周期由主会话管理；本子代理没有执行。
- 无搜索/编辑/归档浏览、HTML/image/diagram browser rendering；上限/错误提示和 read-only 英文文案已在 README 明示。
