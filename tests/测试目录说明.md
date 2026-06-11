# tests 目录说明

`tests/` 是项目质量门禁目录，包含 Python 单测/API 测试和 Playwright 浏览器 E2E 测试。

## 测试分区

| 路径 | 说明 |
| --- | --- |
| `test_auth_api.py` | 认证和权限 API 测试 |
| `test_auth_repository.py` | 认证数据层测试 |
| `test_auth_service.py` | 认证服务测试 |
| `test_api_surface.py` | API 和页面结构测试 |
| `test_frontend_smoke.py` | 前端静态冒烟测试 |
| `test_document_upload.py` | 上传和文档处理测试 |
| `test_ingestion_loaders.py` | 文档 loader 测试 |
| `test_vector_store.py` | 向量库测试 |
| `test_routing.py` | 路由策略测试 |
| `test_generation.py` | 生成逻辑测试 |
| `test_evaluation.py` | 评测逻辑测试 |
| `test_conversation.py` | 会话历史测试 |
| `test_faq_service.py` | FAQ 服务测试 |
| `test_api_rag_service_cache.py` | RAG 服务缓存相关测试 |
| `e2e/` | Playwright 浏览器测试 |
| `fixtures/` | 测试样例文件 |

## 常用命令

Python 全量测试：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

前端 E2E：

```powershell
npm run test:e2e
```

认证权限定向测试：

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_auth_api tests.test_auth_service tests.test_auth_repository
```

## 当前注意事项

接管审计时，核心后端/RAG 定向测试和前端 E2E 通过；全量 Python 测试仍有少量前端静态断言需要整理。
