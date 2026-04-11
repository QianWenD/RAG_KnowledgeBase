window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      users: [],
    };

    const elements = {
      overviewGrid: document.getElementById("users-overview-grid"),
      overviewNote: document.getElementById("users-overview-note"),
      refreshBtn: document.getElementById("users-overview-refresh"),
      summaryTotal: document.getElementById("users-summary-total"),
      summaryAdmins: document.getElementById("users-summary-admins"),
      summaryActive: document.getElementById("users-summary-active"),
      summarySources: document.getElementById("users-summary-sources"),
    };

    renderSummary();
    renderOverview();

    if (!helpers.isAdmin()) {
      elements.overviewNote?.classList.remove("hidden");
      helpers.setStatus("当前账号没有权限查看用户总览。", true);
      return;
    }

    elements.refreshBtn?.addEventListener("click", loadUsers);
    await loadUsers();
    helpers.setStatus("用户总览已就绪，可以继续进入授权页或安全页。", false);

    async function loadUsers() {
      try {
        const payload = await helpers.apiJson("/auth/users");
        pageState.users = payload.users || [];
        renderOverview();
        renderSummary();
      } catch (error) {
        helpers.setStatus(`加载账号概览失败：${error.message}`, true);
      }
    }

    function renderOverview() {
      if (!elements.overviewGrid) {
        return;
      }
      if (!helpers.isAdmin()) {
        elements.overviewGrid.innerHTML = helpers.renderEmptyState(
          "当前账号没有权限查看账号分布",
          "如果你需要管理用户、角色或来源授权，请使用管理员账号登录。",
          "soft",
        );
        return;
      }
      if (!pageState.users.length) {
        elements.overviewGrid.innerHTML = helpers.renderEmptyState(
          "还没有可管理账号",
          "先去安全操作页创建第一个业务账号或管理员账号，然后再回来查看整体分布。",
          "soft",
        );
        return;
      }

      const groups = [
        {
          title: "管理员账号",
          description: "高权限账号建议保持少量且明确，便于追溯和审计。",
          items: pageState.users.filter((item) => item.role === "admin"),
        },
        {
          title: "业务账号",
          description: "业务账号应围绕实际来源范围配置，避免默认看见过多内容。",
          items: pageState.users.filter((item) => item.role !== "admin"),
        },
      ];

      elements.overviewGrid.innerHTML = "";
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
            "你可以先去安全操作页创建账号，再回到这里查看整体分布。",
            "soft",
          );
          elements.overviewGrid.appendChild(section);
          continue;
        }
        group.items.forEach((user) => grid.appendChild(buildUserCard(user)));
        elements.overviewGrid.appendChild(section);
      }
    }

    function buildUserCard(user) {
      const card = document.createElement("article");
      card.className = "access-user-card";
      const sources = Array.isArray(user.allowed_sources) ? user.allowed_sources : [];
      const tagHtml = sources.length
        ? sources.map((source) => `<span class="tag muted">${helpers.escapeHtml(source)}</span>`).join("")
        : '<span class="tag muted">未分配来源</span>';

      card.innerHTML = `
        <div class="panel-head compact">
          <div>
            <h3>${helpers.escapeHtml(user.username)}</h3>
            <p class="subtle">ID ${user.id} · 角色 ${helpers.escapeHtml(user.role)}</p>
          </div>
          <span class="status-chip ${user.is_active ? "is-ok" : "is-warn"}">${user.is_active ? "启用中" : "已停用"}</span>
        </div>
        <div class="tag-list">${tagHtml}</div>
        <div class="source-card-actions">
          <a class="panel-link-btn" href="/users/access">去授权页调整</a>
          <a class="panel-link-btn tertiary" href="/users/security">去安全页处理</a>
        </div>
      `;
      return card;
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
  },
};
