from __future__ import annotations

import logging
import os
import warnings
from pathlib import Path

from .settings import get_settings


_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
_THIRD_PARTY_LOGGING_CONFIGURED = False


def configure_third_party_logging() -> None:
    """Keep noisy ML library advisory messages out of operator-facing logs."""

    global _THIRD_PARTY_LOGGING_CONFIGURED
    if _THIRD_PARTY_LOGGING_CONFIGURED:
        return

    os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")
    warnings.filterwarnings(
        "ignore",
        message=r"You're using a .*TokenizerFast tokenizer.*",
    )
    warnings.filterwarnings(
        "ignore",
        message=r"Be aware, overflowing tokens are not returned.*",
    )

    for logger_name in (
        "sentence_transformers",
        "tokenizers",
        "transformers",
        "transformers.tokenization_utils_base",
    ):
        logging.getLogger(logger_name).setLevel(logging.ERROR)

    try:
        from transformers.utils import logging as transformers_logging

        transformers_logging.set_verbosity_error()
    except Exception:  # pragma: no cover - optional dependency may be absent
        pass

    _THIRD_PARTY_LOGGING_CONFIGURED = True


def get_logger(name: str = "ragpro") -> logging.Logger:
    configure_third_party_logging()
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    settings = get_settings()
    log_path: Path = settings.log_path
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(_FORMAT)

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    return logger
