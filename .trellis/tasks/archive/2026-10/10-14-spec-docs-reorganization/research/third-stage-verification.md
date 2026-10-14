# 第三阶段：删除独立来源页面

## 用户授权
用户确认删除 docs/runtime-baseline.md 与 docs/trellis-agent-sync.md，合并角色职责/定制至 dispatch，清 current links；进一步明确允许改锁定角色产物和 hash。主直接实施、自检、追加本地阶段提交。不发布部署副本、安装、个人 sync/reload、push 或生命周期收尾。

## 差异与自检
- 删除两独立来源页；docs 现为 initialization/dispatch/worktree/task-viewer/task-display 与 index。README 只保必要许可/来源概览和 resource manifest 链接，不再导向来源页。
- 来源数据保 resources；原 artifact integrity 移到开发 testing 方法，不丢核验依据。
- 三 bundled 角色与 scripts/sync-agents.mjs 仅注释引用从旧 docs 页改为 README.md#license；逐字差异比较证明角色协议/正文未改，source hash 保持原值，三个 adapted hash 按真实 bytes 更新。未改部署副本/配置/workflow/runtime/template/skill hash。
- 来源测试由检查用户文档版本改为实际 baseline version/platform、三个角色来源/AGPL声明、新许可引用及旧引用不存在；原产物 hash/工具/职责/漂移断言全部保留，不削弱安全检查。
- 14 Markdown/52 local links/anchors、whitespace、旧引用搜索、packages development/testing PASS。角色原 source hash 与新 adapted bytes/hash 一致 PASS。

## 命令证据
全部测试使用 subprocess-only `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules`，不安装依赖。
- `node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs tests/initialization.test.mjs tests/manifest-provenance.test.mjs tests/workflow-policy.test.mjs tests/worktree-protocol.test.mjs`：90/90 PASS，自然0，日志 /tmp/pi-bg/bdas6tivd.log。执行开始后追加两个来源断言，由下列最终回归与 full 覆盖。
- `node --import ./tests/host-tui.mjs --test tests/agent-documents.test.mjs`：最终断言8/8 PASS，自然0，日志 /tmp/pi-bg/bdejbnjme.log。
- `npm test`：408/408 PASS，自然退出0，138.849s，日志 /tmp/pi-bg/b1twxlxol.log。

主自检不是独立review。无lint/typecheck scripts；来源 regeneration/--check、真实tmux/provider、平台矩阵、安装/reload/deployment/push/归档均NOT_RUN。两 unused manifest 仍空，前阶段validate诊断不变，不称完整taskvalidation PASS。
