window.RagProPage = {
  async init({ state, helpers }) {
    const elements = {
      registerPanel: document.querySelector("[data-source-register-panel]"),
      registerForm: document.getElementById("source-register-form"),
      registerInput: document.getElementById("source-register-input"),
      registerSubmit: document.getElementById("source-register-submit"),
      registerFeedback: document.getElementById("source-register-feedback"),
      documentFilePanel: document.getElementById("document-file-panel"),
      documentFileTableBody: document.getElementById("document-file-table-body"),
      documentFilePager: document.getElementById("document-file-pager"),
      documentFileRefresh: document.getElementById("document-file-refresh"),
    };

    bindRegistrationForm();
    bindDocumentFiles();
    await loadDocumentFiles();
    helpers.setStatus("数据源管理页已就绪，可以查看、下载或删除已入库文件。");

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

    function bindDocumentFiles() {
      if (!elements.documentFilePanel) {
        return;
      }
      if (!helpers.isAdmin()) {
        elements.documentFilePanel.classList.add("hidden");
        return;
      }
      elements.documentFileRefresh?.addEventListener("click", () => loadDocumentFiles());
      elements.documentFileTableBody?.addEventListener("click", handleDocumentFileAction);
    }

    async function loadDocumentFiles() {
      if (!helpers.isAdmin() || !elements.documentFileTableBody) {
        return;
      }
      renderDocumentFiles(null);
      try {
        const payload = await helpers.apiJson("/documents/files");
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
        elements.registerSubmit.textContent = isBusy ? "登记中..." : "登记";
      }
    }

    function setRegisterFeedback(message, isError = false) {
      if (!elements.registerFeedback) {
        return;
      }
      elements.registerFeedback.textContent = message;
      elements.registerFeedback.classList.toggle("is-error", Boolean(isError));
    }

  },
};
