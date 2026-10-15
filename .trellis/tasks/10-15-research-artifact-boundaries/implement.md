# 实施计划

## 状态与执行边界

in_progress；用户已明确授权开始实施。主会话直接修改并自检，随后独立审查，检查通过后按 workflow 做 scoped local commit。用户明确历史任务无需清理；已激活本会话任务，未操作其他会话绑定。

## S1：完整材料契约与格式边界

改动规模适合一个耦合阶段：workflow/roles/check skill 与 collect/test/provenance 必须保持一致，不把未实现的格式规则提前称为完成。

- [x] 读完整相关 owners/callers/tests，以及 development/testing/guides；确认最新并行变化。
- [x] 验证角色生成与资源发布来源，明确实际本项目资源更新方式。
- [x] 更新 workflow 模板与本项目材料契约，保持已有用户定制。
- [x] 更新角色生成器、角色输出、baseline 与适用本地角色；禁止覆盖自定义冲突。
- [x] 更新 check skill 材料检查项。
- [x] 在 collect 区分 research Markdown 与 evidence 现有文本白名单。
- [x] 补 Python 资格矩阵、collect 预览/显式拒绝/evidence 成功、历史读取与未选文件保留回归。
- [x] 更新必要 provenance，核对代码与资源耦合；不手改部署 runtime。
- [x] 主会话审实际 diff、自检，然后独立 review 集中检查公开 collect 兼容性、资源一致性和历史保留。实施可主会话直接执行，独立 review 前才准备 check.jsonl；implement.jsonl 有意空，不为仪式派发。
- [x] 最终相关测试通过且独立审查完成后，由主会话按 workflow 做 scoped stage commit（用户未限制本任务 scoped local commit）。

## 验证计划

在实施环境确认 commands 与 host 路径后运行，不安装依赖：

```bash
python3 -B -m unittest discover -s tests/python -p 'test_*.py'
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/material-sync.test.mjs tests/agent-documents.test.mjs tests/trellis-patches.test.mjs tests/manifest-provenance.test.mjs tests/initialization.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

生成器的 check 命令与 runtime provenance 更新命令须先读现有实现/help 再运行，不能猜参数。需要现有 Pi host 时仅设置测试子进程 `PI_TRELLIS_TEST_HOST`。Python collect 相关用例必须包含每种 research 拒绝格式与 evidence 成功格式，保留既有敏感名/UTF-8/NUL/路径/别名/冲突/依赖测试。

未执行的检查不得写 PASS；本次不改变 UI，不要求真实 PTY 验收，不主动运行在线 provider。

## 最终检查

- [x] A1–A6 逐项核对。
- [x] 模板、本地规则、角色生成结果与 check skill 用词一致。
- [x] 只读兼容性不被 collect 格式收紧连带改变。
- [x] 历史任务及其他任务文件未修改；不生成 research 中的实施/审查报告。
- [x] 如保留本任务报告，写 evidence 并在本文件链接；短结果直接记录本文件。
- [x] 报告当前 commit、检查、资源状态及限制，不安装/重载/push/归档。

## 阶段结果

S1 实施、自检与独立审查完成。Python20/20、聚焦126/126、最终全量446/446；首次全量445/446为check skill哈希遗漏，补齐后重跑。独立审查发现tmux现行规范冲突，已修复并复核无blocker。详细命令、首次失败与本地资源发布记录见 [验证记录](evidence/implementation-verification.md)。

本项目资源已通过支持的 guarded update 同步，当前包源码核验正常；已安装旧版插件仍可能拒绝部分Trellis命令，不绕过校验，不安装/同步已安装包/重载。历史归档任务指纹保持；其他会话planning改动不纳入提交。unused implement.jsonl保持空，不称task validate全通过。准备提交本阶段，任务保持in_progress等待用户收尾授权。
