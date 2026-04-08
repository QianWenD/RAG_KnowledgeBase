from __future__ import annotations

import logging
from pathlib import Path

from .settings import get_settings


_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


def get_logger(name: str = "ragpro") -> logging.Logger:
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
