# RAGPro 文件清理和归档计划

更新时间：2026-05-25

这份文档用于指导后续文件整理。当前策略是先标记、再验证、最后分批清理，不直接大规模移动或删除文件。

## 当前结论

项目真正混乱的来源主要有三类：

- 历史原型代码较多，尤其是 `packages/kbms-web`。
- 根目录存在少量来源不明或只服务本地的文件。
- 运行产物、Office 临时文件、测试产物需要继续保持忽略。

当前不建议马上移动 `packages/`，因为项目接近上线，路径变动容易影响测试、脚本和历史资料引用。

## 已确认不应提交的内容

| 类型 | 路径或模式 | 当前处理 |
| --- | --- | --- |
| Python 缓存 | `__pycache__/`、`*.pyc` | 已在 `.gitignore` |
| 本地虚拟环境 | `.venv/`、`venv/` | 已在 `.gitignore` |
| Node 依赖 | `node_modules/` | 已在 `.gitignore` |
| 日志 | `logs/`、`*.log` | 已在 `.gitignore` |
| 临时材料 | `tmp/` | 已在 `.gitignore` |
| 运行数据 | `runtime/uploads/`、`runtime/*.log`、`runtime/*.pid` | 已在 `.gitignore` |
| 本地向量库 | `runtime/local_vector_store.pkl` | 已在 `.gitignore` |
| 模型权重 | `packages/models/` | 已在 `.gitignore` |
| 前端测试产物 | `playwright-report/`、`test-results/` | 已在 `.gitignore` |
| Office 临时文件 | `~$*` | 已在 `.gitignore` |

## 需要确认后再清理的候选项

| 路径 | 当前状态 | 建议动作 |
| --- | --- | --- |
| `1.3.3` | 根目录空文件，已被 Git 跟踪 | 确认无用途后删除 |
| `packages/kbms-web/` | 旧 Vue2 KBMS 前端参考，占用大量文件 | 保留参考，后续可移动到归档区或拆成独立参考仓库 |
| `packages/a_tools_intro/` | 早期工具连通性实验 | 保留到上线后，再考虑归档 |
| `packages/b_traditional_qa/` | 传统 FAQ 原型 | 保留为历史参考 |
| `packages/c_modular_rag/` | 模块化 RAG 原型 | 保留为迁移参考 |
| `packages/d_multi_layer_rag/` | 多层 RAG 原型 | 保留为迁移参考 |
| `基于RAG的问答系统/` | 流程图、界面图、设计图 | 保留为客户讲解和设计参考 |

## 建议的清理顺序

### 第一阶段：只做标记和说明

当前阶段。目标是让维护者知道哪些是主线、哪些是参考、哪些是运行产物。

已完成：

- 中文化 `README.md` 和 `PROJECT_MAP.md`。
- 增加 `docs/README.md` 文档索引。
- 增加 `apps/`、`src/ragpro/`、`packages/`、`tests/`、`scripts/` 目录说明。
- 增加 `.gitattributes`，标明文本和二进制文件处理规则。

### 第二阶段：删除低风险无用项

前提：

- `git status` 干净。
- 全量测试或至少核心测试通过。
- 确认删除项没有被代码、脚本、文档引用。

优先候选：

- 根目录空文件 `1.3.3`。
- 未跟踪的 Office 临时文件。
- 本地缓存和测试产物。

### 第三阶段：历史参考区归档

前提：

- 上线阻塞项已处理。
- 客户演示和使用文档已稳定。
- 主线测试和 E2E 通过。

可选方案：

- 方案 A：保持原目录，只在 README 中持续标记为参考区。
- 方案 B：移动到 `packages/_archive/`，但需要同步更新所有文档引用。
- 方案 C：拆成单独参考仓库，主仓库只保留必要截图和设计说明。

当前建议：先采用方案 A。等上线稳定后，再评估方案 B 或 C。

## 不建议现在做的事

- 不建议现在大规模移动 `packages/`。
- 不建议删除 `packages/data/`。
- 不建议删除 `runtime/uploads/` 里的本地上传数据。
- 不建议把旧 Vue2 前端直接混入当前 `apps/web/`。
- 不建议为了目录好看而改启动脚本路径。

## 后续检查命令

查看工作区是否干净：

```powershell
git status --short --branch
```

查看已跟踪文件分布：

```powershell
git -c core.quotePath=false ls-files | ForEach-Object { ($_ -split '/')[0] } | Group-Object | Sort-Object Count -Descending | Select-Object Name,Count
```

查看被 Git 跟踪的潜在缓存或运行产物：

```powershell
git -c core.quotePath=false ls-files | Where-Object { $_ -match '(^|/)(__pycache__)(/|$)|\.pyc$|^runtime/|^logs/|^tmp/|^test-results/|^packages/models/' }
```
