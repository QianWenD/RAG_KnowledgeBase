(function () {
  const PAGE_META = {
    dashboard: { label: "总览" },
    qa: { label: "问答工作台" },
    knowledge: { label: "知识运营" },
    users: { label: "权限管理" },
  };

  const state = {
    user: null,
    sources: [],
    currentPage: document.body.dataset.page || "dashboard",
    currentPageLabel: document.body.dataset.pageLabel || "",
    currentPageView: document.body.dataset.pageView || "",
  };

  ensureAppChrome();
  ensureSidebarNavigation();

  const elements = {
    appUserName: document.getElementById("app-user-name"),
    appRoleChip: document.getElementById("app-role-chip"),
    chromeMenuToggle: document.getElementById("chrome-menu-toggle"),
    chromeLogoutBtn: document.getElementById("chrome-logout-btn"),
    authBadge: document.getElementById("auth-badge"),
    authSummary: document.getElementById("auth-summary"),
    authUserCard: document.getElementById("auth-user-card"),
    authUsername: document.getElementById("auth-username"),
    authRole: document.getElementById("auth-role"),
    authSourceTags: document.getElementById("auth-source-tags"),
    authRefreshBtn: document.getElementById("auth-refresh-btn"),
    changePasswordBtn: document.getElementById("change-password-btn"),
    logoutBtn: document.getElementById("logout-btn"),
    pageStatus: document.getElementById("page-status"),
    pageBreadcrumbCurrent: document.getElementById("page-breadcrumb-current"),
    navLinks: Array.from(document.querySelectorAll("[data-nav]")),
    adminNavItems: Array.from(document.querySelectorAll("[data-admin-nav]")),
    sectionLinks: Array.from(document.querySelectorAll("[data-section-link]")),
    moduleLinks: Array.from(document.querySelectorAll("[data-module-nav]")),
  };

  const helpers = {
    apiJson,
    buildHttpError,
    setStatus,
    escapeHtml,
    formatBytes,
    populateSourceSelect,
    renderEmptyState,
    getState: () => state,
    isAdmin: () => state.user?.role === "admin",
  };

  window.RagProCommon = {
    state,
    helpers,
    refreshSession,
    loadSources,
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindCommonEvents();
    renderPageMeta();
    markActiveNav();
    markActiveModuleNav();
    bindSectionNav();
    await refreshSession();
    await loadSources();
    if (window.RagProPage?.init) {
      await window.RagProPage.init({ state, helpers, elements });
    }
  }

  function bindCommonEvents() {
    elements.logoutBtn?.addEventListener("click", handleLogout);
    elements.chromeLogoutBtn?.addEventListener("click", handleLogout);
    elements.authRefreshBtn?.addEventListener("click", () => refreshSession(true));
    elements.changePasswordBtn?.addEventListener("click", changeOwnPassword);
    elements.chromeMenuToggle?.addEventListener("click", toggleSidebar);
  }

  function renderPageMeta() {
    const meta = PAGE_META[state.currentPage] || PAGE_META.dashboard;
    if (elements.pageBreadcrumbCurrent) {
      elements.pageBreadcrumbCurrent.textContent = state.currentPageLabel || meta.label;
    }
  }

  function markActiveNav() {
    for (const link of elements.navLinks) {
      const isActive = link.dataset.nav === state.currentPage;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function bindSectionNav() {
    if (!elements.sectionLinks.length) {
      return;
    }
    for (const link of elements.sectionLinks) {
      link.addEventListener("click", () => {
        window.setTimeout(markActiveSectionLink, 0);
      });
    }
    window.addEventListener("hashchange", markActiveSectionLink);
    markActiveSectionLink();
  }

  function markActiveModuleNav() {
    if (!elements.moduleLinks.length) {
      return;
    }
    for (const link of elements.moduleLinks) {
      const isActive = link.dataset.moduleNav === state.currentPageView;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function markActiveSectionLink() {
    if (!elements.sectionLinks.length) {
      return;
    }
    const currentHash = window.location.hash || elements.sectionLinks[0].getAttribute("href");
    for (const link of elements.sectionLinks) {
      const isActive = link.getAttribute("href") === currentHash;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  async function refreshSession(showStatus = false) {
    try {
      const payload = await apiJson("/auth/me", { skipAuthRedirect: true });
      state.user = payload.user;
      applyAuthState();
      if (showStatus && payload.user) {
        setStatus(`已刷新登录状态：${payload.user.username}`);
      }
    } catch (error) {
      state.user = null;
      applyLoggedOutState();
      if (error.status === 401) {
        window.location.replace("/login");
        return;
      }
      setStatus(`身份校验失败：${error.message}`, true);
    }
  }

  async function loadSources() {
    if (!state.user) {
      state.sources = [];
      return [];
    }
    try {
      const payload = await apiJson("/sources");
      state.sources = payload.sources || [];
      return state.sources;
    } catch (error) {
      state.sources = [];
      setStatus(`加载来源失败：${error.message}`, true);
      return [];
    }
  }

  function applyAuthState() {
    const user = state.user;
    if (!user) {
      return;
    }

    const isAdmin = user.role === "admin";
    if (elements.authBadge) {
      elements.authBadge.textContent = isAdmin ? "管理员" : "已登录";
      elements.authBadge.classList.add("is-ok");
    }
    if (elements.appUserName) {
      elements.appUserName.textContent = user.username;
    }
    if (elements.appRoleChip) {
      elements.appRoleChip.textContent = isAdmin ? "管理员" : "普通用户";
      elements.appRoleChip.classList.add("is-ok");
    }
    if (elements.authSummary) {
      elements.authSummary.innerHTML = isAdmin
        ? '<p class="note">当前账号具备知识运营与权限治理能力，可以上传文档、重建索引并维护用户访问范围。</p>'
        : '<p class="note">当前账号已登录。系统会按你的来源授权范围过滤知识内容，未授权来源不会出现在业务操作里。</p>';
    }
    elements.authUserCard?.classList.remove("hidden");
    if (elements.authUsername) {
      elements.authUsername.textContent = user.username;
    }
    if (elements.authRole) {
      elements.authRole.textContent = `角色：${user.role}`;
    }
    renderSourceTags(user.allowed_sources || []);
    for (const item of elements.adminNavItems) {
      item.classList.toggle("hidden", !isAdmin);
    }
  }

  function applyLoggedOutState() {
    if (elements.authBadge) {
      elements.authBadge.textContent = "未登录";
      elements.authBadge.classList.remove("is-ok");
    }
    if (elements.appUserName) {
      elements.appUserName.textContent = "未登录";
    }
    if (elements.appRoleChip) {
      elements.appRoleChip.textContent = "会话失效";
      elements.appRoleChip.classList.remove("is-ok");
    }
    if (elements.authSummary) {
      elements.authSummary.innerHTML = '<p class="note">当前会话不可用，系统将自动跳转到登录页。</p>';
    }
    elements.authUserCard?.classList.add("hidden");
    renderSourceTags([]);
  }

  async function handleLogout() {
    try {
      await apiJson("/auth/logout", { method: "POST" });
      window.location.replace("/login");
    } catch (error) {
      setStatus(`退出登录失败：${error.message}`, true);
    }
  }

  function toggleSidebar() {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    elements.chromeMenuToggle?.setAttribute("aria-pressed", String(collapsed));
  }

  function ensureAppChrome() {
    if (!document.body.classList.contains("console-page") || document.querySelector(".app-header")) {
      return;
    }

    const meta = PAGE_META[state.currentPage] || PAGE_META.dashboard;
    const currentLabel = state.currentPageLabel || meta.label;
    const header = document.createElement("header");
    header.className = "app-header";
    header.innerHTML = `
      <div class="app-header-left">
        <span class="app-logo-mark" aria-hidden="true"></span>
        <div class="app-brand-title">
          <strong>知识库 &amp; 规则库</strong>
          <span>${escapeHtml(currentLabel)}</span>
        </div>
        <button id="chrome-menu-toggle" class="chrome-menu-button" type="button" aria-label="展开或收起侧边导航" aria-pressed="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="app-header-right">
        <span id="app-role-chip" class="status-chip">检查中</span>
        <strong id="app-user-name">正在校验</strong>
        <button id="chrome-logout-btn" class="app-exit-button" type="button">退出</button>
      </div>
    `;

    const shell = document.querySelector(".shell");
    document.body.insertBefore(header, shell || document.body.firstChild);
  }

  function ensureSidebarNavigation() {
    const navPanel = document.querySelector(".nav-panel");
    if (!document.body.classList.contains("console-page") || !navPanel || navPanel.dataset.sidebarNav === "grouped") {
      return;
    }

    navPanel.dataset.sidebarNav = "grouped";
    navPanel.innerHTML = `
      <nav class="side-nav" aria-label="后台主导航">
        <details class="side-nav-group" open>
          <summary>基础库</summary>
          <div class="side-nav-list">
            <a class="nav-link" data-nav="dashboard" href="/">总览</a>
          </div>
        </details>
        <details class="side-nav-group" open>
          <summary>知识库</summary>
          <div class="side-nav-list">
            <a class="nav-link" data-nav="qa" href="/qa">问答工作台</a>
            <a class="nav-link" data-module-nav="knowledge-upload" href="/knowledge">上传入库</a>
            <a class="nav-link" data-module-nav="knowledge-reindex" href="/knowledge/reindex">重建索引</a>
          </div>
        </details>
        <details class="side-nav-group" open data-admin-nav>
          <summary>权限系统</summary>
          <div class="side-nav-list">
            <a class="nav-link" data-module-nav="users-overview" data-admin-nav href="/users">用户总览</a>
            <a class="nav-link" data-module-nav="users-access" data-admin-nav href="/users/access">角色与授权</a>
            <a class="nav-link" data-module-nav="users-security" data-admin-nav href="/users/security">安全操作</a>
            <a class="nav-link" data-module-nav="users-audit" data-admin-nav href="/users/audit">审计日志</a>
          </div>
        </details>
        <details class="side-nav-group" open>
          <summary>数据管理</summary>
          <div class="side-nav-list">
            <a class="nav-link" data-module-nav="knowledge-sources" href="/knowledge/sources">数据源管理</a>
          </div>
        </details>
      </nav>
    `;
  }

  async function changeOwnPassword() {
    if (!state.user) {
      return;
    }

    const currentPassword = window.prompt("请输入当前密码");
    if (!currentPassword) {
      return;
    }

    const newPassword = window.prompt("请输入新密码", "NewPassword123");
    if (!newPassword) {
      return;
    }

    try {
      await apiJson("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setStatus("密码已修改，请重新登录");
      window.setTimeout(() => {
        window.location.replace("/login");
      }, 360);
    } catch (error) {
      setStatus(`修改密码失败：${error.message}`, true);
    }
  }

  function renderSourceTags(sources) {
    if (!elements.authSourceTags) {
      return;
    }
    if (!sources.length) {
      elements.authSourceTags.innerHTML = '<span class="tag muted">暂无来源</span>';
      return;
    }
    elements.authSourceTags.innerHTML = sources
      .map((source) => `<span class="tag">${escapeHtml(source)}</span>`)
      .join("");
  }

  function setStatus(message, isError = false) {
    if (!elements.pageStatus) {
      return;
    }
    elements.pageStatus.textContent = message;
    elements.pageStatus.classList.toggle("is-error", Boolean(isError));
  }

  function populateSourceSelect(select, sources, placeholder) {
    if (!select) {
      return;
    }
    const currentValue = select.value;
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);
    for (const source of sources) {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      select.appendChild(option);
    }
    if (sources.includes(currentValue)) {
      select.value = currentValue;
    }
  }

  function renderEmptyState(title, body, tone = "neutral") {
    return `
      <div class="empty-state ${tone === "soft" ? "is-soft" : ""}">
        <span class="empty-state-icon" aria-hidden="true">${tone === "soft" ? "···" : "—"}</span>
        <strong class="empty-state-title">${escapeHtml(title)}</strong>
        <p class="empty-state-copy">${escapeHtml(body)}</p>
      </div>
    `;
  }

  async function apiJson(url, options = {}) {
    const { skipAuthRedirect, ...fetchOptions } = options;
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const error = await buildHttpError(response);
      if (!skipAuthRedirect && response.status === 401) {
        window.setTimeout(() => {
          window.location.replace("/login");
        }, 120);
      }
      throw error;
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

  function formatBytes(bytes) {
    if (!bytes) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
