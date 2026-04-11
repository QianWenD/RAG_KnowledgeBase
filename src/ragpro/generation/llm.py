from __future__ import annotations

from collections.abc import Iterable

import ollama

from ragpro.config import get_settings


def _messages(prompt: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": "你是一个有帮助的中文问答助手。"},
        {"role": "user", "content": prompt},
    ]


def call_local_llm(prompt: str) -> str:
    settings = get_settings()
    response = ollama.chat(
        model=settings.llm_model,
        messages=_messages(prompt),
        options={"temperature": 0.5},
    )
    return response["message"]["content"]


def stream_local_llm(prompt: str) -> Iterable[str]:
    settings = get_settings()
    response = ollama.chat(
        model=settings.llm_model,
        messages=_messages(prompt),
        options={"temperature": 0.5},
        stream=True,
    )
    for chunk in response:
        content = chunk.get("message", {}).get("content", "")
        if content:
            yield content
