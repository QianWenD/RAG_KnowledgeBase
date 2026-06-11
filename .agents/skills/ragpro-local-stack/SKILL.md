---
name: ragpro-local-stack
description: 启动、重启、检查和停止 RAGPro 本地开发环境时使用。适用于用户提出“启动服务器”“重启服务”“检查前后端能否访问”“启动或停止 Milvus”“检查本地栈健康状态”等请求。工作目录固定为 D:\dc\gz\codexItem\RAGPro，优先使用项目脚本 scripts/start-local-stack.ps1、scripts/start-milvus-wsl.ps1、scripts/stop-milvus-wsl.ps1。
---

# RAGPro 本地栈操作

本 skill 用于统一处理 RAGPro 的本地启动与健康检查。

## 适用范围

当用户要你执行以下动作时，优先使用本 skill：

- 启动服务器
- 重启前后端
- 检查本地环境是否正常
- 启动或停止 Milvus
- 检查 `/health`、首页、`/qa`

## 固定工作目录

所有命令都从下面的目录执行：

```powershell
Set-Location D:\dc\gz\codexItem\RAGPro
```

## 默认启动策略

1. 先检查 Windows 服务 `MySQL57` 和 `Redis` 是否运行。
2. 如果服务未运行，先启动它们。
3. 默认使用下面的命令启动本地栈：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipBrowser -HealthTimeoutSeconds 90
```

4. 当前默认启动命令会自动尝试拉起 Milvus；只有在明确需要轻量模式时，才传 `-SkipMilvus`。

轻量模式命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipMilvus -SkipBrowser -HealthTimeoutSeconds 90
```

## Milvus 相关命令

单独启动 Milvus：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

停止 Milvus：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-milvus-wsl.ps1
```

## 启动后的验证

默认验证以下地址：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/qa
```

如果健康检查返回 `readiness: ok`，说明 MySQL、Redis、Ollama、Milvus 都可用。

如果健康检查返回 `readiness: degraded`，通常说明 Milvus 未就绪，但普通前后端仍可能可用，需要在回复里明确指出。

## 端口异常时的处理

如果 `8000` 端口监听存在但请求超时，按下面顺序处理：

1. 查找 `start-api.ps1` / `uvicorn apps.api.main:app` 相关进程。
2. 停掉旧的 PowerShell 和 Python 进程组。
3. 重新执行默认启动命令。

如果 `8000` 仍然被无法识别的旧监听占住，而用户当前需要一个可用环境，则允许退到 `8001`：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -Port 8001 -SkipBrowser -HealthTimeoutSeconds 90
```

然后验证：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8001/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8001/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8001/qa
```

如果回退到了 `8001`，必须在回复里明确告诉用户当前可用地址不是默认 `8000`。

## 文档依据

若不确定细节，优先参考：

- `docs/本地启动手册.md`
- `scripts/start-local-stack.ps1`
- `scripts/start-milvus-wsl.ps1`

## 回复要求

- 说清楚启动的是 `8000` 还是 `8001`
- 说清楚 `/health`、首页、`/qa` 是否通过
- 如果 Milvus 已启动，说明 `readiness: ok`
- 如果只启了轻量模式，说明 `readiness: degraded`
