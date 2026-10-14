# 只读任务浏览器

## 入口与职责

在 Pi 交互终端运行 `/trellis-task-viewer`，不带参数；多余参数显示 usage，旧 `/trellis-task` 不注册。命令无需当前任务、已部署 runtime、subprocess 或模型请求；每次调用解析项目根，不改常驻 unfinished-task count 或任何生命周期状态。非项目/非 TUI 模式给英文通知。

UI 属 `lib/task-browser/{command,component}.ts`，有界磁盘读取/层级投影属 reader.ts。扩展提供 command-time root/session key，不授予 runtime 执行权限。接口：readTasks(root) 返回 tasks/rows/diagnostics/complete；readCurrentTaskIdentity(root,key) 只解析 supplied pointer 的 canonical task directory，不打开 task record；readDocument(root,task,section) 支持 prd/design/implement，状态 ready/empty/missing/removed/error；TaskBrowser 的 render/handleInput/invalidate 管理一次交互。

## 列表与层级

- 仅展示 task store 直属非归档目录，包括仍未归档的 completed record；排除 canonical archive descendants，canonical alias 去重。先按目录名 lexical descending，再投影树：根与 sibling 保序，child 留 parent 下。同日名称确定性倒序，不推断 creation time/status 权重，MM-DD 不能区分年份。
- 当前 session task 所在**整个顶层树**置首，保 ancestor/sibling 顺序；坏/缺 current identity 不置顶。Refresh 先重排再按 canonical identity 恢复选择。坏/cyclic hierarchy 不使有效任务重复或丢失。
- Label 为净化目录 basename、` · `、原 title/name/id fallback，相同不重复。宽度先保 current marker/status，再分 tree prefix/directory/title；极窄会裁 directory，完整详情可滚动。Overview 明确 Name/Title/Path，header 标 Directory descending / Current tree first。
- 归档引用可见索引优先；未命中目录名或 `.trellis/tasks/<目录名>` 按 archive/YYYY-MM 查询，也支持精确归档路径与顶层归档 alias。只读相关候选、不递归加载 archive tree；归档 child 隐藏，归档 parent 的可见 child 留顶层。Canonical 去重，不同对象重名为歧义；合法隐藏引用无缺失 warning，真正缺失/损坏/越界有 diagnostic，不改 task record。

## 键位与呈现

| 动作 | 键位 |
| --- | --- |
| 列表选择/详情滚动 | Up/Down、PageUp/PageDown |
| 打开详情 | Enter |
| 切换 Overview/PRD/Design/Implement | Left/Right |
| 返回列表/关闭 | Esc |
| 明确重新读取 | r |

返回保列表位置，刷新保仍存在的 canonical selection，各 section 独立 scroll offset。ctx.mode 为 tui 时用 ctx.ui.custom 全终端 overlay，通过 supplied callback 完成；unsupported mode 无模型回合。英文应用 label 不翻译原任务/文档。

用宿主 Markdown/getMarkdownTheme；theme invalidation 清 colored cache，resize 重算 width/offset；按 identity/section/width 缓存到 explicit refresh/invalidation。先剥离不可信 terminal control，再加可信 style。图片保可读 source token、不破坏周围表格/list/heading/shared link definition；不执行 HTML/diagram，不 remote fetch。Parser 错误显示 warning 与完整可滚动 source，不能吞错变空文档。

## 文件与错误边界

路径复用 task-store containment，只有 top-level external store 例外；record/artifact 须在选中 canonical task directory。Pointer 通过 checkedPath 读 `.trellis/.runtime/sessions/<key>.json`，坏/不可读只无 current marker，不阻浏览；marker 只能属于有效 snapshot。

Record/pointer 最多 1 MiB，document 最多 2 MiB；验证 UTF-8/NUL、descriptor regular-file，final open nonblocking/no-follow，最多 limit+1 bytes。不是对并发祖先替换的 OS 沙箱。

| 状态 | 结果 |
| --- | --- |
| 有效空 store | No tasks found |
| 坏 JSON/UTF-8、缺 record、escaping symlink、不可读/special file | 有界 warning，complete=false，不冒充空项目 |
| Dangling archive | Incomplete diagnostic，不静默当缺 archive |
| 合法归档 parent/child 引用 | 无缺失警告，归档对象不展示 |
| 归档缺失/损坏/越界/不同对象重名 | Diagnostic；精确归档路径可消歧义 |
| 缺失/空文档 | Document not created / Document is empty |
| Task identity removed/replaced | Removed-task 提示，不跳到别的对象 |
| 超限/坏文档 | Error，不截断后报成功 |
| 长文档/Overview | 完整滚动，不把无界 rendered array 传给 variadic push |
| Markdown 抛错 | 英文 warning + 完整 plain source fallback |
| 坏 pointer/FIFO target | 不阻塞读 record，不伪造 current marker |

## 验证

Reader tests 覆盖 archive/alias/UTF-8/size/type/containment、倒序层级、label 和 document states。UI tests 覆盖 current-root promotion/ancestor、refresh identity、Name/Title/Path、长 identifier/doc end reachability、旧 command absence、真实 host peer 的 navigation/Markdown/fallback/Unicode 行列边界与英文 label。

Preservation 断言比较 fixture files、pointer、Git index 与 porcelain；浏览不能调 task/context CLI 或模型。Offline actual-host regular/fullscreen lifecycle 核 theme invalidation 和恢复 editor focus/text，不等于实际 PTY。Host preload 和 unpinned subprocess 见[质量规范](../.trellis/spec/extension/quality-guidelines.md)，真实终端见[tmux 指南](testing/tmux.md)。并行 resource failure 仍是失败 gate，须重跑才可接受。

实现长文档时避免 `lines.push(...renderedLines)` 的 argument-stack 风险，使用 concat 等有界调用。浏览不编辑、不切任务、不执行 lifecycle、不搜索归档内容，也不 fetch 图片。
