const { test, expect } = require("@playwright/test");
const path = require("node:path");

const baseURL = process.env.RAGPRO_BASE_URL || "http://127.0.0.1:8000";
const adminUser = {
  id: 1,
  username: "codex_admin",
  role: "admin",
  allowed_sources: ["ai", "java"],
  is_active: true,
};
const memberUser = {
  id: 2,
  username: "analyst",
  role: "user",
  allowed_sources: ["ai"],
  is_active: true,
};
const inactiveUser = {
  id: 3,
  username: "paused_user",
  role: "user",
  allowed_sources: ["java"],
  is_active: false,
};

async function mockAuthenticatedShell(page) {
  await page.route("**/fonts.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    });
  });
  await page.route("**/fonts.gstatic.com/**", async (route) => {
    await route.abort();
  });

  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: adminUser }),
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

test.describe("RAGPro frontend smoke", () => {
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    await mockAuthenticatedShell(page);
  });

  test.afterEach(() => {
    expect(consoleErrors).toEqual([]);
  });

  test("QA composer updates source hint and prompt meter", async ({ page }) => {
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
    await expect(page.locator("#query-input-meter")).toHaveText("14 字");

    await page.locator("#source-filter").selectOption("ai");
    await expect(page.locator("#query-source-hint")).toContainText("ai");

    await page.locator("[data-prompt-suggestion]").first().click();
    await expect(page.locator("#query-input")).not.toHaveValue("");
  });

  test("knowledge upload pipeline reflects selected file state", async ({ page }) => {
    await page.goto(`${baseURL}/knowledge`);
    await expect(page.locator('[data-upload-step="select"]')).toHaveClass(/is-active/);

    await page.locator("#upload-file-input").setInputFiles(
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
    );

    await expect(page.locator('[data-upload-step="prepare"]')).toHaveClass(/is-active/);
    await expect(page.locator("#upload-file-list")).toContainText("frontend-smoke-upload.txt");
  });

  test("knowledge upload supports custom source entry", async ({ page }) => {
    let latestUploadBody = "";
    await page.route("**/documents/upload", async (route) => {
      latestUploadBody = route.request().postData() || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          source: "policy_2026",
          replace_source: false,
          file_count: 1,
          raw_document_count: 1,
          document_chunks: 1,
          deleted_before_index: 0,
          retrieval_backend: "local",
          files: [],
        }),
      });
    });

    await page.goto(`${baseURL}/knowledge`);
    await page.locator("#upload-source").selectOption("__custom_source__");
    await page.locator("#upload-source-custom").fill("policy_2026");
    await page.locator("#upload-file-input").setInputFiles(
      path.join(process.cwd(), "tests", "fixtures", "frontend-smoke-upload.txt"),
    );
    await page.locator("#upload-submit-btn").click();

    await expect.poll(() => latestUploadBody).toContain("policy_2026");
  });

  test("knowledge sources page registers custom source", async ({ page }) => {
    let latestSourceBody = "";
    await page.route("**/sources", async (route) => {
      if (new URL(route.request().url()).pathname !== "/sources") {
        await route.continue();
        return;
      }
      if (route.request().method() === "POST") {
        latestSourceBody = route.request().postData() || "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            source: "policy_2026",
            sources: ["ai", "java", "policy_2026"],
            user: { ...adminUser, allowed_sources: ["ai", "java", "policy_2026"] },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources: ["ai", "java"] }),
      });
    });

    await page.goto(`${baseURL}/knowledge/sources`);
    await expect(page.locator("#auth-panel")).not.toBeVisible();
    await expect(page.locator(".page-utility-bar")).not.toBeVisible();
    await expect(page.locator(".module-nav-bar")).not.toBeVisible();
    await expect(page.locator(".source-management-workbench")).toBeVisible();
    await expect(page.locator(".source-filter-row")).toBeVisible();
    await expect(page.locator("#source-table")).toBeVisible();
    await expect(page.locator("#source-table")).toContainText("ai");
    await page.locator("#source-register-input").fill("policy_2026");
    await page.locator("#source-register-submit").click();

    await expect.poll(() => latestSourceBody).toContain("policy_2026");
    await expect(page.locator("#source-table")).toContainText("policy_2026");
  });

  test("dashboard overview keeps compact top and separated entry cards", async ({ page }) => {
    await page.goto(`${baseURL}/`);
    const topbar = page.locator(".topbar");
    const overviewStrip = page.locator(".overview-strip");
    const entryGrid = page.locator(".split-panel-grid-3");
    const topbarHeight = () => topbar.evaluate((element) => Math.round(element.getBoundingClientRect().height));
    const overviewGap = () => overviewStrip.evaluate((element) => parseFloat(getComputedStyle(element).columnGap));
    const entryGap = () => entryGrid.evaluate((element) => parseFloat(getComputedStyle(element).columnGap));

    await expect(topbar).toBeVisible();
    await expect(topbar).toContainText("基础库总览");
    await expect(page.locator(".topbar-copy")).toHaveCount(0);
    await expect(page.locator(".page-utility-bar")).toHaveCount(0);
    await expect(page.locator(".section-nav-bar")).toHaveCount(0);
    await expect.poll(topbarHeight).toBeLessThan(90);
    await expect(page.locator(".overview-card")).toHaveCount(3);
    await expect(page.locator(".link-panel")).toHaveCount(4);
    await expect(page.locator(".link-panel", { hasText: "数据源管理" })).toBeVisible();
    await expect.poll(overviewGap).toBeGreaterThanOrEqual(18);
    await expect.poll(entryGap).toBeGreaterThanOrEqual(20);
  });

  test("sidebar navigation mirrors kbms collapsed rail and independent groups", async ({ page }) => {
    await page.goto(`${baseURL}/knowledge/sources`);
    const shell = page.locator(".shell");
    const rail = page.locator(".rail");
    const headerToggle = page.locator("#chrome-menu-toggle");
    const dataGroup = page.locator(".side-nav-group", { hasText: "数据管理" });
    const knowledgeGroup = page.locator(".side-nav-group", { hasText: "知识库" });
    const baseGroup = page.locator(".side-nav-group", { hasText: "基础库" });
    const firstColumnWidth = () =>
      shell.evaluate((element) => parseFloat(getComputedStyle(element).gridTemplateColumns.split(" ")[0]));
    const baseGroupHeight = () =>
      baseGroup.evaluate((element) => Math.round(element.getBoundingClientRect().height));
    const dataGroupHeight = () =>
      dataGroup.evaluate((element) => Math.round(element.getBoundingClientRect().height));

    await expect(rail).toBeVisible();
    await expect(page.locator(".brand")).not.toBeVisible();
    await expect(headerToggle).toBeVisible();
    await expect(headerToggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-sidebar-toggle]")).toHaveCount(0);
    await expect.poll(firstColumnWidth).toBeGreaterThan(200);
    await expect(dataGroup).toHaveAttribute("open", "");
    await expect(knowledgeGroup).not.toHaveAttribute("open", "");
    await expect(baseGroup).not.toHaveAttribute("open", "");
    await expect.poll(baseGroupHeight).toBeLessThan(60);

    await knowledgeGroup.locator("summary").click();
    await expect(knowledgeGroup).toHaveAttribute("open", "");
    await expect(dataGroup).toHaveAttribute("open", "");
    await expect(knowledgeGroup.locator('a[href="/knowledge"]')).toBeVisible();

    await headerToggle.click();
    await expect(page.locator("body")).toHaveClass(/sidebar-collapsed/);
    await expect(headerToggle).toHaveAttribute("aria-pressed", "true");
    await expect(rail).toBeVisible();
    await expect(headerToggle).toBeVisible();
    await expect.poll(firstColumnWidth).toBeLessThan(90);
    await expect(dataGroup.locator(".side-nav-label")).not.toBeVisible();
    await expect(dataGroup.locator(".side-nav-list")).not.toBeVisible();
    await expect.poll(dataGroupHeight).toBeLessThan(60);
    await expect.poll(baseGroupHeight).toBeLessThan(60);

    await headerToggle.click();
    await expect(page.locator("body")).not.toHaveClass(/sidebar-collapsed/);
    await expect(headerToggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(firstColumnWidth).toBeGreaterThan(200);
    await expect(dataGroup.locator(".side-nav-list")).toBeVisible();
  });

  test("audit quick time presets write range filters into API request and URL", async ({ page }) => {
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
    await expect
      .poll(() => latestAuditRequestUrl)
      .toContain("start_at=");
    expect(latestAuditRequestUrl).toContain("end_at=");
    await expect
      .poll(() => page.url())
      .toContain("start_at=");

    await page.locator('[data-audit-range="clear"]').click();
    await expect(page.locator("#audit-start-at")).toHaveValue("");
    await expect(page.locator("#audit-end-at")).toHaveValue("");
  });

  test("users access page saves role, source, and active-state changes", async ({ page }) => {
    let savedPayload;
    await page.route("**/auth/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: [adminUser, memberUser] }),
      });
    });
    await page.route("**/auth/users/2/access", async (route) => {
      savedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { ...memberUser, ...savedPayload } }),
      });
    });

    await page.goto(`${baseURL}/users/access`);
    const analystCard = page.locator(".access-user-card", { hasText: "analyst" });
    await expect(analystCard).toBeVisible();

    await analystCard.locator("[data-role-select]").selectOption("admin");
    await analystCard.locator("[data-source-edit-toggle]").click();
    await analystCard.locator('[data-user-source="java"]').check();
    await analystCard.locator("[data-user-source-custom]").fill("policy_2026");
    await analystCard.locator("[data-active-toggle]").uncheck();
    await analystCard.locator("[data-save-access]").click();

    await expect
      .poll(() => savedPayload)
      .toMatchObject({
        role: "admin",
        allowed_sources: ["ai", "java", "policy_2026"],
        is_active: false,
      });
  });

  test("users overview creates accounts from the user information panel", async ({ page }) => {
    let createPayload;
    let users = [adminUser, memberUser, inactiveUser];
    let getUsersRequests = 0;
    let holdNextUsersRefresh = false;
    let releaseRefresh;
    let releaseCreate;
    const refreshMayContinue = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    const createMayContinue = new Promise((resolve) => {
      releaseCreate = resolve;
    });

    await page.route("**/auth/users", async (route) => {
      if (route.request().method() === "POST") {
        createPayload = route.request().postDataJSON();
        const created = {
          id: 4,
          username: createPayload.username,
          role: createPayload.role,
          allowed_sources: createPayload.allowed_sources,
          is_active: createPayload.is_active,
          created_at: "2026-04-22T09:30:00",
        };
        users = [adminUser, created, memberUser, inactiveUser];
        await createMayContinue;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: created }),
        });
        return;
      }
      getUsersRequests += 1;
      if (holdNextUsersRefresh) {
        holdNextUsersRefresh = false;
        await refreshMayContinue;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users }),
      });
    });

    await page.goto(`${baseURL}/users`);
    await expect(page.locator("#users-table-body")).toContainText("analyst");
    const refreshButton = page.locator("#users-overview-refresh");
    const requestsBeforeRefresh = getUsersRequests;
    holdNextUsersRefresh = true;
    await refreshButton.click();
    await expect(refreshButton).toHaveAttribute("data-loading", "true");
    await expect(refreshButton).toHaveAttribute("aria-busy", "true");
    await expect(refreshButton).toBeDisabled();
    await expect.poll(() => getUsersRequests).toBeGreaterThan(requestsBeforeRefresh);
    releaseRefresh();
    await expect(page.locator("#page-status")).toContainText("用户信息已刷新。");

    await page.locator("#users-create-toggle").click();
    await expect(page.getByRole("dialog", { name: "新增用户" })).toBeVisible();
    await expect(page.locator("#users-create-panel")).toBeVisible();
    await page.locator("#users-create-username").fill("ops_user");
    await page.locator("#users-create-password").fill("Password123");
    await page.locator('[data-users-create-source="ai"]').check();
    await page.locator("#users-create-source-custom").fill("ops_2026");
    const submitButton = page.locator("#users-create-submit");
    await submitButton.click();
    await expect(page.locator("#users-create-feedback")).toContainText("正在创建用户 ops_user");
    await expect(submitButton).toHaveAttribute("data-loading", "true");
    await expect(submitButton).toHaveAttribute("aria-busy", "true");
    await expect(submitButton).toBeDisabled();
    releaseCreate();

    await expect
      .poll(() => createPayload)
      .toMatchObject({
        username: "ops_user",
        password: "Password123",
        role: "user",
        allowed_sources: ["ai", "ops_2026"],
        is_active: true,
      });
    await expect(page.locator("#users-table-body")).toContainText("ops_user");
  });

  test("users overview surfaces account creation validation inside the modal", async ({ page }) => {
    await page.route("**/auth/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: [adminUser, memberUser] }),
      });
    });

    await page.goto(`${baseURL}/users`);
    await page.locator("#users-create-toggle").click();
    await page.locator("#users-create-username").fill("analyst");
    await page.locator("#users-create-password").fill("Password123");
    await page.locator("#users-create-source-custom").fill("bad source!");
    await page.locator("#users-create-submit").click();

    await expect(page.getByRole("dialog", { name: "新增用户" })).toBeVisible();
    await expect(page.locator("#users-create-feedback")).toHaveClass(/is-error/);
    await expect(page.locator("#users-create-feedback")).toContainText("自定义来源");
    await expect
      .poll(async () => page.evaluate(async () => {
        const response = new Response(JSON.stringify({ detail: "Username already exists." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
        const error = await window.RagProCommon.helpers.buildHttpError(response);
        return error.message;
      }))
      .toBe("用户名已存在，请换一个账号名。");
  });

  test("users security page creates accounts and triggers sensitive actions", async ({ page }) => {
    const requests = [];
    let users = [adminUser, memberUser, inactiveUser];

    await page.route("**/auth/users", async (route) => {
      if (route.request().method() === "POST") {
        const payload = route.request().postDataJSON();
        requests.push({ type: "create", payload });
        const created = {
          id: 4,
          username: payload.username,
          role: payload.role,
          allowed_sources: payload.allowed_sources,
          is_active: payload.is_active,
        };
        users = [adminUser, created, memberUser, inactiveUser];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: created }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users }),
      });
    });

    await page.route("**/auth/users/2/access", async (route) => {
      const payload = route.request().postDataJSON();
      requests.push({ type: "toggle", payload });
      users = users.map((user) => (user.id === 2 ? { ...user, is_active: payload.is_active } : user));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: users.find((user) => user.id === 2) }),
      });
    });
    await page.route("**/auth/users/2/reset-password", async (route) => {
      requests.push({ type: "reset", payload: route.request().postDataJSON() });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ password_reset: true, user: memberUser }),
      });
    });
    await page.route("**/auth/users/2", async (route) => {
      requests.push({ type: "delete" });
      users = users.filter((user) => user.id !== 2);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ deleted: true, user: memberUser }),
      });
    });

    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") {
        await dialog.accept("NewPassword123");
        return;
      }
      await dialog.accept();
    });

    await page.goto(`${baseURL}/users/security`);
    await page.locator("#security-create-username").fill("ops_user");
    await page.locator("#security-create-password").fill("Password123");
    await page.locator('[data-create-source="ai"]').check();
    await page.locator("#security-create-source-custom").fill("ops_2026");
    await page.locator("#security-create-submit").click();

    await expect
      .poll(() => requests.find((request) => request.type === "create")?.payload)
      .toMatchObject({
        username: "ops_user",
        password: "Password123",
        role: "user",
        allowed_sources: ["ai", "ops_2026"],
        is_active: true,
      });
    await expect(page.locator(".access-user-card", { hasText: "ops_user" })).toBeVisible();

    const analystCard = page.locator(".access-user-card", { hasText: "analyst" });
    await analystCard.locator("[data-toggle-active]").click();
    await expect
      .poll(() => requests.find((request) => request.type === "toggle")?.payload)
      .toMatchObject({ is_active: false });

    await page.locator(".access-user-card", { hasText: "analyst" }).locator("[data-reset-password]").click();
    await expect
      .poll(() => requests.find((request) => request.type === "reset")?.payload)
      .toMatchObject({ new_password: "NewPassword123" });

    await page.locator(".access-user-card", { hasText: "analyst" }).locator("[data-delete-user]").click();
    await expect
      .poll(() => requests.some((request) => request.type === "delete"))
      .toBe(true);
  });
});

test.describe("RAGPro auth pages", () => {
  let consoleErrors;
  let isAuthenticated;

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    isAuthenticated = false;
    await page.route("**/fonts.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/css",
        body: "",
      });
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
            ? { user: adminUser }
            : { detail: "Authentication required." },
        ),
      });
    });
    await page.route("**/sources", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sources: ["ai", "java"] }),
      });
    });
  });

  test.afterEach(() => {
    expect(
      consoleErrors.filter((message) => !message.includes("401 (Unauthorized)")),
    ).toEqual([]);
  });

  test("login form posts credentials and redirects to the dashboard", async ({ page }) => {
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

    await expect
      .poll(() => loginPayload)
      .toMatchObject({
        username: "codex_admin",
        password: "Password123",
      });
    await expect(page).toHaveURL(`${baseURL}/`);
  });

  test("register form posts credentials and redirects to the dashboard", async ({ page }) => {
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

    await expect
      .poll(() => registerPayload)
      .toMatchObject({
        username: "new_admin",
        password: "Password123",
      });
    await expect(page).toHaveURL(`${baseURL}/`);
  });
});
