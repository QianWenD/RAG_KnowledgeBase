from __future__ import annotations

import json

import redis

from ragpro.config import get_logger, get_settings

logger = get_logger("ragpro.faq.cache")


class FAQRedisCache:
    def __init__(self) -> None:
        settings = get_settings()
        connection_kwargs = dict(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True,
        )
        if settings.redis_password:
            connection_kwargs["password"] = settings.redis_password
        self.client = redis.StrictRedis(**connection_kwargs)
        logger.info("Redis connection established.")

    def set_json(self, key: str, value: object) -> None:
        self.client.set(key, json.dumps(value, ensure_ascii=False))

    def get_json(self, key: str) -> object | None:
        value = self.client.get(key)
        return json.loads(value) if value else None

    def get_answer(self, query: str) -> str | None:
        return self.client.get(f"answer:{query}")

    def set_answer(self, query: str, answer: str) -> None:
        self.client.set(f"answer:{query}", answer)
