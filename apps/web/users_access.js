window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      users: [],
    };

    const elements = {
      accessUserList: document.getElementById("access-user-list"),
      accessRefreshBtn: document.getElementById("access-refresh-btn"),
      usersAccessNote: document.getElementById("users-access-note"),
      usersAccessAdminWrap: document.getElementById("users-access-admin-wrap"),
      summaryRole: document.getElementById("access-summary-role"),
      summaryAdmins: document.getElementById("access-summary-admins"),
      summaryUsers: document.getElementById("access-summary-users"),
      summarySources: document.getElementById("access-summary-sources"),
    };

    renderSummary();

    if (!helpers.isAdmin()) {
      elements.usersAccessNote?.classList.remove("hidden");
      elements.usersAccessAdminWrap?.classList.add("hidden");
      helpers.setStatus("当前账号没有授权管理能力。", true);
      return;
    }

    elements.accessRefreshBtn?.addEventListener("click", loadUsers);
    await loadUsers();
    helpers.setStatus("角色与授权页已就绪，可以批量调整来源范围和账号状态。", false);

    async function loadUsers() {
      try {
        const payload = await helpers.apiJson("/auth/users");
        pageState.users = payload.users || [];
        renderUsers();
        renderSummary();
      } catch (error) {
        helpers.setStatus(`加载授权列表失败：${error.message}`, true);
      }
    }

    async function saveUserAccess(userId, payload, control) {
      await helpers.runUiAction({
        control,
        pendingMessage: "正在保存授权...",
        successMessage: "授权更新成功。",
        errorPrefix: "授权更新失败",
        action: () => helpers.updateAdminUserAccess(userId, payload),
        onSuccess: loadUsers,
      });
    }

    function renderUsers() {
      if (!elements.accessUserList) {
        return;
      }
      if (!pageState.users.length) {
        renderEmptyRow(
          elements.accessUserList,
          5,
          "还没有可配置账号",
          "你可以先去安全操作页创建账号，然后再回到这里分配角色和来源。"
        );
        return;
      }

      elements.accessUserList.innerHTML = "";
      pageState.users.forEach((user, index) => {
        elements.accessUserList.appendChild(buildAccessRow(user, index + 1));
      });
    }

    function buildAccessRow(user, rowNumber) {
      const row = document.createElement("tr");
      row.className = "access-user-card editable-user-row";
      const availableSources = helpers.mergeSourceValues(state.sources || [], user.allowed_sources || []);
      const assignedSources = Array.isArray(user.allowed_sources) ? user.allowed_sources : [];
      const checkboxHtml = availableSources.map((source) => {
        const checked = assignedSources.includes(source) ? "checked" : "";
        return `
          <label class="source-checkbox">
            <input type="checkbox" data-user-source="${helpers.escapeHtml(source)}" ${checked}>
            <span>${helpers.escapeHtml(source)}</span>
          </label>
        `;
      }).join("");
      const sourceSummaryHtml = assignedSources.length
        ? assignedSources.slice(0, 4).map((source) => `<span class="tag muted">${helpers.escapeHtml(source)}</span>`).join("")
        : '<span class="table-muted">未分配来源</span>';
      const sourceOverflow = assignedSources.length > 4
        ? `<span class="source-count-chip">+${assignedSources.length - 4}</span>`
        : "";

      row.innerHTML = `
        <td class="row-number-col">${rowNumber}</td>
        <td class="strong-cell">
          <div class="table-user-cell">
            <strong>${helpers.escapeHtml(user.username)}</strong>
            <span>ID ${user.id}</span>
          </div>
        </td>
        <td>
          <div class="table-edit-grid">
            <label class="compact-field">
              <span>角色</span>
              <select data-role-select>
                <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
                <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
              </select>
            </label>
            <label class="table-toggle">
              <input type="checkbox" data-active-toggle ${user.is_active ? "checked" : ""}>
              <span>${user.is_active ? "启用中" : "已停用"}</span>
            </label>
          </div>
        </td>
        <td class="source-editor-cell">
          <div class="source-summary-row">
            <div class="tag-list compact-source-tags">${sourceSummaryHtml}${sourceOverflow}</div>
            <button class="table-icon-btn source-edit-toggle" type="button" data-source-edit-toggle aria-expanded="false" title="编辑来源" aria-label="编辑 ${helpers.escapeHtml(user.username)} 的来源授权">${renderIcon("edit")}</button>
          </div>
          <div class="source-editor-panel" data-source-editor hidden>
            <div class="source-checkbox-grid table-source-stack">
              ${checkboxHtml || '<span class="table-muted">暂无可分配来源</span>'}
              <label class="source-custom-field compact-custom-field">
                <span>自定义来源</span>
                <input type="text" data-user-source-custom maxlength="50" placeholder="policy_2026">
              </label>
            </div>
          </div>
        </td>
        <td>
          <div class="table-operation-list">
            <button class="table-icon-btn is-save" type="button" data-save-access title="保存授权" aria-label="保存 ${helpers.escapeHtml(user.username)} 的授权">${renderIcon("save")}</button>
            <a class="table-icon-btn" href="${helpers.getUserAdminActionHref("security", user)}" title="安全操作" aria-label="进入 ${helpers.escapeHtml(user.username)} 的安全操作">${renderIcon("settings")}</a>
          </div>
        </td>
      `;

      row.querySelector("[data-source-edit-toggle]")?.addEventListener("click", () => {
        const editor = row.querySelector("[data-source-editor]");
        const toggle = row.querySelector("[data-source-edit-toggle]");
        const expanded = editor?.hidden;
        if (!editor || !toggle) {
          return;
        }
        editor.hidden = !expanded;
        toggle.setAttribute("aria-expanded", String(Boolean(expanded)));
        row.classList.toggle("is-source-open", Boolean(expanded));
      });

      row.querySelector("[data-save-access]")?.addEventListener("click", async (event) => {
        const checkedSources = Array.from(row.querySelectorAll("[data-user-source]:checked"))
          .map((node) => node.getAttribute("data-user-source"));
        const customSource = row.querySelector("[data-user-source-custom]")?.value.trim() || "";
        if (customSource && !helpers.isValidSourceName(customSource)) {
          helpers.setStatus("自定义来源只能使用 1-50 位字母、数字、下划线或短横线。", true);
          return;
        }
        const allowedSources = helpers.mergeSourceValues(
          checkedSources,
          customSource ? [customSource] : [],
        );
        const role = row.querySelector("[data-role-select]")?.value || "user";
        const isActive = Boolean(row.querySelector("[data-active-toggle]")?.checked);
        await saveUserAccess(
          user.id,
          {
            role,
            allowed_sources: allowedSources,
            is_active: isActive,
          },
          event.currentTarget,
        );
      });

      return row;
    }

    function renderEmptyRow(container, colSpan, title, body) {
      container.innerHTML = `
        <tr>
          <td colspan="${colSpan}" class="users-table-empty">
            <strong>${helpers.escapeHtml(title)}</strong>
            <span>${helpers.escapeHtml(body)}</span>
          </td>
        </tr>
      `;
    }

    function renderSummary() {
      const adminCount = pageState.users.filter((item) => item.role === "admin").length;
      const total = pageState.users.length;
      const sourceCount = Array.isArray(state.sources) ? state.sources.length : 0;
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可编辑" : "只读说明";
      }
      if (elements.summaryAdmins) {
        elements.summaryAdmins.textContent = String(adminCount);
      }
      if (elements.summaryUsers) {
        elements.summaryUsers.textContent = String(total - adminCount);
      }
      if (elements.summarySources) {
        elements.summarySources.textContent = String(sourceCount);
      }
    }

    function renderIcon(type) {
      const icons = {
        edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.7V20h3.3L17.1 10.2l-3.3-3.3L4 16.7Z"></path><path d="m15 5.7 1.2-1.2a1.8 1.8 0 0 1 2.6 0l.7.7a1.8 1.8 0 0 1 0 2.6L18.3 9"></path></svg>',
        save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5Z"></path><path d="M8 4v6h8V4"></path><path d="M8 20v-6h8v6"></path></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="m19 12 .9-1.7-2-3.4-1.9.1a7.8 7.8 0 0 0-1.5-.9L13.5 4h-4l-.9 2.1c-.5.2-1 .5-1.5.9L5.2 6.9l-2 3.4L4 12l-.9 1.7 2 3.4 1.9-.1c.5.4 1 .7 1.5.9l1 2.1h4l1-2.1c.5-.2 1-.5 1.5-.9l1.9.1 2-3.4L19 12Z"></path></svg>',
      };
      return icons[type] || icons.settings;
    }
  },
};
