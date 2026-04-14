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

    async function saveUserAccess(userId, payload) {
      try {
        await helpers.apiJson(`/auth/users/${userId}/access`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        helpers.setStatus("授权更新成功。", false);
        await loadUsers();
      } catch (error) {
        helpers.setStatus(`授权更新失败：${error.message}`, true);
      }
    }

    function renderUsers() {
      if (!elements.accessUserList) {
        return;
      }
      if (!pageState.users.length) {
        elements.accessUserList.innerHTML = helpers.renderEmptyState(
          "还没有可配置账号",
          "你可以先去安全操作页创建账号，然后再回到这里分配角色和来源。",
          "soft",
        );
        return;
      }

      const groups = [
        {
          title: "管理员账号",
          description: "建议只保留少量高权限账号，并为每个管理员账号设定清晰职责。",
          items: pageState.users.filter((item) => item.role === "admin"),
        },
        {
          title: "业务账号",
          description: "主要用于问答和检索，建议按业务实际所需来源进行最小授权。",
          items: pageState.users.filter((item) => item.role !== "admin"),
        },
      ];

      elements.accessUserList.innerHTML = "";
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
            "先创建账号，再回到这里配置角色、来源和启停状态。",
            "soft",
          );
          elements.accessUserList.appendChild(section);
          continue;
        }
        group.items.forEach((user) => grid.appendChild(buildAccessCard(user)));
        elements.accessUserList.appendChild(section);
      }
    }

    function buildAccessCard(user) {
      const card = document.createElement("article");
      card.className = "access-user-card";
      const availableSources = helpers.mergeSourceValues(state.sources || [], user.allowed_sources || []);
      const checkboxHtml = availableSources.map((source) => {
        const checked = (user.allowed_sources || []).includes(source) ? "checked" : "";
        return `
          <label class="source-checkbox">
            <input type="checkbox" data-user-source="${helpers.escapeHtml(source)}" ${checked}>
            <span>${helpers.escapeHtml(source)}</span>
          </label>
        `;
      }).join("");

      card.innerHTML = `
        <div class="panel-head compact">
          <div>
            <h3>${helpers.escapeHtml(user.username)}</h3>
            <p class="subtle">ID ${user.id}</p>
          </div>
          <span class="status-chip ${user.is_active ? "is-ok" : "is-warn"}">${user.is_active ? "启用中" : "已停用"}</span>
        </div>
        <div class="access-grid">
          <label class="field-block">
            <span>角色</span>
            <select data-role-select>
              <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
            </select>
          </label>
          <label class="toggle">
            <input type="checkbox" data-active-toggle ${user.is_active ? "checked" : ""}>
            <span>账号启用</span>
          </label>
        </div>
        <div class="source-checkbox-grid">
          ${checkboxHtml || helpers.renderEmptyState("暂无可分配来源", "请先确保系统里已经准备好可授权来源。", "soft")}
          <label class="source-custom-field">
            <span>添加自定义来源</span>
            <input type="text" data-user-source-custom maxlength="50" placeholder="例如 policy_2026">
          </label>
        </div>
        <div class="session-actions">
          <button class="ghost-btn" type="button" data-save-access>保存授权</button>
          <a class="ghost-btn" href="/users/security">去安全操作</a>
        </div>
      `;

      card.querySelector("[data-save-access]")?.addEventListener("click", async () => {
        const checkedSources = Array.from(card.querySelectorAll("[data-user-source]:checked"))
          .map((node) => node.getAttribute("data-user-source"));
        const customSource = card.querySelector("[data-user-source-custom]")?.value.trim() || "";
        if (customSource && !helpers.isValidSourceName(customSource)) {
          helpers.setStatus("自定义来源只能使用 1-50 位字母、数字、下划线或短横线。", true);
          return;
        }
        const allowedSources = helpers.mergeSourceValues(
          checkedSources,
          customSource ? [customSource] : [],
        );
        const role = card.querySelector("[data-role-select]")?.value || "user";
        const isActive = Boolean(card.querySelector("[data-active-toggle]")?.checked);
        await saveUserAccess(user.id, {
          role,
          allowed_sources: allowedSources,
          is_active: isActive,
        });
      });

      return card;
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
  },
};
