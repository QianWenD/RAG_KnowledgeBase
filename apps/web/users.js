window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      users: [],
      filters: {
        login: "",
        workNo: "",
        name: "",
        orgUnitId: "",
      },
      bootstrap: {
        orgUnits: [],
        menuRoles: [],
      },
      editorMode: "create",
      editingUser: null,
      accessUser: null,
    };

    const elements = {
      overviewNote: document.getElementById("users-overview-note"),
      filterForm: document.getElementById("users-filter-form"),
      filterLogin: document.getElementById("users-filter-login"),
      filterWorkNo: document.getElementById("users-filter-workno"),
      filterName: document.getElementById("users-filter-name"),
      filterOrg: document.getElementById("users-filter-org"),
      filterReset: document.getElementById("users-filter-reset"),
      refreshBtn: document.getElementById("users-overview-refresh"),
      createToggle: document.getElementById("users-create-toggle"),
      tableBody: document.getElementById("users-table-body"),
      summaryTotal: document.getElementById("users-summary-total"),
      summaryActive: document.getElementById("users-summary-active"),
      summaryAdmins: document.getElementById("users-summary-admins"),
      summaryRoles: document.getElementById("users-summary-roles"),
      editorModal: document.getElementById("user-editor-modal"),
      editorForm: document.getElementById("user-editor-form"),
      editorTitle: document.getElementById("user-editor-title"),
      editorCopy: document.getElementById("user-editor-copy"),
      editorId: document.getElementById("user-editor-id"),
      editorUsername: document.getElementById("user-editor-username"),
      editorDisplayName: document.getElementById("user-editor-display-name"),
      editorWorkNo: document.getElementById("user-editor-work-no"),
      editorPasswordRow: document.getElementById("user-editor-password-row"),
      editorPassword: document.getElementById("user-editor-password"),
      editorRole: document.getElementById("user-editor-role"),
      editorStatus: document.getElementById("user-editor-status"),
      editorOrg: document.getElementById("user-editor-org"),
      editorMenuRoles: document.getElementById("user-editor-menu-roles"),
      editorSources: document.getElementById("user-editor-sources"),
      editorFeedback: document.getElementById("user-editor-feedback"),
      editorSubmit: document.getElementById("user-editor-submit"),
      editorClose: document.getElementById("user-editor-close"),
      editorCancel: document.getElementById("user-editor-cancel"),
      editorAccessFields: Array.from(document.querySelectorAll("[data-user-editor-access]")),
      accessModal: document.getElementById("user-access-modal"),
      accessForm: document.getElementById("user-access-form"),
      accessTitle: document.getElementById("user-access-title"),
      accessCopy: document.getElementById("user-access-copy"),
      accessUser: document.getElementById("user-access-user"),
      accessMeta: document.getElementById("user-access-meta"),
      accessOrg: document.getElementById("user-access-org"),
      accessRoleCount: document.getElementById("user-access-role-count"),
      accessSourceCount: document.getElementById("user-access-source-count"),
      accessRole: document.getElementById("user-access-role"),
      accessStatus: document.getElementById("user-access-status"),
      accessMenuRoles: document.getElementById("user-access-menu-roles"),
      accessSources: document.getElementById("user-access-sources"),
      accessFeedback: document.getElementById("user-access-feedback"),
      accessSubmit: document.getElementById("user-access-submit"),
      accessClose: document.getElementById("user-access-close"),
      accessCancel: document.getElementById("user-access-cancel"),
    };
    let dialogReturnFocus = null;

    bindEvents();

    if (!helpers.isAdmin()) {
      elements.overviewNote?.classList.remove("hidden");
      helpers.setStatus("当前账号没有用户管理权限。", true);
      renderEmptyTable("当前账号没有用户管理权限", "请使用管理员账号登录后查看用户信息。");
      return;
    }

    await Promise.all([loadBootstrap(), loadUsers()]);
    helpers.setStatus("用户信息页已就绪，可以新增、编辑、分配菜单角色、重置密码和删除账号。", false);

    function bindEvents() {
      elements.filterForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await loadUsers();
      });
      elements.filterReset?.addEventListener("click", async () => {
        resetFilters();
        await loadUsers();
      });
      elements.refreshBtn?.addEventListener("click", () => refreshUsers(elements.refreshBtn));
      elements.createToggle?.addEventListener("click", async () => {
        await refreshDialogSources();
        openEditor("create");
      });
      elements.editorClose?.addEventListener("click", () => closeEditor());
      elements.editorCancel?.addEventListener("click", () => closeEditor());
      elements.accessClose?.addEventListener("click", () => closeAccessEditor());
      elements.accessCancel?.addEventListener("click", () => closeAccessEditor());
      elements.editorModal?.addEventListener("click", (event) => {
        if (event.target === elements.editorModal) {
          closeEditor();
        }
      });
      elements.accessModal?.addEventListener("click", (event) => {
        if (event.target === elements.accessModal) {
          closeAccessEditor();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
          return;
        }
        if (!elements.accessModal?.classList.contains("hidden")) {
          closeAccessEditor();
          return;
        }
        if (!elements.editorModal?.classList.contains("hidden")) {
          closeEditor();
        }
      });
      elements.editorForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitEditor();
      });
      elements.accessForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitAccessEditor();
      });
      elements.accessForm?.addEventListener("change", updateAccessSelectionMeta);
      elements.accessForm?.addEventListener("input", updateAccessSelectionMeta);
      elements.tableBody?.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-user-action]");
        if (!action) {
          return;
        }
        const userId = Number(action.dataset.userId);
        const user = pageState.users.find((item) => item.id === userId);
        if (!user) {
          return;
        }
        await handleRowAction(action.dataset.userAction, user, action);
      });
    }

    async function loadBootstrap() {
      try {
        const payload = await helpers.getPermissionBootstrap();
        pageState.bootstrap.orgUnits = flattenTree(payload.org_units || [], "children");
        pageState.bootstrap.menuRoles = payload.menu_roles || [];
        renderOrgOptions();
        renderEditorMenuRoles([]);
        renderEditorSources([]);
        renderAccessMenuRoles([]);
        renderAccessSources([]);
      } catch (error) {
        helpers.setStatus(`加载权限配置失败：${error.message}`, true);
      }
    }

    async function loadUsers() {
      syncFiltersFromForm();
      const params = new URLSearchParams();
      if (pageState.filters.login) {
        params.set("login", pageState.filters.login);
      }
      if (pageState.filters.workNo) {
        params.set("work_no", pageState.filters.workNo);
      }
      if (pageState.filters.name) {
        params.set("display_name", pageState.filters.name);
      }
      if (pageState.filters.orgUnitId) {
        params.set("org_unit_id", pageState.filters.orgUnitId);
      }
      const query = params.toString();
      try {
        const payload = await helpers.apiJson(`/auth/users${query ? `?${query}` : ""}`);
        pageState.users = payload.users || [];
        renderSummary();
        renderTable();
      } catch (error) {
        helpers.setStatus(`加载用户信息失败：${error.message}`, true);
        renderEmptyTable("加载用户信息失败", error.message);
      }
    }

    async function refreshUsers(control) {
      await helpers.runUiAction({
        control,
        pendingMessage: "正在刷新用户信息...",
        successMessage: "用户信息已刷新。",
        errorPrefix: "刷新用户信息失败",
        action: () => loadUsers(),
      });
    }

    async function refreshDialogSources() {
      if (typeof helpers.loadSources !== "function") {
        return state.sources || [];
      }
      return helpers.loadSources();
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
      if (elements.filterOrg) {
        elements.filterOrg.value = "";
      }
      pageState.filters = { login: "", workNo: "", name: "", orgUnitId: "" };
    }

    function syncFiltersFromForm() {
      pageState.filters = {
        login: elements.filterLogin?.value.trim() || "",
        workNo: elements.filterWorkNo?.value.trim() || "",
        name: elements.filterName?.value.trim() || "",
        orgUnitId: elements.filterOrg?.value || "",
      };
    }

    function renderOrgOptions() {
      const options = ['<option value="">全部机构</option>'].concat(
        pageState.bootstrap.orgUnits.map((item) => (
          `<option value="${helpers.escapeHtml(String(item.id))}">${helpers.escapeHtml(item.pathLabel)}</option>`
        ))
      );
      if (elements.filterOrg) {
        elements.filterOrg.innerHTML = options.join("");
      }
      if (elements.editorOrg) {
        elements.editorOrg.innerHTML = ['<option value="">请选择机构</option>'].concat(
          pageState.bootstrap.orgUnits.map((item) => (
            `<option value="${helpers.escapeHtml(String(item.id))}">${helpers.escapeHtml(item.pathLabel)}</option>`
          ))
        ).join("");
      }
    }

    function renderSummary() {
      const total = pageState.users.length;
      const active = pageState.users.filter((item) => item.is_active).length;
      const admins = pageState.users.filter((item) => item.role === "admin").length;
      const roleSet = new Set();
      pageState.users.forEach((item) => (item.menu_role_names || []).forEach((name) => roleSet.add(name)));
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(total);
      }
      if (elements.summaryActive) {
        elements.summaryActive.textContent = String(active);
      }
      if (elements.summaryAdmins) {
        elements.summaryAdmins.textContent = String(admins);
      }
      if (elements.summaryRoles) {
        elements.summaryRoles.textContent = String(roleSet.size);
      }
    }

    function renderTable() {
      if (!pageState.users.length) {
        renderEmptyTable("没有匹配的用户信息", "你可以尝试调整筛选条件，或直接新增业务账号。");
        return;
      }
      elements.tableBody.innerHTML = pageState.users.map((user) => `
        <tr data-user-id="${helpers.escapeHtml(String(user.id))}">
          <td class="strong-cell">${helpers.escapeHtml(user.username)}</td>
          <td>${helpers.escapeHtml(user.work_no || "-")}</td>
          <td>${helpers.escapeHtml(user.display_name || user.username)}</td>
          <td><span class="table-status ${user.is_active ? "is-active" : "is-inactive"}">${user.is_active ? "启用" : "停用"}</span></td>
          <td>${helpers.escapeHtml(user.org_name || "-")}</td>
          <td>${renderRoleTags(user.menu_role_names || [])}</td>
          <td>${renderSourceTags(user.allowed_sources || [])}</td>
          <td class="date-cell">${helpers.formatDateTime(user.created_at)}</td>
          <td>
            <div class="permission-inline-actions">
              <button class="legacy-inline-link" type="button" data-user-action="edit" data-user-id="${helpers.escapeHtml(String(user.id))}">编辑</button>
              <button class="legacy-inline-link" type="button" data-user-action="access" data-user-id="${helpers.escapeHtml(String(user.id))}">菜单角色</button>
              <button class="legacy-inline-link" type="button" data-user-action="reset-password" data-user-id="${helpers.escapeHtml(String(user.id))}">重置密码</button>
              <button class="legacy-inline-link danger" type="button" data-user-action="delete" data-user-id="${helpers.escapeHtml(String(user.id))}" ${state.user && state.user.id === user.id ? "disabled" : ""}>删除</button>
              <a class="legacy-inline-link" href="/users/audit?search=${encodeURIComponent(user.username)}">审计</a>
            </div>
          </td>
        </tr>
      `).join("");
    }

    function renderEmptyTable(title, body) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
    }

    function renderRoleTags(roleNames) {
      if (!roleNames.length) {
        return '<span class="table-muted">未分配角色</span>';
      }
      return `<div class="tag-list compact-source-tags">${roleNames.map((item) => `<span class="tag muted">${helpers.escapeHtml(item)}</span>`).join("")}</div>`;
    }

    function renderSourceTags(sources) {
      if (!sources.length) {
        return '<span class="table-muted">未分配来源</span>';
      }
      return `<div class="tag-list compact-source-tags">${sources.map((item) => `<span class="tag">${helpers.escapeHtml(helpers.formatSourceLabel(item))}</span>`).join("")}</div>`;
    }

    async function handleRowAction(action, user, control) {
      if (action === "edit") {
        openEditor("edit", user, control);
        return;
      }
      if (action === "access") {
        await refreshDialogSources();
        openAccessEditor(user, control);
        return;
      }
      if (action === "reset-password") {
        await resetPassword(user, control);
        return;
      }
      if (action === "delete") {
        await deleteUser(user, control);
      }
    }

    function showDialog(modal) {
      modal?.classList.remove("hidden");
      helpers.lockBodyScroll();
    }

    function hideDialog(modal) {
      modal?.classList.add("hidden");
      const editorHidden = elements.editorModal?.classList.contains("hidden") ?? true;
      const accessHidden = elements.accessModal?.classList.contains("hidden") ?? true;
      if (editorHidden && accessHidden) {
        helpers.unlockBodyScroll();
      }
    }

    function toggleEditorAccessFields(visible) {
      elements.editorAccessFields.forEach((node) => {
        node.hidden = !visible;
      });
    }

    function openEditor(mode, user = null, trigger = null) {
      closeAccessEditor({ restoreFocus: false });
      pageState.editorMode = mode;
      pageState.editingUser = user;
      dialogReturnFocus = trigger || document.activeElement;
      showDialog(elements.editorModal);
      if (mode === "create") {
        toggleEditorAccessFields(true);
        elements.editorTitle.textContent = "新增用户";
        elements.editorCopy.textContent = "创建完成后会自动刷新列表，并定位到新账号。";
        elements.editorSubmit.textContent = "创建用户";
        elements.editorPasswordRow.hidden = false;
        elements.editorForm.reset();
        elements.editorId.value = "";
        elements.editorRole.value = "user";
        elements.editorStatus.value = "enabled";
        renderEditorMenuRoles([]);
        renderEditorSources([]);
        setEditorFeedback("请填写用户信息后创建账号。");
      } else if (user) {
        toggleEditorAccessFields(false);
        elements.editorTitle.textContent = "编辑基础信息";
        elements.editorCopy.textContent = "这里维护登录账号、姓名、工号和组织归属；菜单角色与来源范围请在“菜单角色”动作里调整。";
        elements.editorSubmit.textContent = "保存基础信息";
        elements.editorPasswordRow.hidden = true;
        elements.editorId.value = String(user.id);
        elements.editorUsername.value = user.username || "";
        elements.editorDisplayName.value = user.display_name || user.username || "";
        elements.editorWorkNo.value = user.work_no || "";
        elements.editorPassword.value = "";
        elements.editorRole.value = user.role || "user";
        elements.editorStatus.value = user.is_active ? "enabled" : "disabled";
        elements.editorOrg.value = user.org_unit_id ? String(user.org_unit_id) : "";
        renderEditorMenuRoles(user.menu_role_ids || []);
        renderEditorSources(user.allowed_sources || []);
        setEditorFeedback("修改后点击保存，系统会自动刷新列表。");
      }
      window.requestAnimationFrame(() => {
        if (!elements.editorModal?.contains(document.activeElement)) {
          elements.editorUsername?.focus();
        }
      });
    }

    function closeEditor({ restoreFocus = true } = {}) {
      hideDialog(elements.editorModal);
      pageState.editingUser = null;
      toggleEditorAccessFields(true);
      setEditorFeedback("请填写用户信息后保存。");
      if (restoreFocus) {
        dialogReturnFocus?.focus?.();
        dialogReturnFocus = null;
      }
    }

    function openAccessEditor(user, trigger = null) {
      closeEditor({ restoreFocus: false });
      pageState.accessUser = user;
      dialogReturnFocus = trigger || document.activeElement;
      showDialog(elements.accessModal);
      elements.accessTitle.textContent = `设置 ${user.display_name || user.username} 的菜单角色`;
      elements.accessCopy.textContent = "参考原系统的独立菜单角色弹层，把系统角色、账号状态和来源边界集中维护。";
      elements.accessUser.textContent = user.display_name || user.username;
      elements.accessMeta.textContent = `${user.username} · 工号 ${user.work_no || "-"}`;
      elements.accessOrg.textContent = user.org_name || "未分配组织机构";
      elements.accessRole.value = user.role || "user";
      elements.accessStatus.value = user.is_active ? "enabled" : "disabled";
      renderAccessMenuRoles(user.menu_role_ids || []);
      renderAccessSources(user.allowed_sources || []);
      setAccessEditorFeedback("请调整菜单角色和来源范围后保存。");
      updateAccessSelectionMeta();
      window.requestAnimationFrame(() => elements.accessRole?.focus());
    }

    function closeAccessEditor({ restoreFocus = true } = {}) {
      hideDialog(elements.accessModal);
      pageState.accessUser = null;
      setAccessEditorFeedback("请调整菜单角色和来源范围后保存。");
      if (elements.accessUser) {
        elements.accessUser.textContent = "-";
      }
      if (elements.accessMeta) {
        elements.accessMeta.textContent = "-";
      }
      if (elements.accessOrg) {
        elements.accessOrg.textContent = "-";
      }
      if (elements.accessRoleCount) {
        elements.accessRoleCount.textContent = "0 个菜单角色";
      }
      if (elements.accessSourceCount) {
        elements.accessSourceCount.textContent = "0 个来源";
      }
      if (restoreFocus) {
        dialogReturnFocus?.focus?.();
        dialogReturnFocus = null;
      }
    }

    function renderMenuRoleChecklist({ container, selectedIds, checkboxAttribute }) {
      if (!container) {
        return;
      }
      if (!pageState.bootstrap.menuRoles.length) {
        container.innerHTML = '<div class="note">当前还没有菜单角色，请先到“菜单角色”页创建。</div>';
        return;
      }
      const selectedSet = new Set((selectedIds || []).map((item) => Number(item)));
      container.innerHTML = pageState.bootstrap.menuRoles.map((role) => `
        <label class="permission-check-card">
          <input type="checkbox" ${checkboxAttribute}="${helpers.escapeHtml(String(role.id))}" ${selectedSet.has(role.id) ? "checked" : ""}>
          <span class="permission-check-card-title">${helpers.escapeHtml(role.role_name)}</span>
          <span class="permission-check-card-copy">${helpers.escapeHtml(role.role_desc || "未填写角色说明")}</span>
        </label>
      `).join("");
    }

    function renderEditorMenuRoles(selectedIds) {
      renderMenuRoleChecklist({
        container: elements.editorMenuRoles,
        selectedIds,
        checkboxAttribute: "data-user-menu-role",
      });
    }

    function renderAccessMenuRoles(selectedIds) {
      renderMenuRoleChecklist({
        container: elements.accessMenuRoles,
        selectedIds,
        checkboxAttribute: "data-user-access-menu-role",
      });
    }

    function renderSourceSelector({ container, selectedSources, checkboxAttribute, customInputId }) {
      helpers.renderAdminCreateSourceSelector({
        container,
        sources: state.sources,
        checkboxAttribute,
        customInputId,
        customLabel: "添加自定义来源",
      });
      const selectedSet = new Set(selectedSources || []);
      Array.from(container?.querySelectorAll(`[${checkboxAttribute}]`) || []).forEach((node) => {
        const source = node.getAttribute(checkboxAttribute);
        node.checked = selectedSet.has(source);
      });
      const customSources = (selectedSources || []).filter((source) => !(state.sources || []).includes(source));
      const customInput = document.getElementById(customInputId);
      if (customInput) {
        customInput.value = customSources.join(", ");
      }
    }

    function renderEditorSources(selectedSources) {
      renderSourceSelector({
        container: elements.editorSources,
        selectedSources,
        checkboxAttribute: "data-user-source",
        customInputId: "user-editor-source-custom",
      });
    }

    function renderAccessSources(selectedSources) {
      renderSourceSelector({
        container: elements.accessSources,
        selectedSources,
        checkboxAttribute: "data-user-access-source",
        customInputId: "user-access-source-custom",
      });
    }

    function setEditorFeedback(message, isError = false) {
      if (!elements.editorFeedback) {
        return;
      }
      elements.editorFeedback.textContent = message;
      elements.editorFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function setAccessEditorFeedback(message, isError = false) {
      if (!elements.accessFeedback) {
        return;
      }
      elements.accessFeedback.textContent = message;
      elements.accessFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function formatCreateEditorErrorFeedback(message) {
      const guidance = "提交内容不符合要求，请检查账号、密码、角色、菜单和来源配置。";
      const detail = String(message || "").trim();
      if (!detail || detail === guidance || detail.startsWith(`${guidance}\n`)) {
        return guidance;
      }
      return `${guidance}\n具体原因：${detail}`;
    }

    function collectSelectedMenuRoleIds(container, checkboxAttribute) {
      return Array.from(container?.querySelectorAll(`[${checkboxAttribute}]:checked`) || [])
        .map((node) => Number(node.getAttribute(checkboxAttribute)))
        .filter((value) => Number.isFinite(value));
    }

    function collectSelectedSources({ container, checkboxAttribute, customInputId }) {
      const checkedSources = Array.from(container?.querySelectorAll(`[${checkboxAttribute}]:checked`) || [])
        .map((node) => node.getAttribute(checkboxAttribute))
        .filter(Boolean);
      const customSources = String(document.getElementById(customInputId)?.value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const invalidCustom = customSources.find((item) => !helpers.isValidSourceName(item));
      if (invalidCustom) {
        return { error: "自定义来源只能使用 1-50 位字母、数字、下划线或短横线。" };
      }
      return {
        allowedSources: helpers.mergeSourceValues(checkedSources, customSources),
      };
    }

    function buildCreatePayload() {
      const username = elements.editorUsername?.value.trim() || "";
      const displayName = elements.editorDisplayName?.value.trim() || "";
      const workNo = elements.editorWorkNo?.value.trim() || "";
      const password = elements.editorPassword?.value || "";
      const role = elements.editorRole?.value || "user";
      const isActive = elements.editorStatus?.value !== "disabled";
      const orgUnitId = elements.editorOrg?.value ? Number(elements.editorOrg.value) : null;
      const menuRoleIds = collectSelectedMenuRoleIds(elements.editorMenuRoles, "data-user-menu-role");
      const { allowedSources, error: sourceError } = collectSelectedSources({
        container: elements.editorSources,
        checkboxAttribute: "data-user-source",
        customInputId: "user-editor-source-custom",
      });

      if (!username) {
        return { error: "请填写登录账号。" };
      }
      if (!displayName) {
        return { error: "请填写用户名。" };
      }
      if (!workNo) {
        return { error: "请填写工号。" };
      }
      if (password.length < 8) {
        return { error: "初始密码至少需要 8 位。" };
      }
      if (sourceError) {
        return { error: sourceError };
      }
      return {
        payload: {
          username,
          display_name: displayName,
          work_no: workNo,
          password,
          role,
          is_active: isActive,
          org_unit_id: orgUnitId,
          menu_role_ids: menuRoleIds,
          allowed_sources: allowedSources,
        },
      };
    }

    function buildProfilePayload() {
      const username = elements.editorUsername?.value.trim() || "";
      const displayName = elements.editorDisplayName?.value.trim() || "";
      const workNo = elements.editorWorkNo?.value.trim() || "";
      const orgUnitId = elements.editorOrg?.value ? Number(elements.editorOrg.value) : null;
      if (!username) {
        return { error: "请填写登录账号。" };
      }
      if (!displayName) {
        return { error: "请填写用户名。" };
      }
      if (!workNo) {
        return { error: "请填写工号。" };
      }
      return {
        payload: {
          username,
          display_name: displayName,
          work_no: workNo,
          org_unit_id: orgUnitId,
        },
      };
    }

    function buildEditorPayload() {
      return pageState.editorMode === "create" ? buildCreatePayload() : buildProfilePayload();
    }

    function buildAccessPayload() {
      const role = elements.accessRole?.value || "user";
      const isActive = elements.accessStatus?.value !== "disabled";
      const menuRoleIds = collectSelectedMenuRoleIds(elements.accessMenuRoles, "data-user-access-menu-role");
      const { allowedSources, error: sourceError } = collectSelectedSources({
        container: elements.accessSources,
        checkboxAttribute: "data-user-access-source",
        customInputId: "user-access-source-custom",
      });
      if (sourceError) {
        return { error: sourceError };
      }
      return {
        payload: {
          role,
          is_active: isActive,
          menu_role_ids: menuRoleIds,
          allowed_sources: allowedSources,
        },
      };
    }

    function updateAccessSelectionMeta() {
      const selectedRoles = collectSelectedMenuRoleIds(elements.accessMenuRoles, "data-user-access-menu-role");
      const sourceState = collectSelectedSources({
        container: elements.accessSources,
        checkboxAttribute: "data-user-access-source",
        customInputId: "user-access-source-custom",
      });
      if (elements.accessRoleCount) {
        elements.accessRoleCount.textContent = `${selectedRoles.length} 个菜单角色`;
      }
      if (elements.accessSourceCount) {
        const sourceTotal = sourceState.allowedSources?.length || 0;
        elements.accessSourceCount.textContent = `${sourceTotal} 个来源`;
      }
    }

    async function submitEditor() {
      const { payload, error } = buildEditorPayload();
      if (error) {
        const feedback = pageState.editorMode === "create" ? formatCreateEditorErrorFeedback(error) : error;
        setEditorFeedback(feedback, true);
        helpers.setStatus(error, true);
        return;
      }
      const isCreate = pageState.editorMode === "create";
      const actionLabel = isCreate ? `正在创建用户 ${payload.username}...` : `正在保存用户 ${payload.username} 的基础信息...`;
      setEditorFeedback(actionLabel);
      const result = await helpers.runUiAction({
        control: elements.editorSubmit,
        pendingMessage: actionLabel,
        successMessage: isCreate ? `已创建用户 ${payload.username}。` : `已更新用户 ${payload.username} 的基础信息。`,
        errorPrefix: isCreate ? "创建用户失败" : "保存基础信息失败",
        action: async () => {
          if (isCreate) {
            return helpers.createAdminUser(payload);
          }
          const userId = Number(elements.editorId.value);
          return helpers.updateAdminUserProfile(userId, payload);
        },
        onSuccess: async () => {
          closeEditor();
          await Promise.all([loadBootstrap(), loadUsers()]);
        },
      });
      if (!result.ok) {
        const shouldUseCreateGuidance = pageState.editorMode === "create" && (
          result.error?.status === 422 ||
          result.error?.message === "提交内容不符合要求，请检查账号、密码、角色、菜单和来源配置。"
        );
        setEditorFeedback(
          shouldUseCreateGuidance ? formatCreateEditorErrorFeedback(result.error.message) : result.error.message,
          true
        );
      }
    }

    async function submitAccessEditor() {
      if (!pageState.accessUser) {
        return;
      }
      const { payload, error } = buildAccessPayload();
      if (error) {
        setAccessEditorFeedback(error, true);
        helpers.setStatus(error, true);
        return;
      }
      const username = pageState.accessUser.username;
      const result = await helpers.runUiAction({
        control: elements.accessSubmit,
        pendingMessage: `正在保存 ${username} 的权限配置...`,
        successMessage: `已更新 ${username} 的权限配置。`,
        errorPrefix: "保存权限失败",
        action: () => helpers.updateAdminUserAccess(pageState.accessUser.id, payload),
        onSuccess: async () => {
          closeAccessEditor();
          await Promise.all([loadBootstrap(), loadUsers()]);
        },
      });
      if (!result.ok) {
        setAccessEditorFeedback(result.error.message, true);
      }
    }

    async function resetPassword(user, control) {
      const newPassword = window.prompt(`请输入 ${user.username} 的新密码`, "NewPassword123");
      if (!newPassword) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在重置 ${user.username} 的密码...`,
        successMessage: `已重置 ${user.username} 的密码。`,
        errorPrefix: "重置密码失败",
        action: () => helpers.resetAdminUserPassword(user.id, newPassword),
      });
    }

    async function deleteUser(user, control) {
      if (!window.confirm(`确认删除用户 ${user.username} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除用户 ${user.username}...`,
        successMessage: `已删除用户 ${user.username}。`,
        errorPrefix: "删除用户失败",
        action: () => helpers.deleteAdminUser(user.id),
        onSuccess: loadUsers,
      });
    }

    function flattenTree(items, childKey, parentPath = "") {
      const results = [];
      (items || []).forEach((item) => {
        const currentLabel = parentPath ? `${parentPath} / ${item.org_name}` : item.org_name;
        results.push({ ...item, pathLabel: currentLabel });
        results.push(...flattenTree(item[childKey] || [], childKey, currentLabel));
      });
      return results;
    }
  },
};
