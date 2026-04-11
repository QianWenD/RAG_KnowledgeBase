const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const baseURL = process.env.RAGPRO_BASE_URL || "http://127.0.0.1:8000";
const liveEnabled = process.env.RAGPRO_E2E_LIVE === "1";
const selfProvisionAdmin = process.env.RAGPRO_E2E_CREATE_ADMIN === "1";
const configuredAdminUsername = process.env.RAGPRO_E2E_ADMIN_USERNAME || "";
const configuredAdminPassword = process.env.RAGPRO_E2E_ADMIN_PASSWORD || "";
const pythonExecutable = process.env.RAGPRO_E2E_PYTHON
  || path.join(process.cwd(), ".venv", "Scripts", "python.exe");
const fixtureScript = path.join(process.cwd(), "tests", "e2e", "live_auth_fixture.py");

function runFixture(command, prefix) {
  const completed = spawnSync(pythonExecutable, [fixtureScript, command, prefix], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (completed.status !== 0) {
    throw new Error(
      [
        `Fixture command failed: ${command}`,
        completed.stdout,
        completed.stderr,
      ].filter(Boolean).join("\n"),
    );
  }
  return JSON.parse(completed.stdout || "{}");
}

test.describe("RAGPro live permission and audit flow", () => {
  let runPrefix;
  let adminUsername;
  let adminPassword;

  test.skip(
    !liveEnabled || (!selfProvisionAdmin && (!configuredAdminUsername || !configuredAdminPassword)),
    "Set RAGPRO_E2E_LIVE=1 plus either RAGPRO_E2E_CREATE_ADMIN=1 or admin credentials to run live DB E2E.",
  );

  test.beforeAll(() => {
    runPrefix = `e2e_${Date.now()}_`;
    if (selfProvisionAdmin) {
      const provisioned = runFixture("provision", runPrefix);
      adminUsername = provisioned.username;
      adminPassword = provisioned.password;
      return;
    }
    adminUsername = configuredAdminUsername;
    adminPassword = configuredAdminPassword;
  });

  test.afterAll(() => {
    if (runPrefix) {
      runFixture("cleanup", runPrefix);
    }
  });

  test("admin can create, update, reset, delete, and audit a dedicated test user", async ({ page }) => {
    const testUsername = `${runPrefix}user`;
    const initialPassword = "Password123";
    const resetPassword = "NewPassword123";

    await page.goto(`${baseURL}/login`);
    await page.locator("#login-username").fill(adminUsername);
    await page.locator("#login-password").fill(adminPassword);
    await page.locator("#login-submit-btn").click();
    await expect(page).toHaveURL(`${baseURL}/`);

    await page.goto(`${baseURL}/users/security`);
    await expect(page.locator("#auth-username")).toHaveText(adminUsername);
    await page.locator("#security-create-username").fill(testUsername);
    await page.locator("#security-create-password").fill(initialPassword);
    await page.locator('[data-create-source="ai"]').check();
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().includes("/auth/users")
        && response.request().method() === "POST"
        && response.status() === 200
      )),
      page.locator("#security-create-submit").click(),
    ]);
    await expect(page.locator(".access-user-card", { hasText: testUsername })).toBeVisible();

    await page.goto(`${baseURL}/users/access`);
    const accessCard = page.locator(".access-user-card", { hasText: testUsername });
    await expect(accessCard).toBeVisible();
    await accessCard.locator('[data-user-source="java"]').check();
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().includes("/access")
        && response.request().method() === "PATCH"
        && response.status() === 200
      )),
      accessCard.locator("[data-save-access]").click(),
    ]);

    await page.goto(`${baseURL}/users/security`);
    const securityCard = page.locator(".access-user-card", { hasText: testUsername });
    await expect(securityCard).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept(resetPassword);
    });
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().includes("/reset-password")
        && response.request().method() === "POST"
        && response.status() === 200
      )),
      securityCard.locator("[data-reset-password]").click(),
    ]);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().includes("/auth/users/")
        && response.request().method() === "DELETE"
        && response.status() === 200
      )),
      securityCard.locator("[data-delete-user]").click(),
    ]);
    await expect(page.locator(".access-user-card", { hasText: testUsername })).toHaveCount(0);

    const auditPayload = await page.evaluate(async (username) => {
      const params = new URLSearchParams({ search: username, limit: "20" });
      const response = await fetch(`/auth/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Audit request failed: ${response.status}`);
      }
      return response.json();
    }, testUsername);
    const actions = auditPayload.logs.map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining([
      "admin_create_user",
      "update_user_access",
      "reset_password",
      "delete_user",
    ]));
  });
});
