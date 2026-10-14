# 最终验收与收尾授权

用户授权真实验收（可用 tmux）并要求通过后归档收尾。main 已读取 live-validation report/final.json/cleanup-audit，核对两任务同 cwd 同时 running、真实 provider stop 与 failed terminal、next dispatch、父 pointer 字节不变和真实 spawn payload。10/10通过；使用真实SDK/loader/agent-tasks + offline faux，未CLI/tmux/在线模型。

main 独立重核记录PID84840/86902/91682与workspace均gone；当前产品hash与验收一致，唯一后续改动是可选harness临时目录realpath修正。原harness /var与/private/var断言失败为fixture问题，main新增realpathSync，原命令bidq87vj8自然exit0，全harness通过（包括统一source tool真实write/result）。无运行逻辑改动。

最终默认suite408/408和两轮独立审查沿用有效证据，harness修改不进入默认glob；已单独真实执行验证。保留首次失败及修正driver evidence，不将首次失败改称成功。无安装/个人settings修改/reload/push，临时环境全部清理。source unknown不自动恢复限制保留。

接受全部AC，授权归档本任务（main/base main，非PR-backed，使用显式skip-branch-validation），配置默认生命周期autocommit，之后只记录本会话journal。并行runtime-tool-names任务保留。两个产品checkpoint4cbeadc/c909dcc，额外fixture+验证证据checkpoint另记。
