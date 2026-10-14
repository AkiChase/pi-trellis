# tmux 真实验收与用户级迁移

用户批准真实tmux验收，并在通过后授权用户级安装、移除本仓库和邻仓my-pi-preset的项目级pi-trellis安装、必要资源更新、提交与任务收尾。未授权push。

## 终端证据

现有Pi1.2.0/tmux3.6a，独立server trellis-activation-58e584，临时HOME/agent/project，offline、无个人认证和在线模型；fullscreen dark 100×32。capture-pane文本证据在同目录tmux/*.txt，不是图像截图。

PASS：fresh自动完成仅init无常驻显示；取消init无.trellis写入；真实原生确认初始化后reload，10skills、viewer、widget计数1出现；viewer实际Enter详情/Esc返回/Esc关闭，FOCUS-RESTORED在编辑器出现；删除fixture task.py后reload诊断并撤回skills/viewer、清两显示surface。Ctrl+D正常退出，tmuxserver已自动退出，ps核无ownedCLI残留。

驱动失败保留：初次等待'pi v'实际只有v1.2.0；第二次Esc后未先等待overlay消失导致focus检查超时。修状态等待后单独重验通过，不改产品代码。未真实dispatch/provider/在线模型、物理IME、resize/frame或全主题矩阵，SDK tool注册证据来自已完成测试。

## 用户级安装

pi install /Users/jyxc-dz-0101322/tools/pi-trellis --approve，Pi记录用户settings中的../../tools/pi-trellis（相对agentDir），canonical指向当前已验收checkout，不是未推送远端旧版本。pi remove -l git:github.com/AkiChase/pi-trellis分别在两项目执行，两边packages空且useradapterConfigured为true。

新模块校验发现两现有manifest旧agent hashes，邻仓还旧runtime release。resourcePlan(update)无conflict：本仓仅3agent，邻仓2runtime+3agent+未定制workflow。原生applyResourcePlan更新并保留旧文件快照/tmp/trellis-user-migration-backup；两边verifyRuntime通过。项目任务/日志/规范/身份不重建。此前旧会话仍loaded已删本地package路径导致ENOENT；用户reload后恢复，不手改hash绕过校验。

## 数据与并行范围

两项目移除安装声明前后非runtime .trellis文件fingerprint一致；之后只变预览中的托管资源及manifest。当前仓runtime/workflow/manifest既有dirty、README改写和runtime-tool-names不纳本任务；manifest只暂存本次agent3hash，不提交并行hash/provenance。邻仓规范整理/README/其他task保留，提交仅pi settings、3agent、2托管runtime、workflow及manifest。
