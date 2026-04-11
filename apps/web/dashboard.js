window.RagProPage = {
  async init({ state, helpers }) {
    const roleNode = document.getElementById("dashboard-role-text");
    const sourceCountNode = document.getElementById("dashboard-source-count");
    const sourceScopeNode = document.getElementById("dashboard-source-scope");
    const adminHintNode = document.getElementById("dashboard-admin-hint");
    const quickStatusNode = document.getElementById("dashboard-quick-status");

    if (roleNode) {
      roleNode.textContent = state.user?.role === "admin" ? "管理员账号" : "业务账号";
    }
    if (sourceCountNode) {
      sourceCountNode.textContent = String((state.sources || []).length || 0);
    }
    if (sourceScopeNode) {
      sourceScopeNode.textContent = state.user?.allowed_sources?.length
        ? state.user.allowed_sources.join("、")
        : "暂无可见来源";
    }
    if (adminHintNode) {
      adminHintNode.textContent = state.user?.role === "admin"
        ? "你当前可以进入知识运营页和权限管理页，适合做资料入库与访问控制。"
        : "你当前更适合直接进入问答工作台，知识运营和权限管理由管理员负责。";
    }
    if (quickStatusNode) {
      quickStatusNode.textContent = state.user?.role === "admin"
        ? "管理员模式已开启"
        : "当前为业务使用模式";
    }

    helpers.setStatus("已进入总览页，可以从下方卡片进入具体工作页面。");
  },
};
