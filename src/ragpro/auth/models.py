from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    username: str
    role: str
    allowed_sources: tuple[str, ...]
    is_active: bool
    created_at: str | None = None
    display_name: str | None = None
    work_no: str | None = None
    org_unit_id: int | None = None
    org_name: str | None = None
    menu_role_ids: tuple[int, ...] = field(default_factory=tuple)
    menu_role_names: tuple[str, ...] = field(default_factory=tuple)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


@dataclass(frozen=True)
class UserRecord(AuthenticatedUser):
    password_hash: str = ""


@dataclass(frozen=True)
class SessionRecord:
    user_id: int
    token_hash: str
    expires_at: str


@dataclass(frozen=True)
class AuthResult:
    user: AuthenticatedUser
    session_token: str


@dataclass(frozen=True)
class AuditLogRecord:
    id: int
    action: str
    actor_user_id: int | None
    actor_username: str | None
    actor_role: str | None
    target_user_id: int | None
    target_username: str | None
    target_role: str | None
    metadata: dict
    created_at: str | None = None


@dataclass(frozen=True)
class OrgUnitRecord:
    id: int
    parent_id: int | None
    org_code: str
    org_name: str
    org_type: str
    org_desc: str | None = None
    sort_order: int = 100
    assigned_user_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True)
class MenuRoleRecord:
    id: int
    role_code: str
    role_name: str
    role_desc: str | None = None
    menu_ids: tuple[int, ...] = field(default_factory=tuple)
    menu_codes: tuple[str, ...] = field(default_factory=tuple)
    menu_names: tuple[str, ...] = field(default_factory=tuple)
    assigned_user_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True)
class MenuItemRecord:
    id: int
    parent_id: int | None
    menu_code: str
    name: str
    router_name: str | None = None
    router_path: str | None = None
    icon_url: str | None = None
    href: str | None = None
    is_visible: bool = True
    remark: str | None = None
    sort_order: int = 100
    created_at: str | None = None
    updated_at: str | None = None


@dataclass(frozen=True)
class KnowledgeSourceRecord:
    id: int
    source_code: str
    display_name: str
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100
    created_by: int | None = None
    created_at: str | None = None
    updated_at: str | None = None
