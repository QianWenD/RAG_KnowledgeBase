window.RagProPage = {
  async init({ helpers }) {
    const pageState = {
      menus: [],
      filteredMenus: [],
      filterName: "",
      filterRoute: "",
      editorMode: "create",
      editingMenu: null,
      createParent: null,
    };

    const elements = {
      filterForm: document.getElementById("security-filter-form"),
      filterName: document.getElementById("security-filter-name"),
      filterRoute: document.getElementById("security-filter-route"),
      filterReset: document.getElementById("security-filter-reset"),
      securityMenuList: document.getElementById("security-menu-list"),
      refreshBtn: document.getElementById("security-refresh-btn"),
      createBtn: document.getElementById("security-create-btn"),
      usersSecurityNote: document.getElementById("users-security-note"),
      usersSecurityAdminWrap: document.getElementById("users-security-admin-wrap"),
      summaryRole: document.getElementById("security-summary-role"),
      summaryTotal: document.getElementById("security-summary-total"),
      summaryVisible: document.getElementById("security-summary-visible"),
      summaryRoot: document.getElementById("security-summary-root"),
      editorModal: document.getElementById("menu-editor-modal"),
      editorForm: document.getElementById("menu-editor-form"),
      editorId: document.getElementById("menu-editor-id"),
      editorTitle: document.getElementById("menu-editor-title"),
      editorCopy: document.getElementById("menu-editor-copy"),
      editorPreviewName: document.getElementById("menu-editor-preview-name"),
      editorPreviewRoute: document.getElementById("menu-editor-preview-route"),
      editorPreviewParent: document.getElementById("menu-editor-preview-parent"),
      editorPreviewLevel: document.getElementById("menu-editor-preview-level"),
      editorPreviewVisibility: document.getElementById("menu-editor-preview-visibility"),
      editorName: document.getElementById("menu-editor-name"),
      editorCode: document.getElementById("menu-editor-code"),
      editorParent: document.getElementById("menu-editor-parent"),
      editorRouterName: document.getElementById("menu-editor-router-name"),
      editorRouterPath: document.getElementById("menu-editor-router-path"),
      editorHref: document.getElementById("menu-editor-href"),
      editorVisible: document.getElementById("menu-editor-visible"),
      editorSort: document.getElementById("menu-editor-sort"),
      editorRemark: document.getElementById("menu-editor-remark"),
      editorFeedback: document.getElementById("menu-editor-feedback"),
      editorSubmit: document.getElementById("menu-editor-submit"),
      editorClose: document.getElementById("menu-editor-close"),
      editorCancel: document.getElementById("menu-editor-cancel"),
    };
    let dialogReturnFocus = null;

    bindEvents();
    renderSummary();

    if (!helpers.isAdmin()) {
      elements.usersSecurityNote?.classList.remove("hidden");
      elements.usersSecurityAdminWrap?.classList.add("hidden");
      helpers.setStatus("当前账号没有菜单管理权限。", true);
      return;
    }

    await loadMenus();
    helpers.setStatus("菜单管理页已就绪，可以维护菜单目录和路由入口。", false);

    function bindEvents() {
      elements.refreshBtn?.addEventListener("click", () => refreshMenus(elements.refreshBtn));
      elements.createBtn?.addEventListener("click", () => openEditor("create"));
      elements.filterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        applyFilter();
      });
      elements.filterReset?.addEventListener("click", () => {
        if (elements.filterName) {
          elements.filterName.value = "";
        }
        if (elements.filterRoute) {
          elements.filterRoute.value = "";
        }
        applyFilter();
      });
      elements.securityMenuList?.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-menu-action]");
        if (!action) {
          return;
        }
        const menuId = Number(action.dataset.menuId);
        const menu = pageState.menus.find((item) => item.id === menuId);
        if (!menu) {
          return;
        }
        if (action.dataset.menuAction === "edit") {
          openEditor("edit", menu, action);
          return;
        }
        if (action.dataset.menuAction === "create-child") {
          openEditor("create", null, action, { parentMenu: menu });
          return;
        }
        if (action.dataset.menuAction === "delete") {
          await deleteMenu(menu, action);
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
      elements.editorForm?.addEventListener("input", updateEditorPreview);
      elements.editorForm?.addEventListener("change", updateEditorPreview);
    }

    async function loadMenus() {
      try {
        const payload = await helpers.apiJson("/auth/menu-items");
        pageState.menus = buildMenuRelations(payload.items || []);
        renderParentOptions();
        applyFilter();
      } catch (error) {
        helpers.setStatus(`加载菜单目录失败：${error.message}`, true);
        renderEmptyRow("加载菜单目录失败", error.message);
      }
    }

    async function refreshMenus(control) {
      await helpers.runUiAction({
        control,
        pendingMessage: "正在刷新菜单目录...",
        successMessage: "菜单目录已刷新。",
        errorPrefix: "刷新菜单目录失败",
        action: () => loadMenus(),
      });
    }

    function applyFilter() {
      pageState.filterName = elements.filterName?.value.trim().toLowerCase() || "";
      pageState.filterRoute = elements.filterRoute?.value.trim().toLowerCase() || "";
      pageState.filteredMenus = pageState.menus.filter((item) => {
        const matchesName = !pageState.filterName || `${item.name} ${item.menu_code}`.toLowerCase().includes(pageState.filterName);
        const matchesRoute = !pageState.filterRoute || `${item.router_name || ""} ${item.router_path || ""} ${item.href || ""}`.toLowerCase().includes(pageState.filterRoute);
        return matchesName && matchesRoute;
      });
      renderSummary();
      renderTable();
    }

    function renderSummary() {
      const menus = pageState.filteredMenus.length ? pageState.filteredMenus : pageState.menus;
      const total = menus.length;
      const visible = menus.filter((item) => item.is_visible).length;
      const root = menus.filter((item) => item.parent_id == null).length;
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可维护" : "只读说明";
      }
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(total);
      }
      if (elements.summaryVisible) {
        elements.summaryVisible.textContent = String(visible);
      }
      if (elements.summaryRoot) {
        elements.summaryRoot.textContent = String(root);
      }
    }

    function renderTable() {
      if (!pageState.filteredMenus.length) {
        renderEmptyRow("没有匹配的菜单节点", "可以尝试修改筛选条件，或直接新增菜单。");
        return;
      }
      elements.securityMenuList.innerHTML = pageState.filteredMenus.map((item) => `
        <tr class="access-user-card">
          <td class="strong-cell">
            <div class="permission-tree-cell" style="--permission-depth:${item.depth || 0}">
              <strong>${helpers.escapeHtml(item.name)}</strong>
              <span class="permission-tree-meta">${helpers.escapeHtml(item.parent_name || "根节点")} · ${helpers.escapeHtml(item.menu_code)}</span>
            </div>
          </td>
          <td>${helpers.escapeHtml(item.menu_code)}</td>
          <td>${helpers.escapeHtml(item.parent_name || "根节点")}</td>
          <td>${helpers.escapeHtml(item.router_name || "-")}</td>
          <td>${helpers.escapeHtml(item.href || item.router_path || "-")}</td>
          <td><span class="table-status ${item.is_visible ? "is-active" : "is-inactive"}">${item.is_visible ? "显示" : "隐藏"}</span></td>
          <td>${helpers.escapeHtml(String(item.sort_order ?? 100))}</td>
          <td>
            <div class="permission-inline-actions">
              <button class="legacy-inline-link" type="button" data-menu-action="create-child" data-menu-id="${helpers.escapeHtml(String(item.id))}">新增下级</button>
              <button class="legacy-inline-link" type="button" data-menu-action="edit" data-menu-id="${helpers.escapeHtml(String(item.id))}">编辑</button>
              <button class="legacy-inline-link danger" type="button" data-menu-action="delete" data-menu-id="${helpers.escapeHtml(String(item.id))}">删除</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    function renderEmptyRow(title, body) {
      elements.securityMenuList.innerHTML = `
        <tr>
          <td colspan="8" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
    }

    function renderParentOptions(currentId = null, preferredParentId = "0") {
      const options = ['<option value="0">作为根节点</option>'].concat(
        pageState.menus
          .filter((item) => item.id !== currentId)
          .map((item) => `<option value="${helpers.escapeHtml(String(item.id))}">${helpers.escapeHtml(item.pathLabel)}</option>`)
      );
      elements.editorParent.innerHTML = options.join("");
      elements.editorParent.value = preferredParentId;
      updateEditorPreview();
    }

    function openEditor(mode, menu = null, trigger = null, options = {}) {
      pageState.editorMode = mode;
      pageState.editingMenu = menu;
      pageState.createParent = options.parentMenu || null;
      dialogReturnFocus = trigger || document.activeElement;
      elements.editorModal?.classList.remove("hidden");
      helpers.lockBodyScroll();
      if (mode === "create") {
        elements.editorTitle.textContent = "新增菜单";
        elements.editorCopy.textContent = pageState.createParent
          ? `将会在“${pageState.createParent.name}”下创建子菜单，保存后会同步到菜单角色页和侧边导航。`
          : "保存后会立刻同步到菜单角色页和侧边导航。";
        elements.editorSubmit.textContent = "创建菜单";
        elements.editorForm.reset();
        elements.editorId.value = "";
        elements.editorVisible.value = "true";
        elements.editorSort.value = "100";
        renderParentOptions(null, pageState.createParent ? String(pageState.createParent.id) : "0");
        setEditorFeedback("请填写菜单信息后保存。");
      } else if (menu) {
        elements.editorTitle.textContent = "编辑菜单";
        elements.editorCopy.textContent = "你可以直接调整层级、路径、显示状态和排序值。";
        elements.editorSubmit.textContent = "保存菜单";
        elements.editorId.value = String(menu.id);
        elements.editorName.value = menu.name || "";
        elements.editorCode.value = menu.menu_code || "";
        elements.editorRouterName.value = menu.router_name || "";
        elements.editorRouterPath.value = menu.router_path || "";
        elements.editorHref.value = menu.href || "";
        elements.editorVisible.value = menu.is_visible ? "true" : "false";
        elements.editorSort.value = String(menu.sort_order ?? 100);
        elements.editorRemark.value = menu.remark || "";
        renderParentOptions(menu.id, menu.parent_id ? String(menu.parent_id) : "0");
        setEditorFeedback("修改后点击保存，菜单角色页会自动使用最新目录。");
      }
      updateEditorPreview();
      elements.editorName?.focus();
    }

    function closeEditor() {
      elements.editorModal?.classList.add("hidden");
      helpers.unlockBodyScroll();
      pageState.createParent = null;
      setEditorFeedback("请填写菜单信息后保存。");
      dialogReturnFocus?.focus?.();
      dialogReturnFocus = null;
    }

    function setEditorFeedback(message, isError = false) {
      elements.editorFeedback.textContent = message;
      elements.editorFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function updateEditorPreview() {
      const name = elements.editorName?.value.trim() || "待命名菜单";
      const routerName = elements.editorRouterName?.value.trim() || "未设置路由名称";
      const routePath = elements.editorRouterPath?.value.trim() || elements.editorHref?.value.trim() || "未配置页面路径";
      const parentId = Number(elements.editorParent?.value || 0);
      const parentMenu = pageState.menus.find((item) => item.id === parentId) || pageState.createParent || null;
      const level = parentMenu ? `${Number(parentMenu.depth || 0) + 2} 级菜单` : "根导航";
      const parentLabel = parentId && parentMenu ? parentMenu.pathLabel : "根节点";
      const visibility = elements.editorVisible?.value === "false" ? "隐藏" : "显示";
      if (elements.editorPreviewName) {
        elements.editorPreviewName.textContent = name;
      }
      if (elements.editorPreviewRoute) {
        elements.editorPreviewRoute.textContent = `${routerName} · ${routePath}`;
      }
      if (elements.editorPreviewParent) {
        elements.editorPreviewParent.textContent = parentId && parentMenu ? `挂载 ${parentLabel}` : "根节点";
      }
      if (elements.editorPreviewLevel) {
        elements.editorPreviewLevel.textContent = level;
      }
      if (elements.editorPreviewVisibility) {
        elements.editorPreviewVisibility.textContent = visibility;
      }
    }

    function buildEditorPayload() {
      const name = elements.editorName?.value.trim() || "";
      const menuCode = elements.editorCode?.value.trim() || "";
      const parentId = Number(elements.editorParent?.value || 0);
      const routerName = elements.editorRouterName?.value.trim() || "";
      const routerPath = elements.editorRouterPath?.value.trim() || "";
      const href = elements.editorHref?.value.trim() || "";
      const isVisible = elements.editorVisible?.value !== "false";
      const sortOrder = Number(elements.editorSort?.value || 100);
      const remark = elements.editorRemark?.value.trim() || "";

      if (!name) {
        return { error: "请填写菜单名称。" };
      }
      if (!menuCode) {
        return { error: "请填写菜单编码。" };
      }
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(menuCode)) {
        return { error: "菜单编码需以字母开头，只能使用小写字母、数字或下划线。" };
      }
      return {
        payload: {
          name,
          menu_code: menuCode,
          parent_id: parentId,
          router_name: routerName || null,
          router_path: routerPath || null,
          href: href || null,
          is_visible: isVisible,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
          remark: remark || null,
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
      setEditorFeedback(isCreate ? `正在创建菜单 ${payload.name}...` : `正在保存菜单 ${payload.name}...`);
      const result = await helpers.runUiAction({
        control: elements.editorSubmit,
        pendingMessage: isCreate ? `正在创建菜单 ${payload.name}...` : `正在保存菜单 ${payload.name}...`,
        successMessage: isCreate ? `已创建菜单 ${payload.name}。` : `已更新菜单 ${payload.name}。`,
        errorPrefix: isCreate ? "创建菜单失败" : "保存菜单失败",
        action: () => {
          if (isCreate) {
            return helpers.createMenuItem(payload);
          }
          return helpers.updateMenuItem(Number(elements.editorId.value), payload);
        },
        onSuccess: async () => {
          closeEditor();
          await loadMenus();
        },
      });
      if (!result.ok) {
        setEditorFeedback(result.error.message, true);
      }
    }

    async function deleteMenu(menu, control) {
      if (!window.confirm(`确认删除菜单 ${menu.name} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除菜单 ${menu.name}...`,
        successMessage: `已删除菜单 ${menu.name}。`,
        errorPrefix: "删除菜单失败",
        action: () => helpers.deleteMenuItem(menu.id),
        onSuccess: loadMenus,
      });
    }

    function buildMenuRelations(items) {
      const index = new Map();
      items.forEach((item) => index.set(item.id, { ...item, depth: 0, parent_name: "" }));
      const childrenByParent = new Map();
      items.forEach((item) => {
        const key = item.parent_id ?? 0;
        if (!childrenByParent.has(key)) {
          childrenByParent.set(key, []);
        }
        childrenByParent.get(key).push(item);
      });
      const roots = [];
      index.forEach((item) => {
        if (item.parent_id == null || !index.has(item.parent_id)) {
          roots.push(item);
          return;
        }
        const parent = index.get(item.parent_id);
        item.parent_name = parent?.name || "";
      });
      const results = [];
      function walk(item, depth, pathLabel) {
        item.depth = depth;
        item.pathLabel = pathLabel ? `${pathLabel} / ${item.name}` : item.name;
        item.child_count = (childrenByParent.get(item.id) || []).length;
        results.push(item);
        items
          .filter((candidate) => candidate.parent_id === item.id)
          .sort((left, right) => (left.sort_order ?? 100) - (right.sort_order ?? 100) || left.id - right.id)
          .forEach((child) => walk(index.get(child.id), depth + 1, item.pathLabel));
      }
      roots
        .sort((left, right) => (left.sort_order ?? 100) - (right.sort_order ?? 100) || left.id - right.id)
        .forEach((item) => walk(item, 0, ""));
      return results;
    }
  },
};
