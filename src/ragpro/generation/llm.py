from __future__ import annotations

import ollama

from ragpro.config import get_settings


def call_local_llm(prompt: str) -> str:
    settings = get_settings()
    response = ollama.chat(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": "你是一个有帮助的问答助手。"},
            {"role": "user", "content": prompt},
        ],
        options={"temperature": 0.5},
    )
    return response["message"]["content"]
