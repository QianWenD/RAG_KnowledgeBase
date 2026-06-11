# RAGPro

RAGPro 是一个中文 RAG 问答和知识库运维系统。当前项目已经从早期实验阶段进入接近上线的整理和加固阶段，主线能力包括登录认证、用户和权限管理、知识上传、批量上传、索引重建、FAQ 优先匹配、RAG 检索增强问答、运行诊断和前端 E2E 测试。

## 先看哪几份文档

如果你是第一次接手这个项目，建议按下面顺序看：

1. `PROJECT_MAP.md`：项目总览，说明主线代码、运行依赖、启动方式和维护规则。
2. `docs/项目文件整理清单.md`：项目文件整理清单，说明每个目录该怎么看、哪些是主线、哪些是历史参考。
3. `docs/本地启动手册.md`：本地启动手册。
4. `docs/新服务器部署说明.md`：新服务器上线部署说明。
5. `docs/项目负责人手册.md`：项目负责人管理规则草案。
6. `docs/项目路线图.md`：路线图和风险清单。
7. `docs/文档索引.md`：文档索引。

几个常用目录也有自己的中文说明：

- `apps/应用入口层说明.md`
- `src/ragpro/Python包说明.md`
- `packages/数据资产与历史原型说明.md`
- `tests/测试目录说明.md`
- `scripts/运维脚本说明.md`

## 当前主线目录

| 路径 | 作用 |
| --- | --- |
| `apps/api/main.py` | FastAPI 主入口，页面路由、API 路由、认证守卫、问答编排 |
| `apps/web/` | 当前产品前端，原生 HTML/CSS/JS |
| `apps/worker/` | FAQ 导入、文档索引、离线评测脚本 |
| `src/ragpro/` | 正式 Python 包，承载认证、检索、生成、上传、评测等核心模块 |
| `tests/` | Python 单测、API 测试、Playwright E2E 测试 |
| `scripts/` | 本地启动、Milvus 启停、环境检查脚本 |
| `packages/data/` | FAQ、知识文档、评测集和 OCR 样例 |

`packages/a_tools_intro`、`packages/b_traditional_qa`、`packages/c_modular_rag`、`packages/d_multi_layer_rag`、`packages/kbms-web` 主要是历史原型或参考代码，后续新功能不要继续写进去。

## 本地启动

推荐启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipBrowser -HealthTimeoutSeconds 90
```

完整启动 Milvus 和 RAG 依赖：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -StartMilvus -UseMilvus -InstallRag -SkipBrowser -HealthTimeoutSeconds 90
```

手动启动 API：

```powershell
.\.venv\Scripts\python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

启动后访问：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/login`
- `http://127.0.0.1:8000/qa`
- `http://127.0.0.1:8000/knowledge`

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

## 常用验证

Python 全量测试：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

前端 E2E：

```powershell
npm run test:e2e
```

RAG 离线评测：

```powershell
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
```

当前接管审计时的状态：

- 本地 `/health` 正常。
- 前端 E2E 通过。
- Python 全量测试通过。
- 默认业务评测 `current_domain_regression.json` 通过率为 `1.0`。
- 完整发布检查可使用 `scripts/release-check.ps1` 执行。

## 本地依赖

本项目本地运行通常需要：

- Python 3.10 虚拟环境。
- MySQL。
- Redis。
- Milvus，当前本地通过 WSL Ubuntu 运行。
- Ollama。
- Node.js，仅用于 Playwright 测试。

依赖文件：

- `requirements.txt`：基础后端依赖。
- `requirements-rag.txt`：RAG、向量、文档解析相关依赖。
- `package.json`：Playwright 测试脚本和依赖。

## 文件管理规则

- 新后端功能优先放到 `src/ragpro/` 和 `apps/api/main.py`。
- 新前端功能优先放到 `apps/web/`。
- 不要把新功能继续写进旧的 `packages/b_*`、`packages/c_*`、`packages/d_*` 原型目录。
- 不要提交 `runtime/uploads/`、`runtime/local_vector_store.pkl`、`logs/`、`tmp/`、`test-results/`、`packages/models/`。
- 修改认证、权限、上传、索引重建、检索、生成逻辑时，需要同步补测试或写清楚验证方式。

## 上线前重点风险

上线前至少要处理：

- 修复当前全量 Python 测试里的静态页面断言失败。
- 让离线评测脚本支持认证后的 `/query`。
- 确认生产部署目标和生产环境变量。
- 确认 MySQL、Redis、Milvus、Ollama、上传目录、日志和模型权重的部署和备份方案。
- 确认生产 cookie、安全头、CSRF、限流等安全策略。
