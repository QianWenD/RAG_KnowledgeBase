window.RagProPage = {
  async init({ helpers }) {
    const ACTION_LABELS = {
      register: "用户注册",
      login: "用户登录",
      logout: "用户退出登录",
      change_password: "修改个人密码",
      admin_create_user: "管理员创建账号",
      update_user_access: "更新角色与授权",
      reset_password: "重置密码",
      delete_user: "删除账号",
    };
    const SENSITIVE_ACTIONS = new Set(["reset_password", "delete_user", "change_password", "update_user_access"]);
    const pageState = {
      logs: [],
      filters: parseFiltersFromLocation(),
    };

    const elements = {
      refreshBtn: document.getElementById("audit-refresh-btn"),
      filterForm: document.getElementById("audit-filter-form"),
      actionFilter: document.getElementById("audit-action-filter"),
      searchInput: document.getElementById("audit-search-input"),
      startAtInput: document.getElementById("audit-start-at"),
      endAtInput: document.getElementById("audit-end-at"),
      sensitiveOnly: document.getElementById("audit-sensitive-only"),
      presetButtons: Array.from(document.querySelectorAll("[data-audit-range]")),
      resetBtn: document.getElementById("audit-reset-btn"),
      filterState: document.getElementById("audit-filter-state"),
      auditHighlights: document.getElementById("audit-highlights"),
      auditLogList: document.getElementById("audit-log-list"),
      auditNote: document.getElementById("users-audit-note"),
      summaryRole: document.getElementById("audit-summary-role"),
      summaryTotal: document.getElementById("audit-summary-total"),
      summaryLatest: document.getElementById("audit-summary-latest"),
      summarySensitive: document.getElementById("audit-summary-sensitive"),
    };

    syncFilterControls();
    renderSummary();
    renderFilterState();

    if (!helpers.isAdmin()) {
      elements.auditNote?.classList.remove("hidden");
      elements.auditHighlights.innerHTML = helpers.renderEmptyState(
        "当前账号没有审计查看权限",
        "请使用管理员账号登录后查看权限操作记录。",
        "soft",
      );
      elements.auditLogList.innerHTML = helpers.renderEmptyState(
        "当前账号没有审计查看权限",
        "审计日志只对管理员开放。",
        "soft",
      );
      helpers.setStatus("当前账号没有审计查看权限。", true);
      return;
    }

    elements.refreshBtn?.addEventListener("click", () => loadAuditLogs({ preserveStatus: false }));
    elements.filterForm?.addEventListener("submit", handleFilterSubmit);
    elements.resetBtn?.addEventListener("click", resetFilters);
    for (const button of elements.presetButtons) {
      button.addEventListener("click", () => applyTimePreset(button.dataset.auditRange || ""));
    }

    await loadAuditLogs({ preserveStatus: false });
    helpers.setStatus("审计日志页已就绪，可以按动作和账号快速筛选。", false);

    async function loadAuditLogs({ preserveStatus = true } = {}) {
      try {
        const query = buildAuditQuery();
        const payload = await helpers.apiJson(`/auth/audit-logs?${query}`);
        pageState.logs = payload.logs || [];
        syncUrl();
        renderSummary();
        renderFilterState();
        renderHighlights();
        renderLogList();
        if (!preserveStatus) {
          helpers.setStatus(`审计日志已刷新，共 ${pageState.logs.length} 条结果。`, false);
        }
      } catch (error) {
        helpers.setStatus(`加载审计日志失败：${error.message}`, true);
      }
    }

    function handleFilterSubmit(event) {
      event.preventDefault();
      pageState.filters.action = elements.actionFilter?.value || "";
      pageState.filters.search = (elements.searchInput?.value || "").trim();
      pageState.filters.startAt = elements.startAtInput?.value || "";
      pageState.filters.endAt = elements.endAtInput?.value || "";
      pageState.filters.sensitiveOnly = Boolean(elements.sensitiveOnly?.checked);
      loadAuditLogs({ preserveStatus: false });
    }

    function resetFilters() {
      pageState.filters = { action: "", search: "", startAt: "", endAt: "", sensitiveOnly: false, limit: 80 };
      syncFilterControls();
      loadAuditLogs({ preserveStatus: false });
    }

    function applyTimePreset(range) {
      if (range === "clear") {
        pageState.filters.startAt = "";
        pageState.filters.endAt = "";
        syncFilterControls();
        loadAuditLogs({ preserveStatus: false });
        return;
      }

      const now = new Date();
      const start = new Date(now);
      if (range === "today") {
        start.setHours(0, 0, 0, 0);
      } else {
        const days = Number(range) || 7;
        start.setDate(start.getDate() - days);
      }

      pageState.filters.startAt = toDateTimeLocal(start);
      pageState.filters.endAt = toDateTimeLocal(now);
      syncFilterControls();
      loadAuditLogs({ preserveStatus: false });
    }

    function renderSummary() {
      const sensitiveCount = pageState.logs.filter((item) => SENSITIVE_ACTIONS.has(item.action)).length;
      const latest = pageState.logs[0];
      elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可查看" : "只读说明";
      elements.summaryTotal.textContent = String(pageState.logs.length);
      elements.summarySensitive.textContent = String(sensitiveCount);
      elements.summaryLatest.textContent = latest ? getActionLabel(latest.action) : "暂无";
    }

    function renderFilterState() {
      const chips = [];
      if (pageState.filters.action) {
        chips.push(`动作：${getActionLabel(pageState.filters.action)}`);
      }
      if (pageState.filters.search) {
        chips.push(`账号：${pageState.filters.search}`);
      }
      if (pageState.filters.startAt || pageState.filters.endAt) {
        chips.push(`时间：${formatTimeRange(pageState.filters.startAt, pageState.filters.endAt)}`);
      }
      if (pageState.filters.sensitiveOnly) {
        chips.push("仅高风险");
      }
      elements.filterState.textContent = chips.length ? chips.join(" / ") : "当前未筛选";
    }

    function renderHighlights() {
      if (!pageState.logs.length) {
        const emptyDescription = hasActiveFilters()
          ? "当前筛选条件下没有命中记录，请放宽条件后再试。"
          : "等你完成注册、授权、重置密码或删除账号等动作后，这里会自动出现最近摘要。";
        elements.auditHighlights.innerHTML = helpers.renderEmptyState(
          "暂无匹配的审计记录",
          emptyDescription,
          "soft",
        );
        return;
      }

      const latest = pageState.logs[0];
      const highlights = [
        {
          title: "最近动作",
          body: `${getActionLabel(latest.action)} · ${formatActor(latest.actor_username)}`,
        },
        {
          title: "影响账号",
          body: latest.target_username
            ? `${latest.target_username} · ${latest.target_role || "未知角色"}`
            : "当前动作未指向具体目标账号",
        },
        {
          title: "当前筛选",
          body: elements.filterState.textContent || "当前未筛选",
        },
      ];

      elements.auditHighlights.innerHTML = highlights.map((item) => `
        <article class="source-card">
          <div class="source-card-head">
            <div>
              <strong>${helpers.escapeHtml(item.title)}</strong>
              <p>${helpers.escapeHtml(item.body)}</p>
            </div>
          </div>
        </article>
      `).join("");
    }

    function renderLogList() {
      if (!pageState.logs.length) {
        const emptyDescription = hasActiveFilters()
          ? "没有找到符合条件的日志，请尝试切换动作类型或清空关键词。"
          : "完成一次注册、授权变更或安全操作后，这里会自动出现真实记录。";
        elements.auditLogList.innerHTML = helpers.renderEmptyState(
          "还没有审计日志",
          emptyDescription,
          "soft",
        );
        return;
      }

      elements.auditLogList.innerHTML = pageState.logs.map((log) => `
        <article class="access-user-card audit-log-card">
          <div class="panel-head compact">
            <div>
              <h3>${helpers.escapeHtml(getActionLabel(log.action))}</h3>
              <p class="subtle">${helpers.escapeHtml(log.created_at || "未知时间")}</p>
            </div>
            <span class="status-chip ${SENSITIVE_ACTIONS.has(log.action) ? "is-warn" : "is-ok"}">
              ${SENSITIVE_ACTIONS.has(log.action) ? "高风险" : "常规"}
            </span>
          </div>
          <div class="audit-meta-grid">
            <div class="meta-card">
              <span class="label">操作人</span>
              <strong>${helpers.escapeHtml(formatActor(log.actor_username))}</strong>
              <p>${helpers.escapeHtml(log.actor_role || "未知角色")}</p>
            </div>
            <div class="meta-card">
              <span class="label">目标账号</span>
              <strong>${helpers.escapeHtml(log.target_username || "无")}</strong>
              <p>${helpers.escapeHtml(log.target_role || "无")}</p>
            </div>
          </div>
          <div class="audit-metadata-list">${renderMetadata(log.metadata)}</div>
        </article>
      `).join("");
    }

    function renderMetadata(metadata) {
      const entries = Object.entries(metadata || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
      if (!entries.length) {
        return '<div class="note">当前动作没有额外元信息。</div>';
      }
      return entries.map(([key, value]) => `
        <div class="audit-metadata-item">
          <span class="label">${helpers.escapeHtml(formatMetaKey(key))}</span>
          <strong>${helpers.escapeHtml(formatMetaValue(value))}</strong>
        </div>
      `).join("");
    }

    function buildAuditQuery() {
      const params = new URLSearchParams();
      params.set("limit", String(pageState.filters.limit || 80));
      if (pageState.filters.action) {
        params.set("action", pageState.filters.action);
      }
      if (pageState.filters.search) {
        params.set("search", pageState.filters.search);
      }
      if (pageState.filters.startAt) {
        params.set("start_at", pageState.filters.startAt);
      }
      if (pageState.filters.endAt) {
        params.set("end_at", pageState.filters.endAt);
      }
      if (pageState.filters.sensitiveOnly) {
        params.set("sensitive_only", "true");
      }
      return params.toString();
    }

    function syncFilterControls() {
      if (elements.actionFilter) {
        elements.actionFilter.value = pageState.filters.action || "";
      }
      if (elements.searchInput) {
        elements.searchInput.value = pageState.filters.search || "";
      }
      if (elements.startAtInput) {
        elements.startAtInput.value = pageState.filters.startAt || "";
      }
      if (elements.endAtInput) {
        elements.endAtInput.value = pageState.filters.endAt || "";
      }
      if (elements.sensitiveOnly) {
        elements.sensitiveOnly.checked = Boolean(pageState.filters.sensitiveOnly);
      }
    }

    function syncUrl() {
      const params = new URLSearchParams();
      if (pageState.filters.action) {
        params.set("action", pageState.filters.action);
      }
      if (pageState.filters.search) {
        params.set("search", pageState.filters.search);
      }
      if (pageState.filters.startAt) {
        params.set("start_at", pageState.filters.startAt);
      }
      if (pageState.filters.endAt) {
        params.set("end_at", pageState.filters.endAt);
      }
      if (pageState.filters.sensitiveOnly) {
        params.set("sensitive_only", "true");
      }
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }

    function parseFiltersFromLocation() {
      const params = new URLSearchParams(window.location.search);
      return {
        action: params.get("action") || "",
        search: params.get("search") || "",
        startAt: params.get("start_at") || "",
        endAt: params.get("end_at") || "",
        sensitiveOnly: params.get("sensitive_only") === "true",
        limit: 80,
      };
    }

    function hasActiveFilters() {
      return Boolean(
        pageState.filters.action
        || pageState.filters.search
        || pageState.filters.startAt
        || pageState.filters.endAt
        || pageState.filters.sensitiveOnly
      );
    }

    function getActionLabel(action) {
      return ACTION_LABELS[action] || action || "未知动作";
    }

    function formatActor(username) {
      return username || "系统";
    }

    function formatMetaKey(key) {
      const mapping = {
        allowed_sources: "来源范围",
        is_active: "账号启用",
        role: "角色变更",
      };
      return mapping[key] || key;
    }

    function formatMetaValue(value) {
      if (Array.isArray(value)) {
        return value.length ? value.join(" / ") : "空";
      }
      if (typeof value === "boolean") {
        return value ? "是" : "否";
      }
      if (value === null || value === undefined || value === "") {
        return "空";
      }
      return String(value);
    }

    function formatTimeRange(startAt, endAt) {
      const startLabel = formatDateTimeValue(startAt);
      const endLabel = formatDateTimeValue(endAt);
      if (startLabel && endLabel) {
        return `${startLabel} 至 ${endLabel}`;
      }
      return startLabel ? `${startLabel} 之后` : `${endLabel} 之前`;
    }

    function formatDateTimeValue(value) {
      if (!value) {
        return "";
      }
      return String(value).replace("T", " ");
    }

    function toDateTimeLocal(date) {
      const pad = (value) => String(value).padStart(2, "0");
      return [
        date.getFullYear(),
        "-",
        pad(date.getMonth() + 1),
        "-",
        pad(date.getDate()),
        "T",
        pad(date.getHours()),
        ":",
        pad(date.getMinutes()),
      ].join("");
    }
  },
};
