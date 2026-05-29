from __future__ import annotations

import json

import pymysql

from ragpro.config import get_logger, get_settings
from ragpro.database.schema_comments import apply_schema_comments, specs_for_tables

from .models import (
    AuditLogRecord,
    AuthenticatedUser,
    MenuItemRecord,
    MenuRoleRecord,
    OrgUnitRecord,
    SessionRecord,
    UserRecord,
)

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
            cursorclass=pymysql.cursors.DictCursor,
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
            cursorclass=pymysql.cursors.DictCursor,
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
        self._ensure_users_columns()
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_auth_sessions_user_id (user_id),
                INDEX idx_auth_sessions_expires_at (expires_at)
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
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_org_units (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parent_id INT NULL,
                org_code VARCHAR(64) NOT NULL UNIQUE,
                org_name VARCHAR(128) NOT NULL,
                org_type VARCHAR(32) NOT NULL DEFAULT 'department',
                org_desc VARCHAR(255) NULL,
                sort_order INT NOT NULL DEFAULT 100,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_auth_org_units_parent (parent_id),
                INDEX idx_auth_org_units_sort (sort_order)
            )
            """
        )
        self._ensure_org_units_columns()
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parent_id INT NULL,
                menu_code VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(128) NOT NULL,
                router_name VARCHAR(64) NULL,
                router_path VARCHAR(255) NULL,
                icon_url VARCHAR(255) NULL,
                href VARCHAR(255) NULL,
                is_visible TINYINT(1) NOT NULL DEFAULT 1,
                remark VARCHAR(255) NULL,
                sort_order INT NOT NULL DEFAULT 100,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_auth_menu_items_parent (parent_id),
                INDEX idx_auth_menu_items_sort (sort_order)
            )
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_menu_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_code VARCHAR(64) NOT NULL UNIQUE,
                role_name VARCHAR(64) NOT NULL UNIQUE,
                role_desc VARCHAR(255) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_user_menu_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                menu_role_id INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_auth_user_menu_role (user_id, menu_role_id),
                INDEX idx_auth_user_menu_roles_user (user_id),
                INDEX idx_auth_user_menu_roles_role (menu_role_id)
            )
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_menu_role_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                menu_role_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_auth_menu_role_item (menu_role_id, menu_item_id),
                INDEX idx_auth_menu_role_items_role (menu_role_id),
                INDEX idx_auth_menu_role_items_item (menu_item_id)
            )
            """
        )
        apply_schema_comments(
            self.cursor,
            specs_for_tables(
                "users",
                "auth_sessions",
                "auth_audit_logs",
                "auth_org_units",
                "auth_menu_items",
                "auth_menu_roles",
                "auth_user_menu_roles",
                "auth_menu_role_items",
            ),
        )
        self.connection.commit()
        self._seed_defaults()

    def count_users(self) -> int:
        self.cursor.execute("SELECT COUNT(*) AS total FROM users")
        row = self.cursor.fetchone()
        return int((row or {}).get("total") or 0)

    def create_user(
        self,
        *,
        username: str,
        password_hash: str,
        role: str,
        allowed_sources: tuple[str, ...] | list[str],
        is_active: bool = True,
        display_name: str | None = None,
        work_no: str | None = None,
        org_unit_id: int | None = None,
        menu_role_ids: list[int] | tuple[int, ...] | None = None,
    ) -> AuthenticatedUser:
        resolved_org_unit_id = org_unit_id or self._default_org_unit_id_for_role(role)
        self.cursor.execute(
            """
            INSERT INTO users (
                username,
                password_hash,
                role,
                allowed_sources,
                is_active,
                display_name,
                work_no,
                org_unit_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                username,
                password_hash,
                role,
                json.dumps(list(allowed_sources), ensure_ascii=False),
                1 if is_active else 0,
                display_name or username,
                work_no or username,
                resolved_org_unit_id,
            ),
        )
        user_id = int(self.cursor.lastrowid)
        self._replace_user_menu_roles(
            user_id=user_id,
            menu_role_ids=menu_role_ids or self._default_menu_role_ids_for_system_role(role),
        )
        self.connection.commit()
        user = self.get_user_by_id(user_id)
        if user is None:
            raise RuntimeError("Created user could not be loaded.")
        return user

    def get_user_record_by_username(self, username: str) -> UserRecord | None:
        self.cursor.execute(
            self._user_select_sql("WHERE u.username = %s", suffix="LIMIT 1"),
            (username,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user_record(row)

    def get_user_by_id(self, user_id: int) -> AuthenticatedUser | None:
        self.cursor.execute(
            self._user_select_sql("WHERE u.id = %s", include_password=False, suffix="LIMIT 1"),
            (user_id,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user(row)

    def get_user_record_by_id(self, user_id: int) -> UserRecord | None:
        self.cursor.execute(
            self._user_select_sql("WHERE u.id = %s", suffix="LIMIT 1"),
            (user_id,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user_record(row)

    def get_user_record_by_work_no(self, work_no: str) -> UserRecord | None:
        self.cursor.execute(
            self._user_select_sql("WHERE u.work_no = %s", suffix="LIMIT 1"),
            (work_no,),
        )
        row = self.cursor.fetchone()
        return self._row_to_user_record(row)

    def list_users(
        self,
        *,
        login: str | None = None,
        work_no: str | None = None,
        display_name: str | None = None,
        org_unit_id: int | None = None,
    ) -> list[AuthenticatedUser]:
        where: list[str] = []
        values: list[object] = []
        if login:
            where.append("u.username LIKE %s")
            values.append(f"%{login}%")
        if work_no:
            where.append("u.work_no LIKE %s")
            values.append(f"%{work_no}%")
        if display_name:
            where.append("(u.display_name LIKE %s OR u.username LIKE %s)")
            values.extend([f"%{display_name}%", f"%{display_name}%"])
        if org_unit_id is not None:
            where.append("u.org_unit_id = %s")
            values.append(int(org_unit_id))
        where_clause = f"WHERE {' AND '.join(where)}" if where else ""
        self.cursor.execute(
            self._user_select_sql(where_clause, include_password=False, suffix="ORDER BY u.id ASC"),
            tuple(values),
        )
        return [user for user in (self._row_to_user(row) for row in self.cursor.fetchall()) if user is not None]

    def update_user_profile(
        self,
        user_id: int,
        *,
        username: str | None = None,
        display_name: str | None = None,
        work_no: str | None = None,
        org_unit_id: int | None = None,
        menu_role_ids: list[int] | tuple[int, ...] | None = None,
    ) -> AuthenticatedUser | None:
        assignments: list[str] = []
        values: list[object] = []
        if username is not None:
            assignments.append("username = %s")
            values.append(username)
        if display_name is not None:
            assignments.append("display_name = %s")
            values.append(display_name)
        if work_no is not None:
            assignments.append("work_no = %s")
            values.append(work_no)
        if org_unit_id is not None:
            assignments.append("org_unit_id = %s")
            values.append(org_unit_id)
        if assignments:
            assignments.append("updated_at = CURRENT_TIMESTAMP")
            values.append(user_id)
            self.cursor.execute(
                f"UPDATE users SET {', '.join(assignments)} WHERE id = %s",
                tuple(values),
            )
        if menu_role_ids is not None:
            self._replace_user_menu_roles(user_id=user_id, menu_role_ids=menu_role_ids)
        self.connection.commit()
        return self.get_user_by_id(user_id)

    def update_user_access(
        self,
        user_id: int,
        *,
        role: str | None = None,
        allowed_sources: tuple[str, ...] | list[str] | None = None,
        is_active: bool | None = None,
        menu_role_ids: list[int] | tuple[int, ...] | None = None,
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
        if assignments:
            assignments.append("updated_at = CURRENT_TIMESTAMP")
            values.append(user_id)
            self.cursor.execute(
                f"UPDATE users SET {', '.join(assignments)} WHERE id = %s",
                tuple(values),
            )
        if menu_role_ids is not None:
            self._replace_user_menu_roles(
                user_id=user_id,
                menu_role_ids=menu_role_ids or self._default_menu_role_ids_for_system_role(role or "user"),
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
            SELECT
                user_id,
                token_hash,
                DATE_FORMAT(expires_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS expires_at
            FROM auth_sessions
            WHERE token_hash = %s
            LIMIT 1
            """,
            (token_hash,),
        )
        row = self.cursor.fetchone()
        if not row:
            return None
        return SessionRecord(
            user_id=int(row["user_id"]),
            token_hash=str(row["token_hash"]),
            expires_at=str(row["expires_at"]),
        )

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
        self.cursor.execute("DELETE FROM auth_user_menu_roles WHERE user_id = %s", (user_id,))
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
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at
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
        sensitive_actions = (
            "reset_password",
            "delete_user",
            "change_password",
            "update_user_access",
            "update_user_profile",
            "delete_menu_role",
            "delete_menu_item",
        )
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
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at
            FROM auth_audit_logs
            {where_sql}
            ORDER BY id DESC
            LIMIT %s
            """
        values.append(safe_limit)
        self.cursor.execute(query, tuple(values))
        return [log for log in (self._row_to_audit_log(row) for row in self.cursor.fetchall()) if log is not None]

    def list_org_units(self) -> list[OrgUnitRecord]:
        self.cursor.execute(
            self._org_unit_select_sql(
                suffix="ORDER BY ou.sort_order ASC, ou.id ASC",
            )
        )
        return [item for item in (self._row_to_org_unit(row) for row in self.cursor.fetchall()) if item is not None]

    def get_org_unit_by_id(self, org_unit_id: int) -> OrgUnitRecord | None:
        self.cursor.execute(
            self._org_unit_select_sql("WHERE ou.id = %s", "LIMIT 1"),
            (org_unit_id,),
        )
        return self._row_to_org_unit(self.cursor.fetchone())

    def get_org_unit_by_code(self, org_code: str) -> OrgUnitRecord | None:
        self.cursor.execute(
            self._org_unit_select_sql("WHERE ou.org_code = %s", "LIMIT 1"),
            (org_code,),
        )
        return self._row_to_org_unit(self.cursor.fetchone())

    def create_org_unit(
        self,
        *,
        parent_id: int | None,
        org_code: str,
        org_name: str,
        org_type: str,
        org_desc: str | None = None,
        sort_order: int = 100,
    ) -> OrgUnitRecord:
        self.cursor.execute(
            """
            INSERT INTO auth_org_units (
                parent_id,
                org_code,
                org_name,
                org_type,
                org_desc,
                sort_order
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (parent_id, org_code, org_name, org_type, org_desc, sort_order),
        )
        self.connection.commit()
        org_unit_id = int(self.cursor.lastrowid)
        org_unit = self.get_org_unit_by_id(org_unit_id)
        if org_unit is None:
            raise RuntimeError("Created organization unit could not be loaded.")
        return org_unit

    def update_org_unit(
        self,
        org_unit_id: int,
        *,
        parent_id: int | None = None,
        org_code: str | None = None,
        org_name: str | None = None,
        org_type: str | None = None,
        org_desc: str | None = None,
        sort_order: int | None = None,
    ) -> OrgUnitRecord | None:
        assignments: list[str] = []
        values: list[object] = []
        assignments.append("parent_id = %s")
        values.append(parent_id)
        if org_code is not None:
            assignments.append("org_code = %s")
            values.append(org_code)
        if org_name is not None:
            assignments.append("org_name = %s")
            values.append(org_name)
        if org_type is not None:
            assignments.append("org_type = %s")
            values.append(org_type)
        if org_desc is not None:
            assignments.append("org_desc = %s")
            values.append(org_desc)
        if sort_order is not None:
            assignments.append("sort_order = %s")
            values.append(sort_order)
        if not assignments:
            return self.get_org_unit_by_id(org_unit_id)
        assignments.append("updated_at = CURRENT_TIMESTAMP")
        values.append(org_unit_id)
        self.cursor.execute(
            f"UPDATE auth_org_units SET {', '.join(assignments)} WHERE id = %s",
            tuple(values),
        )
        self.connection.commit()
        return self.get_org_unit_by_id(org_unit_id)

    def delete_org_unit(self, org_unit_id: int) -> OrgUnitRecord | None:
        org_unit = self.get_org_unit_by_id(org_unit_id)
        if org_unit is None:
            return None
        self.cursor.execute("UPDATE users SET org_unit_id = NULL WHERE org_unit_id = %s", (org_unit_id,))
        self.cursor.execute("DELETE FROM auth_org_units WHERE id = %s", (org_unit_id,))
        self.connection.commit()
        return org_unit

    def count_org_unit_children(self, org_unit_id: int) -> int:
        self.cursor.execute(
            "SELECT COUNT(*) AS total FROM auth_org_units WHERE parent_id = %s",
            (org_unit_id,),
        )
        row = self.cursor.fetchone()
        return int((row or {}).get("total") or 0)

    def count_users_in_org_unit(self, org_unit_id: int) -> int:
        self.cursor.execute(
            "SELECT COUNT(*) AS total FROM users WHERE org_unit_id = %s",
            (org_unit_id,),
        )
        row = self.cursor.fetchone()
        return int((row or {}).get("total") or 0)

    def list_menu_roles(self) -> list[MenuRoleRecord]:
        self.cursor.execute(
            """
            SELECT
                mr.id,
                mr.role_code,
                mr.role_name,
                mr.role_desc,
                GROUP_CONCAT(DISTINCT mri.menu_item_id ORDER BY mri.menu_item_id SEPARATOR ',') AS menu_ids,
                GROUP_CONCAT(DISTINCT mi.menu_code ORDER BY mi.menu_code SEPARATOR '||') AS menu_codes,
                GROUP_CONCAT(DISTINCT mi.name ORDER BY mi.name SEPARATOR '||') AS menu_names,
                COUNT(DISTINCT umr.user_id) AS assigned_user_count,
                DATE_FORMAT(mr.created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(mr.updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_roles mr
            LEFT JOIN auth_menu_role_items mri ON mri.menu_role_id = mr.id
            LEFT JOIN auth_menu_items mi ON mi.id = mri.menu_item_id
            LEFT JOIN auth_user_menu_roles umr ON umr.menu_role_id = mr.id
            GROUP BY mr.id, mr.role_code, mr.role_name, mr.role_desc, mr.created_at, mr.updated_at
            ORDER BY mr.id ASC
            """
        )
        return [item for item in (self._row_to_menu_role(row) for row in self.cursor.fetchall()) if item is not None]

    def get_menu_role_by_id(self, menu_role_id: int) -> MenuRoleRecord | None:
        self.cursor.execute(
            """
            SELECT
                mr.id,
                mr.role_code,
                mr.role_name,
                mr.role_desc,
                GROUP_CONCAT(DISTINCT mri.menu_item_id ORDER BY mri.menu_item_id SEPARATOR ',') AS menu_ids,
                GROUP_CONCAT(DISTINCT mi.menu_code ORDER BY mi.menu_code SEPARATOR '||') AS menu_codes,
                GROUP_CONCAT(DISTINCT mi.name ORDER BY mi.name SEPARATOR '||') AS menu_names,
                COUNT(DISTINCT umr.user_id) AS assigned_user_count,
                DATE_FORMAT(mr.created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(mr.updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_roles mr
            LEFT JOIN auth_menu_role_items mri ON mri.menu_role_id = mr.id
            LEFT JOIN auth_menu_items mi ON mi.id = mri.menu_item_id
            LEFT JOIN auth_user_menu_roles umr ON umr.menu_role_id = mr.id
            WHERE mr.id = %s
            GROUP BY mr.id, mr.role_code, mr.role_name, mr.role_desc, mr.created_at, mr.updated_at
            LIMIT 1
            """,
            (menu_role_id,),
        )
        return self._row_to_menu_role(self.cursor.fetchone())

    def get_menu_role_by_code(self, role_code: str) -> MenuRoleRecord | None:
        self.cursor.execute(
            """
            SELECT
                mr.id,
                mr.role_code,
                mr.role_name,
                mr.role_desc,
                GROUP_CONCAT(DISTINCT mri.menu_item_id ORDER BY mri.menu_item_id SEPARATOR ',') AS menu_ids,
                GROUP_CONCAT(DISTINCT mi.menu_code ORDER BY mi.menu_code SEPARATOR '||') AS menu_codes,
                GROUP_CONCAT(DISTINCT mi.name ORDER BY mi.name SEPARATOR '||') AS menu_names,
                COUNT(DISTINCT umr.user_id) AS assigned_user_count,
                DATE_FORMAT(mr.created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(mr.updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_roles mr
            LEFT JOIN auth_menu_role_items mri ON mri.menu_role_id = mr.id
            LEFT JOIN auth_menu_items mi ON mi.id = mri.menu_item_id
            LEFT JOIN auth_user_menu_roles umr ON umr.menu_role_id = mr.id
            WHERE mr.role_code = %s
            GROUP BY mr.id, mr.role_code, mr.role_name, mr.role_desc, mr.created_at, mr.updated_at
            LIMIT 1
            """,
            (role_code,),
        )
        return self._row_to_menu_role(self.cursor.fetchone())

    def create_menu_role(
        self,
        *,
        role_code: str,
        role_name: str,
        role_desc: str | None = None,
        menu_ids: list[int] | tuple[int, ...] | None = None,
    ) -> MenuRoleRecord:
        self.cursor.execute(
            """
            INSERT INTO auth_menu_roles (role_code, role_name, role_desc)
            VALUES (%s, %s, %s)
            """,
            (role_code, role_name, role_desc),
        )
        role_id = int(self.cursor.lastrowid)
        self._replace_menu_role_items(role_id=role_id, menu_ids=menu_ids or [])
        self.connection.commit()
        role = self.get_menu_role_by_id(role_id)
        if role is None:
            raise RuntimeError("Created menu role could not be loaded.")
        return role

    def update_menu_role(
        self,
        menu_role_id: int,
        *,
        role_code: str | None = None,
        role_name: str | None = None,
        role_desc: str | None = None,
        menu_ids: list[int] | tuple[int, ...] | None = None,
    ) -> MenuRoleRecord | None:
        assignments: list[str] = []
        values: list[object] = []
        if role_code is not None:
            assignments.append("role_code = %s")
            values.append(role_code)
        if role_name is not None:
            assignments.append("role_name = %s")
            values.append(role_name)
        if role_desc is not None:
            assignments.append("role_desc = %s")
            values.append(role_desc)
        if assignments:
            assignments.append("updated_at = CURRENT_TIMESTAMP")
            values.append(menu_role_id)
            self.cursor.execute(
                f"UPDATE auth_menu_roles SET {', '.join(assignments)} WHERE id = %s",
                tuple(values),
            )
        if menu_ids is not None:
            self._replace_menu_role_items(role_id=menu_role_id, menu_ids=menu_ids)
        self.connection.commit()
        return self.get_menu_role_by_id(menu_role_id)

    def delete_menu_role(self, menu_role_id: int) -> MenuRoleRecord | None:
        role = self.get_menu_role_by_id(menu_role_id)
        if role is None:
            return None
        self.cursor.execute("DELETE FROM auth_user_menu_roles WHERE menu_role_id = %s", (menu_role_id,))
        self.cursor.execute("DELETE FROM auth_menu_role_items WHERE menu_role_id = %s", (menu_role_id,))
        self.cursor.execute("DELETE FROM auth_menu_roles WHERE id = %s", (menu_role_id,))
        self.connection.commit()
        return role

    def list_menu_items(self) -> list[MenuItemRecord]:
        self.cursor.execute(
            """
            SELECT
                id,
                parent_id,
                menu_code,
                name,
                router_name,
                router_path,
                icon_url,
                href,
                is_visible,
                remark,
                sort_order,
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_items
            ORDER BY COALESCE(parent_id, 0) ASC, sort_order ASC, id ASC
            """
        )
        return [item for item in (self._row_to_menu_item(row) for row in self.cursor.fetchall()) if item is not None]

    def get_menu_item_by_id(self, menu_item_id: int) -> MenuItemRecord | None:
        self.cursor.execute(
            """
            SELECT
                id,
                parent_id,
                menu_code,
                name,
                router_name,
                router_path,
                icon_url,
                href,
                is_visible,
                remark,
                sort_order,
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_items
            WHERE id = %s
            LIMIT 1
            """,
            (menu_item_id,),
        )
        return self._row_to_menu_item(self.cursor.fetchone())

    def get_menu_item_by_code(self, menu_code: str) -> MenuItemRecord | None:
        self.cursor.execute(
            """
            SELECT
                id,
                parent_id,
                menu_code,
                name,
                router_name,
                router_path,
                icon_url,
                href,
                is_visible,
                remark,
                sort_order,
                DATE_FORMAT(created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_menu_items
            WHERE menu_code = %s
            LIMIT 1
            """,
            (menu_code,),
        )
        return self._row_to_menu_item(self.cursor.fetchone())

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
        self.cursor.execute(
            """
            INSERT INTO auth_menu_items (
                parent_id,
                menu_code,
                name,
                router_name,
                router_path,
                icon_url,
                href,
                is_visible,
                remark,
                sort_order
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                parent_id,
                menu_code,
                name,
                router_name,
                router_path,
                icon_url,
                href,
                1 if is_visible else 0,
                remark,
                sort_order,
            ),
        )
        self.connection.commit()
        menu_id = int(self.cursor.lastrowid)
        item = self.get_menu_item_by_id(menu_id)
        if item is None:
            raise RuntimeError("Created menu item could not be loaded.")
        return item

    def update_menu_item(
        self,
        menu_item_id: int,
        *,
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
    ) -> MenuItemRecord | None:
        assignments: list[str] = []
        values: list[object] = []
        if menu_code is not None:
            assignments.append("menu_code = %s")
            values.append(menu_code)
        if name is not None:
            assignments.append("name = %s")
            values.append(name)
        if parent_id is not None:
            assignments.append("parent_id = %s")
            values.append(parent_id)
        if router_name is not None:
            assignments.append("router_name = %s")
            values.append(router_name)
        if router_path is not None:
            assignments.append("router_path = %s")
            values.append(router_path)
        if icon_url is not None:
            assignments.append("icon_url = %s")
            values.append(icon_url)
        if href is not None:
            assignments.append("href = %s")
            values.append(href)
        if is_visible is not None:
            assignments.append("is_visible = %s")
            values.append(1 if is_visible else 0)
        if remark is not None:
            assignments.append("remark = %s")
            values.append(remark)
        if sort_order is not None:
            assignments.append("sort_order = %s")
            values.append(sort_order)
        if not assignments:
            return self.get_menu_item_by_id(menu_item_id)
        assignments.append("updated_at = CURRENT_TIMESTAMP")
        values.append(menu_item_id)
        self.cursor.execute(
            f"UPDATE auth_menu_items SET {', '.join(assignments)} WHERE id = %s",
            tuple(values),
        )
        self.connection.commit()
        return self.get_menu_item_by_id(menu_item_id)

    def delete_menu_item(self, menu_item_id: int) -> MenuItemRecord | None:
        item = self.get_menu_item_by_id(menu_item_id)
        if item is None:
            return None
        descendant_ids = self._collect_menu_descendant_ids(menu_item_id)
        all_ids = [menu_item_id, *descendant_ids]
        placeholders = ", ".join(["%s"] * len(all_ids))
        self.cursor.execute(
            f"DELETE FROM auth_menu_role_items WHERE menu_item_id IN ({placeholders})",
            tuple(all_ids),
        )
        self.cursor.execute(
            f"DELETE FROM auth_menu_items WHERE id IN ({placeholders})",
            tuple(all_ids),
        )
        self.connection.commit()
        return item

    def close(self) -> None:
        self.connection.close()
        logger.info("Auth MySQL connection closed.")

    def _ensure_users_columns(self) -> None:
        if not self._column_exists("users", "display_name"):
            self.cursor.execute("ALTER TABLE users ADD COLUMN display_name VARCHAR(64) NULL AFTER is_active")
        if not self._column_exists("users", "work_no"):
            self.cursor.execute("ALTER TABLE users ADD COLUMN work_no VARCHAR(64) NULL AFTER display_name")
        if not self._column_exists("users", "org_unit_id"):
            self.cursor.execute("ALTER TABLE users ADD COLUMN org_unit_id INT NULL AFTER work_no")
        self.connection.commit()

    def _ensure_org_units_columns(self) -> None:
        if not self._column_exists("auth_org_units", "org_desc"):
            self.cursor.execute("ALTER TABLE auth_org_units ADD COLUMN org_desc VARCHAR(255) NULL AFTER org_type")
        self.connection.commit()

    def _column_exists(self, table_name: str, column_name: str) -> bool:
        self.cursor.execute(f"SHOW COLUMNS FROM `{table_name}` LIKE %s", (column_name,))
        return self.cursor.fetchone() is not None

    def _seed_defaults(self) -> None:
        self._seed_default_org_units()
        self._seed_default_menu_items()
        self._seed_default_menu_roles()
        self._seed_default_user_assignments()
        self.connection.commit()

    def _seed_default_org_units(self) -> None:
        defaults = [
            {
                "org_code": "root",
                "org_name": "平台总部",
                "org_type": "root",
                "org_desc": "权限、菜单与数据治理的顶层组织节点。",
                "sort_order": 0,
                "parent_code": None,
            },
            {
                "org_code": "perm_center",
                "org_name": "权限管理中心",
                "org_type": "department",
                "org_desc": "负责账号、角色、菜单和审计策略维护。",
                "sort_order": 10,
                "parent_code": "root",
            },
            {
                "org_code": "knowledge_center",
                "org_name": "知识运营中心",
                "org_type": "department",
                "org_desc": "负责知识运营、问答工作台和上传入库相关流程。",
                "sort_order": 20,
                "parent_code": "root",
            },
            {
                "org_code": "data_center",
                "org_name": "数据治理组",
                "org_type": "department",
                "org_desc": "负责来源治理、索引维护和数据源边界管理。",
                "sort_order": 30,
                "parent_code": "root",
            },
        ]
        for item in defaults:
            parent_id = None
            if item["parent_code"]:
                parent = self.get_org_unit_by_code(str(item["parent_code"]))
                parent_id = parent.id if parent else None
            self.cursor.execute(
                """
                INSERT INTO auth_org_units (parent_id, org_code, org_name, org_type, org_desc, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    parent_id = VALUES(parent_id),
                    org_name = VALUES(org_name),
                    org_type = VALUES(org_type),
                    org_desc = VALUES(org_desc),
                    sort_order = VALUES(sort_order)
                """,
                (
                    parent_id,
                    item["org_code"],
                    item["org_name"],
                    item["org_type"],
                    item.get("org_desc"),
                    item["sort_order"],
                ),
            )

    def _seed_default_menu_items(self) -> None:
        defaults = [
            {"menu_code": "base", "name": "基础库", "sort_order": 10, "parent_code": None, "href": None},
            {"menu_code": "dashboard", "name": "总览", "sort_order": 11, "parent_code": "base", "href": "/"},
            {"menu_code": "knowledge", "name": "知识库", "sort_order": 20, "parent_code": None, "href": None},
            {"menu_code": "qa", "name": "问答工作台", "sort_order": 21, "parent_code": "knowledge", "href": "/qa"},
            {
                "menu_code": "knowledge_upload",
                "name": "上传入库",
                "sort_order": 22,
                "parent_code": "knowledge",
                "href": "/knowledge",
            },
            {
                "menu_code": "knowledge_reindex",
                "name": "重建索引",
                "sort_order": 23,
                "parent_code": "knowledge",
                "href": "/knowledge/reindex",
            },
            {
                "menu_code": "permission",
                "name": "权限系统",
                "sort_order": 30,
                "parent_code": None,
                "href": None,
            },
            {
                "menu_code": "users_overview",
                "name": "用户管理",
                "sort_order": 31,
                "parent_code": "permission",
                "href": "/users",
            },
            {
                "menu_code": "users_org",
                "name": "组织机构",
                "sort_order": 32,
                "parent_code": "permission",
                "href": "/users/org",
            },
            {
                "menu_code": "users_access",
                "name": "菜单角色",
                "sort_order": 33,
                "parent_code": "permission",
                "href": "/users/access",
            },
            {
                "menu_code": "users_security",
                "name": "菜单管理",
                "sort_order": 34,
                "parent_code": "permission",
                "href": "/users/security",
            },
            {
                "menu_code": "users_audit",
                "name": "审计日志",
                "sort_order": 35,
                "parent_code": "permission",
                "href": "/users/audit",
            },
            {"menu_code": "data", "name": "数据管理", "sort_order": 40, "parent_code": None, "href": None},
            {
                "menu_code": "data_sources",
                "name": "数据源管理",
                "sort_order": 41,
                "parent_code": "data",
                "href": "/knowledge/sources",
            },
        ]
        for item in defaults:
            parent_id = None
            if item["parent_code"]:
                parent = self.get_menu_item_by_code(str(item["parent_code"]))
                parent_id = parent.id if parent else None
            route = item.get("href")
            self.cursor.execute(
                """
                INSERT INTO auth_menu_items (
                    parent_id,
                    menu_code,
                    name,
                    router_name,
                    router_path,
                    href,
                    icon_url,
                    is_visible,
                    remark,
                    sort_order
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    parent_id = VALUES(parent_id),
                    name = VALUES(name),
                    router_name = VALUES(router_name),
                    router_path = VALUES(router_path),
                    href = VALUES(href),
                    sort_order = VALUES(sort_order),
                    is_visible = VALUES(is_visible)
                """,
                (
                    parent_id,
                    item["menu_code"],
                    item["name"],
                    item["menu_code"],
                    route,
                    route,
                    None,
                    1,
                    None,
                    item["sort_order"],
                ),
            )

    def _seed_default_menu_roles(self) -> None:
        defaults = [
            {
                "role_code": "platform_admin",
                "role_name": "平台管理员",
                "role_desc": "拥有全部后台与权限治理入口。",
                "menu_codes": [
                    "dashboard",
                    "qa",
                    "knowledge_upload",
                    "knowledge_reindex",
                    "data_sources",
                    "users_overview",
                    "users_org",
                    "users_access",
                    "users_security",
                    "users_audit",
                ],
            },
            {
                "role_code": "knowledge_operator",
                "role_name": "知识运营",
                "role_desc": "负责问答、上传、重建和数据源维护。",
                "menu_codes": ["dashboard", "qa", "knowledge_upload", "knowledge_reindex", "data_sources"],
            },
            {
                "role_code": "audit_viewer",
                "role_name": "审计查看",
                "role_desc": "可查看权限审计与追踪记录。",
                "menu_codes": ["dashboard", "users_audit"],
            },
        ]
        for item in defaults:
            self.cursor.execute(
                """
                INSERT INTO auth_menu_roles (role_code, role_name, role_desc)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    role_name = VALUES(role_name),
                    role_desc = VALUES(role_desc)
                """,
                (item["role_code"], item["role_name"], item["role_desc"]),
            )
            role = self.get_menu_role_by_code(str(item["role_code"]))
            if role is None:
                continue
            menu_ids: list[int] = []
            for menu_code in item["menu_codes"]:
                menu = self.get_menu_item_by_code(menu_code)
                if menu is not None:
                    menu_ids.append(menu.id)
            self._replace_menu_role_items(role_id=role.id, menu_ids=menu_ids)

    def _seed_default_user_assignments(self) -> None:
        admin_role = self.get_menu_role_by_code("platform_admin")
        member_role = self.get_menu_role_by_code("knowledge_operator")
        perm_org = self.get_org_unit_by_code("perm_center")
        knowledge_org = self.get_org_unit_by_code("knowledge_center")
        self.cursor.execute(
            """
            SELECT
                u.id,
                u.role,
                u.display_name,
                u.work_no,
                u.org_unit_id,
                COUNT(umr.id) AS menu_role_count
            FROM users u
            LEFT JOIN auth_user_menu_roles umr ON umr.user_id = u.id
            GROUP BY u.id, u.role, u.display_name, u.work_no, u.org_unit_id
            """
        )
        for row in self.cursor.fetchall():
            assignments: list[str] = []
            values: list[object] = []
            if not row.get("display_name"):
                assignments.append("display_name = %s")
                values.append(f"user_{row['id']}")
            if not row.get("work_no"):
                assignments.append("work_no = %s")
                values.append(f"U{int(row['id']):04d}")
            if row.get("org_unit_id") is None:
                assignments.append("org_unit_id = %s")
                values.append(
                    perm_org.id if str(row.get("role")) == "admin" and perm_org is not None else knowledge_org.id
                    if knowledge_org is not None
                    else None
                )
            if assignments:
                assignments.append("updated_at = CURRENT_TIMESTAMP")
                values.append(int(row["id"]))
                self.cursor.execute(
                    f"UPDATE users SET {', '.join(assignments)} WHERE id = %s",
                    tuple(values),
                )
            if int(row.get("menu_role_count") or 0) == 0:
                default_ids = (
                    [admin_role.id]
                    if str(row.get("role")) == "admin" and admin_role is not None
                    else [member_role.id] if member_role is not None else []
                )
                self._replace_user_menu_roles(user_id=int(row["id"]), menu_role_ids=default_ids)

    def _replace_user_menu_roles(self, *, user_id: int, menu_role_ids: list[int] | tuple[int, ...]) -> None:
        unique_ids = self._normalize_int_ids(menu_role_ids)
        self.cursor.execute("DELETE FROM auth_user_menu_roles WHERE user_id = %s", (user_id,))
        for menu_role_id in unique_ids:
            self.cursor.execute(
                """
                INSERT INTO auth_user_menu_roles (user_id, menu_role_id)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
                """,
                (user_id, menu_role_id),
            )

    def _replace_menu_role_items(self, *, role_id: int, menu_ids: list[int] | tuple[int, ...]) -> None:
        unique_ids = self._normalize_int_ids(menu_ids)
        self.cursor.execute("DELETE FROM auth_menu_role_items WHERE menu_role_id = %s", (role_id,))
        for menu_id in unique_ids:
            self.cursor.execute(
                """
                INSERT INTO auth_menu_role_items (menu_role_id, menu_item_id)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE menu_role_id = VALUES(menu_role_id)
                """,
                (role_id, menu_id),
            )

    def _default_org_unit_id_for_role(self, role: str) -> int | None:
        org_code = "perm_center" if role == "admin" else "knowledge_center"
        org = self.get_org_unit_by_code(org_code)
        return org.id if org is not None else None

    def _default_menu_role_ids_for_system_role(self, role: str) -> list[int]:
        role_code = "platform_admin" if role == "admin" else "knowledge_operator"
        menu_role = self.get_menu_role_by_code(role_code)
        return [menu_role.id] if menu_role is not None else []

    @staticmethod
    def _normalize_int_ids(values: list[int] | tuple[int, ...] | None) -> list[int]:
        normalized: list[int] = []
        seen: set[int] = set()
        for value in values or []:
            try:
                candidate = int(value)
            except (TypeError, ValueError):
                continue
            if candidate <= 0 or candidate in seen:
                continue
            normalized.append(candidate)
            seen.add(candidate)
        return normalized

    def _collect_menu_descendant_ids(self, menu_item_id: int) -> list[int]:
        items = self.list_menu_items()
        child_map: dict[int | None, list[int]] = {}
        for item in items:
            child_map.setdefault(item.parent_id, []).append(item.id)
        collected: list[int] = []
        stack = list(child_map.get(menu_item_id, []))
        while stack:
            current = stack.pop()
            collected.append(current)
            stack.extend(child_map.get(current, []))
        return collected

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

    @staticmethod
    def _parse_concat_ints(value: str | None) -> tuple[int, ...]:
        if not value:
            return ()
        result: list[int] = []
        for item in str(value).split(","):
            item = item.strip()
            if not item:
                continue
            try:
                result.append(int(item))
            except ValueError:
                continue
        return tuple(result)

    @staticmethod
    def _parse_concat_strings(value: str | None, *, separator: str = "||") -> tuple[str, ...]:
        if not value:
            return ()
        return tuple(part for part in (item.strip() for item in str(value).split(separator)) if part)

    @staticmethod
    def _org_unit_select_sql(where_clause: str = "", suffix: str = "") -> str:
        return f"""
            SELECT
                ou.id,
                ou.parent_id,
                ou.org_code,
                ou.org_name,
                ou.org_type,
                ou.org_desc,
                ou.sort_order,
                COALESCE(user_stats.assigned_user_count, 0) AS assigned_user_count,
                DATE_FORMAT(ou.created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at,
                DATE_FORMAT(ou.updated_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS updated_at
            FROM auth_org_units ou
            LEFT JOIN (
                SELECT org_unit_id, COUNT(*) AS assigned_user_count
                FROM users
                WHERE org_unit_id IS NOT NULL
                GROUP BY org_unit_id
            ) user_stats ON user_stats.org_unit_id = ou.id
            {where_clause}
            {suffix}
        """

    @staticmethod
    def _user_select_sql(where_clause: str = "", include_password: bool = True, suffix: str = "") -> str:
        password_sql = "u.password_hash," if include_password else ""
        return f"""
            SELECT
                u.id,
                u.username,
                u.role,
                u.allowed_sources,
                u.is_active,
                u.display_name,
                u.work_no,
                u.org_unit_id,
                ou.org_name,
                GROUP_CONCAT(DISTINCT umr.menu_role_id ORDER BY umr.menu_role_id SEPARATOR ',') AS menu_role_ids,
                GROUP_CONCAT(DISTINCT mr.role_name ORDER BY mr.role_name SEPARATOR '||') AS menu_role_names,
                {password_sql}
                DATE_FORMAT(u.created_at, '%%Y-%%m-%%dT%%H:%%i:%%s') AS created_at
            FROM users u
            LEFT JOIN auth_org_units ou ON ou.id = u.org_unit_id
            LEFT JOIN auth_user_menu_roles umr ON umr.user_id = u.id
            LEFT JOIN auth_menu_roles mr ON mr.id = umr.menu_role_id
            {where_clause}
            GROUP BY
                u.id,
                u.username,
                u.role,
                u.allowed_sources,
                u.is_active,
                u.display_name,
                u.work_no,
                u.org_unit_id,
                ou.org_name,
                u.created_at
            {suffix}
        """

    def _row_to_user(self, row: dict | None) -> AuthenticatedUser | None:
        if not row:
            return None
        return AuthenticatedUser(
            id=int(row["id"]),
            username=str(row["username"]),
            role=str(row["role"]),
            allowed_sources=self._parse_allowed_sources(row.get("allowed_sources")),
            is_active=bool(row.get("is_active")),
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
            display_name=str(row["display_name"]) if row.get("display_name") is not None else None,
            work_no=str(row["work_no"]) if row.get("work_no") is not None else None,
            org_unit_id=int(row["org_unit_id"]) if row.get("org_unit_id") is not None else None,
            org_name=str(row["org_name"]) if row.get("org_name") is not None else None,
            menu_role_ids=self._parse_concat_ints(row.get("menu_role_ids")),
            menu_role_names=self._parse_concat_strings(row.get("menu_role_names")),
        )

    def _row_to_user_record(self, row: dict | None) -> UserRecord | None:
        if not row:
            return None
        return UserRecord(
            id=int(row["id"]),
            username=str(row["username"]),
            role=str(row["role"]),
            allowed_sources=self._parse_allowed_sources(row.get("allowed_sources")),
            is_active=bool(row.get("is_active")),
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
            display_name=str(row["display_name"]) if row.get("display_name") is not None else None,
            work_no=str(row["work_no"]) if row.get("work_no") is not None else None,
            org_unit_id=int(row["org_unit_id"]) if row.get("org_unit_id") is not None else None,
            org_name=str(row["org_name"]) if row.get("org_name") is not None else None,
            menu_role_ids=self._parse_concat_ints(row.get("menu_role_ids")),
            menu_role_names=self._parse_concat_strings(row.get("menu_role_names")),
            password_hash=str(row["password_hash"]) if row.get("password_hash") is not None else "",
        )

    @staticmethod
    def _row_to_org_unit(row: dict | None) -> OrgUnitRecord | None:
        if not row:
            return None
        return OrgUnitRecord(
            id=int(row["id"]),
            parent_id=int(row["parent_id"]) if row.get("parent_id") is not None else None,
            org_code=str(row["org_code"]),
            org_name=str(row["org_name"]),
            org_type=str(row["org_type"]),
            org_desc=str(row["org_desc"]) if row.get("org_desc") is not None else None,
            sort_order=int(row.get("sort_order") or 100),
            assigned_user_count=int(row.get("assigned_user_count") or 0),
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
            updated_at=str(row["updated_at"]) if row.get("updated_at") is not None else None,
        )

    def _row_to_menu_role(self, row: dict | None) -> MenuRoleRecord | None:
        if not row:
            return None
        return MenuRoleRecord(
            id=int(row["id"]),
            role_code=str(row["role_code"]),
            role_name=str(row["role_name"]),
            role_desc=str(row["role_desc"]) if row.get("role_desc") is not None else None,
            menu_ids=self._parse_concat_ints(row.get("menu_ids")),
            menu_codes=self._parse_concat_strings(row.get("menu_codes")),
            menu_names=self._parse_concat_strings(row.get("menu_names")),
            assigned_user_count=int(row.get("assigned_user_count") or 0),
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
            updated_at=str(row["updated_at"]) if row.get("updated_at") is not None else None,
        )

    @staticmethod
    def _row_to_menu_item(row: dict | None) -> MenuItemRecord | None:
        if not row:
            return None
        return MenuItemRecord(
            id=int(row["id"]),
            parent_id=int(row["parent_id"]) if row.get("parent_id") is not None else None,
            menu_code=str(row["menu_code"]),
            name=str(row["name"]),
            router_name=str(row["router_name"]) if row.get("router_name") is not None else None,
            router_path=str(row["router_path"]) if row.get("router_path") is not None else None,
            icon_url=str(row["icon_url"]) if row.get("icon_url") is not None else None,
            href=str(row["href"]) if row.get("href") is not None else None,
            is_visible=bool(row.get("is_visible")),
            remark=str(row["remark"]) if row.get("remark") is not None else None,
            sort_order=int(row.get("sort_order") or 100),
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
            updated_at=str(row["updated_at"]) if row.get("updated_at") is not None else None,
        )

    def _row_to_audit_log(self, row: dict | None) -> AuditLogRecord | None:
        if not row:
            return None
        try:
            metadata = json.loads(row.get("metadata_json")) if row.get("metadata_json") else {}
        except json.JSONDecodeError:
            metadata = {}
        if not isinstance(metadata, dict):
            metadata = {}
        return AuditLogRecord(
            id=int(row["id"]),
            action=str(row["action"]),
            actor_user_id=int(row["actor_user_id"]) if row.get("actor_user_id") is not None else None,
            actor_username=str(row["actor_username"]) if row.get("actor_username") is not None else None,
            actor_role=str(row["actor_role"]) if row.get("actor_role") is not None else None,
            target_user_id=int(row["target_user_id"]) if row.get("target_user_id") is not None else None,
            target_username=str(row["target_username"]) if row.get("target_username") is not None else None,
            target_role=str(row["target_role"]) if row.get("target_role") is not None else None,
            metadata=metadata,
            created_at=str(row["created_at"]) if row.get("created_at") is not None else None,
        )
