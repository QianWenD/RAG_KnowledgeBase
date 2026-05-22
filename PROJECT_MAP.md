# RAGPro 项目总览

更新时间：2026-05-22

这份文档是项目接管时的总地图，用来回答三个问题：

- 现在真正跑在线上的主线代码在哪里。
- 哪些目录只是历史参考、实验代码或运行产物。
- 后续维护、修复、上线检查应该优先看哪里。

## 项目定位

RAGPro 是一个中文 RAG 问答和知识库运维系统。当前形态不是单纯的算法 demo，而是已经具备后台管理、权限、知识上传、重建索引、问答和审计能力的本地产品原型。

当前核心能力：

- FastAPI 同时提供后端接口和静态前端页面。
- 问答流程先走 FAQ 精确/近似匹配，再走 RAG 检索增强生成。
- 向量检索优先使用 Milvus、BGE-M3、reranker。
- 本地兜底向量库使用 `runtime/local_vector_store.pkl`。
- 已有登录注册、会话、用户管理、知识源权限、组织和菜单角色、审计日志。
- 已有文档上传、批量上传、索引重建、知识源查询和前端 E2E 测试。

## 主线目录

以后新增正式功能，优先放在这些目录里：

| 路径 | 作用 | 状态 |
| --- | --- | --- |
| `apps/api/main.py` | FastAPI 应用入口、页面路由、接口路由、权限守卫、问答编排 | 主线 |
| `apps/web/` | 当前产品前端，原生 HTML/CSS/JS，由 FastAPI 挂载为静态资源 | 主线 |
| `apps/worker/` | 离线任务，包括 FAQ 导入、文档索引、评测脚本 | 主线 |
| `src/ragpro/` | 正式 Python 包，承载认证、检索、生成、上传、评测等核心模块 | 主线 |
| `tests/` | Python 单测、API 测试、Playwright E2E 测试 | 主线 |
| `scripts/` | 本地启动、Milvus 启停、环境检查脚本 | 主线 |
| `docs/` | 设计、启动、交接、验证和管理文档 | 主线文档 |
| `packages/data/` | FAQ、默认知识文档、评测数据、OCR 示例 | 数据资产 |

## Python 模块说明

| 模块 | 作用 |
| --- | --- |
| `src/ragpro/auth` | 用户、会话、权限、组织、菜单角色、审计日志 |
| `src/ragpro/config` | 配置读取和日志配置 |
| `src/ragpro/conversation` | 问答会话和历史记录 |
| `src/ragpro/evaluation` | 评测数据、评测执行、指标统计 |
| `src/ragpro/faq_match` | FAQ 数据库、Redis 缓存、FAQ 匹配服务 |
| `src/ragpro/generation` | Prompt、Ollama 调用、答案生成 |
| `src/ragpro/ingestion` | 文档加载、切分、上传保存、上传任务 |
| `src/ragpro/retrieval` | Milvus 和本地向量库检索 |
| `src/ragpro/routing` | 意图识别、检索策略选择、调试信息 |
| `src/ragpro/runtime` | 健康检查和诊断 |

## API 和页面入口

主要页面：

- `/`
- `/login`
- `/register`
- `/qa`
- `/knowledge`
- `/knowledge/reindex`
- `/knowledge/sources`
- `/users`
- `/users/access`
- `/users/org`
- `/users/security`
- `/users/audit`

主要接口：

- `/health`
- `/diagnostics`
- `/auth/*`
- `/sessions`
- `/sources`
- `/faq/query`
- `/documents/upload`
- `/documents/batch-upload`
- `/documents/upload-jobs/{job_id}`
- `/documents/batch-upload-jobs/{batch_id}`
- `/reindex`
- `/query`

## 运行依赖

本地依赖：

- MySQL：FAQ、用户、会话、权限、审计、对话历史。
- Redis：FAQ 缓存。
- Milvus：主要向量库。
- WSL Ubuntu：当前本地 Milvus 运行环境。
- Ollama：本地大模型生成后端。

依赖文件：

- `requirements.txt`：基础 Python 依赖。
- `requirements-rag.txt`：RAG、文档解析、向量相关依赖。
- `package.json`：根目录只用于 Playwright 测试。

## 数据和运行产物

应该纳入维护视野的数据：

- `packages/data/JP学科知识问答.csv`：FAQ 导入数据。
- `packages/data/ai_data/`：默认知识文档。
- `packages/data/evaluation/`：评测数据集。
- `packages/data/ocr_samples/`：OCR 和文档解析样例。
- `packages/data/classify_data/`：分类和规则参考数据。

不应该提交到 Git 的本地运行产物：

- `packages/models/`：本地模型权重。
- `runtime/uploads/`：用户上传文档。
- `runtime/local_vector_store.pkl`：本地兜底向量库。
- `runtime/evaluation/*.report.json`：评测报告。
- `logs/`：运行日志。
- `tmp/`：临时文件和性能测试材料。
- `test-results/`：Playwright 测试产物。
- `__pycache__/`：Python 编译缓存。

## 历史和参考目录

这些目录可以作为迁移参考，但不要再把新功能写进去：

| 路径 | 用途 |
| --- | --- |
| `packages/a_tools_intro` | 早期环境和工具连通性实验 |
| `packages/b_traditional_qa` | 传统 MySQL、Redis、BM25 FAQ 原型 |
| `packages/c_modular_rag` | 模块化 RAG 原型 |
| `packages/d_multi_layer_rag` | 多层 FAQ + RAG 旧原型 |
| `packages/kbms-web/web-kbms-v1` | 旧 Vue2 KBMS 管理端参考 |
| `基于RAG的问答系统/` | 项目流程图、界面图、设计参考图 |

## 本地启动

推荐启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipBrowser -HealthTimeoutSeconds 90
```

带 Milvus 和 RAG 依赖的完整启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -StartMilvus -UseMilvus -InstallRag -SkipBrowser -HealthTimeoutSeconds 90
```

手动启动 API：

```powershell
.\.venv\Scripts\python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/qa
```

## 验证命令

Python 全量测试：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

前端 E2E：

```powershell
npm run test:e2e
```

RAG 评测：

```powershell
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

## 维护原则

- 新后端代码优先放进 `src/ragpro` 和 `apps/api`。
- 新前端代码优先放进 `apps/web`。
- 不要继续扩展旧的 `packages/b_*`、`packages/c_*`、`packages/d_*` 原型目录。
- 不要提交上传文件、日志、本地向量库、模型权重、测试产物。
- 每次功能改动都要写清楚验证命令。
- 认证、权限、上传、索引重建、查询路由、向量检索相关改动必须有测试，或者明确说明为什么暂时无法测试。
