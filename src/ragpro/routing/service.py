from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import TYPE_CHECKING

from ragpro.config import get_logger, get_settings

from .prompts import build_general_chat_prompt
from .rules import LightweightIntentClassifier, RetrievalStrategySelector

logger = get_logger("ragpro.routing.service")

if TYPE_CHECKING:
    from ragpro.faq_match import FAQMatchService
    from ragpro.generation import RAGGenerationService


class UnifiedQueryRouter:
    def __init__(
        self,
        *,
        faq_service: FAQMatchService,
        llm: Callable[[str], str],
        llm_stream: Callable[[str], Iterable[str]] | None = None,
        rag_service: RAGGenerationService | None = None,
        rag_service_factory: Callable[[], RAGGenerationService] | None = None,
        intent_classifier: LightweightIntentClassifier | None = None,
        strategy_selector: RetrievalStrategySelector | None = None,
    ) -> None:
        self.faq_service = faq_service
        self.llm = llm
        self.llm_stream = llm_stream
        self.rag_service = rag_service
        self.rag_service_factory = rag_service_factory
        self.intent_classifier = intent_classifier or LightweightIntentClassifier()
        self.strategy_selector = strategy_selector or RetrievalStrategySelector()
        self.settings = get_settings()

    def _get_rag_service(self) -> RAGGenerationService:
        if self.rag_service is None:
            if self.rag_service_factory is None:
                raise RuntimeError("RAG service is not configured.")
            self.rag_service = self.rag_service_factory()
        return self.rag_service

    def _stream_text(self, text: str) -> Iterable[str]:
        if not text:
            return iter(())
        return iter([text])

    def _finalize_result(self, result: dict, *, source_filter: str | None) -> dict:
        payload = dict(result)
        payload.setdefault("confidence", self._build_confidence(payload))
        payload.setdefault("debug_info", self._build_debug_info(payload, source_filter=source_filter))
        return payload

    def _build_confidence(self, result: dict) -> dict:
        route = str(result.get("route") or "")
        citations = result.get("citations") or []
        context_count = int(result.get("context_count") or 0)
        fallback_used = self._is_fallback_result(result)

        if route == "faq_match":
            score = float(result.get("score") or 0.0)
        elif route == "general_llm":
            score = 0.35
        elif route == "rag_unavailable":
            score = 0.05
        elif route == "rag":
            if fallback_used:
                score = 0.25
            else:
                score = 0.55
                if citations:
                    score += 0.15
                if context_count >= 2:
                    score += 0.15
                elif context_count == 1:
                    score += 0.1
                if result.get("retrieval_backend"):
                    score += 0.05
        else:
            score = 0.3

        score = round(max(0.0, min(score, 1.0)), 4)
        if score >= 0.75:
            label = "high"
        elif score >= 0.45:
            label = "medium"
        else:
            label = "low"

        return {"score": score, "label": label}

    def _build_debug_info(self, result: dict, *, source_filter: str | None) -> dict:
        citations = result.get("citations") or []
        return {
            "source_filter": source_filter,
            "fallback_used": self._is_fallback_result(result),
            "faq": {
                "score": result.get("score"),
                "matched_question": result.get("matched_question"),
            },
            "routing": {
                "intent": result.get("intent"),
                "route_reason": result.get("route_reason"),
                "strategy_reason": result.get("strategy_reason"),
            },
            "retrieval": {
                "backend": result.get("retrieval_backend"),
                "strategy": result.get("retrieval_strategy"),
                "query": result.get("retrieval_query"),
                "context_count": int(result.get("context_count") or 0),
                "citation_count": len(citations),
            },
        }

    @staticmethod
    def _is_fallback_result(result: dict) -> bool:
        route = str(result.get("route") or "")
        if route == "rag_unavailable":
            return True
        if route != "rag":
            return False
        citations = result.get("citations") or []
        context_count = int(result.get("context_count") or 0)
        return context_count == 0 and not citations

    def route(
        self,
        query: str,
        *,
        threshold: float = 0.85,
        source_filter: str | None = None,
        history: list[dict] | None = None,
    ) -> dict:
        faq_result = self.faq_service.search(query, threshold=threshold)
        if faq_result.matched:
            return self._finalize_result({
                "route": "faq_match",
                "matched": True,
                "intent": "professional",
                "retrieval_strategy": "direct",
                "route_reason": "FAQ 高置信命中，直接返回缓存或数据库答案。",
                "strategy_reason": "FAQ 分支不需要额外检索策略。",
                "answer": faq_result.answer,
                "score": faq_result.score,
                "matched_question": faq_result.matched_question,
                "citations": [],
                "context_count": 0,
                "retrieval_backend": None,
            }, source_filter=source_filter)

        route_decision = self.intent_classifier.classify(query, source_filter=source_filter)
        if route_decision.route.value == "general_llm":
            prompt = build_general_chat_prompt(
                query=route_decision.normalized_query,
                customer_service_phone=self.settings.customer_service_phone,
            )
            answer = self.llm(prompt)
            return self._finalize_result({
                "route": "general_llm",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": None,
                "route_reason": route_decision.reason,
                "strategy_reason": "通用对话不使用知识库检索。",
                "answer": answer,
                "citations": [],
                "context_count": 0,
                "retrieval_backend": None,
            }, source_filter=source_filter)

        strategy_decision = self.strategy_selector.select(route_decision.normalized_query)
        try:
            rag_result = self._get_rag_service().answer(
                route_decision.normalized_query,
                source_filter=source_filter,
                history=history,
                retrieval_query=strategy_decision.retrieval_query,
            )
            return self._finalize_result({
                "route": "rag",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": strategy_decision.strategy.value,
                "route_reason": route_decision.reason,
                "strategy_reason": strategy_decision.reason,
                **rag_result,
            }, source_filter=source_filter)
        except Exception as exc:
            logger.exception("RAG branch failed after FAQ miss.")
            return self._finalize_result({
                "route": "rag_unavailable",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": strategy_decision.strategy.value,
                "route_reason": route_decision.reason,
                "strategy_reason": strategy_decision.reason,
                "answer": None,
                "error": str(exc),
                "fallback_reason": "FAQ 未命中，但 RAG 检索链路当前不可用。",
                "citations": [],
                "context_count": 0,
                "retrieval_query": strategy_decision.retrieval_query,
                "retrieval_backend": None,
            }, source_filter=source_filter)

    def stream_route(
        self,
        query: str,
        *,
        threshold: float = 0.85,
        source_filter: str | None = None,
        history: list[dict] | None = None,
    ) -> tuple[dict, Iterable[str]]:
        faq_result = self.faq_service.search(query, threshold=threshold)
        if faq_result.matched:
            metadata = self._finalize_result({
                "route": "faq_match",
                "matched": True,
                "intent": "professional",
                "retrieval_strategy": "direct",
                "route_reason": "FAQ 高置信命中，直接返回缓存或数据库答案。",
                "strategy_reason": "FAQ 分支不需要额外检索策略。",
                "score": faq_result.score,
                "matched_question": faq_result.matched_question,
                "citations": [],
                "context_count": 0,
                "retrieval_backend": None,
            }, source_filter=source_filter)
            return metadata, self._stream_text(faq_result.answer or "")

        route_decision = self.intent_classifier.classify(query, source_filter=source_filter)
        if route_decision.route.value == "general_llm":
            prompt = build_general_chat_prompt(
                query=route_decision.normalized_query,
                customer_service_phone=self.settings.customer_service_phone,
            )
            if self.llm_stream is None:
                answer = self.llm(prompt)
                stream = self._stream_text(answer)
            else:
                stream = self.llm_stream(prompt)
            metadata = self._finalize_result({
                "route": "general_llm",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": None,
                "route_reason": route_decision.reason,
                "strategy_reason": "通用对话不使用知识库检索。",
                "citations": [],
                "context_count": 0,
                "retrieval_backend": None,
            }, source_filter=source_filter)
            return metadata, stream

        strategy_decision = self.strategy_selector.select(route_decision.normalized_query)
        try:
            rag_metadata, stream = self._get_rag_service().stream_answer(
                route_decision.normalized_query,
                source_filter=source_filter,
                history=history,
                retrieval_query=strategy_decision.retrieval_query,
            )
            metadata = self._finalize_result({
                "route": "rag",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": strategy_decision.strategy.value,
                "route_reason": route_decision.reason,
                "strategy_reason": strategy_decision.reason,
                **rag_metadata,
            }, source_filter=source_filter)
            return metadata, stream
        except Exception as exc:
            logger.exception("RAG branch failed after FAQ miss.")
            metadata = self._finalize_result({
                "route": "rag_unavailable",
                "matched": False,
                "intent": route_decision.intent.value,
                "retrieval_strategy": strategy_decision.strategy.value,
                "route_reason": route_decision.reason,
                "strategy_reason": strategy_decision.reason,
                "error": str(exc),
                "fallback_reason": "FAQ 未命中，但 RAG 检索链路当前不可用。",
                "citations": [],
                "context_count": 0,
                "retrieval_query": strategy_decision.retrieval_query,
                "retrieval_backend": None,
            }, source_filter=source_filter)
            return metadata, iter(())
