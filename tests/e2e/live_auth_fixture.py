from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
for import_root in (PROJECT_ROOT, PROJECT_ROOT / "src"):
    if str(import_root) not in sys.path:
        sys.path.insert(0, str(import_root))

from ragpro.auth.repository import AuthMySQLRepository
from ragpro.auth.service import AuthService
from ragpro.config import get_settings


PASSWORD = "Password123"


def cleanup_prefix(prefix: str) -> None:
    if not prefix.startswith("e2e_"):
        raise ValueError("Refusing to clean up non-e2e username prefix.")

    repository = AuthMySQLRepository()
    try:
        like_pattern = f"{prefix}%"
        repository.cursor.execute(
            """
            DELETE FROM auth_audit_logs
            WHERE actor_username LIKE %s OR target_username LIKE %s
            """,
            (like_pattern, like_pattern),
        )
        repository.cursor.execute(
            """
            DELETE FROM auth_sessions
            WHERE user_id IN (
                SELECT id FROM users WHERE username LIKE %s
            )
            """,
            (like_pattern,),
        )
        repository.cursor.execute("DELETE FROM users WHERE username LIKE %s", (like_pattern,))
        repository.connection.commit()
    finally:
        repository.close()


def provision_admin(prefix: str) -> dict:
    if not prefix.startswith("e2e_"):
        raise ValueError("Refusing to provision non-e2e username prefix.")

    cleanup_prefix(prefix)

    repository = AuthMySQLRepository()
    try:
        settings = get_settings()
        service = AuthService(repository)
        username = f"{prefix}admin"
        user = service.create_user_by_admin(
            username=username,
            password=PASSWORD,
            role="admin",
            allowed_sources=list(settings.valid_sources),
            is_active=True,
        )
        return {
            "username": username,
            "password": PASSWORD,
            "user_id": user.id,
            "allowed_sources": list(user.allowed_sources),
        }
    finally:
        repository.close()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: live_auth_fixture.py <provision|cleanup> <e2e_prefix>")

    command = sys.argv[1]
    prefix = sys.argv[2]

    if command == "provision":
        print(json.dumps(provision_admin(prefix), ensure_ascii=False))
        return
    if command == "cleanup":
        cleanup_prefix(prefix)
        print(json.dumps({"cleaned": True, "prefix": prefix}, ensure_ascii=False))
        return

    raise SystemExit(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
