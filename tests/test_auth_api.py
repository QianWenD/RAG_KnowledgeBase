from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

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

    def test_sources_for_admin_include_known_sources_from_other_users(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthRepository:
            def list_users(self):
                return [
                    admin,
                    AuthenticatedUser(
                        id=6,
                        username="dengchao1",
                        role="user",
                        allowed_sources=("ai", "java", "med"),
                        is_active=True,
                    ),
                ]

            def close(self) -> None:
                return None

        with (
            patch("apps.api.main._require_authenticated_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=FakeAuthRepository()),
        ):
            response = self.client.get("/sources")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], ["ai", "java", "test", "ops", "bigdata", "med"])

    def test_admin_can_register_custom_source(self) -> None:
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
            def update_user_access(self, *, target_user_id: int, role=None, allowed_sources=None, is_active=None):
                captured["target_user_id"] = target_user_id
                captured["allowed_sources"] = list(allowed_sources)
                return AuthenticatedUser(
                    id=target_user_id,
                    username="admin",
                    role="admin",
                    allowed_sources=tuple(allowed_sources),
                    is_active=True,
                )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post("/sources", json={"source": "policy_2026"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["source"], "policy_2026")
        self.assertIn("policy_2026", payload["sources"])
        self.assertEqual(captured["target_user_id"], 1)
        self.assertEqual(captured["allowed_sources"], ["ai", "java", "policy_2026"])
        self.assertEqual(repository.audit_logs[-1]["action"], "update_user_access")

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
            def create_user_by_admin(
                self,
                *,
                username: str,
                password: str,
                role: str,
                allowed_sources,
                is_active: bool,
                display_name=None,
                work_no=None,
                org_unit_id=None,
                menu_role_ids=None,
            ):
                return AuthenticatedUser(
                    id=11,
                    username=username,
                    role=role,
                    allowed_sources=tuple(allowed_sources),
                    is_active=is_active,
                    display_name=display_name or username,
                    work_no=work_no or username,
                    org_unit_id=org_unit_id,
                    menu_role_ids=tuple(menu_role_ids or ()),
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
            def create_user_by_admin(
                self,
                *,
                username: str,
                password: str,
                role: str,
                allowed_sources,
                is_active: bool,
                display_name=None,
                work_no=None,
                org_unit_id=None,
                menu_role_ids=None,
            ):
                captured["allowed_sources"] = list(allowed_sources)
                return AuthenticatedUser(
                    id=12,
                    username=username,
                    role=role,
                    allowed_sources=tuple(allowed_sources),
                    is_active=is_active,
                    display_name=display_name or username,
                    work_no=work_no or username,
                    org_unit_id=org_unit_id,
                    menu_role_ids=tuple(menu_role_ids or ()),
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

    def test_admin_can_get_permission_bootstrap(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def get_permission_bootstrap(self):
                return {
                    "org_units": [{"id": 1, "org_name": "平台总部", "children": []}],
                    "menu_roles": [{"id": 1, "role_name": "平台管理员"}],
                    "menu_items": [{"id": 1, "name": "总览", "children": []}],
                    "system_roles": [{"value": "admin", "label": "管理员"}],
                    "status_options": [{"value": True, "label": "启用"}],
                    "valid_sources": ["ai", "java"],
                }

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=FakeAuditRepository()),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.get("/auth/permission-bootstrap")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["menu_roles"][0]["role_name"], "平台管理员")
        self.assertEqual(payload["valid_sources"], ["ai", "java"])

    def test_admin_can_manage_menu_roles(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def create_menu_role(self, *, role_code: str, role_name: str, role_desc=None, menu_ids=None):
                return type(
                    "MenuRole",
                    (),
                    {
                        "id": 21,
                        "role_code": role_code,
                        "role_name": role_name,
                        "role_desc": role_desc,
                        "menu_ids": tuple(menu_ids or []),
                        "menu_codes": ("dashboard",),
                        "menu_names": ("总览",),
                        "assigned_user_count": 0,
                        "created_at": "2026-04-24T10:00:00",
                        "updated_at": "2026-04-24T10:00:00",
                    },
                )()

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/menu-roles",
                json={"role_code": "knowledge_editor", "role_name": "知识编辑", "role_desc": "负责知识内容", "menu_ids": [1]},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["item"]["role_code"], "knowledge_editor")
        self.assertEqual(repository.audit_logs[-1]["action"], "create_menu_role")

    def test_admin_can_manage_menu_items(self) -> None:
        repository = FakeAuditRepository()
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeAuthService:
            def create_menu_item(
                self,
                *,
                menu_code: str,
                name: str,
                parent_id=None,
                router_name=None,
                router_path=None,
                icon_url=None,
                href=None,
                is_visible=True,
                remark=None,
                sort_order=100,
            ):
                return type(
                    "MenuItem",
                    (),
                    {
                        "id": 9,
                        "parent_id": parent_id,
                        "menu_code": menu_code,
                        "name": name,
                        "router_name": router_name,
                        "router_path": router_path,
                        "icon_url": icon_url,
                        "href": href,
                        "is_visible": is_visible,
                        "remark": remark,
                        "sort_order": sort_order,
                        "created_at": "2026-04-24T10:00:00",
                        "updated_at": "2026-04-24T10:00:00",
                    },
                )()

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._create_auth_repository", return_value=repository),
            patch("apps.api.main._auth_service_from_repository", return_value=FakeAuthService()),
        ):
            response = self.client.post(
                "/auth/menu-items",
                json={
                    "menu_code": "ops_center",
                    "name": "运营中心",
                    "parent_id": 1,
                    "router_name": "ops-center",
                    "router_path": "/ops",
                    "href": "/ops",
                    "is_visible": True,
                    "sort_order": 50,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["item"]["menu_code"], "ops_center")
        self.assertEqual(repository.audit_logs[-1]["action"], "create_menu_item")

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

    def test_admin_upload_documents_returns_async_job(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        captured: dict[str, object] = {}

        def fake_submit_upload_job(*, source, files, replace_source, uploaded_by=None):
            captured["source"] = source
            captured["file_count"] = len(files)
            captured["replace_source"] = replace_source
            captured["uploaded_by"] = uploaded_by
            return {
                "job_id": "upload_job_1",
                "status": "queued",
                "stage": "queued",
                "progress": 5,
                "source": source,
                "file_count": len(files),
                "message": "文件已接收，等待入库。",
                "poll_url": "/documents/upload-jobs/upload_job_1",
            }

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._stage_uploaded_files", new=AsyncMock(return_value=[Mock(path=None)])),
            patch("apps.api.main._submit_upload_job", side_effect=fake_submit_upload_job),
        ):
            response = self.client.post(
                "/documents/upload",
                data={"source": "policy_2026", "replace_source": "false"},
                files=[("files", ("notes.txt", b"RAG notes", "text/plain"))],
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["job_id"], "upload_job_1")
        self.assertEqual(response.json()["status"], "queued")
        self.assertEqual(response.json()["poll_url"], "/documents/upload-jobs/upload_job_1")
        self.assertEqual(captured["source"], "policy_2026")
        self.assertEqual(captured["file_count"], 1)
        self.assertEqual(captured["uploaded_by"]["username"], "admin")

    def test_admin_can_read_upload_job_status(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch(
                "apps.api.main._get_upload_job",
                return_value={
                    "job_id": "upload_job_1",
                    "status": "succeeded",
                    "stage": "done",
                    "progress": 100,
                    "source": "policy_2026",
                    "message": "文档上传并入库完成。",
                    "result": {"source": "policy_2026", "file_count": 1, "document_chunks": 3},
                },
            ),
        ):
            response = self.client.get("/documents/upload-jobs/upload_job_1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "succeeded")
        self.assertEqual(response.json()["result"]["document_chunks"], 3)

    def test_admin_batch_upload_documents_returns_batch_job(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java", "med"),
            is_active=True,
        )
        captured: list[dict[str, object]] = []

        def fake_submit_upload_job(*, source, files, replace_source, uploaded_by=None):
            captured.append(
                {
                    "source": source,
                    "file_count": len(files),
                    "replace_source": replace_source,
                    "uploaded_by": uploaded_by,
                }
            )
            job_id = f"upload_job_{len(captured)}"
            return {
                "job_id": job_id,
                "status": "queued",
                "stage": "queued",
                "progress": 5,
                "source": source,
                "file_count": len(files),
                "replace_source": replace_source,
                "message": "文件已接收，等待入库。",
                "poll_url": f"/documents/upload-jobs/{job_id}",
            }

        items = [
            {"source": "ai", "replace_source": False, "file_count": 1},
            {"source": "med", "replace_source": True, "file_count": 2},
        ]

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch(
                "apps.api.main._stage_uploaded_files",
                new=AsyncMock(
                    side_effect=[
                        [Mock(path=None)],
                        [Mock(path=None), Mock(path=None)],
                    ]
                ),
            ),
            patch("apps.api.main._submit_upload_job", side_effect=fake_submit_upload_job),
        ):
            response = self.client.post(
                "/documents/batch-upload",
                data={"items_json": json.dumps(items)},
                files=[
                    ("files", ("ai.txt", b"AI notes", "text/plain")),
                    ("files", ("med-1.txt", b"Med notes 1", "text/plain")),
                    ("files", ("med-2.txt", b"Med notes 2", "text/plain")),
                ],
            )

        payload = response.json()
        self.assertEqual(response.status_code, 202)
        self.assertIn("batch_id", payload)
        self.assertEqual(payload["status"], "queued")
        self.assertEqual(payload["job_count"], 2)
        self.assertEqual(payload["file_count"], 3)
        self.assertIn("3 个文件", payload["message"])
        self.assertEqual(payload["poll_url"], f"/documents/batch-upload-jobs/{payload['batch_id']}")
        self.assertEqual([item["source"] for item in captured], ["ai", "med"])
        self.assertEqual([item["file_count"] for item in captured], [1, 2])
        self.assertEqual(captured[1]["replace_source"], True)
        self.assertEqual(captured[0]["uploaded_by"]["username"], "admin")

    def test_admin_can_read_batch_upload_job_status(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "med"),
            is_active=True,
        )

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch(
                "apps.api.main._get_batch_upload_job",
                return_value={
                    "batch_id": "batch_1",
                    "status": "succeeded",
                    "progress": 100,
                    "message": "批量入库完成：2 个任务全部成功。",
                    "job_count": 2,
                    "completed_count": 2,
                    "failed_count": 0,
                    "jobs": [
                        {"job_id": "upload_job_1", "source": "ai", "status": "succeeded"},
                        {"job_id": "upload_job_2", "source": "med", "status": "succeeded"},
                    ],
                    "poll_url": "/documents/batch-upload-jobs/batch_1",
                },
            ),
        ):
            response = self.client.get("/documents/batch-upload-jobs/batch_1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "succeeded")
        self.assertEqual(response.json()["completed_count"], 2)

    def test_admin_can_list_uploaded_document_files(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="root",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        class FakeDocumentFileService:
            def __init__(self) -> None:
                self.requested_source = None

            def list_files(self, source=None):
                self.requested_source = source
                return [
                    {
                        "file_id": "file_ai_1",
                        "source": "ai",
                        "filename": "notes.txt",
                        "stored_name": "notes.txt",
                        "content_type": "text/plain",
                        "size_bytes": 12,
                        "document_chunks": 3,
                        "uploader_user_id": 1,
                        "uploader_username": "root",
                        "uploader_display_name": "管理员",
                        "created_at": "2026-05-28T10:00:00",
                    }
                ]

        file_service = FakeDocumentFileService()

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._build_document_file_service", return_value=file_service),
        ):
            response = self.client.get("/documents/files?source=ai")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(file_service.requested_source, "ai")
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["files"][0]["file_id"], "file_ai_1")
        self.assertEqual(payload["files"][0]["uploader_username"], "root")
        self.assertEqual(payload["files"][0]["uploader_display_name"], "管理员")

    def test_admin_can_download_uploaded_document_file(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="root",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            stored_path = Path(tmpdir) / "notes.txt"
            stored_path.write_text("原文内容", encoding="utf-8")

            class FakeDocumentFileService:
                def get_file_for_response(self, file_id: str):
                    return (
                        {
                            "file_id": file_id,
                            "filename": "notes.txt",
                            "content_type": "text/plain; charset=utf-8",
                        },
                        stored_path,
                    )

            with (
                patch("apps.api.main._require_admin_user", return_value=admin),
                patch("apps.api.main._build_document_file_service", return_value=FakeDocumentFileService()),
            ):
                response = self.client.get("/documents/files/file_ai_1/download")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "原文内容")
        self.assertIn("attachment", response.headers["content-disposition"])
        self.assertIn("notes.txt", response.headers["content-disposition"])

    def test_admin_can_view_uploaded_document_file_inline(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="root",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            stored_path = Path(tmpdir) / "notes.txt"
            stored_path.write_text("用于在线查看的原文", encoding="utf-8")

            class FakeDocumentFileService:
                def get_file_for_response(self, file_id: str):
                    return (
                        {
                            "file_id": file_id,
                            "filename": "notes.txt",
                            "content_type": "text/plain; charset=utf-8",
                        },
                        stored_path,
                    )

            with (
                patch("apps.api.main._require_admin_user", return_value=admin),
                patch("apps.api.main._build_document_file_service", return_value=FakeDocumentFileService()),
            ):
                response = self.client.get("/documents/files/file_ai_1/content")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "用于在线查看的原文")
        self.assertIn("inline", response.headers["content-disposition"])

    def test_view_uploaded_html_file_is_served_as_plain_text(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="root",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            stored_path = Path(tmpdir) / "unsafe.html"
            stored_path.write_text("<script>alert('xss')</script>", encoding="utf-8")

            class FakeDocumentFileService:
                def get_file_for_response(self, file_id: str):
                    return (
                        {
                            "file_id": file_id,
                            "filename": "unsafe.html",
                            "content_type": "text/html",
                        },
                        stored_path,
                    )

            with (
                patch("apps.api.main._require_admin_user", return_value=admin),
                patch("apps.api.main._build_document_file_service", return_value=FakeDocumentFileService()),
            ):
                response = self.client.get("/documents/files/file_ai_1/content")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")

    def test_admin_can_delete_uploaded_document_file_and_records_audit(self) -> None:
        admin = AuthenticatedUser(
            id=1,
            username="root",
            role="admin",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        repository = FakeAuditRepository()

        class FakeDocumentFileService:
            def __init__(self) -> None:
                self.deleted_file_id = None

            def delete_file(self, file_id: str):
                self.deleted_file_id = file_id
                return {
                    "file_id": file_id,
                    "source": "ai",
                    "filename": "retire-me.txt",
                    "deleted_vectors": 4,
                    "deleted_file": True,
                }

        file_service = FakeDocumentFileService()

        with (
            patch("apps.api.main._require_admin_user", return_value=admin),
            patch("apps.api.main._build_document_file_service", return_value=file_service),
            patch("apps.api.main._create_auth_repository", return_value=repository),
        ):
            response = self.client.delete("/documents/files/file_ai_1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(file_service.deleted_file_id, "file_ai_1")
        payload = response.json()
        self.assertTrue(payload["deleted"])
        self.assertEqual(payload["file"]["deleted_vectors"], 4)
        self.assertEqual(repository.audit_logs[-1]["action"], "delete_document_file")
        self.assertEqual(repository.audit_logs[-1]["metadata"]["file_id"], "file_ai_1")

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
        self.assertEqual(response.json()["detail"], "当前账号无权访问数据源“java”。")

    def test_query_without_source_filter_uses_user_scope(self) -> None:
        user = AuthenticatedUser(
            id=11,
            username="user_2",
            role="user",
            allowed_sources=("med", "policy"),
            is_active=True,
        )
        faq_repository = FakeAuditRepository()
        conversation_repository = FakeAuditRepository()
        conversation_service = type(
            "ConversationService",
            (),
            {
                "get_or_create_session_id": staticmethod(lambda session_id: session_id or "s-auto"),
            },
        )()
        router = type(
            "Router",
            (),
            {
                "route": staticmethod(
                    lambda query, **kwargs: {
                        "answer": "已按权限范围检索",
                        "route": "rag",
                        "citations": [],
                        "confidence": {"score": 0.7, "label": "medium"},
                        "debug_info": kwargs,
                        "retrieval_backend": "milvus",
                    }
                )
            },
        )()

        with (
            patch("apps.api.main._require_authenticated_user", return_value=user),
            patch("apps.api.main._create_faq_components", return_value=(faq_repository, Mock())),
            patch("apps.api.main._create_conversation_repository", return_value=conversation_repository),
            patch("apps.api.main._conversation_service_from_repository", return_value=conversation_service),
            patch("apps.api.main._conversation_get_history", return_value=[]),
            patch("apps.api.main._conversation_save_turn", return_value=[]),
            patch("apps.api.main._build_router", return_value=router),
        ):
            response = self.client.post(
                "/query",
                json={"query": "医保限制用药怎么录入？"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["debug_info"]["allowed_sources"], ["med", "policy"])
        self.assertIsNone(payload["debug_info"]["source_filter"])


if __name__ == "__main__":
    unittest.main()
