# src/ragpro 目录说明

`src/ragpro/` 是当前项目正式 Python 包，也是后续后端业务能力的主要落点。

## 模块分区

| 路径 | 作用 |
| --- | --- |
| `auth/` | 用户、登录、会话、权限、组织、菜单角色、审计 |
| `config/` | 配置和日志 |
| `conversation/` | 对话历史 |
| `evaluation/` | 评测数据、评测执行、评测指标 |
| `faq_match/` | FAQ 查询、缓存、预处理 |
| `generation/` | Prompt、LLM 调用、答案生成 |
| `ingestion/` | 文档加载、切分、上传、任务管理 |
| `retrieval/` | Milvus 和本地向量库检索 |
| `routing/` | 意图识别、检索策略选择 |
| `runtime/` | 健康检查和运行诊断 |
| `legacy/` | 遗留兼容占位 |

## 维护规则

- 新后端能力优先写在这里，而不是写回 `packages/` 历史原型。
- `apps/api/main.py` 负责 HTTP 层，复杂业务逻辑应尽量下沉到 `src/ragpro/`。
- 认证、上传、检索、生成、权限相关改动必须配套测试或写清楚验证方式。
