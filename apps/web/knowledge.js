window.RagProPage = {
  async init({ state, helpers }) {
    const UPLOAD_HISTORY_KEY = "ragpro.uploadHistory";
    const MAX_UPLOAD_HISTORY = 8;
    const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;
    const MAX_UPLOAD_FILE_COUNT = 10;
    const UPLOAD_JOB_POLL_INTERVAL_MS = 900;
    const UPLOAD_JOB_TIMEOUT_MS = 30 * 60 * 1000;
    const pageState = {
      uploadPending: false,
      uploadFiles: [],
      uploadHistory: loadUploadHistory(),
    };
    let sourceRefreshPromise = null;
    let uploadProgressTimer = null;
    const preferredSource = new URLSearchParams(window.location.search).get("source") || "";

    const elements = {
      uploadForm: document.getElementById("upload-form"),
      uploadSource: document.getElementById("upload-source"),
      uploadReplaceSource: document.getElementById("upload-replace-source"),
      uploadFileInput: document.getElementById("upload-file-input"),
      uploadSubmitBtn: document.getElementById("upload-submit-btn"),
      uploadDropZone: document.getElementById("upload-drop-zone"),
      uploadFileList: document.getElementById("upload-file-list"),
      uploadProgress: document.querySelector(".upload-progress"),
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

    applyUploadSourceOptions(preferredSource);
    bindEvents();
    helpers.setStatus("知识运营页已就绪，可以上传资料并写入检索链路。");

    function bindEvents() {
      elements.uploadSource?.addEventListener("focus", () => {
        void refreshUploadSources();
      });
      elements.uploadFileInput?.addEventListener("change", () => {
        setUploadFiles(Array.from(elements.uploadFileInput.files || []));
      });
      elements.uploadFileList?.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-upload-file-remove]");
        if (!removeButton || pageState.uploadPending) {
          return;
        }
        removeUploadFile(Number(removeButton.dataset.uploadFileRemove));
      });
      elements.uploadForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        uploadDocuments();
      });
      elements.uploadReplaceSource?.addEventListener("change", renderSummary);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          return;
        }
        void refreshUploadSources();
      });
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

    function applyUploadSourceOptions(selectedSource = "") {
      helpers.populateSourceSelect(elements.uploadSource, state.sources || [], "请选择来源");
      if (selectedSource) {
        helpers.setSourceSelectValue(elements.uploadSource, selectedSource);
      }
      renderSummary();
    }

    async function refreshUploadSources() {
      if (!helpers.isAdmin()) {
        return state.sources || [];
      }
      if (sourceRefreshPromise) {
        return sourceRefreshPromise;
      }
      const preservedSource = helpers.getSourceSelectValue(elements.uploadSource) || preferredSource;
      sourceRefreshPromise = (async () => {
        if (typeof helpers.loadSources === "function") {
          await helpers.loadSources();
        }
        applyUploadSourceOptions(preservedSource);
        return state.sources || [];
      })().finally(() => {
        sourceRefreshPromise = null;
      });
      return sourceRefreshPromise;
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
      if (files.length > MAX_UPLOAD_FILE_COUNT) {
        renderUploadResult({ message: `单次最多选择 ${MAX_UPLOAD_FILE_COUNT} 个文件，请拆分后上传。`, isError: true });
        helpers.setStatus(`单次最多选择 ${MAX_UPLOAD_FILE_COUNT} 个文件。`, true);
        return;
      }
      const oversizedFiles = files.filter((file) => file.size > MAX_UPLOAD_FILE_BYTES);
      if (oversizedFiles.length) {
        const names = oversizedFiles.map((file) => file.name).slice(0, 3).join("、");
        renderUploadResult({
          message: `单个文件最大 ${helpers.formatBytes(MAX_UPLOAD_FILE_BYTES)}，请先压缩或拆分：${names}`,
          isError: true,
        });
        helpers.setStatus("存在超过上传上限的文件。", true);
        return;
      }

      pageState.uploadPending = true;
      elements.uploadSubmitBtn.disabled = true;
      setUploadProgress(0, "正在准备上传");
      setUploadStage("prepare");
      startUploadProgressLoop();
      helpers.setStatus("正在上传并入库...");

      const formData = new FormData();
      formData.append("source", source);
      formData.append("replace_source", String(elements.uploadReplaceSource.checked));
      for (const file of files) {
        formData.append("files", file);
      }

      try {
        const uploadResponse = await submitUploadRequest(formData);
        const result = uploadResponse?.job_id ? await waitForUploadJob(uploadResponse) : uploadResponse;
        stopUploadProgressLoop();
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
        stopUploadProgressLoop();
        setUploadProgress(0, "上传失败");
        setUploadStage("error");
        renderUploadResult({ message: `上传失败：${error.message}`, isError: true });
        helpers.setStatus("上传失败，请检查服务状态后重试。", true);
      } finally {
        stopUploadProgressLoop();
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
          const visiblePercent = percent >= 100 ? 96 : Math.min(percent, 96);
          setUploadProgress(visiblePercent, percent >= 100 ? "服务端处理中..." : "正在上传");
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

    async function waitForUploadJob(initialJob) {
      stopUploadProgressLoop();
      activateUploadProgressBusy();
      let job = initialJob;
      const startedAt = Date.now();
      applyUploadJobProgress(job);
      while (!["succeeded", "failed"].includes(job.status)) {
        if (Date.now() - startedAt > UPLOAD_JOB_TIMEOUT_MS) {
          throw new Error("上传入库任务超时，请稍后到历史记录中确认结果。");
        }
        await delay(UPLOAD_JOB_POLL_INTERVAL_MS);
        job = await fetchUploadJob(job.job_id);
        applyUploadJobProgress(job);
      }
      if (job.status === "failed") {
        throw new Error(job.error || job.message || "上传入库失败");
      }
      return job.result || job;
    }

    async function fetchUploadJob(jobId) {
      return helpers.apiJson(`/documents/upload-jobs/${encodeURIComponent(jobId)}`);
    }

    function applyUploadJobProgress(job) {
      const stage = normalizeUploadJobStage(job);
      const progress = Number.isFinite(Number(job.progress)) ? Number(job.progress) : progressForUploadJobStage(stage);
      setUploadProgress(progress, job.message || labelForUploadJobStage(stage));
      setUploadStage(stage);
      helpers.setStatus(job.message || "上传入库任务正在处理...");
    }

    function normalizeUploadJobStage(job) {
      if (job.status === "succeeded") {
        return "done";
      }
      if (job.status === "failed") {
        return "error";
      }
      if (job.stage === "queued") {
        return "prepare";
      }
      if (job.stage === "process" || job.stage === "done" || job.stage === "upload") {
        return job.stage;
      }
      return "process";
    }

    function progressForUploadJobStage(stage) {
      if (stage === "prepare") {
        return 12;
      }
      if (stage === "upload") {
        return 35;
      }
      if (stage === "process") {
        return 68;
      }
      if (stage === "done") {
        return 100;
      }
      return 0;
    }

    function labelForUploadJobStage(stage) {
      if (stage === "prepare") {
        return "入库任务已创建";
      }
      if (stage === "upload") {
        return "正在保存文件";
      }
      if (stage === "process") {
        return "正在解析、切块并写入向量库";
      }
      if (stage === "done") {
        return "上传完成";
      }
      return "上传失败";
    }

    function delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function setUploadFiles(files) {
      const incomingFiles = Array.from(files || []);
      pageState.uploadFiles = incomingFiles.slice(0, MAX_UPLOAD_FILE_COUNT);
      if (elements.uploadFileInput && !pageState.uploadFiles.length) {
        elements.uploadFileInput.value = "";
      }
      if (incomingFiles.length > MAX_UPLOAD_FILE_COUNT) {
        renderUploadResult({
          message: `单次最多选择 ${MAX_UPLOAD_FILE_COUNT} 个文件，已保留前 ${MAX_UPLOAD_FILE_COUNT} 个。`,
          isError: true,
        });
      }
      renderSelectedFiles();
      if (!pageState.uploadPending) {
        setUploadStage(pageState.uploadFiles.length ? "prepare" : "select");
      }
    }

    function removeUploadFile(index) {
      if (!Number.isInteger(index) || index < 0 || index >= pageState.uploadFiles.length) {
        return;
      }
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      setUploadFiles(pageState.uploadFiles.filter((_, fileIndex) => fileIndex !== index));
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
      elements.uploadFileList.innerHTML = pageState.uploadFiles.map((file, index) => `
        <div class="upload-file-item" data-upload-file-index="${index}">
          <span class="upload-file-main">
            <strong>${helpers.escapeHtml(file.name)}</strong>
            <span class="subtle">${helpers.formatBytes(file.size)}</span>
          </span>
          <button
            class="upload-file-remove"
            type="button"
            data-upload-file-remove="${index}"
            aria-label="移除 ${helpers.escapeHtml(file.name)}"
            ${pageState.uploadPending ? "disabled" : ""}
          >移除</button>
        </div>
      `).join("");
    }

    function setUploadProgress(percent, label) {
      const normalizedPercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
      elements.uploadProgressLabel.textContent = label;
      elements.uploadProgressValue.textContent = `${normalizedPercent}%`;
      elements.uploadProgressFill.style.width = `${normalizedPercent}%`;
      elements.uploadProgressFill.dataset.progress = String(normalizedPercent);
    }

    function startUploadProgressLoop() {
      stopUploadProgressLoop();
      activateUploadProgressBusy();
      setUploadProgress(8, "正在上传");
      setUploadStage("upload");
      uploadProgressTimer = window.setInterval(() => {
        if (!pageState.uploadPending) {
          return;
        }
        const currentProgress = Number(elements.uploadProgressFill?.dataset.progress || 0);
        const increment = currentProgress < 50 ? 7 : currentProgress < 78 ? 4 : 2;
        const nextProgress = Math.min(94, currentProgress + increment);
        const isProcessing = nextProgress >= 82;
        setUploadProgress(nextProgress, isProcessing ? "服务端处理中..." : "正在上传");
        setUploadStage(isProcessing ? "process" : "upload");
      }, 420);
    }

    function stopUploadProgressLoop() {
      if (uploadProgressTimer) {
        window.clearInterval(uploadProgressTimer);
        uploadProgressTimer = null;
      }
      elements.uploadProgress?.setAttribute("aria-busy", "false");
      elements.uploadProgressFill?.classList.remove("is-moving");
    }

    function activateUploadProgressBusy() {
      elements.uploadProgress?.setAttribute("aria-busy", "true");
      elements.uploadProgressFill?.classList.add("is-moving");
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
