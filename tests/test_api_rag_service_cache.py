from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from apps.api import main as api_main


class _FakeMilvusVectorStore:
    created = 0

    def __init__(self) -> None:
        type(self).created += 1
        self.backend = "milvus"


class _FakeLocalVectorStore:
    created = 0

    def __init__(self) -> None:
        type(self).created += 1
        self.backend = "local"


class APIRAGServiceCacheTests(unittest.TestCase):
    def tearDown(self) -> None:
        api_main._rag_service = None
        _FakeMilvusVectorStore.created = 0
        _FakeLocalVectorStore.created = 0

    def test_milvus_rag_service_is_reused_between_queries(self) -> None:
        api_main._rag_service = None

        with patch("ragpro.retrieval.VectorStore", _FakeMilvusVectorStore):
            first = api_main._build_rag_service()
            second = api_main._build_rag_service()

        self.assertIs(first, second)
        self.assertEqual(_FakeMilvusVectorStore.created, 1)

    def test_local_rag_service_is_not_cached_to_avoid_stale_uploads(self) -> None:
        api_main._rag_service = None

        with patch("ragpro.retrieval.VectorStore", _FakeLocalVectorStore):
            first = api_main._build_rag_service()
            second = api_main._build_rag_service()

        self.assertIsNot(first, second)
        self.assertEqual(_FakeLocalVectorStore.created, 2)


if __name__ == "__main__":
    unittest.main()
