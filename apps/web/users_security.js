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
      if (!elements.createSources) {
        return;
      }
      if (!(state.sources || []).length) {
        elements.createSources.innerHTML = `
          <div class="note">当前还没有可授权来源，你仍然可以先添加自定义来源。</div>
          ${renderCreateCustomSourceField()}
        `;
        return;
      }
      elements.createSources.innerHTML = (state.sources || []).map((source) => `
        <label class="source-checkbox">
          <input type="checkbox" data-create-source="${helpers.escapeHtml(source)}">
          <span>${helpers.escapeHtml(source)}</span>
        </label>
      `).join("") + renderCreateCustomSourceField();
    }

    function renderCreateCustomSourceField() {
      return `
        <label class="source-custom-field">
          <span>添加自定义来源</span>
          <input id="security-create-source-custom" type="text" maxlength="50" placeholder="例如 ops_2026">
        </label>
      `;
    }

    async function handleAdminCreateUser() {
      const username = elements.createUsername?.value.trim() || "";
      const password = elements.createPassword?.value || "";
      const role = elements.createRole?.value || "user";
      const checkedSources = Array.from(elements.createSources?.querySelectorAll("[data-create-source]:checked") || [])
        .map((node) => node.getAttribute("data-create-source"));
      const customSource = document.getElementById("security-create-source-custom")?.value.trim() || "";
      if (customSource && !helpers.isValidSourceName(customSource)) {
        helpers.setStatus("自定义来源只能使用 1-50 位字母、数字、下划线或短横线。", true);
        return;
      }
      const allowedSources = helpers.mergeSourceValues(
        checkedSources,
        customSource ? [customSource] : [],
      );

      if (!username || !password) {
        helpers.setStatus("请填写新用户的用户名和密码。", true);
        return;
      }

      try {
        elements.createSubmit.disabled = true;
        await helpers.apiJson("/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            role,
            allowed_sources: allowedSources,
            is_active: true,
          }),
        });
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
        helpers.setStatus(`已创建用户 ${username}。`, false);
      } catch (error) {
        helpers.setStatus(`创建用户失败：${error.message}`, true);
      } finally {
        elements.createSubmit.disabled = false;
      }
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
      await helpers.apiJson(`/auth/users/${user.id}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          allowed_sources: user.allowed_sources || [],
          is_active: isActive,
        }),
      });
    }

    async function toggleUserActive(user) {
      const nextActive = !user.is_active;
      try {
        await patchUserAccess(user, nextActive);
        helpers.setStatus(nextActive ? `已重新启用 ${user.username}。` : `已停用 ${user.username}。`, false);
        await loadUsers();
      } catch (error) {
        helpers.setStatus(`更新账号状态失败：${error.message}`, true);
      }
    }

    async function resetUserPassword(userId, username) {
      const newPassword = window.prompt(`请输入 ${username} 的新密码`, "NewPassword123");
      if (!newPassword) {
        return;
      }
      try {
        await helpers.apiJson(`/auth/users/${userId}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: newPassword }),
        });
        helpers.setStatus(`已重置 ${username} 的密码。`, false);
      } catch (error) {
        helpers.setStatus(`重置密码失败：${error.message}`, true);
      }
    }

    async function deleteUser(userId, username) {
      if (!window.confirm(`确认删除用户 ${username} 吗？`)) {
        return;
      }
      try {
        await helpers.apiJson(`/auth/users/${userId}`, { method: "DELETE" });
        helpers.setStatus(`已删除用户 ${username}。`, false);
        await loadUsers();
      } catch (error) {
        helpers.setStatus(`删除用户失败：${error.message}`, true);
      }
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

      row.querySelector("[data-toggle-active]")?.addEventListener("click", async () => {
        await toggleUserActive(user);
      });
      row.querySelector("[data-reset-password]")?.addEventListener("click", async () => {
        await resetUserPassword(user.id, user.username);
      });
      const deleteButton = row.querySelector("[data-delete-user]");
      if (deleteButton && !deleteButton.disabled) {
        deleteButton.addEventListener("click", async () => {
          await deleteUser(user.id, user.username);
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
