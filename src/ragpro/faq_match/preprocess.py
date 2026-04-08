from __future__ import annotations

import jieba

from ragpro.config import get_logger

logger = get_logger("ragpro.faq.preprocess")


def preprocess_text(text: str) -> list[str]:
    if not isinstance(text, str) or not text.strip():
        logger.warning("Skip preprocessing for empty or invalid text input.")
        return []
    return jieba.lcut(text.lower().strip())
