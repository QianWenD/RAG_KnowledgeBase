# 新线程启动摘要

更新时间：2026-04-10

## 为什么建议切新线程

当前这条主线程已经明显过重，不适合继续长期滚动开发。

本机 Codex 状态库中的直接证据：

- 主线程 `tokens_used` 约为 `185,840,069`
- 项目相关大子线程 `Darwin` 约为 `107,192,836`
- 项目相关另一子线程 `Curie` 约为 `37,715,590`
- 主线程会话文件约 `31.56 MB`
- 主线程会话事件数约 `10,112`
- 主线程模型为 `gpt-5.4`
- 主线程推理强度为 `xhigh`

结论：

- 上下文过长是首因
- `xhigh` 推理强度明显放大了消耗
- 多次开子线程也会叠加消耗
- 大量整文件读取、页面重构、测试输出，会让每轮上下文越来越厚

## 新线程怎么开最省

建议以后按模块拆线程，而不是继续把所有事放在同一条里：

- 前端页面与交互
- 认证、权限与用户管理
- 知识运营与文档入库
- RAG 检索与回答质量
- 运维、部署与环境联调

建议规则：

- 日常开发优先 `medium`
- 只有复杂架构、疑难 bug、深度审查才用 `high/xhigh`
- 新线程只带摘要文档，不继承整条长历史
- 少开子代理，只有任务边界很清楚时再开
- 少读整文件，多读局部函数或 diff

## 当前项目状态

项目已经不是原型壳子，当前具备这些正式能力：

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

当前重点文件：

- [API 入口](D:/dc/gz/codexItem/RAGPro/apps/api/main.py)
- [认证服务](D:/dc/gz/codexItem/RAGPro/src/ragpro/auth/service.py)
- [认证仓储](D:/dc/gz/codexItem/RAGPro/src/ragpro/auth/repository.py)
- [用户总览页](D:/dc/gz/codexItem/RAGPro/apps/web/users.html)
- [角色与授权页](D:/dc/gz/codexItem/RAGPro/apps/web/users_access.html)
- [安全操作页](D:/dc/gz/codexItem/RAGPro/apps/web/users_security.html)
- [审计日志页](D:/dc/gz/codexItem/RAGPro/apps/web/users_audit.html)

当前补充文档：

- [一期状态](D:/dc/gz/codexItem/RAGPro/docs/phase-one-status-summary.md)
- [正式化进度](D:/dc/gz/codexItem/RAGPro/docs/formalization-progress.md)
- [前端页面架构](D:/dc/gz/codexItem/RAGPro/docs/frontend-page-architecture.md)

## 新线程通用起始词

下面这段可以直接复制到新线程：

```text
请基于以下已知状态继续工作，不要回顾整条旧线程历史。

项目：D:\dc\gz\codexItem\RAGPro

先读这三个文档建立上下文：
1. docs/new-thread-kickoff-brief.md
2. docs/formalization-progress.md
3. docs/frontend-page-architecture.md

补充事实：
- 当前项目已经有登录、注册、权限、source 级访问控制
- 权限后台已拆成 /users、/users/access、/users/security、/users/audit
- 审计日志接口已存在：GET /auth/audit-logs
- API 主入口在 apps/api/main.py
- 前端是原生 HTML/CSS/JS + FastAPI 静态挂载

本次只处理这个目标：
[在这里写本次单一目标]

要求：
- 先只读相关文件，不要扫描整个仓库
- 优先改最少文件
- 非必要不要开子代理
- 默认用 medium 推理强度思路工作
- 完成后告诉我：改了哪些文件、验证了什么、下一步建议是什么
```

## 针对不同模块的起始词模板

### 1. 前端线程

```text
请只处理前端页面与交互。先读：
- docs/new-thread-kickoff-brief.md
- docs/frontend-page-architecture.md

再只看这些目录：
- apps/web
- apps/api/main.py 中与页面路由相关的部分

不要改后端业务逻辑，除非页面必须新增一个很小的接口。
```

### 2. 权限线程

```text
请只处理认证、权限、审计日志相关功能。先读：
- docs/new-thread-kickoff-brief.md
- apps/api/main.py
- src/ragpro/auth/service.py
- src/ragpro/auth/repository.py
- apps/web/users.html
- apps/web/users_access.html
- apps/web/users_security.html
- apps/web/users_audit.html

不要碰 RAG 检索和知识运营模块。
```

### 3. RAG 线程

```text
请只处理 RAG 检索、Milvus、文档入库和回答质量。先读：
- docs/new-thread-kickoff-brief.md
- docs/formalization-progress.md

再只看这些目录：
- src/ragpro/ingestion
- src/ragpro/retrieval
- src/ragpro/generation
- src/ragpro/routing
- apps/worker

不要改认证和前端后台管理模块。
```

## 我建议你现在怎么做

如果你准备继续推进，最省 token 的方式是：

1. 先结束这条长线程的主开发用途
2. 新开一条只处理单一目标的线程
3. 把上面的“新线程通用起始词”贴进去
4. 只给一个目标，不要在同一条里混前端、权限、RAG、部署

## 当前可直接验证的地址

- [首页](http://127.0.0.1:8000/)
- [问答页](http://127.0.0.1:8000/qa)
- [知识上传页](http://127.0.0.1:8000/knowledge)
- [用户总览页](http://127.0.0.1:8000/users)
- [授权页](http://127.0.0.1:8000/users/access)
- [安全页](http://127.0.0.1:8000/users/security)
- [审计页](http://127.0.0.1:8000/users/audit)
