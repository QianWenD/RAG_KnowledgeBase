window.RagProPage = {
  async init({ helpers }) {
    const pageState = {
      orgUnits: [],
      filteredOrgUnits: [],
      orgTree: [],
      filterCode: "",
      filterName: "",
      editorMode: "create",
      editingOrg: null,
    };

    const elements = {
      usersOrgNote: document.getElementById("users-org-note"),
      usersOrgAdminWrap: document.getElementById("users-org-admin-wrap"),
      filterForm: document.getElementById("org-filter-form"),
      filterCode: document.getElementById("org-filter-code"),
      filterName: document.getElementById("org-filter-name"),
      filterReset: document.getElementById("org-filter-reset"),
      refreshBtn: document.getElementById("org-refresh-btn"),
      createBtn: document.getElementById("org-create-btn"),
      orgTreeList: document.getElementById("org-tree-list"),
      orgUnitList: document.getElementById("org-unit-list"),
      summaryTotal: document.getElementById("org-summary-total"),
      summaryRoot: document.getElementById("org-summary-root"),
      summaryUsers: document.getElementById("org-summary-users"),
      summaryRole: document.getElementById("org-summary-role"),
      editorModal: document.getElementById("org-editor-modal"),
      editorForm: document.getElementById("org-editor-form"),
      editorId: document.getElementById("org-editor-id"),
      editorTitle: document.getElementById("org-editor-title"),
      editorCopy: document.getElementById("org-editor-copy"),
      editorCode: document.getElementById("org-editor-code"),
      editorName: document.getElementById("org-editor-name"),
      editorType: document.getElementById("org-editor-type"),
      editorParent: document.getElementById("org-editor-parent"),
      editorSort: document.getElementById("org-editor-sort"),
      editorDesc: document.getElementById("org-editor-desc"),
      editorFeedback: document.getElementById("org-editor-feedback"),
      editorSubmit: document.getElementById("org-editor-submit"),
      editorClose: document.getElementById("org-editor-close"),
      editorCancel: document.getElementById("org-editor-cancel"),
    };
    let dialogReturnFocus = null;

    bindEvents();
    renderSummary();

    if (!helpers.isAdmin()) {
      elements.usersOrgNote?.classList.remove("hidden");
      elements.usersOrgAdminWrap?.classList.add("hidden");
      helpers.setStatus("当前账号没有组织机构管理权限。", true);
      return;
    }

    await loadData();
    helpers.setStatus("组织机构页已就绪，可以维护节点层级、排序和账号归属。", false);

    function bindEvents() {
      elements.refreshBtn?.addEventListener("click", () => refreshOrgUnits(elements.refreshBtn));
      elements.createBtn?.addEventListener("click", () => openEditor("create"));
      elements.filterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        applyFilter();
      });
      elements.filterReset?.addEventListener("click", () => {
        if (elements.filterCode) {
          elements.filterCode.value = "";
        }
        if (elements.filterName) {
          elements.filterName.value = "";
        }
        applyFilter();
      });
      elements.orgUnitList?.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-org-action]");
        if (!action) {
          return;
        }
        const orgUnitId = Number(action.dataset.orgId);
        const orgUnit = pageState.orgUnits.find((item) => item.id === orgUnitId);
        if (!orgUnit) {
          return;
        }
        if (action.dataset.orgAction === "edit") {
          openEditor("edit", orgUnit, action);
          return;
        }
        if (action.dataset.orgAction === "delete") {
          await deleteOrgUnit(orgUnit, action);
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
    }

    async function loadData() {
      try {
        const [listPayload, treePayload] = await Promise.all([
          helpers.apiJson("/auth/org-units"),
          helpers.apiJson("/auth/org-units/tree"),
        ]);
        pageState.orgUnits = enrichOrgUnits(listPayload.items || []);
        pageState.orgTree = treePayload.items || [];
        renderParentOptions();
        applyFilter();
      } catch (error) {
        helpers.setStatus(`加载组织机构失败：${error.message}`, true);
        renderEmptyRow("加载组织机构失败", error.message);
        elements.orgTreeList.innerHTML = helpers.renderEmptyState("加载组织树失败", error.message, "soft");
      }
    }

    async function refreshOrgUnits(control) {
      await helpers.runUiAction({
        control,
        pendingMessage: "正在刷新组织机构...",
        successMessage: "组织机构已刷新。",
        errorPrefix: "刷新组织机构失败",
        action: () => loadData(),
      });
    }

    function enrichOrgUnits(items) {
      const index = new Map();
      items.forEach((item) => {
        index.set(item.id, {
          ...item,
          parent_name: "",
          path_label: item.org_name,
        });
      });
      for (const item of index.values()) {
        if (item.parent_id && index.has(item.parent_id)) {
          item.parent_name = index.get(item.parent_id).org_name;
          item.path_label = buildPathLabel(item, index);
        }
      }
      return Array.from(index.values()).sort((left, right) => (left.sort_order ?? 100) - (right.sort_order ?? 100) || left.id - right.id);
    }

    function buildPathLabel(item, index) {
      const names = [item.org_name];
      let current = item;
      while (current.parent_id && index.has(current.parent_id)) {
        current = index.get(current.parent_id);
        names.unshift(current.org_name);
      }
      return names.join(" / ");
    }

    function applyFilter() {
      pageState.filterCode = elements.filterCode?.value.trim().toLowerCase() || "";
      pageState.filterName = elements.filterName?.value.trim().toLowerCase() || "";
      pageState.filteredOrgUnits = pageState.orgUnits.filter((item) => {
        const matchesCode = !pageState.filterCode || item.org_code.toLowerCase().includes(pageState.filterCode);
        const matchesName = !pageState.filterName || `${item.org_name} ${item.path_label}`.toLowerCase().includes(pageState.filterName);
        return matchesCode && matchesName;
      });
      renderSummary();
      renderTable();
      renderTree();
    }

    function renderSummary() {
      const source = pageState.filteredOrgUnits.length ? pageState.filteredOrgUnits : pageState.orgUnits;
      const rootCount = source.filter((item) => item.parent_id == null).length;
      const userCount = source.reduce((sum, item) => sum + Number(item.assigned_user_count || 0), 0);
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(source.length);
      }
      if (elements.summaryRoot) {
        elements.summaryRoot.textContent = String(rootCount);
      }
      if (elements.summaryUsers) {
        elements.summaryUsers.textContent = String(userCount);
      }
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可维护" : "只读说明";
      }
    }

    function renderTable() {
      if (!pageState.filteredOrgUnits.length) {
        renderEmptyRow("没有匹配的组织节点", "你可以调整筛选条件，或者直接新增机构节点。");
        return;
      }
      elements.orgUnitList.innerHTML = pageState.filteredOrgUnits.map((item) => `
        <tr class="access-user-card">
          <td class="strong-cell">${helpers.escapeHtml(item.org_code)}</td>
          <td>${helpers.escapeHtml(item.org_name)}</td>
          <td>${helpers.escapeHtml(item.org_type)}</td>
          <td>${helpers.escapeHtml(item.parent_name || "根节点")}</td>
          <td>${helpers.escapeHtml(String(item.assigned_user_count || 0))}</td>
          <td>${helpers.escapeHtml(String(item.sort_order ?? 100))}</td>
          <td>${helpers.escapeHtml(item.org_desc || "-")}</td>
          <td>
            <div class="permission-inline-actions">
              <button class="legacy-inline-link" type="button" data-org-action="edit" data-org-id="${helpers.escapeHtml(String(item.id))}">编辑</button>
              <button class="legacy-inline-link danger" type="button" data-org-action="delete" data-org-id="${helpers.escapeHtml(String(item.id))}">删除</button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    function renderEmptyRow(title, body) {
      elements.orgUnitList.innerHTML = `
        <tr>
          <td colspan="8" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
    }

    function renderTree() {
      if (!pageState.orgTree.length) {
        elements.orgTreeList.innerHTML = helpers.renderEmptyState("暂无组织结构", "保存第一个节点后，这里会自动显示组织树。", "soft");
        return;
      }
      const keyword = pageState.filterName || pageState.filterCode;
      elements.orgTreeList.innerHTML = renderTreeNodes(pageState.orgTree, 0, keyword);
    }

    function renderTreeNodes(nodes, depth, keyword) {
      return (nodes || []).map((node) => {
        const childrenHtml = renderTreeNodes(node.children || [], depth + 1, keyword);
        const selfText = `${node.org_code} ${node.org_name}`.toLowerCase();
        const matchesSelf = !keyword || selfText.includes(keyword);
        const matchesChildren = keyword && childrenHtml.includes("org-tree-node");
        if (keyword && !matchesSelf && !matchesChildren) {
          return "";
        }
        return `
          <div class="org-tree-node" style="--permission-depth:${depth}">
            <div class="org-tree-node-main">
              <strong>${helpers.escapeHtml(node.org_name)}</strong>
              <span>${helpers.escapeHtml(node.org_code)}</span>
              <small>${helpers.escapeHtml(node.org_type)}</small>
              <small>${helpers.escapeHtml(String(node.assigned_user_count || 0))} 个账号</small>
            </div>
            ${childrenHtml ? `<div class="org-tree-children">${childrenHtml}</div>` : ""}
          </div>
        `;
      }).join("");
    }

    function renderParentOptions(currentId = null) {
      const blocked = new Set(currentId ? [currentId, ...collectDescendantIds(currentId)] : []);
      const options = ['<option value="0">作为根节点</option>'].concat(
        pageState.orgUnits
          .filter((item) => !blocked.has(item.id))
          .map((item) => `<option value="${helpers.escapeHtml(String(item.id))}">${helpers.escapeHtml(item.path_label)}</option>`)
      );
      elements.editorParent.innerHTML = options.join("");
    }

    function collectDescendantIds(orgUnitId) {
      const children = pageState.orgUnits.filter((item) => item.parent_id === orgUnitId);
      return children.flatMap((item) => [item.id, ...collectDescendantIds(item.id)]);
    }

    function openEditor(mode, orgUnit = null, trigger = null) {
      pageState.editorMode = mode;
      pageState.editingOrg = orgUnit;
      dialogReturnFocus = trigger || document.activeElement;
      elements.editorModal?.classList.remove("hidden");
      helpers.lockBodyScroll();

      if (mode === "create") {
        elements.editorTitle.textContent = "新增机构";
        elements.editorCopy.textContent = "保存后会同步刷新组织树和用户页的机构下拉选项。";
        elements.editorSubmit.textContent = "创建机构";
        elements.editorForm.reset();
        elements.editorId.value = "";
        elements.editorType.value = "department";
        elements.editorSort.value = "100";
        renderParentOptions();
        setEditorFeedback("请填写组织信息后保存。");
      } else if (orgUnit) {
        elements.editorTitle.textContent = "编辑机构";
        elements.editorCopy.textContent = "你可以调整节点层级、组织说明和排序值，系统会同步刷新组织树。";
        elements.editorSubmit.textContent = "保存机构";
        elements.editorId.value = String(orgUnit.id);
        elements.editorCode.value = orgUnit.org_code || "";
        elements.editorName.value = orgUnit.org_name || "";
        elements.editorType.value = orgUnit.org_type || "department";
        elements.editorSort.value = String(orgUnit.sort_order ?? 100);
        elements.editorDesc.value = orgUnit.org_desc || "";
        renderParentOptions(orgUnit.id);
        elements.editorParent.value = orgUnit.parent_id ? String(orgUnit.parent_id) : "0";
        setEditorFeedback("修改后点击保存，系统会同步更新组织树和机构引用。");
      }
      elements.editorCode?.focus();
    }

    function closeEditor() {
      elements.editorModal?.classList.add("hidden");
      helpers.unlockBodyScroll();
      setEditorFeedback("请填写组织信息后保存。");
      dialogReturnFocus?.focus?.();
      dialogReturnFocus = null;
    }

    function setEditorFeedback(message, isError = false) {
      elements.editorFeedback.textContent = message;
      elements.editorFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function buildEditorPayload() {
      const orgCode = elements.editorCode?.value.trim().toLowerCase() || "";
      const orgName = elements.editorName?.value.trim() || "";
      const orgType = elements.editorType?.value.trim().toLowerCase() || "department";
      const parentId = Number(elements.editorParent?.value || 0);
      const sortOrder = Number(elements.editorSort?.value || 100);
      const orgDesc = elements.editorDesc?.value.trim() || "";

      if (!/^[a-z][a-z0-9_]{1,63}$/.test(orgCode)) {
        return { error: "组织编码需以字母开头，只能使用小写字母、数字或下划线。" };
      }
      if (!orgName) {
        return { error: "组织名称不能为空。" };
      }
      if (!/^[a-z][a-z0-9_-]{1,31}$/.test(orgType)) {
        return { error: "组织类型需以字母开头，只能使用小写字母、数字、下划线或短横线。" };
      }
      return {
        payload: {
          org_code: orgCode,
          org_name: orgName,
          org_type: orgType,
          parent_id: parentId,
          org_desc: orgDesc || null,
          sort_order: Number.isFinite(sortOrder) ? Math.max(0, sortOrder) : 100,
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
      setEditorFeedback(isCreate ? `正在创建机构 ${payload.org_name}...` : `正在保存机构 ${payload.org_name}...`);
      const result = await helpers.runUiAction({
        control: elements.editorSubmit,
        pendingMessage: isCreate ? `正在创建机构 ${payload.org_name}...` : `正在保存机构 ${payload.org_name}...`,
        successMessage: isCreate ? `已创建机构 ${payload.org_name}。` : `已更新机构 ${payload.org_name}。`,
        errorPrefix: isCreate ? "创建机构失败" : "保存机构失败",
        action: () => {
          if (isCreate) {
            return helpers.createOrgUnit(payload);
          }
          return helpers.updateOrgUnit(Number(elements.editorId.value), payload);
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

    async function deleteOrgUnit(orgUnit, control) {
      if (!window.confirm(`确认删除机构 ${orgUnit.org_name} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除机构 ${orgUnit.org_name}...`,
        successMessage: `已删除机构 ${orgUnit.org_name}。`,
        errorPrefix: "删除机构失败",
        action: () => helpers.deleteOrgUnit(orgUnit.id),
        onSuccess: loadData,
      });
    }
  },
};
