# scripts 目录说明

`scripts/` 放本地开发和运维辅助脚本。这里的脚本会启动或停止本地服务，执行前建议先看脚本参数。

## 当前脚本

| 文件 | 作用 |
| --- | --- |
| `start-local-stack.ps1` | 推荐入口，启动本地 API，并可选启动 Milvus、安装依赖、打开浏览器 |
| `start-api.ps1` | 单独启动 API |
| `start-milvus-wsl.ps1` | 在 WSL Ubuntu 中启动 Milvus |
| `stop-milvus-wsl.ps1` | 停止 WSL 中的 Milvus |
| `check-milvus-prereqs.ps1` | 检查 Milvus 启动前置条件 |

## 推荐启动

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -SkipBrowser -HealthTimeoutSeconds 90
```

带 Milvus：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-stack.ps1 -StartMilvus -UseMilvus -InstallRag -SkipBrowser -HealthTimeoutSeconds 90
```

## 维护规则

- 修改脚本后，至少要跑一次 `/health` 检查。
- 不要把机器本地绝对路径写死到脚本里，除非文档明确说明。
- 不要把密钥、数据库密码或真实账号写进脚本。
