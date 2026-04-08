# 代码放置说明

这份文档用于说明当前 `RAGPro` 项目中，不同类型的代码应该放到哪个目录。

## 总体结构

```text
apps/
  api/
  worker/
packages/
  faq_match/
  routing/
  ingestion/
    loaders/
    cleaners/
    splitters/
  retrieval/
  generation/
  evaluation/
    datasets/
    benchmarks/
docs/
```

## 各目录用途

### `apps/api/`

放对外接口代码，例如：

- FastAPI / Flask / Django API
- `/query`
- `/ingest`
- `/reindex`
- `/health`

如果你的基础代码里有“接收用户问题并返回答案”的接口文件，优先放这里。

### `apps/worker/`

放后台任务代码，例如：

- 文档入库任务
- 重建索引任务
- 批量 embedding
- 批量 FAQ 导入

如果你的代码是离线处理、批处理、后台任务，优先放这里。

### `packages/faq_match/`

放 FAQ 精确匹配相关代码，例如：

- MySQL 问答表访问
- BM25 / 关键词匹配
- FAQ 阈值判断
- 标准答案返回逻辑

如果你的基础代码是“先查数据库问答对，再决定是否直接回答”，就放这里。

### `packages/routing/`

放查询理解和路由代码，例如：

- 意图识别
- 是否进入 RAG 的判断
- query rewrite 判断
- 检索策略选择

如果你的代码是 BERT 分类、策略选择、路由判断，就放这里。

### `packages/ingestion/loaders/`

放文档加载器代码，例如：

- PDF 加载器
- DOC / DOCX 加载器
- TXT / Markdown 加载器
- OCR 图片加载器
- PPT 加载器

### `packages/ingestion/cleaners/`

放文本清洗代码，例如：

- 去噪
- 标题提取
- 页眉页脚清理
- 格式标准化

### `packages/ingestion/splitters/`

放文本切分代码，例如：

- 中文递归切分器
- 父子块切分
- chunk metadata 组装

### `packages/retrieval/`

放检索相关代码，例如：

- embedding 模型调用
- Milvus 连接与写入
- query 检索
- hybrid search
- rerank

如果你的基础代码涉及 `Milvus`、`BGE-M3`、`bge-reranker`，主要放这里。

### `packages/generation/`

放答案生成代码，例如：

- prompt 模板
- query + evidence 拼接
- LLM 调用
- citation 输出
- 拒答 / 降级逻辑

### `packages/evaluation/datasets/`

放评测集，例如：

- FAQ 测试问题
- RAG 测试样本
- 标准答案

### `packages/evaluation/benchmarks/`

放评测脚本，例如：

- FAQ 命中率评测
- top-k 召回评测
- rerank 评测
- 答案忠实度评测

## 你现在可以怎么放代码

如果你手里的基础代码还比较零散，可以先按下面这个最实用的规则放：

1. 查 FAQ / MySQL 的代码放 `packages/faq_match/`
2. 文档解析代码放 `packages/ingestion/loaders/`
3. 文本切块代码放 `packages/ingestion/splitters/`
4. Milvus / embedding / rerank 代码放 `packages/retrieval/`
5. 调大模型生成答案的代码放 `packages/generation/`
6. 提供 HTTP 接口的代码放 `apps/api/`
7. 批量处理脚本放 `apps/worker/`

## 当前建议

如果你愿意，下一步可以直接把你的基础代码发给我，我可以继续帮你：

- 判断每个文件应该放到哪里
- 顺手帮你移动并整理命名
- 统一成第一版项目骨架
