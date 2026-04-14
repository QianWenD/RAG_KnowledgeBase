from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:  # pragma: no cover - environment-dependent
    TestClient = None

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if TestClient is not None:
    from apps.api.main import app, settings
    from ragpro.auth.models import AuthenticatedUser
else:  # pragma: no cover - environment-dependent
    app = None
    settings = None
    AuthenticatedUser = None


@unittest.skipIf(TestClient is None, "fastapi is not installed in this environment")
class APISurfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_root_returns_dashboard_page(self) -> None:
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="dashboard"', response.text)
        self.assertIn('href="/qa"', response.text)
        self.assertIn('href="/knowledge"', response.text)
        self.assertIn('id="auth-panel"', response.text)
        self.assertIn('id="page-breadcrumb-current"', response.text)
        self.assertIn('data-section-link', response.text)
        self.assertIn('class="page-utility-bar"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)
        self.assertNotIn('id="access-create-form"', response.text)

    def test_qa_page_returns_dedicated_workspace(self) -> None:
        response = self.client.get("/qa")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="qa"', response.text)
        self.assertIn('id="query-input"', response.text)
        self.assertIn('id="message-template"', response.text)
        self.assertIn('id="history-center"', response.text)
        self.assertIn('id="page-breadcrumb-current"', response.text)
        self.assertIn('href="#route-insights"', response.text)
        self.assertIn('id="qa-summary-session"', response.text)
        self.assertIn('id="qa-prompt-suggestions"', response.text)
        self.assertIn('id="query-input-meter"', response.text)
        self.assertIn('id="query-source-hint"', response.text)
        self.assertNotIn('id="upload-form"', response.text)
        self.assertNotIn('id="access-create-form"', response.text)

    def test_knowledge_page_returns_dedicated_upload_workspace(self) -> None:
        response = self.client.get("/knowledge")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="knowledge"', response.text)
        self.assertIn('data-page-view="knowledge-upload"', response.text)
        self.assertIn('id="upload-form"', response.text)
        self.assertIn('id="knowledge-access-note"', response.text)
        self.assertIn('href="#upload-ledger"', response.text)
        self.assertIn('id="knowledge-summary-history-count"', response.text)
        self.assertIn('class="upload-pipeline"', response.text)
        self.assertIn('data-upload-step="upload"', response.text)
        self.assertIn('href="/knowledge/reindex"', response.text)
        self.assertIn('href="/knowledge/sources"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="access-create-form"', response.text)

    def test_knowledge_reindex_page_returns_dedicated_reindex_workspace(self) -> None:
        response = self.client.get("/knowledge/reindex")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="knowledge"', response.text)
        self.assertIn('data-page-view="knowledge-reindex"', response.text)
        self.assertIn('id="reindex-form"', response.text)
        self.assertIn('id="reindex-history-list"', response.text)
        self.assertIn('href="/knowledge/sources"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_knowledge_sources_page_returns_dedicated_sources_workspace(self) -> None:
        response = self.client.get("/knowledge/sources")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="knowledge"', response.text)
        self.assertIn('data-page-view="knowledge-sources"', response.text)
        self.assertIn('id="source-card-grid"', response.text)
        self.assertIn('href="/knowledge/reindex"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_users_page_returns_user_overview_workspace(self) -> None:
        response = self.client.get("/users")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="users"', response.text)
        self.assertIn('data-page-view="users-overview"', response.text)
        self.assertIn('id="users-overview-grid"', response.text)
        self.assertIn('id="users-overview-note"', response.text)
        self.assertIn('href="/users/access"', response.text)
        self.assertIn('href="/users/security"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertIn('href="/users/audit"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_users_access_page_returns_dedicated_access_workspace(self) -> None:
        response = self.client.get("/users/access")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="users"', response.text)
        self.assertIn('data-page-view="users-access"', response.text)
        self.assertIn('id="access-user-list"', response.text)
        self.assertIn('id="users-access-note"', response.text)
        self.assertIn('href="/users/security"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_users_security_page_returns_dedicated_security_workspace(self) -> None:
        response = self.client.get("/users/security")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="users"', response.text)
        self.assertIn('data-page-view="users-security"', response.text)
        self.assertIn('id="security-create-form"', response.text)
        self.assertIn('id="security-user-list"', response.text)
        self.assertIn('href="/users/access"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_users_audit_page_returns_dedicated_audit_workspace(self) -> None:
        response = self.client.get("/users/audit")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-page="users"', response.text)
        self.assertIn('data-page-view="users-audit"', response.text)
        self.assertIn('id="audit-log-list"', response.text)
        self.assertIn('id="users-audit-note"', response.text)
        self.assertIn('id="audit-filter-form"', response.text)
        self.assertIn('id="audit-action-filter"', response.text)
        self.assertIn('id="audit-search-input"', response.text)
        self.assertIn('id="audit-sensitive-only"', response.text)
        self.assertIn('id="audit-start-at"', response.text)
        self.assertIn('id="audit-end-at"', response.text)
        self.assertIn('data-audit-range="today"', response.text)
        self.assertIn('data-audit-range="30"', response.text)
        self.assertIn('href="/users/security"', response.text)
        self.assertNotIn('id="query-input"', response.text)
        self.assertNotIn('id="upload-form"', response.text)

    def test_login_page_returns_separate_auth_screen(self) -> None:
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-auth-mode="login"', response.text)
        self.assertIn('id="login-form"', response.text)
        self.assertIn('id="login-submit-btn"', response.text)
        self.assertIn('href="/register"', response.text)
        self.assertNotIn('id="upload-form"', response.text)
        self.assertNotIn('id="access-create-form"', response.text)

    def test_register_page_returns_separate_auth_screen(self) -> None:
        response = self.client.get("/register")
        self.assertEqual(response.status_code, 200)
        self.assertIn('data-auth-mode="register"', response.text)
        self.assertIn('id="register-form"', response.text)
        self.assertIn('id="register-submit-btn"', response.text)
        self.assertIn('href="/login"', response.text)
        self.assertNotIn('id="upload-form"', response.text)
        self.assertNotIn('id="access-create-form"', response.text)

    def test_static_common_script_includes_auth_shell_logic(self) -> None:
        response = self.client.get("/static/common.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/me", response.text)
        self.assertIn("/auth/logout", response.text)
        self.assertIn("/auth/change-password", response.text)
        self.assertIn('window.location.replace("/login")', response.text)

    def test_static_qa_script_includes_query_logic(self) -> None:
        response = self.client.get("/static/qa.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/query", response.text)
        self.assertIn("/sessions", response.text)
        self.assertIn("TextDecoder", response.text)
        self.assertIn("updateComposerTelemetry", response.text)

    def test_static_knowledge_script_includes_upload_logic(self) -> None:
        response = self.client.get("/static/knowledge.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("XMLHttpRequest", response.text)
        self.assertIn("localStorage", response.text)
        self.assertIn("/documents/upload", response.text)
        self.assertIn("setUploadStage", response.text)

    def test_static_knowledge_reindex_script_includes_reindex_logic(self) -> None:
        response = self.client.get("/static/knowledge_reindex.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/reindex", response.text)
        self.assertIn("localStorage", response.text)
        self.assertIn("reindexHistory", response.text)

    def test_static_knowledge_sources_script_includes_source_navigation_logic(self) -> None:
        response = self.client.get("/static/knowledge_sources.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("source-card-grid", response.text)
        self.assertIn("/knowledge/reindex", response.text)
        self.assertIn("/knowledge?source=", response.text)

    def test_static_users_script_includes_overview_logic(self) -> None:
        response = self.client.get("/static/users.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/users", response.text)
        self.assertIn("users-overview-grid", response.text)
        self.assertIn("/users/access", response.text)

    def test_static_users_access_script_includes_access_logic(self) -> None:
        response = self.client.get("/static/users_access.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/users", response.text)
        self.assertIn("/auth/users/${userId}/access", response.text)
        self.assertIn("data-user-source", response.text)

    def test_static_users_audit_script_includes_audit_logic(self) -> None:
        response = self.client.get("/static/users_audit.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/audit-logs", response.text)
        self.assertIn("audit-log-list", response.text)
        self.assertIn("audit-filter-form", response.text)
        self.assertIn("URLSearchParams", response.text)
        self.assertIn("reset_password", response.text)
        self.assertIn("audit-start-at", response.text)
        self.assertIn('params.set("start_at"', response.text)
        self.assertIn('params.set("end_at"', response.text)
        self.assertIn("applyTimePreset", response.text)
        self.assertIn("toDateTimeLocal", response.text)

    def test_static_users_security_script_includes_security_logic(self) -> None:
        response = self.client.get("/static/users_security.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/users", response.text)
        self.assertIn("reset-password", response.text)
        self.assertIn("data-delete-user", response.text)

    def test_static_auth_script_includes_auth_flow(self) -> None:
        response = self.client.get("/static/auth.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/auth/login", response.text)
        self.assertIn("/auth/register", response.text)
        self.assertIn("/auth/me", response.text)
        self.assertIn('window.location.replace("/")', response.text)

    def test_sources_endpoint(self) -> None:
        user = AuthenticatedUser(
            id=1,
            username="alice",
            role="user",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.get("/sources")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("sources", payload)
        self.assertIsInstance(payload["sources"], list)

    def test_health_endpoint_returns_lightweight_summary(self) -> None:
        with patch(
            "apps.api.main.run_healthcheck",
            return_value={
                "service": "ragpro-api",
                "status": "ok",
                "readiness": "degraded",
                "phase": "phase-one-mvp",
                "checked_at": "2026-04-09T15:00:00",
                "dependencies": {"available": 2, "total": 4},
            },
        ):
            response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["service"], "ragpro-api")
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["readiness"], "degraded")
        self.assertIn("dependencies", payload)
        self.assertNotIn("services", payload)
        self.assertNotIn("environment", payload)

    def test_diagnostics_endpoint_returns_detailed_runtime_state(self) -> None:
        with patch(
            "apps.api.main.run_preflight",
            return_value={
                "service": "ragpro-api",
                "status": "degraded",
                "phase": "phase-one-mvp",
                "checked_at": "2026-04-09T15:00:00",
                "service_summary": {
                    "available": 2,
                    "total": 4,
                    "unavailable": 2,
                    "unavailable_services": ["milvus", "ollama"],
                },
                "environment": {
                    "project_root": "D:/dc/gz/codexItem/RAGPro",
                    "log_path": "D:/dc/gz/codexItem/RAGPro/logs/app.log",
                    "vector_backend_preference": "auto",
                },
                "services": [
                    {"name": "mysql", "available": True},
                    {"name": "milvus", "available": False},
                ],
            },
        ), patch(
            "apps.api.main._require_admin_user",
            return_value=AuthenticatedUser(
                id=1,
                username="admin",
                role="admin",
                allowed_sources=("ai", "java", "ops", "bigdata", "test"),
                is_active=True,
            ),
        ):
            response = self.client.get("/diagnostics")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "degraded")
        self.assertIn("services", payload)
        self.assertIn("environment", payload)
        self.assertIn("service_summary", payload)
        self.assertEqual(payload["service_summary"]["unavailable_services"], ["milvus", "ollama"])

    def test_get_sources_uses_authenticated_user_visibility(self) -> None:
        user = AuthenticatedUser(
            id=8,
            username="reader",
            role="user",
            allowed_sources=("faq", "ops"),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.get("/sources")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], ["ops", "faq"])

    def test_create_session_endpoint_returns_generated_session_id(self) -> None:
        user = AuthenticatedUser(
            id=3,
            username="alice",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user), patch(
            "ragpro.conversation.ConversationService.get_or_create_session_id",
            return_value="session-x",
        ):
            response = self.client.post("/sessions")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"session_id": "session-x"})

    def test_faq_query_endpoint_returns_service_payload(self) -> None:
        admin_user = AuthenticatedUser(
            id=4,
            username="admin",
            role="admin",
            allowed_sources=("ai",),
            is_active=True,
        )
        repository = Mock()
        result = Mock(matched=True, answer="test-answer", score=0.91, matched_question="test-question")
        service = Mock()
        service.search.return_value = result

        with patch("apps.api.main._require_admin_user", return_value=admin_user), patch(
            "apps.api.main._create_faq_components",
            return_value=(repository, service),
        ):
            response = self.client.post("/faq/query", json={"query": "hello", "source_filter": "ai"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "matched": True,
                "answer": "test-answer",
                "score": 0.91,
                "matched_question": "test-question",
                "route": "faq_match",
            },
        )
        repository.close.assert_called_once()

    def test_query_endpoint_uses_router_and_returns_non_stream_payload(self) -> None:
        user = AuthenticatedUser(
            id=9,
            username="eva",
            role="user",
            allowed_sources=("ai", "faq"),
            is_active=True,
        )
        route_result = {
            "answer": "route-answer",
            "route": "rag",
            "citations": [{"source": "ai", "score": 0.9}],
            "confidence": {"score": 0.88, "label": "high"},
            "debug_info": {"strategy": "direct"},
            "retrieval_backend": "milvus",
        }
        faq_repository = Mock()
        conversation_repository = Mock()
        conversation_service = Mock()
        router = Mock()
        router.route.return_value = route_result

        with patch("apps.api.main._require_authenticated_user", return_value=user), patch(
            "apps.api.main._create_faq_components",
            return_value=(faq_repository, Mock()),
        ), patch(
            "apps.api.main._create_conversation_repository",
            return_value=conversation_repository,
        ), patch(
            "apps.api.main._conversation_service_from_repository",
            return_value=conversation_service,
        ), patch(
            "apps.api.main._conversation_get_history",
            return_value=[],
        ), patch(
            "apps.api.main._conversation_save_turn",
            return_value=[{"role": "assistant", "content": "route-answer"}],
        ), patch(
            "apps.api.main._build_router",
            return_value=router,
        ):
            conversation_service.get_or_create_session_id.return_value = "s1"
            response = self.client.post(
                "/query",
                json={"query": "什么是大模型", "session_id": "s1", "stream": False, "source_filter": "ai"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["answer"], "route-answer")
        self.assertEqual(payload["route"], "rag")
        self.assertEqual(payload["retrieval_backend"], "milvus")
        self.assertEqual(payload["confidence"]["label"], "high")
        self.assertEqual(payload["debug_info"]["strategy"], "direct")
        self.assertEqual(payload["session_id"], "s1")
        self.assertEqual(payload["history_count"], 1)
        faq_repository.close.assert_called_once()
        conversation_repository.close.assert_called_once()

    def test_query_endpoint_streams_sse_events(self) -> None:
        user = AuthenticatedUser(
            id=10,
            username="streamer",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        faq_repository = Mock()
        conversation_repository = Mock()
        conversation_service = Mock()
        router = Mock()
        stream_payload = iter(
            [
                'event: start\ndata: {"type": "start"}\n\n',
                'event: chunk\ndata: {"delta": "hello"}\n\n',
                'event: end\ndata: {"label": "medium"}\n\n',
            ]
        )

        with patch("apps.api.main._require_authenticated_user", return_value=user), patch(
            "apps.api.main._create_faq_components",
            return_value=(faq_repository, Mock()),
        ), patch(
            "apps.api.main._create_conversation_repository",
            return_value=conversation_repository,
        ), patch(
            "apps.api.main._conversation_service_from_repository",
            return_value=conversation_service,
        ), patch(
            "apps.api.main._conversation_get_history",
            return_value=[],
        ), patch(
            "apps.api.main._build_router",
            return_value=router,
        ), patch(
            "apps.api.main._stream_query_response",
            return_value=stream_payload,
        ):
            conversation_service.get_or_create_session_id.return_value = "s-stream"
            response = self.client.post(
                "/query",
                json={"query": "你好", "session_id": "s-stream", "stream": True},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"].split(";")[0], "text/event-stream")
        self.assertIn("event: start", response.text)
        self.assertIn("event: chunk", response.text)
        self.assertIn("event: end", response.text)
        self.assertIn('"label": "medium"', response.text)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
