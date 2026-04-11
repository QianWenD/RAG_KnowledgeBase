from __future__ import annotations

import re

from .schemas import IntentName, RetrievalStrategy, RouteName, RouterDecision, StrategyDecision

GREETING_PATTERNS = (
    "你好",
    "您好",
    "嗨",
    "hi",
    "hello",
    "在吗",
    "有人吗",
    "早上好",
    "中午好",
    "晚上好",
)

GENERAL_PATTERNS = (
    "你是谁",
    "你能做什么",
    "你会什么",
    "怎么用",
    "如何使用",
    "谢谢",
    "感谢",
    "再见",
    "拜拜",
)

COMPARISON_MARKERS = ("对比", "比较", "区别", "差异", "vs", "VS", "和", "与")
REWRITE_MARKERS = ("如果", "想要", "想把", "我想", "请帮我", "帮我", "怎么把", "怎么做", "如何把")
HYDE_MARKERS = ("介绍", "是什么", "什么是", "有哪些", "应用", "趋势", "优缺点", "原理", "适合")
FILLER_PREFIXES = (
    "请问",
    "我想咨询一个",
    "我想请教一个",
    "想咨询一个",
    "麻烦问一个",
    "麻烦问下",
    "帮我看一个",
    "我想知道",
)
CONCEPT_SUFFIX_HINTS = ("定义", "背景")
QUERY_EXPANSION_RULES = (
    (("大语言模型", "大模型", "llm"), ("大语言模型", "LLM", "大模型")),
    (("rag", "检索增强生成"), ("RAG", "检索增强生成", "知识库问答")),
    (("milvus", "向量数据库", "向量库"), ("Milvus", "向量数据库", "向量库")),
)


def normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", query or "").strip()


def rewrite_query_for_retrieval(query: str) -> str:
    rewritten = normalize_query(query)
    for prefix in FILLER_PREFIXES:
        if rewritten.startswith(prefix):
            rewritten = rewritten[len(prefix) :].strip()
    rewritten = rewritten.rstrip("，。！？；")
    return expand_query_for_retrieval(rewritten)


def expand_query_for_retrieval(query: str) -> str:
    normalized = normalize_query(query)
    if not normalized:
        return normalized
    if not any(marker in normalized for marker in HYDE_MARKERS):
        return normalized

    lowered = normalized.lower()
    expanded_terms = [normalized]
    seen_terms = {normalized.casefold()}

    for triggers, aliases in QUERY_EXPANSION_RULES:
        if not any(trigger.lower() in lowered for trigger in triggers):
            continue
        for alias in aliases:
            key = alias.casefold()
            if key in seen_terms:
                continue
            expanded_terms.append(alias)
            seen_terms.add(key)

    for suffix in CONCEPT_SUFFIX_HINTS:
        key = suffix.casefold()
        if key not in seen_terms:
            expanded_terms.append(suffix)
            seen_terms.add(key)

    return normalize_query(" ".join(expanded_terms))


class LightweightIntentClassifier:
    def classify(self, query: str, source_filter: str | None = None) -> RouterDecision:
        normalized_query = normalize_query(query)
        if source_filter:
            return RouterDecision(
                route=RouteName.RAG,
                intent=IntentName.PROFESSIONAL,
                reason="已指定 source_filter，优先进入专业知识库检索链路。",
                normalized_query=normalized_query,
            )

        lowered = normalized_query.lower()
        if any(pattern in lowered for pattern in GREETING_PATTERNS):
            return RouterDecision(
                route=RouteName.GENERAL_LLM,
                intent=IntentName.GENERAL,
                reason="识别为寒暄或简单交流，直接走通用对话分支。",
                normalized_query=normalized_query,
            )

        if any(pattern in normalized_query for pattern in GENERAL_PATTERNS):
            return RouterDecision(
                route=RouteName.GENERAL_LLM,
                intent=IntentName.GENERAL,
                reason="识别为能力说明或礼貌型问题，直接走通用对话分支。",
                normalized_query=normalized_query,
            )

        return RouterDecision(
            route=RouteName.RAG,
            intent=IntentName.PROFESSIONAL,
            reason="默认按专业查询处理，进入知识库检索分支。",
            normalized_query=normalized_query,
        )


class RetrievalStrategySelector:
    def select(self, query: str) -> StrategyDecision:
        normalized_query = normalize_query(query)
        rewritten_query = rewrite_query_for_retrieval(normalized_query)

        if any(marker in normalized_query for marker in COMPARISON_MARKERS):
            return StrategyDecision(
                strategy=RetrievalStrategy.DECOMPOSE,
                reason="检测到比较或多实体表达，标记为子查询型问题。",
                retrieval_query=rewritten_query,
            )

        if len(normalized_query) >= 32 or any(marker in normalized_query for marker in REWRITE_MARKERS):
            return StrategyDecision(
                strategy=RetrievalStrategy.REWRITE,
                reason="检测到长句或叙述型表达，先做轻量改写再检索。",
                retrieval_query=rewritten_query,
            )

        if any(marker in normalized_query for marker in HYDE_MARKERS):
            return StrategyDecision(
                strategy=RetrievalStrategy.HYDE,
                reason="检测到概念型或开放式问题，标记为 HyDE 倾向查询。",
                retrieval_query=rewritten_query,
            )

        return StrategyDecision(
            strategy=RetrievalStrategy.DIRECT,
            reason="问题较明确，直接检索。",
            retrieval_query=rewritten_query,
        )
