# S3 技能一致性收敛（2026-10-15）

## 状态与范围

本轮已完成并 **frozen**，可供主会话独立 review/full run。仅修改 10 份获批技能 Markdown 和 `resources/skill-baseline.json`；本报告为另行授权的 task evidence。不修改产品、测试、其他 owner 文件、部署副本、任务生命周期；无 commit/install/deploy/reload/provider probe。

完整读取本 task 的 prd/design/implement、空 implement.jsonl（实际 0 字节，未声称 manifest 验证通过）、所有待编辑 Markdown、meta local-architecture/overview、项目 workflow、development/testing/shared index。仓内 find 未发现名为 `approved-source-contract` 的文件；合同依据是已批准 design §4 与 PRD R1–R7，而非假称读过不存在文件。

## 修改摘要

- 7 份 generic 技能仅替换最后的根路径边界段落，正文/示例不变：主 `.trellis` source root；角色根据 verified authority 读取绝对 source 材料；代码/测试及其执行 cwd 在 executionRoot；禁止目标 fallback、复制/同步；路径派发不是全文注入，分页完整读取；路径/hash 不是实际阅读证明或写/lifecycle 授权。
- meta SKILL 区分 source `.trellis` 与 execution-project `.pi` / personal settings；支持 references 仍以 skill 目录解析。
- meta change-context-loading 删除旧预算/complete-injection provenance 要求，改为 native path-only/source bounds/diagnostics 与完整分页 read。
- meta hooks-and-settings 保留 journal/hooks 配置，澄清角色 native material bounds 不属于可配置 body-injection budget；不迁移 `.pi` 根。
- baseline 仅更新实际 modified skills 的 sha256，保留全部历史 metadata/sourceSha256/license。原 S3 owner 的 start/continue 字节未修改；统一 hash 检查包含这两份文件（当时 hash 已匹配）。

## 验证

平台 darwin；Node v24.14.1、Python 3.14.7。

1. `git diff --check -- skills resources/skill-baseline.json`：PASS，exit 0。
2. Python 精确检查七技能末段以前字节与 HEAD 一致、meta 全部引用链接存在、36 个 skill hashes 匹配且历史 metadata 与 HEAD 不变：PASS，exit 0。输出 `/tmp/pi-bg/bfkttelbj.log`。
3. `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=/Users/jyxc-dz-0101322/.pi/agent/install/releases/1.2.0/node_modules node --import ./tests/host-tui.mjs --test tests/skill-resources.test.mjs tests/manifest-provenance.test.mjs`：57/57 PASS，exit 0，输出 `/tmp/pi-bg/bnge10u4d.log`。

全量由主另行运行；本轮未运行 npm test。无 lint/typecheck scripts，未报告通过。fixture/SDK resource loader 检查不证明真实 agent 完整读过材料；本轮自检不是独立审查。

## Frozen 实际文件 SHA-256

下表包含本轮修改的 10 Markdown、baseline，以及原 S3 owner 已修改但本轮未编辑的 start/continue（只核 hash）。

| 文件 | SHA-256 |
| --- | --- |
| skills/trellis-before-dev/SKILL.md | 7a49e4e0d7845f5f453905742a1012b1610b65f8f1996fa0d113f485410c6d44 |
| skills/trellis-brainstorm/SKILL.md | 0056508eb8c9a1c9e0700c38e85dd04fc5f9fa70b97da15c9e27023c4864a10c |
| skills/trellis-break-loop/SKILL.md | f5bf6c2b4634cc7d80483f7e75258e4fdbf74ee8a4306eb798def574992fa17b |
| skills/trellis-check/SKILL.md | 7248819246fd37360326ebe302827e4efa6fc95929c7b04fc6a0a86e1ef9e0f0 |
| skills/trellis-continue/SKILL.md（未编辑） | 7a3f3123af6ddf8526c9cca4f672c1af6fcae5297bada699d5a200c113170948 |
| skills/trellis-finish-work/SKILL.md | c163d03ec992e566aab281adac60b8b4dcec88415189d6df4b99e42430afdefb |
| skills/trellis-meta/SKILL.md | efe22851f457474e04f271af3540b7bd342d6772cdb13cb5179e45f91fca4597 |
| skills/trellis-meta/references/customize-local/change-context-loading.md | 1a67c8e22885a6e3ca10d51c9a17b28fb54d465da01393c5faf83442bb95f444 |
| skills/trellis-meta/references/platform-files/hooks-and-settings.md | dcba25a93ba1cf90da2c3c6a4d8ea68c29dcda1a469e374f3ec7cd9ba97694e0 |
| skills/trellis-spec-bootstrap/SKILL.md | 99ede39fec9b4a1e3d34d652b5d7e1d8c3fff379bc48cc9c80c474048fddd555 |
| skills/trellis-start/SKILL.md（未编辑） | ce8948a12ff70d8e433d51e0bb2e2f30640a5ffc6784b3d6824f91f5cdfee4e1 |
| skills/trellis-update-spec/SKILL.md | d494d75b92f6cf86c719949609e68f8af8f55f0e76c4a38867a74e015a481ddd |
| resources/skill-baseline.json | d79305aeabe091608f7aca6b4238ae59a743c1887d873ab0705c9f9b90ea13f6 |
