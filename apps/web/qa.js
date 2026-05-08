window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      sessionId: "",
      sessions: [],
      history: [],
      pending: false,
      streaming: true,
      hasAsked: false,
    };
    let sourceRefreshPromise = null;
    const AUTO_SOURCE_PLACEHOLDER = "全部（按权限自动检索）";

    const elements = {
      sessionId: document.getElementById("session-id"),
      historyCount: document.getElementById("history-count"),
      historyList: document.getElementById("history-list"),
      messageList: document.getElementById("message-list"),
      citationsList: document.getElementById("citations-list"),
      route: document.getElementById("meta-route"),
      intent: document.getElementById("meta-intent"),
      strategy: document.getElementById("meta-strategy"),
      backend: document.getElementById("meta-backend"),
      context: document.getElementById("meta-context"),
      routeDetailList: document.getElementById("qa-route-detail-list"),
      sourceFilter: document.getElementById("source-filter"),
      queryInput: document.getElementById("query-input"),
      queryInputMeter: document.getElementById("query-input-meter"),
      querySourceHint: document.getElementById("query-source-hint"),
      sendBtn: document.getElementById("send-btn"),
      streamMode: document.getElementById("stream-mode"),
      newSessionBtn: document.getElementById("new-session-btn"),
      copySessionBtn: document.getElementById("copy-session-btn"),
      clearHistoryBtn: document.getElementById("clear-history-btn"),
      sessionList: document.getElementById("session-list"),
      messageTemplate: document.getElementById("message-template"),
      summarySession: document.getElementById("qa-summary-session"),
      summarySources: document.getElementById("qa-summary-sources"),
      summaryMode: document.getElementById("qa-summary-mode"),
      summaryBackend: document.getElementById("qa-summary-backend"),
      suggestionButtons: Array.from(document.querySelectorAll("[data-prompt-suggestion]")),
      contextTabs: Array.from(document.querySelectorAll("[data-qa-context-tab]")),
      contextPanes: Array.from(document.querySelectorAll("[data-qa-context-pane]")),
      currentTurnPanel: document.querySelector(".qa-current-turn"),
      currentQuestion: document.getElementById("qa-current-question"),
      currentStage: document.getElementById("qa-current-stage"),
    };

    bindEvents();
    helpers.populateSourceSelect(
      elements.sourceFilter,
      state.sources || [],
      AUTO_SOURCE_PLACEHOLDER,
    );
    if ((state.sources || []).length === 1) {
      elements.sourceFilter.value = state.sources[0];
    }
    renderSummary();
    updateComposerTelemetry();
    applySourceOptions();
    resetConversation();
    await createSession();
    await loadSessionList();
    helpers.setStatus("问答页已就绪，可以直接提问。");

    function bindEvents() {
      elements.sendBtn?.addEventListener("click", sendQuery);
      elements.newSessionBtn?.addEventListener("click", createSession);
      elements.copySessionBtn?.addEventListener("click", copySessionId);
      elements.clearHistoryBtn?.addEventListener("click", clearHistory);
      elements.sessionList?.addEventListener("click", (event) => {
        const target = event.target.closest("[data-session-id]");
        if (!target) {
          return;
        }
        void selectSession(target.getAttribute("data-session-id") || "");
      });
      elements.sourceFilter?.addEventListener("focus", () => {
        void refreshSourceFilter();
      });
      elements.streamMode?.addEventListener("change", () => {
        pageState.streaming = elements.streamMode.checked;
        renderSummary();
      });
      elements.queryInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendQuery();
        }
      });
      elements.queryInput?.addEventListener("input", updateComposerTelemetry);
      elements.sourceFilter?.addEventListener("change", updateComposerTelemetry);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          return;
        }
        void refreshSourceFilter();
      });
      for (const button of elements.suggestionButtons) {
        button.addEventListener("click", () => {
          const suggestion = button.getAttribute("data-prompt-suggestion") || "";
          elements.queryInput.value = suggestion;
          elements.queryInput.focus();
          updateComposerTelemetry();
        });
      }
      for (const tab of elements.contextTabs) {
        tab.addEventListener("click", () => {
          activateContextPane(tab.getAttribute("data-qa-context-tab") || "");
        });
      }
    }

    function applySourceOptions(selectedSource = "") {
      helpers.populateSourceSelect(
        elements.sourceFilter,
        state.sources || [],
        AUTO_SOURCE_PLACEHOLDER,
      );
      if (selectedSource) {
        helpers.setSourceSelectValue(elements.sourceFilter, selectedSource);
      } else if ((state.sources || []).length === 1) {
        helpers.setSourceSelectValue(elements.sourceFilter, state.sources[0]);
      } else {
        helpers.setSourceSelectValue(elements.sourceFilter, "");
      }
      renderSummary();
      updateComposerTelemetry();
    }

    async function refreshSourceFilter() {
      if (!state.user) {
        return state.sources || [];
      }
      if (sourceRefreshPromise) {
        return sourceRefreshPromise;
      }
      const preservedSource = helpers.getSourceSelectValue(elements.sourceFilter);
      sourceRefreshPromise = (async () => {
        if (typeof helpers.loadSources === "function") {
          await helpers.loadSources();
        }
        applySourceOptions(preservedSource);
        return state.sources || [];
      })().finally(() => {
        sourceRefreshPromise = null;
      });
      return sourceRefreshPromise;
    }

    function activateContextPane(target) {
      if (!target) {
        return;
      }
      for (const tab of elements.contextTabs) {
        const isActive = tab.getAttribute("data-qa-context-tab") === target;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      }
      for (const pane of elements.contextPanes) {
        const isActive = pane.getAttribute("data-qa-context-pane") === target;
        pane.classList.toggle("is-active", isActive);
        pane.hidden = !isActive;
      }
      if (elements.currentTurnPanel) {
        elements.currentTurnPanel.hidden = target === "history";
      }
    }

    async function createSession() {
      if (!state.user) {
        return;
      }
      try {
        const payload = await helpers.apiJson("/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        pageState.sessionId = payload.session_id;
        pageState.history = [];
        elements.sessionId.textContent = pageState.sessionId || "尚未创建";
        elements.copySessionBtn.disabled = !pageState.sessionId;
        renderHistory();
        renderHistoryCount();
        renderSummary();
        resetConversation();
        renderSessionList();
      } catch (error) {
        helpers.setStatus(`创建会话失败：${error.message}`, true);
      }
    }

    async function loadSessionList() {
      if (!state.user) {
        return;
      }
      try {
        const payload = await helpers.apiJson("/sessions");
        pageState.sessions = payload.sessions || [];
        renderSessionList();
      } catch (error) {
        helpers.setStatus(`加载历史会话失败：${error.message}`, true);
      }
    }

    async function selectSession(sessionId) {
      if (!sessionId || sessionId === pageState.sessionId) {
        return;
      }
      pageState.sessionId = sessionId;
      elements.sessionId.textContent = pageState.sessionId || "尚未创建";
      elements.copySessionBtn.disabled = !pageState.sessionId;
      resetConversation();
      await loadHistory();
      renderSessionList();
      helpers.setStatus("历史会话已恢复。");
    }

    async function loadHistory() {
      if (!state.user || !pageState.sessionId) {
        return;
      }
      try {
        const payload = await helpers.apiJson(`/sessions/${pageState.sessionId}/history`);
        pageState.history = payload.history || [];
        renderHistory();
        renderHistoryCount();
      } catch (error) {
        helpers.setStatus(`加载历史失败：${error.message}`, true);
      }
    }

    async function clearHistory() {
      if (!state.user || !pageState.sessionId) {
        return;
      }
      try {
        await helpers.apiJson(`/sessions/${pageState.sessionId}/history`, { method: "DELETE" });
        pageState.history = [];
        renderHistory();
        renderHistoryCount();
        resetConversation();
        await loadSessionList();
        helpers.setStatus("当前会话历史已清空。");
      } catch (error) {
        helpers.setStatus(`清空历史失败：${error.message}`, true);
      }
    }

    async function sendQuery() {
      if (!state.user) {
        window.location.replace("/login");
        return;
      }

      const query = elements.queryInput.value.trim();
      if (!query || pageState.pending) {
        return;
      }

      pageState.pending = true;
      pageState.hasAsked = true;
      elements.sendBtn.disabled = true;
      updateComposerTelemetry();
      updateCurrentTurn(query, "正在处理问题");
      addMessage("user", query);
      const assistantNode = addThinkingMessage();
      elements.queryInput.value = "";
      updateComposerTelemetry();
      helpers.setStatus(pageState.streaming ? "正在流式生成答案..." : "正在请求答案...");

      try {
        if (pageState.streaming) {
          await sendStreamingQuery(query, assistantNode);
        } else {
          await sendNormalQuery(query, assistantNode);
        }
        updateCurrentTurn(query, "已完成");
        await loadHistory();
        await loadSessionList();
      } catch (error) {
        completeAssistantMessage(
          assistantNode,
          "这次提问暂时没有处理成功，请稍后重试，或换一个更明确的问法。",
        );
        addMessage("system", "这次提问暂时没有处理成功，请稍后重试，或换一个更明确的问法。");
        updateCurrentTurn(query, "请求失败");
        helpers.setStatus(error.message || "当前请求失败，请稍后重试。", true);
      } finally {
        pageState.pending = false;
        elements.sendBtn.disabled = false;
        updateComposerTelemetry();
      }
    }

    async function sendNormalQuery(query, assistantNode) {
      const payload = await helpers.apiJson("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(query, false)),
      });
      pageState.sessionId = payload.session_id || pageState.sessionId;
      elements.sessionId.textContent = pageState.sessionId || "尚未创建";
      applyMeta(payload);
      completeAssistantMessage(assistantNode, payload.answer || "当前没有返回答案。");
    }

    async function sendStreamingQuery(query, assistantNode) {
      const response = await fetch("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(query, true)),
      });
      if (!response.ok || !response.body) {
        throw await helpers.buildHttpError(response);
      }

      const answerNode = assistantNode || addMessage("assistant", "");
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
            pageState.sessionId = payload.session_id || pageState.sessionId;
            elements.sessionId.textContent = pageState.sessionId || "尚未创建";
            updateSearchProgress(answerNode, payload);
            applyMeta(payload);
          } else if (payload.event === "chunk") {
            answer += payload.token || "";
            updateAssistantDraft(answerNode, answer || "正在生成答案...");
            scrollMessages();
          } else if (payload.event === "end") {
            answer = payload.answer || answer;
            completeAssistantMessage(answerNode, answer || "当前没有返回答案。");
            applyMeta(payload);
          } else if (payload.event === "error") {
            throw new Error(payload.error || "流式响应失败");
          }
        }
      }
    }

    function buildPayload(query, stream) {
      return {
        query,
        stream,
        session_id: pageState.sessionId || undefined,
        history: pageState.history,
        source_filter: helpers.getSourceSelectValue(elements.sourceFilter) || undefined,
      };
    }

    function addMessage(role, text) {
      const node = elements.messageTemplate.content.firstElementChild.cloneNode(true);
      node.classList.add(role);
      node.querySelector(".message-body").textContent = text || "";
      elements.messageList.appendChild(node);
      scrollMessages();
      return node;
    }

    function addThinkingMessage() {
      const node = addMessage("assistant", "");
      node.classList.add("is-thinking");
      node.querySelector(".message-body").innerHTML = `
        <div class="search-progress" role="status" aria-live="polite">
          <span data-search-status-text>检索中</span>
          <span class="search-progress-dots" aria-hidden="true">
            <span class="search-progress-dot">.</span>
            <span class="search-progress-dot">.</span>
            <span class="search-progress-dot">.</span>
          </span>
        </div>
      `;
      scrollMessages();
      return node;
    }

    function completeAssistantMessage(node, text) {
      if (!node) {
        addMessage("assistant", text);
        return;
      }
      node.classList.remove("is-thinking");
      node.querySelector(".message-body").textContent = text || "";
      scrollMessages();
    }

    function updateSearchProgress(node, payload = {}) {
      if (!node) {
        return;
      }
      const status = node.querySelector("[data-search-status-text]");
      if (!status) {
        return;
      }
      const count = Number(payload.context_count ?? payload.retrieval_count ?? payload.citation_count);
      if (Number.isFinite(count) && count > 0) {
        status.innerHTML = `检索<span class="search-progress-count">${helpers.escapeHtml(count)}</span>篇结果`;
      } else {
        status.textContent = "检索中";
      }
    }

    function updateAssistantDraft(node, text) {
      if (!node) {
        addMessage("assistant", text);
        return;
      }
      node.classList.add("is-thinking");
      const body = node.querySelector(".message-body");
      let draft = body.querySelector("[data-thinking-answer]");
      if (!draft) {
        draft = document.createElement("div");
        draft.className = "thinking-answer";
        draft.setAttribute("data-thinking-answer", "");
        body.appendChild(draft);
      }
      draft.textContent = text || "正在生成答案...";
      scrollMessages();
    }

    function renderSessionList() {
      if (!elements.sessionList) {
        return;
      }
      if (!pageState.sessions.length) {
        elements.sessionList.innerHTML = helpers.renderEmptyState(
          "还没有历史会话",
          "完成至少一轮问答后，这里会列出可恢复的会话记录。",
          "soft",
        );
        return;
      }
      elements.sessionList.innerHTML = pageState.sessions.map((session) => {
        const isActive = session.session_id === pageState.sessionId;
        const updatedAt = session.updated_at || "时间未知";
        const question = session.last_question || "未记录最近问题";
        const answer = session.last_answer || "未记录最近回答";
        return `
          <button class="session-history-item${isActive ? " is-active" : ""}" type="button" data-session-id="${helpers.escapeHtml(session.session_id || "")}">
            <span class="session-history-main">
              <strong>${helpers.escapeHtml(question)}</strong>
              <small>${helpers.escapeHtml(answer)}</small>
            </span>
            <span class="session-history-meta">
              <code>${helpers.escapeHtml(session.session_id || "-")}</code>
              <span>${helpers.escapeHtml(updatedAt)} · ${helpers.escapeHtml(session.turn_count || 0)} 轮</span>
            </span>
          </button>
        `;
      }).join("");
    }

    function renderHistory() {
      if (pageState.history.length) {
        renderRichHistory();
        return;
      }
      if (!pageState.history.length) {
        elements.historyList.innerHTML = helpers.renderEmptyState(
          "暂无历史记录",
          "发送第一轮问题后，最近的问答记录会展示在这里，方便你继续追问或回看。",
          "soft",
        );
        return;
      }
      elements.historyList.innerHTML = "";
      for (const item of pageState.history) {
        const row = document.createElement("article");
        row.className = "history-item";
        row.innerHTML = `
          <strong>${helpers.escapeHtml(item.question || "未命名问题")}</strong>
          <p class="subtle">${helpers.escapeHtml(item.answer || "").slice(0, 120)}</p>
        `;
        elements.historyList.appendChild(row);
      }
    }

    function renderRichHistory() {
      if (!pageState.history.length) {
        renderHistory();
        return;
      }
      elements.historyList.innerHTML = "";
      pageState.history.forEach((item, index) => {
        const question = item.question || "未命名问题";
        const answer = item.answer || "当前记录没有答案内容。";
        const node = document.createElement("details");
        node.className = "history-item qa-history-detail";
        node.open = index === 0;
        node.innerHTML = `
          <summary>
            <span class="qa-history-index">#${index + 1}</span>
            <strong>${helpers.escapeHtml(question)}</strong>
          </summary>
          <div class="qa-history-body">
            <span class="label">完整回答</span>
            <p>${helpers.escapeHtml(answer)}</p>
          </div>
        `;
        elements.historyList.appendChild(node);
      });
    }

    function renderHistoryCount() {
      elements.historyCount.textContent = `${pageState.history.length} 条`;
    }

    function setText(node, value) {
      if (node) {
        node.textContent = value;
      }
    }

    function applyMeta(payload) {
      setText(elements.route, payload.route || "-");
      setText(elements.intent, payload.intent || "-");
      setText(elements.strategy, payload.retrieval_strategy || "-");
      setText(elements.backend, payload.retrieval_backend || "-");
      setText(elements.context, String(payload.context_count || 0));
      renderRouteDetails(payload);
      renderCitations(payload.citations || []);
      renderSummary(payload.retrieval_backend || "未知");

      if (payload.confidence) {
        const label = payload.confidence.label || "unknown";
        const score = payload.confidence.score != null ? ` ${payload.confidence.score}` : "";
        helpers.setStatus(`路由 ${payload.route || "-"} | 置信 ${label}${score}`);
      }
      const statusParts = [payload.route, payload.retrieval_backend].filter(Boolean);
      if (elements.currentStage && statusParts.length) {
        elements.currentStage.textContent = statusParts.join(" / ");
      }
    }

    function textOrFallback(value, fallback = "-") {
      if (value === null || value === undefined || value === "") {
        return fallback;
      }
      return String(value);
    }

    function formatConfidence(confidence) {
      if (!confidence) {
        return "未返回";
      }
      const label = textOrFallback(confidence.label, "unknown");
      const score = confidence.score !== null && confidence.score !== undefined
        ? ` ${confidence.score}`
        : "";
      return `${label}${score}`;
    }

    function renderRouteDetails(payload = {}) {
      if (!elements.routeDetailList) {
        return;
      }
      const citations = Array.isArray(payload.citations) ? payload.citations : [];
      const selectedSource = payload.source_filter
        || helpers.getSourceSelectValue(elements.sourceFilter)
        || AUTO_SOURCE_PLACEHOLDER;
      const details = [
        ["目标来源", selectedSource],
        ["检索问题", payload.retrieval_query || payload.normalized_query || "未返回"],
        ["置信度", formatConfidence(payload.confidence)],
        ["引用数量", `${citations.length} 条`],
      ];

      if (payload.matched_question) {
        details.push(["匹配问题", payload.matched_question]);
      }
      if (payload.fallback_reason) {
        details.push(["降级原因", payload.fallback_reason]);
      }
      if (payload.error) {
        details.push(["异常信息", payload.error]);
      }

      elements.routeDetailList.innerHTML = details.map(([label, value]) => `
        <article class="qa-detail-row">
          <span>${helpers.escapeHtml(label)}</span>
          <strong>${helpers.escapeHtml(textOrFallback(value))}</strong>
        </article>
      `).join("");
    }

    function renderCitations(citations) {
      if (!citations.length) {
        elements.citationsList.innerHTML = helpers.renderEmptyState(
          "当前没有引用证据",
          "当问题走 FAQ 或通用对话分支时，这里可能不会出现检索证据；如果走 RAG，这里会展示命中的来源片段。",
          "soft",
        );
        return;
      }

      elements.citationsList.innerHTML = "";
      for (const item of citations) {
        const node = document.createElement("article");
        node.className = "citation-item qa-evidence-card";
        node.setAttribute("data-citation-source", item.source || "unknown");
        const matchedChunks = item.matched_chunks
          ? `<span class="subtle">命中 ${helpers.escapeHtml(item.matched_chunks)}</span>`
          : "";
        const score = item.score != null
          ? `<span class="subtle">score ${helpers.escapeHtml(item.score)}</span>`
          : "";
        node.innerHTML = `
          <div class="citation-head">
            <strong>${helpers.escapeHtml(item.source || "unknown")}</strong>
            <span class="subtle">${helpers.escapeHtml(item.timestamp || "")}</span>
          </div>
          <p class="citation-excerpt">${helpers.escapeHtml(item.excerpt || "")}</p>
          <div class="session-actions">${matchedChunks}${score}</div>
        `;
        elements.citationsList.appendChild(node);
      }
    }

    function resetConversation() {
      setText(elements.route, "-");
      setText(elements.intent, "-");
      setText(elements.strategy, "-");
      setText(elements.backend, "-");
      setText(elements.context, "0");
      if (elements.routeDetailList) {
        elements.routeDetailList.innerHTML = helpers.renderEmptyState(
          "等待路由详情",
          "发起提问后，这里会展示目标来源、检索问题、置信度和引用数量。",
          "soft",
        );
      }
      if (elements.citationsList) {
        elements.citationsList.innerHTML = helpers.renderEmptyState(
          "当前没有引用证据",
          "先发起一轮提问，系统才会在这里展示命中的文档片段和分数。",
          "soft",
        );
      }
      pageState.hasAsked = false;
      updateCurrentTurn("", "等待输入");
      renderSummary();
    }

    function updateCurrentTurn(question, stage) {
      setText(elements.currentQuestion, question || "尚未提问");
      setText(elements.currentStage, stage || "等待输入");
    }

    function scrollMessages() {
      elements.messageList.scrollTop = elements.messageList.scrollHeight;
    }

    function copySessionId() {
      if (!pageState.sessionId) {
        return;
      }
      navigator.clipboard.writeText(pageState.sessionId)
        .then(() => helpers.setStatus("会话 ID 已复制。"))
        .catch(() => helpers.setStatus("复制会话 ID 失败。", true));
    }

    function renderSummary(backend) {
      if (elements.summarySession) {
        elements.summarySession.textContent = pageState.sessionId ? "已创建" : "准备中";
      }
      if (elements.summarySources) {
        elements.summarySources.textContent = String((state.sources || []).length || 0);
      }
      if (elements.summaryMode) {
        elements.summaryMode.textContent = pageState.streaming ? "流式回答" : "完整回答";
      }
      if (elements.summaryBackend) {
        elements.summaryBackend.textContent = backend || elements.backend?.textContent || "等待请求";
      }
    }

    function updateComposerTelemetry() {
      const length = (elements.queryInput?.value || "").trim().length;
      if (elements.queryInputMeter) {
        elements.queryInputMeter.textContent = `${length} 字`;
      }
      if (elements.querySourceHint) {
        const source = helpers.getSourceSelectValue(elements.sourceFilter);
        if (source) {
          elements.querySourceHint.hidden = false;
          elements.querySourceHint.textContent = `来源：${source}`;
        } else if (pageState.hasAsked || pageState.pending) {
          elements.querySourceHint.hidden = false;
          elements.querySourceHint.textContent = "未选择时将按权限范围自动检索";
        } else {
          elements.querySourceHint.hidden = true;
          elements.querySourceHint.textContent = "";
        }
      }
      if (elements.sendBtn) {
        const label = pageState.pending ? "生成中..." : "发送问题";
        elements.sendBtn.dataset.loading = String(pageState.pending);
        elements.sendBtn.setAttribute("aria-label", pageState.pending ? "正在生成回答" : "发送问题");
        const labelNode = elements.sendBtn.querySelector(".send-btn-label");
        if (labelNode) {
          labelNode.textContent = label;
        } else {
          elements.sendBtn.textContent = label;
        }
      }
    }
  },
};
