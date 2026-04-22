window.RagProPage = {
  async init({ state, helpers }) {
    const elements = {
      sourceTableBody: document.getElementById("source-table-body"),
      sourceTablePager: document.getElementById("source-table-pager"),
      registerPanel: document.querySelector("[data-source-register-panel]"),
      registerForm: document.getElementById("source-register-form"),
      registerInput: document.getElementById("source-register-input"),
      registerSubmit: document.getElementById("source-register-submit"),
      registerFeedback: document.getElementById("source-register-feedback"),
      summaryRole: document.getElementById("sources-summary-role"),
      summaryCount: document.getElementById("sources-summary-count"),
      summaryDefault: document.getElementById("sources-summary-default"),
      summaryRecommendation: document.getElementById("sources-summary-recommendation"),
    };

    bindRegistrationForm();
    renderSummary();
    renderSourceTable();
    helpers.setStatus("数据源管理页已就绪，可以按来源决定下一步是上传还是重建。");

    function bindRegistrationForm() {
      if (!elements.registerPanel || !elements.registerForm) {
        return;
      }
      if (!helpers.isAdmin()) {
        elements.registerPanel.classList.add("hidden");
        return;
      }
      elements.registerForm.addEventListener("submit", handleRegisterSource);
    }

    async function handleRegisterSource(event) {
      event.preventDefault();
      const source = elements.registerInput?.value.trim() || "";
      if (!source) {
        setRegisterFeedback("请先输入来源标识。", true);
        helpers.setStatus("请先输入来源标识。", true);
        return;
      }
      if (!helpers.isValidSourceName(source)) {
        setRegisterFeedback("来源只能使用 1-50 位字母、数字、下划线或短横线，并且以字母或数字开头。", true);
        helpers.setStatus("来源格式不正确。", true);
        return;
      }
      if ((state.sources || []).includes(source)) {
        setRegisterFeedback(`来源 ${source} 已存在，可以直接去上传或重建。`);
        helpers.setStatus(`来源 ${source} 已存在。`);
        return;
      }

      setRegisterBusy(true);
      try {
        const payload = await helpers.apiJson("/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        });
        state.sources = helpers.mergeSourceValues(payload.sources || [], [source]);
        if (payload.user) {
          state.user = payload.user;
        }
        elements.registerInput.value = "";
        renderSummary();
        renderSourceTable();
        setRegisterFeedback(`已登记来源 ${source}，可以继续上传、重建或授权给用户。`);
        helpers.setStatus(`已登记来源：${source}`);
      } catch (error) {
        setRegisterFeedback(`登记失败：${error.message}`, true);
        helpers.setStatus(`登记来源失败：${error.message}`, true);
      } finally {
        setRegisterBusy(false);
      }
    }

    function setRegisterBusy(isBusy) {
      if (elements.registerSubmit) {
        elements.registerSubmit.disabled = Boolean(isBusy);
        elements.registerSubmit.textContent = isBusy ? "登记中..." : "登记来源";
      }
    }

    function setRegisterFeedback(message, isError = false) {
      if (!elements.registerFeedback) {
        return;
      }
      elements.registerFeedback.textContent = message;
      elements.registerFeedback.classList.toggle("is-error", Boolean(isError));
    }

    function renderSourceTable() {
      if (!elements.sourceTableBody) {
        return;
      }
      if (!(state.sources || []).length) {
        elements.sourceTableBody.innerHTML = `
          <tr>
            <td colspan="5">当前没有可见来源。管理员可以先登记来源，普通用户请确认账号授权。</td>
          </tr>
        `;
        setPagerCount(0);
        return;
      }

      elements.sourceTableBody.innerHTML = (state.sources || []).map((source) => `
        <tr>
          <td><strong>${helpers.escapeHtml(source)}</strong></td>
          <td>${source.includes("_") || source.includes("-") ? "自定义来源" : "系统来源"}</td>
          <td><span class="status-chip ${helpers.isAdmin() ? "is-ok" : ""}">${helpers.isAdmin() ? "可运营" : "可查看"}</span></td>
          <td>${helpers.isAdmin() ? "先上传，必要时重建" : "进入问答验证"}</td>
          <td>
            <div class="source-table-actions">
              <a class="panel-link-btn secondary" href="/knowledge?source=${encodeURIComponent(source)}">上传</a>
              <a class="panel-link-btn secondary" href="/knowledge/reindex?source=${encodeURIComponent(source)}">重建</a>
              <a class="panel-link-btn tertiary" href="/qa">问答</a>
            </div>
          </td>
        </tr>
      `).join("");
      setPagerCount(state.sources.length);
    }

    function setPagerCount(count) {
      if (elements.sourceTablePager) {
        elements.sourceTablePager.textContent = `共 ${count} 条`;
      }
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
