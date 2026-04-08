from __future__ import annotations

from datetime import datetime
from pathlib import Path

from langchain_core.documents import Document

from ragpro.config import get_logger

logger = get_logger("ragpro.ingestion.loaders")

try:
    from langchain_community.document_loaders import (
        Docx2txtLoader,
        PyPDFLoader,
        TextLoader,
        UnstructuredMarkdownLoader,
        UnstructuredPowerPointLoader,
    )
except Exception:  # pragma: no cover
    Docx2txtLoader = None
    PyPDFLoader = None
    TextLoader = None
    UnstructuredMarkdownLoader = None
    UnstructuredPowerPointLoader = None


def _source_from_directory(directory_path: Path) -> str:
    return directory_path.name.replace("_data", "")


def _fallback_text_document(path: Path) -> list[Document]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return [Document(page_content=text, metadata={"source": str(path)})]


def load_file(path: str | Path, source: str | None = None) -> list[Document]:
    file_path = Path(path)
    extension = file_path.suffix.lower()

    documents: list[Document]
    if extension == ".txt":
        if TextLoader:
            documents = TextLoader(str(file_path), encoding="utf-8").load()
        else:
            documents = _fallback_text_document(file_path)
    elif extension == ".md":
        if UnstructuredMarkdownLoader:
            documents = UnstructuredMarkdownLoader(str(file_path)).load()
        else:
            documents = _fallback_text_document(file_path)
    elif extension == ".pdf" and PyPDFLoader:
        documents = PyPDFLoader(str(file_path)).load()
    elif extension == ".docx" and Docx2txtLoader:
        documents = Docx2txtLoader(str(file_path)).load()
    elif extension in {".ppt", ".pptx"} and UnstructuredPowerPointLoader:
        documents = UnstructuredPowerPointLoader(str(file_path)).load()
    else:
        logger.warning("Unsupported or unavailable loader for file: %s", file_path)
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
