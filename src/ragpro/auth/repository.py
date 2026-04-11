from __future__ import annotations

import json

import pymysql

from ragpro.config import get_logger, get_settings

from .models import AuditLogRecord, AuthenticatedUser, SessionRecord, UserRecord

logger = get_logger("ragpro.auth.repository")


class AuthMySQLRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._ensure_database()
        self.connection = pymysql.connect(
            host=self.settings.mysql_host,
            user=self.settings.mysql_user,
            password=self.settings.mysql_password,
            database=self.settings.mysql_database,
            charset="utf8mb4",
            autocommit=False,
        )
        self.cursor = self.connection.cursor()
        self.ensure_tables()
        logger.info("Auth MySQL connection established.")

    def _ensure_database(self) -> None:
        bootstrap = pymysql.connect(
            host=self.settings.mysql_host,
            user=self.settings.mysql_user,
            password=self.settings.mysql_password,
            charset="utf8mb4",
        )
        try:
            with bootstrap.cursor() as cursor:
                cursor.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{self.settings.mysql_database}` "
                    "DEFAULT CHARACTER SET utf8mb4"
                )
            bootstrap.commit()
        finally:
            bootstrap.close()

    def ensure_tables(self) -> None:
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(64) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                allowed_sources TEXT NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(64) NOT NULL,
                actor_user_id INT NULL,
                actor_username VARCHAR(64) NULL,
                actor_role VARCHAR(20) NULL,
                target_user_id INT NULL,
                target_username VARCHAR(64) NULL,
                target_role VARCHAR(20) NULL,
                metadata_json TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_auth_audit_action (action),
                INDEX idx_auth_audit_actor (actor_user_id),
                INDEX idx_auth_audit_target (target_user_id),
                INDEX idx_auth_audit_created (created_at)
            )
            """
        )
        self.connection.commit()

    def count_users(self) -> int:
        self.cursor.execute("SELECT COUNT(*) FROM users")
        row = self.cursor.fetchone()
        return int(row[0] if row else 0)

    def create_user(
        self,
        *,
        username: str,
        password_hash: str,
        role: str,
        allowed_sources: tuple[str, ...] | list[str],
        is_active: bool = True,
    ) -> AuthenticatedUser:
        self.cursor.execute(
            """
            INSERT INTO users (username, password_hash, role, allowed_sources, is_active)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                username,
                password_hash,
                role,
                json.dumps(list(allowed_sources), ensure_ascii=False),
                1 if is_active else 0,
            ),
        )
        self.connection.commit()
        user_id = int(self.cursor.lastrowid)
        user = self.get_user_by_id(user_id)
        if user is None:
            raise RuntimeError("Created user could not be loaded.")
        return user

    def get_user_record_by_username(self, username: str) -> UserRecord | None:
        self.cursor.execute(
            """
            SELECT id, username, role, allowed_sources, is_active, created_at, password_hash
            FROM users
            WHERE username = %s
            LIMIT 1
            """,
            (username,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user_record(row)

    def get_user_by_id(self, user_id: int) -> AuthenticatedUser | None:
        self.cursor.execute(
            """
            SELECT id, username, role, allowed_sources, is_active, created_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user(row)

    def get_user_record_by_id(self, user_id: int) -> UserRecord | None:
        self.cursor.execute(
            """
            SELECT id, username, role, allowed_sources, is_active, created_at, password_hash
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user_record(row)

    def list_users(self) -> list[AuthenticatedUser]:
        self.cursor.execute(
            """
            SELECT id, username, role, allowed_sources, is_active, created_at
            FROM users
            ORDER BY id ASC
            """
        )
        return [user for user in (self._row_to_user(row) for row in self.cursor.fetchall()) if user is not None]

    def update_user_access(
        self,
        user_id: int,
        *,
        role: str | None = None,
        allowed_sources: tuple[str, ...] | list[str] | None = None,
        is_active: bool | None = None,
    ) -> AuthenticatedUser | None:
        assignments: list[str] = []
        values: list[object] = []

        if role is not None:
            assignments.append("role = %s")
            values.append(role)
        if allowed_sources is not None:
            assignments.append("allowed_sources = %s")
            values.append(json.dumps(list(allowed_sources), ensure_ascii=False))
        if is_active is not None:
            assignments.append("is_active = %s")
            values.append(1 if is_active else 0)

        if not assignments:
            return self.get_user_by_id(user_id)

        assignments.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)
        self.cursor.execute(
            f"UPDATE users SET {', '.join(assignments)} WHERE id = %s",
            tuple(values),
        )
        self.connection.commit()
        return self.get_user_by_id(user_id)

    def update_password_hash(self, user_id: int, password_hash: str) -> AuthenticatedUser | None:
        self.cursor.execute(
            """
            UPDATE users
            SET password_hash = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (password_hash, user_id),
        )
        self.connection.commit()
        return self.get_user_by_id(user_id)

    def create_session(self, *, user_id: int, token_hash: str, expires_at: str) -> None:
        self.cursor.execute(
            """
            INSERT INTO auth_sessions (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )
        self.connection.commit()

    def get_session(self, token_hash: str) -> SessionRecord | None:
        self.cursor.execute(
            """
            SELECT user_id, token_hash, DATE_FORMAT(expires_at, '%%Y-%%m-%%dT%%H:%%i:%%s')
            FROM auth_sessions
            WHERE token_hash = %s
            LIMIT 1
            """,
            (token_hash,),
        )
        row = self.cursor.fetchone()
        if not row:
            return None
        return SessionRecord(user_id=int(row[0]), token_hash=str(row[1]), expires_at=str(row[2]))

    def touch_session(self, token_hash: str) -> None:
        self.cursor.execute(
            """
            UPDATE auth_sessions
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        self.connection.commit()

    def delete_session(self, token_hash: str) -> None:
        self.cursor.execute("DELETE FROM auth_sessions WHERE token_hash = %s", (token_hash,))
        self.connection.commit()

    def delete_sessions_by_user(self, user_id: int) -> int:
        self.cursor.execute("DELETE FROM auth_sessions WHERE user_id = %s", (user_id,))
        deleted = int(self.cursor.rowcount or 0)
        self.connection.commit()
        return deleted

    def delete_user(self, user_id: int) -> AuthenticatedUser | None:
        user = self.get_user_by_id(user_id)
        if user is None:
            return None

        self.cursor.execute("DELETE FROM auth_sessions WHERE user_id = %s", (user_id,))
        self.cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        self.connection.commit()
        return user

    def delete_expired_sessions(self) -> int:
        self.cursor.execute("DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP")
        deleted = int(self.cursor.rowcount or 0)
        self.connection.commit()
        return deleted

    def create_audit_log(
        self,
        *,
        action: str,
        actor_user_id: int | None = None,
        actor_username: str | None = None,
        actor_role: str | None = None,
        target_user_id: int | None = None,
        target_username: str | None = None,
        target_role: str | None = None,
        metadata: dict | None = None,
    ) -> AuditLogRecord:
        self.cursor.execute(
            """
            INSERT INTO auth_audit_logs (
                action,
                actor_user_id,
                actor_username,
                actor_role,
                target_user_id,
                target_username,
                target_role,
                metadata_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                action,
                actor_user_id,
                actor_username,
                actor_role,
                target_user_id,
                target_username,
                target_role,
                json.dumps(metadata or {}, ensure_ascii=False),
            ),
        )
        self.connection.commit()
        audit_log_id = int(self.cursor.lastrowid)
        self.cursor.execute(
            """
            SELECT
                id,
                action,
                actor_user_id,
                actor_username,
                actor_role,
                target_user_id,
                target_username,
                target_role,
                metadata_json,
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s')
            FROM auth_audit_logs
            WHERE id = %s
            LIMIT 1
            """,
            (audit_log_id,),
        )
        row = self.cursor.fetchone()
        if not row:
            raise RuntimeError("Created audit log could not be loaded.")
        return self._row_to_audit_log(row)

    def list_audit_logs(
        self,
        *,
        limit: int = 100,
        action: str | None = None,
        search: str | None = None,
        sensitive_only: bool = False,
        start_at: str | None = None,
        end_at: str | None = None,
    ) -> list[AuditLogRecord]:
        safe_limit = max(1, min(int(limit), 200))
        sensitive_actions = ("reset_password", "delete_user", "change_password", "update_user_access")
        where_clauses: list[str] = []
        values: list[object] = []

        if action:
            where_clauses.append("action = %s")
            values.append(action)

        if search:
            keyword = f"%{search}%"
            where_clauses.append("(actor_username LIKE %s OR target_username LIKE %s)")
            values.extend([keyword, keyword])

        if start_at:
            where_clauses.append("created_at >= %s")
            values.append(start_at.replace("T", " "))

        if end_at:
            where_clauses.append("created_at <= %s")
            values.append(end_at.replace("T", " "))

        if sensitive_only:
            placeholders = ", ".join(["%s"] * len(sensitive_actions))
            where_clauses.append(f"action IN ({placeholders})")
            values.extend(sensitive_actions)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"""
            SELECT
                id,
                action,
                actor_user_id,
                actor_username,
                actor_role,
                target_user_id,
                target_username,
                target_role,
                metadata_json,
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s')
            FROM auth_audit_logs
            {where_sql}
            ORDER BY id DESC
            LIMIT %s
            """
        values.append(safe_limit)
        self.cursor.execute(query, tuple(values))
        return [log for log in (self._row_to_audit_log(row) for row in self.cursor.fetchall()) if log is not None]

    def close(self) -> None:
        self.connection.close()
        logger.info("Auth MySQL connection closed.")

    @staticmethod
    def _parse_allowed_sources(value: str | None) -> tuple[str, ...]:
        if not value:
            return ()
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return ()
        if not isinstance(parsed, list):
            return ()
        return tuple(str(item) for item in parsed if str(item).strip())

    def _row_to_user(self, row) -> AuthenticatedUser | None:
        if not row:
            return None
        return AuthenticatedUser(
            id=int(row[0]),
            username=str(row[1]),
            role=str(row[2]),
            allowed_sources=self._parse_allowed_sources(row[3]),
            is_active=bool(row[4]),
            created_at=str(row[5]) if row[5] is not None else None,
        )

    def _row_to_user_record(self, row) -> UserRecord | None:
        if not row:
            return None
        return UserRecord(
            id=int(row[0]),
            username=str(row[1]),
            role=str(row[2]),
            allowed_sources=self._parse_allowed_sources(row[3]),
            is_active=bool(row[4]),
            created_at=str(row[5]) if row[5] is not None else None,
            password_hash=str(row[6]),
        )

    def _row_to_audit_log(self, row) -> AuditLogRecord | None:
        if not row:
            return None
        try:
            metadata = json.loads(row[8]) if row[8] else {}
        except json.JSONDecodeError:
            metadata = {}
        if not isinstance(metadata, dict):
            metadata = {}
        return AuditLogRecord(
            id=int(row[0]),
            action=str(row[1]),
            actor_user_id=int(row[2]) if row[2] is not None else None,
            actor_username=str(row[3]) if row[3] is not None else None,
            actor_role=str(row[4]) if row[4] is not None else None,
            target_user_id=int(row[5]) if row[5] is not None else None,
            target_username=str(row[6]) if row[6] is not None else None,
            target_role=str(row[7]) if row[7] is not None else None,
            metadata=metadata,
            created_at=str(row[9]) if row[9] is not None else None,
        )
