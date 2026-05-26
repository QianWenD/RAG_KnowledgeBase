# RAGPro 新服务器部署说明

## 适用范围

这份文档用于把 RAGPro 部署到一台新的服务器，重点说明需要带哪些文件、安装哪些软件、配置哪些环境变量，以及上线前必须检查什么。

当前项目是“FastAPI 后端 + 原生静态前端 + MySQL + Redis + Milvus + Ollama”的本地化 RAG 系统。前端页面由 FastAPI 同一个进程提供，不需要单独构建前端服务。

## 一、部署形态

推荐先按内网单机部署理解：

| 层级 | 组件 | 说明 |
| --- | --- | --- |
| Web/API | FastAPI + Uvicorn | 入口为 `apps/api/main.py`，默认端口 `8000` |
| 前端 | `apps/web/` 静态页面 | 由 API 进程挂载 `/static` 并提供页面 |
| 账号权限 | MySQL | 用户、会话、组织、菜单角色、审计日志 |
| FAQ 和会话 | MySQL + Redis | FAQ 数据、缓存和对话历史 |
| 向量检索 | Milvus | 生产建议使用 Milvus，不建议长期依赖 local 向量文件 |
| 大模型 | Ollama | 默认模型 `qwen2.5:7b` |
| 本地模型 | `packages/models/` | BGE-M3、reranker 等模型权重，代码仓库不会提交这些大文件 |

## 二、上线文件清单

### 必须带到新服务器

| 内容 | 路径或来源 | 说明 |
| --- | --- | --- |
| 项目代码 | Git 仓库 | 包含 `apps/`、`src/`、`docs/`、`scripts/`、`packages/data/` 等 |
| Python 依赖清单 | `requirements.txt`、`requirements-rag.txt` | 后端基础依赖和完整 RAG 依赖 |
| Node 依赖清单 | `package.json`、`package-lock.json` | 主要用于 Playwright E2E 验证 |
| 本地模型权重 | `packages/models/` | 被 `.gitignore` 忽略，必须单独拷贝或重新下载 |
| 业务知识资料 | `packages/data/` 或客户指定目录 | 用于首次建索引或后续重建 |
| 环境配置 | `.env` 或部署平台环境变量 | 不要提交到 Git |
| 数据库备份 | MySQL dump | 从旧服务器迁移时必须准备 |

### 按场景选择

| 内容 | 什么时候需要 |
| --- | --- |
| `runtime/uploads/` | 如果要保留用户上传过的原始文件 |
| Milvus 数据卷或备份 | 如果不想重新建索引，需要迁移 Milvus 数据 |
| `runtime/local_vector_store.pkl` | 仅 local 向量模式需要；生产不推荐依赖它 |
| `runtime/evaluation/*.report.json` | 只作为历史评测报告留档，不影响系统运行 |

## 三、服务器基础要求

### 推荐配置

| 项目 | 建议 |
| --- | --- |
| 操作系统 | Windows Server 2019/2022 或 Windows 10/11 专用服务器 |
| CPU | 8 核以上 |
| 内存 | 最低 16 GB，推荐 32 GB 以上 |
| 磁盘 | 至少 100 GB 可用空间，模型和 Milvus 数据较占空间 |
| GPU | 可选；有 GPU 时本地 embedding/rerank 性能更好 |
| 网络 | 能访问内网用户；首次安装依赖时最好可访问 PyPI、npm、Docker 镜像和 Ollama 模型源 |

如果要把 Milvus、MySQL、Redis、Ollama 拆到多台机器，也可以部署，但需要同步修改环境变量。

## 四、需要安装的软件

### Windows 主机侧

| 软件 | 建议版本 | 用途 |
| --- | --- | --- |
| Git | 2.x | 拉取代码 |
| Python | 3.10.x 64-bit | 当前本地验证版本是 3.10.10 |
| Node.js | 20 LTS 或 22 | 运行 npm 和 Playwright 验证；当前本地 Node 为 21.7.3 |
| MySQL | 5.7 或 8.0 | 当前本地服务名常见为 `MySQL57` |
| Redis | 5.x 或 7.x | FAQ 缓存和部分运行状态 |
| Ollama | 当前稳定版 | 本地大模型服务，默认端口 `11434` |
| PowerShell | 5.1+ | 运行项目脚本 |
| Visual C++ Build Tools | 视情况 | 某些 Python 包需要编译时使用 |

### Milvus 侧

当前脚本默认通过 WSL Ubuntu + Docker Compose 启动 Milvus Standalone。

| 软件 | 用途 |
| --- | --- |
| WSL2 | 在 Windows 上运行 Ubuntu |
| Ubuntu WSL 发行版 | 默认脚本使用 `Ubuntu` |
| Docker Desktop 或 WSL 内 Docker | 运行 Milvus、etcd、MinIO 容器 |
| Milvus Standalone | 默认版本 `v2.6.11` |

Milvus 启动脚本会在 WSL 内创建或复用 `/root/milvus-standalone`。

## 五、Python 和 Node 依赖

### Python 基础依赖

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 完整 RAG 依赖

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-rag.txt
```

基础依赖包括 FastAPI、Uvicorn、PyMySQL、Redis、Ollama SDK、jieba、BM25、Pandas、NumPy 等。

RAG 依赖包括 LangChain、PyMuPDF、pypdf、pymilvus、milvus-model、rapidocr、sentence-transformers、FlagEmbedding、torch 等。

### Node 依赖

```powershell
npm install
npm run test:e2e:install
```

注意：当前前端没有 `npm run build`，Node 主要用于 Playwright 自动化验证。

## 六、模型和数据准备

### Ollama 模型

默认配置使用：

```powershell
ollama pull qwen2.5:7b
```

如果要换模型，设置：

```powershell
$env:RAGPRO_LLM_MODEL = "你的模型名"
```

### 本地 embedding 和 rerank 模型

需要确认新服务器有以下目录，至少要有检索实际使用的模型：

```text
packages/models/bge-m3
packages/models/bge-reranker-large
```

当前仓库中还可能存在：

```text
packages/models/bert-base-chinese
packages/models/bert_query_classifier
packages/models/nlp_bert_document-segmentation_chinese-base
```

`packages/models/` 不会随 Git 推送，需要从旧服务器拷贝或按模型来源重新下载。

## 七、环境变量配置

建议在部署脚本、系统环境变量或 `.env` 管理工具中配置，不要把真实密码写进 Git。

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `RAGPRO_MYSQL_HOST` | `127.0.0.1` | MySQL 主机 |
| `RAGPRO_MYSQL_USER` | `ragpro_user` | MySQL 用户 |
| `RAGPRO_MYSQL_PASSWORD` | `强密码` | MySQL 密码 |
| `RAGPRO_MYSQL_DATABASE` | `subjects_kg` | 数据库名 |
| `RAGPRO_REDIS_HOST` | `127.0.0.1` | Redis 主机 |
| `RAGPRO_REDIS_PORT` | `6379` | Redis 端口 |
| `RAGPRO_REDIS_PASSWORD` | `强密码或留空` | Redis 密码 |
| `RAGPRO_REDIS_DB` | `0` | Redis DB |
| `RAGPRO_MILVUS_HOST` | `127.0.0.1` | Milvus 地址 |
| `RAGPRO_MILVUS_PORT` | `19530` | Milvus gRPC 端口 |
| `RAGPRO_MILVUS_DATABASE` | `itcast` | Milvus database |
| `RAGPRO_MILVUS_COLLECTION` | `edurag_final` | Milvus collection |
| `RAGPRO_VECTOR_BACKEND` | `milvus` | 生产建议固定为 `milvus` |
| `RAGPRO_LLM_MODEL` | `qwen2.5:7b` | Ollama 模型名 |
| `RAGPRO_VALID_SOURCES` | `ai,java,test,ops,bigdata` | 可用知识源 |
| `RAGPRO_MODELS_DIR` | `packages/models` | 本地模型目录 |
| `RAGPRO_DATA_DIR` | `packages/data` | 数据目录 |
| `RAGPRO_RUNTIME_DIR` | `runtime` | 运行产物目录 |
| `RAGPRO_UPLOAD_DIR` | `runtime/uploads` | 上传文件目录 |
| `RAGPRO_LOG_FILE` | `logs/app.log` | 日志文件 |
| `RAGPRO_AUTH_COOKIE_NAME` | `ragpro_session` | 登录 Cookie 名 |
| `RAGPRO_AUTH_COOKIE_SECURE` | `true` | HTTPS 上线建议设为 `true` |
| `RAGPRO_AUTH_COOKIE_SAMESITE` | `lax` | Cookie SameSite |
| `RAGPRO_AUTH_SESSION_TTL_DAYS` | `7` | 登录有效期 |

生产环境不要继续使用默认 MySQL 账号密码 `root/123456`。

## 八、端口清单

| 端口 | 组件 | 是否需要对外 |
| --- | --- | --- |
| `8000` | RAGPro API 和前端 | 内网访问或由 Nginx/IIS 反代 |
| `3306` | MySQL | 不建议对普通用户开放 |
| `6379` | Redis | 不建议对普通用户开放 |
| `11434` | Ollama | 不建议对普通用户开放 |
| `19530` | Milvus gRPC | 只允许 API 服务器访问 |
| `9091` | Milvus health/metrics | 只用于运维检查 |
| `80/443` | 反向代理 | 客户访问入口 |

正式上线建议由 Nginx、IIS 或其他网关把 `80/443` 反向代理到 `127.0.0.1:8000`，并配置 HTTPS。

## 九、新服务器部署步骤

### 1. 拉取代码

```powershell
git clone https://github.com/QianWenD/RAG_KnowledgeBase.git
Set-Location .\RAG_KnowledgeBase
```

### 2. 准备模型和数据

从旧服务器拷贝：

```text
packages/models/
packages/data/
```

如果是迁移已有系统，还要准备 MySQL dump，并根据实际情况拷贝 `runtime/uploads/`。

### 3. 安装 Python 依赖

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -r requirements-rag.txt
```

### 4. 安装 Node 验证依赖

```powershell
npm install
npm run test:e2e:install
```

### 5. 准备 MySQL

1. 创建生产数据库和专用用户。
2. 给专用用户授予当前数据库的建表、读写、索引和变更表结构权限。
3. 如果是迁移，导入旧服务器 dump。

代码会自动创建和补齐一部分表结构，但新服务器首次启动时 MySQL 用户必须有相应权限。

### 6. 准备 Redis

启动 Redis，并按实际情况设置密码。配置 `RAGPRO_REDIS_PASSWORD`。

### 7. 准备 Ollama

```powershell
ollama serve
ollama pull qwen2.5:7b
```

如果 Ollama 已作为系统服务运行，只需要确认 `127.0.0.1:11434` 可连。

### 8. 准备 Milvus

先检查：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-milvus-prereqs.ps1
```

启动：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

检查端口：

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 19530
```

### 9. 启动 API 和前端

开发或演示环境可以用：

```powershell
$env:RAGPRO_VECTOR_BACKEND = "milvus"
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipBrowser -HealthTimeoutSeconds 120
```

正式环境建议用进程管理工具托管 Uvicorn，不要依赖手动打开的 PowerShell 窗口。命令参考：

```powershell
$env:RAGPRO_VECTOR_BACKEND = "milvus"
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

如果需要让局域网直接访问，也可以绑定 `0.0.0.0`，但更推荐使用反向代理：

```powershell
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000
```

### 10. 首次建索引

如果是全新部署，需要对业务资料建索引：

```powershell
.\.venv\Scripts\python.exe apps\worker\index_documents.py --directory packages\data\ai_data
```

如果是从旧服务器完整迁移 Milvus 数据，可以不重建，但仍建议跑一次业务评测确认。

### 11. 首次管理员账号

系统第一个注册账号会成为管理员，并默认拥有 `RAGPRO_VALID_SOURCES` 中的知识源范围。

操作建议：

1. 部署完成后只让管理员创建第一个账号。
2. 创建后立刻记录交接责任人。
3. 不要在文档中保存明文密码。

## 十、上线验证

### 基础健康检查

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/qa
```

`/health` 的 `readiness` 应为 `ok`，并且 MySQL、Redis、Ollama、Milvus 都可用。

### 完整发布检查

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

当前发布检查会执行：

1. `/health` 健康检查。
2. Python 单元测试。
3. Playwright 前端 E2E。
4. 默认业务评测 `current_domain_regression.json`，要求通过率 `1.0`。

### 客户资料验收

上线前至少用客户真实资料走一遍：

1. 登录管理员账号。
2. 上传客户知识资料。
3. 重建或追加索引。
4. 用客户常见问题测试问答。
5. 检查引用来源是否来自正确知识源。
6. 检查审计日志是否记录关键操作。

## 十一、生产运行注意事项

### 安全

- 不要使用默认数据库密码。
- 生产环境开启 HTTPS 时设置 `RAGPRO_AUTH_COOKIE_SECURE=true`。
- MySQL、Redis、Milvus、Ollama 只允许应用服务器访问，不要直接暴露给普通用户。
- `.env`、数据库 dump、模型权重、上传文件不要提交到 Git。
- `/docs` 和 `/diagnostics` 在生产环境至少应限制在内网或运维访问范围内。

### 数据和备份

需要定期备份：

| 内容 | 说明 |
| --- | --- |
| MySQL | 用户、权限、审计、FAQ、会话等核心数据 |
| Milvus 数据 | 向量索引和检索数据 |
| `runtime/uploads/` | 用户上传原始资料 |
| `packages/data/` | 初始资料和评测集 |
| 环境变量配置 | 不含明文公开，只保存在安全位置 |

如果不能稳定备份 Milvus，至少要保证原始资料可恢复，并能重新执行索引构建。

### 日志

默认日志路径：

```text
logs/app.log
runtime/*.log
```

建议上线后集中收集：

- API 启动日志。
- Uvicorn 访问日志。
- Milvus/Docker 日志。
- MySQL 慢查询和错误日志。
- Ollama 服务日志。

### 回滚

上线前记录：

1. 当前 Git commit。
2. MySQL 备份文件。
3. Milvus 数据或可重建索引的原始资料。
4. 当前 `.env` 或环境变量快照。

如果上线失败，先回滚代码，再恢复数据库和索引数据，最后重新跑 `/health` 和业务评测。

## 十二、常见问题

### `/health` 是 degraded

查看 `unavailable_services`，常见原因：

- MySQL 没启动或账号密码错误。
- Redis 没启动或密码错误。
- Ollama 没启动，或 `11434` 不通。
- Milvus 没启动，或 `19530` 不通。

### 问答能打开但 RAG 检索不准

优先检查：

- `RAGPRO_VECTOR_BACKEND` 是否为 `milvus`。
- `packages/models/bge-m3` 和 `packages/models/bge-reranker-large` 是否存在。
- 客户资料是否已经上传并完成索引。
- `RAGPRO_VALID_SOURCES` 是否包含当前资料的 source。

### PPT、PDF、DOCX 上传失败

优先检查：

- 是否安装了 `requirements-rag.txt`。
- 文件大小是否超过 `RAGPRO_MAX_UPLOAD_FILE_SIZE_BYTES`，默认 25 MB。
- 文件格式是否在系统支持范围内。

### 新服务器没有 GPU

可以运行，但 embedding、rerank 和部分文档处理会更慢。建议先用小批量资料验证，再批量导入。

## 十三、上线交付确认表

| 项目 | 是否完成 | 备注 |
| --- | --- | --- |
| 代码已部署到目标服务器 |  |  |
| Python 依赖已安装 |  |  |
| RAG 依赖已安装 |  |  |
| Node/Playwright 验证依赖已安装 |  |  |
| MySQL 已配置并可连接 |  |  |
| Redis 已配置并可连接 |  |  |
| Ollama 已启动并已拉取模型 |  |  |
| Milvus 已启动并可连接 |  |  |
| `packages/models/` 已准备 |  |  |
| 生产环境变量已配置 |  |  |
| 管理员账号已交接 |  |  |
| 客户资料已上传或已迁移 |  |  |
| 业务索引已构建 |  |  |
| `/health` 返回 `readiness: ok` |  |  |
| `release-check.ps1` 已通过 |  |  |
| 客户验收问题已测试 |  |  |
| 备份和回滚方案已确认 |  |  |
