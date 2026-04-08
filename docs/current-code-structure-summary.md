# 当前代码结构整理汇总

更新时间：2026-04-08

## 1. 总体判断

当前 `packages/` 下的代码不是按最终生产目录组织的，而是按项目演进阶段组织的。

整体可以理解为 4 层：

- `a_tools_intro`：工具和基础环境验证
- `b_traditional_qa`：传统 FAQ / MySQL / BM25 问答系统
- `c_modular_rag`：模块化 RAG 原型
- `d_multi_layer_rag`：融合版多层问答系统

这套分层是有价值的，因为它保留了系统从简单到复杂的演进路径。

## 2. 各目录定位

### `packages/a_tools_intro`

作用：

- 基础环境与依赖连通性验证
- 包括 Ollama、MySQL、Redis、Milvus、FastAPI、Flask、BM25 等测试脚本

结论：

- 这是实验区，不应进入后续主业务路径
- 可以保留，但建议长期定位为 `sandbox` / `experiments`

### `packages/b_traditional_qa`

作用：

- MySQL + Redis + BM25 的传统问答系统
- 主入口是 `mysql_main.py`
- 核心能力是 FAQ 精确匹配与阈值返回

结论：

- 这是一期必须保留的能力
- 它对应我们规划里的“FAQ 精确匹配层”
- 里面的 `mysql_qa/db`、`retrieval`、`utils` 具备较强复用价值

### `packages/c_modular_rag`

作用：

- 模块化 RAG 原型
- 主入口是 `rag_main.py`
- 核心模块包括：
  - `document_processor.py`
  - `vector_store.py`
  - `rag_system.py`
  - `query_classifier.py`
  - `strategy_selector.py`
  - `prompts.py`
  - `edu_document_loaders`
  - `edu_text_spliter`

结论：

- 这是当前最接近“可拆成正式模块”的代码层
- 一期和二期的 RAG 主实现建议优先从这里收敛
- 文档加载、切分、向量检索的核心逻辑主要在这里

### `packages/d_multi_layer_rag`

作用：

- 融合传统问答与 RAG 的集成版系统
- 主入口包括：
  - `new_main.py`
  - `api.py`
  - `app.py`
- 同时包含：
  - MySQL FAQ 命中
  - 对话历史
  - RAG 检索生成
  - API 暴露
  - 前端静态页面

结论：

- 这是当前最接近“产品形态”的版本
- 它已经实现了双引擎思路
- 但也最容易出现代码耦合过重的问题

### `packages/data`

作用：

- 知识库样本数据
- 分类数据
- OCR 样本
- RAG 评测数据

结论：

- 这是有效的数据资产层
- 后续应从 `packages/` 中独立出来，作为专门的数据目录管理

### `packages/models`

作用：

- 本地模型权重
- 包括 `bert-base-chinese`、`bert_query_classifier`、`bge-m3`、`bge-reranker-large`

结论：

- 这是有效的模型资产层
- 也建议从 `packages/` 中独立出来，避免与业务代码混在一起

## 3. 我检查后的结果

### 3.1 关键主文件可以被 Python 正常解析

已验证通过的文件：

- `packages/b_traditional_qa/mysql_main.py`
- `packages/c_modular_rag/rag_main.py`
- `packages/d_multi_layer_rag/new_main.py`
- `packages/d_multi_layer_rag/api.py`
- `packages/c_modular_rag/rag_qa/core/rag_system.py`
- `packages/d_multi_layer_rag/rag_qa/core/new_rag_system.py`

说明：

- 至少从语法层面看，当前关键主链文件没有明显损坏
- 这意味着现在更大的问题不是“代码坏了”，而是“结构如何收敛”

### 3.2 当前结构最大的优点

- 你已经把系统分成了清晰的演进阶段
- FAQ 层与 RAG 层都已经有原型代码
- 文档加载、文本切分、Milvus 检索、rerank、路由、API 这些关键环节都已经出现了
- 本地模型和数据也已经落地，不是纯设计图阶段

### 3.3 当前结构最大的风险

- `c_modular_rag` 和 `d_multi_layer_rag` 存在大量重复代码
- `rag_system.py` / `new_rag_system.py` 这类文件承担了过多职责
- 大量 `sys.path.insert(...)` 说明当前工程包边界还不稳定
- `packages/` 下同时混放业务代码、数据、模型，不利于后续维护
- 存在实验文件和正式文件混杂的情况，如 `review.py`、`test.py`、`old_main.py`

## 4. 现在这套代码该怎么理解

如果按我们已经确定的目标架构来映射，当前代码可以这样理解：

- `b_traditional_qa` = FAQ 精确匹配层
- `c_modular_rag` = RAG 检索层原型
- `d_multi_layer_rag` = FAQ + RAG + API 的融合层
- `data` = 数据资产
- `models` = 模型资产

这说明你的核心能力已经具备，只是还没有整理成最终工程结构。

## 5. 建议保留的代码资产

优先建议保留和复用：

- `packages/b_traditional_qa/mysql_qa/`
- `packages/c_modular_rag/rag_qa/core/document_processor.py`
- `packages/c_modular_rag/rag_qa/core/vector_store.py`
- `packages/c_modular_rag/rag_qa/core/prompts.py`
- `packages/c_modular_rag/rag_qa/edu_document_loaders/`
- `packages/c_modular_rag/rag_qa/edu_text_spliter/`
- `packages/d_multi_layer_rag/api.py`
- `packages/d_multi_layer_rag/new_main.py`
- `packages/data/`
- `packages/models/`

## 6. 建议降级为参考或实验的部分

建议暂时不要当作正式主线继续扩展：

- `packages/a_tools_intro/`
- `packages/d_multi_layer_rag/old_main.py`
- 各目录下的 `review.py`
- `test.py` 这类临时验证文件
- `__pycache__/` 与日志文件

## 7. 推荐的收敛方向

下一阶段不要继续在 `b/c/d` 目录层级上叠新功能，而应该开始做“正式收敛”。

推荐收敛目标：

- `b_traditional_qa` 的有效部分收敛到 FAQ 层
- `c_modular_rag` 的有效部分收敛到 ingestion / retrieval / routing / generation
- `d_multi_layer_rag` 的有效部分收敛到 apps/api 和应用编排层
- `data` 和 `models` 从 `packages/` 中分离成顶层资产目录

## 8. 现阶段最值得做的事

1. 选定 `d_multi_layer_rag` 作为“产品行为参考”，因为它最接近最终链路。
2. 选定 `c_modular_rag` 作为“核心模块来源”，因为它拆分更清楚。
3. 选定 `b_traditional_qa` 作为 FAQ 层来源。
4. 不再新增 `e_*` 这种演进目录，而是开始搭正式工程骨架。

## 9. 结论

当前代码不是散的，而是已经形成了一条很明确的演进链：

- 从基础工具验证
- 到传统 FAQ 系统
- 到模块化 RAG
- 到融合式多层问答系统

这说明项目基础其实比“只有流程图”要更成熟。

真正要做的不是推翻重来，而是整理、去重、收敛成正式工程结构。
