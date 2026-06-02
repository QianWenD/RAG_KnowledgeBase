window.RagProPage = {
  async init({ helpers }) {
    const pageState = {
      roles: [],
      filteredRoles: [],
      menuItems: [],
      filterName: "",
      editorMode: "create",
      editingRole: null,
      editorStep: 0,
    };

    const elements = {
      accessRoleList: document.getElementById("access-role-list"),
      accessRefreshBtn: document.getElementById("access-refresh-btn"),
      accessCreateBtn: document.getElementById("access-create-btn"),
      usersAccessNote: document.getElementById("users-access-note"),
      usersAccessAdminWrap: document.getElementById("users-access-admin-wrap"),
      filterForm: document.getElementById("access-filter-form"),
      filterName: document.getElementById("access-filter-name"),
      filterReset: document.getElementById("access-filter-reset"),
      summaryRole: document.getElementById("access-summary-role"),
      summaryTotal: document.getElementById("access-summary-total"),
      summaryMenus: document.getElementById("access-summary-menus"),
      summaryUsers: document.getElementById("access-summary-users"),
      editorModal: document.getElementById("role-editor-modal"),
      editorForm: document.getElementById("role-editor-form"),
      editorId: document.getElementById("role-editor-id"),
      editorTitle: document.getElementById("role-editor-title"),
      editorCopy: document.getElementById("role-editor-copy"),
      editorPreviewName: document.getElementById("role-editor-preview-name"),
      editorPreviewCopy: document.getElementById("role-editor-preview-copy"),
      editorPreviewCode: document.getElementById("role-editor-preview-code"),
      editorPreviewUsers: document.getElementById("role-editor-preview-users"),
      editorPreviewCount: document.getElementById("role-editor-preview-count"),
      editorSteps: Array.from(document.querySelectorAll("[data-role-step]")),
      editorStepPanels: Array.from(document.querySelectorAll("[data-role-step-panel]")),
      editorName: document.getElementById("role-editor-name"),
      editorCode: document.getElementById("role-editor-code"),
      editorDesc: document.getElementById("role-editor-desc"),
      editorMenuTree: document.getElementById("role-editor-menu-tree"),
      editorSelectAll: document.getElementById("role-editor-select-all"),
      editorClearAll: document.getElementById("role-editor-clear-all"),
      editorSelectionCount: document.getElementById("role-editor-selection-count"),
      editorSelectionCopy: document.getElementById("role-editor-selection-copy"),
      editorSelectionPreview: document.getElementById("role-editor-selection-preview"),
      editorFeedback: document.getElementById("role-editor-feedback"),
      editorPrev: document.getElementById("role-editor-prev"),
      editorNext: document.getElementById("role-editor-next"),
      editorSubmit: document.getElementById("role-editor-submit"),
      editorClose: document.getElementById("role-editor-close"),
      editorCancel: document.getElementById("role-editor-cancel"),
    };
    let dialogReturnFocus = null;

    bindEvents();
    renderSummary();

    if (!helpers.isAdmin()) {
      elements.usersAccessNote?.classList.remove("hidden");
      elements.usersAccessAdminWrap?.classList.add("hidden");
      helpers.setStatus("当前账号没有菜单角色管理权限。", true);
      return;
    }

    await loadData();
    helpers.setStatus("菜单角色页已就绪，可以按角色台账维护菜单授权。", false);

    function bindEvents() {
      elements.accessRefreshBtn?.addEventListener("click", () => refreshRoles(elements.accessRefreshBtn));
      elements.accessCreateBtn?.addEventListener("click", () => openEditor("create"));
      elements.filterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        applyFilter();
      });
      elements.filterReset?.addEventListener("click", () => {
        if (elements.filterName) {
          elements.filterName.value = "";
        }
        applyFilter();
      });
      elements.editorSelectAll?.addEventListener("click", () => toggleAllMenus(true));
      elements.editorClearAll?.addEventListener("click", () => toggleAllMenus(false));
      elements.editorPrev?.addEventListener("click", () => setEditorStep(0));
      elements.editorNext?.addEventListener("click", advanceEditorStep);
      elements.accessRoleList?.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-role-action]");
        if (!action) {
          return;
        }
        const roleId = Number(action.dataset.roleId);
        const role = pageState.roles.find((item) => item.id === roleId);
        if (!role) {
          return;
        }
        if (action.dataset.roleAction === "edit") {
          openEditor("edit", role, action);
          return;
        }
        if (action.dataset.roleAction === "delete") {
          await deleteRole(role, action);
        }
      });
      elements.editorClose?.addEventListener("click", closeEditor);
      elements.editorCancel?.addEventListener("click", closeEditor);
      elements.editorModal?.addEventListener("click", (event) => {
        if (event.target === elements.editorModal) {
          closeEditor();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !elements.editorModal?.classList.contains("hidden")) {
          closeEditor();
        }
      });
      elements.editorForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitEditor();
      });
      elements.editorMenuTree?.addEventListener("change", () => updateSelectionCount());
      elements.editorForm?.addEventListener("input", updateRolePreview);
      elements.editorForm?.addEventListener("change", updateRolePreview);
    }

    async function loadData() {
      try {
        const [rolePayload, bootstrap] = await Promise.all([
          helpers.apiJson("/auth/menu-roles"),
          helpers.getPermissionBootstrap(),
        ]);
        pageState.roles = rolePayload.items || [];
        pageState.menuItems = flattenTree(bootstrap.menu_items || [], "children");
        applyFilter();
      } catch (error) {
        helpers.setStatus(`加载菜单角色失败：${error.message}`, true);
        renderEmptyRow("加载菜单角色失败", error.message);
      }
    }

    async function refreshRoles(control) {
      await helpers.runUiAction({
        control,
        pendingMessage: "正在刷新菜单角色...",
        successMessage: "菜单角色已刷新。",
        errorPrefix: "刷新菜单角色失败",
        action: () => loadData(),
      });
    }

    function applyFilter() {
      pageState.filterName = elements.filterName?.value.trim().toLowerCase() || "";
      pageState.filteredRoles = pageState.roles.filter((item) => {
        if (!pageState.filterName) {
          return true;
        }
        return `${item.role_name} ${item.role_code}`.toLowerCase().includes(pageState.filterName);
      });
      renderSummary();
      renderTable();
    }

    function renderSummary() {
      const total = pageState.filteredRoles.length || pageState.roles.length;
      const menuCount = pageState.menuItems.filter((item) => item.href || item.router_path).length;
      const userCount = (pageState.roles || []).reduce((sum, item) => sum + Number(item.assigned_user_count || 0), 0);
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可维护" : "只读说明";
      }
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(total);
      }
      if (elements.summaryMenus) {
        elements.summaryMenus.textContent = String(menuCount);
      }
      if (elements.summaryUsers) {
        elements.summaryUsers.textContent = String(userCount);
      }
    }

    function renderTable() {
      if (!pageState.filteredRoles.length) {
        renderEmptyRow("没有匹配的菜单角色", "你可以尝试修改筛选条件，或者直接新增角色。");
        return;
      }
      elements.accessRoleList.innerHTML = pageState.filteredRoles.map((role) => `
        <tr class="access-user-card">
          <td class="strong-cell">${helpers.escapeHtml(role.role_name)}</td>
          <td>${helpers.escapeHtml(role.role_code)}</td>
          <td class="role-desc-cell" title="${helpers.escapeHtml(role.role_desc || "-")}">${helpers.escapeHtml(role.role_desc || "-")}</td>
          <td class="metric-cell">${helpers.escapeHtml(String((role.menu_ids || []).length))}</td>
          <td class="metric-cell">${helpers.escapeHtml(String(role.assigned_user_count || 0))}</td>
          <td class="menu-summary-cell">${renderMenuSummary(role.menu_names || [])}</td>
          <td class="date-cell" title="${helpers.escapeHtml(helpers.formatDateTime(role.created_at))}">${formatCompactDateTime(role.created_at)}</td>
          <td>
            <div class="permission-inline-actions">
              <button class="legacy-inline-link" type="button" data-role-action="edit" data-role-id="${helpers.escapeHtml(String(role.id))}">编辑</button>
              <button class="legacy-inline-link danger" type="button" data-role-action="delete" data-role-id="${helpers.escapeHtml(String(role.id))}">删除</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    function renderEmptyRow(title, body) {
      elements.accessRoleList.innerHTML = `
        <tr>
          <td colspan="8" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
    }

    function renderMenuSummary(names) {
      if (!names.length) {
        return '<span class="table-muted">未分配菜单</span>';
      }
      return `<div class="tag-list compact-source-tags">${names.slice(0, 4).map((item) => `<span class="tag muted">${helpers.escapeHtml(item)}</span>`).join("")}${names.length > 4 ? `<span class="source-count-chip">+${names.length - 4}</span>` : ""}</div>`;
    }

    function formatCompactDateTime(value) {
      if (!value) {
        return "-";
      }
      const normalized = String(value).trim();
      const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
      if (match) {
        return match[4] ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}` : `${match[1]}-${match[2]}-${match[3]}`;
      }
      const fallback = helpers.formatDateTime(value);
      return fallback.length > 16 ? fallback.slice(0, 16) : fallback;
    }

    function openEditor(mode, role = null, trigger = null) {
      pageState.editorMode = mode;
      pageState.editingRole = role;
      pageState.editorStep = 0;
      dialogReturnFocus = trigger || document.activeElement;
      elements.editorModal?.classList.remove("hidden");
      helpers.lockBodyScroll();
      if (mode === "create") {
        elements.editorTitle.textContent = "新增角色";
        elements.editorCopy.textContent = "角色保存后会立刻同步到用户信息页。";
        elements.editorSubmit.textContent = "创建角色";
        elements.editorForm.reset();
        elements.editorId.value = "";
        renderMenuTree([]);
        setEditorFeedback("请填写角色信息后保存。");
      } else if (role) {
        elements.editorTitle.textContent = "编辑角色";
        elements.editorCopy.textContent = "你可以直接调整角色说明和菜单授权范围。";
        elements.editorSubmit.textContent = "保存角色";
        elements.editorId.value = String(role.id);
        elements.editorName.value = role.role_name || "";
        elements.editorCode.value = role.role_code || "";
        elements.editorDesc.value = role.role_desc || "";
        renderMenuTree(role.menu_ids || []);
        setEditorFeedback("修改后点击保存，系统会自动同步用户角色映射。");
      }
      setEditorStep(0);
      updateRolePreview();
      elements.editorName?.focus();
    }

    function closeEditor() {
      elements.editorModal?.classList.add("hidden");
      helpers.unlockBodyScroll();
      setEditorStep(0);
      setEditorFeedback("请填写角色信息后保存。");
      dialogReturnFocus?.focus?.();
      dialogReturnFocus = null;
    }

    function setEditorStep(step) {
      pageState.editorStep = step;
      elements.editorStepPanels.forEach((panel) => {
        panel.classList.toggle("hidden", Number(panel.dataset.roleStepPanel) !== step);
      });
      elements.editorSteps.forEach((item) => {
        const itemStep = Number(item.dataset.roleStep);
        item.classList.toggle("is-active", itemStep === step);
        item.classList.toggle("is-complete", itemStep < step);
      });
      elements.editorPrev?.classList.toggle("hidden", step === 0);
      elements.editorNext?.classList.toggle("hidden", step !== 0);
      elements.editorSubmit?.classList.toggle("hidden", step !== 1);
    }

    function advanceEditorStep() {
      const { error } = buildEditorPayload({ basicOnly: true });
      if (error) {
        setEditorFeedback(error, true);
        helpers.setStatus(error, true);
        return;
      }
      setEditorFeedback("基础信息已确认，请继续勾选菜单权限。");
      setEditorStep(1);
    }

    function renderMenuTree(selectedIds) {
      const selectedSet = new Set((selectedIds || []).map((item) => Number(item)));
      if (!pageState.menuItems.length) {
        elements.editorMenuTree.innerHTML = '<div class="note">当前还没有菜单节点，请先到菜单管理页创建。</div>';
        updateSelectionCount();
        return;
      }
      elements.editorMenuTree.innerHTML = pageState.menuItems.map((item) => `
        <label class="permission-tree-item" style="--permission-depth:${item.depth || 0}">
          <input type="checkbox" data-menu-id="${helpers.escapeHtml(String(item.id))}" ${selectedSet.has(item.id) ? "checked" : ""}>
          <span class="permission-tree-item-title">${helpers.escapeHtml(item.name)}</span>
          <span class="permission-tree-item-copy">${helpers.escapeHtml(item.href || item.router_path || item.menu_code)}</span>
        </label>
      `).join("");
      updateSelectionCount();
    }

    function toggleAllMenus(checked) {
      Array.from(elements.editorMenuTree?.querySelectorAll("[data-menu-id]") || []).forEach((node) => {
        node.checked = checked;
      });
      updateSelectionCount();
    }

    function updateSelectionCount() {
      if (!elements.editorSelectionCount) {
        return;
      }
      const selected = elements.editorMenuTree?.querySelectorAll("[data-menu-id]:checked").length || 0;
      elements.editorSelectionCount.textContent = `已选 ${selected} 项`;
      updateRolePreview();
    }

    function updateRolePreview() {
      const roleName = elements.editorName?.value.trim() || "待命名角色";
      const roleCode = elements.editorCode?.value.trim();
      const selectedIds = Array.from(elements.editorMenuTree?.querySelectorAll("[data-menu-id]:checked") || [])
        .map((node) => Number(node.getAttribute("data-menu-id")))
        .filter((value) => Number.isFinite(value));
      const selectedSet = new Set(selectedIds);
      const selectedMenus = pageState.menuItems.filter((item) => selectedSet.has(item.id));
      if (elements.editorPreviewName) {
        elements.editorPreviewName.textContent = roleName;
      }
      if (elements.editorPreviewCopy) {
        elements.editorPreviewCopy.textContent = pageState.editorMode === "create"
          ? "基础信息和菜单授权会分两步完成，保存后会同步到用户信息页。"
          : "角色说明和菜单授权会实时联动，保存后用户页会直接读取这组角色能力。";
      }
      if (elements.editorPreviewCode) {
        elements.editorPreviewCode.textContent = roleCode ? `编码 ${roleCode}` : "未设置编码";
      }
      if (elements.editorPreviewUsers) {
        elements.editorPreviewUsers.textContent = `${pageState.editingRole?.assigned_user_count || 0} 个账号`;
      }
      if (elements.editorPreviewCount) {
        elements.editorPreviewCount.textContent = `${selectedMenus.length} 项菜单`;
      }
      if (elements.editorSelectionCopy) {
        elements.editorSelectionCopy.textContent = selectedMenus.length
          ? `已选择 ${selectedMenus.length} 个菜单节点，保存后会同步给当前角色下的账号。`
          : "还没有勾选菜单节点。";
      }
      if (elements.editorSelectionPreview) {
        if (!selectedMenus.length) {
          elements.editorSelectionPreview.innerHTML = '<span class="table-muted">尚未选择菜单</span>';
          return;
        }
        elements.editorSelectionPreview.innerHTML = selectedMenus
          .slice(0, 4)
          .map((item) => `<span class="tag muted">${helpers.escapeHtml(item.name)}</span>`)
          .join("") + (selectedMenus.length > 4 ? `<span class="source-count-chip">+${selectedMenus.length - 4}</span>` : "");
      }
    }

    function setEditorFeedback(message, isError = false) {
      elements.editorFeedback.textContent = message;
      elements.editorFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function buildEditorPayload(options = {}) {
      const { basicOnly = false } = options;
      const roleName = elements.editorName?.value.trim() || "";
      const roleCode = elements.editorCode?.value.trim() || "";
      const roleDesc = elements.editorDesc?.value.trim() || "";
      const menuIds = Array.from(elements.editorMenuTree?.querySelectorAll("[data-menu-id]:checked") || [])
        .map((node) => Number(node.getAttribute("data-menu-id")))
        .filter((value) => Number.isFinite(value));

      if (!roleName) {
        return { error: "请填写角色名称。" };
      }
      if (!roleCode) {
        return { error: "请填写角色编码。" };
      }
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(roleCode)) {
        return { error: "角色编码需以字母开头，只能使用小写字母、数字或下划线。" };
      }
      if (basicOnly) {
        return {
          payload: {
            role_name: roleName,
            role_code: roleCode,
            role_desc: roleDesc || null,
          },
        };
      }
      return {
        payload: {
          role_name: roleName,
          role_code: roleCode,
          role_desc: roleDesc || null,
          menu_ids: menuIds,
        },
      };
    }

    async function submitEditor() {
      const { payload, error } = buildEditorPayload();
      if (error) {
        setEditorFeedback(error, true);
        helpers.setStatus(error, true);
        return;
      }
      const isCreate = pageState.editorMode === "create";
      setEditorFeedback(isCreate ? `正在创建角色 ${payload.role_name}...` : `正在保存角色 ${payload.role_name}...`);
      const result = await helpers.runUiAction({
        control: elements.editorSubmit,
        pendingMessage: isCreate ? `正在创建角色 ${payload.role_name}...` : `正在保存角色 ${payload.role_name}...`,
        successMessage: isCreate ? `已创建角色 ${payload.role_name}。` : `已更新角色 ${payload.role_name}。`,
        errorPrefix: isCreate ? "创建角色失败" : "保存角色失败",
        action: () => {
          if (isCreate) {
            return helpers.createMenuRole(payload);
          }
          return helpers.updateMenuRole(Number(elements.editorId.value), payload);
        },
        onSuccess: async () => {
          closeEditor();
          await loadData();
        },
      });
      if (!result.ok) {
        setEditorFeedback(result.error.message, true);
      }
    }

    async function deleteRole(role, control) {
      if (!window.confirm(`确认删除角色 ${role.role_name} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除角色 ${role.role_name}...`,
        successMessage: `已删除角色 ${role.role_name}。`,
        errorPrefix: "删除角色失败",
        action: () => helpers.deleteMenuRole(role.id),
        onSuccess: loadData,
      });
    }

    function flattenTree(items, childKey, depth = 0) {
      const results = [];
      (items || []).forEach((item) => {
        results.push({ ...item, depth });
        results.push(...flattenTree(item[childKey] || [], childKey, depth + 1));
      });
      return results;
    }
  },
};
