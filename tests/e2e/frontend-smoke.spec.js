const { test, expect } = require("@playwright/test");
const path = require("node:path");

const baseURL = process.env.RAGPRO_BASE_URL || "http://127.0.0.1:8000";

const adminUser = {
  id: 1,
  username: "codex_admin",
  display_name: "系统管理员",
  work_no: "A0001",
  role: "admin",
  allowed_sources: ["ai", "java"],
  is_active: true,
  org_unit_id: 1,
  org_name: "权限管理中心",
  menu_role_ids: [1],
  menu_role_names: ["平台管理员"],
  created_at: "2026-04-24T09:00:00",
};

const memberUser = {
  id: 2,
  username: "analyst",
  display_name: "分析员",
  work_no: "U0002",
  role: "user",
  allowed_sources: ["ai"],
  is_active: true,
  org_unit_id: 2,
  org_name: "知识运营中心",
  menu_role_ids: [2],
  menu_role_names: ["知识运营"],
  created_at: "2026-04-24T09:30:00",
};

const inactiveUser = {
  id: 3,
  username: "paused_user",
  display_name: "停用账号",
  work_no: "U0003",
  role: "user",
  allowed_sources: ["java"],
  is_active: false,
  org_unit_id: 2,
  org_name: "知识运营中心",
  menu_role_ids: [2],
  menu_role_names: ["知识运营"],
  created_at: "2026-04-24T10:00:00",
};

const permissionBootstrap = {
  org_units: [
    {
      id: 1,
      org_name: "权限管理中心",
      children: [{ id: 2, org_name: "知识运营中心", children: [] }],
    },
  ],
  menu_roles: [
    {
      id: 1,
      role_code: "platform_admin",
      role_name: "平台管理员",
      role_desc: "拥有全部后台入口",
      menu_ids: [1, 2, 3, 4],
      menu_names: ["总览", "用户信息", "菜单角色", "菜单管理"],
      assigned_user_count: 1,
    },
    {
      id: 2,
      role_code: "knowledge_operator",
      role_name: "知识运营",
      role_desc: "负责知识运营与问答支撑",
      menu_ids: [1, 2],
      menu_names: ["总览", "用户信息"],
      assigned_user_count: 2,
    },
  ],
  menu_items: [
    {
      id: 1,
      name: "总览",
      menu_code: "dashboard",
      href: "/",
      router_name: "dashboard",
      router_path: "/",
      children: [
        {
          id: 2,
          name: "用户信息",
          menu_code: "users_overview",
          href: "/users",
          router_name: "users_overview",
          router_path: "/users",
          children: [],
        },
        {
          id: 3,
          name: "菜单角色",
          menu_code: "users_access",
          href: "/users/access",
          router_name: "users_access",
          router_path: "/users/access",
          children: [],
        },
        {
          id: 4,
          name: "菜单管理",
          menu_code: "users_security",
          href: "/users/security",
          router_name: "users_security",
          router_path: "/users/security",
          children: [],
        },
      ],
    },
  ],
  system_roles: [
    { value: "admin", label: "管理员" },
    { value: "user", label: "普通用户" },
  ],
  status_options: [
    { value: true, label: "启用" },
    { value: false, label: "停用" },
  ],
  valid_sources: ["ai", "java"],
};

async function mockAuthenticatedShell(page, { user = adminUser, sources = ["ai", "java"], bootstrap = permissionBootstrap } = {}) {
  await page.route("**/fonts.googleapis.com/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/css", body: "" });
  });
  await page.route("**/fonts.gstatic.com/**", async (route) => {
    await route.abort();
  });
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, user }),
    });
  });
  await page.route("**/sources", async (route) => {
    if (new URL(route.request().url()).pathname !== "/sources") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sources }),
    });
  });
  await page.route("**/documents/files**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ files: [], count: 0 }),
    });
  });
  await page.route("**/auth/permission-bootstrap", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bootstrap),
    });
  });
}

function captureConsoleErrors(page) {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  return consoleErrors;
}

function buildUsersPayload(users) {
  return {
    users,
    count: users.length,
    filters: {
      login: null,
      work_no: null,
      display_name: null,
      org_unit_id: null,
    },
  };
}

test.describe("RAGPro frontend smoke", () => {
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    await mockAuthenticatedShell(page);
  });

  test.afterEach(() => {
    expect(consoleErrors.filter((message) => !message.includes("409 (Conflict)"))).toEqual([]);
  });

  test("QA composer updates prompt meter and source hint", async ({ page }) => {
    await page.route("**/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "browser-smoke-session" }),
      });
    });
    await page.route("**/sessions/browser-smoke-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "browser-smoke-session", history: [], history_count: 0 }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    await expect(page.locator("#query-input-meter")).toHaveText("0 字");
    await page.locator("#query-input").fill("请总结 ai 来源的权限策略");
    await expect(page.locator("#query-input-meter")).not.toHaveText("0 字");
    await page.locator("#source-filter").selectOption("ai");
    await expect(page.locator("#query-source-hint")).toContainText("ai");
    await page.locator("[data-prompt-suggestion]").first().click();
    await expect(page.locator("#query-input")).not.toHaveValue("");
  });

  test("QA messages do not show role label chips", async ({ page }) => {
    await page.route("**/sessions", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sessions: [], session_count: 0 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "role-label-session" }),
      });
    });
    await page.route("**/sessions/role-label-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "role-label-session", history: [], history_count: 0 }),
      });
    });
    await page.route("**/query", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "role-label-session",
          answer: "Role label chips are hidden.",
          route: "general_llm",
          citations: [],
          context_count: 0,
        }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    await expect(page.locator(".message-tag")).toHaveCount(0);
    await page.locator("#stream-mode").uncheck();
    await page.locator("#query-input").fill("Hide role labels");
    await page.locator("#send-btn").click();
    await expect(page.locator(".message.assistant").last()).toContainText("Role label chips are hidden.");
    await expect(page.locator(".message-tag")).toHaveCount(0);
  });

  test("QA workbench keeps the latest answer after leaving and returning", async ({ page }) => {
    let sessionPostCount = 0;
    await page.route("**/sessions", async (route) => {
      if (route.request().method() === "POST") {
        sessionPostCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ session_id: "persisted-qa-session" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: [
            {
              session_id: "persisted-qa-session",
              last_question: "Keep this question visible",
              last_answer: "PERSISTED_ANSWER_VISIBLE",
              turn_count: 1,
              updated_at: "2026-05-20 17:45:00",
            },
          ],
        }),
      });
    });
    await page.route("**/sessions/persisted-qa-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "persisted-qa-session", history: [], history_count: 0 }),
      });
    });
    await page.route("**/query", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "persisted-qa-session",
          answer: "PERSISTED_ANSWER_VISIBLE",
          route: "rag",
          intent: "qa",
          retrieval_strategy: "hybrid",
          retrieval_backend: "local",
          context_count: 2,
          source_filter: "ai",
          retrieval_query: "Keep this question visible",
          confidence: { label: "high", score: 0.88 },
          citations: [
            {
              source: "ai",
              excerpt: "persisted citation excerpt",
              score: 0.91,
              timestamp: "2026-05-20",
            },
          ],
        }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    await page.locator("#stream-mode").uncheck();
    await page.locator("#query-input").fill("Keep this question visible");
    await page.locator("#send-btn").click();
    await expect(page.locator(".message.assistant").last()).toContainText("PERSISTED_ANSWER_VISIBLE");
    await expect(page.locator("#qa-current-question")).toContainText("Keep this question visible");

    await page.goto(`${baseURL}/knowledge`);
    await page.goto(`${baseURL}/qa`);

    await expect(page.locator("#session-id")).toContainText("persisted-qa-session");
    await expect(page.locator(".message.user")).toContainText("Keep this question visible");
    await expect(page.locator(".message.assistant").last()).toContainText("PERSISTED_ANSWER_VISIBLE");
    await expect(page.locator("#qa-current-question")).toContainText("Keep this question visible");
    await page.locator('[data-qa-context-tab="citations"]').click();
    await expect(page.locator("#citations-list")).toContainText("persisted citation excerpt");
    expect(sessionPostCount).toBe(1);
  });

  test("QA composer refreshes source options when choosing target source", async ({ page }) => {
    let sourceRequests = 0;

    await page.unroute("**/sources");
    await page.route("**/sources", async (route) => {
      if (new URL(route.request().url()).pathname !== "/sources") {
        await route.continue();
        return;
      }
      sourceRequests += 1;
      const sources = sourceRequests === 1 ? ["ai", "java"] : ["ai", "java", "med"];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources }),
      });
    });
    await page.route("**/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "qa-refresh-session" }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    await expect.poll(() => sourceRequests).toBe(1);
    await expect(page.locator('#source-filter option[value="med"]')).toHaveCount(0);

    await page.locator("#source-filter").focus();
    await expect.poll(() => sourceRequests).toBe(2);
    await expect(page.locator('#source-filter option[value="med"]')).toHaveCount(1);
  });

  test("QA composer shows a visible thinking process while waiting for an answer", async ({ page }) => {
    let releaseQuery;
    const queryCanResolve = new Promise((resolve) => {
      releaseQuery = resolve;
    });

    await page.route("**/sessions", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sessions: [], session_count: 0 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "thinking-session" }),
      });
    });
    await page.route("**/sessions/thinking-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "thinking-session", history: [], history_count: 0 }),
      });
    });
    await page.route("**/query", async (route) => {
      await queryCanResolve;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "thinking-session",
          answer: "Delayed answer is ready.",
          route: "general_llm",
          intent: "general",
          retrieval_strategy: "none",
          retrieval_backend: "none",
          context_count: 0,
          citations: [],
        }),
      });
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseURL}/qa`);
    await page.locator("#stream-mode").uncheck();
    await page.locator("#query-input").fill("Why is the answer taking time?");
    await page.locator("#send-btn").click();

    const thinkingMessage = page.locator(".message.assistant.is-thinking");
    await expect(thinkingMessage.locator(".search-progress")).toContainText("检索中");
    await expect(thinkingMessage.locator(".search-progress-dot")).toHaveCount(3);
    await expect(thinkingMessage.locator(".search-progress-dot").first()).toHaveText(".");
    const dotStyle = await thinkingMessage.locator(".search-progress-dot").first().evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        animationName: style.animationName,
        fontSize: Number.parseFloat(style.fontSize),
      };
    });
    expect(dotStyle.animationName).toBe("qa-search-dot-bounce");
    expect(dotStyle.fontSize).toBeGreaterThanOrEqual(20);
    await expect(thinkingMessage.locator(".thinking-card")).toHaveCount(0);
    await expect(page.locator("#qa-current-stage")).toContainText("正在处理");

    releaseQuery();
    await expect(page.locator(".message.assistant.is-thinking")).toHaveCount(0);
    await expect(page.locator(".message.assistant").last()).toContainText("Delayed answer is ready.");
  });

  test("QA streaming keeps the thinking process visible until the answer completes", async ({ page }) => {
    await page.route("**/sessions", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sessions: [], session_count: 0 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "stream-thinking-session" }),
      });
    });
    await page.route("**/sessions/stream-thinking-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "stream-thinking-session", history: [], history_count: 0 }),
      });
    });
    await page.addInitScript(() => {
      let streamController;
      let encoder;
      window.__resolveQaStreamEnd = null;
      window.__emitQaStreamChunk = null;
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (url === "/query" && init?.method === "POST") {
          const stream = new ReadableStream({
            start(controller) {
              streamController = controller;
              encoder = new TextEncoder();
              controller.enqueue(encoder.encode('data: {"event":"start","session_id":"stream-thinking-session","route":"rag","citations":[],"context_count":84}\n\n'));
              window.__emitQaStreamChunk = () => {
                controller.enqueue(encoder.encode('data: {"event":"chunk","token":"Partial answer is streaming."}\n\n'));
              };
              window.__resolveQaStreamEnd = () => {
                controller.enqueue(encoder.encode('data: {"event":"end","answer":"Partial answer is streaming. Final answer.","session_id":"stream-thinking-session","route":"rag","citations":[],"context_count":84}\n\n'));
                controller.close();
              };
            },
            cancel() {
              streamController = null;
            },
          });
          return Promise.resolve(new Response(stream, {
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
          }));
        }
        return originalFetch(input, init);
      };
    });

    await page.goto(`${baseURL}/qa`);
    await page.locator("#query-input").fill("Stream an answer slowly");
    await page.locator("#send-btn").click();

    await expect(page.locator(".message.assistant.is-thinking .search-progress")).toContainText("检索84篇结果");
    await page.evaluate(() => window.__emitQaStreamChunk());
    await expect(page.locator(".message.assistant.is-thinking")).toContainText("Partial answer is streaming.");
    await expect(page.locator(".message.assistant.is-thinking .search-progress")).toContainText("检索84篇结果");
    await expect(page.locator(".message.assistant.is-thinking .thinking-card")).toHaveCount(0);

    await page.evaluate(() => window.__resolveQaStreamEnd());
    await expect(page.locator(".message.assistant.is-thinking")).toHaveCount(0);
    await expect(page.locator(".message.assistant").last()).toContainText("Final answer.");
  });

  test("QA workbench exposes richer route citation and history details", async ({ page }) => {
    const longHistoryAnswer = `${"history prefix ".repeat(14)}FULL_HISTORY_DETAIL_VISIBLE with the complete answer body.`;

    await page.route("**/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "qa-context-session" }),
      });
    });
    await page.route("**/sessions/qa-context-session/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "qa-context-session",
          history: [
            {
              question: "How should med source answers be reviewed?",
              answer: longHistoryAnswer,
            },
            {
              question: "What did the previous route use?",
              answer: "The previous route used semantic retrieval.",
            },
          ],
          history_count: 2,
        }),
      });
    });
    await page.route("**/query", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "qa-context-session",
          answer: "RAG answer from med source.",
          route: "rag",
          intent: "professional",
          retrieval_strategy: "semantic",
          retrieval_backend: "local",
          context_count: 2,
          route_reason: "Matched knowledge base content.",
          strategy_reason: "Used semantic retrieval.",
          source_filter: "med",
          retrieval_query: "med policy query",
          confidence: { label: "high", score: 0.9 },
          citations: [
            {
              source: "med",
              timestamp: "2026-05-07T10:00:00",
              excerpt: "cardio excerpt full evidence",
              score: 0.91,
              matched_chunks: 3,
            },
          ],
        }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    await expect(page.locator("#session-id")).toContainText("qa-context-session");
    await page.locator("#stream-mode").uncheck();
    await page.locator("#query-input").fill("Use med source for policy context");
    await page.locator("#send-btn").click();

    await expect(page.locator("#meta-route")).toHaveText("rag");
    await expect(page.locator("#route-insights")).not.toContainText("决策备注");
    await expect(page.locator("#route-insights")).not.toContainText("路由原因");
    await expect(page.locator("#route-insights")).not.toContainText("策略原因");
    await expect(page.locator("#route-reason")).toHaveCount(0);
    await expect(page.locator("#strategy-reason")).toHaveCount(0);
    await expect(page.locator("#qa-route-detail-list")).toContainText("med");
    await expect(page.locator("#qa-route-detail-list")).toContainText("med policy query");
    await expect(page.locator("#qa-route-detail-list")).toContainText("high");

    await page.locator('[data-qa-context-tab="citations"]').click();
    await expect(page.locator("#citations-list")).toContainText("cardio excerpt full evidence");
    await expect(page.locator("#citations-list")).toContainText("score 0.91");

    await page.locator('[data-qa-context-tab="history"]').click();
    await expect(page.locator("#history-list")).toContainText("FULL_HISTORY_DETAIL_VISIBLE");
  });

  test("QA history tab restores history from a previous session without duplicating session tab", async ({ page }) => {
    const sessions = Array.from({ length: 16 }, (_, index) => ({
      session_id: index === 0 ? "previous-session" : `older-session-${index}`,
      turn_count: index + 1,
      last_question: index === 0 ? "Previous question about med" : `Older session question ${index}`,
      last_answer: `Previous answer summary ${index}`,
      updated_at: `2026-05-07 10:${30 - index}:00`,
    }));
    const restoredHistory = Array.from({ length: 16 }, (_, index) => ({
      question: index === 0 ? "Previous question about med" : `Restored question ${index}`,
      answer: index === 0
        ? "RESTORED_HISTORY_VISIBLE answer body"
        : `Restored answer ${index} ${"with enough detail ".repeat(8)}`,
    }));

    await page.route("**/sessions", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sessions,
            session_count: sessions.length,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session_id: "new-session" }),
      });
    });
    await page.route("**/sessions/*/history", async (route) => {
      const sessionId = new URL(route.request().url()).pathname.split("/")[2];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: sessionId,
          history: sessionId === "previous-session" ? restoredHistory : [],
          history_count: sessionId === "previous-session" ? restoredHistory.length : 0,
        }),
      });
    });

    await page.goto(`${baseURL}/qa`);
    const tabBarBox = await page.locator(".qa-context-tabs").boundingBox();
    const contextPanelBox = await page.locator(".qa-context-panel").boundingBox();
    expect(tabBarBox.width).toBeLessThan(contextPanelBox.width - 20);
    await page.locator('[data-qa-context-tab="session"]').click();
    await expect(page.locator("#qa-context-session #session-list")).toHaveCount(0);

    await page.locator('[data-qa-context-tab="history"]').click();
    await expect(page.locator(".qa-current-turn")).toBeHidden();
    await expect(page.locator("#history-center .qa-context-head")).toHaveCount(0);
    await expect(page.locator("#refresh-history-btn")).toHaveCount(0);
    await expect(page.locator("#refresh-sessions-btn")).toHaveCount(0);
    await expect(page.locator("#history-center")).not.toContainText("会话历史");
    await expect(page.locator("#history-center")).not.toContainText("刷新历史");
    await expect(page.locator("#history-center")).not.toContainText("历史会话");
    await expect(page.locator("#history-center")).not.toContainText("选择会话后查看记录");
    await expect(page.locator("#history-center")).not.toContainText("刷新会话");
    await expect(page.locator("#history-center #session-list")).toContainText("previous-session");
    await expect(page.locator("#history-center #session-list")).toContainText("Previous question about med");

    await page.locator('[data-session-id="previous-session"]').click();
    await expect(page.locator("#session-id")).toContainText("previous-session");
    await expect(page.locator("#history-list")).toContainText("RESTORED_HISTORY_VISIBLE");

    await expect(page.locator("#history-center #session-list")).toHaveCSS("overflow-y", "auto");
    await expect(page.locator("#history-list")).toHaveCSS("overflow-y", "auto");
    const sessionListBox = await page.locator("#history-center #session-list").boundingBox();
    const historyListBox = await page.locator("#history-list").boundingBox();
    expect(sessionListBox.height).toBeLessThanOrEqual(230);
    expect(historyListBox.height).toBeGreaterThanOrEqual(180);
    expect(historyListBox.height).toBeLessThanOrEqual(360);
    const internalScroll = await page.evaluate(() => {
      const probe = (selector) => {
        const node = document.querySelector(selector);
        if (!node) {
          return null;
        }
        node.scrollTop = 0;
        node.scrollTop = 9999;
        return {
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          scrollTop: node.scrollTop,
        };
      };
      return {
        sessions: probe("#history-center #session-list"),
        history: probe("#history-list"),
      };
    });
    expect(internalScroll.sessions.scrollHeight).toBeGreaterThan(internalScroll.sessions.clientHeight);
    expect(internalScroll.sessions.scrollTop).toBeGreaterThan(0);
    expect(internalScroll.history.scrollHeight).toBeGreaterThan(internalScroll.history.clientHeight);
    expect(internalScroll.history.scrollTop).toBeGreaterThan(0);
    const pageHeight = await page.evaluate(() => ({
      clientHeight: document.scrollingElement?.clientHeight || 0,
      scrollHeight: document.scrollingElement?.scrollHeight || 0,
    }));
    expect(pageHeight.scrollHeight).toBeLessThanOrEqual(pageHeight.clientHeight + 1);
  });

  test("knowledge upload plan reflects selected file state", async ({ page }) => {
    await page.goto(`${baseURL}/knowledge`);
    await expect(page.locator('.module-nav-bar [data-module-nav="knowledge-sources"]')).toHaveCount(0);
    await expect(page.locator('.module-nav-bar [data-module-nav="knowledge-reindex"]')).toHaveCount(0);
    await expect(page.locator('.side-nav [href="/knowledge/sources"]')).toHaveCount(1);
    await expect(page.locator("#batch-upload-panel")).toContainText("不会替换前面已经选好的文件");
    await expect(page.locator("#upload-form")).toBeHidden();
    await expect(page.locator("#batch-add-item-btn")).toHaveCount(0);
    await expect(page.locator("#batch-upload-items")).not.toContainText("任务 1");
    await expect(page.locator("#batch-upload-items")).toContainText("拖拽文件追加");
    await page.locator('[data-batch-file-input="0"]').setInputFiles(
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
    );
    await expect(page.locator("#batch-upload-items")).toContainText("frontend-smoke-upload.txt");
    const dataTransfer = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["dragged fixture"], "drag-added.txt", { type: "text/plain" }));
      return transfer;
    });
    await page.locator(".batch-file-drop").dispatchEvent("drop", { dataTransfer });
    await expect(page.locator("#batch-upload-items")).toContainText("drag-added.txt");
    await expect(page.locator("#batch-upload-count")).toHaveText("2 个文件");
    await expect(page.locator('[data-batch-file-remove="0"][data-batch-file-index="0"]')).toBeVisible();
    await page.locator('[data-batch-file-remove="0"][data-batch-file-index="0"]').click();
    await expect(page.locator("#batch-upload-items")).not.toContainText("frontend-smoke-upload.txt");
    await expect(page.locator("#batch-upload-items")).toContainText("drag-added.txt");
    await expect(page.locator("#batch-upload-count")).toHaveText("1 个文件");
  });

  test("knowledge reindex page avoids upload entry tab", async ({ page }) => {
    await page.goto(`${baseURL}/knowledge/reindex`);
    await expect(page.locator('.module-nav-bar [data-module-nav="knowledge-upload"]')).toHaveCount(0);
    await expect(page.locator("#reindex-panel")).toBeVisible();
  });

  test("knowledge upload supports custom source entry", async ({ page }) => {
    let latestUploadBody = "";
    await page.route("**/documents/batch-upload", async (route) => {
      latestUploadBody = route.request().postData() || "";
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          status: "succeeded",
          progress: 100,
          job_count: 1,
          completed_count: 1,
          failed_count: 0,
          jobs: [
            {
              source: "policy_2026",
              status: "succeeded",
              progress: 100,
              result: {
                source: "policy_2026",
                replace_source: false,
                file_count: 2,
                document_chunks: 1,
                retrieval_backend: "local",
              },
            },
          ],
        }),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await page.locator('[data-batch-source="0"]').selectOption("__custom_source__");
    await page.locator('[data-source-custom-for="batch-source-1"]').fill("policy_2026");
    await page.locator('[data-batch-file-input="0"]').setInputFiles([
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload-extra.txt"),
    ]);
    await page.locator("#batch-upload-submit-btn").click();
    await expect.poll(() => latestUploadBody).toContain('"source":"policy_2026"');
    await expect.poll(() => latestUploadBody).toContain('"file_count":2');
  });

  test("knowledge upload shows moving progress while request is pending", async ({ page }) => {
    let releaseUpload;
    const uploadCanResolve = new Promise((resolve) => {
      releaseUpload = resolve;
    });
    await page.route("**/documents/batch-upload", async (route) => {
      await uploadCanResolve;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          status: "succeeded",
          progress: 100,
          job_count: 1,
          completed_count: 1,
          failed_count: 0,
          jobs: [
            {
              source: "ai",
              status: "succeeded",
              progress: 100,
              result: {
                source: "ai",
                replace_source: false,
                file_count: 1,
                document_chunks: 1,
                retrieval_backend: "local",
              },
            },
          ],
        }),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await page.locator('[data-batch-source="0"]').selectOption("ai");
    await page.locator('[data-batch-file-input="0"]').setInputFiles(
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
    );
    await page.locator("#batch-upload-submit-btn").click();

    await expect(page.locator(".batch-upload-progress")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#batch-progress-fill")).toHaveClass(/is-moving/);
    await expect
      .poll(async () => {
        const progressText = await page.locator("#batch-progress-value").textContent();
        return Number.parseInt(progressText || "0", 10);
      })
      .toBeGreaterThan(0);

    releaseUpload();
    await expect(page.locator("#batch-progress-value")).toHaveText("100%");
    await expect(page.locator(".batch-upload-progress")).toHaveAttribute("aria-busy", "false");
  });

  test("knowledge upload polls async ingestion job until it completes", async ({ page }) => {
    let jobPolls = 0;
    await page.route("**/documents/batch-upload", async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          batch_id: "batch_1",
          status: "queued",
          progress: 5,
          message: "入库任务已创建，等待处理。",
          job_count: 1,
          completed_count: 0,
          failed_count: 0,
          poll_url: "/documents/batch-upload-jobs/batch_1",
          jobs: [
            {
              job_id: "upload_job_1",
              status: "queued",
              stage: "queued",
              progress: 5,
              source: "ai",
              file_count: 1,
              message: "文件已接收，等待入库。",
            },
          ],
        }),
      });
    });
    await page.route("**/documents/batch-upload-jobs/batch_1", async (route) => {
      jobPolls += 1;
      const body = jobPolls <= 2
        ? {
            batch_id: "batch_1",
            status: "running",
            progress: 62,
            message: "正在解析、切块并写入向量库...",
            job_count: 1,
            completed_count: 0,
            failed_count: 0,
            jobs: [
              {
                job_id: "upload_job_1",
                status: "running",
                stage: "process",
                progress: 62,
                source: "ai",
                file_count: 1,
                message: "正在解析、切块并写入向量库...",
              },
            ],
          }
        : {
            batch_id: "batch_1",
            status: "succeeded",
            progress: 100,
            message: "入库完成：1 个任务全部成功。",
            job_count: 1,
            completed_count: 1,
            failed_count: 0,
            jobs: [
              {
                job_id: "upload_job_1",
                status: "succeeded",
                stage: "done",
                progress: 100,
                source: "ai",
                file_count: 1,
                message: "文档上传并入库完成。",
                result: {
                  source: "ai",
                  replace_source: false,
                  file_count: 1,
                  raw_document_count: 1,
                  document_chunks: 7,
                  deleted_before_index: 0,
                  retrieval_backend: "local",
                  files: [],
                },
              },
            ],
          };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await page.locator('[data-batch-source="0"]').selectOption("ai");
    await page.locator('[data-batch-file-input="0"]').setInputFiles(
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
    );
    await page.locator("#batch-upload-submit-btn").click();

    await expect(page.locator("#batch-progress-label")).toContainText("正在解析");
    await expect.poll(() => jobPolls).toBeGreaterThanOrEqual(3);
    await expect(page.locator("#batch-progress-value")).toHaveText("100%");
    await expect(page.locator("#batch-upload-result")).toContainText("入库完成");
    await expect(page.locator("#upload-history-list")).toContainText("7 个切块");
    await expect(page.locator(".batch-upload-progress")).toHaveAttribute("aria-busy", "false");
  });

  test("knowledge upload submits one appended file basket", async ({ page }) => {
    let latestBatchBody = "";
    let batchPolls = 0;
    await page.route("**/documents/batch-upload", async (route) => {
      latestBatchBody = route.request().postData() || "";
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          batch_id: "batch_1",
          status: "queued",
          progress: 5,
          message: "入库任务已创建，等待处理。",
          job_count: 1,
          completed_count: 0,
          failed_count: 0,
          poll_url: "/documents/batch-upload-jobs/batch_1",
          jobs: [
            {
              job_id: "upload_job_1",
              status: "queued",
              stage: "queued",
              progress: 5,
              source: "ai",
              file_count: 2,
              message: "文件已接收，等待入库。",
            },
          ],
        }),
      });
    });
    await page.route("**/documents/batch-upload-jobs/batch_1", async (route) => {
      batchPolls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batch_id: "batch_1",
          status: "succeeded",
          progress: 100,
          message: "入库完成：1 个任务全部成功。",
          job_count: 1,
          completed_count: 1,
          failed_count: 0,
          poll_url: "/documents/batch-upload-jobs/batch_1",
          jobs: [
            {
              job_id: "upload_job_1",
              status: "succeeded",
              stage: "done",
              progress: 100,
              source: "ai",
              file_count: 2,
              message: "文档上传并入库完成。",
              result: { source: "ai", file_count: 2, document_chunks: 4, retrieval_backend: "local" },
            },
          ],
        }),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await expect(page.locator("#batch-upload-panel")).toBeVisible();
    await expect(page.locator("#batch-add-item-btn")).toHaveCount(0);
    await page.locator('[data-batch-source="0"]').selectOption("ai");
    await page.locator('[data-batch-file-input="0"]').setInputFiles([
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload-extra.txt"),
    ]);
    await page.locator("#batch-upload-submit-btn").click();

    await expect.poll(() => latestBatchBody).toContain('"source":"ai"');
    await expect.poll(() => latestBatchBody).toContain('"file_count":2');
    await expect.poll(() => batchPolls).toBeGreaterThanOrEqual(1);
    await expect(page.locator("#batch-progress-value")).toHaveText("100%");
    await expect(page.locator("#batch-progress-label")).toContainText("2 个文件");
    await expect(page.locator("#batch-upload-result")).toContainText("2 个文件");
    await expect(page.locator("#batch-job-list")).toContainText("2 个文件");
  });

  test("knowledge upload refreshes source options when choosing target source", async ({ page }) => {
    let sourceRequests = 0;

    await page.unroute("**/sources");
    await page.route("**/sources", async (route) => {
      if (new URL(route.request().url()).pathname !== "/sources") {
        await route.continue();
        return;
      }
      sourceRequests += 1;
      const sources = sourceRequests === 1 ? ["ai", "java"] : ["ai", "java", "policy_2026"];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources }),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await expect.poll(() => sourceRequests).toBe(1);
    await expect(page.locator('[data-batch-source="0"] option[value="policy_2026"]')).toHaveCount(0);

    await page.locator('[data-batch-source="0"]').focus();
    await expect.poll(() => sourceRequests).toBe(2);
    await expect(page.locator('[data-batch-source="0"] option[value="policy_2026"]')).toHaveCount(1);
  });

  test("knowledge sources page filters uploaded files by file, source, uploader and time", async ({ page }) => {
    let latestFilesUrl = "";
    await page.unroute("**/documents/files**");
    await page.route("**/documents/files**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname !== "/documents/files") {
        await route.continue();
        return;
      }
      latestFilesUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              file_id: "file_ai_1",
              source: "ai",
              filename: "产品手册.txt",
              stored_name: "manual.txt",
              content_type: "text/plain",
              size_bytes: 2048,
              document_chunks: 7,
              uploader_user_id: 1,
              uploader_username: "root",
              uploader_display_name: "管理员",
              created_at: "2026-05-28T10:00:00",
            },
          ],
          count: 1,
        }),
      });
    });

    await page.goto(`${baseURL}/knowledge/sources`);
    await expect(page.locator("#source-register-input")).toHaveCount(0);
    await expect(page.locator("#document-file-filter-form")).toBeVisible();
    const filterLayout = await page.evaluate(() => {
      const file = document.querySelector("#document-file-filter-filename").getBoundingClientRect();
      const timeGroup = document.querySelector(".document-file-time-range").getBoundingClientRect();
      const from = document.querySelector("#document-file-filter-created-from").getBoundingClientRect();
      const to = document.querySelector("#document-file-filter-created-to").getBoundingClientRect();
      const actions = document.querySelector(".document-file-filter-actions").getBoundingClientRect();
      return {
        sameRow: Math.abs(file.top - timeGroup.top) <= 4,
        sameTimeLine: Math.abs(from.top - to.top) <= 4,
        timeGroupWidth: timeGroup.width,
        fromWidth: from.width,
        toWidth: to.width,
        dateGap: to.left - from.right,
        actionGap: actions.left - to.right,
      };
    });
    expect(filterLayout.sameRow).toBeTruthy();
    expect(filterLayout.sameTimeLine).toBeTruthy();
    expect(filterLayout.timeGroupWidth).toBeGreaterThanOrEqual(430);
    expect(filterLayout.fromWidth).toBeGreaterThanOrEqual(185);
    expect(filterLayout.toWidth).toBeGreaterThanOrEqual(185);
    expect(filterLayout.dateGap).toBeGreaterThanOrEqual(10);
    expect(filterLayout.actionGap).toBeGreaterThanOrEqual(20);
    await page.locator("#document-file-filter-filename").fill("产品");
    await page.locator("#document-file-filter-source").fill("ai");
    await page.locator("#document-file-filter-uploader").fill("管理员");
    await page.locator("#document-file-filter-created-from").fill("2026-05-01T00:00");
    await page.locator("#document-file-filter-created-to").fill("2026-05-31T23:59");
    await page.locator("#document-file-filter-submit").click();

    await expect.poll(() => latestFilesUrl).toContain("filename=%E4%BA%A7%E5%93%81");
    await expect.poll(() => latestFilesUrl).toContain("source=ai");
    await expect.poll(() => latestFilesUrl).toContain("uploader=%E7%AE%A1%E7%90%86%E5%91%98");
    await expect(page.locator("#document-file-table")).toContainText("产品手册.txt");
  });

  test("knowledge sources page lists, downloads, views and deletes uploaded files", async ({ page }) => {
    let deletedFileId = "";
    let files = [
      {
        file_id: "file_ai_1",
        source: "ai",
        filename: "notes.txt",
        stored_name: "notes.txt",
        content_type: "text/plain",
        size_bytes: 2048,
        document_chunks: 7,
        uploader_user_id: 1,
        uploader_username: "root",
        uploader_display_name: "管理员",
        created_at: "2026-05-28T10:00:00",
      },
    ];

    await page.unroute("**/documents/files**");
    await page.route("**/documents/files**", async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === "DELETE") {
        deletedFileId = url.pathname.split("/").pop() || "";
        files = files.filter((item) => item.file_id !== deletedFileId);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            deleted: true,
            file: {
              file_id: deletedFileId,
              source: "ai",
              filename: "notes.txt",
              deleted_vectors: 7,
              deleted_file: true,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files, count: files.length }),
      });
    });
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto(`${baseURL}/knowledge/sources`);
    await expect(page.locator("#document-file-table")).toContainText("notes.txt");
    await expect(page.locator("#document-file-table")).toContainText("7");
    await expect(page.locator("#document-file-table")).toContainText("管理员");
    await expect(page.locator('[data-document-file-view="file_ai_1"]')).toHaveAttribute(
      "href",
      "/documents/files/file_ai_1/content",
    );
    await expect(page.locator('[data-document-file-download="file_ai_1"]')).toHaveAttribute(
      "href",
      "/documents/files/file_ai_1/download",
    );
    await page.locator('[data-document-file-delete="file_ai_1"]').click();
    await expect.poll(() => deletedFileId).toBe("file_ai_1");
    await expect(page.locator("#document-file-table")).not.toContainText("notes.txt");
  });

  test("dashboard overview keeps compact entry cards", async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await expect(page.locator(".app-header")).toBeVisible();
    await expect(page.locator(".overview-card")).toHaveCount(3);
    await expect(page.locator(".link-panel")).toHaveCount(4);
  });

  test("audit quick range presets write time filters into request and URL", async ({ page }) => {
    let latestAuditRequestUrl = "";
    await page.route("**/auth/audit-logs**", async (route) => {
      latestAuditRequestUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          logs: [],
          count: 0,
          filters: {
            limit: 80,
            action: null,
            search: null,
            sensitive_only: false,
            start_at: null,
            end_at: null,
          },
        }),
      });
    });

    await page.goto(`${baseURL}/users/audit`);
    await page.locator('[data-audit-range="7"]').click();
    await expect(page.locator("#audit-start-at")).not.toHaveValue("");
    await expect(page.locator("#audit-end-at")).not.toHaveValue("");
    await expect.poll(() => latestAuditRequestUrl).toContain("start_at=");
    await expect.poll(() => latestAuditRequestUrl).toContain("end_at=");
    await expect.poll(() => page.url()).toContain("start_at=");
    await page.locator('[data-audit-range="clear"]').click();
    await expect(page.locator("#audit-start-at")).toHaveValue("");
    await expect(page.locator("#audit-end-at")).toHaveValue("");
  });

  test("users overview refreshes and creates accounts from the modal", async ({ page }) => {
    let createPayload;
    let users = [adminUser, memberUser, inactiveUser];
    let getUsersRequests = 0;

    await page.route("**/auth/users**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      if (route.request().method() === "POST") {
        createPayload = route.request().postDataJSON();
        const created = {
          id: 4,
          username: createPayload.username,
          display_name: createPayload.display_name,
          work_no: createPayload.work_no,
          role: createPayload.role,
          allowed_sources: createPayload.allowed_sources,
          is_active: createPayload.is_active,
          org_unit_id: createPayload.org_unit_id,
          org_name: "知识运营中心",
          menu_role_ids: createPayload.menu_role_ids,
          menu_role_names: ["知识运营"],
          created_at: "2026-04-24T10:30:00",
        };
        users = [adminUser, created, memberUser, inactiveUser];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: created }),
        });
        return;
      }
      getUsersRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload(users)),
      });
    });

    await page.goto(`${baseURL}/users`);
    await expect(page.locator("#users-table-body")).toContainText("analyst");

    const requestsBeforeRefresh = getUsersRequests;
    await page.locator("#users-overview-refresh").click();
    await expect.poll(() => getUsersRequests).toBeGreaterThan(requestsBeforeRefresh);
    await expect(page.locator("#page-status")).toContainText("用户信息已刷新。");

    await page.locator("#users-create-toggle").click();
    await expect(page.locator("#user-editor-modal")).toBeVisible();
    await page.locator("#user-editor-username").fill("ops_user");
    await page.locator("#user-editor-display-name").fill("运营账号");
    await page.locator("#user-editor-work-no").fill("OPS1001");
    await page.locator("#user-editor-password").fill("Password123");
    await page.locator("#user-editor-org").selectOption("2");
    await page.locator('[data-user-menu-role="2"]').check();
    await page.locator('[data-user-source="ai"]').check();
    await page.locator("#user-editor-source-custom").fill("ops_2026");
    await page.locator("#user-editor-submit").click();

    await expect(page.locator("#user-editor-feedback")).toContainText("正在创建用户 ops_user...");
    await expect.poll(() => createPayload).toMatchObject({
      username: "ops_user",
      display_name: "运营账号",
      work_no: "OPS1001",
      password: "Password123",
      role: "user",
      org_unit_id: 2,
      menu_role_ids: [2],
      allowed_sources: ["ai", "ops_2026"],
      is_active: true,
    });
    await expect(page.locator("#users-table-body")).toContainText("ops_user");
  });

  test("opening users dialogs keeps the shell layout stable", async ({ page }) => {
    await page.route("**/auth/users**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload([adminUser, memberUser, inactiveUser])),
      });
    });

    await page.goto(`${baseURL}/users`);
    const shell = page.locator(".shell");
    const before = await shell.boundingBox();
    expect(before).not.toBeNull();

    await page.locator("#users-create-toggle").click();
    await expect(page.locator("#user-editor-modal")).toBeVisible();
    const after = await shell.boundingBox();
    expect(after).not.toBeNull();

    expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
    expect(Math.abs(after.width - before.width)).toBeLessThan(0.5);
  });

  test("new user dialog shows inline format hints inside inputs", async ({ page }) => {
    await page.route("**/auth/users**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload([adminUser, memberUser, inactiveUser])),
      });
    });

    await page.goto(`${baseURL}/users`);
    await page.locator("#users-create-toggle").click();
    await expect(page.locator("#user-editor-modal")).toBeVisible();
    await expect(page.locator("#user-editor-username")).toHaveAttribute("placeholder", /3-64/);
    await expect(page.locator("#user-editor-display-name")).toHaveAttribute("placeholder", /1-64/);
    await expect(page.locator("#user-editor-work-no")).toHaveAttribute("placeholder", /1-64/);
    await expect(page.locator("#user-editor-password")).toHaveAttribute("placeholder", /至少 8 位/);
    await expect(page.locator("#user-editor-source-custom")).toHaveAttribute("placeholder", /1-50/);
  });

  test("new user dialog refreshes source options before opening", async ({ page }) => {
    let sourceRequests = 0;

    await page.unroute("**/sources");
    await page.route("**/sources", async (route) => {
      if (new URL(route.request().url()).pathname !== "/sources") {
        await route.continue();
        return;
      }
      sourceRequests += 1;
      const sources = sourceRequests === 1 ? ["ai", "java"] : ["ai", "java", "policy_2026"];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources }),
      });
    });
    await page.route("**/auth/users**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload([adminUser, memberUser, inactiveUser])),
      });
    });

    await page.goto(`${baseURL}/users`);
    await expect.poll(() => sourceRequests).toBe(1);

    await page.locator("#users-create-toggle").click();
    await expect(page.locator("#user-editor-modal")).toBeVisible();
    await expect.poll(() => sourceRequests).toBe(2);
    await expect(page.locator('[data-user-source="policy_2026"]')).toBeVisible();
  });

  test("access and security dialogs keep the shell layout stable", async ({ page }) => {
    const roles = [...permissionBootstrap.menu_roles];
    const menuItems = [
      {
        id: 1,
        parent_id: null,
        menu_code: "dashboard",
        name: "总览",
        href: "/",
        router_name: "dashboard",
        router_path: "/",
        is_visible: true,
        sort_order: 10,
      },
      {
        id: 2,
        parent_id: 1,
        menu_code: "users_overview",
        name: "用户信息",
        href: "/users",
        router_name: "users_overview",
        router_path: "/users",
        is_visible: true,
        sort_order: 20,
      },
    ];

    await page.route("**/auth/menu-roles**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/menu-roles") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: roles }),
      });
    });
    await page.route("**/auth/menu-items**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/menu-items") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: menuItems }),
      });
    });

    await page.goto(`${baseURL}/users/access`);
    const accessShell = page.locator(".shell");
    const accessBefore = await accessShell.boundingBox();
    expect(accessBefore).not.toBeNull();
    await page.locator("#access-create-btn").click();
    await expect(page.locator("#role-editor-modal")).toBeVisible();
    const accessAfter = await accessShell.boundingBox();
    expect(accessAfter).not.toBeNull();
    expect(Math.abs(accessAfter.x - accessBefore.x)).toBeLessThan(0.5);
    expect(Math.abs(accessAfter.width - accessBefore.width)).toBeLessThan(0.5);

    await page.goto(`${baseURL}/users/security`);
    const securityShell = page.locator(".shell");
    const securityBefore = await securityShell.boundingBox();
    expect(securityBefore).not.toBeNull();
    await page.locator("#security-create-btn").click();
    await expect(page.locator("#menu-editor-modal")).toBeVisible();
    const securityAfter = await securityShell.boundingBox();
    expect(securityAfter).not.toBeNull();
    expect(Math.abs(securityAfter.x - securityBefore.x)).toBeLessThan(0.5);
    expect(Math.abs(securityAfter.width - securityBefore.width)).toBeLessThan(0.5);
  });

  test("users overview shows Chinese validation and localized backend errors", async ({ page }) => {
    let createRequests = 0;

    await page.route("**/auth/users**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      if (route.request().method() === "POST") {
        createRequests += 1;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Username already exists." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload([adminUser, memberUser])),
      });
    });

    await page.goto(`${baseURL}/users`);
    await page.locator("#users-create-toggle").click();
    await page.locator("#user-editor-username").fill("analyst");
    await page.locator("#user-editor-display-name").fill("分析员");
    await page.locator("#user-editor-work-no").fill("A1002");
    await page.locator("#user-editor-password").fill("short");
    await page.locator("#user-editor-submit").click();
    await expect(page.locator("#user-editor-feedback")).toContainText("提交内容不符合要求，请检查账号、密码、角色、菜单和来源配置。");
    await expect(page.locator("#user-editor-feedback")).toContainText("初始密码至少需要 8 位。");
    expect(createRequests).toBe(0);

    await page.locator("#user-editor-password").fill("Password123");
    await page.locator("#user-editor-source-custom").fill("bad source!");
    await page.locator("#user-editor-submit").click();
    await expect(page.locator("#user-editor-feedback")).toContainText("提交内容不符合要求，请检查账号、密码、角色、菜单和来源配置。");
    await expect(page.locator("#user-editor-feedback")).toContainText("自定义来源只能使用 1-50 位字母、数字、下划线或短横线。");
    expect(createRequests).toBe(0);

    await page.locator("#user-editor-source-custom").fill("policy_2026");
    await page.locator("#user-editor-submit").click();
    await expect(page.locator("#user-editor-feedback")).toContainText("用户名已存在，请换一个账号名。");
    expect(createRequests).toBe(1);
  });

  test("users overview assigns menu roles from a dedicated access modal", async ({ page }) => {
    let accessPayload;
    let users = [adminUser, memberUser, inactiveUser];

    await page.route("**/auth/users**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/auth/users/2/access" && request.method() === "PATCH") {
        accessPayload = request.postDataJSON();
        const matchedRoleNames = permissionBootstrap.menu_roles
          .filter((item) => accessPayload.menu_role_ids.includes(item.id))
          .map((item) => item.role_name);
        const updated = {
          ...memberUser,
          role: accessPayload.role,
          is_active: accessPayload.is_active,
          allowed_sources: accessPayload.allowed_sources,
          menu_role_ids: accessPayload.menu_role_ids,
          menu_role_names: matchedRoleNames,
        };
        users = users.map((item) => (item.id === memberUser.id ? updated : item));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: updated }),
        });
        return;
      }
      if (pathname !== "/auth/users") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildUsersPayload(users)),
      });
    });

    await page.goto(`${baseURL}/users`);
    await page.locator('[data-user-action="access"][data-user-id="2"]').click();
    await expect(page.locator("#user-access-modal")).toBeVisible();
    await expect(page.locator("#user-access-user")).toContainText("分析员");
    await expect(page.locator("#user-access-org")).toContainText("知识运营中心");
    await page.locator("#user-access-role").selectOption("admin");
    await page.locator("#user-access-status").selectOption("disabled");
    await page.locator('[data-user-access-menu-role="2"]').uncheck();
    await page.locator('[data-user-access-menu-role="1"]').check();
    await page.locator('[data-user-access-source="ai"]').uncheck();
    await page.locator('[data-user-access-source="java"]').check();
    await page.locator("#user-access-source-custom").fill("policy_2026");
    await expect(page.locator("#user-access-role-count")).toContainText("1 个菜单角色");
    await expect(page.locator("#user-access-source-count")).toContainText("2 个来源");
    await page.locator("#user-access-submit").click();

    await expect.poll(() => accessPayload).toMatchObject({
      role: "admin",
      is_active: false,
      menu_role_ids: [1],
      allowed_sources: ["java", "policy_2026"],
    });
    await expect(page.locator("#users-table-body")).toContainText("平台管理员");
    await expect(page.locator("#users-table-body")).toContainText("policy_2026");
  });

  test("users org page opens a stable organization editor modal", async ({ page }) => {
    const orgUnits = [
      {
        id: 1,
        parent_id: null,
        org_code: "auth_center",
        org_name: "权限管理中心",
        org_type: "department",
        org_desc: "统一维护权限配置",
        sort_order: 10,
        assigned_user_count: 2,
      },
      {
        id: 2,
        parent_id: 1,
        org_code: "knowledge_center",
        org_name: "知识运营中心",
        org_type: "department",
        org_desc: "负责知识运营",
        sort_order: 20,
        assigned_user_count: 3,
      },
    ];
    const orgTree = [
      {
        ...orgUnits[0],
        children: [{ ...orgUnits[1], children: [] }],
      },
    ];

    await page.route("**/auth/org-units**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/auth/org-units/tree") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: orgTree }),
        });
        return;
      }
      if (pathname !== "/auth/org-units") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: orgUnits }),
      });
    });

    await page.goto(`${baseURL}/users/org`);
    await expect(page.locator("#org-unit-list")).toContainText("知识运营中心");
    await page.locator("#org-create-btn").click();
    await expect(page.locator("#org-editor-modal")).toBeVisible();
    await expect(page.locator("#org-editor-code")).toBeVisible();
    await expect(page.locator("#org-editor-name")).toBeVisible();
    await page.locator("#org-editor-name").fill("知识支持组");
    await page.locator("#org-editor-parent").selectOption("1");
    await page.locator("#org-editor-type").fill("division");
    await page.locator("#org-editor-sort").fill("80");
    await expect(page.locator("#org-editor-parent")).toHaveValue("1");
    await expect(page.locator("#org-editor-type")).toHaveValue("division");
    await expect(page.locator("#org-editor-sort")).toHaveValue("80");
    await page.locator("#org-editor-cancel").click();

    await page.locator('[data-org-action="edit"][data-org-id="2"]').click();
    await expect(page.locator("#org-editor-title")).toContainText("编辑机构");
    await expect(page.locator("#org-editor-name")).toHaveValue("知识运营中心");
    await expect(page.locator("#org-editor-parent")).toHaveValue("1");
  });

  test("users access page updates menu role permissions", async ({ page }) => {
    let savedPayload;
    let roles = [...permissionBootstrap.menu_roles];

    await page.route("**/auth/menu-roles**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/auth/menu-roles" && route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: roles }),
        });
        return;
      }
      if (pathname === "/auth/menu-roles/2" && route.request().method() === "PATCH") {
        savedPayload = route.request().postDataJSON();
        const updated = {
          id: 2,
          ...savedPayload,
          menu_codes: ["dashboard", "users_overview", "users_access"],
          menu_names: ["总览", "用户信息", "菜单角色"],
          assigned_user_count: 2,
          created_at: "2026-04-24T11:00:00",
          updated_at: "2026-04-24T11:10:00",
        };
        roles = roles.map((item) => (item.id === 2 ? updated : item));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: updated }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${baseURL}/users/access`);
    await expect(page.locator("#access-role-list")).toContainText("知识运营");
    await page.locator('[data-role-action="edit"][data-role-id="2"]').click();
    await expect(page.locator("#role-editor-modal")).toBeVisible();
    await expect(page.locator("#role-editor-preview-name")).toContainText("知识运营");
    await expect(page.locator("#role-editor-preview-users")).toContainText("2 个账号");
    await page.locator("#role-editor-name").fill("知识运营升级版");
    await page.locator("#role-editor-code").fill("knowledge_operator");
    await expect(page.locator("#role-editor-preview-code")).toContainText("knowledge_operator");
    await page.locator("#role-editor-next").click();
    await expect(page.locator('[data-role-step="1"]')).toHaveClass(/is-active/);
    await page.locator('[data-menu-id="3"]').check();
    await expect(page.locator("#role-editor-preview-count")).toContainText("3 项菜单");
    await expect(page.locator("#role-editor-selection-preview")).toContainText("总览");
    await page.locator("#role-editor-submit").click();

    await expect.poll(() => savedPayload).toMatchObject({
      role_name: "知识运营升级版",
      role_code: "knowledge_operator",
    });
    expect(savedPayload.menu_ids).toContain(3);
    await expect(page.locator("#access-role-list")).toContainText("知识运营升级版");
  });

  test("users security page creates root menus and opens contextual edit modal", async ({ page }) => {
    const requests = [];
    let menuItems = [
      {
        id: 1,
        parent_id: null,
        menu_code: "dashboard",
        name: "总览",
        href: "/",
        router_name: "dashboard",
        router_path: "/",
        is_visible: true,
        sort_order: 10,
      },
      {
        id: 2,
        parent_id: 1,
        menu_code: "users_overview",
        name: "用户信息",
        href: "/users",
        router_name: "users_overview",
        router_path: "/users",
        is_visible: true,
        sort_order: 20,
      },
    ];

    await page.route("**/auth/menu-items**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/auth/menu-items" && route.request().method() === "POST") {
        const payload = route.request().postDataJSON();
        requests.push(payload);
        const created = { id: 9, ...payload };
        menuItems = [...menuItems, created];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: created }),
        });
        return;
      }
      if (pathname === "/auth/menu-items" && route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: menuItems }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${baseURL}/users/security`);
    await page.locator("#security-create-btn").click();
    await expect(page.locator("#menu-editor-modal")).toBeVisible();
    await expect(page.locator("#menu-editor-preview-parent")).toContainText("根节点");
    await expect(page.locator("#menu-editor-preview-level")).toContainText("根导航");
    await page.locator("#menu-editor-name").fill("运营中心");
    await page.locator("#menu-editor-code").fill("ops_center");
    await page.locator("#menu-editor-router-name").fill("ops-center");
    await page.locator("#menu-editor-router-path").fill("/ops");
    await page.locator("#menu-editor-href").fill("/ops");
    await page.locator("#menu-editor-sort").fill("50");
    await expect(page.locator("#menu-editor-preview-route")).toContainText("ops-center");
    await page.locator("#menu-editor-submit").click();

    await expect.poll(() => requests[0]).toMatchObject({
      name: "运营中心",
      menu_code: "ops_center",
      parent_id: 0,
      router_name: "ops-center",
      router_path: "/ops",
      href: "/ops",
      sort_order: 50,
    });
    await expect(page.locator("#security-menu-list")).toContainText("运营中心");
    await page.locator('[data-menu-action="edit"][data-menu-id="2"]').click();
    await expect(page.locator("#menu-editor-title")).toContainText("编辑菜单");
    await expect(page.locator("#menu-editor-preview-parent")).toContainText("挂载 总览");
    await expect(page.locator("#menu-editor-preview-level")).toContainText("2 级菜单");
    await expect(page.locator("#menu-editor-preview-visibility")).toContainText("显示");
  });
});

test.describe("RAGPro auth pages", () => {
  let consoleErrors;
  let isAuthenticated;

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    isAuthenticated = false;
    await page.route("**/fonts.googleapis.com/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/css", body: "" });
    });
    await page.route("**/fonts.gstatic.com/**", async (route) => {
      await route.abort();
    });
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: isAuthenticated ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          isAuthenticated
            ? { authenticated: true, user: adminUser }
            : { detail: "Authentication required." },
        ),
      });
    });
    await page.route("**/sources", async (route) => {
      if (new URL(route.request().url()).pathname !== "/sources") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources: ["ai", "java"] }),
      });
    });
  });

  test.afterEach(() => {
    expect(consoleErrors.filter((message) => !message.includes("401"))).toEqual([]);
  });

  test("login form posts credentials and redirects to dashboard", async ({ page }) => {
    let loginPayload;
    await page.route("**/auth/login", async (route) => {
      loginPayload = route.request().postDataJSON();
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: adminUser }),
      });
    });

    await page.goto(`${baseURL}/login`);
    await page.locator("#login-username").fill("codex_admin");
    await page.locator("#login-password").fill("Password123");
    await page.locator("#login-submit-btn").click();

    await expect.poll(() => loginPayload).toMatchObject({
      username: "codex_admin",
      password: "Password123",
    });
    await expect(page).toHaveURL(`${baseURL}/`);
  });

  test("register form posts credentials and redirects to dashboard", async ({ page }) => {
    let registerPayload;
    await page.route("**/auth/register", async (route) => {
      registerPayload = route.request().postDataJSON();
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { ...adminUser, username: "new_admin" } }),
      });
    });

    await page.goto(`${baseURL}/register`);
    await page.locator("#register-username").fill("new_admin");
    await page.locator("#register-password").fill("Password123");
    await page.locator("#register-submit-btn").click();

    await expect.poll(() => registerPayload).toMatchObject({
      username: "new_admin",
      password: "Password123",
    });
    await expect(page).toHaveURL(`${baseURL}/`);
  });
});
