from __future__ import annotations

import socket
from dataclasses import asdict, dataclass
from datetime import datetime

from ragpro.config import get_settings


@dataclass(frozen=True)
class ServiceCheck:
    name: str
    host: str
    port: int
    available: bool
    detail: str


def check_port(name: str, host: str, port: int, timeout: float = 1.5) -> ServiceCheck:
    sock = socket.socket()
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        return ServiceCheck(name=name, host=host, port=port, available=True, detail="open")
    except Exception as exc:
        return ServiceCheck(
            name=name,
            host=host,
            port=port,
            available=False,
            detail=f"{type(exc).__name__}: {exc}",
        )
    finally:
        sock.close()


def run_healthcheck() -> dict:
    diagnostics = run_preflight()
    summary = diagnostics["service_summary"]
    return {
        "service": diagnostics["service"],
        "status": "ok",
        "readiness": diagnostics["status"],
        "phase": diagnostics["phase"],
        "checked_at": diagnostics["checked_at"],
        "dependencies": {
            "available": summary["available"],
            "total": summary["total"],
        },
    }


def run_preflight() -> dict:
    settings = get_settings()
    checks = [
        check_port("mysql", settings.mysql_host, 3306),
        check_port("redis", settings.redis_host, settings.redis_port),
        check_port("ollama", "127.0.0.1", 11434),
        check_port("milvus", settings.milvus_host, int(settings.milvus_port)),
    ]
    services = [asdict(item) for item in checks]
    available = sum(1 for item in checks if item.available)
    unavailable_services = [item.name for item in checks if not item.available]
    return {
        "service": "ragpro-api",
        "status": "ok" if not unavailable_services else "degraded",
        "phase": "phase-one-mvp",
        "checked_at": datetime.now().isoformat(),
        "service_summary": {
            "available": available,
            "unavailable": len(checks) - available,
            "total": len(checks),
            "unavailable_services": unavailable_services,
        },
        "environment": {
            "project_root": str(settings.project_root),
            "log_path": str(settings.log_path),
            "mysql_database": settings.mysql_database,
            "redis_password_configured": bool(settings.redis_password),
            "vector_backend_preference": settings.vector_backend,
            "local_vector_store_path": str(settings.local_vector_store_path),
            "local_vector_store_exists": settings.local_vector_store_path.exists(),
        },
        "services": services,
    }
