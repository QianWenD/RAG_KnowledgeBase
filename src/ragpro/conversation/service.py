from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .repository import ConversationMySQLRepository


AMBIGUOUS_QUERY_MARKERS = (
    "它",
    "这个",
    "这个课程",
    "这个系统",
    "这个方案",
    "那个",
    "上面",
    "刚才",
    "前面",
    "继续",
    "详细说说",
    "展开讲讲",
    "再说一下",
)


class ConversationService:
    def __init__(self, repository: ConversationMySQLRepository, max_turns: int = 5) -> None:
        self.repository = repository
        self.max_turns = max_turns

    @staticmethod
    def get_or_create_session_id(session_id: str | None = None) -> str:
        return session_id or str(uuid.uuid4())

    def get_history(self, session_id: str, *, user_id: int | None = None) -> list[dict]:
        try:
            return self.repository.fetch_recent_history(session_id, user_id=user_id, limit=self.max_turns)
        except TypeError:
            return self.repository.fetch_recent_history(session_id, limit=self.max_turns)

    def save_turn(
        self,
        session_id: str,
        question: str,
        answer: str,
        *,
        user_id: int | None = None,
    ) -> list[dict]:
        try:
            self.repository.append_turn(session_id, question, answer, user_id=user_id)
        except TypeError:
            self.repository.append_turn(session_id, question, answer)
        try:
            self.repository.trim_history(session_id, user_id=user_id, keep=self.max_turns)
        except TypeError:
            self.repository.trim_history(session_id, keep=self.max_turns)
        return self.get_history(session_id, user_id=user_id)

    def clear_history(self, session_id: str, *, user_id: int | None = None) -> None:
        try:
            self.repository.clear_history(session_id, user_id=user_id)
        except TypeError:
            self.repository.clear_history(session_id)

    @staticmethod
    def compress_history(
        history: list[dict] | None,
        *,
        max_turns: int = 5,
        max_chars: int = 900,
    ) -> str:
        if not history:
            return "无历史对话。"

        window = history[-max_turns:]
        if len(window) <= 3:
            return "最近对话：\n" + ConversationService._render_turns(window, max_chars=max_chars)

        earlier = window[:-3]
        recent = window[-3:]
        summary_lines = ["更早对话摘要："]
        for index, item in enumerate(earlier, start=1):
            question = ConversationService._clip_text(item.get("question", ""), 36)
            answer = ConversationService._clip_text(item.get("answer", ""), 60)
            summary_lines.append(f"{index}. 用户问：{question}；助手答：{answer}")

        recent_text = ConversationService._render_turns(recent, max_chars=max_chars)
        merged = "\n".join(summary_lines) + "\n\n最近对话：\n" + recent_text
        if len(merged) <= max_chars:
            return merged
        return ConversationService._clip_text(merged, max_chars)

    @staticmethod
    def build_retrieval_query(
        query: str,
        *,
        history: list[dict] | None = None,
        retrieval_query: str | None = None,
    ) -> str:
        base_query = (retrieval_query or query or "").strip()
        if not base_query:
            return ""
        if not history:
            return base_query
        if not ConversationService._is_context_dependent(base_query):
            return base_query

        recent_turns = history[-2:]
        context_parts: list[str] = []
        for item in recent_turns:
            question = str(item.get("question", "")).strip()
            if question:
                context_parts.append(question)

        if not context_parts:
            return base_query

        contextualized = " ".join(context_parts + [base_query])
        return ConversationService._clip_text(contextualized, 160)

    @staticmethod
    def _render_turns(history: list[dict], *, max_chars: int) -> str:
        turns: list[str] = []
        for index, item in enumerate(history, start=1):
            question = ConversationService._clip_text(item.get("question", ""), 120)
            answer = ConversationService._clip_text(item.get("answer", ""), 180)
            turns.append(f"第{index}轮\n用户：{question}\n助手：{answer}")
        return ConversationService._clip_text("\n\n".join(turns), max_chars)

    @staticmethod
    def _is_context_dependent(query: str) -> bool:
        normalized = query.strip()
        if len(normalized) <= 10:
            return True
        return any(marker in normalized for marker in AMBIGUOUS_QUERY_MARKERS)

    @staticmethod
    def _clip_text(value: str, max_chars: int) -> str:
        text = " ".join(str(value).split())
        if len(text) <= max_chars:
            return text
        return text[: max_chars - 1].rstrip() + "…"
