from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.auth.models import AuthenticatedUser, UserRecord
from ragpro.auth.permissions import QueryAccessError, filter_sources_for_user, resolve_effective_source_filter
from ragpro.auth.service import AuthService


class QueryPermissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.admin = AuthenticatedUser(
            id=1,
            username="admin",
            role="admin",
            allowed_sources=("ai", "java", "ops"),
            is_active=True,
        )
        self.user_single = AuthenticatedUser(
            id=2,
            username="alice",
            role="user",
            allowed_sources=("ai",),
            is_active=True,
        )
        self.user_multi = AuthenticatedUser(
            id=3,
            username="bob",
            role="user",
            allowed_sources=("ai", "java"),
            is_active=True,
        )
        self.user_none = AuthenticatedUser(
            id=4,
            username="charlie",
            role="user",
            allowed_sources=(),
            is_active=True,
        )

    def test_admin_can_access_without_source_filter(self) -> None:
        resolved = resolve_effective_source_filter(
            query="什么是大语言模型",
            requested_source_filter=None,
            user=self.admin,
        )
        self.assertIsNone(resolved)

    def test_general_query_does_not_force_source_filter(self) -> None:
        resolved = resolve_effective_source_filter(
            query="你好",
            requested_source_filter=None,
            user=self.user_multi,
        )
        self.assertIsNone(resolved)

    def test_single_source_user_is_auto_scoped_for_professional_query(self) -> None:
        resolved = resolve_effective_source_filter(
            query="什么是大语言模型",
            requested_source_filter=None,
            user=self.user_single,
        )
        self.assertEqual(resolved, "ai")

    def test_multi_source_user_must_choose_source_filter(self) -> None:
        with self.assertRaises(QueryAccessError) as context:
            resolve_effective_source_filter(
                query="什么是大语言模型",
                requested_source_filter=None,
                user=self.user_multi,
            )

        self.assertEqual(context.exception.code, "source_filter_required")

    def test_forbidden_source_filter_is_rejected(self) -> None:
        with self.assertRaises(QueryAccessError) as context:
            resolve_effective_source_filter(
                query="什么是大语言模型",
                requested_source_filter="ops",
                user=self.user_single,
            )

        self.assertEqual(context.exception.code, "source_forbidden")

    def test_user_without_sources_cannot_run_professional_query(self) -> None:
        with self.assertRaises(QueryAccessError) as context:
            resolve_effective_source_filter(
                query="什么是大语言模型",
                requested_source_filter=None,
                user=self.user_none,
            )

        self.assertEqual(context.exception.code, "no_sources_assigned")

    def test_filter_sources_for_user_returns_scoped_values(self) -> None:
        filtered = filter_sources_for_user(("ai", "java", "ops"), self.user_multi)
        self.assertEqual(filtered, ["ai", "java"])

    def test_filter_sources_for_user_includes_custom_assigned_sources(self) -> None:
        user = AuthenticatedUser(
            id=5,
            username="dora",
            role="user",
            allowed_sources=("ai", "policy_2026"),
            is_active=True,
        )

        filtered = filter_sources_for_user(("ai", "java", "ops"), user)

        self.assertEqual(filtered, ["ai", "policy_2026"])

    def test_filter_sources_for_admin_returns_all_values(self) -> None:
        filtered = filter_sources_for_user(("ai", "java", "ops"), self.admin)
        self.assertEqual(filtered, ["ai", "java", "ops"])


class FakeAuthRepository:
    def __init__(self) -> None:
        self.users_by_name: dict[str, UserRecord] = {}
        self.users_by_id: dict[int, UserRecord] = {}
        self.next_id = 1
        self.deleted_session_users: list[int] = []
        self.deleted_users: list[int] = []

    def get_user_record_by_username(self, username: str) -> UserRecord | None:
        return self.users_by_name.get(username)

    def count_users(self) -> int:
        return len(self.users_by_id)

    def create_user(
        self,
        *,
        username: str,
        password_hash: str,
        role: str,
        allowed_sources,
        is_active: bool = True,
    ) -> AuthenticatedUser:
        user = UserRecord(
            id=self.next_id,
            username=username,
            role=role,
            allowed_sources=tuple(allowed_sources),
            is_active=is_active,
            created_at="2026-04-09 18:00:00",
            password_hash=password_hash,
        )
        self.users_by_name[username] = user
        self.users_by_id[self.next_id] = user
        self.next_id += 1
        return AuthenticatedUser(
            id=user.id,
            username=user.username,
            role=user.role,
            allowed_sources=user.allowed_sources,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    def get_user_by_id(self, user_id: int) -> AuthenticatedUser | None:
        user = self.users_by_id.get(user_id)
        if user is None:
            return None
        return AuthenticatedUser(
            id=user.id,
            username=user.username,
            role=user.role,
            allowed_sources=user.allowed_sources,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    def get_user_record_by_id(self, user_id: int) -> UserRecord | None:
        return self.users_by_id.get(user_id)

    def update_user_access(self, user_id: int, *, role=None, allowed_sources=None, is_active=None):
        user = self.users_by_id.get(user_id)
        if user is None:
            return None
        updated = UserRecord(
            id=user.id,
            username=user.username,
            role=role if role is not None else user.role,
            allowed_sources=tuple(allowed_sources) if allowed_sources is not None else user.allowed_sources,
            is_active=is_active if is_active is not None else user.is_active,
            created_at=user.created_at,
            password_hash=user.password_hash,
        )
        self.users_by_name[user.username] = updated
        self.users_by_id[user.id] = updated
        return self.get_user_by_id(user_id)

    def update_password_hash(self, user_id: int, password_hash: str):
        user = self.users_by_id.get(user_id)
        if user is None:
            return None
        updated = UserRecord(
            id=user.id,
            username=user.username,
            role=user.role,
            allowed_sources=user.allowed_sources,
            is_active=user.is_active,
            created_at=user.created_at,
            password_hash=password_hash,
        )
        self.users_by_name[user.username] = updated
        self.users_by_id[user.id] = updated
        return self.get_user_by_id(user_id)

    def create_session(self, *, user_id: int, token_hash: str, expires_at: str) -> None:
        return None

    def delete_expired_sessions(self) -> int:
        return 0

    def delete_sessions_by_user(self, user_id: int) -> int:
        self.deleted_session_users.append(user_id)
        return 1

    def delete_user(self, user_id: int):
        user = self.users_by_id.pop(user_id, None)
        if user is None:
            return None
        self.users_by_name.pop(user.username, None)
        self.deleted_users.append(user_id)
        return AuthenticatedUser(
            id=user.id,
            username=user.username,
            role=user.role,
            allowed_sources=user.allowed_sources,
            is_active=user.is_active,
            created_at=user.created_at,
        )


class AuthServiceAdminTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeAuthRepository()
        self.patcher = patch("ragpro.auth.service.get_settings")
        mocked = self.patcher.start()
        mocked.return_value = type(
            "Settings",
            (),
            {
                "auth_username_min_length": 3,
                "auth_password_min_length": 8,
                "auth_password_iterations": 1000,
                "auth_session_ttl_days": 7,
                "valid_sources": ("ai", "java", "ops"),
            },
        )()
        self.service = AuthService(self.repository)

    def tearDown(self) -> None:
        self.patcher.stop()

    def test_admin_can_create_user_with_scoped_sources(self) -> None:
        user = self.service.create_user_by_admin(
            username="alice",
            password="Password123",
            role="user",
            allowed_sources=["ai"],
        )
        self.assertEqual(user.username, "alice")
        self.assertEqual(user.role, "user")
        self.assertEqual(user.allowed_sources, ("ai",))

    def test_admin_can_create_user_with_custom_source(self) -> None:
        user = self.service.create_user_by_admin(
            username="policy_user",
            password="Password123",
            role="user",
            allowed_sources=["ai", "policy_2026"],
        )

        self.assertEqual(user.allowed_sources, ("ai", "policy_2026"))

    def test_admin_can_update_user_access_with_custom_source(self) -> None:
        user = self.service.create_user_by_admin(
            username="ops_user",
            password="Password123",
            role="user",
            allowed_sources=["ai"],
        )

        updated = self.service.update_user_access(
            target_user_id=user.id,
            allowed_sources=["ai", "ops_2026"],
        )

        self.assertEqual(updated.allowed_sources, ("ai", "ops_2026"))

    def test_admin_can_reset_password(self) -> None:
        user = self.service.create_user_by_admin(
            username="bob",
            password="Password123",
            role="user",
            allowed_sources=["java"],
        )
        self.assertTrue(
            AuthService.verify_password(
                "Password123",
                self.repository.users_by_name["bob"].password_hash,
            )
        )

        updated = self.service.reset_password(target_user_id=user.id, new_password="NewPassword123")

        self.assertEqual(updated.username, "bob")
        self.assertTrue(
            AuthService.verify_password(
                "NewPassword123",
                self.repository.users_by_name["bob"].password_hash,
            )
        )
        self.assertEqual(self.repository.deleted_session_users, [user.id])

    def test_change_password_requires_current_password_and_clears_sessions(self) -> None:
        user = self.service.create_user_by_admin(
            username="carol",
            password="Password123",
            role="user",
            allowed_sources=["ai"],
        )

        updated = self.service.change_password(
            user_id=user.id,
            current_password="Password123",
            new_password="BrandNew123",
        )

        self.assertEqual(updated.username, "carol")
        self.assertTrue(
            AuthService.verify_password(
                "BrandNew123",
                self.repository.users_by_name["carol"].password_hash,
            )
        )
        self.assertEqual(self.repository.deleted_session_users[-1], user.id)

    def test_disabling_user_clears_sessions(self) -> None:
        user = self.service.create_user_by_admin(
            username="dave",
            password="Password123",
            role="user",
            allowed_sources=["ai"],
        )

        updated = self.service.update_user_access(
            target_user_id=user.id,
            is_active=False,
        )

        self.assertFalse(updated.is_active)
        self.assertEqual(self.repository.deleted_session_users[-1], user.id)

    def test_admin_can_delete_user(self) -> None:
        user = self.service.create_user_by_admin(
            username="erin",
            password="Password123",
            role="user",
            allowed_sources=["java"],
        )

        deleted = self.service.delete_user(target_user_id=user.id, acting_user_id=999)

        self.assertEqual(deleted.username, "erin")
        self.assertEqual(self.repository.deleted_session_users[-1], user.id)
        self.assertEqual(self.repository.deleted_users[-1], user.id)

    def test_admin_cannot_delete_self(self) -> None:
        admin = self.service.create_user_by_admin(
            username="root_admin",
            password="Password123",
            role="admin",
            allowed_sources=["ai", "java"],
        )

        with self.assertRaises(ValueError):
            self.service.delete_user(target_user_id=admin.id, acting_user_id=admin.id)


if __name__ == "__main__":
    unittest.main()
