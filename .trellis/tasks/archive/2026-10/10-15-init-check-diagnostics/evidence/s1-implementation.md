# S1 实现交接（2026-10-15）

仅实现 S1 静态部分；未提交、未进行独立审查或任务整体验收。runtime/baseline/部署/spec/docs/extension 均未由实现者修改。父会话另负责 `extensions/trellis.ts` resolver 集成；最终测试包含当时父会话 extension bytes。

## 产品范围

- 新增 `lib/initialization/diagnostics.ts`：有限 descriptor 只读快照、分项状态、固定包清单/项目清单静态 provenance 投影、operation/lock envelope、现存相关配置文件、local developer/workspace index、own pointer/exact task.json、唯一英文限量报告。
- `lib/initialization/command.ts`：仅替换 Check 路径，保留原 `menuSnapshot()`、菜单、Help/Cancel/参数拒绝与写操作重新 inspect/plan/apply 的流程。Check 不调用 inspect/resourcePlan/adoptPlan/apply；前置已有菜单静态发现仍保持原行为。
- 新增 `tests/init-diagnostics.test.mjs`；更新 command/menu-safety 中旧资源清单/300 legacy 行断言，保持真实写确认、取消、计数/持久化回归。
- 不扫描任务、history、其他 session、PRD/JSONL/material，不读目标旧 pointer。只有明确 source 顶层 tasks store symlink 可在 exact task 范围读取；内部 task/record/session/config symlink 拒绝。

## 最终接口（与父会话约定相同）

```ts
registerInitCommand(pi, refresh, getDiagnosticScope?)
type GetDiagnosticScope =
  (ctx: ExtensionCommandContext, root: string) => {
    authorityRoot?: string;
    contextId?: string;
    sessionId?: string;
    isProjectTrusted?: boolean;
  };
collectDiagnostics({ cwd, ...scope }, { signal?: AbortSignal })
formatDiagnostics(result)
checkProject(cwd, optionalScope) // 原公开 helper 兼容；无 resolver 时 pointer blocked
```

command 在选择 Check 后安全发现 execution root 再调用 resolver。key 只接受 resolver 显式值，不调用 sessionManager、不读 key env、不复制 hash、不 fallback。resolver 缺失/抛错/坏 key 在已有项目报 pointer blocked；fresh 无任务检查为 skipped。source hint 跨 root 先 lexical 比较便 blocked，**不 stat/realpath/open source**；不能以 memo/marker 当 authority proof。managed marker 存在或 unsafe 时不能读取目标 local pointer。S2/S3 的 native identity transport 完成后才扩 source 读取。

## 信任/阶段限制

- packageSnapshot/manifestSnapshot 是有限静态诊断投影，**不是执行/写授权**；command 未消费其 facts 来提供写资格。原 engine publication/runtime validators 未变。S2 必须完成共享 strict provenance reader seam/worker，再运行任何项目代码；不能将当前 duplicate projection 当安全执行门禁。
- byte budgets：单文件 4 MiB、pointer/record 1 MiB、普通文本累计 8 MiB、固定清单累计 64 MiB、64 项、16 KiB 报告。hash 读取计费；nofollow/nonblock/fstat + UTF-8/NUL + metadata 复核。没有目录枚举。
- S1 仅同步 bounded reads/cooperative checkpoints；**没有硬 20 秒 deadline**、Python/Git probe、实际 YAML/effective config/runtime identity、worktree native proof、loaded host resources证明。报告始终明确 runtime blocked/effective/worktree skipped，不宣称 allHealthy。
- command 生命周期失效/重复异步 Check/发送前 scope 重验属于后续集成；本实现没有可存活 subprocess/异步 runtime run。未宣称用户 Esc 可取消 idle command。
- no-write 是本包/fixture 机制证据，不是 OS sandbox 或并发路径替换消除证明。

## 验证

环境：darwin，Node v24.14.1，Python 3.14.7，已有 Pi 1.2.0 peer；未安装。准确命令：

```bash
PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
 env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test \
 tests/init-diagnostics.test.mjs tests/init-command.test.mjs tests/init-menu-safety.test.mjs \
 tests/project-activation-host.test.mjs tests/initialization.test.mjs tests/adopt-project.test.mjs \
 tests/unsupported-runtime.test.mjs tests/project-activation.test.mjs tests/agent-context-integration.test.mjs
```

最终结果：**200/200，通过，exit 0**，日志 `s1-implement-final-tests.log`；`git diff --check` exit 0。没有运行全量 npm test 或单独 Python suite，不当作全任务 PASS。lint/typecheck 无脚本，NOT_AVAILABLE；真实 terminal/online/provider NOT_RUN。

首次失败保留：strip-only parameter-property 语法错误已修复；fixture canonical `/var` 与 `/private/var` ID/spy 路径、正常 task details formatter 断言修正后 85/85；后续 descriptor mock 未推进 fd 导致 metadata 长度失败，只修 mock advance 后 199/199。最后增加 fresh resolver/unsafe marker 边界，重新运行上述完整 focused 集合。日志保留 `s1-strip-syntax-initial-failure.log`、`s1-fixture-initial-failures.log`、`s1-descriptor-fixture-failure.log`。

新增负例覆盖独立 malformed manifest+config+pointer、missing/old/runtime hash/mode/role/docs、合法 empty lock/completed audit不重验旧 task、exact own no-task vs error/child key、外部 store与内部 redirect、invalid UTF-8/NUL/oversize/directory/FIFO/open后FIFO替换/permission、总 byte budget、packaged malformed baseline/drift、cross-root零 stat/read、zero subprocess/write与完整 bytes/modes/index/pointer快照、descriptor写flag spy、禁止材料/目录枚举、report omission/control/cancel。实际 initializer fixture 先正常建好支持 runtime 后才加 spy，未假造授权。

最终五个 owned 产品/测试文件与父 extension SHA-256 保存在 `s1-implement-final-hashes.json`。父会话须独立审查与确认最终 hashes/实际 diff 后再提交 S1；不代表 A1–A8 全完成。
