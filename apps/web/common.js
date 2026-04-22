(function () {
  const PAGE_META = {
    dashboard: { label: "总览" },
    qa: { label: "问答工作台" },
    knowledge: { label: "知识运营" },
    users: { label: "权限管理" },
  };
  const CUSTOM_SOURCE_OPTION = "__custom_source__";
  const SOURCE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/;
  const SIDEBAR_SECTIONS = [
    {
      id: "base",
      label: "基础库",
      icon: "基",
      links: [{ label: "总览", icon: "总", href: "/", nav: "dashboard" }],
    },
    {
      id: "knowledge",
      label: "知识库",
      icon: "知",
      links: [
        { label: "问答工作台", icon: "问", href: "/qa", nav: "qa" },
        { label: "上传入库", icon: "传", href: "/knowledge", module: "knowledge-upload" },
        { label: "重建索引", icon: "索", href: "/knowledge/reindex", module: "knowledge-reindex" },
      ],
    },
    {
      id: "users",
      label: "权限系统",
      icon: "权",
      adminOnly: true,
      links: [
        { label: "用户管理", icon: "用", href: "/users", module: "users-overview", adminOnly: true },
        { label: "角色与授权", icon: "授", href: "/users/access", module: "users-access", adminOnly: true },
        { label: "安全操作", icon: "安", href: "/users/security", module: "users-security", adminOnly: true },
        { label: "审计日志", icon: "审", href: "/users/audit", module: "users-audit", adminOnly: true },
      ],
    },
    {
      id: "data",
      label: "数据管理",
      icon: "数",
      links: [{ label: "数据源管理", icon: "源", href: "/knowledge/sources", module: "knowledge-sources" }],
    },
  ];

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
    getSourceSelectValue,
    setSourceSelectValue,
    isValidSourceName,
    mergeSourceValues,
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
    bindSidebarMenus();
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

  function getActiveSidebarSection() {
    if (state.currentPageView === "knowledge-sources") {
      return "data";
    }
    if (state.currentPage === "knowledge" || state.currentPage === "qa") {
      return "knowledge";
    }
    if (state.currentPage === "users") {
      return "users";
    }
    return "base";
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
    if (!document.body.classList.contains("console-page") || !navPanel || navPanel.dataset.sidebarNav === "kbms") {
      return;
    }

    const activeSection = getActiveSidebarSection();
    navPanel.dataset.sidebarNav = "kbms";
    navPanel.innerHTML = `
      <nav class="side-nav" aria-label="后台主导航">
        ${SIDEBAR_SECTIONS.map((section) => renderSidebarSection(section, activeSection)).join("")}
      </nav>
    `;
  }

  function renderSidebarSection(section, activeSection) {
    const isActive = section.id === activeSection;
    const openAttr = isActive ? " open" : "";
    const activeClass = isActive ? " is-active-section" : "";
    const adminAttr = section.adminOnly ? " data-admin-nav" : "";
    return `
      <details class="side-nav-group${activeClass}" data-sidebar-section="${escapeHtml(section.id)}"${openAttr}${adminAttr}>
        <summary aria-expanded="${isActive}" title="${escapeHtml(section.label)}">
          <span class="side-nav-icon" aria-hidden="true">${escapeHtml(section.icon)}</span>
          <span class="side-nav-label">${escapeHtml(section.label)}</span>
        </summary>
        <div class="side-nav-list">
          ${(section.links || []).map(renderSidebarLink).join("")}
        </div>
      </details>
    `;
  }

  function renderSidebarLink(link) {
    const navAttr = link.nav ? ` data-nav="${escapeHtml(link.nav)}"` : "";
    const moduleAttr = link.module ? ` data-module-nav="${escapeHtml(link.module)}"` : "";
    const adminAttr = link.adminOnly ? " data-admin-nav" : "";
    return `
      <a class="nav-link" href="${escapeHtml(link.href)}"${navAttr}${moduleAttr}${adminAttr} title="${escapeHtml(link.label)}">
        <span class="side-nav-link-icon" aria-hidden="true">${escapeHtml(link.icon)}</span>
        <span class="side-nav-link-text">${escapeHtml(link.label)}</span>
      </a>
    `;
  }

  function bindSidebarMenus() {
    const groups = Array.from(document.querySelectorAll(".side-nav-group"));
    if (!groups.length) {
      return;
    }
    for (const group of groups) {
      syncSidebarGroupState(group);
      group.addEventListener("toggle", () => {
        syncSidebarGroupState(group);
      });
    }
  }

  function syncSidebarGroupState(group) {
    group.querySelector("summary")?.setAttribute("aria-expanded", String(group.open));
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
    const currentValue = getSourceSelectValue(select) || select.value;
    const uniqueSources = mergeSourceValues(sources || []);
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);
    for (const source of uniqueSources) {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      select.appendChild(option);
    }
    const customOption = document.createElement("option");
    customOption.value = CUSTOM_SOURCE_OPTION;
    customOption.textContent = "自定义来源...";
    select.appendChild(customOption);
    ensureCustomSourceInput(select);
    setSourceSelectValue(select, currentValue);
  }

  function ensureCustomSourceInput(select) {
    const inputId = `${select.id}-custom`;
    let input = document.getElementById(inputId);
    if (!input) {
      input = document.createElement("input");
      input.id = inputId;
      input.type = "text";
      input.maxLength = 50;
      input.className = "source-custom-input hidden";
      input.placeholder = "输入自定义来源，例如 policy_2026";
      input.setAttribute("aria-label", "自定义来源");
      input.dataset.sourceCustomFor = select.id;
      select.insertAdjacentElement("afterend", input);
    }
    if (!select.dataset.customSourceBound) {
      select.addEventListener("change", () => updateCustomSourceInput(select));
      input.addEventListener("input", () => {
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      select.dataset.customSourceBound = "true";
    }
    updateCustomSourceInput(select);
    return input;
  }

  function updateCustomSourceInput(select) {
    const input = document.getElementById(`${select.id}-custom`);
    if (!input) {
      return;
    }
    const customMode = select.value === CUSTOM_SOURCE_OPTION;
    input.classList.toggle("hidden", !customMode);
    input.disabled = !customMode;
    input.setAttribute("aria-hidden", String(!customMode));
    if (!customMode) {
      input.value = "";
    }
  }

  function getSourceSelectValue(select) {
    if (!select) {
      return "";
    }
    if (select.value !== CUSTOM_SOURCE_OPTION) {
      return (select.value || "").trim();
    }
    const input = document.getElementById(`${select.id}-custom`);
    return (input?.value || "").trim();
  }

  function setSourceSelectValue(select, value) {
    if (!select) {
      return;
    }
    const normalized = (value || "").trim();
    const input = ensureCustomSourceInput(select);
    const optionValues = Array.from(select.options).map((option) => option.value);
    if (!normalized) {
      select.value = "";
      input.value = "";
    } else if (optionValues.includes(normalized)) {
      select.value = normalized;
      input.value = "";
    } else {
      select.value = CUSTOM_SOURCE_OPTION;
      input.value = normalized;
    }
    updateCustomSourceInput(select);
  }

  function isValidSourceName(value) {
    return SOURCE_NAME_PATTERN.test((value || "").trim());
  }

  function mergeSourceValues(...groups) {
    const merged = [];
    const seen = new Set();
    for (const group of groups) {
      for (const value of group || []) {
        const source = (value || "").trim();
        if (source && !seen.has(source)) {
          merged.push(source);
          seen.add(source);
        }
      }
    }
    return merged;
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
