from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.config import get_logger, get_settings
from ragpro.faq_match import FAQMatchService, FAQMySQLRepository, FAQRedisCache
from ragpro.generation import RAGGenerationService, call_local_llm
from ragpro.retrieval import RetrievalService, VectorStore

logger = get_logger("ragpro.api")
settings = get_settings()
app = FastAPI(title="RAGPro API", description="Formalized API entrypoint for the RAGPro project")


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User query text")
    threshold: float = Field(0.85, ge=0.0, le=1.0)
    source_filter: str | None = Field(default=None, description="Optional domain/source filter")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "project_root": str(settings.project_root),
        "log_path": str(settings.log_path),
        "phase": "formalization-faq",
    }


@app.post("/faq/query")
def faq_query(payload: QueryRequest) -> dict:
    repository = None
    try:
        repository = FAQMySQLRepository()
        cache = FAQRedisCache()
        service = FAQMatchService(cache=cache, repository=repository)
        result = service.search(payload.query, threshold=payload.threshold)
        return {
            "matched": result.matched,
            "answer": result.answer,
            "score": result.score,
            "matched_question": result.matched_question,
            "route": "faq_match",
        }
    except Exception as exc:
        logger.exception("FAQ query endpoint failed.")
        raise HTTPException(status_code=503, detail=f"FAQ service unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()


@app.post("/query")
def unified_query(payload: QueryRequest) -> dict:
    repository = None
    try:
        repository = FAQMySQLRepository()
        cache = FAQRedisCache()
        faq_service = FAQMatchService(cache=cache, repository=repository)
        faq_result = faq_service.search(payload.query, threshold=payload.threshold)
        if faq_result.matched:
            return {
                "route": "faq_match",
                "matched": True,
                "answer": faq_result.answer,
                "score": faq_result.score,
                "matched_question": faq_result.matched_question,
            }
        if repository is not None:
            repository.close()
            repository = None

        try:
            retrieval_service = RetrievalService(vector_store=VectorStore())
            rag_service = RAGGenerationService(
                retrieval_service=retrieval_service,
                llm=call_local_llm,
            )
            rag_result = rag_service.answer(
                payload.query,
                source_filter=payload.source_filter,
            )
            return {
                "route": "rag",
                "matched": False,
                **rag_result,
            }
        except Exception as rag_exc:
            logger.exception("RAG branch failed after FAQ miss.")
            return {
                "route": "rag_unavailable",
                "matched": False,
                "answer": None,
                "error": str(rag_exc),
                "fallback_reason": "FAQ miss and RAG pipeline unavailable.",
            }
    except Exception as exc:
        logger.exception("Unified query endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Unified query unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()
