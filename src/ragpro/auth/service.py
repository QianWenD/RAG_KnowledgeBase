from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from ragpro.config import get_settings

from .models import (
    AuthResult,
    AuthenticatedUser,
    KnowledgeSourceRecord,
    MenuItemRecord,
    MenuRoleRecord,
    OrgUnitRecord,
)
from .repository import AuthMySQLRepository

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")
SOURCE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$")
WORK_NO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
ROLE_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
MENU_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
ORG_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
ORG_TYPE_PATTERN = re.compile(r"^[a-z][a-z0-9_-]{1,31}$")


class AuthService:
    def __init__(self, repository: AuthMySQLRepository) -> None:
        self.repository = repository
        self.settings = get_settings()

    def register(self, *, username: str, password: str) -> AuthResult:
        normalized_username = self._validate_username(username)
        self._validate_password(password)
        self._ensure_username_available(normalized_username)

        is_first_user = self.repository.count_users() == 0
        role = "admin" if is_first_user else "user"
        allowed_sources = self.settings.valid_sources if is_first_user else ()

        user = self.repository.create_user(
            username=normalized_username,
            password_hash=self.hash_password(password, iterations=self.settings.auth_password_iterations),
            role=role,
            allowed_sources=allowed_sources,
            is_active=True,
            display_name=normalized_username,
            work_no=normalized_username,
        )
        session_token = self._issue_session_token(user.id)
        return AuthResult(user=user, session_token=session_token)

    def login(self, *, username: str, password: str) -> AuthResult:
        normalized_username = username.strip()
        record = self.repository.get_user_record_by_username(normalized_username)
        if record is None or not self.verify_password(password, record.password_hash):
            raise PermissionError("Invalid username or password.")
        if not record.is_active:
            raise PermissionError("Account is disabled.")

        session_token = self._issue_session_token(record.id)
        return AuthResult(user=self._to_authenticated_user(record), session_token=session_token)

    def authenticate_token(self, session_token: str) -> AuthenticatedUser:
        token_hash = self._hash_session_token(session_token)
        self.repository.delete_expired_sessions()
        session = self.repository.get_session(token_hash)
        if session is None:
            raise PermissionError("Authentication required.")

        user = self.repository.get_user_by_id(session.user_id)
        if user is None or not user.is_active:
            self.repository.delete_session(token_hash)
            raise PermissionError("Authentication required.")

        self.repository.touch_session(token_hash)
        return user

    def logout(self, session_token: str | None) -> None:
        if not session_token:
            return
        self.repository.delete_session(self._hash_session_token(session_token))

    def list_users(
        self,
        *,
        login: str | None = None,
        work_no: str | None = None,
        display_name: str | None = None,
        org_unit_id: int | None = None,
    ) -> list[AuthenticatedUser]:
        return self.repository.list_users(
            login=(login or "").strip() or None,
            work_no=(work_no or "").strip() or None,
            display_name=(display_name or "").strip() or None,
            org_unit_id=org_unit_id,
        )

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
        return self.repository.list_audit_logs(
            limit=limit,
            action=action,
            search=search,
            sensitive_only=sensitive_only,
            start_at=start_at,
            end_at=end_at,
        )

    def create_user_by_admin(
        self,
        *,
        username: str,
        password: str,
        role: str = "user",
        allowed_sources: list[str] | None = None,
        is_active: bool = True,
        display_name: str | None = None,
        work_no: str | None = None,
        org_unit_id: int | None = None,
        menu_role_ids: list[int] | None = None,
    ) -> AuthenticatedUser:
        normalized_username = self._validate_username(username)
        self._validate_password(password)
        self._validate_role(role)
        normalized_sources = self._normalize_allowed_sources(allowed_sources, role=role)
        normalized_display_name = self._normalize_display_name(display_name, fallback=normalized_username)
        normalized_work_no = self._normalize_work_no(work_no, fallback=normalized_username)
        self._ensure_username_available(normalized_username)
        self._ensure_work_no_available(normalized_work_no)
        resolved_org_unit_id = self._validate_org_unit_id(org_unit_id)
        normalized_menu_role_ids = self._validate_menu_role_ids(menu_role_ids)

        return self.repository.create_user(
            username=normalized_username,
            password_hash=self.hash_password(password, iterations=self.settings.auth_password_iterations),
            role=role,
            allowed_sources=normalized_sources,
            is_active=is_active,
            display_name=normalized_display_name,
            work_no=normalized_work_no,
            org_unit_id=resolved_org_unit_id,
            menu_role_ids=normalized_menu_role_ids,
        )

    def update_user_profile(
        self,
        *,
        target_user_id: int,
        username: str | None = None,
        display_name: str | None = None,
        work_no: str | None = None,
        org_unit_id: int | None = None,
        menu_role_ids: list[int] | None = None,
    ) -> AuthenticatedUser:
        current = self.repository.get_user_record_by_id(target_user_id)
        if current is None:
            raise ValueError("User not found.")

        normalized_username = current.username
        if username is not None and username.strip() != current.username:
            normalized_username = self._validate_username(username)
            self._ensure_username_available(normalized_username, exclude_user_id=current.id)

        normalized_display_name = current.display_name or current.username
        if display_name is not None:
            normalized_display_name = self._normalize_display_name(display_name, fallback=normalized_username)

        normalized_work_no = current.work_no or current.username
        if work_no is not None:
            normalized_work_no = self._normalize_work_no(work_no, fallback=normalized_username)
            self._ensure_work_no_available(normalized_work_no, exclude_user_id=current.id)

        resolved_org_unit_id = current.org_unit_id
        if org_unit_id is not None:
            resolved_org_unit_id = self._validate_org_unit_id(org_unit_id)

        normalized_menu_role_ids = None
        if menu_role_ids is not None:
            normalized_menu_role_ids = self._validate_menu_role_ids(menu_role_ids)

        updated = self.repository.update_user_profile(
            target_user_id,
            username=normalized_username,
            display_name=normalized_display_name,
            work_no=normalized_work_no,
            org_unit_id=resolved_org_unit_id,
            menu_role_ids=normalized_menu_role_ids,
        )
        if updated is None:
            raise ValueError("User not found.")
        return updated

    def update_user_access(
        self,
        *,
        target_user_id: int,
        role: str | None = None,
        allowed_sources: list[str] | None = None,
        is_active: bool | None = None,
        menu_role_ids: list[int] | None = None,
    ) -> AuthenticatedUser:
        if role is not None:
            self._validate_role(role)
        if allowed_sources is not None:
            allowed_sources = self._normalize_allowed_sources(allowed_sources, role=role or "user")
        normalized_menu_role_ids = None
        if menu_role_ids is not None:
            normalized_menu_role_ids = self._validate_menu_role_ids(menu_role_ids)

        updated = self.repository.update_user_access(
            target_user_id,
            role=role,
            allowed_sources=allowed_sources,
            is_active=is_active,
            menu_role_ids=normalized_menu_role_ids,
        )
        if updated is None:
            raise ValueError("User not found.")
        if is_active is False:
            self.repository.delete_sessions_by_user(target_user_id)
        return updated

    def reset_password(self, *, target_user_id: int, new_password: str) -> AuthenticatedUser:
        self._validate_password(new_password)
        updated = self.repository.update_password_hash(
            target_user_id,
            self.hash_password(new_password, iterations=self.settings.auth_password_iterations),
        )
        if updated is None:
            raise ValueError("User not found.")
        self.repository.delete_sessions_by_user(target_user_id)
        return updated

    def change_password(
        self,
        *,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> AuthenticatedUser:
        record = self.repository.get_user_record_by_id(user_id)
        if record is None:
            raise ValueError("User not found.")
        if not self.verify_password(current_password, record.password_hash):
            raise PermissionError("Current password is incorrect.")

        self._validate_password(new_password)
        updated = self.repository.update_password_hash(
            user_id,
            self.hash_password(new_password, iterations=self.settings.auth_password_iterations),
        )
        if updated is None:
            raise ValueError("User not found.")
        self.repository.delete_sessions_by_user(user_id)
        return updated

    def delete_user(self, *, target_user_id: int, acting_user_id: int) -> AuthenticatedUser:
        if target_user_id == acting_user_id:
            raise ValueError("Administrators cannot delete their own account.")
        self.repository.delete_sessions_by_user(target_user_id)
        deleted = self.repository.delete_user(target_user_id)
        if deleted is None:
            raise ValueError("User not found.")
        return deleted

    def list_org_units(self) -> list[OrgUnitRecord]:
        return self.repository.list_org_units()

    def list_org_unit_tree(self) -> list[dict]:
        return self._build_tree(
            items=self.repository.list_org_units(),
            item_id=lambda item: item.id,
            parent_id=lambda item: item.parent_id,
            serializer=lambda item: {
                "id": item.id,
                "parent_id": item.parent_id,
                "org_code": item.org_code,
                "org_name": item.org_name,
                "org_type": item.org_type,
                "org_desc": item.org_desc,
                "sort_order": item.sort_order,
                "assigned_user_count": item.assigned_user_count,
            },
            child_key="children",
        )

    def create_org_unit(
        self,
        *,
        org_code: str,
        org_name: str,
        org_type: str = "department",
        parent_id: int | None = None,
        org_desc: str | None = None,
        sort_order: int = 100,
    ) -> OrgUnitRecord:
        normalized_org_code = self._validate_org_code(org_code)
        normalized_org_name = self._normalize_org_name(org_name)
        normalized_org_type = self._normalize_org_type(org_type)
        normalized_parent_id = self._validate_org_parent_id(parent_id)
        self._ensure_org_code_available(normalized_org_code)
        return self.repository.create_org_unit(
            parent_id=normalized_parent_id,
            org_code=normalized_org_code,
            org_name=normalized_org_name,
            org_type=normalized_org_type,
            org_desc=self._normalize_org_desc(org_desc),
            sort_order=max(0, int(sort_order)),
        )

    def update_org_unit(
        self,
        *,
        org_unit_id: int,
        org_code: str | None = None,
        org_name: str | None = None,
        org_type: str | None = None,
        parent_id: int | None = None,
        org_desc: str | None = None,
        sort_order: int | None = None,
    ) -> OrgUnitRecord:
        current = self.repository.get_org_unit_by_id(org_unit_id)
        if current is None:
            raise ValueError("Organization unit not found.")

        normalized_org_code = current.org_code
        if org_code is not None and org_code.strip() != current.org_code:
            normalized_org_code = self._validate_org_code(org_code)
            self._ensure_org_code_available(normalized_org_code, exclude_org_unit_id=current.id)

        normalized_org_name = current.org_name
        if org_name is not None:
            normalized_org_name = self._normalize_org_name(org_name)

        normalized_org_type = current.org_type
        if org_type is not None:
            normalized_org_type = self._normalize_org_type(org_type)

        normalized_parent_id = current.parent_id
        if parent_id is not None:
            normalized_parent_id = self._validate_org_parent_id(parent_id)
            if normalized_parent_id == current.id:
                raise ValueError("An organization unit cannot be its own parent.")

        updated = self.repository.update_org_unit(
            org_unit_id,
            parent_id=normalized_parent_id,
            org_code=normalized_org_code,
            org_name=normalized_org_name,
            org_type=normalized_org_type,
            org_desc=self._normalize_org_desc(org_desc) if org_desc is not None else current.org_desc,
            sort_order=max(0, int(sort_order)) if sort_order is not None else current.sort_order,
        )
        if updated is None:
            raise ValueError("Organization unit not found.")
        return updated

    def delete_org_unit(self, *, org_unit_id: int) -> OrgUnitRecord:
        current = self.repository.get_org_unit_by_id(org_unit_id)
        if current is None:
            raise ValueError("Organization unit not found.")
        if current.org_code == "root":
            raise ValueError("Default organization root cannot be deleted.")
        if self.repository.count_org_unit_children(org_unit_id) > 0:
            raise ValueError("Please remove child organization units before deleting this node.")
        if self.repository.count_users_in_org_unit(org_unit_id) > 0:
            raise ValueError("Please move users out of this organization unit before deleting it.")
        deleted = self.repository.delete_org_unit(org_unit_id)
        if deleted is None:
            raise ValueError("Organization unit not found.")
        return deleted

    def list_menu_roles(self) -> list[MenuRoleRecord]:
        return self.repository.list_menu_roles()

    def create_menu_role(
        self,
        *,
        role_code: str,
        role_name: str,
        role_desc: str | None = None,
        menu_ids: list[int] | None = None,
    ) -> MenuRoleRecord:
        normalized_role_code = self._validate_role_code(role_code)
        normalized_role_name = self._normalize_role_name(role_name)
        self._ensure_menu_role_code_available(normalized_role_code)
        self._ensure_menu_role_name_available(normalized_role_name)
        normalized_menu_ids = self._validate_menu_ids(menu_ids)
        return self.repository.create_menu_role(
            role_code=normalized_role_code,
            role_name=normalized_role_name,
            role_desc=(role_desc or "").strip() or None,
            menu_ids=normalized_menu_ids,
        )

    def update_menu_role(
        self,
        *,
        menu_role_id: int,
        role_code: str | None = None,
        role_name: str | None = None,
        role_desc: str | None = None,
        menu_ids: list[int] | None = None,
    ) -> MenuRoleRecord:
        current = self.repository.get_menu_role_by_id(menu_role_id)
        if current is None:
            raise ValueError("Menu role not found.")

        normalized_role_code = current.role_code
        if role_code is not None and role_code.strip() != current.role_code:
            normalized_role_code = self._validate_role_code(role_code)
            self._ensure_menu_role_code_available(normalized_role_code, exclude_role_id=current.id)

        normalized_role_name = current.role_name
        if role_name is not None and role_name.strip() != current.role_name:
            normalized_role_name = self._normalize_role_name(role_name)
            self._ensure_menu_role_name_available(normalized_role_name, exclude_role_id=current.id)

        normalized_menu_ids = None
        if menu_ids is not None:
            normalized_menu_ids = self._validate_menu_ids(menu_ids)

        updated = self.repository.update_menu_role(
            menu_role_id,
            role_code=normalized_role_code,
            role_name=normalized_role_name,
            role_desc=(role_desc or "").strip() if role_desc is not None else current.role_desc,
            menu_ids=normalized_menu_ids,
        )
        if updated is None:
            raise ValueError("Menu role not found.")
        return updated

    def delete_menu_role(self, *, menu_role_id: int) -> MenuRoleRecord:
        current = self.repository.get_menu_role_by_id(menu_role_id)
        if current is None:
            raise ValueError("Menu role not found.")
        if current.role_code in {"platform_admin", "knowledge_operator"}:
            raise ValueError("Default menu roles cannot be deleted.")
        if current.assigned_user_count > 0:
            raise ValueError("Please remove users from this menu role before deleting it.")
        deleted = self.repository.delete_menu_role(menu_role_id)
        if deleted is None:
            raise ValueError("Menu role not found.")
        return deleted

    def list_menu_items(self) -> list[MenuItemRecord]:
        return self.repository.list_menu_items()

    def list_menu_item_tree(self) -> list[dict]:
        return self._build_tree(
            items=self.repository.list_menu_items(),
            item_id=lambda item: item.id,
            parent_id=lambda item: item.parent_id,
            serializer=lambda item: {
                "id": item.id,
                "parent_id": item.parent_id,
                "menu_code": item.menu_code,
                "name": item.name,
                "router_name": item.router_name,
                "router_path": item.router_path,
                "icon_url": item.icon_url,
                "href": item.href,
                "is_visible": item.is_visible,
                "remark": item.remark,
                "sort_order": item.sort_order,
            },
            child_key="children",
        )

    def create_menu_item(
        self,
        *,
        menu_code: str,
        name: str,
        parent_id: int | None = None,
        router_name: str | None = None,
        router_path: str | None = None,
        icon_url: str | None = None,
        href: str | None = None,
        is_visible: bool = True,
        remark: str | None = None,
        sort_order: int = 100,
    ) -> MenuItemRecord:
        normalized_menu_code = self._validate_menu_code(menu_code)
        self._ensure_menu_item_code_available(normalized_menu_code)
        normalized_name = self._normalize_menu_name(name)
        normalized_parent_id = self._validate_menu_parent_id(parent_id)
        return self.repository.create_menu_item(
            menu_code=normalized_menu_code,
            name=normalized_name,
            parent_id=normalized_parent_id,
            router_name=(router_name or "").strip() or None,
            router_path=(router_path or "").strip() or None,
            icon_url=(icon_url or "").strip() or None,
            href=(href or "").strip() or None,
            is_visible=is_visible,
            remark=(remark or "").strip() or None,
            sort_order=max(0, int(sort_order)),
        )

    def update_menu_item(
        self,
        *,
        menu_item_id: int,
        menu_code: str | None = None,
        name: str | None = None,
        parent_id: int | None = None,
        router_name: str | None = None,
        router_path: str | None = None,
        icon_url: str | None = None,
        href: str | None = None,
        is_visible: bool | None = None,
        remark: str | None = None,
        sort_order: int | None = None,
    ) -> MenuItemRecord:
        current = self.repository.get_menu_item_by_id(menu_item_id)
        if current is None:
            raise ValueError("Menu item not found.")

        normalized_menu_code = current.menu_code
        if menu_code is not None and menu_code.strip() != current.menu_code:
            normalized_menu_code = self._validate_menu_code(menu_code)
            self._ensure_menu_item_code_available(normalized_menu_code, exclude_menu_id=current.id)

        normalized_name = current.name
        if name is not None:
            normalized_name = self._normalize_menu_name(name)

        normalized_parent_id = current.parent_id
        if parent_id is not None:
            normalized_parent_id = self._validate_menu_parent_id(parent_id)
            if normalized_parent_id == current.id:
                raise ValueError("A menu item cannot be its own parent.")

        updated = self.repository.update_menu_item(
            menu_item_id,
            menu_code=normalized_menu_code,
            name=normalized_name,
            parent_id=normalized_parent_id if normalized_parent_id is not None else current.parent_id,
            router_name=(router_name or "").strip() if router_name is not None else current.router_name,
            router_path=(router_path or "").strip() if router_path is not None else current.router_path,
            icon_url=(icon_url or "").strip() if icon_url is not None else current.icon_url,
            href=(href or "").strip() if href is not None else current.href,
            is_visible=is_visible if is_visible is not None else current.is_visible,
            remark=(remark or "").strip() if remark is not None else current.remark,
            sort_order=max(0, int(sort_order)) if sort_order is not None else current.sort_order,
        )
        if updated is None:
            raise ValueError("Menu item not found.")
        return updated

    def delete_menu_item(self, *, menu_item_id: int) -> MenuItemRecord:
        current = self.repository.get_menu_item_by_id(menu_item_id)
        if current is None:
            raise ValueError("Menu item not found.")
        deleted = self.repository.delete_menu_item(menu_item_id)
        if deleted is None:
            raise ValueError("Menu item not found.")
        return deleted

    def get_permission_bootstrap(self) -> dict:
        source_catalog = [
            self.serialize_knowledge_source(source)
            for source in getattr(self.repository, "list_knowledge_sources", lambda: [])()
        ]
        return {
            "org_units": self.list_org_unit_tree(),
            "menu_roles": [self.serialize_menu_role(item) for item in self.list_menu_roles()],
            "menu_items": self.list_menu_item_tree(),
            "system_roles": [{"value": "admin", "label": "管理员"}, {"value": "user", "label": "普通用户"}],
            "status_options": [{"value": True, "label": "启用"}, {"value": False, "label": "停用"}],
            "valid_sources": list(self.settings.valid_sources),
            "source_catalog": source_catalog,
        }

    @staticmethod
    def serialize_menu_role(role: MenuRoleRecord) -> dict:
        return {
            "id": role.id,
            "role_code": role.role_code,
            "role_name": role.role_name,
            "role_desc": role.role_desc,
            "menu_ids": list(role.menu_ids),
            "menu_codes": list(role.menu_codes),
            "menu_names": list(role.menu_names),
            "assigned_user_count": role.assigned_user_count,
            "created_at": role.created_at,
            "updated_at": role.updated_at,
        }

    @staticmethod
    def serialize_knowledge_source(source: KnowledgeSourceRecord) -> dict:
        return {
            "code": source.source_code,
            "display_name": source.display_name,
            "name": source.display_name,
            "description": source.description,
            "is_active": source.is_active,
        }

    @staticmethod
    def hash_password(password: str, *, iterations: int) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return "$".join(
            (
                "pbkdf2_sha256",
                str(iterations),
                base64.b64encode(salt).decode("ascii"),
                base64.b64encode(digest).decode("ascii"),
            )
        )

    @staticmethod
    def verify_password(password: str, encoded_hash: str) -> bool:
        try:
            algorithm, iterations_raw, salt_raw, digest_raw = encoded_hash.split("$", 3)
            if algorithm != "pbkdf2_sha256":
                return False
            iterations = int(iterations_raw)
            salt = base64.b64decode(salt_raw.encode("ascii"))
            expected = base64.b64decode(digest_raw.encode("ascii"))
        except Exception:
            return False

        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(candidate, expected)

    def _validate_username(self, username: str) -> str:
        normalized = (username or "").strip()
        if len(normalized) < self.settings.auth_username_min_length:
            raise ValueError(
                f"Username must be at least {self.settings.auth_username_min_length} characters long."
            )
        if len(normalized) > 64:
            raise ValueError("Username is too long.")
        if not USERNAME_PATTERN.match(normalized):
            raise ValueError("Username can only contain letters, numbers, underscore, dash, and dot.")
        return normalized

    def _validate_password(self, password: str) -> None:
        if len(password or "") < self.settings.auth_password_min_length:
            raise ValueError(
                f"Password must be at least {self.settings.auth_password_min_length} characters long."
            )

    @staticmethod
    def _validate_role(role: str) -> None:
        if role not in {"admin", "user"}:
            raise ValueError("Unsupported role.")

    def _normalize_allowed_sources(self, allowed_sources: list[str] | None, *, role: str) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        invalid: list[str] = []
        for value in allowed_sources or []:
            source = str(value).strip()
            if not source:
                continue
            if not SOURCE_NAME_PATTERN.fullmatch(source):
                invalid.append(source)
                continue
            if source not in seen:
                normalized.append(source)
                seen.add(source)
        if invalid:
            raise ValueError("Invalid sources: use 1-50 letters, numbers, underscores, or hyphens.")
        if role == "admin" and not normalized:
            return list(self.settings.valid_sources)
        return normalized

    @staticmethod
    def _normalize_display_name(display_name: str | None, *, fallback: str) -> str:
        normalized = (display_name or "").strip() or fallback
        if len(normalized) > 64:
            raise ValueError("Display name is too long.")
        return normalized

    @staticmethod
    def _normalize_work_no(work_no: str | None, *, fallback: str) -> str:
        normalized = (work_no or "").strip() or fallback
        if not WORK_NO_PATTERN.fullmatch(normalized):
            raise ValueError("Work number can only contain letters, numbers, underscore, dash, and dot.")
        return normalized

    @staticmethod
    def _validate_org_code(org_code: str) -> str:
        normalized = (org_code or "").strip().lower()
        if not ORG_CODE_PATTERN.fullmatch(normalized):
            raise ValueError("Organization code must start with a letter and use lowercase letters, numbers, or underscores.")
        return normalized

    @staticmethod
    def _normalize_org_name(org_name: str) -> str:
        normalized = (org_name or "").strip()
        if not normalized:
            raise ValueError("Organization name is required.")
        if len(normalized) > 128:
            raise ValueError("Organization name is too long.")
        return normalized

    @staticmethod
    def _normalize_org_type(org_type: str | None) -> str:
        normalized = (org_type or "").strip().lower() or "department"
        if not ORG_TYPE_PATTERN.fullmatch(normalized):
            raise ValueError("Organization type must start with a letter and use lowercase letters, numbers, underscores, or hyphens.")
        return normalized

    @staticmethod
    def _normalize_org_desc(org_desc: str | None) -> str | None:
        normalized = (org_desc or "").strip()
        if not normalized:
            return None
        if len(normalized) > 255:
            raise ValueError("Organization description is too long.")
        return normalized

    def _validate_org_parent_id(self, parent_id: int | None) -> int | None:
        if parent_id is None:
            return None
        if int(parent_id) <= 0:
            return None
        org = self.repository.get_org_unit_by_id(int(parent_id))
        if org is None:
            raise ValueError("Organization parent not found.")
        return org.id

    def _validate_org_unit_id(self, org_unit_id: int | None) -> int | None:
        if org_unit_id is None:
            return None
        org = self.repository.get_org_unit_by_id(int(org_unit_id))
        if org is None:
            raise ValueError("Organization unit not found.")
        return org.id

    def _validate_menu_role_ids(self, menu_role_ids: list[int] | None) -> list[int]:
        normalized = self._normalize_int_ids(menu_role_ids)
        if not normalized:
            return []
        available = {item.id for item in self.repository.list_menu_roles()}
        missing = [item for item in normalized if item not in available]
        if missing:
            raise ValueError("Menu role not found.")
        return normalized

    def _validate_menu_ids(self, menu_ids: list[int] | None) -> list[int]:
        normalized = self._normalize_int_ids(menu_ids)
        if not normalized:
            return []
        available = {item.id for item in self.repository.list_menu_items()}
        missing = [item for item in normalized if item not in available]
        if missing:
            raise ValueError("Menu item not found.")
        return normalized

    @staticmethod
    def _validate_role_code(role_code: str) -> str:
        normalized = (role_code or "").strip().lower()
        if not ROLE_CODE_PATTERN.fullmatch(normalized):
            raise ValueError("Role code must start with a letter and use lowercase letters, numbers, or underscores.")
        return normalized

    @staticmethod
    def _normalize_role_name(role_name: str) -> str:
        normalized = (role_name or "").strip()
        if not normalized:
            raise ValueError("Role name is required.")
        if len(normalized) > 64:
            raise ValueError("Role name is too long.")
        return normalized

    @staticmethod
    def _validate_menu_code(menu_code: str) -> str:
        normalized = (menu_code or "").strip().lower()
        if not MENU_CODE_PATTERN.fullmatch(normalized):
            raise ValueError("Menu code must start with a letter and use lowercase letters, numbers, or underscores.")
        return normalized

    @staticmethod
    def _normalize_menu_name(name: str) -> str:
        normalized = (name or "").strip()
        if not normalized:
            raise ValueError("Menu name is required.")
        if len(normalized) > 128:
            raise ValueError("Menu name is too long.")
        return normalized

    def _validate_menu_parent_id(self, parent_id: int | None) -> int | None:
        if parent_id is None:
            return None
        if int(parent_id) <= 0:
            return None
        item = self.repository.get_menu_item_by_id(int(parent_id))
        if item is None:
            raise ValueError("Menu parent not found.")
        return item.id

    def _ensure_username_available(self, username: str, *, exclude_user_id: int | None = None) -> None:
        existing = self.repository.get_user_record_by_username(username)
        if existing is not None and existing.id != exclude_user_id:
            raise ValueError("Username already exists.")

    def _ensure_work_no_available(self, work_no: str, *, exclude_user_id: int | None = None) -> None:
        existing = self.repository.get_user_record_by_work_no(work_no)
        if existing is not None and existing.id != exclude_user_id:
            raise ValueError("Work number already exists.")

    def _ensure_org_code_available(self, org_code: str, *, exclude_org_unit_id: int | None = None) -> None:
        existing = self.repository.get_org_unit_by_code(org_code)
        if existing is not None and existing.id != exclude_org_unit_id:
            raise ValueError("Organization code already exists.")

    def _ensure_menu_role_code_available(self, role_code: str, *, exclude_role_id: int | None = None) -> None:
        existing = self.repository.get_menu_role_by_code(role_code)
        if existing is not None and existing.id != exclude_role_id:
            raise ValueError("Role code already exists.")

    def _ensure_menu_role_name_available(self, role_name: str, *, exclude_role_id: int | None = None) -> None:
        for item in self.repository.list_menu_roles():
            if item.role_name == role_name and item.id != exclude_role_id:
                raise ValueError("Role name already exists.")

    def _ensure_menu_item_code_available(self, menu_code: str, *, exclude_menu_id: int | None = None) -> None:
        existing = self.repository.get_menu_item_by_code(menu_code)
        if existing is not None and existing.id != exclude_menu_id:
            raise ValueError("Menu code already exists.")

    def _issue_session_token(self, user_id: int) -> str:
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.settings.auth_session_ttl_days)
        self.repository.create_session(
            user_id=user_id,
            token_hash=self._hash_session_token(session_token),
            expires_at=expires_at.strftime("%Y-%m-%d %H:%M:%S"),
        )
        return session_token

    @staticmethod
    def _hash_session_token(session_token: str) -> str:
        return hashlib.sha256(session_token.encode("utf-8")).hexdigest()

    @staticmethod
    def _to_authenticated_user(record) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=record.id,
            username=record.username,
            role=record.role,
            allowed_sources=record.allowed_sources,
            is_active=record.is_active,
            created_at=record.created_at,
            display_name=getattr(record, "display_name", None),
            work_no=getattr(record, "work_no", None),
            org_unit_id=getattr(record, "org_unit_id", None),
            org_name=getattr(record, "org_name", None),
            menu_role_ids=getattr(record, "menu_role_ids", ()),
            menu_role_names=getattr(record, "menu_role_names", ()),
        )

    @staticmethod
    def _normalize_int_ids(values: list[int] | None) -> list[int]:
        normalized: list[int] = []
        seen: set[int] = set()
        for value in values or []:
            try:
                current = int(value)
            except (TypeError, ValueError):
                continue
            if current <= 0 or current in seen:
                continue
            normalized.append(current)
            seen.add(current)
        return normalized

    @staticmethod
    def _build_tree(*, items, item_id, parent_id, serializer, child_key: str) -> list[dict]:
        nodes: dict[int, dict] = {}
        roots: list[dict] = []
        ordered_items = list(items)
        for item in ordered_items:
            payload = serializer(item)
            payload[child_key] = []
            nodes[item_id(item)] = payload
        for item in ordered_items:
            payload = nodes[item_id(item)]
            parent = parent_id(item)
            if parent is None or parent not in nodes:
                roots.append(payload)
                continue
            nodes[parent][child_key].append(payload)
        return roots
