from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

from scipy.sparse import csr_array, csr_matrix
from langchain_core.documents import Document

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.config.settings import get_settings
from ragpro.retrieval.vector_store import VectorStore


class VectorStoreSparseCompatibilityTests(unittest.TestCase):
    def test_sparse_row_to_dict_supports_csr_matrix(self) -> None:
        sparse = csr_matrix([[0.0, 0.2, 0.0, 0.4]])

        row = VectorStore._sparse_row_to_dict(sparse, 0)

        self.assertEqual(row, {1: 0.2, 3: 0.4})

    def test_sparse_row_to_dict_supports_csr_array(self) -> None:
        sparse = csr_array([[0.0, 0.5, 0.0, 0.7]])

        row = VectorStore._sparse_row_to_dict(sparse, 0)

        self.assertEqual(row, {1: 0.5, 3: 0.7})


class LocalVectorStoreSourceReplacementTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_runtime_dir = os.environ.get("RAGPRO_RUNTIME_DIR")
        self._old_backend = os.environ.get("RAGPRO_VECTOR_BACKEND")
        self._tempdir = tempfile.TemporaryDirectory()
        os.environ["RAGPRO_RUNTIME_DIR"] = self._tempdir.name
        os.environ["RAGPRO_VECTOR_BACKEND"] = "local"
        get_settings.cache_clear()

    def tearDown(self) -> None:
        if self._old_runtime_dir is None:
            os.environ.pop("RAGPRO_RUNTIME_DIR", None)
        else:
            os.environ["RAGPRO_RUNTIME_DIR"] = self._old_runtime_dir

        if self._old_backend is None:
            os.environ.pop("RAGPRO_VECTOR_BACKEND", None)
        else:
            os.environ["RAGPRO_VECTOR_BACKEND"] = self._old_backend

        get_settings.cache_clear()
        self._tempdir.cleanup()

    def test_delete_source_removes_only_matching_local_records(self) -> None:
        store = VectorStore()
        store.add_documents(
            [
                Document(
                    page_content="AI 文档版本一",
                    metadata={
                        "parent_id": "ai-1",
                        "parent_content": "AI 文档版本一",
                        "source": "ai",
                        "timestamp": "2026-04-09",
                    },
                ),
                Document(
                    page_content="OPS 文档版本一",
                    metadata={
                        "parent_id": "ops-1",
                        "parent_content": "OPS 文档版本一",
                        "source": "ops",
                        "timestamp": "2026-04-09",
                    },
                ),
            ]
        )

        deleted = store.delete_source("ai")

        self.assertEqual(deleted, 1)
        self.assertEqual(len(store.local_records), 1)
        self.assertEqual(store.local_records[0]["source"], "ops")

    def test_delete_source_allows_clean_reindex_for_same_source(self) -> None:
        store = VectorStore()
        store.add_documents(
            [
                Document(
                    page_content="旧版 AI 文档",
                    metadata={
                        "parent_id": "ai-old",
                        "parent_content": "旧版 AI 文档",
                        "source": "ai",
                        "timestamp": "2026-04-09",
                    },
                )
            ]
        )

        store.delete_source("ai")
        store.add_documents(
            [
                Document(
                    page_content="新版 AI 文档",
                    metadata={
                        "parent_id": "ai-new",
                        "parent_content": "新版 AI 文档",
                        "source": "ai",
                        "timestamp": "2026-04-10",
                    },
                )
            ]
        )

        self.assertEqual(len(store.local_records), 1)
        self.assertEqual(store.local_records[0]["text"], "新版 AI 文档")


class MilvusVectorStoreSourceReplacementTests(unittest.TestCase):
    def test_delete_source_queries_ids_then_flushes_collection(self) -> None:
        class FakeMilvusClient:
            def __init__(self) -> None:
                self.query_calls = []
                self.delete_calls = []
                self.flushed = False
                self.loaded = False

            def query(self, *, collection_name, filter, output_fields, limit):
                self.query_calls.append(
                    {
                        "collection_name": collection_name,
                        "filter": filter,
                        "output_fields": output_fields,
                        "limit": limit,
                    }
                )
                return [
                    {"id": "doc-1"},
                    {"id": "doc-2"},
                    {"id": "doc-3"},
                ]

            def delete(self, *, collection_name, ids=None, filter=None, **kwargs):
                self.delete_calls.append(
                    {
                        "collection_name": collection_name,
                        "ids": ids,
                        "filter": filter,
                    }
                )
                return {"delete_count": len(ids or [])}

            def flush(self, *, collection_name, **kwargs):
                self.flushed = collection_name == "test_collection"

            def load_collection(self, collection_name, **kwargs):
                self.loaded = collection_name == "test_collection"

        store = VectorStore.__new__(VectorStore)
        store.backend = "milvus"
        store.client = FakeMilvusClient()
        store.collection_name = "test_collection"

        deleted = store.delete_source("ai")

        self.assertEqual(deleted, 3)
        self.assertEqual(store.client.query_calls[0]["filter"], "source == 'ai'")
        self.assertEqual(store.client.delete_calls[0]["ids"], ["doc-1", "doc-2", "doc-3"])
        self.assertTrue(store.client.flushed)
        self.assertTrue(store.client.loaded)


if __name__ == "__main__":
    unittest.main()
