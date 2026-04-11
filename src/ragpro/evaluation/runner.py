from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from datetime import datetime

from .models import EvaluationCase, EvaluationCaseResult, EvaluationReport


class EvaluationRunner:
    def __init__(self, execute_case: Callable[[EvaluationCase], dict]) -> None:
        self.execute_case = execute_case

    def run(
        self,
        cases: list[EvaluationCase] | tuple[EvaluationCase, ...],
        *,
        dataset_name: str = "unnamed-dataset",
    ) -> EvaluationReport:
        results: list[EvaluationCaseResult] = []
        for case in cases:
            response = self.execute_case(case)
            results.append(self._evaluate_case(case, response))

        total_cases = len(results)
        passed_cases = sum(1 for item in results if item.passed)
        route_distribution = Counter((item.response_route or "unknown") for item in results)
        failure_breakdown = Counter(
            reason for item in results for reason in item.failure_reasons
        )
        check_summary = self._build_check_summary(results)
        faq_summary = self._build_faq_summary(results)

        summary = {
            "total_cases": total_cases,
            "passed_cases": passed_cases,
            "failed_cases": total_cases - passed_cases,
            "pass_rate": _ratio(passed_cases, total_cases),
            "route_accuracy": check_summary["route"]["pass_rate"],
            "faq_hit_rate": faq_summary["faq_hit_rate"],
            "faq_exact_question_hit_rate": faq_summary["faq_exact_question_hit_rate"],
            "faq_score_pass_rate": faq_summary["faq_score_pass_rate"],
            "strategy_accuracy": check_summary["strategy"]["pass_rate"],
            "keyword_match_rate": check_summary["keywords"]["pass_rate"],
            "citation_coverage_rate": check_summary["citations"]["pass_rate"],
            "backend_accuracy": check_summary["backend"]["pass_rate"],
            "citation_source_hit_rate": check_summary["citation_sources"]["pass_rate"],
            "top_citation_hit_rate": check_summary["top_citation"]["pass_rate"],
            "topk_retrieval_hit_rate": check_summary["topk_retrieval"]["pass_rate"],
            "rerank_top1_accuracy": check_summary["rerank_top1"]["pass_rate"],
            "context_coverage_rate": check_summary["context"]["pass_rate"],
            "answer_fidelity_rate": check_summary["answer_fidelity"]["pass_rate"],
            "answer_safety_rate": check_summary["answer_safety"]["pass_rate"],
            "fallback_accuracy": check_summary["fallback"]["pass_rate"],
            "average_context_count": round(
                sum(item.context_count for item in results) / max(total_cases, 1),
                4,
            ),
            "route_distribution": dict(route_distribution),
            "category_breakdown": self._build_category_breakdown(results),
            "tag_breakdown": self._build_tag_breakdown(results),
            "check_summary": check_summary,
            "failure_breakdown": dict(failure_breakdown),
        }

        for check_name in check_summary:
            summary["failure_breakdown"].setdefault(check_name, 0)

        return EvaluationReport(
            dataset_name=dataset_name,
            generated_at=datetime.now().isoformat(),
            summary=summary,
            results=tuple(results),
        )

    def _evaluate_case(self, case: EvaluationCase, response: dict) -> EvaluationCaseResult:
        answer = str(response.get("answer") or "")
        citations = response.get("citations") or []
        response_route = _optional_text(response.get("route"))
        response_strategy = _optional_text(response.get("retrieval_strategy"))
        response_backend = _optional_text(response.get("retrieval_backend"))
        response_faq_score = _optional_float(response.get("score"))
        response_faq_matched_question = _optional_text(response.get("matched_question"))
        citation_excerpts = tuple(
            _optional_text(item.get("excerpt")) or ""
            for item in citations
            if isinstance(item, dict)
        )
        citation_sources = tuple(
            sorted(
                {
                    _optional_text(item.get("source")) or "unknown"
                    for item in citations
                    if isinstance(item, dict)
                }
            )
        )
        top_citation_source = _optional_text(citations[0].get("source")) if citations else None
        top_citation_excerpt = _optional_text(citations[0].get("excerpt")) if citations else None
        fallback_detected = _detect_fallback(
            route=response_route,
            context_count=int(response.get("context_count") or 0),
            citation_count=len(citations),
        )
        applicable_checks = {
            "route": case.expected_route is not None,
            "faq_question": case.expected_faq_matched_question is not None,
            "faq_score": case.expected_min_faq_score is not None,
            "strategy": case.expected_retrieval_strategy is not None,
            "keywords": bool(case.expected_keywords),
            "citations": case.expected_min_citations > 0,
            "backend": case.expected_backend is not None,
            "citation_sources": bool(case.expected_citation_sources),
            "top_citation": case.expected_primary_citation_source is not None,
            "topk_retrieval": bool(case.expected_topk_citation_snippets),
            "rerank_top1": bool(case.expected_top1_citation_snippets),
            "context": case.expected_min_context_count is not None,
            "answer_fidelity": bool(case.expected_answer_snippets),
            "answer_safety": bool(case.forbidden_answer_snippets),
            "fallback": case.expected_fallback is not None,
        }

        checks = {
            "route": case.expected_route is None or response_route == case.expected_route,
            "faq_question": case.expected_faq_matched_question is None
            or response_faq_matched_question == case.expected_faq_matched_question,
            "faq_score": case.expected_min_faq_score is None
            or (response_faq_score is not None and response_faq_score >= case.expected_min_faq_score),
            "strategy": case.expected_retrieval_strategy is None
            or response_strategy == case.expected_retrieval_strategy,
            "keywords": _keywords_match(answer, case.expected_keywords),
            "citations": len(citations) >= case.expected_min_citations,
            "backend": case.expected_backend is None or response_backend == case.expected_backend,
            "citation_sources": not case.expected_citation_sources
            or set(case.expected_citation_sources).issubset(set(citation_sources)),
            "top_citation": case.expected_primary_citation_source is None
            or top_citation_source == case.expected_primary_citation_source,
            "topk_retrieval": _citation_snippets_match(
                citation_excerpts,
                case.expected_topk_citation_snippets,
                limit=case.expected_topk_limit,
            ),
            "rerank_top1": _citation_snippets_match(
                (top_citation_excerpt,) if top_citation_excerpt else (),
                case.expected_top1_citation_snippets,
                limit=1,
            ),
            "context": case.expected_min_context_count is None
            or int(response.get("context_count") or 0) >= case.expected_min_context_count,
            "answer_fidelity": _snippets_all_match(answer, case.expected_answer_snippets),
            "answer_safety": _snippets_none_match(answer, case.forbidden_answer_snippets),
            "fallback": case.expected_fallback is None or fallback_detected == case.expected_fallback,
        }

        failure_reasons = tuple(name for name, passed in checks.items() if not passed)
        passed = all(checks.values())
        return EvaluationCaseResult(
            case_id=case.case_id,
            category=case.category,
            tags=case.tags,
            query=case.query,
            source_filter=case.source_filter,
            passed=passed,
            checks=checks,
            applicable_checks=applicable_checks,
            response_route=response_route,
            response_strategy=response_strategy,
            response_backend=response_backend,
            response_faq_score=response_faq_score,
            response_faq_matched_question=response_faq_matched_question,
            citation_count=len(citations),
            citation_sources=citation_sources,
            citation_excerpts=citation_excerpts,
            top_citation_source=top_citation_source,
            top_citation_excerpt=top_citation_excerpt,
            context_count=int(response.get("context_count") or 0),
            fallback_detected=fallback_detected,
            answer_excerpt=_clip_text(answer, 160),
            failure_reasons=failure_reasons,
        )

    def _build_check_summary(self, results: list[EvaluationCaseResult]) -> dict[str, dict]:
        names = (
            "route",
            "faq_question",
            "faq_score",
            "strategy",
            "keywords",
            "citations",
            "backend",
            "citation_sources",
            "top_citation",
            "topk_retrieval",
            "rerank_top1",
            "context",
            "answer_fidelity",
            "answer_safety",
            "fallback",
        )
        summary: dict[str, dict] = {}
        for name in names:
            applicable = [item for item in results if item.applicable_checks.get(name)]
            passed = sum(1 for item in applicable if item.checks.get(name))
            total = len(applicable)
            summary[name] = {
                "applicable_cases": total,
                "passed_cases": passed,
                "failed_cases": total - passed,
                "pass_rate": _ratio(passed, total),
            }
        return summary

    def _build_category_breakdown(self, results: list[EvaluationCaseResult]) -> dict[str, dict]:
        categories = sorted({item.category for item in results})
        breakdown: dict[str, dict] = {}
        for category in categories:
            category_results = [item for item in results if item.category == category]
            passed = sum(1 for item in category_results if item.passed)
            check_summary = self._build_check_summary(category_results)
            breakdown[category] = {
                "total_cases": len(category_results),
                "passed_cases": passed,
                "failed_cases": len(category_results) - passed,
                "pass_rate": _ratio(passed, len(category_results)),
                "route_accuracy": check_summary["route"]["pass_rate"],
                "faq_question_hit_rate": check_summary["faq_question"]["pass_rate"],
                "faq_score_pass_rate": check_summary["faq_score"]["pass_rate"],
                "strategy_accuracy": check_summary["strategy"]["pass_rate"],
                "keyword_match_rate": check_summary["keywords"]["pass_rate"],
                "citation_coverage_rate": check_summary["citations"]["pass_rate"],
                "backend_accuracy": check_summary["backend"]["pass_rate"],
                "citation_source_hit_rate": check_summary["citation_sources"]["pass_rate"],
                "top_citation_hit_rate": check_summary["top_citation"]["pass_rate"],
                "topk_retrieval_hit_rate": check_summary["topk_retrieval"]["pass_rate"],
                "rerank_top1_accuracy": check_summary["rerank_top1"]["pass_rate"],
                "context_coverage_rate": check_summary["context"]["pass_rate"],
                "answer_fidelity_rate": check_summary["answer_fidelity"]["pass_rate"],
                "answer_safety_rate": check_summary["answer_safety"]["pass_rate"],
                "fallback_accuracy": check_summary["fallback"]["pass_rate"],
            }
        return breakdown

    def _build_tag_breakdown(self, results: list[EvaluationCaseResult]) -> dict[str, dict]:
        tags = sorted({tag for item in results for tag in getattr(item, "tags", ())})
        breakdown: dict[str, dict] = {}
        for tag in tags:
            tagged_results = [item for item in results if tag in getattr(item, "tags", ())]
            passed = sum(1 for item in tagged_results if item.passed)
            breakdown[tag] = {
                "total_cases": len(tagged_results),
                "passed_cases": passed,
                "failed_cases": len(tagged_results) - passed,
                "pass_rate": _ratio(passed, len(tagged_results)),
            }
        return breakdown

    def _build_faq_summary(self, results: list[EvaluationCaseResult]) -> dict[str, float]:
        faq_results = [item for item in results if item.category == "faq"]
        faq_hit_passed = sum(1 for item in faq_results if item.response_route == "faq_match")
        question_applicable = [item for item in faq_results if item.applicable_checks.get("faq_question")]
        question_passed = sum(1 for item in question_applicable if item.checks.get("faq_question"))
        score_applicable = [item for item in faq_results if item.applicable_checks.get("faq_score")]
        score_passed = sum(1 for item in score_applicable if item.checks.get("faq_score"))
        return {
            "faq_hit_rate": _ratio(faq_hit_passed, len(faq_results)),
            "faq_exact_question_hit_rate": _ratio(question_passed, len(question_applicable)),
            "faq_score_pass_rate": _ratio(score_passed, len(score_applicable)),
        }


def _keywords_match(answer: str, keywords: tuple[str, ...]) -> bool:
    if not keywords:
        return True
    normalized_answer = answer.casefold()
    return all(keyword.casefold() in normalized_answer for keyword in keywords)


def _snippets_all_match(answer: str, snippets: tuple[str, ...]) -> bool:
    if not snippets:
        return True
    normalized_answer = answer.casefold()
    return all(snippet.casefold() in normalized_answer for snippet in snippets)


def _snippets_none_match(answer: str, snippets: tuple[str, ...]) -> bool:
    if not snippets:
        return True
    normalized_answer = answer.casefold()
    return all(snippet.casefold() not in normalized_answer for snippet in snippets)


def _citation_snippets_match(
    excerpts: tuple[str, ...],
    snippets: tuple[str, ...],
    *,
    limit: int | None,
) -> bool:
    if not snippets:
        return True
    if not excerpts:
        return False

    normalized_snippets = tuple(snippet.casefold() for snippet in snippets if snippet)
    if not normalized_snippets:
        return True

    scoped_excerpts = excerpts[:limit] if limit is not None else excerpts
    normalized_excerpts = tuple((excerpt or "").casefold() for excerpt in scoped_excerpts)
    return any(
        snippet in excerpt
        for snippet in normalized_snippets
        for excerpt in normalized_excerpts
    )


def _clip_text(value: str, max_chars: int) -> str:
    compact = " ".join(str(value).split())
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 3].rstrip() + "..."


def _optional_text(value) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None


def _optional_float(value) -> float | None:
    if value in ("", None):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _detect_fallback(*, route: str | None, context_count: int, citation_count: int) -> bool:
    if route != "rag":
        return False
    return context_count == 0 and citation_count == 0


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)
