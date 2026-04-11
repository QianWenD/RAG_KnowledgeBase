from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class RouteName(str, Enum):
    FAQ_MATCH = "faq_match"
    GENERAL_LLM = "general_llm"
    RAG = "rag"
    RAG_UNAVAILABLE = "rag_unavailable"


class IntentName(str, Enum):
    GENERAL = "general"
    PROFESSIONAL = "professional"


class RetrievalStrategy(str, Enum):
    DIRECT = "direct"
    REWRITE = "rewrite"
    DECOMPOSE = "decompose"
    HYDE = "hyde"


@dataclass(frozen=True)
class RouterDecision:
    route: RouteName
    intent: IntentName
    reason: str
    normalized_query: str


@dataclass(frozen=True)
class StrategyDecision:
    strategy: RetrievalStrategy
    reason: str
    retrieval_query: str
