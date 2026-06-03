const authMode = document.body.dataset.authMode || "login";

const elements = {
  authStatus: document.getElementById("auth-status"),
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginSubmitBtn: document.getElementById("login-submit-btn"),
  registerForm: document.getElementById("register-form"),
  registerUsername: document.getElementById("register-username"),
  registerPassword: document.getElementById("register-password"),
  registerSubmitBtn: document.getElementById("register-submit-btn"),
};

let authDialogReturnFocus = null;

async function init() {
  bindEvents();
  await redirectIfAuthenticated();
}

function bindEvents() {
  elements.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleLogin();
  });

  elements.registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleRegister();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeErrorDialog();
    }
  });
}

async function redirectIfAuthenticated() {
  try {
    const payload = await apiJson("/auth/me");
    setStatus(`已登录为 ${payload.user.username}，正在进入工作台。`);
    window.location.replace("/");
  } catch (error) {
    if (error.status !== 401) {
      setStatus(`身份校验失败：${error.message}`, true);
    }
  }
}

async function handleLogin() {
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  if (!username || !password) {
    setStatus("请输入用户名和密码。", true);
    return;
  }

  setPending(true);
  try {
    const payload = await apiJson("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setStatus(`欢迎回来，${payload.user.username}。正在进入工作台。`);
    window.location.replace("/");
  } catch (error) {
    setStatus(`登录失败：${error.message}`, true);
  } finally {
    setPending(false);
  }
}

async function handleRegister() {
  const username = elements.registerUsername.value.trim();
  const password = elements.registerPassword.value;
  if (!username || !password) {
    setStatus("请输入注册用户名和密码。", true);
    return;
  }

  setPending(true);
  try {
    const payload = await apiJson("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setStatus(`注册成功，欢迎 ${payload.user.username}。正在进入工作台。`);
    window.location.replace("/");
  } catch (error) {
    setStatus(`注册失败：${error.message}`, true);
  } finally {
    setPending(false);
  }
}

function setPending(pending) {
  const button = authMode === "register" ? elements.registerSubmitBtn : elements.loginSubmitBtn;
  if (button) {
    button.disabled = pending;
  }
}

function setStatus(message, isError = false) {
  if (!elements.authStatus) {
    return;
  }
  if (isError) {
    const feedback = normalizeAuthErrorFeedback(message);
    elements.authStatus.textContent = `${feedback.title}，请查看弹框提示。`;
    elements.authStatus.classList.add("is-error");
    showErrorDialog(feedback.title, feedback.message);
    return;
  }
  elements.authStatus.textContent = message;
  elements.authStatus.classList.remove("is-error");
}

function normalizeAuthErrorFeedback(message) {
  const raw = String(message || "").trim();
  const title = raw.includes("身份") ? "身份校验失败" : authMode === "register" || raw.includes("注册") ? "注册失败" : "登录失败";
  const separatorIndex = raw.search(/[：:]/);
  const body = separatorIndex >= 0 ? raw.slice(separatorIndex + 1).trim() : raw;
  return {
    title,
    message: localizeHttpErrorMessage(body || raw),
  };
}

function showErrorDialog(title, message) {
  const dialog = ensureErrorDialog();
  const titleNode = dialog.querySelector("#auth-error-title");
  const messageNode = dialog.querySelector("#auth-error-message");
  const closeButton = dialog.querySelector("#auth-error-close");

  if (titleNode) {
    titleNode.textContent = title;
  }
  if (messageNode) {
    messageNode.textContent = message || "服务暂时不可用，请稍后重试。";
  }

  authDialogReturnFocus = document.activeElement;
  document.body.classList.add("auth-error-dialog-open");
  dialog.classList.remove("hidden");
  closeButton?.focus();
}

function closeErrorDialog() {
  const dialog = document.getElementById("auth-error-dialog");
  if (!dialog || dialog.classList.contains("hidden")) {
    return;
  }
  dialog.classList.add("hidden");
  document.body.classList.remove("auth-error-dialog-open");
  authDialogReturnFocus?.focus?.();
  authDialogReturnFocus = null;
}

function ensureErrorDialog() {
  let dialog = document.getElementById("auth-error-dialog");
  if (dialog) {
    return dialog;
  }

  dialog = document.createElement("div");
  dialog.id = "auth-error-dialog";
  dialog.className = "auth-error-dialog hidden";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "auth-error-title");
  dialog.innerHTML = `
    <div class="auth-error-card">
      <div class="auth-error-mark" aria-hidden="true">!</div>
      <div class="auth-error-copy">
        <p class="auth-error-kicker">登录提示</p>
        <h2 id="auth-error-title">登录失败</h2>
        <p id="auth-error-message"></p>
      </div>
      <button id="auth-error-close" class="auth-error-close" type="button">我知道了</button>
    </div>
  `;
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeErrorDialog();
    }
  });
  dialog.querySelector("#auth-error-close")?.addEventListener("click", closeErrorDialog);
  document.body.appendChild(dialog);
  return dialog;
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  return response.status === 204 ? {} : response.json();
}

async function buildHttpError(response) {
  let message = `HTTP ${response.status}`;
  try {
    const payload = await response.clone().json();
    if (payload?.detail) {
      message = normalizeHttpDetail(payload.detail);
    }
  } catch (error) {
    try {
      const text = await response.text();
      if (text) {
        message = text;
      }
    } catch (readError) {
      message = "服务暂时不可用，请稍后重试。";
    }
  }
  const wrapped = new Error(localizeHttpErrorMessage(message));
  wrapped.status = response.status;
  return wrapped;
}

function normalizeHttpDetail(detail) {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail.map(localizeValidationIssue).filter(Boolean);
    return messages.length ? messages.join("\n") : "提交内容不符合要求，请检查后重试。";
  }
  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return "服务暂时不可用，请稍后重试。";
}

function localizeValidationIssue(issue) {
  if (!issue || typeof issue !== "object") {
    return "";
  }
  const loc = Array.isArray(issue.loc) ? issue.loc.map(String) : [];
  const field = loc.includes("password") ? "密码" : loc.includes("username") ? "账号" : "输入内容";
  const minLength = issue?.ctx?.min_length || String(issue.msg || "").match(/at least (\d+)/i)?.[1];
  if (issue.type === "string_too_short" && minLength) {
    return `${field}至少需要 ${minLength} 位。`;
  }
  if (issue.type === "missing") {
    return `请填写${field}。`;
  }
  return localizeHttpErrorMessage(issue.msg || "");
}

function localizeHttpErrorMessage(message) {
  const raw = String(message || "").trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      return normalizeHttpDetail(JSON.parse(raw));
    } catch (error) {
      // Fall through to the text-based mappings below.
    }
  }
  const normalized = raw.replace(/[.\u3002]\s*$/, "").toLowerCase();
  const exactMessages = {
    "invalid username or password": "用户名或密码不正确。",
    "account is disabled": "账号已停用，请联系管理员。",
    "authentication required": "登录状态已失效，请重新登录。",
    "username already exists": "用户名已存在，请换一个账号名。",
  };
  if (exactMessages[normalized]) {
    return exactMessages[normalized];
  }
  const usernameMinMatch = raw.match(/Username must be at least (\d+) characters long/i);
  if (usernameMinMatch) {
    return `用户名至少需要 ${usernameMinMatch[1]} 位。`;
  }
  const passwordMinMatch = raw.match(/Password must be at least (\d+) characters long/i);
  if (passwordMinMatch) {
    return `密码至少需要 ${passwordMinMatch[1]} 位。`;
  }
  if (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html")) {
    return "服务暂时不可用，请稍后重试。";
  }
  return raw || "服务暂时不可用，请稍后重试。";
}

init();
