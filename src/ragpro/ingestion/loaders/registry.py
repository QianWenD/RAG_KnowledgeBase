from __future__ import annotations

from datetime import datetime
import importlib
import logging
from pathlib import Path

from langchain_core.documents import Document

from ragpro.config import get_logger

logger = get_logger("ragpro.ingestion.loaders")


def _import_attr(module_name: str, attr_name: str):
    try:
        module = importlib.import_module(module_name)
        return getattr(module, attr_name)
    except Exception:
        return None


def _source_from_directory(directory_path: Path) -> str:
    return directory_path.name.replace("_data", "")


def _read_text_document(path: Path) -> list[Document]:
    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return []
    return [Document(page_content=text, metadata={"extraction_method": "plain_text"})]


def _load_pdf_with_langchain(path: Path) -> list[Document]:
    loader_cls = _import_attr("langchain_community.document_loaders", "PyPDFLoader")
    if loader_cls is None:
        return []
    return loader_cls(str(path)).load()


def _is_suspicious_pdf_char(char: str) -> bool:
    codepoint = ord(char)
    return (
        0x2E80 <= codepoint <= 0x2EFF
        or 0x2F00 <= codepoint <= 0x2FDF
        or char in {"�", "\ufffd"}
    )


def _should_prefer_ocr(documents: list[Document]) -> bool:
    sample_text = "".join(doc.page_content for doc in documents[:3])
    compact_text = "".join(char for char in sample_text if not char.isspace())
    if not compact_text:
        return True

    suspicious_count = sum(1 for char in compact_text if _is_suspicious_pdf_char(char))
    suspicious_ratio = suspicious_count / max(len(compact_text), 1)
    return suspicious_count >= 3 and suspicious_ratio >= 0.02


def _load_pdf_with_pypdf(path: Path) -> list[Document]:
    reader_cls = _import_attr("pypdf", "PdfReader")
    if reader_cls is None:
        return []

    logging.getLogger("pypdf").setLevel(logging.ERROR)
    try:
        reader = reader_cls(str(path))
    except Exception as exc:
        logger.warning("pypdf failed to open %s: %s", path, exc)
        return []

    documents: list[Document] = []
    for page_index, page in enumerate(reader.pages, start=1):
        try:
            text = (page.extract_text() or "").strip()
        except Exception as exc:
            logger.warning("pypdf failed to extract page %s from %s: %s", page_index, path, exc)
            continue
        if not text:
            continue
        documents.append(
            Document(
                page_content=text,
                metadata={
                    "page": page_index,
                    "extraction_method": "pypdf",
                },
            )
        )
    return documents


def _load_pdf_with_ocr(path: Path) -> list[Document]:
    fitz = importlib.import_module("fitz") if _import_attr("fitz", "open") else None
    rapid_ocr_cls = _import_attr("rapidocr_onnxruntime", "RapidOCR")
    if fitz is None or rapid_ocr_cls is None:
        return []

    numpy_module = importlib.import_module("numpy")
    pdf = fitz.open(str(path))
    ocr = rapid_ocr_cls()
    documents: list[Document] = []
    try:
        for page_index, page in enumerate(pdf, start=1):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            channels = getattr(pixmap, "n", 3)
            image = numpy_module.frombuffer(pixmap.samples, dtype=numpy_module.uint8)
            image = image.reshape(pixmap.height, pixmap.width, channels)
            result, _ = ocr(image)
            text = "\n".join(item[1] for item in (result or [])).strip()
            if not text:
                continue
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "page": page_index,
                        "extraction_method": "rapidocr",
                    },
                )
            )
    finally:
        pdf.close()
    return documents


def _load_pdf_documents(path: Path) -> list[Document]:
    documents = _load_pdf_with_langchain(path)
    if documents:
        for index, doc in enumerate(documents, start=1):
            doc.metadata.setdefault("page", index)
            doc.metadata.setdefault("extraction_method", "langchain_pypdf")
        return documents

    documents = _load_pdf_with_pypdf(path)
    if documents:
        if _should_prefer_ocr(documents):
            ocr_documents = _load_pdf_with_ocr(path)
            if ocr_documents:
                logger.info("Switched PDF extraction to OCR due to suspicious text quality: %s", path)
                return ocr_documents
        return documents

    documents = _load_pdf_with_ocr(path)
    if documents:
        return documents

    logger.warning(
        "PDF loader unavailable or no extractable text found for file: %s",
        path,
    )
    return []


def _load_docx_documents(path: Path) -> list[Document]:
    process_docx = _import_attr("docx2txt", "process")
    if process_docx is None:
        return []
    text = (process_docx(str(path)) or "").strip()
    if not text:
        return []
    return [
        Document(
            page_content=text,
            metadata={"extraction_method": "docx2txt"},
        )
    ]


def _load_powerpoint_documents(path: Path) -> list[Document]:
    loader_cls = _import_attr(
        "langchain_community.document_loaders",
        "UnstructuredPowerPointLoader",
    )
    if loader_cls is None:
        return []
    documents = loader_cls(str(path)).load()
    for doc in documents:
        doc.metadata.setdefault("extraction_method", "unstructured_powerpoint")
    return documents


def load_file(path: str | Path, source: str | None = None) -> list[Document]:
    file_path = Path(path)
    extension = file_path.suffix.lower()

    if extension in {".txt", ".md", ".markdown", ".html", ".htm"}:
        documents = _read_text_document(file_path)
    elif extension == ".pdf":
        documents = _load_pdf_documents(file_path)
    elif extension == ".docx":
        documents = _load_docx_documents(file_path)
    elif extension in {".ppt", ".pptx"}:
        documents = _load_powerpoint_documents(file_path)
    else:
        logger.warning("Unsupported or unavailable loader for file: %s", file_path)
        return []

    if not documents:
        logger.warning("No readable content extracted from file: %s", file_path)
        return []

    for doc in documents:
        doc.metadata["source"] = source or doc.metadata.get("source", "unknown")
        doc.metadata["file_path"] = str(file_path)
        doc.metadata["timestamp"] = datetime.now().isoformat()
    return documents


def load_directory(directory_path: str | Path) -> list[Document]:
    root = Path(directory_path)
    source = _source_from_directory(root)
    documents: list[Document] = []
    for file_path in root.rglob("*"):
        if not file_path.is_file():
            continue
        documents.extend(load_file(file_path, source=source))
    return documents
