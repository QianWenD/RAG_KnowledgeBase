# packages 目录说明

`packages/` 是当前仓库最容易显得乱的地方。这里混合了数据资产、历史原型、旧前端参考和本地模型目录。

## 当前分区

| 路径 | 类型 | 说明 | 当前建议 |
| --- | --- | --- | --- |
| `data/` | 数据资产 | FAQ、知识文档、评测集、OCR 样例 | 保留并谨慎维护 |
| `models/` | 本地模型 | BERT、BGE、reranker 等权重 | 不提交，机器本地维护 |
| `a_tools_intro/` | 早期实验 | MySQL、Redis、Milvus、FastAPI 等连通性测试 | 只作参考 |
| `b_traditional_qa/` | 历史原型 | 传统 FAQ 检索原型 | 只作参考 |
| `c_modular_rag/` | 历史原型 | 模块化 RAG 原型 | 只作参考 |
| `d_multi_layer_rag/` | 历史原型 | 多层 FAQ + RAG 旧整合版本 | 只作参考 |
| `kbms-web/` | 旧前端参考 | Vue2 KBMS 管理端参考代码 | 只作设计和功能参考 |

## 维护规则

- 新功能不要继续写进 `a_tools_intro`、`b_traditional_qa`、`c_modular_rag`、`d_multi_layer_rag`。
- 如果历史原型里有可复用能力，先迁移到 `src/ragpro/` 或 `apps/`，再接入主线。
- `packages/data/` 是真实项目资产，改动前要确认评测、导入、索引是否依赖。
- `packages/models/` 是本地大文件目录，已经被 `.gitignore` 忽略，不要提交模型权重。

## 为什么暂时不移动这些目录

项目接近上线，贸然移动历史目录会带来路径失效风险。当前先用文档标清边界，等测试和发布流程稳定后，再考虑物理归档。
