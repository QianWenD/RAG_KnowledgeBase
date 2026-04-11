from __future__ import annotations

import shutil
import subprocess
import sys
import unittest
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:  # pragma: no cover - environment-dependent
    TestClient = None

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "apps" / "web"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if TestClient is not None:
    from apps.api.main import app
else:  # pragma: no cover - environment-dependent
    app = None


PAGE_ROUTES = (
    ("/", "index.html", 'data-page="dashboard"', "/static/dashboard.js", True),
    ("/qa", "qa.html", 'data-page="qa"', "/static/qa.js", True),
    ("/knowledge", "knowledge.html", 'data-page="knowledge"', "/static/knowledge.js", True),
    ("/knowledge/reindex", "knowledge_reindex.html", 'data-page-view="knowledge-reindex"', "/static/knowledge_reindex.js", True),
    ("/knowledge/sources", "knowledge_sources.html", 'data-page-view="knowledge-sources"', "/static/knowledge_sources.js", True),
    ("/users", "users.html", 'data-page-view="users-overview"', "/static/users.js", True),
    ("/users/access", "users_access.html", 'data-page-view="users-access"', "/static/users_access.js", True),
    ("/users/security", "users_security.html", 'data-page-view="users-security"', "/static/users_security.js", True),
    ("/users/audit", "users_audit.html", 'data-page-view="users-audit"', "/static/users_audit.js", True),
    ("/login", "login.html", 'data-auth-mode="login"', "/static/auth.js", False),
    ("/register", "register.html", 'data-auth-mode="register"', "/static/auth.js", False),
)


@unittest.skipIf(TestClient is None, "fastapi is not installed in this environment")
class FrontendSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_frontend_pages_render_with_expected_shell_assets(self) -> None:
        for route, filename, page_marker, page_script, needs_common_script in PAGE_ROUTES:
            with self.subTest(route=route):
                response = self.client.get(route)

                self.assertEqual(response.status_code, 200)
                self.assertIn(page_marker, response.text)
                self.assertIn('href="/static/styles.css"', response.text)
                if needs_common_script:
                    self.assertIn('src="/static/common.js"', response.text)
                self.assertIn(page_script, response.text)
                self.assertTrue((WEB_ROOT / filename).exists())

    def test_static_assets_are_served_for_frontend_pages(self) -> None:
        assets = {"styles.css", "common.js"}
        assets.update(script.removeprefix("/static/") for *_, script, _ in PAGE_ROUTES)

        for asset in sorted(assets):
            with self.subTest(asset=asset):
                response = self.client.get(f"/static/{asset}")

                self.assertEqual(response.status_code, 200)
                self.assertGreater(len(response.content), 0)

    def test_frontend_javascript_passes_syntax_check(self) -> None:
        node = shutil.which("node")
        if node is None:
            self.skipTest("node is not installed; skipping JavaScript syntax smoke test")

        for script_path in sorted(WEB_ROOT.glob("*.js")):
            with self.subTest(script=script_path.name):
                completed = subprocess.run(
                    [node, "--check", str(script_path)],
                    cwd=PROJECT_ROOT,
                    capture_output=True,
                    text=True,
                    timeout=15,
                    check=False,
                )

                output = "\n".join(part for part in (completed.stdout, completed.stderr) if part)
                self.assertEqual(completed.returncode, 0, output)

    def test_frontend_text_assets_do_not_contain_replacement_characters(self) -> None:
        for asset_path in sorted(WEB_ROOT.glob("*")):
            if asset_path.suffix not in {".html", ".css", ".js"}:
                continue
            with self.subTest(asset=asset_path.name):
                content = asset_path.read_text(encoding="utf-8")

                self.assertNotIn("\ufffd", content)


if __name__ == "__main__":
    unittest.main()
