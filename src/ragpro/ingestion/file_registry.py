from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Callable

from ragpro.config import get_settings
from ragpro.retrieval import RetrievalService, VectorStore

_FILE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
_MANIFEST_VERSION = 1


class DocumentFileNotFound(ValueError):
    pass


class DocumentFileRegistry:
    def __init__(self, manifest_path: Path | None = None, *, upload_root: Path | None = None) -> None:
        settings = get_settings()
        self.upload_root = Path(upload_root or settings.upload_dir).resolve()
        self.manifest_path = Path(manifest_path or self.upload_root / "_document_files.json")
        self._lock = Lock()

    def list_files(self, source: str | None = None) -> list[dict]:
        records = self._read_records()
        if source:
            records = [record for record in records if record.get("source") == source]
        return sorted(
            (dict(record) for record in records),
            key=lambda record: str(record.get("created_at") or ""),
            reverse=True,
        )

    def get_file(self, file_id: str) -> dict | None:
        self._validate_file_id(file_id)
        for record in self._read_records():
            if record.get("file_id") == file_id:
                return dict(record)
        return None

    def add_files(self, records: list[dict]) -> None:
        if not records:
            return
        with self._lock:
            existing = self._read_records_unlocked()
            by_id = {record["file_id"]: record for record in existing if record.get("file_id")}
            for record in records:
                file_id = str(record.get("file_id") or "")
                self._validate_file_id(file_id)
                by_id[file_id] = dict(record)
            self._write_records_unlocked(list(by_id.values()))

    def remove_file(self, file_id: str) -> dict:
        self._validate_file_id(file_id)
        with self._lock:
            records = self._read_records_unlocked()
            kept = []
            removed = None
            for record in records:
                if record.get("file_id") == file_id:
                    removed = record
                else:
                    kept.append(record)
            if removed is None:
                raise DocumentFileNotFound(f"Uploaded file not found: {file_id}")
            self._write_records_unlocked(kept)
            return dict(removed)

    def remove_source_files(self, source: str) -> list[dict]:
        with self._lock:
            records = self._read_records_unlocked()
            removed = [record for record in records if record.get("source") == source]
            kept = [record for record in records if record.get("source") != source]
            if removed:
                self._write_records_unlocked(kept)
            return [dict(record) for record in removed]

    def resolve_stored_path(self, record: dict) -> Path:
        raw_path = Path(str(record.get("stored_path") or ""))
        if not raw_path.is_absolute():
            raw_path = self.upload_root / raw_path
        resolved = raw_path.resolve()
        if resolved != self.upload_root and self.upload_root not in resolved.parents:
            raise ValueError("Stored file path is outside the upload directory.")
        return resolved

    def _read_records(self) -> list[dict]:
        with self._lock:
            return self._read_records_unlocked()

    def _read_records_unlocked(self) -> list[dict]:
        if not self.manifest_path.exists():
            return []
        try:
            payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Document file manifest is invalid: {self.manifest_path}") from exc
        if isinstance(payload, list):
            return [dict(item) for item in payload if isinstance(item, dict)]
        records = payload.get("files", []) if isinstance(payload, dict) else []
        return [dict(item) for item in records if isinstance(item, dict)]

    def _write_records_unlocked(self, records: list[dict]) -> None:
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": _MANIFEST_VERSION,
            "updated_at": datetime.now().isoformat(),
            "files": records,
        }
        temp_path = self.manifest_path.with_suffix(f"{self.manifest_path.suffix}.tmp")
        temp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_path.replace(self.manifest_path)

    @staticmethod
    def _validate_file_id(file_id: str) -> None:
        if not _FILE_ID_PATTERN.fullmatch(str(file_id or "")):
            raise ValueError("Invalid uploaded file id.")


class DocumentFileService:
    def __init__(
        self,
        *,
        upload_root: Path | None = None,
        file_registry: DocumentFileRegistry | None = None,
        retrieval_service_factory: Callable[[], RetrievalService] | None = None,
    ) -> None:
        settings = get_settings()
        self.upload_root = Path(upload_root or settings.upload_dir)
        self.file_registry = file_registry or DocumentFileRegistry(upload_root=self.upload_root)
        self.retrieval_service_factory = retrieval_service_factory or self._default_retrieval_service_factory

    def list_files(self, source: str | None = None) -> list[dict]:
        return self.file_registry.list_files(source=source)

    def delete_file(self, file_id: str) -> dict:
        record = self.file_registry.get_file(file_id)
        if record is None:
            raise DocumentFileNotFound(f"Uploaded file not found: {file_id}")

        retrieval_service = self.retrieval_service_factory()
        deleted_vectors = retrieval_service.delete_file(file_id)
        deleted_file = self._delete_stored_file(record)
        removed = self.file_registry.remove_file(file_id)
        self._remove_empty_parent_dir(removed)

        return {
            "file_id": file_id,
            "source": removed.get("source"),
            "filename": removed.get("filename"),
            "stored_name": removed.get("stored_name"),
            "document_chunks": int(removed.get("document_chunks") or 0),
            "deleted_vectors": deleted_vectors,
            "deleted_file": deleted_file,
        }

    def delete_source_files(self, source: str) -> dict:
        records = self.file_registry.remove_source_files(source)
        deleted_files = 0
        for record in records:
            if self._delete_stored_file(record):
                deleted_files += 1
            self._remove_empty_parent_dir(record)
        return {
            "source": source,
            "file_records": len(records),
            "deleted_files": deleted_files,
        }

    @staticmethod
    def _default_retrieval_service_factory() -> RetrievalService:
        return RetrievalService(vector_store=VectorStore())

    def _delete_stored_file(self, record: dict) -> bool:
        stored_path = self.file_registry.resolve_stored_path(record)
        if not stored_path.exists():
            return False
        if not stored_path.is_file():
            raise ValueError("Stored upload path is not a file.")
        stored_path.unlink()
        return True

    def _remove_empty_parent_dir(self, record: dict) -> None:
        try:
            parent = self.file_registry.resolve_stored_path(record).parent
        except ValueError:
            return
        if parent == self.file_registry.upload_root:
            return
        try:
            parent.rmdir()
        except OSError:
            return
