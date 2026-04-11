from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from ragpro.config import get_settings

from .models import AuthResult, AuthenticatedUser
from .repository import AuthMySQLRepository

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")


class AuthService:
    def __init__(self, repository: AuthMySQLRepository) -> None:
        self.repository = repository
        self.settings = get_settings()

    def register(self, *, username: str, password: str) -> AuthResult:
        normalized_username = self._validate_username(username)
        self._validate_password(password)

        existing = self.repository.get_user_record_by_username(normalized_username)
        if existing is not None:
            raise ValueError("Username already exists.")

        is_first_user = self.repository.count_users() == 0
        role = "admin" if is_first_user else "user"
        allowed_sources = self.settings.valid_sources if is_first_user else ()

        user = self.repository.create_user(
            username=normalized_username,
            password_hash=self.hash_password(password, iterations=self.settings.auth_password_iterations),
            role=role,
            allowed_sources=allowed_sources,
            is_active=True,
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

    def list_users(self) -> list[AuthenticatedUser]:
        return self.repository.list_users()

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
    ) -> AuthenticatedUser:
        normalized_username = self._validate_username(username)
        self._validate_password(password)
        self._validate_role(role)
        normalized_sources = self._normalize_allowed_sources(allowed_sources, role=role)

        existing = self.repository.get_user_record_by_username(normalized_username)
        if existing is not None:
            raise ValueError("Username already exists.")

        return self.repository.create_user(
            username=normalized_username,
            password_hash=self.hash_password(password, iterations=self.settings.auth_password_iterations),
            role=role,
            allowed_sources=normalized_sources,
            is_active=is_active,
        )

    def update_user_access(
        self,
        *,
        target_user_id: int,
        role: str | None = None,
        allowed_sources: list[str] | None = None,
        is_active: bool | None = None,
    ) -> AuthenticatedUser:
        if role is not None:
            self._validate_role(role)
        if allowed_sources is not None:
            allowed_sources = self._normalize_allowed_sources(allowed_sources, role=role or "user")

        updated = self.repository.update_user_access(
            target_user_id,
            role=role,
            allowed_sources=allowed_sources,
            is_active=is_active,
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
        normalized = [str(value).strip() for value in (allowed_sources or []) if str(value).strip()]
        invalid = [value for value in normalized if value not in self.settings.valid_sources]
        if invalid:
            raise ValueError(f"Invalid sources: {invalid}")
        if role == "admin" and not normalized:
            return list(self.settings.valid_sources)
        return normalized

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
        )
