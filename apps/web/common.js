(function () {
  const PAGE_META = {
    dashboard: { label: "总览" },
    qa: { label: "问答工作台" },
    knowledge: { label: "知识运营" },
    users: { label: "权限系统" },
  };
  const CUSTOM_SOURCE_OPTION = "__custom_source__";
  const SOURCE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/;
  const SIDEBAR_MENU_MIN_DURATION_MS = 360;
  const SIDEBAR_MENU_MAX_DURATION_MS = 620;
  const SIDEBAR_MENU_EASING = "cubic-bezier(0.33, 0, 0.2, 1)";
  const SIDEBAR_SECTIONS = [
    {
      id: "base",
      label: "基础库",
      icon: "基",
      links: [{ label: "总览", icon: "览", href: "/", nav: "dashboard" }],
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
        { label: "用户信息", icon: "人", href: "/users", module: "users-overview", adminOnly: true },
        { label: "组织机构", icon: "构", href: "/users/org", module: "users-org", adminOnly: true },
        { label: "菜单角色", icon: "角", href: "/users/access", module: "users-access", adminOnly: true },
        { label: "菜单管理", icon: "单", href: "/users/security", module: "users-security", adminOnly: true },
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
  let bodyScrollLockDepth = 0;
  let bodyScrollInlinePaddingRight = "";
  const sidebarMenuTimers = new WeakMap();

  ensureAppChrome();
  removeLegacySidebarBrand();
  ensurePageStatus();
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
    runUiAction,
    escapeHtml,
    formatBytes,
    formatDateTime,
    populateSourceSelect,
    getSourceSelectValue,
    setSourceSelectValue,
    isValidSourceName,
    mergeSourceValues,
    renderAdminCreateSourceSelector,
    collectAdminCreateUserPayload,
    createAdminUser,
    updateAdminUserProfile,
    deleteAdminUser,
    resetAdminUserPassword,
    updateAdminUserAccess,
    getPermissionBootstrap,
    createOrgUnit,
    updateOrgUnit,
    deleteOrgUnit,
    createMenuRole,
    updateMenuRole,
    deleteMenuRole,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    loadSources,
    lockBodyScroll,
    unlockBodyScroll,
    getUserAdminActionHref,
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
      elements.appUserName.textContent = user.display_name || user.username;
    }
    if (elements.appRoleChip) {
      elements.appRoleChip.textContent = isAdmin ? "管理员" : "普通用户";
      elements.appRoleChip.classList.add("is-ok");
    }
    if (elements.authSummary) {
      elements.authSummary.innerHTML = isAdmin
        ? '<p class="note">当前账号具备后台治理权限，可继续维护知识、权限和审计配置。</p>'
        : '<p class="note">当前账号已登录，系统会按来源授权范围过滤可访问内容。</p>';
    }
    elements.authUserCard?.classList.remove("hidden");
    if (elements.authUsername) {
      elements.authUsername.textContent = user.display_name || user.username;
    }
    if (elements.authRole) {
      const orgText = user.org_name ? ` · ${user.org_name}` : "";
      elements.authRole.textContent = `角色：${user.role}${orgText}`;
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

  function removeLegacySidebarBrand() {
    if (!document.body.classList.contains("console-page")) {
      return;
    }
    document.querySelectorAll(".rail > .brand, .brand.dossier").forEach((brand) => brand.remove());
  }

  function ensurePageStatus() {
    if (!document.body.classList.contains("console-page") || document.getElementById("page-status")) {
      return;
    }
    const status = document.createElement("span");
    status.id = "page-status";
    status.className = "status-badge page-status-sr";
    status.setAttribute("aria-live", "polite");
    document.body.appendChild(status);
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
      group.querySelector("summary")?.addEventListener("click", (event) => {
        if (document.body.classList.contains("sidebar-collapsed")) {
          window.setTimeout(() => syncSidebarGroupState(group), 0);
          return;
        }
        event.preventDefault();
        toggleSidebarGroup(group, !group.open);
      });
      group.addEventListener("toggle", () => {
        syncSidebarGroupState(group);
      });
    }
  }

  function syncSidebarGroupState(group) {
    group.querySelector("summary")?.setAttribute("aria-expanded", String(group.open));
  }

  function toggleSidebarGroup(group, shouldOpen) {
    const list = group.querySelector(".side-nav-list");
    if (!list) {
      return;
    }
    cancelSidebarGroupAnimation(group);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      group.open = shouldOpen;
      syncSidebarGroupState(group);
      return;
    }
    setSidebarGroupExpanded(group, shouldOpen);
    animateSidebarGroup(group, list, shouldOpen);
  }

  function animateSidebarGroup(group, list, shouldOpen) {
    const wasOpen = group.open;
    const startHeight = wasOpen ? getSidebarListHeight(list) : 0;
    if (shouldOpen && !wasOpen) {
      group.open = true;
    }
    const targetHeight = shouldOpen ? list.scrollHeight : 0;
    const duration = getSidebarMenuDuration(startHeight, targetHeight);
    group.classList.toggle("is-menu-opening", shouldOpen);
    group.classList.toggle("is-menu-closing", !shouldOpen);
    group.dataset.sidebarAnimating = "true";
    list.style.setProperty("--sidebar-menu-duration", `${duration}ms`);
    list.style.height = `${startHeight}px`;
    list.style.opacity = shouldOpen ? "0.08" : "1";
    list.style.transform = shouldOpen ? "translate3d(0, -10px, 0)" : "translate3d(0, 0, 0)";
    list.style.clipPath = shouldOpen ? "inset(0 0 88% 0 round 10px)" : "inset(0 0 0 0 round 10px)";
    list.style.filter = shouldOpen ? "blur(1.5px)" : "blur(0)";
    list.style.overflow = "hidden";
    list.style.pointerEvents = "none";
    list.offsetHeight;
    window.requestAnimationFrame(() => {
      list.style.height = `${targetHeight}px`;
      list.style.opacity = shouldOpen ? "1" : "0.12";
      list.style.transform = shouldOpen ? "translate3d(0, 0, 0)" : "translate3d(0, -10px, 0)";
      list.style.clipPath = shouldOpen ? "inset(0 0 0 0 round 10px)" : "inset(0 0 88% 0 round 10px)";
      list.style.filter = shouldOpen ? "blur(0)" : "blur(1.5px)";
    });
    sidebarMenuTimers.set(
      group,
      window.setTimeout(() => finishSidebarGroupAnimation(group, list, shouldOpen), duration + 40)
    );
  }

  function getSidebarListHeight(list) {
    const box = list.getBoundingClientRect();
    if (box.height > 0) {
      return box.height;
    }
    return Number.parseFloat(list.style.height) || 0;
  }

  function getSidebarMenuDuration(startHeight, targetHeight) {
    const distance = Math.abs(targetHeight - startHeight);
    return Math.min(
      SIDEBAR_MENU_MAX_DURATION_MS,
      Math.max(SIDEBAR_MENU_MIN_DURATION_MS, 320 + distance * 1.35)
    );
  }

  function cancelSidebarGroupAnimation(group) {
    const timer = sidebarMenuTimers.get(group);
    if (!timer) {
      return;
    }
    window.clearTimeout(timer);
    sidebarMenuTimers.delete(group);
    const list = group.querySelector(".side-nav-list");
    if (list) {
      const style = window.getComputedStyle(list);
      list.style.height = `${getSidebarListHeight(list)}px`;
      list.style.opacity = style.opacity;
      list.style.transform = style.transform === "none" ? "translate3d(0, 0, 0)" : style.transform;
      list.style.clipPath = style.clipPath;
      list.style.filter = style.filter;
    }
  }

  function finishSidebarGroupAnimation(group, list, isOpen) {
    const timer = sidebarMenuTimers.get(group);
    if (timer) {
      window.clearTimeout(timer);
      sidebarMenuTimers.delete(group);
    }
    delete group.dataset.sidebarAnimating;
    group.classList.remove("is-menu-opening", "is-menu-closing");
    list.style.height = "";
    list.style.opacity = "";
    list.style.transform = "";
    list.style.clipPath = "";
    list.style.filter = "";
    list.style.overflow = "";
    list.style.pointerEvents = "";
    list.style.removeProperty("--sidebar-menu-duration");
    group.open = isOpen;
    syncSidebarGroupState(group);
  }

  function setSidebarGroupExpanded(group, expanded) {
    group.querySelector("summary")?.setAttribute("aria-expanded", String(expanded));
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
      setStatus("密码已修改，请重新登录。");
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
    elements.authSourceTags.innerHTML = sources.map((source) => `<span class="tag">${escapeHtml(source)}</span>`).join("");
  }

  function setStatus(message, isError = false) {
    if (!elements.pageStatus) {
      return;
    }
    elements.pageStatus.textContent = message;
    elements.pageStatus.classList.toggle("is-error", Boolean(isError));
  }

  function setActionBusy(control, busy) {
    if (!control) {
      return;
    }
    if (busy) {
      control.dataset.loading = "true";
      control.setAttribute("aria-busy", "true");
      if ("disabled" in control) {
        control.dataset.wasDisabled = String(Boolean(control.disabled));
        control.disabled = true;
      } else {
        control.setAttribute("aria-disabled", "true");
      }
      return;
    }
    control.removeAttribute("data-loading");
    control.removeAttribute("aria-busy");
    control.removeAttribute("aria-disabled");
    if ("disabled" in control) {
      control.disabled = control.dataset.wasDisabled === "true";
    }
    delete control.dataset.wasDisabled;
  }

  async function runUiAction({ control, pendingMessage, successMessage, errorPrefix = "操作失败", action, onSuccess }) {
    setActionBusy(control, true);
    if (pendingMessage) {
      setStatus(pendingMessage, false);
    }
    try {
      const result = await action();
      if (onSuccess) {
        await onSuccess(result);
      }
      if (successMessage) {
        setStatus(typeof successMessage === "function" ? successMessage(result) : successMessage, false);
      }
      return { ok: true, result };
    } catch (error) {
      setStatus(`${errorPrefix}：${error.message}`, true);
      return { ok: false, error };
    } finally {
      setActionBusy(control, false);
    }
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
        const source = String(value || "").trim();
        if (source && !seen.has(source)) {
          merged.push(source);
          seen.add(source);
        }
      }
    }
    return merged;
  }

  function renderAdminCreateSourceSelector({
    container,
    sources = [],
    checkboxAttribute,
    customInputId,
    customLabel = "自定义来源",
    emptyMessage = "当前还没有可授权来源，你可以先填写自定义来源。",
  }) {
    if (!container) {
      return;
    }
    const customField = `
      <label class="source-custom-field">
        <span>${escapeHtml(customLabel)}</span>
        <input id="${escapeHtml(customInputId)}" type="text" maxlength="50" placeholder="1-50 位，例如 policy_2026">
      </label>
    `;
    const sourceList = mergeSourceValues(sources);
    if (!sourceList.length) {
      container.innerHTML = `<div class="note">${escapeHtml(emptyMessage)}</div>${customField}`;
      return;
    }
    container.innerHTML = sourceList.map((source) => `
      <label class="source-checkbox">
        <input type="checkbox" ${checkboxAttribute}="${escapeHtml(source)}">
        <span>${escapeHtml(source)}</span>
      </label>
    `).join("") + customField;
  }

  function collectAdminCreateUserPayload({
    usernameInput,
    passwordInput,
    roleSelect,
    sourceContainer,
    checkboxAttribute,
    customInputId,
    missingMessage = "请填写新用户的用户名和密码。",
  }) {
    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    const role = roleSelect?.value || "user";
    if (!username || !password) {
      return { error: missingMessage };
    }
    if (username.length < 3) {
      return { error: "用户名至少需要 3 位。" };
    }
    if (password.length < 8) {
      return { error: "初始密码至少需要 8 位。" };
    }
    const checkedSources = Array.from(sourceContainer?.querySelectorAll(`[${checkboxAttribute}]:checked`) || [])
      .map((node) => node.getAttribute(checkboxAttribute));
    const customSource = document.getElementById(customInputId)?.value.trim() || "";
    if (customSource && !isValidSourceName(customSource)) {
      return { error: "自定义来源只能使用 1-50 位字母、数字、下划线或短横线。" };
    }
    return {
      payload: {
        username,
        password,
        role,
        allowed_sources: mergeSourceValues(checkedSources, customSource ? [customSource] : []),
        is_active: true,
      },
    };
  }

  async function createAdminUser(payload) {
    return apiJson("/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function updateAdminUserProfile(userId, payload) {
    return apiJson(`/auth/users/${encodeURIComponent(String(userId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function deleteAdminUser(userId) {
    return apiJson(`/auth/users/${encodeURIComponent(String(userId))}`, { method: "DELETE" });
  }

  async function resetAdminUserPassword(userId, newPassword) {
    return apiJson(`/auth/users/${encodeURIComponent(String(userId))}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  async function updateAdminUserAccess(userId, payload) {
    return apiJson(`/auth/users/${encodeURIComponent(String(userId))}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function getPermissionBootstrap() {
    return apiJson("/auth/permission-bootstrap");
  }

  async function createOrgUnit(payload) {
    return apiJson("/auth/org-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function updateOrgUnit(orgUnitId, payload) {
    return apiJson(`/auth/org-units/${encodeURIComponent(String(orgUnitId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function deleteOrgUnit(orgUnitId) {
    return apiJson(`/auth/org-units/${encodeURIComponent(String(orgUnitId))}`, { method: "DELETE" });
  }

  async function createMenuRole(payload) {
    return apiJson("/auth/menu-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function updateMenuRole(roleId, payload) {
    return apiJson(`/auth/menu-roles/${encodeURIComponent(String(roleId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function deleteMenuRole(roleId) {
    return apiJson(`/auth/menu-roles/${encodeURIComponent(String(roleId))}`, { method: "DELETE" });
  }

  async function createMenuItem(payload) {
    return apiJson("/auth/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function updateMenuItem(menuItemId, payload) {
    return apiJson(`/auth/menu-items/${encodeURIComponent(String(menuItemId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function deleteMenuItem(menuItemId) {
    return apiJson(`/auth/menu-items/${encodeURIComponent(String(menuItemId))}`, { method: "DELETE" });
  }

  function lockBodyScroll() {
    bodyScrollLockDepth += 1;
    if (bodyScrollLockDepth > 1) {
      return;
    }
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    bodyScrollInlinePaddingRight = document.body.style.paddingRight;
    document.body.classList.add("users-create-dialog-open");
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  function unlockBodyScroll() {
    if (bodyScrollLockDepth === 0) {
      return;
    }
    bodyScrollLockDepth -= 1;
    if (bodyScrollLockDepth > 0) {
      return;
    }
    document.body.classList.remove("users-create-dialog-open");
    document.body.style.paddingRight = bodyScrollInlinePaddingRight;
  }

  function getUserAdminActionHref(action, user = {}) {
    if (action === "audit") {
      return `/users/audit?search=${encodeURIComponent(user.username || "")}`;
    }
    if (action === "security") {
      return "/users";
    }
    if (action === "edit" || action === "access") {
      return "/users";
    }
    return "";
  }

  function renderEmptyState(title, body, tone = "neutral") {
    return `
      <div class="empty-state ${tone === "soft" ? "is-soft" : ""}">
        <span class="empty-state-icon" aria-hidden="true">${tone === "soft" ? "···" : "◦"}</span>
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
      } else if (payload?.message) {
        message = String(payload.message);
      } else if (payload?.error) {
        message = String(payload.error);
      }
    } catch (error) {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    const wrapped = new Error(localizeHttpErrorMessage(message, response.status));
    wrapped.status = response.status;
    wrapped.rawMessage = message;
    return wrapped;
  }

  function localizeHttpErrorMessage(message, status = 0) {
    const raw = String(message || "").trim();
    const normalized = raw.replace(/[.\u3002]\s*$/, "").toLowerCase();
    const exactMessages = {
      "username already exists": "用户名已存在，请换一个账号名。",
      "invalid username or password": "用户名或密码不正确。",
      "account is disabled": "账号已停用，请联系管理员。",
      "authentication required": "登录状态已失效，请重新登录。",
      "current password is incorrect": "当前密码不正确。",
      "user not found": "用户不存在或已被删除。",
      "administrators cannot delete their own account": "管理员不能删除自己的账号。",
      "unsupported role": "不支持的角色，请选择 admin 或 user。",
      "username is too long": "用户名过长，最多 64 位。",
      "username can only contain letters, numbers, underscore, dash, and dot": "用户名只能包含字母、数字、下划线、短横线和点。",
      "invalid sources: use 1-50 letters, numbers, underscores, or hyphens": "来源格式不正确，只能使用 1-50 位字母、数字、下划线或短横线。",
      "work number already exists": "工号已存在，请更换一个工号。",
      "organization unit not found": "组织机构不存在，请重新选择。",
      "organization parent not found": "上级组织机构不存在，请重新选择。",
      "organization code already exists": "组织编码已存在，请更换后重试。",
      "organization code must start with a letter and use lowercase letters, numbers, or underscores": "组织编码需以字母开头，只能使用小写字母、数字或下划线。",
      "organization name is required": "组织名称不能为空。",
      "organization name is too long": "组织名称过长，请控制在 128 位以内。",
      "organization type must start with a letter and use lowercase letters, numbers, underscores, or hyphens": "组织类型需以字母开头，只能使用小写字母、数字、下划线或短横线。",
      "organization description is too long": "组织说明过长，请控制在 255 位以内。",
      "an organization unit cannot be its own parent": "组织机构不能把自己设为上级节点。",
      "default organization root cannot be deleted": "默认组织根节点不能删除。",
      "please remove child organization units before deleting this node": "请先删除下级组织节点，再执行删除。",
      "please move users out of this organization unit before deleting it": "请先把该组织下的账号迁出，再执行删除。",
      "menu role not found": "菜单角色不存在，请刷新后重试。",
      "menu item not found": "菜单项不存在，请刷新后重试。",
      "menu parent not found": "上级菜单不存在，请重新选择。",
      "role code already exists": "角色编码已存在，请更换后重试。",
      "role name already exists": "角色名称已存在，请更换后重试。",
      "menu code already exists": "菜单编码已存在，请更换后重试。",
      "default menu roles cannot be deleted": "默认菜单角色不能删除。",
      "please remove users from this menu role before deleting it": "请先移除该角色下的账号，再执行删除。",
      "menu name is required": "菜单名称不能为空。",
      "menu code must start with a letter and use lowercase letters, numbers, or underscores": "菜单编码需以字母开头，只能使用小写字母、数字或下划线。",
      "role code must start with a letter and use lowercase letters, numbers, or underscores": "角色编码需以字母开头，只能使用小写字母、数字或下划线。",
      "display name is too long": "用户名称过长，最多 64 位。",
      "work number can only contain letters, numbers, underscore, dash, and dot": "工号只能包含字母、数字、下划线、短横线和点。",
      "role name is required": "角色名称不能为空。",
      "role name is too long": "角色名称过长，请控制在 64 位以内。",
      "menu item cannot be its own parent": "菜单不能把自己设为上级菜单。",
      "administrator permission required": "当前账号没有管理员权限。",
      "http 400": "请求参数不正确，请检查后重试。",
      "http 401": "登录状态已失效，请重新登录。",
      "http 403": "当前账号没有权限执行此操作。",
      "http 404": "请求的资源不存在或已被移除。",
      "http 409": "数据已存在或状态冲突，请刷新后重试。",
      "http 422": "提交内容不符合要求，请检查后重试。",
      "http 500": "服务处理失败，请稍后重试。",
      "http 503": "服务暂时不可用，请稍后重试。",
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
    if (raw.startsWith("[") || raw.startsWith("{")) {
      return "提交内容不符合要求，请检查账号、密码、角色、菜单和来源配置。";
    }
    if (/[\u4e00-\u9fff]/.test(raw)) {
      return raw;
    }
    if (/^[A-Za-z0-9 _:'"()/-]+$/.test(raw) && status >= 500) {
      return "服务暂时不可用，请稍后重试。";
    }
    if (/^[A-Za-z0-9 _:'"()/-]+$/.test(raw) && status >= 400) {
      return "请求未能完成，请检查输入或稍后重试。";
    }
    return raw;
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

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).replace("T", " ");
    }
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
