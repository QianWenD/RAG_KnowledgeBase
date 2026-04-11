from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.ingestion.upload_service import DocumentUploadError, DocumentUploadService, IncomingDocument


class FakeVectorStore:
    def __init__(self, backend: str = "local") -> None:
        self.backend = backend


class FakeRetrievalService:
    def __init__(self) -> None:
        self.vector_store = FakeVectorStore()
        self.deleted_sources: list[str] = []
        self.added_documents = []

    def delete_source(self, source: str) -> int:
        self.deleted_sources.append(source)
        return 3

    def add_documents(self, documents) -> None:
        self.added_documents.extend(documents)


class DocumentUploadServiceTests(unittest.TestCase):
    def test_upload_service_saves_and_indexes_text_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            retrieval = FakeRetrievalService()
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=lambda: retrieval,
                max_file_size_bytes=1024 * 1024,
            )

            result = service.upload_documents(
                source="ai",
                files=[
                    IncomingDocument(
                        filename="notes.txt",
                        content=b"RAG can ingest PDF and DOCX files.",
                        content_type="text/plain",
                    )
                ],
            )

        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["file_count"], 1)
        self.assertGreater(result["document_chunks"], 0)
        self.assertEqual(result["deleted_before_index"], 0)
        self.assertEqual(result["retrieval_backend"], "local")
        self.assertEqual(retrieval.deleted_sources, [])
        self.assertTrue(retrieval.added_documents)
        self.assertEqual(result["files"][0]["filename"], "notes.txt")

    def test_upload_service_replace_source_deletes_existing_vectors_first(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            retrieval = FakeRetrievalService()
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=lambda: retrieval,
                max_file_size_bytes=1024 * 1024,
            )

            result = service.upload_documents(
                source="ai",
                replace_source=True,
                files=[
                    IncomingDocument(
                        filename="course.md",
                        content=b"# Course\nMilvus and RAG.",
                        content_type="text/markdown",
                    )
                ],
            )

        self.assertEqual(result["deleted_before_index"], 3)
        self.assertEqual(retrieval.deleted_sources, ["ai"])

    def test_upload_service_rejects_unsupported_extension(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=FakeRetrievalService,
                max_file_size_bytes=1024 * 1024,
            )

            with self.assertRaises(DocumentUploadError):
                service.upload_documents(
                    source="ai",
                    files=[
                        IncomingDocument(
                            filename="script.exe",
                            content=b"binary",
                            content_type="application/octet-stream",
                        )
                    ],
                )

    def test_upload_service_sanitizes_filename(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=FakeRetrievalService,
                max_file_size_bytes=1024 * 1024,
            )

            result = service.upload_documents(
                source="ai",
                files=[
                    IncomingDocument(
                        filename="..\\unsafe:name?.txt",
                        content=b"safe content",
                        content_type="text/plain",
                    )
                ],
            )

        saved_name = result["files"][0]["stored_name"]
        self.assertNotIn("..", saved_name)
        self.assertNotIn(":", saved_name)
        self.assertNotIn("?", saved_name)
        self.assertTrue(saved_name.endswith(".txt"))

    def test_upload_service_rejects_oversized_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=FakeRetrievalService,
                max_file_size_bytes=8,
            )

            with self.assertRaises(DocumentUploadError):
                service.upload_documents(
                    source="ai",
                    files=[
                        IncomingDocument(
                            filename="large.txt",
                            content=b"123456789",
                            content_type="text/plain",
                        )
                    ],
                )


if __name__ == "__main__":
    unittest.main()
