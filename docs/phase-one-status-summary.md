# 一期状态整理

更新时间：2026-04-09

## 当前结论

一期 MVP 的主体已经完成，项目已经不再是“设计稿”或“空壳脚手架”，而是一个可以本地运行、上传文档、进行问答、做离线 smoke 评测的首版系统。

更准确地说：

- 一期核心能力已完成
- 一期收尾项还剩少量工程化工作
- 当前最适合的节奏是“先收尾一期，再进入二期增强”

## 一期已完成内容

### 1. 正式工程结构

已经收敛到正式目录，不再依赖早期演进目录继续叠功能：

- `src/ragpro/config`
- `src/ragpro/faq_match`
- `src/ragpro/routing`
- `src/ragpro/ingestion`
- `src/ragpro/retrieval`
- `src/ragpro/generation`
- `src/ragpro/conversation`
- `src/ragpro/evaluation`
- `apps/api`
- `apps/web`
- `apps/worker`

### 2. FAQ 精确匹配层

已完成：

- MySQL FAQ 仓储
- Redis 缓存
- BM25 匹配
- FAQ 高置信命中后直接返回
- FAQ 命中率、标准问句命中率、FAQ 分数阈值评测

### 3. 最小 RAG 闭环

已完成：

- 文档加载
- 父子块切分
- 向量写入
- 检索召回
- rerank
- 基于证据的答案生成
- citations 返回
- 无证据时的受控降级

### 4. 轻量路由

已完成：

- FAQ 优先分流
- 通用对话分流
- RAG 分流
- `direct / rewrite / decompose / hyde` 策略标记
- 概念型问句的轻量 query expansion

### 5. 多轮会话与 API

已完成：

- `POST /query`
- `POST /faq/query`
- `POST /sessions`
- `GET /sessions/{session_id}/history`
- `DELETE /sessions/{session_id}/history`
- SSE 流式回答
- 历史压缩和短追问改写
- 结构化 `confidence`
- 结构化 `debug_info`
- 轻量 `/health`
- 详细 `/diagnostics`

### 6. 文档上传与索引重建

已完成：

- `POST /documents/upload`
- `POST /reindex`
- 上传后立即进入现有 ingestion + retrieval 链路
- 文档类型白名单、文件名净化、大小限制
- 安全目录白名单
- 按 `source` 替换或追加索引

当前支持的主要格式：

- `pdf`
- `docx`
- `txt`
- `md`
- `html`
- `ppt/pptx`

### 7. 前端控制台

已完成：

- 问答控制台
- 会话创建与历史查看
- 路由、策略、后端、引用展示
- 文档上传面板
- 拖拽上传
- 上传进度条
- 最近上传记录列表

### 8. 本机运行环境

已完成：

- 本地 `.venv`
- WSL 下 `Milvus Lite` 验证
- WSL 下 `Milvus Standalone` 联调
- Windows 侧直连 Milvus
- `MySQL / Redis / Ollama / Milvus` 基础联调

### 9. 离线评测基础骨架

已完成：

- 结构化评测数据集读取
- 本地评测执行器
- `route / keywords / citations / retrieval_backend` 基础检查
- `retrieval_strategy / citation_sources / top_citation / context_count / fallback` 扩展检查
- `top-k 命中 / rerank-top1` 检索质量检查
- `answer_fidelity / answer_safety` 忠实度与安全性检查
- `tag_breakdown` 业务标签维度统计
- JSON 报告输出
- `phase_one_smoke.json` smoke 数据集
- `phase_one_regression.json` 回归数据集
- `current_domain_regression.json` 当前业务扩展集（`10` 个样例）
- `domain_regression_template.json` 通用业务模板
- 按 `general / faq / rag / source_filter / conversation / fallback` 分类统计
- `check_summary / category_breakdown / failure_breakdown` 汇总报告

## 当前验证状态

当前已经完成这些验证：

- `53` 个自动化测试通过
- `/`
- `/health`
- `/diagnostics`
- `/sources`
- `/query`
- `/documents/upload`
- `/reindex`
- 前端静态资源加载
- 文档上传后立即可检索
- WSL Milvus 联调通过
- 离线 smoke 评测通过
- 离线 regression 评测通过（当前真实回归 `6/6`，`faq_hit / faq_question / faq_score / route / strategy / citations / top_citation / topk_retrieval / rerank_top1 / answer_fidelity / answer_safety / fallback` 全通过）
- 当前业务扩展集评测通过（`current-domain-regression` 当前真实回归 `10/10`）

## 一期还没做完的内容

### 1. 评测体系还可以继续深化

现在已经有 smoke 与 regression 两套数据集，以及分类汇总指标，但还缺：

 - 更多业务域的样本集

### 2. 运行时诊断还可以继续深化

当前已经完成了 `/health` 与 `/diagnostics` 的职责拆分，但后面还可以继续增强：

- 更细的 readiness 分级
- 更多依赖项诊断
- 更适合生产观测的状态码和告警信号

## 现在是否可以进入二期

可以，但更建议先把一期收尾项补齐，再进二期。

原因很简单：

- 核心链路已经有了
- 现在继续堆 BERT、多策略编排、复杂分类器，收益不会比先补评测和接口契约更高

## 建议的下一步顺序

1. 继续深化评测指标与数据集规模
2. 再进入二期的分类器与更复杂策略编排
3. 继续增强生产联调和可观测性细节

## 一句话状态

当前项目已经完成了一期 MVP 的主体，并且具备真实运行、上传文档、重建索引和离线评测的基础能力；剩下的主要是一期收尾，而不是从零开始的大块功能缺口。
## 新增完成项：认证与权限

已完成：

- 账号注册、登录、登出
- `HttpOnly Cookie` 会话
- 首个账号自动成为管理员
- 普通用户默认按管理员授权后的来源范围访问
- 管理员可调整 `role / allowed_sources / is_active`
- 基于 `source` 的访问限制
- 用户级会话历史隔离
- 前端登录与权限管理面板

## 当前验证补充

- 当前自动化测试总数：`73`
- 真实注册、登录、来源限制、管理员授权已完成联调

## 认证权限补充能力

新增完成：

- 管理员创建用户
- 管理员重置密码
- 前端管理员创建用户表单
- 前端管理员重置密码入口
