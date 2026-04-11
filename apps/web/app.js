const UPLOAD_HISTORY_KEY = "ragpro.uploadHistory";
const MAX_UPLOAD_HISTORY = 8;

const state = {
  user: null,
  users: [],
  sessionId: "",
  history: [],
  streaming: true,
  pending: false,
  uploadPending: false,
  sources: [],
  uploadFiles: [],
  uploadHistory: [],
};

const elements = {
  authBadge: document.getElementById("auth-badge"),
  authSummary: document.getElementById("auth-summary"),
  authUserCard: document.getElementById("auth-user-card"),
  authUsername: document.getElementById("auth-username"),
  authRole: document.getElementById("auth-role"),
  authSourceTags: document.getElementById("auth-source-tags"),
  authRefreshBtn: document.getElementById("auth-refresh-btn"),
  changePasswordBtn: document.getElementById("change-password-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  accessPanel: document.getElementById("access-panel"),
  accessRefreshBtn: document.getElementById("access-refresh-btn"),
  accessCreateForm: document.getElementById("access-create-form"),
  accessCreateUsername: document.getElementById("access-create-username"),
  accessCreatePassword: document.getElementById("access-create-password"),
  accessCreateRole: document.getElementById("access-create-role"),
  accessCreateSources: document.getElementById("access-create-sources"),
  accessUserList: document.getElementById("access-user-list"),
  uploadPanel: document.getElementById("upload-panel"),
  sessionId: document.getElementById("session-id"),
  statusBadge: document.getElementById("status-badge"),
  historyCount: document.getElementById("history-count"),
  historyList: document.getElementById("history-list"),
  messageList: document.getElementById("message-list"),
  citationsList: document.getElementById("citations-list"),
  route: document.getElementById("meta-route"),
  intent: document.getElementById("meta-intent"),
  strategy: document.getElementById("meta-strategy"),
  backend: document.getElementById("meta-backend"),
  context: document.getElementById("meta-context"),
  routeReason: document.getElementById("route-reason"),
  strategyReason: document.getElementById("strategy-reason"),
  sourceFilter: document.getElementById("source-filter"),
  queryInput: document.getElementById("query-input"),
  sendBtn: document.getElementById("send-btn"),
  streamMode: document.getElementById("stream-mode"),
  newSessionBtn: document.getElementById("new-session-btn"),
  copySessionBtn: document.getElementById("copy-session-btn"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),
  refreshHistoryBtn: document.getElementById("refresh-history-btn"),
  messageTemplate: document.getElementById("message-template"),
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
  uploadResult: document.getElementById("upload-result"),
  uploadHistoryList: document.getElementById("upload-history-list"),
};

async function init() {
  bindEvents();
  state.uploadHistory = loadUploadHistory();
  renderUploadHistory();
  renderSelectedFiles();
  setUploadProgress(0, "等待上传");
  await restoreSession();
}

function bindEvents() {
  elements.logoutBtn?.addEventListener("click", () => handleLogout());
  elements.authRefreshBtn?.addEventListener("click", () => restoreSession());
  elements.changePasswordBtn?.addEventListener("click", () => changeOwnPassword());
  elements.accessRefreshBtn?.addEventListener("click", () => loadUsers());
  elements.accessCreateForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAdminCreateUser();
  });
  elements.sendBtn?.addEventListener("click", () => sendQuery());
  elements.newSessionBtn?.addEventListener("click", () => createSession());
  elements.copySessionBtn?.addEventListener("click", copySessionId);
  elements.clearHistoryBtn?.addEventListener("click", () => clearHistory());
  elements.refreshHistoryBtn?.addEventListener("click", () => loadHistory());
  elements.streamMode?.addEventListener("change", () => {
    state.streaming = elements.streamMode.checked;
  });
  elements.queryInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuery();
    }
  });
  elements.uploadFileInput?.addEventListener("change", () => {
    setUploadFiles(Array.from(elements.uploadFileInput.files || []));
  });
  elements.uploadForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    uploadDocuments();
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

async function restoreSession() {
  try {
    const payload = await apiJson("/auth/me");
    state.user = payload.user;
    applyAuthState();
    await afterAuthenticated();
  } catch (error) {
    state.user = null;
    state.users = [];
    state.sources = [];
    applyLoggedOutState();
    if (error.status === 401) {
      setStatus("会话未登录，正在跳转到登录页。", true);
      window.location.replace("/login");
      return;
    }
    setStatus(`身份校验失败: ${error.message}`, true);
  }
}

async function afterAuthenticated() {
  await Promise.all([loadSources(), createSession()]);
  if (state.user?.role === "admin") {
    renderCreateSourceSelector();
    await loadUsers();
    return;
  }
  state.users = [];
  renderCreateSourceSelector();
  renderUsers();
}

async function handleLogout() {
  try {
    await apiJson("/auth/logout", { method: "POST" });
  } catch (error) {
    setStatus(`退出登录失败: ${error.message}`, true);
    return;
  }

  resetWorkspaceState();
  applyLoggedOutState();
  setStatus("已退出登录。");
  window.location.replace("/login");
}

async function changeOwnPassword() {
  if (!state.user) {
    return;
  }

  const currentPassword = window.prompt("请输入当前密码");
  if (!currentPassword) {
    return;
  }

  const newPassword = window.prompt("请输入新密码", "NewPassword123");
  if (!newPassword) {
    return;
  }

  try {
    await apiJson("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    resetWorkspaceState();
    applyLoggedOutState();
    setStatus("密码已更新，请重新登录。");
    window.location.replace("/login");
  } catch (error) {
    setStatus(`修改密码失败: ${error.message}`, true);
  }
}

function resetWorkspaceState() {
  state.user = null;
  state.users = [];
  state.sessionId = "";
  state.history = [];
  state.sources = [];
  state.uploadFiles = [];
  resetConversation();
}

function applyAuthState() {
  const user = state.user;
  const isAdmin = user?.role === "admin";
  elements.authBadge.textContent = isAdmin ? "管理员" : "已登录";
  elements.authSummary.innerHTML = isAdmin
    ? '<p class="note">当前账号已进入业务控制台。管理员可以上传文档、重建索引，并为不同成员分配来源权限。</p>'
    : '<p class="note">当前账号已进入业务控制台。你只能访问被授权的来源，如需扩容请联系管理员。</p>';
  elements.authUserCard.classList.remove("hidden");
  elements.authUsername.textContent = user.username;
  elements.authRole.textContent = `角色：${user.role}`;
  renderSourceTags(user.allowed_sources || []);
  elements.uploadPanel.classList.toggle("hidden", !isAdmin);
  elements.accessPanel.classList.toggle("hidden", !isAdmin);
  setWorkspaceEnabled(true);
}

function applyLoggedOutState() {
  elements.authBadge.textContent = "未登录";
  elements.authSummary.innerHTML = '<p class="note">当前会话不可用。系统会把你带回独立登录页。</p>';
  elements.authUserCard.classList.add("hidden");
  elements.uploadPanel.classList.add("hidden");
  elements.accessPanel.classList.add("hidden");
  renderSourceTags([]);
  populateSourceSelect(elements.sourceFilter, [], "请先登录");
  populateSourceSelect(elements.uploadSource, [], "管理员可用");
  elements.sessionId.textContent = "未创建";
  state.history = [];
  renderHistory();
  renderHistoryCount();
  renderUsers();
  renderCreateSourceSelector();
  setWorkspaceEnabled(false);
}

function setWorkspaceEnabled(enabled) {
  const disabled = !enabled;
  elements.sourceFilter.disabled = disabled;
  elements.queryInput.disabled = disabled;
  elements.sendBtn.disabled = disabled;
  elements.newSessionBtn.disabled = disabled;
  elements.copySessionBtn.disabled = disabled || !state.sessionId;
  elements.clearHistoryBtn.disabled = disabled;
  elements.refreshHistoryBtn.disabled = disabled;
}

async function loadSources() {
  const payload = await apiJson("/sources");
  state.sources = payload.sources || [];
  populateSourceSelect(
    elements.sourceFilter,
    state.sources,
    state.sources.length > 1 ? "请选择来源" : "全部来源",
  );
  populateSourceSelect(elements.uploadSource, state.sources, "选择来源");
  if (state.sources.length === 1) {
    elements.sourceFilter.value = state.sources[0];
    elements.uploadSource.value = state.sources[0];
  }
  renderCreateSourceSelector();
}

function renderCreateSourceSelector() {
  if (!elements.accessCreateSources) {
    return;
  }
  if (!state.user || state.user.role !== "admin" || !state.sources.length) {
    elements.accessCreateSources.innerHTML = '<div class="note">管理员登录后可选择来源。</div>';
    return;
  }
  elements.accessCreateSources.innerHTML = state.sources.map((source) => `
    <label class="source-checkbox">
      <input type="checkbox" data-create-source="${source}">
      <span>${source}</span>
    </label>
  `).join("");
}

async function handleAdminCreateUser() {
  if (!state.user || state.user.role !== "admin") {
    return;
  }

  const username = elements.accessCreateUsername.value.trim();
  const password = elements.accessCreatePassword.value;
  const role = elements.accessCreateRole.value;
  const allowedSources = Array.from(elements.accessCreateSources.querySelectorAll("[data-create-source]:checked"))
    .map((node) => node.getAttribute("data-create-source"));

  if (!username || !password) {
    setStatus("请填写新用户的用户名和密码。", true);
    return;
  }

  try {
    await apiJson("/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        role,
        allowed_sources: allowedSources,
        is_active: true,
      }),
    });
    elements.accessCreateUsername.value = "";
    elements.accessCreatePassword.value = "";
    elements.accessCreateRole.value = "user";
    renderCreateSourceSelector();
    await loadUsers();
    setStatus(`已创建用户 ${username}`);
  } catch (error) {
    setStatus(`创建用户失败: ${error.message}`, true);
  }
}

function populateSourceSelect(select, sources, placeholder) {
  if (!select) {
    return;
  }
  const currentValue = select.value;
  select.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);
  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source;
    select.appendChild(option);
  }
  if (sources.includes(currentValue)) {
    select.value = currentValue;
  }
}

async function createSession() {
  if (!state.user) {
    return;
  }
  try {
    const payload = await apiJson("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    state.sessionId = payload.session_id;
    state.history = [];
    elements.sessionId.textContent = state.sessionId;
    elements.copySessionBtn.disabled = false;
    renderHistory();
    renderHistoryCount();
    resetConversation();
  } catch (error) {
    setStatus(`创建会话失败: ${error.message}`, true);
  }
}

async function loadHistory() {
  if (!state.user || !state.sessionId) {
    return;
  }
  try {
    const payload = await apiJson(`/sessions/${state.sessionId}/history`);
    state.history = payload.history || [];
    renderHistory();
    renderHistoryCount();
  } catch (error) {
    setStatus(`加载历史失败: ${error.message}`, true);
  }
}

async function clearHistory() {
  if (!state.user || !state.sessionId) {
    return;
  }
  try {
    await apiJson(`/sessions/${state.sessionId}/history`, { method: "DELETE" });
    state.history = [];
    renderHistory();
    renderHistoryCount();
    resetConversation();
    setStatus("会话历史已清空。");
  } catch (error) {
    setStatus(`清空历史失败: ${error.message}`, true);
  }
}

async function sendQuery() {
  if (!state.user) {
    setStatus("请先登录。", true);
    window.location.replace("/login");
    return;
  }

  const query = elements.queryInput.value.trim();
  if (!query || state.pending) {
    return;
  }

  state.pending = true;
  elements.sendBtn.disabled = true;
  addMessage("user", query);
  elements.queryInput.value = "";
  setStatus(state.streaming ? "正在流式生成..." : "正在请求...");

  try {
    if (state.streaming) {
      await sendStreamingQuery(query);
    } else {
      await sendNormalQuery(query);
    }
    await loadHistory();
  } catch (error) {
    addMessage("system", `请求失败：${error.message}`);
    setStatus("请求失败", true);
  } finally {
    state.pending = false;
    elements.sendBtn.disabled = false;
  }
}

async function sendNormalQuery(query) {
  const payload = await apiJson("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(query, false)),
  });
  state.sessionId = payload.session_id || state.sessionId;
  elements.sessionId.textContent = state.sessionId;
  applyMeta(payload);
  addMessage("assistant", payload.answer || "当前没有返回答案。");
}

async function sendStreamingQuery(query) {
  const response = await fetch("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(query, true)),
  });
  if (!response.ok || !response.body) {
    throw await buildHttpError(response);
  }

  const assistantNode = addMessage("assistant", "");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventChunk of events) {
      const line = eventChunk.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) {
        continue;
      }
      const payload = JSON.parse(line.slice(6));
      if (payload.event === "start") {
        state.sessionId = payload.session_id || state.sessionId;
        elements.sessionId.textContent = state.sessionId;
        applyMeta(payload);
      } else if (payload.event === "chunk") {
        answer += payload.token || "";
        assistantNode.querySelector(".message-body").textContent = answer;
        scrollMessages();
      } else if (payload.event === "end") {
        answer = payload.answer || answer;
        assistantNode.querySelector(".message-body").textContent = answer || "当前没有返回答案。";
        applyMeta(payload);
      } else if (payload.event === "error") {
        throw new Error(payload.error || "流式响应失败");
      }
    }
  }
}

async function loadUsers() {
  if (!state.user || state.user.role !== "admin") {
    state.users = [];
    renderUsers();
    return;
  }
  try {
    const payload = await apiJson("/auth/users");
    state.users = payload.users || [];
    renderUsers();
  } catch (error) {
    setStatus(`加载用户列表失败: ${error.message}`, true);
  }
}

async function saveUserAccess(userId, payload) {
  try {
    await apiJson(`/auth/users/${userId}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus("权限更新成功。");
    await loadUsers();
  } catch (error) {
    setStatus(`权限更新失败: ${error.message}`, true);
  }
}

async function resetUserPassword(userId, username) {
  const newPassword = window.prompt(`请输入 ${username} 的新密码`, "NewPassword123");
  if (!newPassword) {
    return;
  }
  try {
    await apiJson(`/auth/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });
    setStatus(`已重置 ${username} 的密码。`);
  } catch (error) {
    setStatus(`重置密码失败: ${error.message}`, true);
  }
}

async function deleteUser(userId, username) {
  if (!window.confirm(`确认删除用户 ${username} 吗？`)) {
    return;
  }
  try {
    await apiJson(`/auth/users/${userId}`, { method: "DELETE" });
    setStatus(`已删除用户 ${username}。`);
    await loadUsers();
  } catch (error) {
    setStatus(`删除用户失败: ${error.message}`, true);
  }
}

function renderUsers() {
  if (!state.user || state.user.role !== "admin") {
    elements.accessUserList.innerHTML = '<div class="note">普通用户无权查看授权面板。</div>';
    return;
  }
  if (!state.users.length) {
    elements.accessUserList.innerHTML = '<div class="note">当前还没有可管理的用户。</div>';
    return;
  }

  elements.accessUserList.innerHTML = "";
  for (const user of state.users) {
    const card = document.createElement("article");
    card.className = "access-user-card";
    const isSelf = state.user && user.id === state.user.id;
    const checkboxHtml = state.sources.map((source) => {
      const checked = (user.allowed_sources || []).includes(source) ? "checked" : "";
      return `
        <label class="source-checkbox">
          <input type="checkbox" data-user-source="${source}" ${checked}>
          <span>${source}</span>
        </label>
      `;
    }).join("");

    card.innerHTML = `
      <div class="panel-head compact">
        <div>
          <h3>${escapeHtml(user.username)}</h3>
          <p class="subtle">ID ${user.id}</p>
        </div>
        <span class="status-chip ${user.is_active ? "is-ok" : "is-warn"}">${user.is_active ? "启用" : "停用"}</span>
      </div>
      <div class="access-grid">
        <label class="field-block">
          <span>角色</span>
          <select data-role-select>
            <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
          </select>
        </label>
        <label class="toggle">
          <input type="checkbox" data-active-toggle ${user.is_active ? "checked" : ""}>
          <span>账号启用</span>
        </label>
      </div>
      <div class="source-checkbox-grid">${checkboxHtml || '<div class="note">当前没有可分配来源。</div>'}</div>
      <div class="session-actions">
        <button class="ghost-btn" type="button" data-save-access>保存授权</button>
        <button class="ghost-btn danger" type="button" data-reset-password>重置密码</button>
        <button class="ghost-btn danger" type="button" data-delete-user ${isSelf ? "disabled" : ""}>删除用户</button>
      </div>
    `;

    card.querySelector("[data-save-access]").addEventListener("click", async () => {
      const allowedSources = Array.from(card.querySelectorAll("[data-user-source]:checked"))
        .map((node) => node.getAttribute("data-user-source"));
      const role = card.querySelector("[data-role-select]").value;
      const isActive = card.querySelector("[data-active-toggle]").checked;
      await saveUserAccess(user.id, {
        role,
        allowed_sources: allowedSources,
        is_active: isActive,
      });
    });

    card.querySelector("[data-reset-password]").addEventListener("click", async () => {
      await resetUserPassword(user.id, user.username);
    });

    const deleteButton = card.querySelector("[data-delete-user]");
    if (deleteButton && !deleteButton.disabled) {
      deleteButton.addEventListener("click", async () => {
        await deleteUser(user.id, user.username);
      });
    }

    elements.accessUserList.appendChild(card);
  }
}

async function uploadDocuments() {
  if (!state.user || state.user.role !== "admin" || state.uploadPending) {
    return;
  }

  const source = elements.uploadSource.value;
  const files = state.uploadFiles;

  if (!source) {
    renderUploadResult({ message: "请先选择上传来源。", isError: true });
    setStatus("请先选择上传来源。", true);
    return;
  }
  if (!files.length) {
    renderUploadResult({ message: "请至少选择一个文件。", isError: true });
    setStatus("请至少选择一个文件。", true);
    return;
  }

  state.uploadPending = true;
  elements.uploadSubmitBtn.disabled = true;
  setUploadProgress(0, "正在准备上传");
  setStatus("正在上传并入库...");

  const formData = new FormData();
  formData.append("source", source);
  formData.append("replace_source", String(elements.uploadReplaceSource.checked));
  for (const file of files) {
    formData.append("files", file);
  }

  try {
    const result = await submitUploadRequest(formData);
    state.uploadHistory = [
      {
        source: result.source,
        file_count: result.file_count,
        document_chunks: result.document_chunks,
        retrieval_backend: result.retrieval_backend,
        replace_source: result.replace_source,
        created_at: new Date().toISOString(),
      },
      ...state.uploadHistory,
    ].slice(0, MAX_UPLOAD_HISTORY);
    persistUploadHistory();
    renderUploadHistory();
    renderUploadResult({
      message: `上传完成：${result.file_count} 个文件，生成 ${result.document_chunks} 个切块，后端 ${result.retrieval_backend || "unknown"}`,
      isError: false,
    });
    setUploadProgress(100, "上传完成");
    addMessage("system", `已上传 ${result.file_count} 个文件到来源 ${result.source}。`);
    setUploadFiles([]);
    elements.uploadReplaceSource.checked = false;
    setStatus("文档上传并入库完成。");
  } catch (error) {
    setUploadProgress(0, "上传失败");
    renderUploadResult({ message: `上传失败：${error.message}`, isError: true });
    setStatus("上传失败", true);
  } finally {
    state.uploadPending = false;
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
      setUploadProgress(percent, percent >= 100 ? "服务器处理中..." : "正在上传");
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

function buildPayload(query, stream) {
  return {
    query,
    stream,
    session_id: state.sessionId || undefined,
    history: state.history,
    source_filter: elements.sourceFilter.value || undefined,
  };
}

function addMessage(role, text) {
  const node = elements.messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector(".message-tag").textContent = role === "user"
    ? "用户"
    : role === "assistant"
      ? "助手"
      : "系统";
  node.querySelector(".message-body").textContent = text || "";
  elements.messageList.appendChild(node);
  scrollMessages();
  return node;
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = '<div class="note">当前没有历史记录。</div>';
    return;
  }
  elements.historyList.innerHTML = "";
  for (const item of state.history) {
    const row = document.createElement("article");
    row.className = "history-item";
    row.innerHTML = `
      <strong>${escapeHtml(item.question || "未命名问题")}</strong>
      <p class="subtle">${escapeHtml(item.answer || "").slice(0, 120)}</p>
    `;
    elements.historyList.appendChild(row);
  }
}

function renderHistoryCount() {
  elements.historyCount.textContent = `${state.history.length} 条历史`;
}

function applyMeta(payload) {
  elements.route.textContent = payload.route || "-";
  elements.intent.textContent = payload.intent || "-";
  elements.strategy.textContent = payload.retrieval_strategy || "-";
  elements.backend.textContent = payload.retrieval_backend || "-";
  elements.context.textContent = String(payload.context_count || 0);
  elements.routeReason.textContent = payload.route_reason || "等待请求";
  elements.strategyReason.textContent = payload.strategy_reason || "等待请求";
  renderCitations(payload.citations || []);

  if (payload.confidence) {
    const label = payload.confidence.label || "unknown";
    const score = payload.confidence.score != null ? ` ${payload.confidence.score}` : "";
    setStatus(`路由 ${payload.route || "-"} | 置信 ${label}${score}`);
  }
}

function renderCitations(citations) {
  if (!citations.length) {
    elements.citationsList.innerHTML = '<div class="note">当前没有引用。</div>';
    return;
  }

  elements.citationsList.innerHTML = "";
  for (const item of citations) {
    const node = document.createElement("article");
    node.className = "citation-item";
    const matchedChunks = item.matched_chunks ? `<span class="subtle">命中 ${escapeHtml(item.matched_chunks)}</span>` : "";
    const score = item.score != null ? `<span class="subtle">score ${escapeHtml(item.score)}</span>` : "";
    node.innerHTML = `
      <div class="citation-head">
        <strong>${escapeHtml(item.source || "unknown")}</strong>
        <span class="subtle">${escapeHtml(item.timestamp || "")}</span>
      </div>
      <p class="citation-excerpt">${escapeHtml(item.excerpt || "")}</p>
      <div class="session-actions">${matchedChunks}${score}</div>
    `;
    elements.citationsList.appendChild(node);
  }
}

function resetConversation() {
  elements.route.textContent = "-";
  elements.intent.textContent = "-";
  elements.strategy.textContent = "-";
  elements.backend.textContent = "-";
  elements.context.textContent = "0";
  elements.routeReason.textContent = "等待请求";
  elements.strategyReason.textContent = "等待请求";
  elements.citationsList.innerHTML = '<div class="note">当前没有引用。</div>';
}

function scrollMessages() {
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function copySessionId() {
  if (!state.sessionId) {
    return;
  }
  navigator.clipboard.writeText(state.sessionId)
    .then(() => setStatus("Session ID 已复制。"))
    .catch(() => setStatus("复制 Session ID 失败。", true));
}

function setStatus(message, isError = false) {
  elements.statusBadge.textContent = message;
  elements.statusBadge.classList.toggle("is-error", Boolean(isError));
}

function setUploadFiles(files) {
  state.uploadFiles = files;
  renderSelectedFiles();
}

function renderSelectedFiles() {
  if (!state.uploadFiles.length) {
    elements.uploadFileList.innerHTML = '<div class="note">还没有选择文件。</div>';
    return;
  }
  elements.uploadFileList.innerHTML = state.uploadFiles.map((file) => `
    <div class="upload-file-item">
      <strong>${escapeHtml(file.name)}</strong>
      <span class="subtle">${formatBytes(file.size)}</span>
    </div>
  `).join("");
}

function setUploadProgress(percent, label) {
  elements.uploadProgressLabel.textContent = label;
  elements.uploadProgressValue.textContent = `${percent}%`;
  elements.uploadProgressFill.style.width = `${percent}%`;
}

function renderUploadResult({ message, isError }) {
  elements.uploadResult.textContent = message;
  elements.uploadResult.classList.toggle("is-error", Boolean(isError));
}

function renderUploadHistory() {
  if (!state.uploadHistory.length) {
    elements.uploadHistoryList.innerHTML = '<div class="note">还没有上传历史。</div>';
    return;
  }
  elements.uploadHistoryList.innerHTML = state.uploadHistory.map((item) => `
    <article class="upload-history-item">
      <strong>${escapeHtml(item.source)}</strong>
      <p class="upload-history-meta">${item.file_count} 个文件 / ${item.document_chunks} 个切块 / ${escapeHtml(item.retrieval_backend || "unknown")}</p>
      <p class="upload-history-files">${item.replace_source ? "覆盖重建" : "增量补充"} · ${escapeHtml(item.created_at || "")}</p>
    </article>
  `).join("");
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
  localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(state.uploadHistory));
}

function renderSourceTags(sources) {
  if (!sources.length) {
    elements.authSourceTags.innerHTML = '<span class="tag muted">暂无来源</span>';
    return;
  }
  elements.authSourceTags.innerHTML = sources.map((source) => `<span class="tag">${escapeHtml(source)}</span>`).join("");
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await buildHttpError(response);
    if (response.status === 401) {
      window.setTimeout(() => {
        window.location.replace("/login");
      }, 120);
    }
    throw error;
  }
  return response.status === 204 ? {} : response.json();
}

async function buildHttpError(response) {
  let message = `HTTP ${response.status}`;
  try {
    const payload = await response.json();
    if (payload?.detail) {
      message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
    }
  } catch (error) {
    const text = await response.text();
    if (text) {
      message = text;
    }
  }
  const wrapped = new Error(message);
  wrapped.status = response.status;
  return wrapped;
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();