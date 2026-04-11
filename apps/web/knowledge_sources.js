window.RagProPage = {
  async init({ state, helpers }) {
    const elements = {
      sourceCardGrid: document.getElementById("source-card-grid"),
      summaryRole: document.getElementById("sources-summary-role"),
      summaryCount: document.getElementById("sources-summary-count"),
      summaryDefault: document.getElementById("sources-summary-default"),
      summaryRecommendation: document.getElementById("sources-summary-recommendation"),
    };

    renderSummary();
    renderSourceCards();
    helpers.setStatus("数据源管理页已就绪，可以按来源决定下一步是上传还是重建。");

    function renderSourceCards() {
      if (!(state.sources || []).length) {
        elements.sourceCardGrid.innerHTML = helpers.renderEmptyState(
          "当前没有可见来源",
          "如果你是普通用户，可能是当前账号尚未被授权；如果你是管理员，请先确认系统来源配置。",
          "soft",
        );
        return;
      }

      elements.sourceCardGrid.innerHTML = (state.sources || []).map((source) => `
        <article class="source-card">
          <div class="source-card-head">
            <div>
              <strong>${helpers.escapeHtml(source)}</strong>
              <p>${helpers.isAdmin() ? "管理员可对该来源执行上传、重建和权限分配。" : "当前账号可以对该来源发起问答与查看范围说明。"}</p>
            </div>
            <span class="status-chip ${helpers.isAdmin() ? "is-ok" : ""}">${helpers.isAdmin() ? "可运营" : "可查看"}</span>
          </div>
          <div class="source-card-actions">
            <a class="panel-link-btn secondary" href="/knowledge?source=${encodeURIComponent(source)}">去上传</a>
            <a class="panel-link-btn secondary" href="/knowledge/reindex?source=${encodeURIComponent(source)}">去重建</a>
            <a class="panel-link-btn tertiary" href="/qa">去问答验证</a>
          </div>
        </article>
      `).join("");
    }

    function renderSummary() {
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员视图" : "业务视图";
      }
      if (elements.summaryCount) {
        elements.summaryCount.textContent = String((state.sources || []).length || 0);
      }
      if (elements.summaryDefault) {
        elements.summaryDefault.textContent = helpers.isAdmin() ? "上传入库" : "问答验证";
      }
      if (elements.summaryRecommendation) {
        elements.summaryRecommendation.textContent = helpers.isAdmin() ? "先看来源再运营" : "先确认权限范围";
      }
    }
  },
};
