# RAG 问答系统规划设计

更新时间：2026-04-08

## 1. 结论

需求分析阶段已经足够进入规划设计阶段。

当前我们已经明确了：

- 项目的产品目标
- 双引擎问答主链路
- FAQ 精确匹配层与 RAG 检索层的关系
- 一期与后续阶段的能力边界
- 关键技术方向：Milvus、embedding、rerank、路由、文档加载

因此，下一步不需要继续停留在“是否可做”的讨论，而应进入“如何分阶段实现”的设计与拆解。

## 2. 项目能力定义

这个项目要提供的是一个双引擎问答系统：

1. 用户输入问题。
2. 系统先尝试命中 FAQ / 标准问答库。
3. 高置信命中时直接返回标准答案。
4. 未命中时进入 RAG 检索增强链路。
5. RAG 链路通过文档检索、重排和大模型生成，给出带证据的专业回答。

这个系统既要解决：

- 高频、固定、标准化问题的快速回答

也要解决：

- 依赖知识库检索与整合的复杂专业问题

## 3. 仍待确认但不阻塞一期的问题

以下问题建议后续确认，但不阻塞一期启动：

- 目标业务领域是否固定为教育问答，还是更通用的专业知识问答。
- 首期优先支持的文档格式是否限定为 `PDF / DOCX / TXT / Markdown`。
- 是否强制要求所有回答返回引用来源。
- 知识库外问题是否允许直接走通用大模型，还是必须拒答。
- 项目部署约束是本地离线、内网部署，还是允许云模型。
- 数据规模、并发量和延迟目标是多少。

## 4. 总体设计原则

### 4.1 分层而不是堆叠

系统按职责分层：

- FAQ 精确匹配层
- 查询理解层
- RAG 检索层
- 答案生成层

### 4.2 先做闭环，再做增强

一期先做可跑通、可验证的最小闭环，不追求一次把所有策略做完。

### 4.3 检索优先于生成

首版质量的关键是召回质量、重排质量和证据组织，而不是 prompt 堆叠。

### 4.4 让复杂能力后置

意图分类模型、4 类检索策略、OCR 全格式支持属于增强能力，不应阻塞一期。

## 5. 一期 MVP 设计

## 5.1 一期目标

- FAQ 精确匹配可以直接回答高频问题。
- 文档可以完成入库、切分、向量化和检索。
- RAG 闭环可以输出带证据的回答。
- 系统具备基础健康检查和离线验证能力。

## 5.2 一期边界

一期保留：

- FAQ / MySQL 精确匹配层
- 最小 RAG 检索生成闭环
- 轻量路由能力
- rerank

一期不做：

- 完整 4 类检索策略上线
- 独立训练并上线 BERT 意图分类器
- 全量 OCR / PPT / 图片解析矩阵
- 多轮复杂 agent 编排

## 5.3 一期核心模块

### A. `faq_match`

职责：

- 存储 FAQ 问答对
- 进行关键词 / BM25 / 分词匹配
- 计算命中分数
- 高置信命中直接返回标准答案

建议说明：

- 逻辑上应视为“FAQ 精确匹配层”
- MySQL 是实现方式，不是架构本体

### B. `routing`

职责：

- 判断是否进入 RAG
- 判断是否需要 query rewrite
- 为后续升级到分类模型预留接口

首版建议：

- 规则 + prompt router

### C. `ingestion`

职责：

- 多格式文档加载
- 文本清洗与标准化
- 父块 / 子块切分
- 产出结构化文档对象

首版建议支持：

- PDF
- DOCX
- TXT
- Markdown

### D. `retrieval`

职责：

- 生成 embedding
- 将 chunk 写入 Milvus
- 接收 query 进行召回
- 执行 rerank
- 输出 top-k / top-m 候选证据

### E. `generation`

职责：

- 构造 prompt
- 注入证据片段
- 生成答案
- 输出 citations
- 当证据不足时执行拒答或降级

### F. `evaluation`

职责：

- 构建离线问答测试集
- 评估 FAQ 命中质量
- 评估检索覆盖率
- 评估 rerank 后质量
- 评估最终答案忠实度

## 5.4 一期关键数据流

1. 用户提交 `query`
2. `faq_match` 先执行 FAQ 精确匹配
3. 若命中分数超过阈值，则直接返回标准答案
4. 若未命中，则进入 `routing`
5. `routing` 判断是否需要 rewrite 或直接检索
6. `retrieval` 使用 query 召回候选 chunk
7. `reranker` 对候选结果重排
8. `generation` 使用 query + evidence 生成答案
9. 返回 `answer + route + citations + confidence`

## 5.5 一期接口边界

### `POST /query`

输入：

- `query`
- `session_id`
- `user_id`
- 可选上下文

输出：

- `answer`
- `route`
- `citations`
- `confidence`
- `debug_info`

### `POST /ingest`

输入：

- 文件上传
- 文件路径
- 文档集合标识

输出：

- 文档解析状态
- chunk 数量
- 向量化状态
- 入库状态

### `POST /reindex`

输入：

- 文档集
- 知识库版本

输出：

- 重建任务状态
- 成功/失败统计

### `GET /health`

输出：

- FAQ 层状态
- Milvus 状态
- embedding 服务状态
- rerank 服务状态
- LLM 服务状态

## 5.6 一期技术选型建议

### 向量库

- 使用 `Milvus`

理由：

- 支持 ANN
- 支持 metadata filtering
- 支持 hybrid search
- 支持 dense / sparse 演进路线
- 便于后续接入 rerank 与混合检索

### Embedding

首版建议：

- 可先用中文通用 embedding 跑通闭环

中期建议：

- 若目标明确是混合检索与中文专业问答，升级到 `BGE-M3`

### Reranker

- 建议首版即保留

理由：

- 对 top-k 精度提升显著
- 比单纯调 prompt 更直接

### FAQ 存储

- 首版可使用 MySQL

但架构理解上应始终把它视为：

- FAQ 精确匹配层

### 路由器

首版：

- 规则 + prompt router

后续：

- `bert-base-chinese` 微调分类器替换

## 6. 二期设计

二期目标是增强查询理解与召回质量。

建议加入：

- BERT 意图分类器
- query rewrite
- HyDE 假设回答检索
- 子查询拆解
- 更完整的 metadata filtering
- 会话上下文改写
- OCR / PPT / 图片解析扩展

二期关键词：

- 更强的查询理解
- 更强的召回覆盖
- 更稳的复杂问题处理

## 7. 三期设计

三期目标是把系统从“可用”提升到“工程化可持续演进”。

建议加入：

- 完整 4 类检索策略编排
- 多轮问答与上下文记忆
- 监控、灰度、A/B 测试
- 路由 / 召回 / rerank / 生成的效果评估闭环
- 知识库更新治理流程

## 8. 延后项

以下能力明确不应阻塞首版：

- 一开始就做完整 4 类检索策略
- 一开始就训练上线 BERT 分类模型
- 一开始就支持所有 OCR 与扫描件场景
- 一开始就做复杂编排器
- 一开始就建设全量自动化评测平台

## 9. 推荐目录结构

```text
RAGPro/
  apps/
    api/
    worker/
  packages/
    faq_match/
      matcher.py
      repository.py
      scorer.py
    routing/
      intent_router.py
      strategy_router.py
    ingestion/
      loaders/
      cleaners/
      splitters/
    retrieval/
      embeddings.py
      vector_store.py
      retriever.py
      reranker.py
    generation/
      prompts.py
      answer_generator.py
      citations.py
    evaluation/
      datasets/
      benchmarks/
  docs/
    rag-project-analysis.md
    planning-design.md
```

## 10. 模块职责说明

### `faq_match`

- 负责高频标准问答命中

### `routing`

- 负责决定是否进入 RAG
- 负责决定采用哪类轻量检索方式

### `ingestion`

- 负责文档加载、清洗、切块

### `retrieval`

- 负责 embedding、召回、rerank

### `generation`

- 负责 prompt、证据组织、最终答案

### `evaluation`

- 负责测试集、指标和效果回归

## 11. 风险清单

- FAQ 阈值过高或过低会造成错分流
- 文档切分质量差会直接拉低召回质量
- 候选噪声大时，rerank 效果受限
- 路由错误会让专业问题走通用回答
- 生成阶段可能出现幻觉
- OCR / PPT / 图片文档解析不稳定
- 知识库版本与索引不同步会导致回答失真

## 12. 验证计划

### 12.1 测试集建设

至少覆盖三类问题：

- 直接事实问题
- 复杂组合问题
- 知识库外问题

### 12.2 指标建议

- FAQ 命中率
- FAQ 误命中率
- top-k 覆盖率
- rerank 后 MRR / nDCG
- 答案忠实度
- 引用正确率

### 12.3 重点验证项

- 路由是否把该检索的问题送入 RAG
- FAQ 阈值是否合理
- 文档解析是否稳定
- 引用是否能映射到真实证据片段
- 总延迟是否可接受

## 13. 一期实施里程碑

### 里程碑 1：文档入库打通

- 支持基础文档加载
- 完成切分
- 写入 Milvus

### 里程碑 2：FAQ 精确匹配打通

- 建立问答表
- 完成阈值命中

### 里程碑 3：RAG 闭环打通

- query -> 检索 -> rerank -> 生成

### 里程碑 4：初版验证

- 建立测试集
- 验证 FAQ、检索和答案质量

## 14. 下一步

基于这份规划设计，下一步可以直接进入：

1. 第一版工程脚手架设计
2. 包结构与模块骨架创建
3. 一期实施任务拆分
4. API 与数据模型细化
