from __future__ import annotations

from collections.abc import Callable

from ragpro.config import get_settings
from ragpro.retrieval import RetrievalService

from .prompts import build_rag_prompt


class RAGGenerationService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        llm: Callable[[str], str],
    ) -> None:
        self.retrieval_service = retrieval_service
        self.llm = llm
        self.settings = get_settings()

    def answer(
        self,
        query: str,
        *,
        source_filter: str | None = None,
        history: list[dict] | None = None,
    ) -> dict:
        docs = self.retrieval_service.retrieve(query=query, source_filter=source_filter)
        context = "\n\n".join(doc.page_content for doc in docs)
        history_text = ""
        if history:
            history_text = "\n".join(
                f"Q: {item.get('question', '')}\nA: {item.get('answer', '')}"
                for item in history[-5:]
            )

        prompt = build_rag_prompt(
            question=query,
            context=context,
            history=history_text,
            customer_service_phone=self.settings.customer_service_phone,
        )
        answer = self.llm(prompt)
        return {
            "answer": answer,
            "citations": [
                {
                    "source": doc.metadata.get("source"),
                    "timestamp": doc.metadata.get("timestamp"),
                }
                for doc in docs
            ],
            "context_count": len(docs),
        }
