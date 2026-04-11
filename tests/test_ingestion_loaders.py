from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.ingestion.loaders import registry


class FakePdfReader:
    def __init__(self, path: str, pages: list[SimpleNamespace]) -> None:
        self.path = path
        self.pages = pages


class LoaderRegistryTests(unittest.TestCase):
    def test_pdf_loader_falls_back_to_pypdf_when_langchain_loader_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "sample.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n")

            def fake_import(module_name: str, attr_name: str):
                if (module_name, attr_name) == ("pypdf", "PdfReader"):
                    return lambda path: FakePdfReader(
                        path,
                        [SimpleNamespace(extract_text=lambda: "第一页资料内容")],
                    )
                return None

            with patch.object(registry, "_import_attr", side_effect=fake_import):
                documents = registry.load_file(pdf_path, source="ai")

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].page_content, "第一页资料内容")
        self.assertEqual(documents[0].metadata["source"], "ai")
        self.assertEqual(documents[0].metadata["page"], 1)
        self.assertEqual(documents[0].metadata["extraction_method"], "pypdf")

    def test_pdf_loader_uses_ocr_fallback_when_text_extraction_is_empty(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "scan.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n")

            def fake_import(module_name: str, attr_name: str):
                if (module_name, attr_name) == ("pypdf", "PdfReader"):
                    return lambda path: FakePdfReader(
                        path,
                        [SimpleNamespace(extract_text=lambda: "  ")],
                    )
                return None

            with patch.object(registry, "_import_attr", side_effect=fake_import):
                with patch.object(
                    registry,
                    "_load_pdf_with_ocr",
                    return_value=[
                        registry.Document(
                            page_content="OCR 识别内容",
                            metadata={"page": 1, "extraction_method": "rapidocr"},
                        )
                    ],
                ) as ocr_loader:
                    documents = registry.load_file(pdf_path, source="ai")

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].page_content, "OCR 识别内容")
        self.assertEqual(documents[0].metadata["extraction_method"], "rapidocr")
        ocr_loader.assert_called_once()

    def test_pdf_loader_uses_ocr_fallback_when_pypdf_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "broken.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n")

            def fake_import(module_name: str, attr_name: str):
                if (module_name, attr_name) == ("pypdf", "PdfReader"):
                    def _broken_reader(_: str):
                        raise OSError("bad pdf")
                    return _broken_reader
                return None

            with patch.object(registry, "_import_attr", side_effect=fake_import):
                with patch.object(
                    registry,
                    "_load_pdf_with_ocr",
                    return_value=[
                        registry.Document(
                            page_content="OCR 修复内容",
                            metadata={"page": 1, "extraction_method": "rapidocr"},
                        )
                    ],
                ) as ocr_loader:
                    documents = registry.load_file(pdf_path, source="ai")

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].page_content, "OCR 修复内容")
        ocr_loader.assert_called_once()

    def test_pdf_loader_prefers_ocr_when_pypdf_text_quality_is_suspicious(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "noisy.pdf"
            pdf_path.write_bytes(b"%PDF-1.4\n")

            def fake_import(module_name: str, attr_name: str):
                if (module_name, attr_name) == ("pypdf", "PdfReader"):
                    return lambda path: FakePdfReader(
                        path,
                        [
                            SimpleNamespace(
                                extract_text=lambda: "LLM背景知识\n掌握什么是语⾔模型\n⼤语⾔模型是⼀种模型"
                            )
                        ],
                    )
                return None

            with patch.object(registry, "_import_attr", side_effect=fake_import):
                with patch.object(
                    registry,
                    "_load_pdf_with_ocr",
                    return_value=[
                        registry.Document(
                            page_content="大语言模型是一种人工智能模型",
                            metadata={"page": 1, "extraction_method": "rapidocr"},
                        )
                    ],
                ) as ocr_loader:
                    documents = registry.load_file(pdf_path, source="ai")

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].metadata["extraction_method"], "rapidocr")
        self.assertEqual(documents[0].page_content, "大语言模型是一种人工智能模型")
        ocr_loader.assert_called_once()

    def test_docx_loader_uses_docx2txt_when_available(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            docx_path = Path(tmpdir) / "sample.docx"
            docx_path.write_bytes(b"docx")

            def fake_import(module_name: str, attr_name: str):
                if (module_name, attr_name) == ("docx2txt", "process"):
                    return lambda path: "DOCX 文本内容"
                return None

            with patch.object(registry, "_import_attr", side_effect=fake_import):
                documents = registry.load_file(docx_path, source="ops")

        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0].page_content, "DOCX 文本内容")
        self.assertEqual(documents[0].metadata["source"], "ops")
        self.assertEqual(documents[0].metadata["extraction_method"], "docx2txt")


if __name__ == "__main__":
    unittest.main()
