from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.faq_match.service import FAQMatchService


class _FakeCache:
    def __init__(self) -> None:
        self.answer_map = {"cached question": "cached answer"}
        self.json_map = {
            "qa_original_questions": ["cached question"],
            "qa_tokenized_questions": [["cached", "question"]],
        }

    def get_json(self, key: str):
        return self.json_map.get(key)

    def set_json(self, key: str, value) -> None:
        self.json_map[key] = value

    def get_answer(self, query: str):
        return self.answer_map.get(query)

    def set_answer(self, query: str, answer: str) -> None:
        self.answer_map[query] = answer


class _FakeRepository:
    def fetch_questions(self) -> list[str]:
        return ["cached question"]

    def fetch_answer(self, question: str) -> str | None:
        return "cached answer" if question == "cached question" else None


class FAQMatchServiceTests(unittest.TestCase):
    def test_cache_hit_preserves_matched_question(self) -> None:
        service = FAQMatchService(cache=_FakeCache(), repository=_FakeRepository())

        result = service.search("cached question")

        self.assertTrue(result.matched)
        self.assertEqual(result.answer, "cached answer")
        self.assertEqual(result.score, 1.0)
        self.assertEqual(result.matched_question, "cached question")


if __name__ == "__main__":
    unittest.main()
