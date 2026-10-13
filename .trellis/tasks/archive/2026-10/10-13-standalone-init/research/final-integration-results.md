# 初始化最终门禁收敛

独立复查 ca6d8e11 验证已有session/runPython/operation/resource修复有效，但确认invokesRuntime对绝对路径env wrapper遗漏。主会话将wrapper识别统一basename，补入/usr/bin/env、带-u、带引号路径、/usr/bin/nohup回归，覆盖bash/bash_bg/monitor及全部异常manifest状态。不扩大为任意shell sandbox。

修正后全量241/241，fail0、自然退出；env -u TRELLIS_CONTEXT_ID、实际Pi host preload、Python无bytecode。原始日志/tmp/pi-bg/bupfboyga.log。task validate及git diff --check通过。已有独立engine/resources审查和最终guard审查保留，未把修复前241绿当作缺陷不存在的证据。

本子任务产品实现和检查已完成；尚未做本仓库脚本接管/.agents删除/真实插件安装/真实交互TUI/provider。下一步先提交init，再按统一授权执行migration。支持命令识别为有限已知runtime边界，无法视为任意用户shell隔离。
