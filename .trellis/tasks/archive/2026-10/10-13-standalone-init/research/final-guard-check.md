# unsupported-runtime 最终只读复核

## 结论

**原先 `session()` 忽略 `verifyRuntime()` 的返回值已修复；但已知命令识别仍有一个阻塞，不能宣称全部未知运行时执行门禁验收通过。** 本次没有改产品、测试、runtime、项目生命周期或 Git index；仅写本报告。初始化和生命周期测试均在可清理临时 fixture 中，未初始化本仓库、安装/reload 插件或删除 `.agents`。

## 已核验的修复

完整读取子任务 PRD/design/implement、前 checker 三份报告及本轮 fix 报告，完整读取 extension、engine、command、runtime fixture、unsupported tests、integration/display/protocol/provider/runtime tests；对照 HEAD 的相关 diff，并沿 dispatch/query 追到 Python `query(ready=False)` 与 `validate_context`。

- `extensions/trellis.ts:170,258,770`：`requireRuntime()` 必须取得非空成功 manifest；`session()` 与 `runPython()` 执行边界均调用，脚本存在不再构成许可。不存在、JSON 损坏、条目缺失、发行/来源/hash/mode 错配、未完成 operation 都不能进入 task/context Python 或 child binding。
- `session_start` 无授权时返回并清显示；`before_agent_start` 在读取 sections、dispatch facts、绑定 child 之前验证，输出 `Status: task_error`，不输出 `No active task`、成功 overview 或 workflow。
- `/trellis-init` 注册在运行时门禁之前；新项目 help/check 与无 UI 状态可用，无脚本时不自动修复。普通 read/search、Git status、非 runtime Python、Explore、WebSocket monitor 保持可用、不加 context export。
- supported 路径仍按 root/key 隔离并保留 child 独立 key、真实绑定/finish、重复 header 不复活、foreign/missing/stale/error CLI provenance 拒绝、材料 fallback、定制 agent 不覆盖。
- `session_shutdown` 不再调用需授权的 `session()`。额外 temporary 真 handler 探针先缓存 supported child，损坏 manifest 后确认新 sections 为空且 task_error；shutdown、恢复原 manifest、删除临时 child pointer 后，同 header 能重新真实绑定，说明 binding memo 已释放。未宣称所有 TTL/error-dedup module cache 都被清空。init refresh 回调清 context/task/errors/workflow/sections/state，command 的 reload 为终止步骤；菜单测试中的 refresh spy 不代替该生产回调的静态核验。
- engine 原 checker 修复仍在：精确 manifest 字段/32 runtime + 3 role + 8 editable-template provenance；原 bytes/mode 与受管路径检查；operation plan/action/guard schema 及 canonical 输出重建，而不是把重算 planHash 当授权；non-root 不允许覆盖已有文件；root 只 append canonical block；identity 恢复先核 supported manifest；manifest 最后发布且完成前复核必需输出。
- dispatch 首次包内只读 query 不执行项目 task/context 脚本；source verify 在 provider ping/spawn 之前。ready query 先用非 ready 查询解析 binding、验证 target manifest，再执行 target current；重复 locked/final query 仍走该验证。

## 剩余阻塞：绝对路径 env 前缀未识别

位置：`extensions/trellis.ts:179-210`，尤其 wrapper 消费循环使用原 token 与 `env/command/exec/...` 比较，未按 basename 归一化。之后只对真正 executable 用 basename，因此 `/usr/bin/env` 不被剥离，也不递归检查其 Python argv。

本次只调用真实 `tool_call` handler，不执行这些命令；临时 root 仅有 `.trellis/`、没有 supported manifest。观察结果：

```text
env python3 .trellis/scripts/task.py finish                           blocked=true
/usr/bin/env python3 .trellis/scripts/task.py finish                  blocked=false
/usr/bin/env -u TRELLIS_CONTEXT_ID python3 .trellis/scripts/get_context.py --json
                                                                     blocked=false
bash -c "python3 .trellis/scripts/task.py finish"                      blocked=true
cat .trellis/scripts/task.py                                         blocked=false
```

两条 `/usr/bin/env` 命令均返回 `undefined`，input 未修改，宿主会继续启动命令。这不是动态拼接或任意 shell 沙箱要求，而是已有支持清单中 env 前缀的常规绝对路径写法；典型 shebang 解释器路径也使用 `/usr/bin/env`。现有绿测仅覆盖裸 `env`，未覆盖此输入。另观察到 `python3 -m task finish` 未识别；在显式配置项目 scripts 的 PYTHONPATH 后它同样可执行 task 模块，建议一并明确模块路由范围，不据此要求通用 shell 解释器。

建议主会话决定最小修正：对已认可 wrappers 归一化 executable 名、补上述三个 command tools 的负测，保持普通文件读取可用；不要增加 legacy bypass 或重写整个命令解释器。本 verifier 未自行修复。

## 测试真实性与实际结果

`tests/runtime-fixture.mjs` 经真正 `plan/apply/verifyRuntime` 发布完整 runtime/manifest；计数 fixture 仅删除 bootstrap task，不伪造脚本 hash。`mockPython` 在宿主 `child_process.execFile` 边界、按 root 匹配，`syncBuiltinESMExports` 使真实 extension import 接受 mock，结束后 restore；不 mock `verifyRuntime`、不篡改产品 guard。

unsupported suite 的 mock callback 只记录调用并返回 undefined，所以若生产 guard 失效仍落到原 execFile：同时以零调用、无恶意 marker、无 child pointer、无成功 state/sections 验证，而非阻止恶意脚本执行后冒称安全。CLI provenance/failure 的回包 mock 则在 supported 真 runtime 上运行，不能使不受支持 manifest 获授权。provider fixture 已改真实发行，但 optional provider probe 不在 npm test 内，本次未执行。

全部 Node 命令使用：

```bash
env -u TRELLIS_CONTEXT_ID \
  PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules \
  <下列命令>
```

- focused：`node --import ./tests/host-tui.mjs --test tests/unsupported-runtime.test.mjs tests/init-review.test.mjs tests/initialization.test.mjs tests/init-command.test.mjs tests/agent-context-integration.test.mjs tests/task-display.test.mjs tests/worktree-protocol.test.mjs tests/runtime-contracts.test.mjs`：**125/125，0 fail/skip，92.15s**。日志 `/tmp/pi-bg/bk4t5v6u2.log`。
- full：`npm test`：**241/241，0 fail/skip，148.25s**。日志 `/tmp/pi-bg/b3gi82ds7.log`。
- 额外 supported→unsupported→shutdown→repair 真 handler 探针：**1/1**；命令识别探针如上，揭示当前 suite 外的缺口。
- `git diff --check`：通过，仅检查。Node v24.14.1 / Python 3.14.7 / macOS，实际 Pi 1.2.0 peer。

没有 lint/typecheck 脚本，未冒称静态类型检查；未做真实视觉 TUI、provider/model、用户项目 deployment/init/installation/reload 或跨平台验证。运行时 guard 不被描述为 OS sandbox、第三方 provider 全局阻断或消除祖先路径竞态。现有 owning specs 的旧 session/installer 文案仍需主会话按新契约同步；本次未改 spec 或勾选全部验收。
