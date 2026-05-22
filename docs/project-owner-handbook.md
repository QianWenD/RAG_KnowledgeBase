# RAGPro 项目负责人手册

更新时间：2026-05-22

这份文档是项目接管后的管理规则草案。它不是为了增加流程负担，而是为了避免项目越接近上线越乱。

## 负责人目标

当前项目已经不只是“能跑的 demo”。负责人的目标是把它从一个本地可运行系统，稳稳推进到可维护、可验证、可上线的产品系统。

负责人要保护四件事：

- 主线代码不要被历史原型带偏。
- 本地启动和验证命令要可靠。
- RAG、权限、上传、索引重建这些关键能力不能悄悄退化。
- 新人或后续维护者能通过文档快速恢复上下文。

## 事实优先级

当文档、旧代码、记忆和当前行为冲突时，按下面顺序判断：

1. 当前运行代码和测试结果。
2. `PROJECT_MAP.md`。
3. `docs/local-startup-runbook.md`。
4. `docs/` 里的当前实现文档。
5. `packages/` 里的历史原型。
6. 截图、流程图、旧设计说明。

如果历史原型和正式代码不一致，默认以正式代码为准，除非任务明确要求恢复某个历史行为。

## 工作分类

每个任务开始前，先归类：

| 类型 | 含义 |
| --- | --- |
| 修复 | 已坏行为、回归、测试失败、启动失败 |
| 功能 | 新增用户或管理员可见能力 |
| 加固 | 安全、权限、校验、稳定性、可观测性 |
| 质量 | RAG 准确率、检索覆盖、评测改进 |
| 运维 | 启动脚本、环境、部署、文档、发布流程 |
| 迁移 | 把旧原型里有价值的能力迁移到正式结构 |

默认优先级：

1. 数据丢失、权限绕过、上传和索引重建安全、启动阻塞。
2. 失败测试或核心页面不可用。
3. RAG 正确性回归。
4. 管理员操作流程阻塞。
5. 界面打磨和历史目录清理。

## 开工标准

一个任务适合开工时，至少要能回答：

- 用户或管理员能看到什么结果。
- 影响面在哪里：API、前端、检索、上传、认证、测试、文档、运维。
- 用什么命令验证。
- 风险等级是低、中、高。

高风险范围：

- 登录、会话、权限。
- 上传路径和文件处理。
- 索引重建和删除向量。
- 向量库过滤条件。
- 会话归属。
- 查询路由和兜底逻辑。

## 完成标准

任务完成不只看“代码写完”，还要满足：

- 改动落在正确主线位置。
- 没有覆盖用户已有改动。
- 已运行对应验证命令，或者写清楚为什么暂时无法运行。
- 已检查 `git diff`，确认没有误改。
- 新增运维行为已写进项目地图、运行手册或相关文档。

## Git 规则

当前工作区可能有用户自己的改动，默认都要保护。

- 计划性功能或修复建议使用 `codex/...` 分支。
- 文档管理改动和高风险代码改动尽量分开。
- 没有明确授权，不要 reset、checkout 或删除用户改动。
- 编辑前后都看 `git status --short`。
- 不提交上传文件、日志、模型权重、测试产物、运行缓存。

## 验证门槛

文档改动：

```powershell
git diff --check
```

后端逻辑改动：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

前端页面或浏览器行为改动：

```powershell
npm run test:e2e
```

认证和权限改动：

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_auth_api tests.test_auth_service tests.test_auth_repository
npm run test:e2e
```

上传、解析、索引改动：

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_document_upload tests.test_ingestion_loaders tests.test_vector_store tests.test_api_surface
```

RAG 路由、检索、生成改动：

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_routing tests.test_generation tests.test_vector_store tests.test_api_surface
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
```

发布候选检查：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
npm run test:e2e
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

## 日常管理节奏

每天或每次接手前：

- 看 `git status --short`。
- 如果本地栈应该运行，检查 `/health`。
- 判断当前任务是否触碰认证、上传、检索或运行数据。
- 只挑一个能验证的小任务推进。

每周或上线前：

- 跑 Python 测试和前端 E2E。
- 检查 `runtime/uploads`、`tmp`、`test-results` 是否膨胀。
- 更新风险清单。
- 确认文档和实际启动方式一致。

交接前：

- 说明改了哪些文件。
- 说明跑了哪些验证。
- 说明还剩什么风险。
- 说明下一位维护者应该做什么。

## 安全和数据规则

- 不打印、不提交真实密钥。
- 文档可以列环境变量名，但不要写真实凭证。
- 开发默认账号和密码不能直接当生产配置。
- `runtime/uploads` 可能包含真实业务或个人数据，只当本地运行数据处理。
- 修改路径处理时，必须保留目录白名单和路径穿越防护。
- 修改知识源权限时，必须证明普通用户不能访问未授权知识源。

## 决策规则

- 新功能优先进入 `src/ragpro` 和 `apps/*`，不要写回旧原型。
- 小而可测的修复优先于大而模糊的重构。
- RAG 质量问题优先补评测数据，不靠主观感觉判断。
- 权限判断优先显式白名单，不靠隐式默认。
- 启动或检索降级时，优先给管理员可见诊断，不要静默失败。

## 需要暂停确认的情况

遇到这些情况先停一下，不要直接改：

- 改动可能删除或重建知识索引。
- 改动用户、账号、权限语义。
- 需要生产部署目标，但目标还没确定。
- 涉及医疗、临床或强业务权威答案。
- 用户需求和现有安全边界冲突。
