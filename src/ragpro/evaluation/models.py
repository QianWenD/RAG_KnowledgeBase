from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class EvaluationCase:
    case_id: str
    query: str
    category: str = "general"
    tags: tuple[str, ...] = ()
    source_filter: str | None = None
    history: tuple[dict, ...] = ()
    expected_route: str | None = None
    expected_faq_matched_question: str | None = None
    expected_min_faq_score: float | None = None
    expected_retrieval_strategy: str | None = None
    expected_keywords: tuple[str, ...] = ()
    expected_min_citations: int = 0
    expected_backend: str | None = None
    expected_citation_sources: tuple[str, ...] = ()
    expected_primary_citation_source: str | None = None
    expected_topk_citation_snippets: tuple[str, ...] = ()
    expected_topk_limit: int | None = None
    expected_top1_citation_snippets: tuple[str, ...] = ()
    expected_min_context_count: int | None = None
    expected_answer_snippets: tuple[str, ...] = ()
    forbidden_answer_snippets: tuple[str, ...] = ()
    expected_fallback: bool | None = None
    notes: str = ""


@dataclass(frozen=True)
class EvaluationDataset:
    name: str
    source_path: str
    cases: tuple[EvaluationCase, ...]


@dataclass(frozen=True)
class EvaluationCaseResult:
    case_id: str
    category: str
    tags: tuple[str, ...]
    query: str
    source_filter: str | None
    passed: bool
    checks: dict[str, bool]
    applicable_checks: dict[str, bool]
    response_route: str | None
    response_strategy: str | None
    response_backend: str | None
    response_faq_score: float | None
    response_faq_matched_question: str | None
    citation_count: int
    citation_sources: tuple[str, ...]
    citation_excerpts: tuple[str, ...]
    top_citation_source: str | None
    top_citation_excerpt: str | None
    context_count: int
    fallback_detected: bool
    answer_excerpt: str
    failure_reasons: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class EvaluationReport:
    dataset_name: str
    generated_at: str
    summary: dict
    results: tuple[EvaluationCaseResult, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        return {
            "dataset_name": self.dataset_name,
            "generated_at": self.generated_at,
            "summary": self.summary,
            "results": [item.to_dict() for item in self.results],
        }
