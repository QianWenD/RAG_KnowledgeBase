window.RagProPage = {
  async init({ state, helpers }) {
    const elements = {
      filterForm: document.getElementById("document-file-filter-form"),
      filterFilename: document.getElementById("document-file-filter-filename"),
      filterSource: document.getElementById("document-file-filter-source"),
      filterUploader: document.getElementById("document-file-filter-uploader"),
      filterCreatedFrom: document.getElementById("document-file-filter-created-from"),
      filterCreatedTo: document.getElementById("document-file-filter-created-to"),
      filterReset: document.getElementById("document-file-filter-reset"),
      documentFilePanel: document.getElementById("document-file-panel"),
      documentFileTableBody: document.getElementById("document-file-table-body"),
      documentFilePager: document.getElementById("document-file-pager"),
      documentFileRefresh: document.getElementById("document-file-refresh"),
    };

    bindDocumentFiles();
    await loadDocumentFiles();
    helpers.setStatus("数据源管理页已就绪，可以查看、下载或删除已入库文件。");

    function bindDocumentFiles() {
      if (!elements.documentFilePanel) {
        return;
      }
      if (!helpers.isAdmin()) {
        elements.documentFilePanel.classList.add("hidden");
        return;
      }
      elements.documentFileRefresh?.addEventListener("click", () => loadDocumentFiles());
      elements.filterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        loadDocumentFiles();
      });
      elements.filterReset?.addEventListener("click", () => {
        elements.filterForm?.reset();
        loadDocumentFiles();
      });
      elements.documentFileTableBody?.addEventListener("click", handleDocumentFileAction);
    }

    async function loadDocumentFiles() {
      if (!helpers.isAdmin() || !elements.documentFileTableBody) {
        return;
      }
      renderDocumentFiles(null);
      try {
        const query = buildDocumentFileQuery();
        const payload = await helpers.apiJson(`/documents/files${query ? `?${query}` : ""}`);
        renderDocumentFiles(payload.files || []);
      } catch (error) {
        elements.documentFileTableBody.innerHTML = `
          <tr>
            <td colspan="7">文件清单加载失败：${helpers.escapeHtml(error.message)}</td>
          </tr>
        `;
        setDocumentFilePager(0);
        helpers.setStatus(`文件清单加载失败：${error.message}`, true);
      }
    }

    function buildDocumentFileQuery() {
      const params = new URLSearchParams();
      appendFilter(params, "filename", elements.filterFilename?.value);
      appendFilter(params, "source", elements.filterSource?.value);
      appendFilter(params, "uploader", elements.filterUploader?.value);
      appendFilter(params, "created_from", elements.filterCreatedFrom?.value);
      appendFilter(params, "created_to", elements.filterCreatedTo?.value);
      return params.toString();
    }

    function appendFilter(params, key, value) {
      const normalized = String(value || "").trim();
      if (normalized) {
        params.set(key, normalized);
      }
    }

    async function handleDocumentFileAction(event) {
      const button = event.target.closest("[data-document-file-delete]");
      if (!button) {
        return;
      }
      const fileId = button.dataset.documentFileDelete;
      const filename = button.dataset.documentFileName || "该文件";
      if (!window.confirm(`确认删除“${filename}”？删除后会同步移除检索索引。`)) {
        return;
      }
      button.disabled = true;
      button.textContent = "删除中...";
      try {
        await helpers.apiJson(`/documents/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
        helpers.setStatus(`已删除文件：${filename}`);
        await loadDocumentFiles();
      } catch (error) {
        button.disabled = false;
        button.textContent = "删除";
        helpers.setStatus(`删除文件失败：${error.message}`, true);
      }
    }

    function renderDocumentFiles(files) {
      if (!elements.documentFileTableBody) {
        return;
      }
      if (files === null) {
        elements.documentFileTableBody.innerHTML = `
          <tr>
            <td colspan="7">正在加载已入库文件。</td>
          </tr>
        `;
        setDocumentFilePager(0);
        return;
      }
      if (!files.length) {
        elements.documentFileTableBody.innerHTML = `
          <tr>
            <td colspan="7">当前还没有可管理的入库文件。新上传的文件会出现在这里。</td>
          </tr>
        `;
        setDocumentFilePager(0);
        return;
      }
      elements.documentFileTableBody.innerHTML = files.map((file) => `
        <tr>
          <td><strong>${helpers.escapeHtml(file.filename || "-")}</strong></td>
          <td>${helpers.escapeHtml(file.source || "-")}</td>
          <td>${helpers.escapeHtml(getDocumentFileUploader(file))}</td>
          <td>${helpers.formatBytes(Number(file.size_bytes || 0))}</td>
          <td>${Number(file.document_chunks || 0)}</td>
          <td>${helpers.escapeHtml(helpers.formatDateTime(file.created_at))}</td>
          <td>
            <div class="document-file-actions">
              <a
                class="ghost-btn"
                href="${documentFileUrl(file.file_id, "content")}"
                target="_blank"
                rel="noopener"
                data-document-file-view="${helpers.escapeHtml(file.file_id)}"
              >查看</a>
              <a
                class="ghost-btn"
                href="${documentFileUrl(file.file_id, "download")}"
                data-document-file-download="${helpers.escapeHtml(file.file_id)}"
              >下载</a>
              <button
                class="ghost-btn danger"
                type="button"
                data-document-file-delete="${helpers.escapeHtml(file.file_id)}"
                data-document-file-name="${helpers.escapeHtml(file.filename || "")}"
              >删除</button>
            </div>
          </td>
        </tr>
      `).join("");
      setDocumentFilePager(files.length);
    }

    function getDocumentFileUploader(file) {
      if (file.uploader_display_name) {
        return file.uploader_display_name;
      }
      if (file.uploader_username) {
        return file.uploader_username;
      }
      if (file.uploader_user_id) {
        return `用户 ${file.uploader_user_id}`;
      }
      return "-";
    }

    function documentFileUrl(fileId, action) {
      return `/documents/files/${encodeURIComponent(fileId || "")}/${action}`;
    }

    function setDocumentFilePager(count) {
      if (elements.documentFilePager) {
        elements.documentFilePager.textContent = `共 ${count} 个文件`;
      }
    }

  },
};
