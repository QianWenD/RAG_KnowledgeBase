from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.database.schema_comments import (
    ColumnCommentSpec,
    RAGPRO_SCHEMA_COMMENTS,
    TableCommentSpec,
    apply_schema_comments,
    build_column_comment_sql,
    build_table_comment_sql,
)


class FakeCommentCursor:
    def __init__(
        self,
        *,
        table_comments: dict[str, str | None],
        column_comments: dict[str, dict[str, str | None]],
    ) -> None:
        self.table_comments = table_comments
        self.column_comments = column_comments
        self.calls: list[tuple[str, tuple[object, ...]]] = []
        self._pending_one: dict | None = None
        self._pending_all: list[dict] = []

    def execute(self, sql: str, params: tuple[object, ...] | None = None) -> None:
        params = tuple(params or ())
        self.calls.append((" ".join(sql.split()), params))
        if "information_schema.TABLES" in sql:
            table = str(params[0])
            if table in self.table_comments:
                self._pending_one = {"table_comment": self.table_comments[table]}
            else:
                self._pending_one = None
            return
        if "information_schema.COLUMNS" in sql:
            table = str(params[0])
            self._pending_all = [
                {"column_name": name, "column_comment": comment}
                for name, comment in self.column_comments.get(table, {}).items()
            ]
            return
        self._pending_one = None
        self._pending_all = []

    def fetchone(self):
        return self._pending_one

    def fetchall(self):
        return self._pending_all


class SchemaCommentTests(unittest.TestCase):
    def test_builds_mysql_comment_sql_with_chinese_text(self) -> None:
        spec = TableCommentSpec(
            table="users",
            comment="系统用户表",
            columns=(
                ColumnCommentSpec("username", "VARCHAR(64) NOT NULL", "登录账号"),
                ColumnCommentSpec("allowed_sources", "TEXT NOT NULL", "授权知识源，JSON数组字符串"),
            ),
        )

        self.assertEqual(build_table_comment_sql(spec), "ALTER TABLE `users` COMMENT = '系统用户表'")
        self.assertEqual(
            build_column_comment_sql(spec.table, spec.columns[0]),
            "ALTER TABLE `users` MODIFY COLUMN `username` VARCHAR(64) NOT NULL COMMENT '登录账号'",
        )
        self.assertIn("JSON数组字符串", build_column_comment_sql(spec.table, spec.columns[1]))

    def test_apply_schema_comments_only_updates_missing_comments(self) -> None:
        spec = TableCommentSpec(
            table="users",
            comment="系统用户表",
            columns=(
                ColumnCommentSpec("username", "VARCHAR(64) NOT NULL", "登录账号"),
                ColumnCommentSpec("role", "VARCHAR(20) NOT NULL DEFAULT 'user'", "账号角色"),
            ),
        )
        cursor = FakeCommentCursor(
            table_comments={"users": ""},
            column_comments={"users": {"username": "", "role": "账号角色"}},
        )

        changed = apply_schema_comments(cursor, (spec,))

        alter_calls = [sql for sql, _ in cursor.calls if sql.startswith("ALTER TABLE")]
        self.assertEqual(changed, 2)
        self.assertEqual(len(alter_calls), 2)
        self.assertTrue(any("COMMENT = '系统用户表'" in sql for sql in alter_calls))
        self.assertTrue(any("MODIFY COLUMN `username`" in sql for sql in alter_calls))
        self.assertFalse(any("MODIFY COLUMN `role`" in sql for sql in alter_calls))

    def test_knowledge_sources_table_has_chinese_comments(self) -> None:
        specs = {spec.table: spec for spec in RAGPRO_SCHEMA_COMMENTS}

        source_spec = specs["knowledge_sources"]

        self.assertEqual(source_spec.comment, "知识源目录表，维护来源编码、显示名称和启停状态")
        column_comments = {column.name: column.comment for column in source_spec.columns}
        self.assertEqual(column_comments["source_code"], "知识源编码，权限、上传、检索统一使用该稳定编码")
        self.assertEqual(column_comments["display_name"], "知识源展示名称，可用于前端中文显示")
        self.assertEqual(column_comments["is_active"], "知识源是否启用，1启用，0停用")


if __name__ == "__main__":
    unittest.main()
