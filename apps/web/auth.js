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
  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("is-error", Boolean(isError));
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
    const payload = await response.json();
    if (payload?.detail) {
      message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
    }
  } catch (error) {
    const text = await response.text();
    if (text) {
      message = text;
    }
  }
  const wrapped = new Error(message);
  wrapped.status = response.status;
  return wrapped;
}

init();