window.RagProPage = {
  async init({ state, helpers }) {
    const UPLOAD_HISTORY_KEY = "ragpro.uploadHistory";
    const MAX_UPLOAD_HISTORY = 8;
    const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;
    const MAX_UPLOAD_FILE_COUNT = 10;
    const MAX_BATCH_UPLOAD_ITEMS = 8;
    const MAX_BATCH_UPLOAD_FILES = 40;
    const UPLOAD_JOB_POLL_INTERVAL_MS = 900;
    const UPLOAD_JOB_TIMEOUT_MS = 30 * 60 * 1000;
    const BATCH_UPLOAD_JOB_POLL_INTERVAL_MS = 1000;
    const BATCH_UPLOAD_JOB_TIMEOUT_MS = 60 * 60 * 1000;
    let batchItemCounter = 0;
    const pageState = {
      uploadPending: false,
      uploadFiles: [],
      uploadHistory: loadUploadHistory(),
      batchPending: false,
      batchItems: [],
      currentBatchFileCount: 0,
    };
    pageState.batchItems = [createBatchItem()];
    let sourceRefreshPromise = null;
    let uploadProgressTimer = null;
    let batchProgressTimer = null;
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
      batchUploadPanel: document.getElementById("batch-upload-panel"),
      batchUploadForm: document.getElementById("batch-upload-form"),
      batchUploadItems: document.getElementById("batch-upload-items"),
      batchAddItemBtn: document.getElementById("batch-add-item-btn"),
      batchUploadSubmitBtn: document.getElementById("batch-upload-submit-btn"),
      batchUploadCount: document.getElementById("batch-upload-count"),
      batchProgress: document.querySelector(".batch-upload-progress"),
      batchProgressLabel: document.getElementById("batch-progress-label"),
      batchProgressValue: document.getElementById("batch-progress-value"),
      batchProgressFill: document.getElementById("batch-progress-fill"),
      batchJobList: document.getElementById("batch-job-list"),
      batchUploadResult: document.getElementById("batch-upload-result"),
      summaryRole: document.getElementById("knowledge-summary-role"),
      summarySourceCount: document.getElementById("knowledge-summary-source-count"),
      summaryHistoryCount: document.getElementById("knowledge-summary-history-count"),
      summaryMode: document.getElementById("knowledge-summary-mode"),
    };

    renderUploadHistory();
    renderSelectedFiles();
    renderBatchItems();
    renderBatchJobList();
    setUploadProgress(0, "等待上传");
    setBatchProgress(0, "等待上传");
    setUploadStage("select");
    renderSummary();

    if (!helpers.isAdmin()) {
      disableUploadView();
      helpers.setStatus("当前账号不是管理员，只能查看知识运营说明。", true);
      return;
    }

    applyUploadSourceOptions(preferredSource);
    bindEvents();
    helpers.setStatus("知识运营页已就绪，可以按任务行上传资料并写入检索链路。");

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
      elements.batchAddItemBtn?.addEventListener("click", addBatchItem);
      elements.batchUploadForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        uploadBatchDocuments();
      });
      elements.batchUploadItems?.addEventListener("change", handleBatchItemChange);
      elements.batchUploadItems?.addEventListener("click", handleBatchItemClick);
      elements.batchUploadItems?.addEventListener("dragenter", handleBatchDragEvent);
      elements.batchUploadItems?.addEventListener("dragover", handleBatchDragEvent);
      elements.batchUploadItems?.addEventListener("dragleave", handleBatchDragEvent);
      elements.batchUploadItems?.addEventListener("drop", handleBatchDrop);
      elements.batchUploadItems?.addEventListener("focusin", (event) => {
        if (event.target.closest("[data-batch-source]")) {
          void refreshUploadSources();
        }
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
      if (selectedSource && pageState.batchItems.length && !pageState.batchItems[0].source) {
        pageState.batchItems[0].source = selectedSource;
      }
      applyBatchSourceOptions();
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
      elements.batchUploadForm?.classList.add("hidden");
      if (elements.uploadResult) {
        elements.uploadResult.textContent = "当前账号没有上传和入库权限。";
      }
      if (elements.batchUploadResult) {
        elements.batchUploadResult.textContent = "当前账号没有上传入库权限。";
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
      activateUploadProgressBusy();
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

    async function uploadBatchDocuments() {
      if (!helpers.isAdmin() || pageState.batchPending) {
        return;
      }

      const plan = collectBatchUploadPlan();
      if (plan.error) {
        renderBatchUploadResult({ message: plan.error, isError: true });
        helpers.setStatus(plan.error, true);
        return;
      }
      pageState.currentBatchFileCount = plan.fileCount;

      pageState.batchPending = true;
      setBatchBusy(true);
      setBatchProgress(0, formatUploadFileProgressLabel("正在准备入库", plan.fileCount));
      activateBatchProgressBusy();
      helpers.setStatus(formatUploadFileProgressLabel("正在提交入库任务", plan.fileCount));

      const formData = new FormData();
      formData.append("items_json", JSON.stringify(plan.items.map((item) => ({
        source: item.source,
        replace_source: item.replaceSource,
        file_count: item.files.length,
      }))));
      for (const item of plan.items) {
        for (const file of item.files) {
          formData.append("files", file);
        }
      }

      try {
        const batchResponse = await submitBatchUploadRequest(formData);
        const result = batchResponse?.batch_id ? await waitForBatchUploadJob(batchResponse) : batchResponse;
        stopBatchProgressLoop();
        renderBatchJobList(result);
        addBatchResultsToHistory(result);
        const completedFileCount = getBatchFileCount(result) || pageState.currentBatchFileCount;
        renderBatchUploadResult({
          message: `入库完成：${completedFileCount} 个文件已提交到检索链路。`,
          isError: false,
        });
        setBatchProgress(100, `${completedFileCount} 个文件入库完成`);
        pageState.batchItems = [createBatchItem()];
        renderBatchItems();
        helpers.setStatus(`${completedFileCount} 个文件入库任务已完成。`);
      } catch (error) {
        stopBatchProgressLoop();
        setBatchProgress(0, "入库失败");
        renderBatchUploadResult({ message: `入库失败：${error.message}`, isError: true });
        helpers.setStatus("入库失败，请检查任务状态后重试。", true);
      } finally {
        stopBatchProgressLoop();
        pageState.batchPending = false;
        setBatchBusy(false);
        pageState.currentBatchFileCount = 0;
        renderBatchItems();
      }
    }

    function submitBatchUploadRequest(formData) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/documents/batch-upload", true);
        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) {
            return;
          }
          const percent = Math.round((event.loaded / event.total) * 100);
          const visiblePercent = percent >= 100 ? 88 : Math.min(percent, 88);
          const label = percent >= 100 ? "服务端创建入库任务" : "正在上传";
          setBatchProgress(visiblePercent, formatUploadFileProgressLabel(label, pageState.currentBatchFileCount));
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
            reject(new Error(payload.detail || "入库失败"));
          } catch (error) {
            reject(new Error("入库失败"));
          }
        };
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.send(formData);
      });
    }

    async function waitForBatchUploadJob(initialBatch) {
      stopBatchProgressLoop();
      activateBatchProgressBusy();
      let batch = initialBatch;
      const startedAt = Date.now();
      applyBatchUploadProgress(batch);
      while (!["succeeded", "failed"].includes(batch.status)) {
        if (Date.now() - startedAt > BATCH_UPLOAD_JOB_TIMEOUT_MS) {
          throw new Error("入库任务超时，请稍后刷新确认结果。");
        }
        await delay(BATCH_UPLOAD_JOB_POLL_INTERVAL_MS);
        batch = await fetchBatchUploadJob(batch.batch_id);
        applyBatchUploadProgress(batch);
      }
      if (batch.status === "failed") {
        throw new Error(batch.message || "入库任务有失败项");
      }
      return batch;
    }

    async function fetchBatchUploadJob(batchId) {
      return helpers.apiJson(`/documents/batch-upload-jobs/${encodeURIComponent(batchId)}`);
    }

    function applyBatchUploadProgress(batch) {
      const progress = Number.isFinite(Number(batch.progress)) ? Number(batch.progress) : 0;
      const label = formatBatchProgressMessage(batch);
      setBatchProgress(progress, label);
      renderBatchJobList(batch);
      helpers.setStatus(label);
    }

    function getBatchFileCount(batch) {
      const jobs = Array.isArray(batch?.jobs) ? batch.jobs : [];
      const fileCount = jobs.reduce((total, job) => {
        const result = job.result || {};
        return total + Number(result.file_count || job.file_count || 0);
      }, 0);
      return fileCount || Number(batch?.file_count || 0) || 0;
    }

    function formatUploadFileProgressLabel(prefix, fileCount) {
      const normalizedCount = Number(fileCount || 0);
      if (!normalizedCount) {
        return prefix;
      }
      return `${prefix}（${normalizedCount} 个文件）`;
    }

    function formatBatchProgressMessage(batch) {
      const fileCount = getBatchFileCount(batch) || pageState.currentBatchFileCount;
      const fileSubject = formatFileCountSubject(fileCount);
      if (batch.status === "succeeded") {
        return `${fileSubject}入库完成`;
      }
      if (batch.status === "failed") {
        return `${fileSubject}入库失败`;
      }
      const activeJob = (batch.jobs || []).find((job) => job.status === "running") || (batch.jobs || [])[0];
      const activeMessage = activeJob?.message || batch.message || "入库任务正在处理...";
      if (activeMessage) {
        return `${fileSubject}：${activeMessage}`;
      }
      if (batch.status === "queued") {
        return `${fileSubject}已接收，等待入库。`;
      }
      return `${fileSubject}正在入库处理...`;
    }

    function formatFileCountSubject(fileCount) {
      return Number(fileCount || 0) ? `${Number(fileCount)} 个文件` : "文件";
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
      const rawStage = String(job.stage || "");
      if (rawStage === "queued" || rawStage === "prepare") {
        return "prepare";
      }
      if (rawStage === "save" || rawStage === "upload") {
        return "upload";
      }
      if (rawStage === "done") {
        return "done";
      }
      if (["parse", "chunk", "cleanup", "index", "registry", "process"].includes(rawStage)) {
        return "process";
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

    function createBatchItem() {
      batchItemCounter += 1;
      return {
        id: batchItemCounter,
        source: "",
        replaceSource: false,
        files: [],
      };
    }

    function addBatchItem() {
      if (pageState.batchPending) {
        return;
      }
      if (pageState.batchItems.length >= MAX_BATCH_UPLOAD_ITEMS) {
        renderBatchUploadResult({
          message: `单次最多配置 ${MAX_BATCH_UPLOAD_ITEMS} 个入库任务行。`,
          isError: true,
        });
        return;
      }
      pageState.batchItems.push(createBatchItem());
      renderBatchItems();
    }

    function handleBatchItemChange(event) {
      const sourceSelect = event.target.closest("[data-batch-source]");
      if (sourceSelect) {
        const index = Number(sourceSelect.dataset.batchSource);
        const item = pageState.batchItems[index];
        if (item) {
          item.source = helpers.getSourceSelectValue(sourceSelect);
          renderBatchCount();
        }
        return;
      }

      const replaceInput = event.target.closest("[data-batch-replace]");
      if (replaceInput) {
        const index = Number(replaceInput.dataset.batchReplace);
        const item = pageState.batchItems[index];
        if (item) {
          item.replaceSource = replaceInput.checked;
        }
        return;
      }

      const fileInput = event.target.closest("[data-batch-file-input]");
      if (fileInput) {
        const index = Number(fileInput.dataset.batchFileInput);
        setBatchItemFiles(index, Array.from(fileInput.files || []));
        fileInput.value = "";
      }
    }

    function handleBatchItemClick(event) {
      const removeItemButton = event.target.closest("[data-batch-remove]");
      if (removeItemButton) {
        removeBatchItem(Number(removeItemButton.dataset.batchRemove));
        return;
      }

      const removeFileButton = event.target.closest("[data-batch-file-remove]");
      if (removeFileButton) {
        removeBatchFile(
          Number(removeFileButton.dataset.batchFileRemove),
          Number(removeFileButton.dataset.batchFileIndex),
        );
      }
    }

    function removeBatchItem(index) {
      if (pageState.batchPending || pageState.batchItems.length <= 1) {
        return;
      }
      pageState.batchItems = pageState.batchItems.filter((_, itemIndex) => itemIndex !== index);
      if (!pageState.batchItems.length) {
        pageState.batchItems = [createBatchItem()];
      }
      renderBatchItems();
    }

    function handleBatchDragEvent(event) {
      const dropZone = event.target.closest(".batch-file-drop");
      if (!dropZone) {
        return;
      }
      event.preventDefault();
      if (event.type === "dragenter" || event.type === "dragover") {
        dropZone.classList.add("is-dragover");
      } else {
        dropZone.classList.remove("is-dragover");
      }
    }

    function handleBatchDrop(event) {
      const dropZone = event.target.closest(".batch-file-drop");
      if (!dropZone) {
        return;
      }
      event.preventDefault();
      dropZone.classList.remove("is-dragover");
      const index = Number(dropZone.dataset.batchDropZone);
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) {
        setBatchItemFiles(index, files);
      }
    }

    function setBatchItemFiles(index, files) {
      const item = pageState.batchItems[index];
      if (!item || pageState.batchPending) {
        return;
      }
      const incomingFiles = Array.from(files || []);
      const nextFiles = [...item.files, ...incomingFiles];
      item.files = nextFiles.slice(0, MAX_BATCH_UPLOAD_FILES);
      if (nextFiles.length > MAX_BATCH_UPLOAD_FILES) {
        renderBatchUploadResult({
          message: `单次最多 ${MAX_BATCH_UPLOAD_FILES} 个文件，已保留前 ${MAX_BATCH_UPLOAD_FILES} 个。`,
          isError: true,
        });
      }
      renderBatchItems();
    }

    function removeBatchFile(itemIndex, fileIndex) {
      const item = pageState.batchItems[itemIndex];
      if (!item || pageState.batchPending) {
        return;
      }
      item.files = item.files.filter((_, index) => index !== fileIndex);
      renderBatchItems();
    }

    function applyBatchSourceOptions() {
      for (const [index, item] of pageState.batchItems.entries()) {
        const select = elements.batchUploadItems?.querySelector(`[data-batch-source="${index}"]`);
        if (!select) {
          continue;
        }
        const currentSource = item.source || helpers.getSourceSelectValue(select);
        helpers.populateSourceSelect(select, state.sources || [], "请选择来源");
        helpers.setSourceSelectValue(select, currentSource);
      }
    }

    function renderBatchItems() {
      if (!elements.batchUploadItems) {
        return;
      }
      if (!pageState.batchItems.length) {
        pageState.batchItems = [createBatchItem()];
      }
      elements.batchUploadItems.innerHTML = pageState.batchItems.map((item, index) => renderBatchItem(item, index)).join("");
      applyBatchSourceOptions();
      renderBatchCount();
    }

    function renderBatchItem(item, index) {
      const filesMarkup = item.files.length
        ? item.files.map((file, fileIndex) => `
          <div class="upload-file-item" data-batch-file="${index}-${fileIndex}">
            <span class="upload-file-main">
              <strong>${helpers.escapeHtml(file.name)}</strong>
              <span class="subtle">${helpers.formatBytes(file.size)}</span>
            </span>
            <button
              class="upload-file-remove"
              type="button"
              data-batch-file-remove="${index}"
              data-batch-file-index="${fileIndex}"
              aria-label="移除 ${helpers.escapeHtml(file.name)}"
              ${pageState.batchPending ? "disabled" : ""}
            >移除</button>
          </div>
        `).join("")
        : helpers.renderEmptyState("还没有选择文件", "点击选择多个文件，或直接拖拽文件到上方区域；后续再拖入会继续追加。", "soft");
      return `
        <article class="batch-upload-item" data-batch-item="${index}">
          <div class="batch-upload-grid">
            <label class="control-field stacked" for="batch-source-${item.id}">
              <span>目标来源</span>
              <select id="batch-source-${item.id}" data-batch-source="${index}" ${pageState.batchPending ? "disabled" : ""}>
                <option value="">请选择来源</option>
              </select>
            </label>
            <label class="toggle batch-upload-toggle">
              <input data-batch-replace="${index}" type="checkbox" ${item.replaceSource ? "checked" : ""} ${pageState.batchPending ? "disabled" : ""}>
              <span>覆盖旧索引</span>
            </label>
          </div>
          <label class="file-drop batch-file-drop" for="batch-file-${item.id}" data-batch-drop-zone="${index}">
            <input id="batch-file-${item.id}" data-batch-file-input="${index}" type="file" multiple accept=".txt,.md,.markdown,.html,.htm,.pdf,.docx,.ppt,.pptx" ${pageState.batchPending ? "disabled" : ""}>
            <strong>点击选择，或拖拽文件追加到这里</strong>
            <span>支持一次多选；后续选择或拖拽会继续追加，单文件最大 ${helpers.formatBytes(MAX_UPLOAD_FILE_BYTES)}</span>
          </label>
          <div class="file-list batch-file-list">${filesMarkup}</div>
        </article>
      `;
    }

    function renderBatchCount() {
      if (elements.batchUploadCount) {
        const fileCount = pageState.batchItems.reduce((total, item) => total + item.files.length, 0);
        elements.batchUploadCount.textContent = `${fileCount} 个文件`;
      }
    }

    function collectBatchUploadPlan() {
      const items = [];
      let totalFiles = 0;
      for (const [index, item] of pageState.batchItems.entries()) {
        const select = elements.batchUploadItems?.querySelector(`[data-batch-source="${index}"]`);
        const source = (select ? helpers.getSourceSelectValue(select) : item.source || "").trim();
        item.source = source;
        const hasContent = Boolean(source || item.files.length);
        if (!hasContent) {
          continue;
        }
        if (!source) {
          return { error: "请先选择目标来源。" };
        }
        if (!helpers.isValidSourceName(source)) {
          return { error: "来源只能使用 1-50 位字母、数字、下划线或短横线。" };
        }
        if (!item.files.length) {
          return { error: "请至少选择一个文件。" };
        }
        const oversizedFiles = item.files.filter((file) => file.size > MAX_UPLOAD_FILE_BYTES);
        if (oversizedFiles.length) {
          return {
            error: `存在超过 ${helpers.formatBytes(MAX_UPLOAD_FILE_BYTES)} 的文件：${oversizedFiles[0].name}`,
          };
        }
        totalFiles += item.files.length;
        items.push(item);
      }
      if (!items.length) {
        return { error: "请至少配置一个入库任务。" };
      }
      if (items.length > MAX_BATCH_UPLOAD_ITEMS) {
        return { error: `单次最多配置 ${MAX_BATCH_UPLOAD_ITEMS} 个入库任务行。` };
      }
      if (totalFiles > MAX_BATCH_UPLOAD_FILES) {
        return { error: `单次最多上传 ${MAX_BATCH_UPLOAD_FILES} 个文件。` };
      }
      return { items, fileCount: totalFiles };
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

    function setBatchProgress(percent, label) {
      const normalizedPercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
      elements.batchProgressLabel.textContent = label;
      elements.batchProgressValue.textContent = `${normalizedPercent}%`;
      elements.batchProgressFill.style.width = `${normalizedPercent}%`;
      elements.batchProgressFill.dataset.progress = String(normalizedPercent);
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

    function startBatchProgressLoop() {
      stopBatchProgressLoop();
      activateBatchProgressBusy();
      setBatchProgress(8, formatUploadFileProgressLabel("正在上传", pageState.currentBatchFileCount));
      batchProgressTimer = window.setInterval(() => {
        if (!pageState.batchPending) {
          return;
        }
        const currentProgress = Number(elements.batchProgressFill?.dataset.progress || 0);
        const increment = currentProgress < 45 ? 6 : currentProgress < 78 ? 3 : 1;
        const nextProgress = Math.min(92, currentProgress + increment);
        setBatchProgress(
          nextProgress,
          formatUploadFileProgressLabel(nextProgress >= 75 ? "入库任务处理中" : "正在上传", pageState.currentBatchFileCount),
        );
      }, 520);
    }

    function stopUploadProgressLoop() {
      if (uploadProgressTimer) {
        window.clearInterval(uploadProgressTimer);
        uploadProgressTimer = null;
      }
      elements.uploadProgress?.setAttribute("aria-busy", "false");
      elements.uploadProgressFill?.classList.remove("is-moving");
    }

    function stopBatchProgressLoop() {
      if (batchProgressTimer) {
        window.clearInterval(batchProgressTimer);
        batchProgressTimer = null;
      }
      elements.batchProgress?.setAttribute("aria-busy", "false");
      elements.batchProgressFill?.classList.remove("is-moving");
    }

    function activateUploadProgressBusy() {
      elements.uploadProgress?.setAttribute("aria-busy", "true");
      elements.uploadProgressFill?.classList.add("is-moving");
    }

    function activateBatchProgressBusy() {
      elements.batchProgress?.setAttribute("aria-busy", "true");
      elements.batchProgressFill?.classList.add("is-moving");
    }

    function setBatchBusy(isBusy) {
      if (elements.batchAddItemBtn) {
        elements.batchAddItemBtn.disabled = Boolean(isBusy);
      }
      if (elements.batchUploadSubmitBtn) {
        elements.batchUploadSubmitBtn.disabled = Boolean(isBusy);
        elements.batchUploadSubmitBtn.textContent = isBusy ? "入库中..." : "提交入库";
      }
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

    function renderBatchUploadResult({ message, isError }) {
      elements.batchUploadResult.textContent = message;
      elements.batchUploadResult.classList.toggle("is-error", Boolean(isError));
    }

    function renderBatchJobList(batch = null) {
      if (!elements.batchJobList) {
        return;
      }
      const jobs = Array.isArray(batch?.jobs) ? batch.jobs : [];
      if (!jobs.length) {
        elements.batchJobList.innerHTML = helpers.renderEmptyState(
          "还没有入库任务",
          "提交后会展示每个来源的入库状态、文件数量和进度。",
          "soft",
        );
        return;
      }
      elements.batchJobList.innerHTML = jobs.map((job) => {
        const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
        const status = job.status || "queued";
        const result = job.result || {};
        const chunks = result.document_chunks ? ` / ${result.document_chunks} 个切块` : "";
        return `
          <article class="batch-job-item is-${helpers.escapeHtml(status)}">
            <div class="batch-job-head">
              <strong>${helpers.escapeHtml(helpers.formatSourceLabel(job.source || "-"))}</strong>
              <span class="status-chip">${formatBatchJobStatus(status)}</span>
            </div>
            <div class="batch-job-meter" aria-hidden="true">
              <span style="width: ${progress}%"></span>
            </div>
            <p>${Number(job.file_count || result.file_count || 0)} 个文件${chunks} · ${helpers.escapeHtml(job.message || "等待处理")}</p>
          </article>
        `;
      }).join("");
    }

    function formatBatchJobStatus(status) {
      if (status === "succeeded") {
        return "已完成";
      }
      if (status === "failed") {
        return "失败";
      }
      if (status === "running") {
        return "处理中";
      }
      if (status === "unknown") {
        return "待确认";
      }
      return "等待中";
    }

    function addBatchResultsToHistory(batch) {
      const completedItems = (batch?.jobs || [])
        .map((job) => job.result ? { ...job.result, source: job.source || job.result.source } : null)
        .filter(Boolean);
      if (!completedItems.length) {
        return;
      }
      const now = new Date().toISOString();
      const entries = completedItems.map((result) => ({
        source: result.source,
        file_count: result.file_count,
        document_chunks: result.document_chunks,
        retrieval_backend: result.retrieval_backend,
        replace_source: result.replace_source,
        created_at: now,
      }));
      pageState.uploadHistory = [...entries, ...pageState.uploadHistory].slice(0, MAX_UPLOAD_HISTORY);
      persistUploadHistory();
      renderUploadHistory();
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
          <strong>${helpers.escapeHtml(helpers.formatSourceLabel(item.source))}</strong>
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
