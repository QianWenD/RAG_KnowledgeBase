"""Answer generation layer."""

from .llm import call_local_llm, stream_local_llm
from .prompts import build_rag_prompt

__all__ = [
    "GenerationPlan",
    "RAGGenerationService",
    "build_rag_prompt",
    "call_local_llm",
    "stream_local_llm",
]


def __getattr__(name: str):
    if name in {"GenerationPlan", "RAGGenerationService"}:
        from .service import GenerationPlan, RAGGenerationService

        exports = {
            "GenerationPlan": GenerationPlan,
            "RAGGenerationService": RAGGenerationService,
        }
        return exports[name]
    raise AttributeError(f"module 'ragpro.generation' has no attribute {name!r}")
