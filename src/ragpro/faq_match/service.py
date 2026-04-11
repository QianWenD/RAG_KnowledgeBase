from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from rank_bm25 import BM25Okapi

from ragpro.config import get_logger
from .cache import FAQRedisCache
from .preprocess import preprocess_text
from .repository import FAQMySQLRepository

logger = get_logger("ragpro.faq.service")


@dataclass
class FAQMatchResult:
    answer: str | None
    matched: bool
    score: float
    matched_question: str | None = None


class FAQMatchService:
    def __init__(self, cache: FAQRedisCache, repository: FAQMySQLRepository) -> None:
        self.cache = cache
        self.repository = repository
        self.original_questions: list[str] = []
        self.tokenized_questions: list[list[str]] = []
        self.bm25: BM25Okapi | None = None
        self._load_data()

    def _load_data(self) -> None:
        original_key = "qa_original_questions"
        tokenized_key = "qa_tokenized_questions"

        original_questions = self.cache.get_json(original_key)
        tokenized_questions = self.cache.get_json(tokenized_key)

        if not original_questions or not tokenized_questions:
            original_questions = self.repository.fetch_questions()
            tokenized_questions = [preprocess_text(q) for q in original_questions]
            self.cache.set_json(original_key, original_questions)
            self.cache.set_json(tokenized_key, tokenized_questions)

        self.original_questions = list(original_questions)
        self.tokenized_questions = list(tokenized_questions)
        self.bm25 = BM25Okapi(self.tokenized_questions) if self.tokenized_questions else None
        logger.info("FAQ BM25 index initialized with %s questions.", len(self.original_questions))

    @staticmethod
    def _softmax(scores: np.ndarray) -> np.ndarray:
        exp_scores = np.exp(scores - np.max(scores))
        return exp_scores / exp_scores.sum()

    def search(self, query: str, threshold: float = 0.85) -> FAQMatchResult:
        if not isinstance(query, str) or not query.strip() or self.bm25 is None:
            return FAQMatchResult(answer=None, matched=False, score=0.0)

        stripped_query = query.strip()
        cached_answer = self.cache.get_answer(query)
        if cached_answer:
            return FAQMatchResult(
                answer=cached_answer,
                matched=True,
                score=1.0,
                matched_question=stripped_query,
            )

        if stripped_query in self.original_questions:
            answer = self.repository.fetch_answer(stripped_query)
            if answer:
                self.cache.set_answer(query, answer)
                return FAQMatchResult(
                    answer=answer,
                    matched=True,
                    score=1.0,
                    matched_question=stripped_query,
                )

        query_tokens = preprocess_text(query)
        scores = self.bm25.get_scores(query_tokens)
        normalized_scores = self._softmax(scores)
        best_idx = int(normalized_scores.argmax())
        best_score = float(normalized_scores[best_idx])
        best_question = self.original_questions[best_idx]

        if best_score >= threshold:
            answer = self.repository.fetch_answer(best_question)
            if answer:
                self.cache.set_answer(query, answer)
                return FAQMatchResult(
                    answer=answer,
                    matched=True,
                    score=best_score,
                    matched_question=best_question,
                )

        return FAQMatchResult(
            answer=None,
            matched=False,
            score=best_score,
            matched_question=best_question,
        )
