# Gemini 前端 redesign 试点说明

## 当前结论

可以让 Gemini 参与前端页面重新设计，但建议先让它做“设计方案 + HTML/CSS 草案”，不要直接让它改仓库代码。

更稳妥的分工是：

1. Gemini 负责提出视觉方向、页面结构建议和 CSS/HTML 草案。
2. Codex 负责检查是否符合现有功能钩子、测试约束和项目风格。
3. 通过一个页面试点后，再扩展到其他页面。

## 本次试点页面

建议先选登录页：

```text
页面地址：/login
页面文件：apps/web/login.html
脚本文件：apps/web/auth.js
样式文件：apps/web/styles.css
```

原因：

- 页面相对独立，风险低。
- 可以快速判断 Gemini 的视觉能力。
- 不容易影响 QA、上传、权限等复杂业务流程。
- 当前登录逻辑已经稳定，适合做视觉改版试点。

## 不能破坏的功能钩子

Gemini 输出方案时必须保留以下内容，否则会影响现有登录逻辑和测试：

```html
<body class="auth-page login-page" data-auth-mode="login">
<div id="auth-status" ...>
<form id="login-form" ...>
<input id="login-username" ...>
<input id="login-password" ...>
<button id="login-submit-btn" ...>
<script src="/static/auth.js?v=20260427-login-fix"></script>
```

还要保留：

- `autocomplete="username"`
- `autocomplete="current-password"`
- `role="status"`
- `aria-live="polite"`

当前登录页不展示注册链接，不要擅自加回 `/register` 入口。

## 给 Gemini 的完整提示词

下面这段可以直接复制给 Gemini：

```text
你是一个资深产品 UI/UX 设计师和前端工程师。请帮我重新设计一个中文企业级 RAG 知识库系统的登录页。

系统名称：RAGPro
系统定位：中文智能知识问答与知识库管理系统，用于企业内部知识上传、权限管理、智能问答、审计和检索增强生成。
目标用户：企业管理员、知识运营人员、业务问答使用者。

本次只改登录页视觉，不改登录逻辑。

当前页面文件：apps/web/login.html
当前脚本文件：apps/web/auth.js
当前样式文件：apps/web/styles.css
页面地址：/login

必须保留这些功能钩子，不允许改 id、data 属性、autocomplete、role、aria-live：

<body class="auth-page login-page" data-auth-mode="login">
<div id="auth-status" class="upload-result auth-notice" role="status" aria-live="polite">请输入账号和密码。</div>
<form id="login-form" class="auth-form auth-form-solo">
<input id="login-username" type="text" autocomplete="username" placeholder="请输入登录账号">
<input id="login-password" type="password" autocomplete="current-password" placeholder="请输入登录密码">
<button id="login-submit-btn" class="send-btn" type="submit">登录</button>
<script src="/static/auth.js?v=20260427-login-fix"></script>

当前登录页不展示注册链接，请不要加回“注册账号”入口。

设计要求：
1. 设计方向要适合企业知识中台，不要做成普通 SaaS 模板。
2. 不要使用常见的紫色渐变、Inter/Roboto/Arial/system 默认字体方案。
3. 可以保留中文字体 Noto Sans SC / Noto Serif SC，也可以提出更适合中文后台系统的字体搭配。
4. 页面要有明确视觉记忆点，例如“知识档案室、检索雷达、企业知识地图、冷静科技感”等，但不要浮夸。
5. 移动端和桌面端都要可用。
6. 登录表单必须清晰、可访问、对比度足够。
7. 动效只做 CSS 级轻量动效，不要引入新的第三方 JS。
8. 尽量以追加或替换 CSS 为主，HTML 可以小幅调整，但不得破坏功能钩子。

请输出：
1. 设计概念说明，100-200 字。
2. 推荐的页面结构调整。
3. 可以直接放入 login.html 的 HTML 草案。
4. 可以追加到 styles.css 末尾的 CSS 草案。
5. 响应式和可访问性注意事项。
6. 哪些地方必须由现有项目工程师二次确认。

请不要只给抽象建议，要给可落地的 HTML/CSS。
```

## Gemini 返回后怎么验收

拿到 Gemini 的结果后，不要直接复制进项目，先按下面标准检查：

1. 是否保留所有功能钩子。
2. 是否没有新增不必要的外部 CDN 或第三方 JS。
3. 是否没有把注册链接加回登录页。
4. 是否兼容桌面和手机。
5. 是否与 `auth.js` 登录逻辑兼容。
6. 是否能通过现有测试：

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_surface tests.test_frontend_smoke -v
npm run test:e2e
```

## 试点通过后的下一步

如果登录页试点效果好，再按顺序尝试：

1. 首页 Dashboard：验证整体视觉语言。
2. QA 工作台：验证复杂交互和问答区布局。
3. 知识上传页：验证表单、进度、文件列表和操作反馈。
4. 用户权限页：验证复杂后台表格和管理弹窗。

每次只改一个页面，跑完测试再进入下一个页面。
