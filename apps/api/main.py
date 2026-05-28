from __future__ import annotations

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import TYPE_CHECKING
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
WEB_ROOT = PROJECT_ROOT / "apps" / "web"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.auth import QueryAccessError, filter_sources_for_user, resolve_query_source_scope
from ragpro.config import get_logger, get_settings
from ragpro.ingestion.upload_jobs import UploadBatchRegistry, UploadJobRegistry
from ragpro.runtime import run_healthcheck, run_preflight
from ragpro.routing import UnifiedQueryRouter

if TYPE_CHECKING:
    from ragpro.auth import (
        AuditLogRecord,
        AuthenticatedUser,
        MenuItemRecord,
        MenuRoleRecord,
        OrgUnitRecord,
        QuerySourceScope,
    )
    from ragpro.conversation.repository import ConversationMySQLRepository

logger = get_logger("ragpro.api")
settings = get_settings()
app = FastAPI(title="RAGPro API", description="Formalized API entrypoint for the RAGPro project")
if WEB_ROOT.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_ROOT)), name="static")
_upload_job_registry = UploadJobRegistry()
_upload_batch_registry = UploadBatchRegistry()
_upload_job_executor = ThreadPoolExecutor(
    max_workers=max(1, settings.upload_job_workers),
    thread_name_prefix="ragpro-upload",
)
_rag_service = None
_rag_service_lock = Lock()

AUDIT_ACTIONS = (
    "register",
    "login",
    "logout",
    "change_password",
    "admin_create_user",
    "update_user_profile",
    "update_user_access",
    "reset_password",
    "delete_user",
    "create_org_unit",
    "update_org_unit",
    "delete_org_unit",
    "create_menu_role",
    "update_menu_role",
    "delete_menu_role",
    "create_menu_item",
    "update_menu_item",
    "delete_menu_item",
    "delete_document_file",
)
SENSITIVE_AUDIT_ACTIONS = (
    "reset_password",
    "delete_user",
    "change_password",
    "update_user_profile",
    "update_user_access",
    "delete_org_unit",
    "delete_menu_role",
    "delete_menu_item",
    "delete_document_file",
)
SOURCE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$")
INLINE_TEXT_FILE_EXTENSIONS = {".txt", ".md", ".markdown", ".html", ".htm"}


def _call_local_llm(prompt: str) -> str:
    from ragpro.generation.llm import call_local_llm

    return call_local_llm(prompt)


def _stream_local_llm(prompt: str):
    from ragpro.generation.llm import stream_local_llm

    return stream_local_llm(prompt)


def _build_rag_service():
    from ragpro.generation.service import RAGGenerationService
    from ragpro.retrieval import RetrievalService, VectorStore

    global _rag_service
    if _rag_service is not None:
        return _rag_service

    with _rag_service_lock:
        if _rag_service is not None:
            return _rag_service

        retrieval_service = RetrievalService(vector_store=VectorStore())
        service = RAGGenerationService(
            retrieval_service=retrieval_service,
            llm=_call_local_llm,
            llm_stream=_stream_local_llm,
        )
        if getattr(retrieval_service.vector_store, "backend", None) != "milvus":
            return service

        _rag_service = service
        return _rag_service


def _build_document_upload_service():
    from ragpro.ingestion import DocumentUploadService

    return DocumentUploadService()


def _build_document_file_service():
    from ragpro.ingestion import DocumentFileService

    return DocumentFileService()


def _document_actor_payload(user: "AuthenticatedUser") -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name or user.username,
    }


def _run_reindex_job(directory: Path, *, append: bool) -> dict:
    from apps.worker.index_documents import run_index

    return run_index(directory, replace_source=not append)


def _conversation_service_from_repository(repository):
    from ragpro.conversation import ConversationService

    return ConversationService(repository)


def _create_conversation_repository():
    from ragpro.conversation.repository import ConversationMySQLRepository

    return ConversationMySQLRepository()


def _create_faq_components():
    from ragpro.faq_match import FAQMatchService, FAQMySQLRepository, FAQRedisCache

    repository = FAQMySQLRepository()
    cache = FAQRedisCache()
    service = FAQMatchService(cache=cache, repository=repository)
    return repository, service


def _create_auth_repository():
    from ragpro.auth import AuthMySQLRepository

    return AuthMySQLRepository()


def _auth_service_from_repository(repository):
    from ragpro.auth import AuthService

    return AuthService(repository)


def _normalize_source_name(source: str | None) -> str | None:
    normalized = str(source or "").strip()
    if not normalized:
        return None
    if not SOURCE_NAME_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=400,
            detail=(
                "数据源格式不正确。请使用 1-50 位字母、数字、下划线或短横线，"
                "并以字母或数字开头。"
            ),
        )
    return normalized


def _validate_source_filter(source_filter: str | None) -> str | None:
    return _normalize_source_name(source_filter)


def _validate_allowed_sources(values: list[str] | tuple[str, ...] | None) -> list[str] | None:
    if values is None:
        return None
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        source = _normalize_source_name(str(value))
        if source and source not in seen:
            normalized.append(source)
            seen.add(source)
    return normalized


def _merge_known_sources(*groups: list[str] | tuple[str, ...]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for value in group or ():
            source = str(value).strip()
            if source and source not in seen:
                merged.append(source)
                seen.add(source)
    return merged


def _available_sources_for_user(user: "AuthenticatedUser", auth_repository=None) -> list[str]:
    if not user.is_admin:
        return filter_sources_for_user(settings.valid_sources, user)

    repository = auth_repository
    owns_repository = repository is None
    try:
        if repository is None:
            repository = _create_auth_repository()
        if not hasattr(repository, "list_users"):
            return filter_sources_for_user(settings.valid_sources, user)
        known_sources = _merge_known_sources(settings.valid_sources)
        for known_user in repository.list_users():
            known_sources = _merge_known_sources(known_sources, known_user.allowed_sources)
        return filter_sources_for_user(known_sources, user)
    except Exception:  # pragma: no cover - defensive fallback
        logger.exception("Failed to aggregate admin-visible sources; falling back to current user scope.")
        return filter_sources_for_user(settings.valid_sources, user)
    finally:
        if owns_repository and repository is not None:
            repository.close()


def _normalize_audit_action(action: str | None) -> str | None:
    normalized = (action or "").strip()
    if not normalized:
        return None
    if normalized not in AUDIT_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported audit action '{normalized}'.")
    return normalized


def _normalize_audit_search(search: str | None) -> str | None:
    normalized = (search or "").strip()
    if not normalized:
        return None
    if len(normalized) > 64:
        raise HTTPException(status_code=400, detail="Audit search must be 64 characters or fewer.")
    return normalized



def _parse_audit_datetime(value: str | None, *, field_name: str) -> datetime | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} datetime '{normalized}'. Use ISO 8601 like 2026-04-10T08:00.",
        ) from exc
    if parsed.tzinfo is not None:
        parsed = parsed.replace(tzinfo=None)
    return parsed


def _format_audit_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.strftime("%Y-%m-%dT%H:%M:%S")

def _is_within_directory(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_reindex_directory(source: str, directory: str | None) -> Path:
    source_data_directory = (settings.data_dir / f"{source}_data").resolve()
    source_upload_directory = (settings.upload_dir / source).resolve()
    allowed_roots = (source_data_directory, source_upload_directory)

    if directory:
        resolved = Path(directory).expanduser().resolve()
        if not resolved.exists() or not resolved.is_dir():
            raise HTTPException(status_code=404, detail=f"Reindex directory '{resolved}' was not found.")
        if not any(_is_within_directory(resolved, root) for root in allowed_roots):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Directory '{resolved}' is outside the allowed reindex roots for source '{source}'."
                ),
            )
        return resolved

    for candidate in allowed_roots:
        if candidate.exists() and candidate.is_dir():
            return candidate

    checked = ", ".join(str(item) for item in allowed_roots)
    raise HTTPException(
        status_code=404,
        detail=f"No reindex directory found for source '{source}'. Checked: {checked}",
    )


def _build_router(faq_service) -> UnifiedQueryRouter:
    return UnifiedQueryRouter(
        faq_service=faq_service,
        llm=_call_local_llm,
        llm_stream=_stream_local_llm,
        rag_service_factory=_build_rag_service,
    )


def _conversation_get_history(
    service,
    session_id: str,
    *,
    user_id: int,
    include_unowned: bool = False,
) -> list[dict]:
    try:
        return service.get_history(session_id, user_id=user_id, include_unowned=include_unowned)
    except TypeError:
        return service.get_history(session_id)


def _conversation_list_sessions(
    service,
    *,
    user_id: int,
    include_unowned: bool = False,
    limit: int = 20,
) -> list[dict]:
    try:
        return service.list_sessions(user_id=user_id, include_unowned=include_unowned, limit=limit)
    except TypeError:
        return service.list_sessions(limit=limit)


def _conversation_save_turn(service, session_id: str, question: str, answer: str, *, user_id: int) -> list[dict]:
    try:
        return service.save_turn(session_id, question, answer, user_id=user_id)
    except TypeError:
        return service.save_turn(session_id, question, answer)


def _conversation_clear_history(service, session_id: str, *, user_id: int, include_unowned: bool = False) -> None:
    try:
        service.clear_history(session_id, user_id=user_id, include_unowned=include_unowned)
    except TypeError:
        service.clear_history(session_id)


def _serialize_user(user: AuthenticatedUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "allowed_sources": list(user.allowed_sources),
        "is_active": user.is_active,
        "status": "enabled" if user.is_active else "disabled",
        "created_at": user.created_at,
        "display_name": user.display_name or user.username,
        "name": user.display_name or user.username,
        "work_no": user.work_no or user.username,
        "employee_no": user.work_no or user.username,
        "org_unit_id": user.org_unit_id,
        "org_name": user.org_name,
        "organization": user.org_name,
        "menu_role_ids": list(user.menu_role_ids),
        "menu_role_names": list(user.menu_role_names),
    }


def _serialize_audit_log(log: AuditLogRecord) -> dict:
    return {
        "id": log.id,
        "action": log.action,
        "actor_user_id": log.actor_user_id,
        "actor_username": log.actor_username,
        "actor_role": log.actor_role,
        "target_user_id": log.target_user_id,
        "target_username": log.target_username,
        "target_role": log.target_role,
        "metadata": log.metadata,
        "created_at": log.created_at,
    }


def _serialize_org_unit(org_unit: OrgUnitRecord) -> dict:
    return {
        "id": org_unit.id,
        "parent_id": org_unit.parent_id,
        "org_code": org_unit.org_code,
        "org_name": org_unit.org_name,
        "org_type": org_unit.org_type,
        "org_desc": org_unit.org_desc,
        "sort_order": org_unit.sort_order,
        "assigned_user_count": org_unit.assigned_user_count,
        "created_at": org_unit.created_at,
        "updated_at": org_unit.updated_at,
    }


def _serialize_menu_role(role: MenuRoleRecord) -> dict:
    return {
        "id": role.id,
        "role_code": role.role_code,
        "role_name": role.role_name,
        "role_desc": role.role_desc,
        "menu_ids": list(role.menu_ids),
        "menu_codes": list(role.menu_codes),
        "menu_names": list(role.menu_names),
        "assigned_user_count": role.assigned_user_count,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


def _serialize_menu_item(item: MenuItemRecord) -> dict:
    return {
        "id": item.id,
        "parent_id": item.parent_id,
        "menu_code": item.menu_code,
        "name": item.name,
        "router_name": item.router_name,
        "router_path": item.router_path,
        "icon_url": item.icon_url,
        "href": item.href,
        "is_visible": item.is_visible,
        "remark": item.remark,
        "sort_order": item.sort_order,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _record_auth_audit(
    repository,
    *,
    action: str,
    actor: AuthenticatedUser | None = None,
    target: AuthenticatedUser | None = None,
    metadata: dict | None = None,
) -> None:
    repository.create_audit_log(
        action=action,
        actor_user_id=actor.id if actor is not None else None,
        actor_username=actor.username if actor is not None else None,
        actor_role=actor.role if actor is not None else None,
        target_user_id=target.id if target is not None else None,
        target_username=target.username if target is not None else None,
        target_role=target.role if target is not None else None,
        metadata=metadata or {},
    )


def _serialize_document_file(record: dict) -> dict:
    return {
        "file_id": record.get("file_id"),
        "source": record.get("source"),
        "filename": record.get("filename"),
        "stored_name": record.get("stored_name"),
        "content_type": record.get("content_type"),
        "size_bytes": int(record.get("size_bytes") or 0),
        "document_chunks": int(record.get("document_chunks") or 0),
        "uploader_user_id": record.get("uploader_user_id"),
        "uploader_username": record.get("uploader_username"),
        "uploader_display_name": record.get("uploader_display_name") or record.get("uploader_username"),
        "created_at": record.get("created_at"),
    }


def _document_file_response(file_id: str, *, disposition: str) -> FileResponse:
    from ragpro.ingestion import DocumentFileNotFound

    try:
        service = _build_document_file_service()
        record, stored_path = service.get_file_for_response(file_id)
        media_type = _document_file_media_type(record, stored_path, disposition=disposition)
        return FileResponse(
            stored_path,
            headers=_document_file_headers(disposition=disposition),
            media_type=media_type,
            filename=record.get("filename") or stored_path.name,
            content_disposition_type=disposition,
        )
    except DocumentFileNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _document_file_media_type(record: dict, stored_path: Path, *, disposition: str) -> str:
    if disposition != "inline":
        return record.get("content_type") or "application/octet-stream"

    suffix = Path(record.get("filename") or stored_path.name).suffix.lower()
    if suffix in INLINE_TEXT_FILE_EXTENSIONS:
        return "text/plain; charset=utf-8"
    if suffix == ".pdf":
        return "application/pdf"
    return "application/octet-stream"


def _document_file_headers(*, disposition: str) -> dict[str, str]:
    headers = {"X-Content-Type-Options": "nosniff"}
    if disposition == "inline":
        headers["Content-Security-Policy"] = "sandbox"
    return headers


def _set_auth_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=session_token,
        max_age=settings.auth_session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def _require_authenticated_user(request: Request):
    auth_repository = None
    try:
        session_token = request.cookies.get(settings.auth_cookie_name)
        if not session_token:
            raise HTTPException(status_code=401, detail="Authentication required.")

        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        return auth_service.authenticate_token(session_token)
    except HTTPException:
        raise
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


def _try_get_authenticated_user(request: Request):
    auth_repository = None
    try:
        session_token = request.cookies.get(settings.auth_cookie_name)
        if not session_token:
            return None

        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        return auth_service.authenticate_token(session_token)
    except Exception:
        return None
    finally:
        if auth_repository is not None:
            auth_repository.close()


def _require_admin_user(request: Request):
    user = _require_authenticated_user(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="当前账号没有管理员权限。")
    return user


def _resolve_query_source_scope_for_user(
    *,
    query: str,
    requested_source_filter: str | None,
    user: AuthenticatedUser,
) -> "QuerySourceScope":
    requested_source_filter = _validate_source_filter(requested_source_filter)
    try:
        return resolve_query_source_scope(
            query=query,
            requested_source_filter=requested_source_filter,
            user=user,
        )
    except QueryAccessError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User query text")
    threshold: float = Field(0.85, ge=0.0, le=1.0)
    source_filter: str | None = Field(default=None, description="Optional domain/source filter")
    history: list[dict] | None = Field(default=None, description="Optional recent dialogue history")
    session_id: str | None = Field(default=None, description="Optional conversation session id")
    stream: bool = Field(default=False, description="Whether to use SSE streaming response")


class ReindexRequest(BaseModel):
    source: str = Field(..., min_length=1, description="Knowledge source to rebuild")
    directory: str | None = Field(
        default=None,
        description="Optional directory override under packages/data/<source>_data or runtime/uploads/<source>",
    )
    append: bool = Field(default=False, description="Append to the existing source instead of replacing it")


class SourceRegistrationRequest(BaseModel):
    source: str = Field(..., min_length=1, max_length=50, description="Custom knowledge source to register")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)


class UserAccessUpdateRequest(BaseModel):
    role: str | None = Field(default=None, description="Role to assign: admin or user")
    allowed_sources: list[str] | None = Field(default=None, description="Allowed knowledge sources")
    is_active: bool | None = Field(default=None, description="Whether the account is active")
    menu_role_ids: list[int] | None = Field(default=None, description="Assigned menu role ids")


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="user", description="Role to assign: admin or user")
    allowed_sources: list[str] | None = Field(default=None, description="Allowed knowledge sources")
    is_active: bool = Field(default=True, description="Whether the account is active")
    display_name: str | None = Field(default=None, max_length=64, description="Display name shown in console")
    work_no: str | None = Field(default=None, max_length=64, description="Employee/work number")
    org_unit_id: int | None = Field(default=None, description="Organization unit id")
    menu_role_ids: list[int] | None = Field(default=None, description="Assigned menu role ids")


class UserProfileUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    display_name: str | None = Field(default=None, max_length=64)
    work_no: str | None = Field(default=None, max_length=64)
    org_unit_id: int | None = Field(default=None)
    menu_role_ids: list[int] | None = Field(default=None)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class OrgUnitRequest(BaseModel):
    org_code: str = Field(..., min_length=2, max_length=64)
    org_name: str = Field(..., min_length=1, max_length=128)
    org_type: str = Field(default="department", min_length=2, max_length=32)
    parent_id: int | None = Field(default=None)
    org_desc: str | None = Field(default=None, max_length=255)
    sort_order: int = Field(default=100, ge=0, le=9999)


class OrgUnitUpdateRequest(BaseModel):
    org_code: str | None = Field(default=None, min_length=2, max_length=64)
    org_name: str | None = Field(default=None, min_length=1, max_length=128)
    org_type: str | None = Field(default=None, min_length=2, max_length=32)
    parent_id: int | None = Field(default=None)
    org_desc: str | None = Field(default=None, max_length=255)
    sort_order: int | None = Field(default=None, ge=0, le=9999)


class MenuRoleRequest(BaseModel):
    role_code: str = Field(..., min_length=2, max_length=64)
    role_name: str = Field(..., min_length=1, max_length=64)
    role_desc: str | None = Field(default=None, max_length=255)
    menu_ids: list[int] | None = Field(default=None)


class MenuRoleUpdateRequest(BaseModel):
    role_code: str | None = Field(default=None, min_length=2, max_length=64)
    role_name: str | None = Field(default=None, min_length=1, max_length=64)
    role_desc: str | None = Field(default=None, max_length=255)
    menu_ids: list[int] | None = Field(default=None)


class MenuItemRequest(BaseModel):
    menu_code: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)
    parent_id: int | None = Field(default=None)
    router_name: str | None = Field(default=None, max_length=64)
    router_path: str | None = Field(default=None, max_length=255)
    icon_url: str | None = Field(default=None, max_length=255)
    href: str | None = Field(default=None, max_length=255)
    is_visible: bool = Field(default=True)
    remark: str | None = Field(default=None, max_length=255)
    sort_order: int = Field(default=100, ge=0, le=9999)


class MenuItemUpdateRequest(BaseModel):
    menu_code: str | None = Field(default=None, min_length=2, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=128)
    parent_id: int | None = Field(default=None)
    router_name: str | None = Field(default=None, max_length=64)
    router_path: str | None = Field(default=None, max_length=255)
    icon_url: str | None = Field(default=None, max_length=255)
    href: str | None = Field(default=None, max_length=255)
    is_visible: bool | None = Field(default=None)
    remark: str | None = Field(default=None, max_length=255)
    sort_order: int | None = Field(default=None, ge=0, le=9999)


def _serve_web_page(filename: str):
    page_path = WEB_ROOT / filename
    if page_path.exists():
        return FileResponse(page_path)
    raise HTTPException(status_code=404, detail=f"Frontend page '{filename}' not found.")


@app.get("/")
def index():
    return _serve_web_page("index.html")


@app.get("/login")
def login_page():
    return _serve_web_page("login.html")


@app.get("/register")
def register_page():
    return _serve_web_page("register.html")


@app.get("/qa")
def qa_page():
    return _serve_web_page("qa.html")


@app.get("/knowledge")
def knowledge_page():
    return _serve_web_page("knowledge.html")

@app.get("/knowledge/reindex")
def knowledge_reindex_page():
    return _serve_web_page("knowledge_reindex.html")


@app.get("/knowledge/sources")
def knowledge_sources_page():
    return _serve_web_page("knowledge_sources.html")



@app.get("/users")
def users_page():
    return _serve_web_page("users.html")


@app.get("/users/access")
def users_access_page():
    return _serve_web_page("users_access.html")


@app.get("/users/org")
def users_org_page():
    return _serve_web_page("users_org.html")


@app.get("/users/security")
def users_security_page():
    return _serve_web_page("users_security.html")


@app.get("/users/audit")
def users_audit_page():
    return _serve_web_page("users_audit.html")


@app.get("/health")
def health() -> dict:
    return run_healthcheck()


@app.get("/diagnostics")
def diagnostics(request: Request) -> dict:
    _require_admin_user(request)
    return run_preflight()


@app.post("/auth/register")
def register(payload: RegisterRequest, response: Response) -> dict:
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        result = auth_service.register(username=payload.username, password=payload.password)
        _record_auth_audit(
            auth_repository,
            action="register",
            actor=result.user,
            target=result.user,
            metadata={"allowed_sources": list(result.user.allowed_sources)},
        )
        _set_auth_cookie(response, result.session_token)
        return {"user": _serialize_user(result.user)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/login")
def login(payload: LoginRequest, response: Response) -> dict:
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        result = auth_service.login(username=payload.username, password=payload.password)
        _record_auth_audit(
            auth_repository,
            action="login",
            actor=result.user,
            target=result.user,
            metadata={"allowed_sources": list(result.user.allowed_sources)},
        )
        _set_auth_cookie(response, result.session_token)
        return {"user": _serialize_user(result.user)}
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/logout")
def logout(request: Request, response: Response) -> dict:
    actor = _try_get_authenticated_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        auth_service.logout(request.cookies.get(settings.auth_cookie_name))
        if actor is not None:
            _record_auth_audit(auth_repository, action="logout", actor=actor, target=actor)
        _clear_auth_cookie(response)
        return {"logged_out": True}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/me")
def current_user(request: Request) -> dict:
    user = _require_authenticated_user(request)
    return {"authenticated": True, "user": _serialize_user(user)}


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest, request: Request, response: Response) -> dict:
    user = _require_authenticated_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.change_password(
            user_id=user.id,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
        _record_auth_audit(auth_repository, action="change_password", actor=user, target=updated)
        _clear_auth_cookie(response)
        return {"password_changed": True, "user": _serialize_user(updated)}
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/users")
def list_users(
    request: Request,
    login: str | None = None,
    work_no: str | None = None,
    display_name: str | None = None,
    org_unit_id: int | None = None,
) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        users = auth_service.list_users(
            login=login,
            work_no=work_no,
            display_name=display_name,
            org_unit_id=org_unit_id,
        )
        return {
            "users": [_serialize_user(user) for user in users],
            "count": len(users),
            "filters": {
                "login": (login or "").strip() or None,
                "work_no": (work_no or "").strip() or None,
                "display_name": (display_name or "").strip() or None,
                "org_unit_id": org_unit_id,
            },
        }
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/permission-bootstrap")
def get_permission_bootstrap(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        return auth_service.get_permission_bootstrap()
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/org-units")
def list_org_units(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        org_units = auth_service.list_org_units()
        return {"items": [_serialize_org_unit(item) for item in org_units], "count": len(org_units)}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/org-units/tree")
def get_org_unit_tree(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        org_units = auth_service.list_org_unit_tree()
        return {"items": org_units, "count": len(org_units)}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/org-units")
def create_org_unit(payload: OrgUnitRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        created = auth_service.create_org_unit(
            org_code=payload.org_code,
            org_name=payload.org_name,
            org_type=payload.org_type,
            parent_id=payload.parent_id,
            org_desc=payload.org_desc,
            sort_order=payload.sort_order,
        )
        _record_auth_audit(
            auth_repository,
            action="create_org_unit",
            actor=admin_user,
            metadata={
                "org_code": created.org_code,
                "org_name": created.org_name,
                "org_type": created.org_type,
                "parent_id": created.parent_id,
            },
        )
        return {"item": _serialize_org_unit(created)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.patch("/auth/org-units/{org_unit_id}")
def update_org_unit(org_unit_id: int, payload: OrgUnitUpdateRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.update_org_unit(
            org_unit_id=org_unit_id,
            org_code=payload.org_code,
            org_name=payload.org_name,
            org_type=payload.org_type,
            parent_id=payload.parent_id,
            org_desc=payload.org_desc,
            sort_order=payload.sort_order,
        )
        _record_auth_audit(
            auth_repository,
            action="update_org_unit",
            actor=admin_user,
            metadata={
                "org_unit_id": updated.id,
                "org_code": updated.org_code,
                "org_name": updated.org_name,
                "parent_id": updated.parent_id,
            },
        )
        return {"item": _serialize_org_unit(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.delete("/auth/org-units/{org_unit_id}")
def delete_org_unit(org_unit_id: int, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        deleted = auth_service.delete_org_unit(org_unit_id=org_unit_id)
        _record_auth_audit(
            auth_repository,
            action="delete_org_unit",
            actor=admin_user,
            metadata={
                "org_unit_id": deleted.id,
                "org_code": deleted.org_code,
                "org_name": deleted.org_name,
            },
        )
        return {"deleted": True, "item": _serialize_org_unit(deleted)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/menu-roles")
def list_menu_roles(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        roles = auth_service.list_menu_roles()
        return {"items": [_serialize_menu_role(role) for role in roles], "count": len(roles)}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/menu-roles")
def create_menu_role(payload: MenuRoleRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        created = auth_service.create_menu_role(
            role_code=payload.role_code,
            role_name=payload.role_name,
            role_desc=payload.role_desc,
            menu_ids=payload.menu_ids,
        )
        _record_auth_audit(
            auth_repository,
            action="create_menu_role",
            actor=admin_user,
            metadata={
                "role_code": created.role_code,
                "role_name": created.role_name,
                "menu_ids": list(created.menu_ids),
            },
        )
        return {"item": _serialize_menu_role(created)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.patch("/auth/menu-roles/{menu_role_id}")
def update_menu_role(menu_role_id: int, payload: MenuRoleUpdateRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.update_menu_role(
            menu_role_id=menu_role_id,
            role_code=payload.role_code,
            role_name=payload.role_name,
            role_desc=payload.role_desc,
            menu_ids=payload.menu_ids,
        )
        _record_auth_audit(
            auth_repository,
            action="update_menu_role",
            actor=admin_user,
            metadata={
                "menu_role_id": updated.id,
                "role_code": updated.role_code,
                "role_name": updated.role_name,
                "menu_ids": list(updated.menu_ids),
            },
        )
        return {"item": _serialize_menu_role(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.delete("/auth/menu-roles/{menu_role_id}")
def delete_menu_role(menu_role_id: int, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        deleted = auth_service.delete_menu_role(menu_role_id=menu_role_id)
        _record_auth_audit(
            auth_repository,
            action="delete_menu_role",
            actor=admin_user,
            metadata={
                "menu_role_id": deleted.id,
                "role_code": deleted.role_code,
                "role_name": deleted.role_name,
            },
        )
        return {"deleted": True, "item": _serialize_menu_role(deleted)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/menu-items")
def list_menu_items(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        items = auth_service.list_menu_items()
        return {"items": [_serialize_menu_item(item) for item in items], "count": len(items)}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/menu-items/tree")
def list_menu_item_tree(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        items = auth_service.list_menu_item_tree()
        return {"items": items, "count": len(items)}
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/menu-items")
def create_menu_item(payload: MenuItemRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        created = auth_service.create_menu_item(
            menu_code=payload.menu_code,
            name=payload.name,
            parent_id=payload.parent_id,
            router_name=payload.router_name,
            router_path=payload.router_path,
            icon_url=payload.icon_url,
            href=payload.href,
            is_visible=payload.is_visible,
            remark=payload.remark,
            sort_order=payload.sort_order,
        )
        _record_auth_audit(
            auth_repository,
            action="create_menu_item",
            actor=admin_user,
            metadata={
                "menu_item_id": created.id,
                "menu_code": created.menu_code,
                "name": created.name,
                "parent_id": created.parent_id,
            },
        )
        return {"item": _serialize_menu_item(created)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.patch("/auth/menu-items/{menu_item_id}")
def update_menu_item(menu_item_id: int, payload: MenuItemUpdateRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.update_menu_item(
            menu_item_id=menu_item_id,
            menu_code=payload.menu_code,
            name=payload.name,
            parent_id=payload.parent_id,
            router_name=payload.router_name,
            router_path=payload.router_path,
            icon_url=payload.icon_url,
            href=payload.href,
            is_visible=payload.is_visible,
            remark=payload.remark,
            sort_order=payload.sort_order,
        )
        _record_auth_audit(
            auth_repository,
            action="update_menu_item",
            actor=admin_user,
            metadata={
                "menu_item_id": updated.id,
                "menu_code": updated.menu_code,
                "name": updated.name,
                "parent_id": updated.parent_id,
                "href": updated.href,
            },
        )
        return {"item": _serialize_menu_item(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.delete("/auth/menu-items/{menu_item_id}")
def delete_menu_item(menu_item_id: int, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        deleted = auth_service.delete_menu_item(menu_item_id=menu_item_id)
        _record_auth_audit(
            auth_repository,
            action="delete_menu_item",
            actor=admin_user,
            metadata={
                "menu_item_id": deleted.id,
                "menu_code": deleted.menu_code,
                "name": deleted.name,
            },
        )
        return {"deleted": True, "item": _serialize_menu_item(deleted)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/auth/audit-logs")
def list_audit_logs(
    request: Request,
    limit: int = 50,
    action: str | None = None,
    search: str | None = None,
    sensitive_only: bool = False,
    start_at: str | None = None,
    end_at: str | None = None,
) -> dict:
    _require_admin_user(request)
    normalized_action = _normalize_audit_action(action)
    normalized_search = _normalize_audit_search(search)
    parsed_start_at = _parse_audit_datetime(start_at, field_name="start_at")
    parsed_end_at = _parse_audit_datetime(end_at, field_name="end_at")
    if parsed_start_at and parsed_end_at and parsed_start_at > parsed_end_at:
        raise HTTPException(status_code=400, detail="Audit start_at must be earlier than or equal to end_at.")
    normalized_start_at = _format_audit_datetime(parsed_start_at)
    normalized_end_at = _format_audit_datetime(parsed_end_at)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        logs = auth_service.list_audit_logs(
            limit=limit,
            action=normalized_action,
            search=normalized_search,
            sensitive_only=sensitive_only,
            start_at=normalized_start_at,
            end_at=normalized_end_at,
        )
        return {
            "logs": [_serialize_audit_log(log) for log in logs],
            "count": len(logs),
            "filters": {
                "action": normalized_action,
                "search": normalized_search,
                "sensitive_only": sensitive_only,
                "start_at": normalized_start_at,
                "end_at": normalized_end_at,
                "limit": max(1, min(int(limit), 200)),
            },
            "available_actions": list(AUDIT_ACTIONS),
            "sensitive_actions": list(SENSITIVE_AUDIT_ACTIONS),
        }
    finally:
        if auth_repository is not None:
            auth_repository.close()

@app.post("/auth/users")
def create_user_by_admin(payload: AdminCreateUserRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        created = auth_service.create_user_by_admin(
            username=payload.username,
            password=payload.password,
            role=payload.role,
            allowed_sources=_validate_allowed_sources(payload.allowed_sources),
            is_active=payload.is_active,
            display_name=payload.display_name,
            work_no=payload.work_no,
            org_unit_id=payload.org_unit_id,
            menu_role_ids=payload.menu_role_ids,
        )
        _record_auth_audit(
            auth_repository,
            action="admin_create_user",
            actor=admin_user,
            target=created,
            metadata={
                "allowed_sources": list(created.allowed_sources),
                "is_active": created.is_active,
                "display_name": created.display_name,
                "work_no": created.work_no,
                "org_unit_id": created.org_unit_id,
                "menu_role_ids": list(created.menu_role_ids),
            },
        )
        return {"user": _serialize_user(created)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.patch("/auth/users/{user_id}")
def update_user_profile(user_id: int, payload: UserProfileUpdateRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.update_user_profile(
            target_user_id=user_id,
            username=payload.username,
            display_name=payload.display_name,
            work_no=payload.work_no,
            org_unit_id=payload.org_unit_id,
            menu_role_ids=payload.menu_role_ids,
        )
        _record_auth_audit(
            auth_repository,
            action="update_user_profile",
            actor=admin_user,
            target=updated,
            metadata={
                "display_name": updated.display_name,
                "work_no": updated.work_no,
                "org_unit_id": updated.org_unit_id,
                "menu_role_ids": list(updated.menu_role_ids),
            },
        )
        return {"user": _serialize_user(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.patch("/auth/users/{user_id}/access")
def update_user_access(user_id: int, payload: UserAccessUpdateRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        allowed_sources = _validate_allowed_sources(payload.allowed_sources)
        updated = auth_service.update_user_access(
            target_user_id=user_id,
            role=payload.role,
            allowed_sources=allowed_sources,
            is_active=payload.is_active,
            menu_role_ids=payload.menu_role_ids,
        )
        _record_auth_audit(
            auth_repository,
            action="update_user_access",
            actor=admin_user,
            target=updated,
            metadata={
                "role": payload.role,
                "allowed_sources": allowed_sources,
                "is_active": payload.is_active,
                "menu_role_ids": payload.menu_role_ids,
            },
        )
        return {"user": _serialize_user(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/auth/users/{user_id}/reset-password")
def reset_user_password(user_id: int, payload: ResetPasswordRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        updated = auth_service.reset_password(target_user_id=user_id, new_password=payload.new_password)
        _record_auth_audit(auth_repository, action="reset_password", actor=admin_user, target=updated)
        return {"password_reset": True, "user": _serialize_user(updated)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.delete("/auth/users/{user_id}")
def delete_user(user_id: int, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        deleted = auth_service.delete_user(target_user_id=user_id, acting_user_id=admin_user.id)
        _record_auth_audit(auth_repository, action="delete_user", actor=admin_user, target=deleted)
        return {"deleted": True, "user": _serialize_user(deleted)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/sessions")
def create_session(request: Request, payload: dict | None = None) -> dict:
    from ragpro.conversation import ConversationService

    _require_authenticated_user(request)
    requested = (payload or {}).get("session_id") if payload else None
    session_id = ConversationService.get_or_create_session_id(requested)
    return {"session_id": session_id}


@app.get("/sessions")
def list_sessions(request: Request) -> dict:
    user = _require_authenticated_user(request)
    repository = None
    try:
        repository = _create_conversation_repository()
        service = _conversation_service_from_repository(repository)
        sessions = _conversation_list_sessions(
            service,
            user_id=user.id,
            include_unowned=user.role == "admin",
        )
        return {"sessions": sessions, "session_count": len(sessions)}
    except Exception as exc:
        logger.exception("Session list endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Session list unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()


@app.get("/sources")
def get_sources(request: Request) -> dict:
    user = _require_authenticated_user(request)
    return {"sources": _available_sources_for_user(user)}


@app.post("/sources")
def register_source(payload: SourceRegistrationRequest, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    source = _validate_source_filter(payload.source)
    if source is None:
        raise HTTPException(status_code=400, detail="source is required.")
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        allowed_sources = _validate_allowed_sources([*admin_user.allowed_sources, source])
        updated = auth_service.update_user_access(
            target_user_id=admin_user.id,
            role=admin_user.role,
            allowed_sources=allowed_sources,
        )
        _record_auth_audit(
            auth_repository,
            action="update_user_access",
            actor=admin_user,
            target=updated,
            metadata={"registered_source": source, "allowed_sources": allowed_sources},
        )
        return {
            "source": source,
            "sources": _available_sources_for_user(updated, auth_repository=auth_repository),
            "user": _serialize_user(updated),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.get("/sessions/{session_id}/history")
def get_session_history(session_id: str, request: Request) -> dict:
    user = _require_authenticated_user(request)
    repository = None
    try:
        repository = _create_conversation_repository()
        service = _conversation_service_from_repository(repository)
        history = _conversation_get_history(
            service,
            session_id,
            user_id=user.id,
            include_unowned=user.role == "admin",
        )
        return {
            "session_id": session_id,
            "history": history,
            "history_count": len(history),
        }
    except Exception as exc:
        logger.exception("Session history endpoint failed.")
        raise HTTPException(status_code=503, detail=f"History service unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()


@app.delete("/sessions/{session_id}/history")
def clear_session_history(session_id: str, request: Request) -> dict:
    user = _require_authenticated_user(request)
    repository = None
    try:
        repository = _create_conversation_repository()
        service = _conversation_service_from_repository(repository)
        _conversation_clear_history(
            service,
            session_id,
            user_id=user.id,
            include_unowned=user.role == "admin",
        )
        return {"session_id": session_id, "cleared": True}
    except Exception as exc:
        logger.exception("Clear session history endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Clear history unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()


@app.post("/faq/query")
def faq_query(payload: QueryRequest, request: Request) -> dict:
    _require_admin_user(request)
    repository = None
    try:
        repository, service = _create_faq_components()
        result = service.search(payload.query, threshold=payload.threshold)
        return {
            "matched": result.matched,
            "answer": result.answer,
            "score": result.score,
            "matched_question": result.matched_question,
            "route": "faq_match",
        }
    except Exception as exc:
        logger.exception("FAQ query endpoint failed.")
        raise HTTPException(status_code=503, detail=f"FAQ service unavailable: {exc}") from exc
    finally:
        if repository is not None:
            repository.close()


_UPLOAD_STREAM_CHUNK_BYTES = 1024 * 1024


def _upload_job_payload(job: dict | None) -> dict | None:
    if job is None:
        return None
    payload = dict(job)
    payload["poll_url"] = f"/documents/upload-jobs/{payload['job_id']}"
    return payload


def _pending_upload_root() -> Path:
    return settings.upload_dir / "_pending_jobs"


def _resolve_staged_upload_path(staging_dir: Path, filename: str) -> Path:
    base = Path(filename)
    stem = base.stem[:120] or "upload"
    suffix = base.suffix
    candidate = staging_dir / f"{stem}{suffix}"
    index = 1
    while candidate.exists():
        candidate = staging_dir / f"{stem}_{index}{suffix}"
        index += 1
    return candidate


def _cleanup_directory(path: Path | None) -> None:
    if path is None or not path.exists():
        return
    for child in sorted(path.rglob("*"), reverse=True):
        if child.is_file():
            child.unlink(missing_ok=True)
        elif child.is_dir():
            child.rmdir()
    path.rmdir()


async def _stage_uploaded_file(item: UploadFile, staging_dir: Path):
    from ragpro.ingestion import DocumentUploadError, IncomingDocument
    from ragpro.ingestion.upload_service import ALLOWED_UPLOAD_EXTENSIONS, DocumentUploadService

    original_name = DocumentUploadService._sanitize_filename(item.filename or "")
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        raise DocumentUploadError(f"Unsupported file type: {suffix or '[no extension]'}")

    target_path = _resolve_staged_upload_path(staging_dir, original_name)
    size_bytes = 0
    try:
        with target_path.open("wb") as handle:
            while True:
                chunk = await item.read(_UPLOAD_STREAM_CHUNK_BYTES)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > settings.max_upload_file_size_bytes:
                    raise DocumentUploadError(
                        f"File too large: {original_name} exceeds {settings.max_upload_file_size_bytes} bytes"
                    )
                handle.write(chunk)
    except Exception:
        target_path.unlink(missing_ok=True)
        raise

    if size_bytes <= 0:
        target_path.unlink(missing_ok=True)
        raise DocumentUploadError(f"Uploaded file is empty: {original_name}")

    return IncomingDocument(
        filename=original_name,
        content_type=item.content_type,
        path=target_path,
    )


async def _stage_uploaded_files(files: list[UploadFile]) -> list:
    staging_dir = _pending_upload_root() / uuid4().hex
    staging_dir.mkdir(parents=True, exist_ok=True)
    staged_files = []
    try:
        for item in files:
            staged_files.append(await _stage_uploaded_file(item, staging_dir))
        return staged_files
    except Exception:
        _cleanup_directory(staging_dir)
        raise


def _submit_upload_job(*, source: str, files: list, replace_source: bool, uploaded_by: dict | None = None) -> dict:
    job = _upload_job_registry.create(
        source=source,
        replace_source=replace_source,
        file_count=len(files),
    )
    job_id = job["job_id"]
    staging_dir = Path(files[0].path).parent if files and getattr(files[0], "path", None) else None
    _upload_job_executor.submit(
        _run_upload_job,
        job_id,
        source,
        files,
        replace_source,
        uploaded_by,
        staging_dir,
    )
    return _upload_job_payload(job)


def _run_upload_job(
    job_id: str,
    source: str,
    files: list,
    replace_source: bool,
    uploaded_by: dict | None,
    staging_dir: Path | None,
) -> None:
    from ragpro.ingestion import DocumentUploadError

    try:
        _upload_job_registry.mark_running(
            job_id,
            stage="process",
            progress=45,
            message="正在解析、切块并写入向量库...",
        )
        service = _build_document_upload_service()
        result = service.upload_documents(
            source=source,
            files=files,
            replace_source=replace_source,
            uploaded_by=uploaded_by,
        )
        _upload_job_registry.mark_succeeded(job_id, result)
    except DocumentUploadError as exc:
        _upload_job_registry.mark_failed(job_id, str(exc))
    except ValueError as exc:
        _upload_job_registry.mark_failed(job_id, str(exc))
    except Exception as exc:
        logger.exception("Document upload job failed.")
        _upload_job_registry.mark_failed(job_id, f"Document upload unavailable: {exc}")
    finally:
        _cleanup_directory(staging_dir)


def _get_upload_job(job_id: str) -> dict | None:
    return _upload_job_payload(_upload_job_registry.get(job_id))


def _batch_upload_message(
    status: str,
    *,
    job_count: int,
    completed_count: int,
    failed_count: int,
    file_count: int,
) -> str:
    file_label = f"{file_count} 个文件" if file_count else "文件"
    if status == "succeeded":
        return f"入库完成：{file_label}已写入检索链路。"
    if status == "failed":
        return f"入库有失败项：{file_label}中有 {failed_count}/{job_count} 个任务失败。"
    if status == "running":
        return f"入库正在处理：{file_label}，{completed_count}/{job_count} 个任务已完成。"
    return f"已接收 {file_label}，等待入库。"


def _build_batch_upload_payload(batch: dict, jobs: list[dict]) -> dict:
    job_count = len(jobs)
    completed_count = sum(1 for job in jobs if job.get("status") == "succeeded")
    failed_count = sum(1 for job in jobs if job.get("status") == "failed")
    running_count = sum(1 for job in jobs if job.get("status") == "running")
    file_count = sum(
        int((job.get("result") or {}).get("file_count") or job.get("file_count") or 0)
        for job in jobs
    )
    if failed_count:
        status = "failed"
    elif job_count and completed_count == job_count:
        status = "succeeded"
    elif running_count or completed_count:
        status = "running"
    else:
        status = "queued"
    progress = 0
    if job_count:
        progress = round(
            sum(max(0, min(100, int(job.get("progress") or 0))) for job in jobs) / job_count
        )
    batch_id = batch["batch_id"]
    return {
        "batch_id": batch_id,
        "status": status,
        "progress": progress,
        "message": _batch_upload_message(
            status,
            job_count=job_count,
            completed_count=completed_count,
            failed_count=failed_count,
            file_count=file_count,
        ),
        "job_count": job_count,
        "file_count": file_count,
        "completed_count": completed_count,
        "failed_count": failed_count,
        "jobs": jobs,
        "created_at": batch.get("created_at"),
        "updated_at": batch.get("updated_at"),
        "poll_url": f"/documents/batch-upload-jobs/{batch_id}",
    }


def _batch_upload_payload(batch: dict | None, jobs: list[dict] | None = None) -> dict | None:
    if batch is None:
        return None
    resolved_jobs = jobs
    if resolved_jobs is None:
        resolved_jobs = []
        for item in batch.get("items", []):
            job = _get_upload_job(str(item.get("job_id", "")))
            if job is None:
                job = {
                    **item,
                    "status": "unknown",
                    "stage": "unknown",
                    "progress": 0,
                    "message": "入库任务状态暂不可用。",
                }
            else:
                job = {**item, **job}
            resolved_jobs.append(job)
    return _build_batch_upload_payload(batch, resolved_jobs)


def _create_batch_upload_job(jobs: list[dict]) -> dict:
    items = [
        {
            "job_id": job["job_id"],
            "source": job.get("source"),
            "replace_source": bool(job.get("replace_source", False)),
            "file_count": int(job.get("file_count") or 0),
        }
        for job in jobs
    ]
    batch = _upload_batch_registry.create(items=items)
    return _batch_upload_payload(batch, jobs)


def _get_batch_upload_job(batch_id: str) -> dict | None:
    return _batch_upload_payload(_upload_batch_registry.get(batch_id))


def _parse_batch_upload_bool(value, *, item_index: int) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off", ""}:
            return False
    raise HTTPException(status_code=400, detail=f"第 {item_index} 个批量项 replace_source 格式不正确。")


def _parse_batch_upload_items(items_json: str, *, uploaded_file_count: int) -> list[dict]:
    try:
        raw_items = json.loads(items_json)
    except (TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="items_json 必须是合法的 JSON 数组。") from exc

    if not isinstance(raw_items, list) or not raw_items:
        raise HTTPException(status_code=400, detail="请至少配置一个批量入库项。")
    if len(raw_items) > settings.batch_upload_max_items:
        raise HTTPException(
            status_code=400,
            detail=f"单次最多配置 {settings.batch_upload_max_items} 个批量入库项。",
        )

    parsed: list[dict] = []
    total_file_count = 0
    for index, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail=f"第 {index} 个批量项格式不正确。")
        source = _validate_source_filter(str(item.get("source") or ""))
        if source is None:
            raise HTTPException(status_code=400, detail=f"第 {index} 个批量项缺少目标来源。")
        file_count = item.get("file_count")
        if type(file_count) is not int or file_count <= 0:
            raise HTTPException(status_code=400, detail=f"第 {index} 个批量项文件数量不正确。")
        replace_source = _parse_batch_upload_bool(item.get("replace_source", False), item_index=index)
        total_file_count += file_count
        parsed.append(
            {
                "source": source,
                "replace_source": replace_source,
                "file_count": file_count,
            }
        )

    if total_file_count > settings.batch_upload_max_files:
        raise HTTPException(
            status_code=400,
            detail=f"单次批量入库最多上传 {settings.batch_upload_max_files} 个文件。",
        )
    if total_file_count != uploaded_file_count:
        raise HTTPException(status_code=400, detail="批量入库文件数量与配置不一致。")
    return parsed


def _cleanup_staged_upload_groups(staged_groups: list[list]) -> None:
    cleaned: set[Path] = set()
    for group in staged_groups:
        if not group:
            continue
        staged_path = getattr(group[0], "path", None)
        if staged_path is None:
            continue
        directory = Path(staged_path).parent
        if directory in cleaned:
            continue
        _cleanup_directory(directory)
        cleaned.add(directory)


@app.post("/documents/upload")
async def upload_documents(
    request: Request,
    response: Response,
    source: str = Form(...),
    replace_source: bool = Form(False),
    files: list[UploadFile] = File(...),
) -> dict:
    admin_user = _require_admin_user(request)
    source = _validate_source_filter(source)
    if source is None:
        raise HTTPException(status_code=400, detail="source is required.")
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    from ragpro.ingestion import DocumentUploadError, IncomingDocument

    try:
        staged_files: list[IncomingDocument] = await _stage_uploaded_files(files)
        response.status_code = 202
        return _submit_upload_job(
            source=source,
            files=staged_files,
            replace_source=replace_source,
            uploaded_by=_document_actor_payload(admin_user),
        )
    except DocumentUploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document upload endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Document upload unavailable: {exc}") from exc
    finally:
        for item in files:
            await item.close()


@app.post("/documents/batch-upload")
async def batch_upload_documents(
    request: Request,
    response: Response,
    items_json: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict:
    admin_user = _require_admin_user(request)
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    from ragpro.ingestion import DocumentUploadError, IncomingDocument

    staged_groups: list[list[IncomingDocument]] = []
    submitted_group_count = 0
    try:
        items = _parse_batch_upload_items(items_json, uploaded_file_count=len(files))
        file_offset = 0
        for item in items:
            file_count = item["file_count"]
            staged_groups.append(await _stage_uploaded_files(files[file_offset : file_offset + file_count]))
            file_offset += file_count

        jobs = []
        for item, staged_files in zip(items, staged_groups):
            jobs.append(
                _submit_upload_job(
                    source=item["source"],
                    files=staged_files,
                    replace_source=item["replace_source"],
                    uploaded_by=_document_actor_payload(admin_user),
                )
            )
            submitted_group_count += 1

        response.status_code = 202
        return _create_batch_upload_job(jobs)
    except DocumentUploadError as exc:
        _cleanup_staged_upload_groups(staged_groups[submitted_group_count:])
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        _cleanup_staged_upload_groups(staged_groups[submitted_group_count:])
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        _cleanup_staged_upload_groups(staged_groups[submitted_group_count:])
        raise
    except Exception as exc:
        _cleanup_staged_upload_groups(staged_groups[submitted_group_count:])
        logger.exception("Batch document upload endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Batch document upload unavailable: {exc}") from exc
    finally:
        for item in files:
            await item.close()


@app.get("/documents/upload-jobs/{job_id}")
def get_upload_job(job_id: str, request: Request) -> dict:
    _require_admin_user(request)
    job = _get_upload_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Upload job not found.")
    return job


@app.get("/documents/batch-upload-jobs/{batch_id}")
def get_batch_upload_job(batch_id: str, request: Request) -> dict:
    _require_admin_user(request)
    batch = _get_batch_upload_job(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch upload job not found.")
    return batch


@app.get("/documents/files")
def list_document_files(request: Request, source: str | None = None) -> dict:
    _require_admin_user(request)
    try:
        normalized_source = _validate_source_filter(source) if source else None
        service = _build_document_file_service()
        files = [_serialize_document_file(record) for record in service.list_files(source=normalized_source)]
        return {
            "files": files,
            "count": len(files),
            "source": normalized_source,
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Document file list endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Document file list unavailable: {exc}") from exc


@app.get("/documents/files/{file_id}/download")
def download_document_file(file_id: str, request: Request):
    _require_admin_user(request)
    try:
        return _document_file_response(file_id, disposition="attachment")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document file download endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Document file download unavailable: {exc}") from exc


@app.get("/documents/files/{file_id}/content")
def view_document_file_content(file_id: str, request: Request):
    _require_admin_user(request)
    try:
        return _document_file_response(file_id, disposition="inline")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document file view endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Document file view unavailable: {exc}") from exc


@app.delete("/documents/files/{file_id}")
def delete_document_file(file_id: str, request: Request) -> dict:
    admin_user = _require_admin_user(request)
    auth_repository = None
    try:
        from ragpro.ingestion import DocumentFileNotFound

        service = _build_document_file_service()
        deleted = service.delete_file(file_id)
        auth_repository = _create_auth_repository()
        _record_auth_audit(
            auth_repository,
            action="delete_document_file",
            actor=admin_user,
            metadata={
                "file_id": deleted.get("file_id"),
                "source": deleted.get("source"),
                "filename": deleted.get("filename"),
                "deleted_vectors": deleted.get("deleted_vectors"),
                "deleted_file": deleted.get("deleted_file"),
            },
        )
        return {"deleted": True, "file": deleted}
    except DocumentFileNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document file delete endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Document file delete unavailable: {exc}") from exc
    finally:
        if auth_repository is not None:
            auth_repository.close()


@app.post("/reindex")
def reindex_documents(payload: ReindexRequest, request: Request) -> dict:
    _require_admin_user(request)
    try:
        source = _validate_source_filter(payload.source)
        if source is None:
            raise HTTPException(status_code=400, detail="source is required.")
        directory = _resolve_reindex_directory(source, payload.directory)
        result = _run_reindex_job(directory, append=payload.append)
        return {
            "requested_source": source,
            "requested_directory": str(directory),
            **result,
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Reindex endpoint failed.")
        raise HTTPException(status_code=503, detail=f"Reindex unavailable: {exc}") from exc


@app.post("/query")
def unified_query(payload: QueryRequest, request: Request):
    user = _require_authenticated_user(request)
    faq_repository = None
    conversation_repository = None
    try:
        query_scope = _resolve_query_source_scope_for_user(
            query=payload.query,
            requested_source_filter=payload.source_filter,
            user=user,
        )

        faq_repository, faq_service = _create_faq_components()
        conversation_repository = _create_conversation_repository()

        conversation_service = _conversation_service_from_repository(conversation_repository)
        router = _build_router(faq_service)

        session_id = conversation_service.get_or_create_session_id(payload.session_id)
        history = (
            payload.history
            if payload.history is not None
            else _conversation_get_history(
                conversation_service,
                session_id,
                user_id=user.id,
                include_unowned=user.role == "admin",
            )
        )

        if payload.stream:
            response = StreamingResponse(
                _stream_query_response(
                    payload=payload,
                    session_id=session_id,
                    history=history,
                    router=router,
                    conversation_service=conversation_service,
                    faq_repository=faq_repository,
                    conversation_repository=conversation_repository,
                    user_id=user.id,
                    query_scope=query_scope,
                ),
                media_type="text/event-stream",
            )
            faq_repository = None
            conversation_repository = None
            return response

        result = router.route(
            payload.query,
            threshold=payload.threshold,
            source_filter=query_scope.source_filter,
            allowed_sources=query_scope.allowed_sources,
            history=history,
        )
        updated_history = history
        if result.get("answer"):
            updated_history = _conversation_save_turn(
                conversation_service,
                session_id,
                payload.query,
                result["answer"],
                user_id=user.id,
            )

        return {
            "session_id": session_id,
            "history_count": len(updated_history),
            **result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unified query endpoint failed.")
        raise HTTPException(status_code=503, detail="问答服务暂时不可用，请稍后重试。") from exc
    finally:
        if faq_repository is not None:
            faq_repository.close()
        if conversation_repository is not None:
            conversation_repository.close()


def _stream_query_response(
    *,
    payload: QueryRequest,
    session_id: str,
    history: list[dict],
    router: UnifiedQueryRouter,
    conversation_service,
    faq_repository,
    conversation_repository,
    user_id: int,
    query_scope,
):
    try:
        metadata, stream = router.stream_route(
            payload.query,
            threshold=payload.threshold,
            source_filter=query_scope.source_filter,
            allowed_sources=query_scope.allowed_sources,
            history=history,
        )
        yield _sse_message(
            {
                "event": "start",
                "session_id": session_id,
                "history_count": len(history),
                **metadata,
            }
        )

        answer_parts: list[str] = []
        for token in stream:
            if not token:
                continue
            answer_parts.append(token)
            yield _sse_message(
                {
                    "event": "chunk",
                    "session_id": session_id,
                    "token": token,
                }
            )

        answer = "".join(answer_parts)
        updated_history = history
        if answer:
            updated_history = _conversation_save_turn(
                conversation_service,
                session_id,
                payload.query,
                answer,
                user_id=user_id,
            )

        yield _sse_message(
            {
                "event": "end",
                "session_id": session_id,
                "history_count": len(updated_history),
                "answer": answer,
                **metadata,
            }
        )
    except Exception as exc:
        logger.exception("Streaming query endpoint failed.")
        yield _sse_message(
            {
                "event": "error",
                "session_id": session_id,
                "error": "本次问答暂时没有完成，请稍后重试。",
                "is_complete": True,
            }
        )
    finally:
        faq_repository.close()
        conversation_repository.close()


def _sse_message(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
