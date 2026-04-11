# 主干线程交接总结

更新时间：2026-04-10

## 本次整理目的

这条主干线程已经持续时间过长，累计上下文和子线程很多，继续在这里推进开发会明显加快 token 消耗。

因此这份文档只做三件事：

- 汇总当前项目状态
- 汇总已有文档入口
- 给出后续新线程拆分建议

## 当前项目稳定状态

截至当前，项目已经具备这些正式能力：

- 登录、注册、退出、改密
- 管理员创建用户、重置密码、删除用户
- 基于 `source` 的权限控制
- FAQ + RAG 统一问答链路
- 文档上传与重建索引
- Milvus 联调
- 多页面后台
- 权限管理拆页
- 审计日志页与审计接口

当前主要页面：

- `/`
- `/qa`
- `/knowledge`
- `/knowledge/reindex`
- `/knowledge/sources`
- `/users`
- `/users/access`
- `/users/security`
- `/users/audit`
- `/login`
- `/register`

当前主要后端能力：

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `GET /auth/users`
- `POST /auth/users`
- `PATCH /auth/users/{user_id}/access`
- `POST /auth/users/{user_id}/reset-password`
- `DELETE /auth/users/{user_id}`
- `GET /auth/audit-logs`
- `POST /query`
- `POST /documents/upload`
- `POST /reindex`

## 本轮最后收口结果

本轮主要收在权限与审计侧：

- 审计日志页保留为稳定可运行状态
- 审计日志接口支持基础筛选：
  - `action`
  - `search`
  - `sensitive_only`
  - `limit`
- 审计页前端支持：
  - 动作类型筛选
  - 账号关键词筛选
  - 只看高风险动作
  - URL 参数同步

本轮已验证：

- `node --check apps/web/users_audit.js`
- `python -m unittest tests.test_auth_api tests.test_api_surface`
- 当前共 `42` 个针对性测试通过

说明：

- 之前更大范围的完整测试在主线开发期已经跑过，最近一次全量记录见 [formalization-progress.md](D:/dc/gz/codexItem/RAGPro/docs/formalization-progress.md)
- 这次为了节省 token，没有重新跑整仓全量测试，只做了本轮改动相关的 targeted 回归

## 文档入口汇总

建议优先读这些：

1. [new-thread-kickoff-brief.md](D:/dc/gz/codexItem/RAGPro/docs/new-thread-kickoff-brief.md)
   新线程启动摘要，包含 token 消耗原因和可复制的起始词模板。

2. [phase-one-status-summary.md](D:/dc/gz/codexItem/RAGPro/docs/phase-one-status-summary.md)
   一期能力总结，偏产品和阶段结果。

3. [formalization-progress.md](D:/dc/gz/codexItem/RAGPro/docs/formalization-progress.md)
   正式化收敛进度，偏工程实现和验证结果。

4. [frontend-page-architecture.md](D:/dc/gz/codexItem/RAGPro/docs/frontend-page-architecture.md)
   前端页面拆分后的信息架构说明。

5. [milvus-feasibility-report.md](D:/dc/gz/codexItem/RAGPro/docs/milvus-feasibility-report.md)
   Milvus 本机可行性与部署路线说明。

6. [milvus-lite-wsl-setup.md](D:/dc/gz/codexItem/RAGPro/docs/milvus-lite-wsl-setup.md)
   WSL 下 Milvus Lite 验证记录。

7. [current-code-structure-summary.md](D:/dc/gz/codexItem/RAGPro/docs/current-code-structure-summary.md)
   当前代码结构整理。

8. [code-migration-map.md](D:/dc/gz/codexItem/RAGPro/docs/code-migration-map.md)
   旧结构到正式结构的映射关系。

## token 消耗结论

本机 Codex 状态库中已经能直接看到这条主干线程和相关子线程的高消耗：

- 主线程 `tokens_used` 约 `185,840,069`
- 子线程 `Darwin` 约 `107,192,836`
- 子线程 `Curie` 约 `37,715,590`
- 主线程会话文件约 `31.56 MB`
- 主线程事件数约 `10,112`
- 主线程模型为 `gpt-5.4`
- 主线程推理强度为 `xhigh`

结论：

- 上下文过长是首因
- `xhigh` 推理强度是明显放大器
- 多子线程并行会叠加消耗
- 整文件读取、页面反复重构、测试输出会让上下文越滚越厚

## 后续建议的线程拆分

建议后续不要再沿用当前主干线程继续推进，而是拆成下面 5 条新线程：

### 线程 1：权限与用户管理

负责内容：

- 用户管理
- 角色与来源授权
- 审计日志
- 安全操作页

建议入口文件：

- `apps/api/main.py`
- `src/ragpro/auth/service.py`
- `src/ragpro/auth/repository.py`
- `apps/web/users*.html`
- `apps/web/users*.js`

### 线程 2：前端体验与后台结构

负责内容：

- 页面结构优化
- 页面拆分
- 交互体验
- 空状态、导航、表单体验

建议入口文件：

- `apps/web/`
- `docs/frontend-page-architecture.md`

### 线程 3：知识运营与上传入库

负责内容：

- 上传文档
- 重建索引
- 数据源管理
- 知识运营后台

建议入口文件：

- `apps/web/knowledge*.html`
- `apps/web/knowledge*.js`
- `src/ragpro/ingestion/`
- `apps/worker/`

### 线程 4：RAG 检索与回答质量

负责内容：

- 检索召回
- rerank
- prompt
- 答案质量
- 评测集扩充

建议入口文件：

- `src/ragpro/retrieval/`
- `src/ragpro/generation/`
- `src/ragpro/routing/`
- `src/ragpro/evaluation/`

### 线程 5：环境、部署与运行诊断

负责内容：

- Milvus 运行
- WSL / Docker / 部署方案
- 健康检查
- diagnostics
- 启动脚本

建议入口文件：

- `scripts/`
- `src/ragpro/runtime/`
- `README.md`

## 推荐执行顺序

如果要最省 token，我建议：

1. 先停止在这条主线程继续堆需求
2. 新开单一目标线程
3. 每条线程只处理一个模块，不混前端、权限、RAG、部署
4. 默认按 `medium` 强度推进
5. 非必要不要再开子线程

## 建议的第一优先级新线程

如果你马上要继续，我建议优先开这条：

- 权限与用户管理线程

原因：

- 你最近就在做这块
- 页面和接口都已经成形
- 继续做搜索、筛选、审计、用户治理时最适合独立推进
- 和 RAG 检索主链耦合最小

## 可直接复用的新线程文案

直接使用这里的文案作为新线程起点：

- [new-thread-kickoff-brief.md](D:/dc/gz/codexItem/RAGPro/docs/new-thread-kickoff-brief.md)

## 一句话总结

项目本身已经进入“可拆模块稳定推进”的阶段，不适合再继续用这条超长主干线程滚动开发；最合理的做法是从现在开始按模块切新线程，使用摘要文档接力。
