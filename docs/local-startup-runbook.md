# RAGPro 本地启动手册

本文档说明本地命令应在什么位置执行，以及每个启动命令会拉起哪些进程。除非某一节特别说明使用 WSL，否则默认命令环境均为 Windows PowerShell。

## 0. 工作目录

所有项目命令都在仓库根目录执行：

```powershell
Set-Location D:\dc\gz\codexItem\RAGPro
```

当前项目的 FastAPI 后端与原生前端页面由同一个 API 进程提供服务：

- API 入口：`apps/api/main.py`
- 前端静态文件目录：`apps/web/`
- 静态资源挂载路径：`/static`
- 主访问地址：`http://127.0.0.1:8000/`

## 1. Python 环境

创建或刷新本地虚拟环境：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

如果需要 PDF、OCR、文档导入和完整检索能力，再安装可选的 RAG 依赖：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-rag.txt
```

## 2. 启动后端与前端

推荐使用的本地启动命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1
```

该脚本现在会默认检查并启动 Milvus，然后在仓库根目录启动 API 和原生前端页面，打开一个新的 PowerShell 窗口等待 `/health` 就绪，并访问 `http://127.0.0.1:8000/`。

如果你只想启动轻量模式，不自动拉起 Milvus，可显式跳过：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipMilvus
```

如果你想直接从仓库根目录同时启动 FastAPI 和前端静态页面，可以执行：

```powershell
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

等价的辅助脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1 -InstallBase
```

如果希望在启动前一并安装可选的 RAG 依赖，可以使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1 -InstallRag
```

启动后可直接打开以下页面：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/qa`
- `http://127.0.0.1:8000/knowledge`
- `http://127.0.0.1:8000/users`
- `http://127.0.0.1:8000/users/access`
- `http://127.0.0.1:8000/users/security`
- `http://127.0.0.1:8000/users/audit`
- `http://127.0.0.1:8000/login`
- `http://127.0.0.1:8000/register`

常用 API 快速检查命令：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/qa
```

## 3. MySQL 与运行时配置

认证、FAQ 和会话相关仓储默认使用 MySQL。当前本地默认配置如下：

- 主机：`localhost`
- 用户名：`root`
- 密码：`123456`
- 数据库：`subjects_kg`

如果需要在当前 PowerShell 会话中覆盖这些参数，可执行：

```powershell
$env:RAGPRO_MYSQL_HOST = "localhost"
$env:RAGPRO_MYSQL_USER = "root"
$env:RAGPRO_MYSQL_PASSWORD = "123456"
$env:RAGPRO_MYSQL_DATABASE = "subjects_kg"
```

知识源键值默认是 `ai,java,test,ops,bigdata`。如需覆盖，可执行：

```powershell
$env:RAGPRO_VALID_SOURCES = "ai,java,test,ops,bigdata"
```

## 4. Milvus 启动

Milvus 启动命令从 Windows PowerShell 的仓库根目录执行，但服务本体运行在 WSL Ubuntu 的 Docker Compose 中。

可选的前置检查命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-milvus-prereqs.ps1
```

在 WSL 中启动 Milvus Standalone：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

如果是从一个新的 PowerShell 窗口执行，建议按下面的完整命令顺序启动：

```powershell
Set-Location D:\dc\gz\codexItem\RAGPro
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

Windows 侧验证 Milvus 是否可用：

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 19530
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

该脚本会在 WSL 中创建或复用 `/root/milvus-standalone`，并暴露以下端口：

- `127.0.0.1:19530`：Milvus gRPC
- `127.0.0.1:9091`：健康检查 / metrics

停止 Milvus Standalone：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-milvus-wsl.ps1
```

如果希望 API 优先使用 Milvus 作为向量后端，可在当前会话中设置：

```powershell
$env:RAGPRO_VECTOR_BACKEND = "milvus"
```

一条命令启动完整本地 RAG 栈：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -StartMilvus -UseMilvus -InstallRag
```

这个命令会先执行 Milvus 前置检查，在 WSL 中启动 Milvus，再以 `RAGPRO_VECTOR_BACKEND=milvus` 启动 API/前端，等待 `/health` 就绪后打开浏览器。现在默认启动命令也会自动尝试拉起 Milvus，因此这一条更适合首次补依赖或需要强制刷新 Milvus 时使用。

如果 Milvus 不可用，开发环境仍可回退到本地向量存储：`runtime/local_vector_store.pkl`。

## 5. 索引与评估 Worker

所有 worker 命令都从仓库根目录执行。

索引某个数据源目录，并覆盖该 source 现有向量：

```powershell
.\.venv\Scripts\python.exe apps\worker\index_documents.py --directory packages\data\ai_data
```

如果希望追加而不是覆盖：

```powershell
.\.venv\Scripts\python.exe apps\worker\index_documents.py --directory packages\data\ai_data --append
```

运行离线评估：

```powershell
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

评估报告输出目录：`runtime/evaluation/`。

## 6. 测试

运行 Python 回归测试：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

安装 Playwright 依赖和 Chromium：

```powershell
npm install
npm run test:e2e:install
```

运行浏览器层的前端 smoke 测试：

```powershell
npm run test:e2e
```

如果 API 已在运行，或者允许启动脚本顺带拉起 API，也可以直接执行本地启动器并附带 smoke 测试：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -RunE2ESmoke
```

运行可选的真实权限与审计流程测试。该测试会创建临时 `e2e_*` 账号，并在结束后清理：

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```

## 7. 常用本地地址

- API 文档：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/health`
- 诊断页面：`http://127.0.0.1:8000/diagnostics`
- 前端首页：`http://127.0.0.1:8000/`
- QA 工作台：`http://127.0.0.1:8000/qa`
- 知识上传页：`http://127.0.0.1:8000/knowledge`
- 权限总览：`http://127.0.0.1:8000/users`
- 访问控制：`http://127.0.0.1:8000/users/access`
- 安全操作：`http://127.0.0.1:8000/users/security`
- 审计日志：`http://127.0.0.1:8000/users/audit`
