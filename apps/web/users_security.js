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
        elements.securityUserList.innerHTML = helpers.renderEmptyState(
          "还没有可执行安全操作的账号",
          "先创建第一个业务账号或管理员账号，后续才能执行重置密码、停用和删除等动作。",
          "soft",
        );
        return;
      }

      const groups = [
        {
          title: "启用中的账号",
          description: "这些账号当前仍可正常登录，执行重置或停用前建议先确认业务影响范围。",
          items: pageState.users.filter((item) => item.is_active),
        },
        {
          title: "已停用账号",
          description: "这部分账号已经被收口，可作为删除前的缓冲区，也可按需重新启用。",
          items: pageState.users.filter((item) => !item.is_active),
        },
      ];

      elements.securityUserList.innerHTML = "";
      for (const group of groups) {
        const section = document.createElement("section");
        section.className = "user-group";
        section.innerHTML = `
          <div class="group-header">
            <div class="group-copy">
              <strong>${helpers.escapeHtml(group.title)}</strong>
              <p>${helpers.escapeHtml(group.description)}</p>
            </div>
            <span class="group-badge">${group.items.length}</span>
          </div>
          <div class="access-user-list-grid" data-group-grid></div>
        `;
        const grid = section.querySelector("[data-group-grid]");
        if (!group.items.length) {
          grid.innerHTML = helpers.renderEmptyState(
            `当前没有${group.title}`,
            "等状态变化后，这里会自动出现对应账号。",
            "soft",
          );
          elements.securityUserList.appendChild(section);
          continue;
        }
        group.items.forEach((user) => grid.appendChild(buildSecurityCard(user)));
        elements.securityUserList.appendChild(section);
      }
    }

    function buildSecurityCard(user) {
      const card = document.createElement("article");
      card.className = "access-user-card";
      const isSelf = Boolean(state.user && user.id === state.user.id);
      const sourceHtml = (user.allowed_sources || []).length
        ? user.allowed_sources.map((source) => `<span class="tag muted">${helpers.escapeHtml(source)}</span>`).join("")
        : '<span class="tag muted">未分配来源</span>';

      card.innerHTML = `
        <div class="panel-head compact">
          <div>
            <h3>${helpers.escapeHtml(user.username)}</h3>
            <p class="subtle">ID ${user.id} · 角色 ${helpers.escapeHtml(user.role)}</p>
          </div>
          <span class="status-chip ${user.is_active ? "is-ok" : "is-warn"}">${user.is_active ? "启用中" : "已停用"}</span>
        </div>
        <div class="tag-list">${sourceHtml}</div>
        <div class="session-actions">
          <button class="ghost-btn" type="button" data-toggle-active>${user.is_active ? "停用账号" : "重新启用"}</button>
          <button class="ghost-btn" type="button" data-reset-password>重置密码</button>
          <button class="ghost-btn danger" type="button" data-delete-user ${isSelf ? "disabled" : ""}>删除用户</button>
        </div>
      `;

      card.querySelector("[data-toggle-active]")?.addEventListener("click", async () => {
        await toggleUserActive(user);
      });
      card.querySelector("[data-reset-password]")?.addEventListener("click", async () => {
        await resetUserPassword(user.id, user.username);
      });
      const deleteButton = card.querySelector("[data-delete-user]");
      if (deleteButton && !deleteButton.disabled) {
        deleteButton.addEventListener("click", async () => {
          await deleteUser(user.id, user.username);
        });
      }
      return card;
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
  },
};
