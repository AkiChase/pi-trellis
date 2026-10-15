# 单阶段实施计划（待用户审阅）

## 授权

目前用户已审阅并批准“开始执行”，任务in_progress。实施限定下列六文件；本task规划记录之外的 `.trellis` 项目规则禁止直接修改，未对当前项目apply。直接实施使用 --allow-empty-context（未派发implement，独立审查为普通只读Agent），空JSONL不冒充完整role manifest验证。

## S1：三文件留存契约与配套（单完整检查点）

- [x] 读完整三规则owner及已有tests/baseline，确认原授权和phase结构。
- [x] 修改 `resources/templates/workflow.md`：仓库外自有临时目录、材料分类、诊断期间保留、交接临时路径、主会话精选、最终自足记录和提交前留存审查。
- [x] 修改 `skills/trellis-check/SKILL.md`：是否值得入仓优先于放置位置，保留失败事实与复测，不强制独立报告。
- [x] 修改 `skills/trellis-finish-work/SKILL.md`：最小集合、活动进程/归属/授权核验、自有临时目录清理及残余报告。
- [x] 仅在 `tests/workflow-policy.test.mjs` 补一组契约回归，不改其他test源文件。
- [x] 仅更新 template-baseline 的workflow输出hash及skill-baseline的check/finish输出hash；其余指纹/来源/许可不变。
- [x] 主直接实施，独立只读review认可三文件契约与权限边界；提出低优先级测试补强，已增加正向“仅本次自有目录/主核验后”清理断言，非合同换行改为空白容忍。review无文件写入或报告附件。
- [x] 主核最终diff及检查结果，提交 `8fce55f`：六个发布文件加六个本任务记录（空role JSONL按直接执行策略），不含原始日志、其他项目规则或并行修改。

## 精确产品白名单

1. resources/templates/workflow.md
2. skills/trellis-check/SKILL.md
3. skills/trellis-finish-work/SKILL.md
4. tests/workflow-policy.test.mjs
5. resources/template-baseline.json
6. resources/skill-baseline.json

不修改agents、lib/task-context、其他skills、project .trellis规则、.pi/agents、runtime、config/ignore、用户docs；不新建spec或工具。不要为测试意外失败擅自扩大白名单。

## 验证计划

执行前创建仓库外mktemp运行目录，stdout/stderr放其中；失败诊断和复测期间保留，主核完后只记录下列最终结果到本文件。现有依赖缺失可用已有PI_TRELLIS_TEST_HOST子进程环境，不安装。

```bash
env -u TRELLIS_CONTEXT_ID node --import ./tests/host-tui.mjs --test tests/workflow-policy.test.mjs tests/agent-documents.test.mjs tests/skill-resources.test.mjs tests/manifest-provenance.test.mjs tests/apply-template.test.mjs
env -u TRELLIS_CONTEXT_ID npm test
git diff --check
```

现有phase parser、scope/授权、资源完整性和apply自定义保护继续通过。核对仅三个指定输出hash变化，其余baseline条目不动。无lint/typecheck脚本时记录UNAVAILABLE，文本合同检查不冒充真实Agent遵从。

## 验证记录

Node v24.14.1 / 已有Pi1.2.0。子进程 `env -u TRELLIS_CONTEXT_ID PI_TRELLIS_TEST_HOST=<existing installed Pi node_modules>`，未安装依赖。

- 首轮focused85/85、全量545/545，均自然exit0；主读取完整结果汇总，无失败/skip。
- 独立只读审查 `c6702886-9866-400` 认可六文件方案；低优先级发现为测试缺正向清理限制断言，不是规则漏洞。主已修测试，相关focused最终复跑85/85，自然exit0，无fail/skip。三个规则文件与baseline未变，全量结果仍覆盖这些最终规则；最终测试补强由affected focused验证。
- 主核实际六文件diff与baseline：只workflow/check/finish三个输出hash变化，source hashes/origin/license及其他条目保持不变。
- 原始日志只在本次仓库外系统临时目录，未加入task/evidence/research。完成核验和确认测试进程结束后清理，最终结论保留于此，不将临时路径作为长期验收依据。
- 无lint/typecheck脚本，UNAVAILABLE；文本契约与fixture检查不证明所有Agent遵从。当前项目apply、真实终端、在线模型均未执行。

## 最终记录与清理

最终摘要记实际环境/命令/退出/失败及复测关系/未运行范围，不永久链接会删除的临时输出。确认测试进程结束、材料已核验且目录是本次自有后清理；仍需诊断或清理受阻就报告保留原因和位置。只读review无需单独持久化报告；必要发现整合这里。

用户已验收并授权“收尾”。stage `8fce55f` 保持不变；按授权归档本任务、清除本会话绑定并记录简明journal，不执行push/当前项目apply。测试进程及独立review均终态，原始日志已核验；本次自有仓库外临时目录已清理，未产生持久化报告附件。
