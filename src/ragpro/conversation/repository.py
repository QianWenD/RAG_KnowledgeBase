from __future__ import annotations

from dataclasses import dataclass

import pymysql

from ragpro.config import get_logger, get_settings

logger = get_logger("ragpro.conversation.repository")


@dataclass(frozen=True)
class ConversationTurn:
    session_id: str
    question: str
    answer: str
    timestamp: str | None = None


class ConversationMySQLRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._ensure_database()
        self.connection = pymysql.connect(
            host=self.settings.mysql_host,
            user=self.settings.mysql_user,
            password=self.settings.mysql_password,
            database=self.settings.mysql_database,
            charset="utf8mb4",
        )
        self.cursor = self.connection.cursor()
        self.ensure_table()
        logger.info("Conversation MySQL connection established.")

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

    def ensure_table(self) -> None:
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(64) NOT NULL,
                user_id INT NULL,
                question TEXT NOT NULL,
                answer MEDIUMTEXT NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session_id (session_id),
                INDEX idx_user_session (user_id, session_id)
            )
            """
        )
        self.cursor.execute("SHOW COLUMNS FROM conversations LIKE 'user_id'")
        if self.cursor.fetchone() is None:
            self.cursor.execute("ALTER TABLE conversations ADD COLUMN user_id INT NULL AFTER session_id")
            self.cursor.execute("CREATE INDEX idx_user_session ON conversations (user_id, session_id)")
        self.connection.commit()

    def fetch_recent_history(self, session_id: str, *, user_id: int | None = None, limit: int = 5) -> list[dict]:
        if user_id is None:
            self.cursor.execute(
                """
                SELECT question, answer
                FROM conversations
                WHERE session_id = %s
                ORDER BY timestamp DESC, id DESC
                LIMIT %s
                """,
                (session_id, limit),
            )
        else:
            self.cursor.execute(
                """
                SELECT question, answer
                FROM conversations
                WHERE session_id = %s AND user_id = %s
                ORDER BY timestamp DESC, id DESC
                LIMIT %s
                """,
                (session_id, user_id, limit),
            )
        rows = self.cursor.fetchall()
        return [{"question": row[0], "answer": row[1]} for row in rows[::-1]]

    def append_turn(
        self,
        session_id: str,
        question: str,
        answer: str,
        *,
        user_id: int | None = None,
    ) -> None:
        self.cursor.execute(
            """
            INSERT INTO conversations (session_id, user_id, question, answer)
            VALUES (%s, %s, %s, %s)
            """,
            (session_id, user_id, question, answer),
        )
        self.connection.commit()

    def trim_history(self, session_id: str, *, user_id: int | None = None, keep: int = 5) -> None:
        if user_id is None:
            self.cursor.execute(
                """
                DELETE FROM conversations
                WHERE session_id = %s AND id NOT IN (
                    SELECT id FROM (
                        SELECT id
                        FROM conversations
                        WHERE session_id = %s
                        ORDER BY timestamp DESC, id DESC
                        LIMIT %s
                    ) AS recent_rows
                )
                """,
                (session_id, session_id, keep),
            )
        else:
            self.cursor.execute(
                """
                DELETE FROM conversations
                WHERE session_id = %s AND user_id = %s AND id NOT IN (
                    SELECT id FROM (
                        SELECT id
                        FROM conversations
                        WHERE session_id = %s AND user_id = %s
                        ORDER BY timestamp DESC, id DESC
                        LIMIT %s
                    ) AS recent_rows
                )
                """,
                (session_id, user_id, session_id, user_id, keep),
            )
        self.connection.commit()

    def clear_history(self, session_id: str, *, user_id: int | None = None) -> None:
        if user_id is None:
            self.cursor.execute("DELETE FROM conversations WHERE session_id = %s", (session_id,))
        else:
            self.cursor.execute(
                "DELETE FROM conversations WHERE session_id = %s AND user_id = %s",
                (session_id, user_id),
            )
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()
        logger.info("Conversation MySQL connection closed.")
