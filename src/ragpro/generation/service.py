from __future__ import annotations

import html
import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from ragpro.config import get_settings
from ragpro.conversation import ConversationService
from ragpro.retrieval import RetrievalService

from .prompts import build_rag_prompt


@dataclass(frozen=True)
class GenerationPlan:
    prompt: str
    retrieval_query: str
    citations: list[dict]
    context_count: int
    retrieval_backend: str


class RAGGenerationService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        llm: Callable[[str], str],
        llm_stream: Callable[[str], Iterable[str]] | None = None,
    ) -> None:
        self.retrieval_service = retrieval_service
        self.llm = llm
        self.llm_stream = llm_stream
        self.settings = get_settings()

    def build_plan(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> GenerationPlan:
        retrieval_input = ConversationService.build_retrieval_query(
            query,
            history=history,
            retrieval_query=retrieval_query,
        )
        docs = self.retrieval_service.retrieve(query=retrieval_input, source_filter=source_filter)
        context = self._format_context(docs)
        history_text = ConversationService.compress_history(history)
        retrieval_backend = getattr(self.retrieval_service.vector_store, "backend", "unknown")

        prompt = build_rag_prompt(
            question=query,
            context=context,
            history=history_text,
            customer_service_phone=self.settings.customer_service_phone,
        )
        return GenerationPlan(
            prompt=prompt,
            retrieval_query=retrieval_input,
            citations=self._build_citations(docs),
            context_count=len(docs),
            retrieval_backend=retrieval_backend,
        )

    def answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> dict:
        plan = self.build_plan(
            query,
            source_filter=source_filter,
            history=history,
            retrieval_query=retrieval_query,
        )
        answer = self._generate_answer(plan)
        return {
            "answer": answer,
            "retrieval_query": plan.retrieval_query,
            "citations": plan.citations,
            "context_count": plan.context_count,
            "retrieval_backend": plan.retrieval_backend,
        }

    def stream_answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> tuple[dict, Iterable[str]]:
        plan = self.build_plan(
            query,
            source_filter=source_filter,
            history=history,
            retrieval_query=retrieval_query,
        )

        if plan.context_count == 0:
            answer = self._fallback_answer()
            stream = iter([answer])
        elif self.llm_stream is None:
            answer = self.llm(plan.prompt)
            stream = (chunk for chunk in [answer] if chunk)
        else:
            stream = self.llm_stream(plan.prompt)

        return {
            "retrieval_query": plan.retrieval_query,
            "citations": plan.citations,
            "context_count": plan.context_count,
            "retrieval_backend": plan.retrieval_backend,
        }, stream

    def _generate_answer(self, plan: GenerationPlan) -> str:
        if plan.context_count == 0:
            return self._fallback_answer()
        return self.llm(plan.prompt)

    @staticmethod
    def _fallback_answer() -> str:
        return "暂时没有检索到足够资料来可靠回答这个问题。请补充更具体的关键词、限定来源，或先完善知识库内容。"

    @staticmethod
    def _format_context(docs) -> str:
        if not docs:
            return "未检索到可靠资料，请明确说明信息不足，不要编造事实。"

        blocks: list[str] = []
        for index, doc in enumerate(docs, start=1):
            source = doc.metadata.get("source") or "unknown"
            timestamp = doc.metadata.get("timestamp") or "unknown"
            matched_chunks = doc.metadata.get("matched_chunks")
            retrieval_score = doc.metadata.get("retrieval_score")
            header = f"[资料{index}] source={source}; timestamp={timestamp}"
            if matched_chunks:
                header += f"; matched_chunks={matched_chunks}"
            if retrieval_score is not None:
                header += f"; score={retrieval_score}"
            cleaned_content = RAGGenerationService._normalize_document_text(doc.page_content)
            blocks.append(f"{header}\n{cleaned_content}")
        return "\n\n".join(blocks)

    @staticmethod
    def _build_citations(docs) -> list[dict]:
        grouped: dict[tuple[str, str, str], dict] = {}
        for doc in docs:
            source = str(doc.metadata.get("source") or "unknown")
            timestamp = str(doc.metadata.get("timestamp") or "unknown")
            excerpt = RAGGenerationService._build_excerpt(doc.page_content)
            key = (source, timestamp, excerpt)

            citation = grouped.get(
                key,
                {
                    "source": source,
                    "timestamp": timestamp,
                    "excerpt": excerpt,
                    "score": float(doc.metadata.get("retrieval_score") or 0.0),
                    "matched_chunks": int(doc.metadata.get("matched_chunks") or 0),
                },
            )
            citation["score"] = max(float(doc.metadata.get("retrieval_score") or 0.0), citation["score"])
            citation["matched_chunks"] = max(
                int(doc.metadata.get("matched_chunks") or 0),
                citation["matched_chunks"],
            )
            grouped[key] = citation

        ranked = sorted(
            grouped.values(),
            key=lambda item: (
                item.get("score", 0.0),
                item.get("matched_chunks", 0),
                item.get("source", ""),
            ),
            reverse=True,
        )

        citations: list[dict] = []
        for item in ranked:
            citation = {
                "source": item["source"],
                "timestamp": item["timestamp"],
                "excerpt": item["excerpt"],
            }
            if item.get("score") is not None:
                citation["score"] = round(float(item["score"]), 4)
            if item.get("matched_chunks") is not None:
                citation["matched_chunks"] = int(item["matched_chunks"])
            citations.append(citation)
        return citations

    @staticmethod
    def _normalize_document_text(value: str) -> str:
        text = html.unescape(str(value or ""))
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"</(?:p|div|tr|li|h[1-6]|table)>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = text.replace("\u3000", " ").replace("\xa0", " ")
        text = re.sub(r"(^|[\s:：])[\)）](?=[\u4e00-\u9fffA-Za-z0-9])", r"\1", text)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n[ \t]+", "\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        lines = [line.strip() for line in text.splitlines()]
        compact = "\n".join(line for line in lines if line)
        compact = re.sub(r"\s*([，。！？；：、])\s*", r"\1", compact)
        compact = re.sub(r"\s{2,}", " ", compact)
        return compact.strip()

    @staticmethod
    def _build_excerpt(value: str, *, max_chars: int = 120) -> str:
        text = RAGGenerationService._normalize_document_text(value).replace("\n", " ")
        text = re.sub(r"\s{2,}", " ", text).strip()
        if len(text) <= max_chars:
            return text
        clipped = text[:max_chars].rstrip("，。！？；：、,.;: ")
        return clipped + "..."
