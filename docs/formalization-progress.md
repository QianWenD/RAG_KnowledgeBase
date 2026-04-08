# 正式化收敛进度

更新时间：2026-04-08

## 本轮完成

- 建立正式目标源码结构：`src/ragpro/`
- 建立 FAQ 正式模块：
  - `src/ragpro/config/settings.py`
  - `src/ragpro/config/logging.py`
  - `src/ragpro/faq_match/preprocess.py`
  - `src/ragpro/faq_match/repository.py`
  - `src/ragpro/faq_match/cache.py`
  - `src/ragpro/faq_match/service.py`
- 建立正式 API 入口：`apps/api/main.py`
- 建立 ingestion 正式模块：
  - `src/ragpro/ingestion/loaders/registry.py`
  - `src/ragpro/ingestion/splitters/chinese_recursive.py`
  - `src/ragpro/ingestion/document_processor.py`
- 建立 retrieval 正式模块：
  - `src/ragpro/retrieval/vector_store.py`
  - `src/ragpro/retrieval/service.py`
- 建立 generation 正式模块：
  - `src/ragpro/generation/prompts.py`
  - `src/ragpro/generation/service.py`
  - `src/ragpro/generation/llm.py`
- 建立 worker 说明：`apps/worker/README.md`
- 建立旧代码到新结构的映射文档：`docs/code-migration-map.md`
- 建立当前代码结构整理文档：`docs/current-code-structure-summary.md`

## 当前状态

正式结构已经不是空壳，FAQ、ingestion、retrieval、generation 和 API 统一入口都已有第一版代码。

## 下一步建议

1. 为 ingestion / retrieval 增加最小可运行验证脚本
2. 引入 routing 正式模块
3. 为 `/query` 增加会话历史与引用增强
4. 补 worker 任务和离线评测入口
