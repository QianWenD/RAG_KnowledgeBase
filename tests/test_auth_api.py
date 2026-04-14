from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:  # pragma: no cover - environment-dependent
    TestClient = None

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if TestClient is not None:
    from apps.api.main import app
    from ragpro.auth.models import AuthResult, AuthenticatedUser
else:  # pragma: no cover - environment-dependent
    app = None
    AuthenticatedUser = None
    AuthResult = None


class FakeAuditRepository:
    def __init__(self) -> None:
        self.audit_logs: list[dict] = []

    def create_audit_log(self, **kwargs):
        self.audit_logs.append(kwargs)
        return kwargs

    def close(self) -> None:
        return None


@unittest.skipIf(TestClient is None, "fastapi is not installed in this environment")
class AuthAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_register_sets_cookie_and_returns_user(self) -> None:
        repository = FakeAuditRepository()

        class FakeAuthService:
            def register(self, *, username: str, password: str) -> AuthResult:
                return AuthResult(
                    user=AuthenticatedUser(
                        id=1,
                        username=username,
                        role="admin",
                        allowed_sources=("ai", "java"),
                        is_active=True,
                    ),
                    session_token="token-register",
                )

        with (
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/register",
                json={"username": "admin", "password": "Password123"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["username"], "admin")
        self.assertIn("httponly", response.headers["set-cookie"].lower())
        self.assertEqual(repository.audit_logs[-1]["action"], "register")

    def test_login_sets_cookie_and_returns_user(self) -> None:
        repository = FakeAuditRepository()

        class FakeAuthService:
            def login(self, *, username: str, password: str) -> AuthResult:
                return AuthResult(
                    user=AuthenticatedUser(
                        id=2,
                        username=username,
                        role="user",
                        allowed_sources=("ai",),
                        is_active=True,
                    ),
                    session_token="token-login",
                )

        with (
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/login",
                json={"username": "alice", "password": "Password123"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["username"], "alice")
        self.assertIn("httponly", response.headers["set-cookie"].lower())
        self.assertEqual(repository.audit_logs[-1]["action"], "login")

    def test_me_requires_authentication(self) -> None:
        response = self.client.get("/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_me_returns_current_user(self) -> None:
        user = AuthenticatedUser(
            id=7,
            username="alice",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.get("/auth/me")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["username"], "alice")
        self.assertEqual(payload["user"]["allowed_sources"], ["ai"])

    def test_sources_requires_authentication(self) -> None:
        response = self.client.get("/sources")
        self.assertEqual(response.status_code, 401)

    def test_sources_are_filtered_by_user_scope(self) -> None:
        user = AuthenticatedUser(
            id=8,
            username="bob",
            role="user",
            allowed_sources=("java", "ai"),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.get("/sources")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], ["ai", "java"])

    def test_sources_include_custom_user_scope(self) -> None:
        user = AuthenticatedUser(
            id=18,
            username="custom_reader",
            role="user",
            allowed_sources=("policy_2026",),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.get("/sources")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], ["policy_2026"])

    def test_admin_can_create_user(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def create_user_by_admin(self, *, username: str, password: str, role: str, allowed_sources, is_active: bool):
                return AuthenticatedUser(
                    id=11,
                    username=username,
                    role=role,
                    allowed_sources=tuple(allowed_sources),
                    is_active=is_active,
                )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/users",
                json={
                    "username": "new_user",
                    "password": "Password123",
                    "role": "user",
                    "allowed_sources": ["ai"],
                    "is_active": True,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["username"], "new_user")
        self.assertEqual(payload["user"]["allowed_sources"], ["ai"])
        self.assertEqual(repository.audit_logs[-1]["action"], "admin_create_user")

    def test_admin_can_create_user_with_custom_source(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        captured: dict[str, object] = {}

        class FakeAuthService:
            def create_user_by_admin(self, *, username: str, password: str, role: str, allowed_sources, is_active: bool):
                captured["allowed_sources"] = list(allowed_sources)
                return AuthenticatedUser(
                    id=12,
                    username=username,
                    role=role,
                    allowed_sources=tuple(allowed_sources),
                    is_active=is_active,
                )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/users",
                json={
                    "username": "policy_user",
                    "password": "Password123",
                    "role": "user",
                    "allowed_sources": ["ai", "policy_2026"],
                    "is_active": True,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["allowed_sources"], ["ai", "policy_2026"])
        self.assertEqual(captured["allowed_sources"], ["ai", "policy_2026"])

    def test_admin_can_reset_user_password(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def reset_password(self, *, target_user_id: int, new_password: str):
                return AuthenticatedUser(
                    id=target_user_id,
                    username="member",
                    role="user",
                    allowed_sources=("ai",),
                    is_active=True,
                )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/users/9/reset-password",
                json={"new_password": "NewPassword123"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["password_reset"])
        self.assertEqual(payload["user"]["id"], 9)
        self.assertEqual(repository.audit_logs[-1]["action"], "reset_password")

    def test_authenticated_user_can_change_own_password(self) -> None:
        repository = FakeAuditRepository()
        user = AuthenticatedUser(
            id=5,
            username="alice",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )

        class FakeAuthService:
            def change_password(self, *, user_id: int, current_password: str, new_password: str):
                return AuthenticatedUser(
                    id=user_id,
                    username="alice",
                    role="user",
                    allowed_sources=("ai",),
                    is_active=True,
                )

        with (
            patch("apps.api.main._require_authenticated_user", return_value=user),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/change-password",
                json={"current_password": "OldPassword123", "new_password": "NewPassword123"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["password_changed"])
        self.assertEqual(payload["user"]["id"], 5)
        self.assertEqual(repository.audit_logs[-1]["action"], "change_password")

    def test_admin_can_delete_user(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def delete_user(self, *, target_user_id: int, acting_user_id: int):
                return AuthenticatedUser(
                    id=target_user_id,
                    username="member",
                    role="user",
                    allowed_sources=("ai",),
                    is_active=False,
                )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.delete("/auth/users/12")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["deleted"])
        self.assertEqual(payload["user"]["id"], 12)
        self.assertEqual(repository.audit_logs[-1]["action"], "delete_user")

    def test_admin_can_list_audit_logs(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        captured: dict[str, object] = {}

        class FakeAuthService:
            def list_audit_logs(
                self,
                *,
                limit: int = 100,
                action: str | None = None,
                search: str | None = None,
                sensitive_only: bool = False,
                start_at: str | None = None,
                end_at: str | None = None,
            ):
                captured.update(
                    {
                        "limit": limit,
                        "action": action,
                        "search": search,
                        "sensitive_only": sensitive_only,
                        "start_at": start_at,
                        "end_at": end_at,
                    }
                )
                return [
                    type(
                        "AuditLog",
                        (),
                        {
                            "id": 1,
                            "action": "reset_password",
                            "actor_user_id": 1,
                            "actor_username": "admin",
                            "actor_role": "admin",
                            "target_user_id": 9,
                            "target_username": "member",
                            "target_role": "user",
                            "metadata": {"is_active": True},
                            "created_at": "2026-04-10T10:00:00",
                        },
                    )()
                ]

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.get(
                "/auth/audit-logs"
                "?limit=10"
                "&action=reset_password"
                "&search=member"
                "&sensitive_only=true"
                "&start_at=2026-04-10T08:00"
                "&end_at=2026-04-10T18:30"
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["logs"][0]["action"], "reset_password")
        self.assertEqual(
            payload["filters"],
            {
                "action": "reset_password",
                "search": "member",
                "sensitive_only": True,
                "limit": 10,
                "start_at": "2026-04-10T08:00:00",
                "end_at": "2026-04-10T18:30:00",
            },
        )
        self.assertEqual(
            captured,
            {
                "limit": 10,
                "action": "reset_password",
                "search": "member",
                "sensitive_only": True,
                "start_at": "2026-04-10T08:00:00",
                "end_at": "2026-04-10T18:30:00",
            },
        )

    def test_non_admin_cannot_upload_documents(self) -> None:
        user = AuthenticatedUser(
            id=9,
            username="eve",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.post(
                "/documents/upload",
                data={"source": "ai", "replace_source": "false"},
                files=[("files", ("notes.txt", b"RAG notes", "text/plain"))],
            )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_upload_documents_to_custom_source(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        captured: dict[str, object] = {}

        class FakeUploadService:
            def upload_documents(self, *, source, files, replace_source=False):
                captured["source"] = source
                return {
                    "source": source,
                    "replace_source": replace_source,
                    "file_count": len(files),
                    "raw_document_count": len(files),
                    "document_chunks": 1,
                    "deleted_before_index": 0,
                    "retrieval_backend": "local",
                    "upload_directory": "runtime/uploads/policy_2026",
                    "files": [{"filename": "notes.txt", "stored_name": "notes.txt"}],
                }

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._build_document_upload_service", return_value=FakeUploadService()),
        ):
            response = self.client.post(
                "/documents/upload",
                data={"source": "policy_2026", "replace_source": "false"},
                files=[("files", ("notes.txt", b"RAG notes", "text/plain"))],
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["source"], "policy_2026")
        self.assertEqual(captured["source"], "policy_2026")

    def test_query_rejects_source_outside_user_scope(self) -> None:
        user = AuthenticatedUser(
            id=10,
            username="mallory",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        with patch("apps.api.main._require_authenticated_user", return_value=user):
            response = self.client.post(
                "/query",
                json={"query": "什么是大语言模型", "source_filter": "java"},
            )

        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
