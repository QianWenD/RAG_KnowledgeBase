window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      users: [],
      filteredUsers: [],
      selectedIds: new Set(),
      page: 1,
      pageSize: 10,
      filters: {
        login: "",
        workNo: "",
        name: "",
      },
    };

    const elements = {
      overviewNote: document.getElementById("users-overview-note"),
      refreshBtn: document.getElementById("users-overview-refresh"),
      createToggle: document.getElementById("users-create-toggle"),
      createPanel: document.getElementById("users-create-panel"),
      createForm: document.getElementById("users-create-form"),
      createUsername: document.getElementById("users-create-username"),
      createPassword: document.getElementById("users-create-password"),
      createRole: document.getElementById("users-create-role"),
      createSources: document.getElementById("users-create-sources"),
      createCancel: document.getElementById("users-create-cancel"),
      createSubmit: document.getElementById("users-create-submit"),
      filterForm: document.getElementById("users-filter-form"),
      filterLogin: document.getElementById("users-filter-login"),
      filterWorkNo: document.getElementById("users-filter-workno"),
      filterName: document.getElementById("users-filter-name"),
      filterReset: document.getElementById("users-filter-reset"),
      tableBody: document.getElementById("users-table-body"),
      checkAll: document.getElementById("users-check-all"),
      batchDelete: document.getElementById("users-batch-delete"),
      pagePrev: document.getElementById("users-page-prev"),
      pageNext: document.getElementById("users-page-next"),
      pageNumbers: document.getElementById("users-page-numbers"),
      pageJump: document.getElementById("users-page-jump"),
      pageSize: document.getElementById("users-page-size"),
      totalCount: document.getElementById("users-total-count"),
      summaryTotal: document.getElementById("users-summary-total"),
      summaryAdmins: document.getElementById("users-summary-admins"),
      summaryActive: document.getElementById("users-summary-active"),
      summarySources: document.getElementById("users-summary-sources"),
    };

    bindEvents();
    renderSummary();
    renderCreateSourceSelector();
    renderTable();

    if (!helpers.isAdmin()) {
      elements.overviewNote?.classList.remove("hidden");
      helpers.setStatus("当前账号没有权限查看用户管理。", true);
      renderEmptyTable("当前账号没有权限查看用户信息", "请使用管理员账号登录后再进入用户管理。");
      return;
    }

    await loadUsers();
    helpers.setStatus("用户管理已就绪，可以筛选账号并进入编辑、删除或审计操作。", false);

    function bindEvents() {
      elements.refreshBtn?.addEventListener("click", loadUsers);
      elements.createToggle?.addEventListener("click", () => {
        setCreatePanelOpen(elements.createPanel?.classList.contains("hidden"));
      });
      elements.createCancel?.addEventListener("click", () => {
        resetCreateForm();
        setCreatePanelOpen(false);
      });
      elements.createForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleCreateUser();
      });
      elements.filterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        applyFiltersFromForm();
      });
      elements.filterReset?.addEventListener("click", resetFilters);
      elements.checkAll?.addEventListener("change", toggleCurrentPageSelection);
      elements.batchDelete?.addEventListener("click", deleteSelectedUsers);
      elements.pagePrev?.addEventListener("click", () => goToPage(pageState.page - 1));
      elements.pageNext?.addEventListener("click", () => goToPage(pageState.page + 1));
      elements.pageSize?.addEventListener("change", () => {
        pageState.pageSize = Number(elements.pageSize.value) || 10;
        pageState.page = 1;
        renderTable();
      });
      elements.pageJump?.addEventListener("change", () => {
        goToPage(Number(elements.pageJump.value) || 1);
      });
      elements.pageNumbers?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-page-number]");
        if (!button) {
          return;
        }
        goToPage(Number(button.dataset.pageNumber));
      });
      elements.tableBody?.addEventListener("change", (event) => {
        const checkbox = event.target.closest("[data-user-select]");
        if (!checkbox) {
          return;
        }
        toggleUserSelection(checkbox.dataset.userSelect, checkbox.checked);
      });
      elements.tableBody?.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-user-action]");
        if (!action) {
          return;
        }
        await handleRowAction(action.dataset.userAction, Number(action.dataset.userId), action);
      });
    }

    function setCreatePanelOpen(open) {
      if (!elements.createPanel || !elements.createToggle) {
        return;
      }
      elements.createPanel.classList.toggle("hidden", !open);
      elements.createToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        elements.createUsername?.focus();
      }
    }

    function renderCreateSourceSelector() {
      helpers.renderAdminCreateSourceSelector({
        container: elements.createSources,
        sources: state.sources,
        checkboxAttribute: "data-users-create-source",
        customInputId: "users-create-source-custom",
      });
    }

    function resetCreateForm() {
      elements.createForm?.reset();
      renderCreateSourceSelector();
      if (elements.createRole) {
        elements.createRole.value = "user";
      }
    }

    function focusCreatedUser(username) {
      if (elements.filterLogin) {
        elements.filterLogin.value = username;
      }
      if (elements.filterWorkNo) {
        elements.filterWorkNo.value = "";
      }
      if (elements.filterName) {
        elements.filterName.value = "";
      }
      pageState.filters = { login: normalize(username), workNo: "", name: "" };
      pageState.page = 1;
    }

    async function handleCreateUser() {
      const { payload, error } = helpers.collectAdminCreateUserPayload({
        usernameInput: elements.createUsername,
        passwordInput: elements.createPassword,
        roleSelect: elements.createRole,
        sourceContainer: elements.createSources,
        checkboxAttribute: "data-users-create-source",
        customInputId: "users-create-source-custom",
        missingMessage: "请填写新用户的用户名和初始密码。",
      });
      if (error) {
        helpers.setStatus(error, true);
        return;
      }

      await helpers.runUiAction({
        control: elements.createSubmit,
        pendingMessage: `正在创建用户 ${payload.username}...`,
        successMessage: `已创建用户 ${payload.username}，并筛选到新账号。`,
        errorPrefix: "创建用户失败",
        action: () => helpers.createAdminUser(payload),
        onSuccess: async () => {
          resetCreateForm();
          setCreatePanelOpen(false);
          focusCreatedUser(payload.username);
          await loadUsers();
        },
      });
    }

    async function loadUsers() {
      try {
        const payload = await helpers.apiJson("/auth/users");
        pageState.users = payload.users || [];
        pageState.selectedIds = new Set(
          Array.from(pageState.selectedIds).filter((id) => pageState.users.some((user) => String(user.id) === id)),
        );
        applyFilters();
        renderSummary();
      } catch (error) {
        helpers.setStatus(`加载用户信息失败：${error.message}`, true);
        renderEmptyTable("加载用户信息失败", error.message);
      }
    }

    function applyFiltersFromForm() {
      pageState.filters = {
        login: normalize(elements.filterLogin?.value),
        workNo: normalize(elements.filterWorkNo?.value),
        name: normalize(elements.filterName?.value),
      };
      pageState.page = 1;
      applyFilters();
      helpers.setStatus("已按条件筛选用户信息。", false);
    }

    function resetFilters() {
      if (elements.filterLogin) {
        elements.filterLogin.value = "";
      }
      if (elements.filterWorkNo) {
        elements.filterWorkNo.value = "";
      }
      if (elements.filterName) {
        elements.filterName.value = "";
      }
      pageState.filters = { login: "", workNo: "", name: "" };
      pageState.page = 1;
      applyFilters();
      helpers.setStatus("已重置用户筛选条件。", false);
    }

    function applyFilters() {
      pageState.filteredUsers = pageState.users.filter((user) => {
        const login = normalize(user.username);
        const workNo = normalize(formatWorkNo(user));
        const name = normalize(formatDisplayName(user));
        return (
          (!pageState.filters.login || login.includes(pageState.filters.login)) &&
          (!pageState.filters.workNo || workNo.includes(pageState.filters.workNo)) &&
          (!pageState.filters.name || name.includes(pageState.filters.name))
        );
      });
      clampPage();
      renderTable();
    }

    function renderTable() {
      if (!elements.tableBody) {
        return;
      }
      if (!helpers.isAdmin()) {
        renderEmptyTable("当前账号没有权限查看用户信息", "请使用管理员账号登录后再进入用户管理。");
        return;
      }
      if (!pageState.users.length) {
        renderEmptyTable("还没有可管理账号", "请先去安全操作页创建第一个业务账号或管理员账号。");
        renderPager();
        return;
      }
      if (!pageState.filteredUsers.length) {
        renderEmptyTable("没有匹配的用户", "换一个登录账号、工号或用户名条件再试试。");
        renderPager();
        return;
      }

      const users = getCurrentPageUsers();
      const startIndex = (pageState.page - 1) * pageState.pageSize;
      elements.tableBody.innerHTML = users.map((user, index) => renderUserRow(user, startIndex + index + 1)).join("");
      renderPager();
      syncSelectionControls();
    }

    function renderUserRow(user, rowNumber) {
      const userId = String(user.id);
      const checked = pageState.selectedIds.has(userId) ? "checked" : "";
      const disabledDelete = state.user && user.id === state.user.id ? "disabled" : "";
      const disabledTitle = disabledDelete ? "不能删除当前登录账号" : "删除";
      return `
        <tr data-user-id="${helpers.escapeHtml(userId)}">
          <td class="row-number-col">${rowNumber}</td>
          <td class="check-col">
            <input type="checkbox" data-user-select="${helpers.escapeHtml(userId)}" aria-label="选择 ${helpers.escapeHtml(user.username)}" ${checked}>
          </td>
          <td class="strong-cell">${helpers.escapeHtml(user.username)}</td>
          <td>${helpers.escapeHtml(formatWorkNo(user))}</td>
          <td>${helpers.escapeHtml(formatDisplayName(user))}</td>
          <td>
            <span class="table-status ${user.is_active ? "is-active" : "is-inactive"}">${user.is_active ? "启用" : "停用"}</span>
          </td>
          <td>${helpers.escapeHtml(formatOrgName(user))}</td>
          <td class="date-cell">${helpers.escapeHtml(formatDateTime(user.created_at))}</td>
          <td>
            <div class="table-operation-list">
              <button class="table-icon-btn" type="button" data-user-action="edit" data-user-id="${helpers.escapeHtml(userId)}" title="编辑" aria-label="编辑 ${helpers.escapeHtml(user.username)}">${renderIcon("edit")}</button>
              <button class="table-icon-btn danger" type="button" data-user-action="delete" data-user-id="${helpers.escapeHtml(userId)}" title="${disabledTitle}" aria-label="删除 ${helpers.escapeHtml(user.username)}" ${disabledDelete}>${renderIcon("trash")}</button>
              <button class="table-icon-btn" type="button" data-user-action="security" data-user-id="${helpers.escapeHtml(userId)}" title="安全操作" aria-label="安全操作 ${helpers.escapeHtml(user.username)}">${renderIcon("settings")}</button>
              <button class="table-icon-btn" type="button" data-user-action="audit" data-user-id="${helpers.escapeHtml(userId)}" title="审计记录" aria-label="查看 ${helpers.escapeHtml(user.username)} 的审计记录">${renderIcon("more")}</button>
              <button class="table-icon-btn" type="button" data-user-action="access" data-user-id="${helpers.escapeHtml(userId)}" title="授权" aria-label="授权 ${helpers.escapeHtml(user.username)}">${renderIcon("arrow")}</button>
            </div>
          </td>
        </tr>
      `;
    }

    function renderEmptyTable(title, body) {
      if (!elements.tableBody) {
        return;
      }
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
      syncSelectionControls();
    }

    function renderPager() {
      const total = pageState.filteredUsers.length;
      const pageCount = getPageCount();
      if (elements.totalCount) {
        elements.totalCount.textContent = `共 ${total} 条`;
      }
      if (elements.pageJump) {
        elements.pageJump.max = String(pageCount);
        elements.pageJump.value = String(pageState.page);
      }
      if (elements.pagePrev) {
        elements.pagePrev.disabled = pageState.page <= 1;
      }
      if (elements.pageNext) {
        elements.pageNext.disabled = pageState.page >= pageCount;
      }
      if (elements.pageNumbers) {
        elements.pageNumbers.innerHTML = buildPageNumbers(pageCount).map((page) => `
          <button class="pager-btn ${page === pageState.page ? "is-current" : ""}" type="button" data-page-number="${page}" aria-label="第 ${page} 页">${page}</button>
        `).join("");
      }
      syncSelectionControls();
    }

    function buildPageNumbers(pageCount) {
      const pages = [];
      const start = Math.max(1, pageState.page - 2);
      const end = Math.min(pageCount, start + 4);
      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
      return pages.length ? pages : [1];
    }

    function getCurrentPageUsers() {
      const start = (pageState.page - 1) * pageState.pageSize;
      return pageState.filteredUsers.slice(start, start + pageState.pageSize);
    }

    function getPageCount() {
      return Math.max(1, Math.ceil(pageState.filteredUsers.length / pageState.pageSize));
    }

    function goToPage(page) {
      pageState.page = Math.min(Math.max(1, page), getPageCount());
      renderTable();
    }

    function clampPage() {
      pageState.page = Math.min(Math.max(1, pageState.page), getPageCount());
    }

    function toggleCurrentPageSelection(event) {
      const checked = Boolean(event.target.checked);
      getCurrentPageUsers().forEach((user) => toggleUserSelection(String(user.id), checked, false));
      renderTable();
    }

    function toggleUserSelection(userId, checked, sync = true) {
      if (!userId) {
        return;
      }
      if (checked) {
        pageState.selectedIds.add(String(userId));
      } else {
        pageState.selectedIds.delete(String(userId));
      }
      if (sync) {
        syncSelectionControls();
      }
    }

    function syncSelectionControls() {
      const currentPageUsers = getCurrentPageUsers();
      const selectableCount = currentPageUsers.length;
      const selectedOnPage = currentPageUsers.filter((user) => pageState.selectedIds.has(String(user.id))).length;
      if (elements.checkAll) {
        elements.checkAll.checked = selectableCount > 0 && selectedOnPage === selectableCount;
        elements.checkAll.indeterminate = selectedOnPage > 0 && selectedOnPage < selectableCount;
      }
      if (elements.batchDelete) {
        const deletableSelected = getSelectedUsers().filter((user) => !state.user || user.id !== state.user.id);
        elements.batchDelete.disabled = deletableSelected.length === 0;
      }
    }

    function getSelectedUsers() {
      return pageState.users.filter((user) => pageState.selectedIds.has(String(user.id)));
    }

    async function handleRowAction(action, userId, control) {
      const user = pageState.users.find((item) => item.id === userId);
      if (!user) {
        return;
      }
      if (action === "delete") {
        await deleteUser(user, control);
        return;
      }
      const href = helpers.getUserAdminActionHref(action, user);
      if (href) {
        window.location.href = href;
      }
    }

    async function deleteSelectedUsers() {
      const selectedUsers = getSelectedUsers();
      const deletableUsers = selectedUsers.filter((user) => !state.user || user.id !== state.user.id);
      if (!deletableUsers.length) {
        helpers.setStatus("当前选择里没有可删除的账号。", true);
        return;
      }
      const suffix = selectedUsers.length !== deletableUsers.length ? "，当前登录账号会被自动跳过" : "";
      if (!window.confirm(`确认删除 ${deletableUsers.length} 个用户吗${suffix}？`)) {
        return;
      }
      await helpers.runUiAction({
        control: elements.batchDelete,
        pendingMessage: `正在删除 ${deletableUsers.length} 个用户...`,
        successMessage: `已删除 ${deletableUsers.length} 个用户。`,
        errorPrefix: "批量删除失败",
        action: async () => {
          for (const user of deletableUsers) {
            await helpers.deleteAdminUser(user.id);
            pageState.selectedIds.delete(String(user.id));
          }
        },
        onSuccess: loadUsers,
      });
      syncSelectionControls();
    }

    async function deleteUser(user, control) {
      if (state.user && user.id === state.user.id) {
        helpers.setStatus("不能删除当前登录账号。", true);
        return;
      }
      if (!window.confirm(`确认删除用户 ${user.username} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除用户 ${user.username}...`,
        successMessage: `已删除用户 ${user.username}。`,
        errorPrefix: "删除用户失败",
        action: () => helpers.deleteAdminUser(user.id),
        onSuccess: async () => {
          pageState.selectedIds.delete(String(user.id));
          await loadUsers();
        },
      });
    }

    function renderSummary() {
      const total = pageState.users.length;
      const adminCount = pageState.users.filter((item) => item.role === "admin").length;
      const activeCount = pageState.users.filter((item) => item.is_active).length;
      const sourceCount = Array.isArray(state.sources) ? state.sources.length : 0;
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(total);
      }
      if (elements.summaryAdmins) {
        elements.summaryAdmins.textContent = String(adminCount);
      }
      if (elements.summaryActive) {
        elements.summaryActive.textContent = String(activeCount);
      }
      if (elements.summarySources) {
        elements.summarySources.textContent = String(sourceCount);
      }
    }

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function formatWorkNo(user) {
      return user.work_no || user.employee_no || user.job_number || user.username || `U${String(user.id).padStart(4, "0")}`;
    }

    function formatDisplayName(user) {
      return user.display_name || user.name || user.full_name || user.username || "-";
    }

    function formatOrgName(user) {
      if (user.organization || user.org_name) {
        return user.organization || user.org_name;
      }
      return user.role === "admin" ? "权限管理组" : "业务用户组";
    }

    function formatDateTime(value) {
      if (!value) {
        return "-";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }
      const pad = (number) => String(number).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function renderIcon(type) {
      const icons = {
        edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.7V20h3.3L17.1 10.2l-3.3-3.3L4 16.7Z"></path><path d="m15 5.7 1.2-1.2a1.8 1.8 0 0 1 2.6 0l.7.7a1.8 1.8 0 0 1 0 2.6L18.3 9"></path></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="m9 7 .8-2h4.4l.8 2"></path><path d="m7 7 1 13h8l1-13"></path></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="m19 12 .9-1.7-2-3.4-1.9.1a7.8 7.8 0 0 0-1.5-.9L13.5 4h-4l-.9 2.1c-.5.2-1 .5-1.5.9L5.2 6.9l-2 3.4L4 12l-.9 1.7 2 3.4 1.9-.1c.5.4 1 .7 1.5.9l1 2.1h4l1-2.1c.5-.2 1-.5 1.5-.9l1.9.1 2-3.4L19 12Z"></path></svg>',
        more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01"></path><path d="M12 12h.01"></path><path d="M19 12h.01"></path></svg>',
        arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"></path></svg>',
      };
      return icons[type] || icons.more;
    }
  },
};
