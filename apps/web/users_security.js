window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      users: [],
    };

    const elements = {
      createForm: document.getElementById("security-create-form"),
      createUsername: document.getElementById("security-create-username"),
      createPassword: document.getElementById("security-create-password"),
      createRole: document.getElementById("security-create-role"),
      createSources: document.getElementById("security-create-sources"),
      createSubmit: document.getElementById("security-create-submit"),
      securityUserList: document.getElementById("security-user-list"),
      refreshBtn: document.getElementById("security-refresh-btn"),
      usersSecurityNote: document.getElementById("users-security-note"),
      usersSecurityAdminWrap: document.getElementById("users-security-admin-wrap"),
      summaryRole: document.getElementById("security-summary-role"),
      summaryTotal: document.getElementById("security-summary-total"),
      summaryActive: document.getElementById("security-summary-active"),
      summaryInactive: document.getElementById("security-summary-inactive"),
    };

    renderSummary();
    renderCreateSourceSelector();

    if (!helpers.isAdmin()) {
      elements.usersSecurityNote?.classList.remove("hidden");
      elements.usersSecurityAdminWrap?.classList.add("hidden");
      helpers.setStatus("当前账号没有安全操作权限。", true);
      return;
    }

    bindEvents();
    await loadUsers();
    helpers.setStatus("安全操作页已就绪，可以创建账号或执行敏感操作。", false);

    function bindEvents() {
      elements.refreshBtn?.addEventListener("click", loadUsers);
      elements.createForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleAdminCreateUser();
      });
    }

    function renderCreateSourceSelector() {
      helpers.renderAdminCreateSourceSelector({
        container: elements.createSources,
        sources: state.sources,
        checkboxAttribute: "data-create-source",
        customInputId: "security-create-source-custom",
        customLabel: "添加自定义来源",
        emptyMessage: "当前还没有可授权来源，你仍然可以先添加自定义来源。",
      });
    }

    async function handleAdminCreateUser() {
      const { payload, error } = helpers.collectAdminCreateUserPayload({
        usernameInput: elements.createUsername,
        passwordInput: elements.createPassword,
        roleSelect: elements.createRole,
        sourceContainer: elements.createSources,
        checkboxAttribute: "data-create-source",
        customInputId: "security-create-source-custom",
        missingMessage: "请填写新用户的用户名和密码。",
      });
      if (error) {
        helpers.setStatus(error, true);
        return;
      }

      await helpers.runUiAction({
        control: elements.createSubmit,
        pendingMessage: `正在创建用户 ${payload.username}...`,
        successMessage: `已创建用户 ${payload.username}。`,
        errorPrefix: "创建用户失败",
        action: () => helpers.createAdminUser(payload),
        onSuccess: async () => {
          if (elements.createUsername) {
            elements.createUsername.value = "";
          }
          if (elements.createPassword) {
            elements.createPassword.value = "";
          }
          if (elements.createRole) {
            elements.createRole.value = "user";
          }
          renderCreateSourceSelector();
          await loadUsers();
        },
      });
    }

    async function loadUsers() {
      try {
        const payload = await helpers.apiJson("/auth/users");
        pageState.users = payload.users || [];
        renderUsers();
        renderSummary();
      } catch (error) {
        helpers.setStatus(`加载敏感操作列表失败：${error.message}`, true);
      }
    }

    async function patchUserAccess(user, isActive) {
      await helpers.updateAdminUserAccess(user.id, {
        role: user.role,
        allowed_sources: user.allowed_sources || [],
        is_active: isActive,
      });
    }

    async function toggleUserActive(user, control) {
      const nextActive = !user.is_active;
      await helpers.runUiAction({
        control,
        pendingMessage: nextActive ? `正在重新启用 ${user.username}...` : `正在停用 ${user.username}...`,
        successMessage: nextActive ? `已重新启用 ${user.username}。` : `已停用 ${user.username}。`,
        errorPrefix: "更新账号状态失败",
        action: () => patchUserAccess(user, nextActive),
        onSuccess: loadUsers,
      });
    }

    async function resetUserPassword(userId, username, control) {
      const newPassword = window.prompt(`请输入 ${username} 的新密码`, "NewPassword123");
      if (!newPassword) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在重置 ${username} 的密码...`,
        successMessage: `已重置 ${username} 的密码。`,
        errorPrefix: "重置密码失败",
        action: () => helpers.resetAdminUserPassword(userId, newPassword),
      });
    }

    async function deleteUser(userId, username, control) {
      if (!window.confirm(`确认删除用户 ${username} 吗？`)) {
        return;
      }
      await helpers.runUiAction({
        control,
        pendingMessage: `正在删除用户 ${username}...`,
        successMessage: `已删除用户 ${username}。`,
        errorPrefix: "删除用户失败",
        action: () => helpers.deleteAdminUser(userId),
        onSuccess: loadUsers,
      });
    }

    function renderUsers() {
      if (!elements.securityUserList) {
        return;
      }
      if (!pageState.users.length) {
        renderEmptyRow(
          elements.securityUserList,
          5,
          "还没有可执行安全操作的账号",
          "先创建第一个业务账号或管理员账号，后续才能执行重置密码、停用和删除等动作。"
        );
        return;
      }

      elements.securityUserList.innerHTML = "";
      pageState.users.forEach((user, index) => {
        elements.securityUserList.appendChild(buildSecurityRow(user, index + 1));
      });
    }

    function buildSecurityRow(user, rowNumber) {
      const row = document.createElement("tr");
      row.className = "access-user-card security-user-row";
      const isSelf = Boolean(state.user && user.id === state.user.id);
      const sourceHtml = (user.allowed_sources || []).length
        ? user.allowed_sources.map((source) => `<span class="tag muted">${helpers.escapeHtml(source)}</span>`).join("")
        : '<span class="table-muted">未分配来源</span>';

      row.innerHTML = `
        <td class="row-number-col">${rowNumber}</td>
        <td class="strong-cell">
          <div class="table-user-cell">
            <strong>${helpers.escapeHtml(user.username)}</strong>
            <span>ID ${user.id}</span>
          </div>
        </td>
        <td>
          <div class="table-role-cell">
            <strong>${helpers.escapeHtml(user.role)}</strong>
            <span class="table-status ${user.is_active ? "is-active" : "is-inactive"}">${user.is_active ? "启用" : "停用"}</span>
          </div>
        </td>
        <td>
          <div class="tag-list table-tag-list">${sourceHtml}</div>
        </td>
        <td>
          <div class="table-operation-list security-operation-list">
            <button class="table-icon-btn" type="button" data-toggle-active title="${user.is_active ? "停用账号" : "重新启用"}" aria-label="${user.is_active ? "停用" : "重新启用"} ${helpers.escapeHtml(user.username)}">${renderIcon(user.is_active ? "pause" : "play")}</button>
            <button class="table-icon-btn" type="button" data-reset-password title="重置密码" aria-label="重置 ${helpers.escapeHtml(user.username)} 的密码">${renderIcon("key")}</button>
            <button class="table-icon-btn danger" type="button" data-delete-user title="${isSelf ? "不能删除当前登录账号" : "删除用户"}" aria-label="删除 ${helpers.escapeHtml(user.username)}" ${isSelf ? "disabled" : ""}>${renderIcon("trash")}</button>
          </div>
        </td>
      `;

      row.querySelector("[data-toggle-active]")?.addEventListener("click", async (event) => {
        await toggleUserActive(user, event.currentTarget);
      });
      row.querySelector("[data-reset-password]")?.addEventListener("click", async (event) => {
        await resetUserPassword(user.id, user.username, event.currentTarget);
      });
      const deleteButton = row.querySelector("[data-delete-user]");
      if (deleteButton && !deleteButton.disabled) {
        deleteButton.addEventListener("click", async (event) => {
          await deleteUser(user.id, user.username, event.currentTarget);
        });
      }
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
      const total = pageState.users.length;
      const active = pageState.users.filter((item) => item.is_active).length;
      const inactive = total - active;
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可操作" : "只读说明";
      }
      if (elements.summaryTotal) {
        elements.summaryTotal.textContent = String(total);
      }
      if (elements.summaryActive) {
        elements.summaryActive.textContent = String(active);
      }
      if (elements.summaryInactive) {
        elements.summaryInactive.textContent = String(inactive);
      }
    }

    function renderIcon(type) {
      const icons = {
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14"></path><path d="M16 5v14"></path></svg>',
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z"></path></svg>',
        key: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 9.5a4.5 4.5 0 1 1-2.8-4.2 4.5 4.5 0 0 1 2.8 4.2Z"></path><path d="m14 14 6 6"></path><path d="m17 17 2-2"></path><path d="m19 19 2-2"></path></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="m9 7 .8-2h4.4l.8 2"></path><path d="m7 7 1 13h8l1-13"></path></svg>',
      };
      return icons[type] || icons.key;
    }
  },
};
