from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    username: str
    role: str
    allowed_sources: tuple[str, ...]
    is_active: bool
    created_at: str | None = None

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
