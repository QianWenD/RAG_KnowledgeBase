from __future__ import annotations

import re
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable
from uuid import uuid4

from ragpro.config import get_logger, get_settings
from ragpro.retrieval import RetrievalService, VectorStore

from .document_processor import process_loaded_documents
from .file_registry import DocumentFileRegistry, DocumentFileService
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
    content: bytes | None = None
    content_type: str | None = None
    path: Path | None = None


ProgressCallback = Callable[[dict], None]


class DocumentUploadService:
    def __init__(
        self,
        *,
        upload_root: Path | None = None,
        retrieval_service_factory: Callable[[], RetrievalService] | None = None,
        file_registry: DocumentFileRegistry | None = None,
        max_file_size_bytes: int | None = None,
    ) -> None:
        settings = get_settings()
        self.upload_root = Path(upload_root or settings.upload_dir)
        self.max_file_size_bytes = max_file_size_bytes or settings.max_upload_file_size_bytes
        self.retrieval_service_factory = retrieval_service_factory or self._default_retrieval_service_factory
        self.file_registry = file_registry or DocumentFileRegistry(upload_root=self.upload_root)

    def upload_documents(
        self,
        *,
        source: str,
        files: list[IncomingDocument],
        replace_source: bool = False,
        uploaded_by: dict | None = None,
        progress_callback: ProgressCallback | None = None,
    ) -> dict:
        normalized_source = self._sanitize_source(source)
        if not files:
            raise DocumentUploadError("No files were uploaded.")
        uploader = self._normalize_uploaded_by(uploaded_by)
        total_files = len(files)
        self._report_progress(
            progress_callback,
            stage="prepare",
            progress=10,
            message="正在校验入库参数...",
        )

        request_dir = self._build_request_dir(normalized_source)
        request_dir.mkdir(parents=True, exist_ok=True)

        saved_files = []
        try:
            for index, item in enumerate(files, start=1):
                saved_files.append(self._save_file(request_dir, item))
                self._report_progress(
                    progress_callback,
                    stage="save",
                    progress=self._progress_for_items(15, 25, index, total_files),
                    message=f"正在保存第 {index}/{total_files} 个文件...",
                )

            raw_documents = []
            unreadable_files: list[str] = []
            for index, item in enumerate(saved_files, start=1):
                self._report_progress(
                    progress_callback,
                    stage="parse",
                    progress=self._progress_for_items(30, 55, index, total_files),
                    message=f"正在解析第 {index}/{total_files} 个文件：{item['filename']}",
                )
                loaded_documents = load_file(item["path"], source=normalized_source)
                if not loaded_documents:
                    unreadable_files.append(item["filename"])
                    continue
                for document in loaded_documents:
                    document.metadata["file_id"] = item["file_id"]
                    document.metadata["filename"] = item["filename"]
                    document.metadata["stored_name"] = item["stored_name"]
                raw_documents.extend(loaded_documents)

            if unreadable_files:
                joined = ", ".join(unreadable_files)
                raise DocumentUploadError(f"No readable content extracted from: {joined}")

            self._report_progress(
                progress_callback,
                stage="chunk",
                progress=65,
                message="正在切分文档内容...",
            )
            child_chunks = process_loaded_documents(raw_documents)
            if not child_chunks:
                raise DocumentUploadError("No chunkable content was produced from the uploaded files.")
        except DocumentUploadError:
            self._cleanup_request_dir(request_dir)
            raise

        retrieval_service = self.retrieval_service_factory()
        deleted = 0
        deleted_file_records = 0
        if replace_source:
            self._report_progress(
                progress_callback,
                stage="cleanup",
                progress=72,
                message="正在清理该来源的旧索引...",
            )
            deleted = retrieval_service.delete_source(normalized_source)
            deleted_file_records = self._delete_registered_source_files(normalized_source)
        self._report_progress(
            progress_callback,
            stage="index",
            progress=85,
            message=f"正在写入向量库（{len(child_chunks)} 个切块）...",
        )
        retrieval_service.add_documents(child_chunks)
        self._report_progress(
            progress_callback,
            stage="registry",
            progress=95,
            message="正在登记入库文件...",
        )
        self.file_registry.add_files(
            self._build_file_records(
                source=normalized_source,
                request_dir=request_dir,
                saved_files=saved_files,
                child_chunks=child_chunks,
                uploaded_by=uploader,
            )
        )

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
            "deleted_file_records_before_index": deleted_file_records,
            "retrieval_backend": getattr(retrieval_service.vector_store, "backend", "unknown"),
            "upload_directory": str(request_dir),
            "files": [
                {
                    "file_id": item["file_id"],
                    "filename": item["filename"],
                    "stored_name": item["stored_name"],
                    "stored_path": str(item["path"]),
                    "size_bytes": item["size_bytes"],
                    "content_type": item["content_type"],
                }
                for item in saved_files
            ],
        }

    @staticmethod
    def _report_progress(
        progress_callback: ProgressCallback | None,
        *,
        stage: str,
        progress: int,
        message: str,
    ) -> None:
        if progress_callback is None:
            return
        try:
            progress_callback(
                {
                    "stage": stage,
                    "progress": max(1, min(int(progress), 99)),
                    "message": message,
                }
            )
        except Exception:
            logger.warning("Document upload progress callback failed.", exc_info=True)

    @staticmethod
    def _progress_for_items(start: int, end: int, index: int, total: int) -> int:
        if total <= 0:
            return end
        bounded_index = max(1, min(index, total))
        return round(start + ((end - start) * bounded_index / total))

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

        size_bytes = item.path.stat().st_size if item.path else len(item.content or b"")
        if size_bytes <= 0:
            raise DocumentUploadError(f"Uploaded file is empty: {original_name}")
        if size_bytes > self.max_file_size_bytes:
            raise DocumentUploadError(
                f"File too large: {original_name} exceeds {self.max_file_size_bytes} bytes"
            )

        target_path = self._resolve_target_path(request_dir, original_name)
        if item.path:
            shutil.copyfile(item.path, target_path)
        else:
            target_path.write_bytes(item.content or b"")
        return {
            "file_id": uuid4().hex,
            "filename": original_name,
            "stored_name": target_path.name,
            "path": target_path,
            "size_bytes": size_bytes,
            "content_type": item.content_type or "application/octet-stream",
        }

    def _build_file_records(
        self,
        *,
        source: str,
        request_dir: Path,
        saved_files: list[dict],
        child_chunks: list,
        uploaded_by: dict,
    ) -> list[dict]:
        chunk_counts: dict[str, int] = {}
        for chunk in child_chunks:
            file_id = str(chunk.metadata.get("file_id") or "")
            if file_id:
                chunk_counts[file_id] = chunk_counts.get(file_id, 0) + 1

        created_at = datetime.now().isoformat()
        return [
            {
                "file_id": item["file_id"],
                "source": source,
                "filename": item["filename"],
                "stored_name": item["stored_name"],
                "stored_path": str(item["path"]),
                "upload_directory": str(request_dir),
                "size_bytes": item["size_bytes"],
                "content_type": item["content_type"],
                "document_chunks": chunk_counts.get(item["file_id"], 0),
                "uploader_user_id": uploaded_by.get("id"),
                "uploader_username": uploaded_by.get("username"),
                "uploader_display_name": uploaded_by.get("display_name"),
                "created_at": created_at,
            }
            for item in saved_files
        ]

    @staticmethod
    def _normalize_uploaded_by(uploaded_by: dict | None) -> dict:
        if not isinstance(uploaded_by, dict):
            return {"id": None, "username": None, "display_name": None}
        username = str(uploaded_by.get("username") or "").strip() or None
        display_name = str(uploaded_by.get("display_name") or "").strip() or username
        raw_id = uploaded_by.get("id")
        try:
            user_id = int(raw_id) if raw_id is not None else None
        except (TypeError, ValueError):
            user_id = None
        return {"id": user_id, "username": username, "display_name": display_name}

    def _delete_registered_source_files(self, source: str) -> int:
        service = DocumentFileService(
            upload_root=self.upload_root,
            file_registry=self.file_registry,
            retrieval_service_factory=self.retrieval_service_factory,
        )
        return int(service.delete_source_files(source)["file_records"])

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
