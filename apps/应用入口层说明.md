# apps 目录说明

`apps/` 是当前产品的应用入口层。这里放的是“能被用户或运维直接运行/访问”的东西。

## 当前结构

| 路径 | 作用 | 是否主线 |
| --- | --- | --- |
| `api/main.py` | FastAPI 主应用，提供页面路由、API 路由、认证守卫、上传、重建索引和问答编排 | 是 |
| `web/` | 当前产品前端，原生 HTML/CSS/JS，由 FastAPI 静态挂载 | 是 |
| `worker/` | 离线任务脚本，包括 FAQ 导入、文档索引、RAG 评测 | 是 |

## 维护规则

- 新接口和页面路由优先维护 `apps/api/main.py`。
- 新前端页面和交互优先维护 `apps/web/`。
- 离线导入、索引、评测脚本优先维护 `apps/worker/`。
- 不要在 `apps/` 里放临时测试数据、上传文件或运行日志。

## 常用入口

启动 API：

```powershell
.\.venv\Scripts\python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

访问页面：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/login`
- `http://127.0.0.1:8000/qa`
- `http://127.0.0.1:8000/knowledge`
