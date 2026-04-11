# Frontend E2E Verification

This project uses Playwright for browser-level frontend smoke coverage. The tests are intentionally small and focused on the current native HTML/CSS/JS frontend mounted by FastAPI.

## Prerequisites

Start the API before running E2E tests:

```powershell
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

Install Node dependencies and the Chromium browser used by Playwright:

```powershell
npm install
npm run test:e2e:install
```

## Mocked Frontend Smoke

Run the default browser smoke suite:

```powershell
npm run test:e2e
```

This suite mocks authenticated API responses in the browser and does not write to the database. It currently covers:

- QA composer input meter, source hint, and prompt suggestion behavior.
- Knowledge upload pipeline state when a file is selected.
- Audit log quick time range filters writing `start_at` and `end_at`.
- User access role, source, and active-state save payloads.
- User security create, toggle, reset-password, and delete requests.
- Login and register form payloads plus successful redirect behavior.

## Live Permission And Audit Flow

The live E2E suite is opt-in because it writes to the configured MySQL database. By default it is skipped.

The recommended mode creates its own temporary admin user, then removes all `e2e_` users and matching audit records after the test:

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```

Both live modes clean up users whose names start with the current run's `e2e_` prefix, plus matching audit rows where the actor or target username has that same prefix.

This live flow verifies the full permission and audit path:

- Temporary admin login through the real `/auth/login` endpoint.
- Create a dedicated `e2e_*` user through `/users/security`.
- Update source access through `/users/access`.
- Reset password through `/users/security`.
- Delete the test user through `/users/security`.
- Query `/auth/audit-logs` and confirm `admin_create_user`, `update_user_access`, `reset_password`, and `delete_user` were recorded.

If you prefer to use an existing administrator account instead of self-provisioning, set credentials explicitly:

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_ADMIN_USERNAME = "your_admin_username"
$env:RAGPRO_E2E_ADMIN_PASSWORD = "your_admin_password"
npm run test:e2e:live
```

Use the self-provisioning mode for routine local validation. It avoids sharing real admin credentials and cleans up its own test data, including the temporary admin account.

## Python Regression

The browser suite complements the existing Python tests. Run both before larger frontend or permission changes:

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
npm run test:e2e
```

Run the live suite when you need proof that the real database-backed permission and audit chain is still working:

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```
