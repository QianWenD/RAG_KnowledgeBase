from __future__ import annotations

import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.ingestion.file_registry import DocumentFileRegistry, DocumentFileService
from ragpro.ingestion.upload_service import DocumentUploadError, DocumentUploadService, IncomingDocument


class FakeVectorStore:
    def __init__(self, backend: str = "local") -> None:
        self.backend = backend


class FakeRetrievalService:
    def __init__(self) -> None:
        self.vector_store = FakeVectorStore()
        self.deleted_sources: list[str] = []
        self.deleted_files: list[str] = []
        self.added_documents = []

    def delete_source(self, source: str) -> int:
        self.deleted_sources.append(source)
        return 3

    def delete_file(self, file_id: str) -> int:
        self.deleted_files.append(file_id)
        return 2

    def add_documents(self, documents) -> None:
        self.added_documents.extend(documents)


class DocumentUploadServiceTests(unittest.TestCase):
    def test_upload_service_saves_and_indexes_text_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            retrieval = FakeRetrievalService()
            registry = DocumentFileRegistry(Path(tmpdir) / "_files.json", upload_root=Path(tmpdir))
            service = DocumentUploadService(
                upload_root=Path(tmpdir),
                retrieval_service_factory=lambda: retrieval,
                file_registry=registry,
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
            records = registry.list_files()
            stored_path_exists = Path(records[0]["stored_path"]).exists()

        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["file_count"], 1)
        self.assertGreater(result["document_chunks"], 0)
        self.assertEqual(result["deleted_before_index"], 0)
        self.assertEqual(result["retrieval_backend"], "local")
        self.assertEqual(retrieval.deleted_sources, [])
        self.assertTrue(retrieval.added_documents)
        self.assertEqual(result["files"][0]["filename"], "notes.txt")
        self.assertTrue(result["files"][0]["file_id"])
        self.assertTrue(all(doc.metadata.get("file_id") == result["files"][0]["file_id"] for doc in retrieval.added_documents))

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["file_id"], result["files"][0]["file_id"])
        self.assertEqual(records[0]["source"], "ai")
        self.assertEqual(records[0]["filename"], "notes.txt")
        self.assertEqual(records[0]["document_chunks"], result["document_chunks"])
        self.assertTrue(stored_path_exists)

    def test_document_file_service_deletes_vectors_file_and_registry_record(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            upload_root = Path(tmpdir)
            retrieval = FakeRetrievalService()
            registry = DocumentFileRegistry(upload_root / "_files.json", upload_root=upload_root)
            service = DocumentUploadService(
                upload_root=upload_root,
                retrieval_service_factory=lambda: retrieval,
                file_registry=registry,
                max_file_size_bytes=1024 * 1024,
            )
            result = service.upload_documents(
                source="ai",
                files=[
                    IncomingDocument(
                        filename="retire-me.txt",
                        content=b"This file should be removable.",
                        content_type="text/plain",
                    )
                ],
            )
            file_id = result["files"][0]["file_id"]
            stored_path = Path(result["files"][0]["stored_path"])

            delete_service = DocumentFileService(
                upload_root=upload_root,
                file_registry=registry,
                retrieval_service_factory=lambda: retrieval,
            )
            deleted = delete_service.delete_file(file_id)

        self.assertEqual(deleted["file_id"], file_id)
        self.assertEqual(deleted["deleted_vectors"], 2)
        self.assertTrue(deleted["deleted_file"])
        self.assertEqual(retrieval.deleted_files, [file_id])
        self.assertFalse(stored_path.exists())
        self.assertEqual(registry.list_files(), [])

    def test_replace_source_removes_previous_file_records_and_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            upload_root = Path(tmpdir)
            retrieval = FakeRetrievalService()
            registry = DocumentFileRegistry(upload_root / "_files.json", upload_root=upload_root)
            service = DocumentUploadService(
                upload_root=upload_root,
                retrieval_service_factory=lambda: retrieval,
                file_registry=registry,
                max_file_size_bytes=1024 * 1024,
            )
            old_result = service.upload_documents(
                source="ai",
                files=[
                    IncomingDocument(
                        filename="old.txt",
                        content=b"Old source content.",
                        content_type="text/plain",
                    )
                ],
            )
            old_path = Path(old_result["files"][0]["stored_path"])

            new_result = service.upload_documents(
                source="ai",
                replace_source=True,
                files=[
                    IncomingDocument(
                        filename="new.txt",
                        content=b"New source content.",
                        content_type="text/plain",
                    )
                ],
            )
            records = registry.list_files()
            old_path_exists = old_path.exists()

        self.assertEqual(retrieval.deleted_sources, ["ai"])
        self.assertFalse(old_path_exists)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["file_id"], new_result["files"][0]["file_id"])
        self.assertEqual(records[0]["filename"], "new.txt")

    def test_upload_service_extracts_text_from_pptx_without_optional_loader(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_root = Path(tmpdir)
            pptx_path = temp_root / "policy.pptx"
            self._write_minimal_pptx(
                pptx_path,
                "医保限制用药录入",
                "在医保目录维护中选择限制用药规则并保存。",
            )
            retrieval = FakeRetrievalService()
            service = DocumentUploadService(
                upload_root=temp_root / "uploads",
                retrieval_service_factory=lambda: retrieval,
                max_file_size_bytes=1024 * 1024,
            )

            result = service.upload_documents(
                source="med",
                files=[
                    IncomingDocument(
                        filename="policy.pptx",
                        path=pptx_path,
                        content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    )
                ],
            )

        self.assertEqual(result["source"], "med")
        self.assertGreater(result["document_chunks"], 0)
        indexed_text = "\n".join(doc.page_content for doc in retrieval.added_documents)
        self.assertIn("医保限制用药录入", indexed_text)

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

    @staticmethod
    def _write_minimal_pptx(path: Path, *texts: str) -> None:
        slide_text = "".join(f"<a:p><a:r><a:t>{text}</a:t></a:r></a:p>" for text in texts)
        slide_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>{slide_text}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
"""
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types></Types>")
            archive.writestr("ppt/slides/slide1.xml", slide_xml)


if __name__ == "__main__":
    unittest.main()
