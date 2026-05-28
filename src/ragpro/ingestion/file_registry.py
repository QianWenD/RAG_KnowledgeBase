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

    def list_files(
        self,
        source: str | None = None,
        filename: str | None = None,
        uploader: str | None = None,
        created_from: str | None = None,
        created_to: str | None = None,
    ) -> list[dict]:
        records = self._read_records()
        records = [
            record
            for record in records
            if self._record_matches_filters(
                record,
                source=source,
                filename=filename,
                uploader=uploader,
                created_from=created_from,
                created_to=created_to,
            )
        ]
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

    @classmethod
    def _record_matches_filters(
        cls,
        record: dict,
        *,
        source: str | None = None,
        filename: str | None = None,
        uploader: str | None = None,
        created_from: str | None = None,
        created_to: str | None = None,
    ) -> bool:
        if source and record.get("source") != source:
            return False
        if filename and filename.casefold() not in str(record.get("filename") or "").casefold():
            return False
        if uploader and not cls._record_matches_uploader(record, uploader):
            return False
        if (created_from or created_to) and not cls._record_matches_created_range(
            record,
            created_from=created_from,
            created_to=created_to,
        ):
            return False
        return True

    @staticmethod
    def _record_matches_uploader(record: dict, uploader: str) -> bool:
        needle = uploader.casefold()
        haystack = " ".join(
            str(value or "")
            for value in (
                record.get("uploader_display_name"),
                record.get("uploader_username"),
                record.get("uploader_user_id"),
            )
        ).casefold()
        return needle in haystack

    @classmethod
    def _record_matches_created_range(
        cls,
        record: dict,
        *,
        created_from: str | None = None,
        created_to: str | None = None,
    ) -> bool:
        created_at = cls._parse_datetime(record.get("created_at"))
        if created_at is None:
            return False
        from_at = cls._parse_datetime(created_from)
        to_at = cls._parse_datetime(created_to)
        if from_at is not None and created_at < from_at:
            return False
        if to_at is not None and created_at > to_at:
            return False
        return True

    @staticmethod
    def _parse_datetime(value: object) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value))
        except ValueError:
            return None


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

    def list_files(
        self,
        source: str | None = None,
        filename: str | None = None,
        uploader: str | None = None,
        created_from: str | None = None,
        created_to: str | None = None,
    ) -> list[dict]:
        return self.file_registry.list_files(
            source=source,
            filename=filename,
            uploader=uploader,
            created_from=created_from,
            created_to=created_to,
        )

    def get_file_for_response(self, file_id: str) -> tuple[dict, Path]:
        record = self.file_registry.get_file(file_id)
        if record is None:
            raise DocumentFileNotFound(f"Uploaded file not found: {file_id}")
        stored_path = self.file_registry.resolve_stored_path(record)
        if not stored_path.exists() or not stored_path.is_file():
            raise DocumentFileNotFound(f"Stored upload file is missing: {file_id}")
        return record, stored_path

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
