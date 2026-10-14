# 独立审查修复说明

初审 032c210f 确认 F1–F4，阶段未接受/未提交。main 已修：

- F1：source callback/shutdown 的 read-compare-write 使用与 dispatch/create 的相同 source lock。锁占用时将更新按 request 排队，单 unref timer 重试；dispatch 锁内 drain，不嵌套取锁。重新读 request 后发布，旧终态不能覆盖新 request。managed v1不改。
- F2：首次 task query取得可信 identity后按已有 agentId消费早到terminal缓存；成功stop本身仍不是终态。
- F3：已验证的 agent->task 直接lookup；一般目录discovery隔离坏neighbor并最多8条console诊断，坏任务直接读仍报错。
- F4：Python source record字符串长度采用UTF16 units（surrogatepass），同TS；保留source原hash、修改output/release。

新增 deterministic lock contention terminal/new reservation、shutdown/new reservation；cached terminal-before-stop+corruptneighbor；astral/escaped surrogate双方边界。focused b3ebdhbwg34/34绿，Python18/18绿。full bk255dhqq运行中；独立复核8ceddce7-d07b-4a8只读运行中。

source callback从旧设计无锁发布改为source-only条件序列化是F1必需协议修正，不改变并发产品行为：不同任务child仍可同时运行，锁仅短期记录/预留，不成为目录运行期独占。
