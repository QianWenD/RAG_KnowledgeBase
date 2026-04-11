from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.conversation.service import ConversationService


class FakeConversationRepository:
    def __init__(self) -> None:
        self.rows: dict[str, list[dict]] = {}

    def fetch_recent_history(self, session_id: str, limit: int = 5) -> list[dict]:
        return self.rows.get(session_id, [])[-limit:]

    def append_turn(self, session_id: str, question: str, answer: str) -> None:
        self.rows.setdefault(session_id, []).append({"question": question, "answer": answer})

    def trim_history(self, session_id: str, keep: int = 5) -> None:
        self.rows[session_id] = self.rows.get(session_id, [])[-keep:]

    def clear_history(self, session_id: str) -> None:
        self.rows[session_id] = []


class ConversationServiceTests(unittest.TestCase):
    def test_generates_session_id(self) -> None:
        session_id = ConversationService.get_or_create_session_id()
        self.assertTrue(session_id)
        self.assertIsInstance(session_id, str)

    def test_save_turn_trims_history(self) -> None:
        service = ConversationService(FakeConversationRepository(), max_turns=2)
        session_id = "session-1"
        service.save_turn(session_id, "q1", "a1")
        service.save_turn(session_id, "q2", "a2")
        history = service.save_turn(session_id, "q3", "a3")
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["question"], "q2")
        self.assertEqual(history[1]["question"], "q3")

    def test_compress_history_keeps_recent_turns_and_summarizes_earlier(self) -> None:
        history = [
            {"question": "第一问", "answer": "第一答"},
            {"question": "第二问", "answer": "第二答"},
            {"question": "第三问", "answer": "第三答"},
            {"question": "第四问", "answer": "第四答"},
            {"question": "第五问", "answer": "第五答"},
        ]

        text = ConversationService.compress_history(history, max_turns=5, max_chars=300)

        self.assertIn("更早对话摘要", text)
        self.assertIn("最近对话", text)
        self.assertIn("第五问", text)

    def test_build_retrieval_query_uses_recent_context_for_ambiguous_query(self) -> None:
        history = [
            {"question": "Milvus 和 Zilliz Cloud 有什么区别", "answer": "一个是开源，一个是托管服务"},
            {"question": "那部署成本呢", "answer": "托管方案运维成本更低"},
        ]

        rewritten = ConversationService.build_retrieval_query(
            "它适合教学项目吗",
            history=history,
            retrieval_query="它适合教学项目吗",
        )

        self.assertIn("Milvus 和 Zilliz Cloud 有什么区别", rewritten)
        self.assertIn("它适合教学项目吗", rewritten)


if __name__ == "__main__":
    unittest.main()
