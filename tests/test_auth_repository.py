from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.auth.repository import AuthMySQLRepository


class FakeCursor:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[object, ...]]] = []

    def execute(self, query: str, params: tuple[object, ...]) -> None:
        self.calls.append((query, params))

    @staticmethod
    def fetchone():
        return None


class AuthRepositoryQueryTests(unittest.TestCase):
    def test_get_user_record_by_username_places_limit_after_group_by(self) -> None:
        repository = AuthMySQLRepository.__new__(AuthMySQLRepository)
        repository.cursor = FakeCursor()
        repository._row_to_user_record = lambda row: row

        repository.get_user_record_by_username("admin")

        query, params = repository.cursor.calls[0]
        self.assertEqual(params, ("admin",))
        self.assertIn("WHERE u.username = %s", query)
        self.assertNotIn("WHERE u.username = %s LIMIT 1", query)
        self.assertRegex(query, r"GROUP BY[\s\S]+LIMIT 1\s*$")

    def test_get_user_by_id_places_limit_after_group_by(self) -> None:
        repository = AuthMySQLRepository.__new__(AuthMySQLRepository)
        repository.cursor = FakeCursor()
        repository._row_to_user = lambda row: row

        repository.get_user_by_id(7)

        query, params = repository.cursor.calls[0]
        self.assertEqual(params, (7,))
        self.assertIn("WHERE u.id = %s", query)
        self.assertNotIn("WHERE u.id = %s LIMIT 1", query)
        self.assertRegex(query, r"GROUP BY[\s\S]+LIMIT 1\s*$")


if __name__ == "__main__":
    unittest.main()
