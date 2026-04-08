from __future__ import annotations

from langchain_core.documents import Document

from .vector_store import VectorStore


class RetrievalService:
    def __init__(self, vector_store: VectorStore) -> None:
        self.vector_store = vector_store

    def add_documents(self, documents: list[Document]) -> None:
        self.vector_store.add_documents(documents)

    def retrieve(
        self,
        query: str,
        source_filter: str | None = None,
        k: int | None = None,
    ) -> list[Document]:
        return self.vector_store.hybrid_search_with_rerank(
            query=query,
            source_filter=source_filter,
            k=k,
        )
