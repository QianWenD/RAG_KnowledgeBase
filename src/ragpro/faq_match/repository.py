from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd
import pymysql

from ragpro.config import get_logger, get_settings

logger = get_logger("ragpro.faq.repository")


@dataclass
class FAQRecord:
    subject_name: str
    question: str
    answer: str


class FAQMySQLRepository:
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
        logger.info("MySQL connection established.")

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
            CREATE TABLE IF NOT EXISTS jpkb (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_name VARCHAR(50),
                question VARCHAR(1000) NOT NULL,
                answer VARCHAR(2000) NOT NULL
            )
            """
        )
        self.connection.commit()

    def import_csv(self, csv_path: str) -> int:
        data = pd.read_csv(csv_path)
        inserted = 0
        for _, row in data.iterrows():
            self.cursor.execute(
                "INSERT INTO jpkb (subject_name, question, answer) VALUES (%s, %s, %s)",
                (row["学科名称"], row["问题"], row["答案"]),
            )
            inserted += 1
        self.connection.commit()
        logger.info("Imported %s FAQ rows from %s.", inserted, csv_path)
        return inserted

    def fetch_questions(self) -> list[str]:
        self.cursor.execute("SELECT question FROM jpkb")
        return [row[0] for row in self.cursor.fetchall()]

    def fetch_answer(self, question: str) -> str | None:
        self.cursor.execute("SELECT answer FROM jpkb WHERE question=%s", (question,))
        row = self.cursor.fetchone()
        return row[0] if row else None

    def fetch_records(self) -> list[FAQRecord]:
        self.cursor.execute("SELECT subject_name, question, answer FROM jpkb")
        return [FAQRecord(*row) for row in self.cursor.fetchall()]

    def close(self) -> None:
        self.connection.close()
        logger.info("MySQL connection closed.")
