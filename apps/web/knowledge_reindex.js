window.RagProPage = {
  async init({ state, helpers }) {
    const REINDEX_HISTORY_KEY = "ragpro.reindexHistory";
    const MAX_REINDEX_HISTORY = 10;
    const preferredSource = new URLSearchParams(window.location.search).get("source") || "";
    const pageState = {
      pending: false,
      history: loadHistory(),
    };

    const elements = {
      accessNote: document.getElementById("reindex-access-note"),
      reindexForm: document.getElementById("reindex-form"),
      reindexSource: document.getElementById("reindex-source"),
      reindexDirectory: document.getElementById("reindex-directory"),
      reindexAppend: document.getElementById("reindex-append"),
      reindexSubmitBtn: document.getElementById("reindex-submit-btn"),
      reindexResult: document.getElementById("reindex-result"),
      reindexHistoryList: document.getElementById("reindex-history-list"),
      summaryRole: document.getElementById("reindex-summary-role"),
      summarySourceCount: document.getElementById("reindex-summary-source-count"),
      summaryHistoryCount: document.getElementById("reindex-summary-history-count"),
      summaryMode: document.getElementById("reindex-summary-mode"),
    };

    renderHistory();
    renderSummary();

    if (!helpers.isAdmin()) {
      disableView();
      helpers.setStatus("当前账号不是管理员，只能查看重建索引说明。", true);
      return;
    }

    helpers.populateSourceSelect(elements.reindexSource, state.sources || [], "请选择来源");
    if (preferredSource) {
      helpers.setSourceSelectValue(elements.reindexSource, preferredSource);
    }
    bindEvents();
    helpers.setStatus("重建索引页已就绪，可以按来源执行重建任务。");

    function bindEvents() {
      elements.reindexForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        submitReindex();
      });
      elements.reindexAppend?.addEventListener("change", renderSummary);
    }

    function disableView() {
      elements.accessNote?.classList.remove("hidden");
      elements.reindexForm?.classList.add("hidden");
      if (elements.reindexResult) {
        elements.reindexResult.textContent = "当前账号没有重建索引权限。";
      }
      renderSummary();
    }

    async function submitReindex() {
      if (!helpers.isAdmin() || pageState.pending) {
        return;
      }

      const source = helpers.getSourceSelectValue(elements.reindexSource);
      const directory = elements.reindexDirectory.value.trim();
      const append = elements.reindexAppend.checked;

      if (!source) {
        renderResult("请先选择或输入目标来源。", true);
        helpers.setStatus("请先选择或输入目标来源。", true);
        return;
      }
      if (!helpers.isValidSourceName(source)) {
        renderResult("来源只能使用 1-50 位字母、数字、下划线或短横线。", true);
        helpers.setStatus("来源格式不正确。", true);
        return;
      }

      pageState.pending = true;
      elements.reindexSubmitBtn.disabled = true;
      helpers.setStatus("正在执行重建索引任务...");

      try {
        const payload = {
          source,
          append,
        };
        if (directory) {
          payload.directory = directory;
        }
        const result = await helpers.apiJson("/reindex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const record = {
          source: result.source || source,
          requested_source: result.requested_source || source,
          document_chunks: result.document_chunks || 0,
          deleted_before_index: result.deleted_before_index || 0,
          replaced_existing_source: Boolean(result.replaced_existing_source),
          requested_directory: result.requested_directory || "",
          created_at: new Date().toISOString(),
        };
        pageState.history = [record, ...pageState.history].slice(0, MAX_REINDEX_HISTORY);
        persistHistory();
        renderHistory();
        renderResult(
          `重建完成：来源 ${record.source}，切块 ${record.document_chunks}，${record.replaced_existing_source ? "已替换旧索引" : "以追加模式写入"}`,
          false,
        );
        helpers.setStatus("重建索引完成。");
      } catch (error) {
        renderResult(`重建失败：${error.message}`, true);
        helpers.setStatus("重建索引失败，请检查目录或服务状态后重试。", true);
      } finally {
        pageState.pending = false;
        elements.reindexSubmitBtn.disabled = false;
        renderSummary();
      }
    }

    function renderResult(message, isError) {
      elements.reindexResult.textContent = message;
      elements.reindexResult.classList.toggle("is-error", Boolean(isError));
    }

    function renderHistory() {
      if (!pageState.history.length) {
        elements.reindexHistoryList.innerHTML = helpers.renderEmptyState(
          "还没有重建任务",
          "第一次执行重建后，这里会保留最近任务的来源、切块数和是否替换旧索引。",
          "soft",
        );
        renderSummary();
        return;
      }
      elements.reindexHistoryList.innerHTML = pageState.history.map((item) => `
        <article class="upload-history-item">
          <strong>${helpers.escapeHtml(item.source)}</strong>
          <p class="upload-history-meta">${item.document_chunks} 个切块 / 删除旧索引 ${item.deleted_before_index}</p>
          <p class="upload-history-files">${item.replaced_existing_source ? "覆盖重建" : "追加写入"} · ${helpers.escapeHtml(item.created_at || "")}</p>
        </article>
      `).join("");
      renderSummary();
    }

    function loadHistory() {
      try {
        const raw = localStorage.getItem(REINDEX_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (error) {
        return [];
      }
    }

    function persistHistory() {
      localStorage.setItem(REINDEX_HISTORY_KEY, JSON.stringify(pageState.history));
    }

    function renderSummary() {
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可操作" : "只读查看";
      }
      if (elements.summarySourceCount) {
        elements.summarySourceCount.textContent = String((state.sources || []).length || 0);
      }
      if (elements.summaryHistoryCount) {
        elements.summaryHistoryCount.textContent = String(pageState.history.length || 0);
      }
      if (elements.summaryMode) {
        elements.summaryMode.textContent = elements.reindexAppend?.checked ? "追加模式" : "覆盖重建";
      }
    }
  },
};
