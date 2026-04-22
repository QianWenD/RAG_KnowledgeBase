window.RagProPage = {
  async init({ state, helpers }) {
    const pageState = {
      sessionId: "",
      history: [],
      pending: false,
      streaming: true,
      hasAsked: false,
    };

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
      routeReason: document.getElementById("route-reason"),
      strategyReason: document.getElementById("strategy-reason"),
      sourceFilter: document.getElementById("source-filter"),
      queryInput: document.getElementById("query-input"),
      queryInputMeter: document.getElementById("query-input-meter"),
      querySourceHint: document.getElementById("query-source-hint"),
      sendBtn: document.getElementById("send-btn"),
      streamMode: document.getElementById("stream-mode"),
      newSessionBtn: document.getElementById("new-session-btn"),
      copySessionBtn: document.getElementById("copy-session-btn"),
      clearHistoryBtn: document.getElementById("clear-history-btn"),
      refreshHistoryBtn: document.getElementById("refresh-history-btn"),
      messageTemplate: document.getElementById("message-template"),
      summarySession: document.getElementById("qa-summary-session"),
      summarySources: document.getElementById("qa-summary-sources"),
      summaryMode: document.getElementById("qa-summary-mode"),
      summaryBackend: document.getElementById("qa-summary-backend"),
      suggestionButtons: Array.from(document.querySelectorAll("[data-prompt-suggestion]")),
      contextTabs: Array.from(document.querySelectorAll("[data-qa-context-tab]")),
      contextPanes: Array.from(document.querySelectorAll("[data-qa-context-pane]")),
      currentQuestion: document.getElementById("qa-current-question"),
      currentStage: document.getElementById("qa-current-stage"),
    };

    bindEvents();
    helpers.populateSourceSelect(
      elements.sourceFilter,
      state.sources || [],
      (state.sources || []).length > 1 ? "选择" : "全部",
    );
    if ((state.sources || []).length === 1) {
      elements.sourceFilter.value = state.sources[0];
    }
    renderSummary();
    updateComposerTelemetry();
    resetConversation();
    await createSession();
    helpers.setStatus("问答页已就绪，可以直接提问。");

    function bindEvents() {
      elements.sendBtn?.addEventListener("click", sendQuery);
      elements.newSessionBtn?.addEventListener("click", createSession);
      elements.copySessionBtn?.addEventListener("click", copySessionId);
      elements.clearHistoryBtn?.addEventListener("click", clearHistory);
      elements.refreshHistoryBtn?.addEventListener("click", loadHistory);
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
      } catch (error) {
        helpers.setStatus(`创建会话失败：${error.message}`, true);
      }
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
      updateCurrentTurn(query, pageState.streaming ? "流式生成中" : "请求中");
      addMessage("user", query);
      elements.queryInput.value = "";
      updateComposerTelemetry();
      helpers.setStatus(pageState.streaming ? "正在流式生成答案..." : "正在请求答案...");

      try {
        if (pageState.streaming) {
          await sendStreamingQuery(query);
        } else {
          await sendNormalQuery(query);
        }
        updateCurrentTurn(query, "已完成");
        await loadHistory();
      } catch (error) {
        addMessage("system", `请求失败：${error.message}`);
        updateCurrentTurn(query, "请求失败");
        helpers.setStatus("当前请求失败，请稍后重试。", true);
      } finally {
        pageState.pending = false;
        elements.sendBtn.disabled = false;
        updateComposerTelemetry();
      }
    }

    async function sendNormalQuery(query) {
      const payload = await helpers.apiJson("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(query, false)),
      });
      pageState.sessionId = payload.session_id || pageState.sessionId;
      elements.sessionId.textContent = pageState.sessionId || "尚未创建";
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
        throw await helpers.buildHttpError(response);
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
            pageState.sessionId = payload.session_id || pageState.sessionId;
            elements.sessionId.textContent = pageState.sessionId || "尚未创建";
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
      if (!pageState.history.length) {
        elements.historyList.innerHTML = helpers.renderEmptyState(
          "还没有会话历史",
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
      setText(elements.routeReason, payload.route_reason || "等待请求");
      setText(elements.strategyReason, payload.strategy_reason || "等待请求");
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
        node.className = "citation-item";
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
      setText(elements.routeReason, "等待请求");
      setText(elements.strategyReason, "等待请求");
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
          elements.querySourceHint.textContent = "自动收口";
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
