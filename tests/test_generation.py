from __future__ import annotations

import sys
import unittest
from pathlib import Path

from langchain_core.documents import Document

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.generation.service import RAGGenerationService


class FakeVectorStore:
    backend = "local"


class FakeRetrievalService:
    def __init__(self, docs: list[Document]) -> None:
        self.docs = docs
        self.vector_store = FakeVectorStore()
        self.last_query: str | None = None

    def retrieve(self, query: str, source_filter: str | None = None):
        self.last_query = query
        return self.docs


class GenerationServiceTests(unittest.TestCase):
    def test_build_plan_deduplicates_citations_and_includes_backend(self) -> None:
        docs = [
            Document(
                page_content="第一段资料说明了 RAG 的基本流程。",
                metadata={
                    "source": "ai",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 1.2345,
                    "matched_chunks": 2,
                },
            ),
            Document(
                page_content="第一段资料说明了 RAG 的基本流程。",
                metadata={
                    "source": "ai",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 1.1111,
                    "matched_chunks": 1,
                },
            ),
        ]
        retrieval = FakeRetrievalService(docs)
        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=lambda prompt: "answer",
        )

        plan = service.build_plan("什么是 RAG")

        self.assertEqual(plan.retrieval_backend, "local")
        self.assertEqual(plan.context_count, 2)
        self.assertEqual(len(plan.citations), 1)
        self.assertEqual(plan.citations[0]["source"], "ai")
        self.assertIn("excerpt", plan.citations[0])

    def test_answer_returns_backend_metadata(self) -> None:
        docs = [
            Document(
                page_content="资料说明了向量检索的基本做法。",
                metadata={"source": "ai", "timestamp": "2026-04-09"},
            )
        ]
        retrieval = FakeRetrievalService(docs)
        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=lambda prompt: "最终答案",
        )

        result = service.answer("如何做向量检索")

        self.assertEqual(result["answer"], "最终答案")
        self.assertEqual(result["retrieval_backend"], "local")
        self.assertEqual(result["context_count"], 1)

    def test_build_plan_contextualizes_short_follow_up_query(self) -> None:
        docs = [
            Document(
                page_content="资料说明了 Milvus 和教学场景的结合方式。",
                metadata={"source": "ai", "timestamp": "2026-04-09"},
            )
        ]
        retrieval = FakeRetrievalService(docs)
        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=lambda prompt: "最终答案",
        )

        plan = service.build_plan(
            "它适合新手吗",
            history=[
                {"question": "Milvus 怎么用于教学项目", "answer": "可以作为向量检索底座"},
                {"question": "那部署复杂吗", "answer": "取决于运行方式"},
            ],
            retrieval_query="它适合新手吗",
        )

        self.assertIn("Milvus 怎么用于教学项目", plan.retrieval_query)
        self.assertEqual(retrieval.last_query, plan.retrieval_query)
        self.assertIn("最近对话", plan.prompt)

    def test_answer_uses_fallback_when_no_context_exists(self) -> None:
        retrieval = FakeRetrievalService([])

        def fail_if_called(_: str) -> str:
            raise AssertionError("LLM should not be called when no retrieval context exists")

        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=fail_if_called,
        )

        result = service.answer("这个课程多少钱")

        self.assertIn("暂时没有检索到足够资料", result["answer"])
        self.assertEqual(result["context_count"], 0)
        self.assertEqual(result["citations"], [])

    def test_citations_are_sorted_by_score_and_chunk_count(self) -> None:
        docs = [
            Document(
                page_content="资料 A",
                metadata={
                    "source": "doc-a",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 1.1,
                    "matched_chunks": 3,
                },
            ),
            Document(
                page_content="资料 B",
                metadata={
                    "source": "doc-b",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 3.6,
                    "matched_chunks": 1,
                },
            ),
            Document(
                page_content="资料 C",
                metadata={
                    "source": "doc-c",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 3.6,
                    "matched_chunks": 4,
                },
            ),
        ]
        retrieval = FakeRetrievalService(docs)
        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=lambda prompt: "最终答案",
        )

        plan = service.build_plan("请介绍 Milvus")

        self.assertEqual([item["source"] for item in plan.citations], ["doc-c", "doc-b", "doc-a"])

    def test_build_plan_cleans_html_and_ocr_noise_for_prompt_and_citation(self) -> None:
        docs = [
            Document(
                page_content=(
                    "<html><body><table><tr><td>模块</td><td>LLM背景知识介绍</td></tr></table>"
                    " 学习目标 ）了解LLM背景的知识 ）掌握什么是语言模型</body></html>"
                ),
                metadata={
                    "source": "ai",
                    "timestamp": "2026-04-09",
                    "retrieval_score": 2.4,
                    "matched_chunks": 2,
                },
            )
        ]
        retrieval = FakeRetrievalService(docs)
        service = RAGGenerationService(
            retrieval_service=retrieval,
            llm=lambda prompt: "最终答案",
        )

        plan = service.build_plan("什么是大语言模型")

        self.assertNotIn("<html>", plan.prompt)
        self.assertNotIn("）了解", plan.prompt)
        self.assertIn("LLM背景知识介绍", plan.prompt)
        self.assertNotIn("<html>", plan.citations[0]["excerpt"])
        self.assertNotIn("）了解", plan.citations[0]["excerpt"])
        self.assertIn("了解LLM背景的知识", plan.citations[0]["excerpt"])


if __name__ == "__main__":
    unittest.main()
