from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.evaluation import DatasetLoadError, EvaluationCase, EvaluationRunner, load_dataset


class EvaluationDatasetTests(unittest.TestCase):
    def test_load_dataset_supports_extended_case_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            dataset_path = Path(tmpdir) / "dataset.json"
            dataset_path.write_text(
                json.dumps(
                    {
                        "name": "phase-one-regression",
                        "cases": [
                            {
                                "id": "rag-1",
                                "category": "rag",
                                "tags": ["concept", "baseline"],
                                "query": "What is an LLM?",
                                "source_filter": "ai",
                                "expected_route": "rag",
                                "expected_faq_matched_question": "unused",
                                "expected_min_faq_score": 0.8,
                                "expected_retrieval_strategy": "hyde",
                                "expected_keywords": ["LLM", "model"],
                                "expected_min_citations": 1,
                                "expected_backend": "milvus",
                                "expected_citation_sources": ["ai"],
                                "expected_primary_citation_source": "ai",
                                "expected_topk_citation_snippets": ["LLM background"],
                                "expected_topk_limit": 2,
                                "expected_top1_citation_snippets": ["LLM background"],
                                "expected_min_context_count": 2,
                                "expected_answer_snippets": ["language model"],
                                "forbidden_answer_snippets": ["hallucinated fact"],
                                "expected_fallback": False,
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            dataset = load_dataset(dataset_path)

        self.assertEqual(dataset.name, "phase-one-regression")
        self.assertEqual(len(dataset.cases), 1)
        case = dataset.cases[0]
        self.assertEqual(case.case_id, "rag-1")
        self.assertEqual(case.category, "rag")
        self.assertEqual(case.tags, ("concept", "baseline"))
        self.assertEqual(case.expected_faq_matched_question, "unused")
        self.assertEqual(case.expected_min_faq_score, 0.8)
        self.assertEqual(case.expected_retrieval_strategy, "hyde")
        self.assertEqual(case.expected_keywords, ("LLM", "model"))
        self.assertEqual(case.expected_citation_sources, ("ai",))
        self.assertEqual(case.expected_primary_citation_source, "ai")
        self.assertEqual(case.expected_topk_citation_snippets, ("LLM background",))
        self.assertEqual(case.expected_topk_limit, 2)
        self.assertEqual(case.expected_top1_citation_snippets, ("LLM background",))
        self.assertEqual(case.expected_min_context_count, 2)
        self.assertEqual(case.expected_answer_snippets, ("language model",))
        self.assertEqual(case.forbidden_answer_snippets, ("hallucinated fact",))
        self.assertFalse(case.expected_fallback)

    def test_load_dataset_rejects_empty_query(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            dataset_path = Path(tmpdir) / "dataset.json"
            dataset_path.write_text(
                json.dumps([{"id": "bad-case", "query": ""}], ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaises(DatasetLoadError):
                load_dataset(dataset_path)


class EvaluationRunnerTests(unittest.TestCase):
    def test_runner_computes_summary_category_breakdown_and_check_metrics(self) -> None:
        cases = [
            EvaluationCase(
                case_id="faq-1",
                category="faq",
                query="How to time a function with contextmanager?",
                expected_route="faq_match",
                expected_faq_matched_question="How to time a function with contextmanager?",
                expected_min_faq_score=0.95,
                expected_keywords=("contextmanager", "time"),
            ),
            EvaluationCase(
                case_id="rag-1",
                category="rag",
                tags=("concept",),
                query="What is an LLM?",
                source_filter="ai",
                expected_route="rag",
                expected_retrieval_strategy="hyde",
                expected_keywords=("LLM", "model"),
                expected_min_citations=1,
                expected_backend="milvus",
                expected_citation_sources=("ai",),
                expected_primary_citation_source="ai",
                expected_topk_citation_snippets=("LLM background",),
                expected_topk_limit=2,
                expected_top1_citation_snippets=("LLM background",),
                expected_min_context_count=2,
                expected_answer_snippets=("language model",),
                forbidden_answer_snippets=("hallucinated fact",),
                expected_fallback=False,
            ),
            EvaluationCase(
                case_id="fallback-1",
                category="fallback",
                query="What is article 999 of the alien policy?",
                source_filter="ops",
                expected_route="rag",
                expected_backend="milvus",
                expected_fallback=True,
            ),
        ]

        responses = {
            "faq-1": {
                "route": "faq_match",
                "answer": "Use contextmanager with time.time().",
                "score": 0.91,
                "matched_question": "How to time a function with contextmanager?",
                "citations": [],
                "retrieval_backend": None,
                "context_count": 0,
            },
            "rag-1": {
                "route": "general_llm",
                "retrieval_strategy": "rewrite",
                "answer": "This is a generic reply.",
                "citations": [
                    {
                        "source": "docs",
                        "timestamp": "2026-04-09",
                        "excerpt": "Generic documentation snippet.",
                    }
                ],
                "retrieval_backend": "local",
                "context_count": 1,
            },
            "fallback-1": {
                "route": "rag",
                "retrieval_strategy": "direct",
                "answer": "No reliable context found.",
                "citations": [],
                "retrieval_backend": "milvus",
                "context_count": 0,
            },
        }

        runner = EvaluationRunner(lambda case: responses[case.case_id])
        report = runner.run(cases, dataset_name="phase-one-regression")

        self.assertEqual(report.summary["total_cases"], 3)
        self.assertEqual(report.summary["passed_cases"], 1)
        self.assertAlmostEqual(report.summary["pass_rate"], 0.3333)
        self.assertAlmostEqual(report.summary["route_accuracy"], 0.6667)
        self.assertAlmostEqual(report.summary["faq_hit_rate"], 1.0)
        self.assertAlmostEqual(report.summary["faq_exact_question_hit_rate"], 1.0)
        self.assertAlmostEqual(report.summary["faq_score_pass_rate"], 0.0)
        self.assertAlmostEqual(report.summary["keyword_match_rate"], 0.5)
        self.assertAlmostEqual(report.summary["citation_coverage_rate"], 1.0)
        self.assertAlmostEqual(report.summary["strategy_accuracy"], 0.0)
        self.assertAlmostEqual(report.summary["backend_accuracy"], 0.5)
        self.assertAlmostEqual(report.summary["citation_source_hit_rate"], 0.0)
        self.assertAlmostEqual(report.summary["top_citation_hit_rate"], 0.0)
        self.assertAlmostEqual(report.summary["topk_retrieval_hit_rate"], 0.0)
        self.assertAlmostEqual(report.summary["rerank_top1_accuracy"], 0.0)
        self.assertAlmostEqual(report.summary["context_coverage_rate"], 0.0)
        self.assertAlmostEqual(report.summary["answer_fidelity_rate"], 0.0)
        self.assertAlmostEqual(report.summary["answer_safety_rate"], 1.0)
        self.assertAlmostEqual(report.summary["fallback_accuracy"], 1.0)
        self.assertEqual(report.summary["failure_breakdown"]["route"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["faq_score"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["strategy"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["keywords"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["citations"], 0)
        self.assertEqual(report.summary["failure_breakdown"]["backend"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["citation_sources"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["top_citation"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["topk_retrieval"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["rerank_top1"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["context"], 1)
        self.assertEqual(report.summary["failure_breakdown"]["answer_fidelity"], 1)

        rag_summary = report.summary["category_breakdown"]["rag"]
        self.assertEqual(rag_summary["total_cases"], 1)
        self.assertEqual(rag_summary["passed_cases"], 0)
        self.assertAlmostEqual(rag_summary["pass_rate"], 0.0)
        self.assertEqual(report.summary["tag_breakdown"]["concept"]["total_cases"], 1)
        self.assertAlmostEqual(report.summary["tag_breakdown"]["concept"]["pass_rate"], 0.0)

        fallback_case = next(item for item in report.results if item.case_id == "fallback-1")
        self.assertEqual(fallback_case.category, "fallback")
        self.assertTrue(fallback_case.fallback_detected)
        self.assertTrue(fallback_case.checks["fallback"])

        faq_case = next(item for item in report.results if item.case_id == "faq-1")
        self.assertEqual(faq_case.response_faq_score, 0.91)
        self.assertEqual(
            faq_case.response_faq_matched_question,
            "How to time a function with contextmanager?",
        )
        self.assertTrue(faq_case.checks["faq_question"])
        self.assertFalse(faq_case.checks["faq_score"])

        rag_case = next(item for item in report.results if item.case_id == "rag-1")
        self.assertFalse(rag_case.passed)
        self.assertFalse(rag_case.checks["route"])
        self.assertFalse(rag_case.checks["strategy"])
        self.assertFalse(rag_case.checks["keywords"])
        self.assertTrue(rag_case.checks["citations"])
        self.assertFalse(rag_case.checks["backend"])
        self.assertFalse(rag_case.checks["citation_sources"])
        self.assertFalse(rag_case.checks["top_citation"])
        self.assertFalse(rag_case.checks["topk_retrieval"])
        self.assertFalse(rag_case.checks["rerank_top1"])
        self.assertEqual(rag_case.citation_excerpts, ("Generic documentation snippet.",))
        self.assertEqual(rag_case.top_citation_excerpt, "Generic documentation snippet.")
        self.assertFalse(rag_case.checks["context"])
        self.assertFalse(rag_case.checks["answer_fidelity"])
        self.assertTrue(rag_case.checks["answer_safety"])

    def test_runner_accepts_history_and_source_filter(self) -> None:
        captured: list[EvaluationCase] = []
        cases = [
            EvaluationCase(
                case_id="follow-up",
                category="conversation",
                query="Is it suitable for beginners?",
                source_filter="ai",
                history=(
                    {"question": "What version is the AI course?", "answer": "The version is V6.0."},
                ),
                expected_route="rag",
                expected_retrieval_strategy="hyde",
                expected_citation_sources=("ai",),
                expected_primary_citation_source="ai",
                expected_topk_citation_snippets=("AI course",),
                expected_topk_limit=2,
                expected_top1_citation_snippets=("AI course",),
                expected_min_context_count=1,
                expected_answer_snippets=("beginners",),
            )
        ]

        runner = EvaluationRunner(
            lambda case: captured.append(case) or {
                "route": "rag",
                "retrieval_strategy": "hyde",
                "answer": "Yes, it is suitable for beginners.",
                "citations": [{"source": "ai", "excerpt": "AI course is suitable for beginners."}],
                "retrieval_backend": "milvus",
                "context_count": 1,
            }
        )
        report = runner.run(cases)

        self.assertEqual(report.summary["total_cases"], 1)
        self.assertEqual(captured[0].source_filter, "ai")
        self.assertEqual(captured[0].history[0]["question"], "What version is the AI course?")
        self.assertAlmostEqual(report.summary["strategy_accuracy"], 1.0)
        self.assertAlmostEqual(report.summary["citation_source_hit_rate"], 1.0)
        self.assertAlmostEqual(report.summary["top_citation_hit_rate"], 1.0)
        self.assertAlmostEqual(report.summary["topk_retrieval_hit_rate"], 1.0)
        self.assertAlmostEqual(report.summary["rerank_top1_accuracy"], 1.0)
        self.assertAlmostEqual(report.summary["context_coverage_rate"], 1.0)
        self.assertAlmostEqual(report.summary["answer_fidelity_rate"], 1.0)
        self.assertEqual(report.summary["tag_breakdown"], {})


if __name__ == "__main__":
    unittest.main()
