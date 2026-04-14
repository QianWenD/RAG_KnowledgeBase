from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable

from ragpro.config import get_logger, get_settings
from ragpro.retrieval import RetrievalService, VectorStore

from .document_processor import process_loaded_documents
from .loaders import load_file

logger = get_logger("ragpro.ingestion.upload")

ALLOWED_UPLOAD_EXTENSIONS = frozenset(
    {".txt", ".md", ".markdown", ".html", ".htm", ".pdf", ".docx", ".ppt", ".pptx"}
)
_INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_SOURCE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$")


class DocumentUploadError(ValueError):
    pass


@dataclass(frozen=True)
class IncomingDocument:
    filename: str
    content: bytes
    content_type: str | None = None


class DocumentUploadService:
    def __init__(
        self,
        *,
        upload_root: Path | None = None,
        retrieval_service_factory: Callable[[], RetrievalService] | None = None,
        max_file_size_bytes: int | None = None,
    ) -> None:
        settings = get_settings()
        self.upload_root = Path(upload_root or settings.upload_dir)
        self.max_file_size_bytes = max_file_size_bytes or settings.max_upload_file_size_bytes
        self.retrieval_service_factory = retrieval_service_factory or self._default_retrieval_service_factory

    def upload_documents(
        self,
        *,
        source: str,
        files: list[IncomingDocument],
        replace_source: bool = False,
    ) -> dict:
        normalized_source = self._sanitize_source(source)
        if not files:
            raise DocumentUploadError("No files were uploaded.")

        request_dir = self._build_request_dir(normalized_source)
        request_dir.mkdir(parents=True, exist_ok=True)

        saved_files = []
        try:
            for item in files:
                saved_files.append(self._save_file(request_dir, item))

            raw_documents = []
            unreadable_files: list[str] = []
            for item in saved_files:
                loaded_documents = load_file(item["path"], source=normalized_source)
                if not loaded_documents:
                    unreadable_files.append(item["filename"])
                    continue
                raw_documents.extend(loaded_documents)

            if unreadable_files:
                joined = ", ".join(unreadable_files)
                raise DocumentUploadError(f"No readable content extracted from: {joined}")

            child_chunks = process_loaded_documents(raw_documents)
            if not child_chunks:
                raise DocumentUploadError("No chunkable content was produced from the uploaded files.")
        except DocumentUploadError:
            self._cleanup_request_dir(request_dir)
            raise

        retrieval_service = self.retrieval_service_factory()
        deleted = 0
        if replace_source:
            deleted = retrieval_service.delete_source(normalized_source)
        retrieval_service.add_documents(child_chunks)

        logger.info(
            "Uploaded and indexed %s files for source=%s into backend=%s.",
            len(saved_files),
            normalized_source,
            getattr(retrieval_service.vector_store, "backend", "unknown"),
        )
        return {
            "source": normalized_source,
            "replace_source": replace_source,
            "file_count": len(saved_files),
            "raw_document_count": len(raw_documents),
            "document_chunks": len(child_chunks),
            "deleted_before_index": deleted,
            "retrieval_backend": getattr(retrieval_service.vector_store, "backend", "unknown"),
            "upload_directory": str(request_dir),
            "files": [
                {
                    "filename": item["filename"],
                    "stored_name": item["stored_name"],
                    "size_bytes": item["size_bytes"],
                    "content_type": item["content_type"],
                }
                for item in saved_files
            ],
        }

    @staticmethod
    def _default_retrieval_service_factory() -> RetrievalService:
        return RetrievalService(vector_store=VectorStore())

    def _build_request_dir(self, source: str) -> Path:
        request_id = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        return self.upload_root / source / request_id

    def _save_file(self, request_dir: Path, item: IncomingDocument) -> dict:
        original_name = self._sanitize_filename(item.filename)
        suffix = Path(original_name).suffix.lower()
        if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
            raise DocumentUploadError(f"Unsupported file type: {suffix or '[no extension]'}")

        size_bytes = len(item.content)
        if size_bytes <= 0:
            raise DocumentUploadError(f"Uploaded file is empty: {original_name}")
        if size_bytes > self.max_file_size_bytes:
            raise DocumentUploadError(
                f"File too large: {original_name} exceeds {self.max_file_size_bytes} bytes"
            )

        target_path = self._resolve_target_path(request_dir, original_name)
        target_path.write_bytes(item.content)
        return {
            "filename": original_name,
            "stored_name": target_path.name,
            "path": target_path,
            "size_bytes": size_bytes,
            "content_type": item.content_type or "application/octet-stream",
        }

    @staticmethod
    def _sanitize_source(source: str) -> str:
        normalized = str(source or "").strip()
        if not normalized:
            raise DocumentUploadError("source is required.")
        if not _SOURCE_NAME_PATTERN.fullmatch(normalized):
            raise DocumentUploadError(
                "source must use 1-50 letters, numbers, underscores, or hyphens."
            )
        return normalized

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        raw_name = Path(filename or "").name.strip()
        if not raw_name:
            raise DocumentUploadError("Uploaded file is missing a filename.")

        sanitized = _INVALID_FILENAME_CHARS.sub("_", raw_name).lstrip(".")
        sanitized = re.sub(r"\s+", " ", sanitized).strip()
        if not sanitized:
            raise DocumentUploadError("Uploaded file name is invalid.")
        if "." not in sanitized:
            raise DocumentUploadError("Uploaded file must include a supported extension.")
        return sanitized[:180]

    @staticmethod
    def _resolve_target_path(request_dir: Path, filename: str) -> Path:
        base = Path(filename)
        stem = base.stem[:120] or "upload"
        suffix = base.suffix
        candidate = request_dir / f"{stem}{suffix}"
        index = 1
        while candidate.exists():
            candidate = request_dir / f"{stem}_{index}{suffix}"
            index += 1
        return candidate

    @staticmethod
    def _cleanup_request_dir(request_dir: Path) -> None:
        if not request_dir.exists():
            return
        for path in sorted(request_dir.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink(missing_ok=True)
            elif path.is_dir():
                path.rmdir()
        request_dir.rmdir()
