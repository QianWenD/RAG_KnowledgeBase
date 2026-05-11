from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from uuid import uuid4


@dataclass
class UploadJob:
    job_id: str
    source: str
    replace_source: bool
    file_count: int
    status: str = "queued"
    stage: str = "queued"
    progress: int = 5
    message: str = "文件已接收，等待入库。"
    result: dict | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        payload = {
            "job_id": self.job_id,
            "source": self.source,
            "replace_source": self.replace_source,
            "file_count": self.file_count,
            "status": self.status,
            "stage": self.stage,
            "progress": self.progress,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.result is not None:
            payload["result"] = self.result
        if self.error:
            payload["error"] = self.error
        return payload


class UploadJobRegistry:
    def __init__(self) -> None:
        self._jobs: dict[str, UploadJob] = {}
        self._lock = Lock()

    def create(self, *, source: str, replace_source: bool, file_count: int) -> dict:
        job = UploadJob(
            job_id=uuid4().hex,
            source=source,
            replace_source=replace_source,
            file_count=file_count,
        )
        with self._lock:
            self._jobs[job.job_id] = job
        return job.to_dict()

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return job.to_dict() if job else None

    def mark_running(self, job_id: str, *, stage: str, progress: int, message: str) -> dict | None:
        return self._update(
            job_id,
            status="running",
            stage=stage,
            progress=max(1, min(int(progress), 99)),
            message=message,
            error=None,
        )

    def mark_succeeded(self, job_id: str, result: dict) -> dict | None:
        return self._update(
            job_id,
            status="succeeded",
            stage="done",
            progress=100,
            message="文档上传并入库完成。",
            result=result,
            error=None,
        )

    def mark_failed(self, job_id: str, error: str) -> dict | None:
        return self._update(
            job_id,
            status="failed",
            stage="error",
            progress=100,
            message="上传入库失败。",
            error=error,
        )

    def _update(self, job_id: str, **changes) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            for key, value in changes.items():
                setattr(job, key, value)
            job.updated_at = datetime.now()
            return job.to_dict()
