from __future__ import annotations

import json
from pathlib import Path

from .models import EvaluationCase, EvaluationDataset


class DatasetLoadError(ValueError):
    pass


def load_dataset(path: str | Path) -> EvaluationDataset:
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise DatasetLoadError(f"Dataset file not found: {dataset_path}")

    try:
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise DatasetLoadError(f"Dataset JSON is invalid: {exc}") from exc

    if isinstance(payload, dict):
        dataset_name = str(payload.get("name") or dataset_path.stem)
        case_items = payload.get("cases")
    elif isinstance(payload, list):
        dataset_name = dataset_path.stem
        case_items = payload
    else:
        raise DatasetLoadError("Dataset payload must be a JSON object or array.")

    if not isinstance(case_items, list) or not case_items:
        raise DatasetLoadError("Dataset must contain a non-empty 'cases' array.")

    cases = tuple(_build_case(item, index) for index, item in enumerate(case_items, start=1))
    return EvaluationDataset(name=dataset_name, source_path=str(dataset_path), cases=cases)


def _build_case(item: dict, index: int) -> EvaluationCase:
    if not isinstance(item, dict):
        raise DatasetLoadError(f"Dataset case #{index} must be an object.")

    case_id = str(item.get("id") or item.get("case_id") or f"case-{index}")
    query = str(item.get("query") or item.get("question") or "").strip()
    if not query:
        raise DatasetLoadError(f"Dataset case '{case_id}' is missing a non-empty query.")

    tags = item.get("tags") or ()
    if isinstance(tags, str):
        tags = [tags]
    if not isinstance(tags, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid tags.")

    expected_keywords = item.get("expected_keywords") or ()
    if isinstance(expected_keywords, str):
        expected_keywords = [expected_keywords]
    if not isinstance(expected_keywords, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid expected_keywords.")

    expected_answer_snippets = item.get("expected_answer_snippets") or ()
    if isinstance(expected_answer_snippets, str):
        expected_answer_snippets = [expected_answer_snippets]
    if not isinstance(expected_answer_snippets, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid expected_answer_snippets.")

    forbidden_answer_snippets = item.get("forbidden_answer_snippets") or ()
    if isinstance(forbidden_answer_snippets, str):
        forbidden_answer_snippets = [forbidden_answer_snippets]
    if not isinstance(forbidden_answer_snippets, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid forbidden_answer_snippets.")

    expected_citation_sources = item.get("expected_citation_sources") or ()
    if isinstance(expected_citation_sources, str):
        expected_citation_sources = [expected_citation_sources]
    if not isinstance(expected_citation_sources, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid expected_citation_sources.")

    expected_topk_citation_snippets = item.get("expected_topk_citation_snippets") or ()
    if isinstance(expected_topk_citation_snippets, str):
        expected_topk_citation_snippets = [expected_topk_citation_snippets]
    if not isinstance(expected_topk_citation_snippets, list | tuple):
        raise DatasetLoadError(
            f"Dataset case '{case_id}' has invalid expected_topk_citation_snippets."
        )

    expected_top1_citation_snippets = item.get("expected_top1_citation_snippets") or ()
    if isinstance(expected_top1_citation_snippets, str):
        expected_top1_citation_snippets = [expected_top1_citation_snippets]
    if not isinstance(expected_top1_citation_snippets, list | tuple):
        raise DatasetLoadError(
            f"Dataset case '{case_id}' has invalid expected_top1_citation_snippets."
        )

    history = item.get("history") or ()
    if not isinstance(history, list | tuple):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid history.")

    expected_min_citations = item.get("expected_min_citations", 0)
    try:
        expected_min_citations = int(expected_min_citations)
    except (TypeError, ValueError) as exc:
        raise DatasetLoadError(
            f"Dataset case '{case_id}' has invalid expected_min_citations."
        ) from exc

    expected_min_context_count = item.get("expected_min_context_count")
    if expected_min_context_count in ("", None):
        expected_min_context_count = None
    else:
        try:
            expected_min_context_count = int(expected_min_context_count)
        except (TypeError, ValueError) as exc:
            raise DatasetLoadError(
                f"Dataset case '{case_id}' has invalid expected_min_context_count."
            ) from exc

    expected_topk_limit = item.get("expected_topk_limit")
    if expected_topk_limit in ("", None):
        expected_topk_limit = None
    else:
        try:
            expected_topk_limit = int(expected_topk_limit)
        except (TypeError, ValueError) as exc:
            raise DatasetLoadError(
                f"Dataset case '{case_id}' has invalid expected_topk_limit."
            ) from exc

    expected_fallback = item.get("expected_fallback")
    if expected_fallback is not None and not isinstance(expected_fallback, bool):
        raise DatasetLoadError(f"Dataset case '{case_id}' has invalid expected_fallback.")

    expected_min_faq_score = item.get("expected_min_faq_score")
    if expected_min_faq_score in ("", None):
        expected_min_faq_score = None
    else:
        try:
            expected_min_faq_score = float(expected_min_faq_score)
        except (TypeError, ValueError) as exc:
            raise DatasetLoadError(
                f"Dataset case '{case_id}' has invalid expected_min_faq_score."
            ) from exc

    return EvaluationCase(
        case_id=case_id,
        query=query,
        category=str(item.get("category") or "general").strip() or "general",
        tags=tuple(str(tag).strip() for tag in tags if str(tag).strip()),
        source_filter=_optional_str(item.get("source_filter")),
        history=tuple(dict(entry) for entry in history),
        expected_route=_optional_str(item.get("expected_route")),
        expected_faq_matched_question=_optional_str(item.get("expected_faq_matched_question")),
        expected_min_faq_score=max(expected_min_faq_score, 0.0)
        if expected_min_faq_score is not None
        else None,
        expected_retrieval_strategy=_optional_str(item.get("expected_retrieval_strategy")),
        expected_keywords=tuple(str(keyword).strip() for keyword in expected_keywords if str(keyword).strip()),
        expected_min_citations=max(expected_min_citations, 0),
        expected_backend=_optional_str(item.get("expected_backend")),
        expected_citation_sources=tuple(
            str(source).strip() for source in expected_citation_sources if str(source).strip()
        ),
        expected_primary_citation_source=_optional_str(item.get("expected_primary_citation_source")),
        expected_topk_citation_snippets=tuple(
            str(snippet).strip()
            for snippet in expected_topk_citation_snippets
            if str(snippet).strip()
        ),
        expected_topk_limit=max(expected_topk_limit, 1) if expected_topk_limit is not None else None,
        expected_top1_citation_snippets=tuple(
            str(snippet).strip()
            for snippet in expected_top1_citation_snippets
            if str(snippet).strip()
        ),
        expected_min_context_count=max(expected_min_context_count, 0)
        if expected_min_context_count is not None
        else None,
        expected_answer_snippets=tuple(
            str(snippet).strip() for snippet in expected_answer_snippets if str(snippet).strip()
        ),
        forbidden_answer_snippets=tuple(
            str(snippet).strip() for snippet in forbidden_answer_snippets if str(snippet).strip()
        ),
        expected_fallback=expected_fallback,
        notes=str(item.get("notes") or ""),
    )


def _optional_str(value) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None
