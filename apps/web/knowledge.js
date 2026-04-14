window.RagProPage = {
  async init({ state, helpers }) {
    const UPLOAD_HISTORY_KEY = "ragpro.uploadHistory";
    const MAX_UPLOAD_HISTORY = 8;
    const pageState = {
      uploadPending: false,
      uploadFiles: [],
      uploadHistory: loadUploadHistory(),
    };
    const preferredSource = new URLSearchParams(window.location.search).get("source") || "";

    const elements = {
      uploadForm: document.getElementById("upload-form"),
      uploadSource: document.getElementById("upload-source"),
      uploadReplaceSource: document.getElementById("upload-replace-source"),
      uploadFileInput: document.getElementById("upload-file-input"),
      uploadSubmitBtn: document.getElementById("upload-submit-btn"),
      uploadDropZone: document.getElementById("upload-drop-zone"),
      uploadFileList: document.getElementById("upload-file-list"),
      uploadProgressLabel: document.getElementById("upload-progress-label"),
      uploadProgressValue: document.getElementById("upload-progress-value"),
      uploadProgressFill: document.getElementById("upload-progress-fill"),
      uploadSteps: Array.from(document.querySelectorAll("[data-upload-step]")),
      uploadResult: document.getElementById("upload-result"),
      uploadHistoryList: document.getElementById("upload-history-list"),
      knowledgeAccessNote: document.getElementById("knowledge-access-note"),
      summaryRole: document.getElementById("knowledge-summary-role"),
      summarySourceCount: document.getElementById("knowledge-summary-source-count"),
      summaryHistoryCount: document.getElementById("knowledge-summary-history-count"),
      summaryMode: document.getElementById("knowledge-summary-mode"),
    };

    renderUploadHistory();
    renderSelectedFiles();
    setUploadProgress(0, "等待上传");
    setUploadStage("select");
    renderSummary();

    if (!helpers.isAdmin()) {
      disableUploadView();
      helpers.setStatus("当前账号不是管理员，只能查看知识运营说明。", true);
      return;
    }

    helpers.populateSourceSelect(elements.uploadSource, state.sources || [], "请选择来源");
    if (preferredSource) {
      helpers.setSourceSelectValue(elements.uploadSource, preferredSource);
    }
    bindEvents();
    helpers.setStatus("知识运营页已就绪，可以上传资料并写入检索链路。");

    function bindEvents() {
      elements.uploadFileInput?.addEventListener("change", () => {
        setUploadFiles(Array.from(elements.uploadFileInput.files || []));
      });
      elements.uploadForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        uploadDocuments();
      });
      elements.uploadReplaceSource?.addEventListener("change", renderSummary);
      if (elements.uploadDropZone) {
        for (const eventName of ["dragenter", "dragover"]) {
          elements.uploadDropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            elements.uploadDropZone.classList.add("is-dragover");
          });
        }
        for (const eventName of ["dragleave", "drop"]) {
          elements.uploadDropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            elements.uploadDropZone.classList.remove("is-dragover");
          });
        }
        elements.uploadDropZone.addEventListener("drop", (event) => {
          const files = Array.from(event.dataTransfer?.files || []);
          if (files.length) {
            setUploadFiles(files);
          }
        });
      }
    }

    function disableUploadView() {
      elements.knowledgeAccessNote?.classList.remove("hidden");
      elements.uploadForm?.classList.add("hidden");
      if (elements.uploadResult) {
        elements.uploadResult.textContent = "当前账号没有上传和入库权限。";
      }
      renderSummary();
    }

    async function uploadDocuments() {
      if (!helpers.isAdmin() || pageState.uploadPending) {
        return;
      }

      const source = helpers.getSourceSelectValue(elements.uploadSource);
      const files = pageState.uploadFiles;

      if (!source) {
        renderUploadResult({ message: "请先选择或输入上传来源。", isError: true });
        helpers.setStatus("请先选择或输入上传来源。", true);
        return;
      }
      if (!helpers.isValidSourceName(source)) {
        renderUploadResult({ message: "来源只能使用 1-50 位字母、数字、下划线或短横线。", isError: true });
        helpers.setStatus("来源格式不正确。", true);
        return;
      }
      if (!files.length) {
        renderUploadResult({ message: "请至少选择一个文件。", isError: true });
        helpers.setStatus("请至少选择一个文件。", true);
        return;
      }

      pageState.uploadPending = true;
      elements.uploadSubmitBtn.disabled = true;
      setUploadProgress(0, "正在准备上传");
      setUploadStage("prepare");
      helpers.setStatus("正在上传并入库...");

      const formData = new FormData();
      formData.append("source", source);
      formData.append("replace_source", String(elements.uploadReplaceSource.checked));
      for (const file of files) {
        formData.append("files", file);
      }

      try {
        const result = await submitUploadRequest(formData);
        pageState.uploadHistory = [
          {
            source: result.source,
            file_count: result.file_count,
            document_chunks: result.document_chunks,
            retrieval_backend: result.retrieval_backend,
            replace_source: result.replace_source,
            created_at: new Date().toISOString(),
          },
          ...pageState.uploadHistory,
        ].slice(0, MAX_UPLOAD_HISTORY);
        persistUploadHistory();
        renderUploadHistory();
        renderUploadResult({
          message: `上传完成：${result.file_count} 个文件，生成 ${result.document_chunks} 个切块，后端 ${result.retrieval_backend || "unknown"}`,
          isError: false,
        });
        setUploadProgress(100, "上传完成");
        setUploadStage("done");
        setUploadFiles([]);
        elements.uploadReplaceSource.checked = false;
        renderSummary();
        helpers.setStatus("文档上传并入库完成。");
      } catch (error) {
        setUploadProgress(0, "上传失败");
        setUploadStage("error");
        renderUploadResult({ message: `上传失败：${error.message}`, isError: true });
        helpers.setStatus("上传失败，请检查服务状态后重试。", true);
      } finally {
        pageState.uploadPending = false;
        elements.uploadSubmitBtn.disabled = false;
      }
    }

    function submitUploadRequest(formData) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/documents/upload", true);
        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) {
            return;
          }
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent, percent >= 100 ? "服务端处理中..." : "正在上传");
          setUploadStage(percent >= 100 ? "process" : "upload");
        });
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText || "{}"));
            } catch (error) {
              reject(error);
            }
            return;
          }
          try {
            const payload = JSON.parse(xhr.responseText || "{}");
            reject(new Error(payload.detail || "上传失败"));
          } catch (error) {
            reject(new Error("上传失败"));
          }
        };
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.send(formData);
      });
    }

    function setUploadFiles(files) {
      pageState.uploadFiles = files;
      renderSelectedFiles();
      if (!pageState.uploadPending) {
        setUploadStage(files.length ? "prepare" : "select");
      }
    }

    function renderSelectedFiles() {
      if (!pageState.uploadFiles.length) {
        elements.uploadFileList.innerHTML = helpers.renderEmptyState(
          "还没有选择文档",
          "支持拖拽或点击选择。建议按来源分批上传，后续做权限和回测会更清楚。",
          "soft",
        );
        return;
      }
      elements.uploadFileList.innerHTML = pageState.uploadFiles.map((file) => `
        <div class="upload-file-item">
          <strong>${helpers.escapeHtml(file.name)}</strong>
          <span class="subtle">${helpers.formatBytes(file.size)}</span>
        </div>
      `).join("");
    }

    function setUploadProgress(percent, label) {
      elements.uploadProgressLabel.textContent = label;
      elements.uploadProgressValue.textContent = `${percent}%`;
      elements.uploadProgressFill.style.width = `${percent}%`;
    }

    function setUploadStage(stage) {
      const order = ["select", "prepare", "upload", "process", "done"];
      const activeIndex = stage === "error" ? -1 : order.indexOf(stage);
      for (const step of elements.uploadSteps) {
        const stepName = step.dataset.uploadStep;
        const stepIndex = order.indexOf(stepName);
        step.classList.toggle("is-active", stage !== "error" && stepName === stage);
        step.classList.toggle("is-done", activeIndex > stepIndex);
        step.classList.toggle("is-error", stage === "error");
      }
    }

    function renderUploadResult({ message, isError }) {
      elements.uploadResult.textContent = message;
      elements.uploadResult.classList.toggle("is-error", Boolean(isError));
    }

    function renderUploadHistory() {
      if (!pageState.uploadHistory.length) {
        elements.uploadHistoryList.innerHTML = helpers.renderEmptyState(
          "还没有上传记录",
          "第一次上传完成后，这里会保留最近的入库结果，便于回看来源、切块数和后端情况。",
          "soft",
        );
        renderSummary();
        return;
      }
      elements.uploadHistoryList.innerHTML = pageState.uploadHistory.map((item) => `
        <article class="upload-history-item">
          <strong>${helpers.escapeHtml(item.source)}</strong>
          <p class="upload-history-meta">${item.file_count} 个文件 / ${item.document_chunks} 个切块 / ${helpers.escapeHtml(item.retrieval_backend || "unknown")}</p>
          <p class="upload-history-files">${item.replace_source ? "覆盖重建" : "增量补充"} · ${helpers.escapeHtml(item.created_at || "")}</p>
        </article>
      `).join("");
      renderSummary();
    }

    function loadUploadHistory() {
      try {
        const value = localStorage.getItem(UPLOAD_HISTORY_KEY);
        return value ? JSON.parse(value) : [];
      } catch (error) {
        return [];
      }
    }

    function persistUploadHistory() {
      localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(pageState.uploadHistory));
    }

    function renderSummary() {
      if (elements.summaryRole) {
        elements.summaryRole.textContent = helpers.isAdmin() ? "管理员可操作" : "只读查看";
      }
      if (elements.summarySourceCount) {
        elements.summarySourceCount.textContent = String((state.sources || []).length || 0);
      }
      if (elements.summaryHistoryCount) {
        elements.summaryHistoryCount.textContent = String(pageState.uploadHistory.length || 0);
      }
      if (elements.summaryMode) {
        elements.summaryMode.textContent = elements.uploadReplaceSource?.checked ? "覆盖重建" : "增量补充";
      }
    }
  },
};
