from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.routing import LightweightIntentClassifier, RetrievalStrategySelector, UnifiedQueryRouter


class FakeFAQService:
    def __init__(self, result: dict | None = None) -> None:
        self.result = result or {
            "matched": False,
            "answer": None,
            "score": 0.41,
            "matched_question": None,
        }

    def search(self, query: str, threshold: float = 0.85):
        class FAQResult:
            def __init__(self, payload: dict) -> None:
                self.matched = payload["matched"]
                self.answer = payload["answer"]
                self.score = payload["score"]
                self.matched_question = payload["matched_question"]

        return FAQResult(self.result)


class FakeRAGService:
    def answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> dict:
        return {
            "answer": f"RAG::{query}",
            "retrieval_query": retrieval_query or query,
            "citations": [{"source": source_filter or "all", "timestamp": "2026-04-08"}],
            "context_count": 1,
            "retrieval_backend": "local",
        }

    def stream_answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> tuple[dict, list[str]]:
        return (
            {
                "retrieval_query": retrieval_query or query,
                "citations": [{"source": source_filter or "all", "timestamp": "2026-04-08"}],
                "context_count": 1,
                "retrieval_backend": "local",
            },
            ["RAG::", query],
        )


class FakeFallbackRAGService:
    def answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> dict:
        return {
            "answer": "暂时没有检索到足够资料来可靠回答这个问题。",
            "retrieval_query": retrieval_query or query,
            "citations": [],
            "context_count": 0,
            "retrieval_backend": "local",
        }

    def stream_answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> tuple[dict, list[str]]:
        return (
            {
                "retrieval_query": retrieval_query or query,
                "citations": [],
                "context_count": 0,
                "retrieval_backend": "local",
            },
            ["暂时没有检索到足够资料来可靠回答这个问题。"],
        )


class RoutingRuleTests(unittest.TestCase):
    def test_greeting_is_classified_as_general(self) -> None:
        decision = LightweightIntentClassifier().classify("你好")
        self.assertEqual(decision.route.value, "general_llm")
        self.assertEqual(decision.intent.value, "general")

    def test_concept_query_expands_llm_aliases(self) -> None:
        decision = RetrievalStrategySelector().select("什么是大语言模型")
        self.assertEqual(decision.strategy.value, "hyde")
        self.assertIn("LLM", decision.retrieval_query)
        self.assertIn("大模型", decision.retrieval_query)
        self.assertIn("定义", decision.retrieval_query)

    def test_comparison_prefers_decompose(self) -> None:
        decision = RetrievalStrategySelector().select("Milvus 和 Zilliz Cloud 有什么区别")
        self.assertEqual(decision.strategy.value, "decompose")

    def test_long_sentence_prefers_rewrite(self) -> None:
        decision = RetrievalStrategySelector().select(
            "请问如果我想把很多课程文档导入向量库并进行检索，应该怎么做"
        )
        self.assertEqual(decision.strategy.value, "rewrite")
        self.assertNotIn("请问", decision.retrieval_query)


class UnifiedRouterTests(unittest.TestCase):
    def test_faq_match_short_circuits_router(self) -> None:
        router = UnifiedQueryRouter(
            faq_service=FakeFAQService(
                {
                    "matched": True,
                    "answer": "学费 1999 元",
                    "score": 0.97,
                    "matched_question": "学费多少",
                }
            ),
            rag_service=FakeRAGService(),
            llm=lambda prompt: "LLM",
        )
        result = router.route("学费多少")
        self.assertEqual(result["route"], "faq_match")
        self.assertEqual(result["answer"], "学费 1999 元")
        self.assertIsNone(result["retrieval_backend"])
        self.assertEqual(result["confidence"]["label"], "high")
        self.assertAlmostEqual(result["confidence"]["score"], 0.97)
        self.assertEqual(result["debug_info"]["faq"]["matched_question"], "学费多少")
        self.assertFalse(result["debug_info"]["fallback_used"])

    def test_general_query_uses_general_llm(self) -> None:
        router = UnifiedQueryRouter(
            faq_service=FakeFAQService(),
            rag_service=FakeRAGService(),
            llm=lambda prompt: "你好，我可以帮你检索知识库。",
        )
        result = router.route("你是谁")
        self.assertEqual(result["route"], "general_llm")
        self.assertEqual(result["intent"], "general")
        self.assertIsNone(result["retrieval_backend"])
        self.assertEqual(result["confidence"]["label"], "low")
        self.assertEqual(result["debug_info"]["retrieval"]["citation_count"], 0)
        self.assertFalse(result["debug_info"]["fallback_used"])

    def test_professional_query_uses_rag(self) -> None:
        router = UnifiedQueryRouter(
            faq_service=FakeFAQService(),
            rag_service=FakeRAGService(),
            llm=lambda prompt: "LLM",
        )
        result = router.route("RAG 系统如何接入 Milvus", source_filter="ai")
        self.assertEqual(result["route"], "rag")
        self.assertEqual(result["retrieval_strategy"], "direct")
        self.assertEqual(result["retrieval_query"], "RAG 系统如何接入 Milvus")
        self.assertEqual(result["retrieval_backend"], "local")
        self.assertGreater(result["confidence"]["score"], 0.6)
        self.assertEqual(result["confidence"]["label"], "high")
        self.assertEqual(result["debug_info"]["retrieval"]["query"], "RAG 系统如何接入 Milvus")
        self.assertEqual(result["debug_info"]["retrieval"]["citation_count"], 1)
        self.assertFalse(result["debug_info"]["fallback_used"])

    def test_rag_fallback_marks_low_confidence_and_debug_flag(self) -> None:
        router = UnifiedQueryRouter(
            faq_service=FakeFAQService(),
            rag_service=FakeFallbackRAGService(),
            llm=lambda prompt: "LLM",
        )
        result = router.route("服务器 999 条政策是什么")
        self.assertEqual(result["route"], "rag")
        self.assertEqual(result["confidence"]["label"], "low")
        self.assertLessEqual(result["confidence"]["score"], 0.35)
        self.assertTrue(result["debug_info"]["fallback_used"])
        self.assertEqual(result["debug_info"]["retrieval"]["context_count"], 0)

    def test_stream_route_returns_stream_metadata(self) -> None:
        router = UnifiedQueryRouter(
            faq_service=FakeFAQService(),
            rag_service=FakeRAGService(),
            llm=lambda prompt: "LLM",
            llm_stream=lambda prompt: ["你好", "，我是助手"],
        )
        metadata, stream = router.stream_route("你是谁")
        self.assertEqual(metadata["route"], "general_llm")
        self.assertIn("confidence", metadata)
        self.assertIn("debug_info", metadata)
        self.assertEqual(metadata["confidence"]["label"], "low")
        self.assertEqual("".join(stream), "你好，我是助手")


if __name__ == "__main__":
    unittest.main()
