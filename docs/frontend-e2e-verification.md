# 前端 E2E 验证说明

本项目使用 Playwright 做浏览器层的前端 smoke 验证。测试集刻意保持小而聚焦，主要覆盖当前由 FastAPI 挂载的原生 HTML/CSS/JS 前端。

## 前置条件

运行 E2E 测试前，先启动 API：

```powershell
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

安装 Node 依赖以及 Playwright 使用的 Chromium 浏览器：

```powershell
npm install
npm run test:e2e:install
```

## Mock 前端 Smoke 测试

运行默认的浏览器 smoke 测试集：

```powershell
npm run test:e2e
```

这一组测试会在浏览器侧 mock 已认证 API 响应，不会写入数据库。当前覆盖内容包括：

- QA 输入区的字数计量、来源提示和提示词建议行为
- 选择文件后的知识上传流程状态
- 审计日志快捷时间筛选写入 `start_at` 和 `end_at`
- 用户访问控制中的角色、来源和启用状态保存请求
- 用户安全页中的创建、启停、重置密码和删除请求
- 登录与注册表单提交的数据，以及成功跳转行为

## 真实权限与审计链路测试

真实 E2E 测试是可选项，因为它会向配置好的 MySQL 数据库写入数据。默认情况下不会执行。

推荐模式会自动创建临时管理员账号，并在测试结束后删除所有 `e2e_` 用户及对应审计记录：

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```

两种 live 模式都会清理当前测试运行所使用的 `e2e_` 前缀用户，以及 actor 或 target username 带有相同前缀的审计记录。

这条 live 流程用于验证完整的权限与审计链路：

- 临时管理员通过真实 `/auth/login` 接口登录
- 通过 `/users/security` 创建专用 `e2e_*` 用户
- 通过 `/users/access` 更新来源权限
- 通过 `/users/security` 重置密码
- 通过 `/users/security` 删除测试用户
- 查询 `/auth/audit-logs`，确认 `admin_create_user`、`update_user_access`、`reset_password` 和 `delete_user` 都被记录

如果你更希望使用现有管理员账号，而不是让测试自建临时管理员，可以显式指定账号密码：

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_ADMIN_USERNAME = "your_admin_username"
$env:RAGPRO_E2E_ADMIN_PASSWORD = "your_admin_password"
npm run test:e2e:live
```

日常本地验证建议优先用自建临时管理员模式。这样不需要共享真实管理员凭据，而且会自动清理自己的测试数据，包括临时管理员账号本身。

## Python 回归测试

浏览器测试与现有 Python 测试是互补关系。前端或权限相关改动较大时，建议两组都跑：

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
npm run test:e2e
```

当你需要确认真实数据库支撑的权限与审计链路仍然可用时，再执行 live 测试：

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```
