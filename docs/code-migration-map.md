# 代码迁移映射

更新时间：2026-04-08

这份文档说明当前 `packages/` 下的阶段式代码，后续应如何收敛到正式结构 `src/ragpro/`。

## 1. 迁移目标

现有目录：

- `packages/a_tools_intro`
- `packages/b_traditional_qa`
- `packages/c_modular_rag`
- `packages/d_multi_layer_rag`

目标目录：

- `src/ragpro/faq_match`
- `src/ragpro/routing`
- `src/ragpro/ingestion`
- `src/ragpro/retrieval`
- `src/ragpro/generation`
- `src/ragpro/evaluation`
- `apps/api`
- `apps/worker`

## 2. 迁移映射

### FAQ 精确匹配层

目标：`src/ragpro/faq_match/`

建议来源：

- `packages/b_traditional_qa/mysql_qa/db/mysql_client.py`
- `packages/b_traditional_qa/mysql_qa/retrieval/bm25_search.py`
- `packages/b_traditional_qa/mysql_qa/utils/preprocess.py`
- `packages/b_traditional_qa/mysql_qa/cache/redis_client.py`

说明：

- 这是一期主链的一部分
- 优先迁移数据访问、匹配和阈值判断逻辑

### 路由层

目标：`src/ragpro/routing/`

建议来源：

- `packages/c_modular_rag/rag_qa/core/query_classifier.py`
- `packages/c_modular_rag/rag_qa/core/strategy_selector.py`
- `packages/d_multi_layer_rag/rag_qa/core/query_classifier.py`
- `packages/d_multi_layer_rag/rag_qa/core/strategy_selector.py`

说明：

- 首版可以先保留轻量路由接口
- BERT 分类器代码先以可选能力收进来，不必一开始强耦合

### 文档加载与处理层

目标：`src/ragpro/ingestion/`

建议来源：

- `packages/c_modular_rag/rag_qa/core/document_processor.py`
- `packages/c_modular_rag/rag_qa/edu_document_loaders/`
- `packages/c_modular_rag/rag_qa/edu_text_spliter/`

说明：

- `document_processor.py` 适合作为 ingestion 编排入口
- loaders 和 splitters 应拆开落位

### 检索层

目标：`src/ragpro/retrieval/`

建议来源：

- `packages/c_modular_rag/rag_qa/core/vector_store.py`
- `packages/d_multi_layer_rag/rag_qa/core/vector_store.py`

说明：

- 以 `c_modular_rag` 版本为主参考
- `d_multi_layer_rag` 用于补齐融合版行为

### 生成层

目标：`src/ragpro/generation/`

建议来源：

- `packages/c_modular_rag/rag_qa/core/prompts.py`
- `packages/c_modular_rag/rag_qa/core/rag_system.py`
- `packages/d_multi_layer_rag/rag_qa/core/new_rag_system.py`

说明：

- 不建议直接把 `rag_system.py` 原样搬过去
- 应拆成 prompt、answer generation、orchestration 三部分

### API 层

目标：`apps/api/`

建议来源：

- `packages/d_multi_layer_rag/api.py`
- `packages/d_multi_layer_rag/app.py`

说明：

- `d_multi_layer_rag/api.py` 是当前最接近正式 API 的入口
- 后续应改成依赖 `src/ragpro/` 中的正式模块，而不是直接依赖旧 stage 目录

### Worker / 后台任务层

目标：`apps/worker/`

建议来源：

- `packages/c_modular_rag/rag_main.py` 中的数据处理模式
- `packages/d_multi_layer_rag/new_main.py` 中可抽离的批处理逻辑

说明：

- 文档入库、重建索引、数据预处理更适合迁移到 worker

### 评测层

目标：`src/ragpro/evaluation/`

建议来源：

- `packages/data/rag_evaluate_data.json`
- `packages/d_multi_layer_rag/rag_qa/rag_assesment/rag_as.py`

说明：

- 当前评测资产已经有基础雏形
- 适合后续抽成独立回归验证模块

## 3. 暂不迁移的部分

以下内容先保留在原地，作为实验或参考：

- `packages/a_tools_intro/`
- `packages/d_multi_layer_rag/old_main.py`
- 各目录下的 `review.py`
- 临时 `test.py`
- 日志文件与 `__pycache__`

## 4. 建议迁移顺序

1. FAQ 层
2. ingestion 层
3. retrieval 层
4. generation 层
5. API 层
6. routing 层增强
7. evaluation 层

## 5. 当前状态

正式目标骨架已经建立：

- `src/ragpro/`
- `apps/api/`
- `apps/worker/`

下一步应进入第一轮真实代码迁移，而不是继续补结构图。
