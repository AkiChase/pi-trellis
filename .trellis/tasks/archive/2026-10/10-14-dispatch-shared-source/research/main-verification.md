# 主会话验证记录

## 阶段 1（提交前）

环境：Node v24.14.1；host peer 使用已安装 `/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`。测试 subprocess 使用 `env -u TRELLIS_CONTEXT_ID`，未修改主 host pin。

- `PI_TRELLIS_TEST_HOST=<上述路径> env -u TRELLIS_CONTEXT_ID npm test`：稳定输入 bh59uslra **390/390 PASS**。此后只新增 timeout/malformed-record 断言和删除 unused import。
- `PI_TRELLIS_TEST_HOST=<上述路径> env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/dispatch.test.mjs tests/source-executions.test.mjs tests/runtime-contracts.test.mjs tests/worktree-cli.test.mjs tests/worktree-protocol.test.mjs`：bhtk2qyji **71/71 PASS**，覆盖最后的 source malformed-record、实际15秒RPC等待timeout、锁内路由改变、跨 host stop/terminal。
- `PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s tests/python`：beh2dfo5h **18/18 PASS**。
- 最终阶段 1 完整 suite bqqykrbk7：**392/392 PASS**，覆盖全部最后新增用例和当前代码，无测试期间产品编辑。
- 审查修复后的完整 suite bk255dhqq：**407/407 PASS**；此数量包含并行 viewer archived-links 测试增加，不归为本任务新增覆盖。之后 source diagnostic 单测 **4/4 PASS**，产品未再编辑。
- `git diff --check`：PASS；包 `runtimeBaseline()` digest/release 自检 PASS。

保留初始失败：bv2qgee4g 缺 host peer；bs7jm7njw 校验顺序改变导致 fixture 未恢复 role definition；b849ceui3 原生 source 字节等同断言需区分 modified outputs；bl5pf669q 测试执行期间改了 runtime/manifest，临时 hash 不一致。均不算最终成功；修正 fixture/原始来源保留及稳定输入后以上绿。

尚未运行 real provider harness、在线模型或真实 CLI交互。默认测试为 fake Pi bus + disposable real Python/Git runtime，不能称在线 provider验收。无 lint/typecheck script，direct TS不是静态检查。独立审查仍需核对报告并处理 verified findings 后才提交。
