# RAGPro 文档索引

更新时间：2026-05-22

这份索引用来解决一个实际问题：`docs/` 里的文档比较多，时间跨度也不一样。以后先从这里找文档，不要在目录里盲翻。

## 首先阅读

| 文档 | 用途 |
| --- | --- |
| `../PROJECT_MAP.md` | 项目总览，先看这份 |
| `project-file-inventory.md` | 文件整理清单，解释每个目录该怎么看 |
| `local-startup-runbook.md` | 本地启动和依赖说明 |
| `project-owner-handbook.md` | 项目负责人管理规则草案 |
| `project-roadmap.md` | 路线图和风险清单 |

## 当前实现相关

| 文档 | 用途 |
| --- | --- |
| `current-code-structure-summary.md` | 早期代码结构整理 |
| `formalization-progress.md` | 正式化收敛过程记录 |
| `frontend-page-architecture.md` | 前端页面拆分规划 |
| `frontend-status-summary.md` | 前端当前状态总结 |
| `frontend-e2e-verification.md` | Playwright E2E 验证说明 |

部分旧文档在 Windows 终端里可能显示乱码，优先参考新写的中文入口文档和当前代码。

## 启动和运行

| 文档 | 用途 |
| --- | --- |
| `local-startup-runbook.md` | 本地启动主手册 |
| `milvus-feasibility-report.md` | Milvus 本机可行性记录 |
| `milvus-lite-wsl-setup.md` | WSL 中安装 Milvus Lite 的记录 |

## 项目分析和交接

| 文档 | 用途 |
| --- | --- |
| `rag-project-analysis.md` | 早期项目分析 |
| `planning-design.md` | RAG 问答系统规划设计 |
| `phase-one-status-summary.md` | 一期状态总结 |
| `main-thread-handoff-summary.md` | 主线程交接总结 |
| `new-thread-kickoff-brief.md` | 新线程启动摘要 |

这些文档保留历史上下文价值，但如果和当前代码冲突，以 `PROJECT_MAP.md` 和当前代码为准。

## 后续文档整理原则

- 新文档优先中文。
- 新文档标题要说明用途，不要只写“总结”“说明”。
- 老文档先不删除，等主线稳定后再统一归档。
- 如果文档和实际运行不一致，优先修文档。
- 上线相关信息优先写到 `PROJECT_MAP.md`、`local-startup-runbook.md`、`project-roadmap.md`。
