from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

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

from ragpro.auth import QueryAccessError, filter_sources_for_user, resolve_effective_source_filter
from ragpro.config import get_logger, get_settings
from ragpro.runtime import run_healthcheck, run_preflight
from ragpro.routing import UnifiedQueryRouter

if TYPE_CHECKING:
    from ragpro.auth import AuditLogRecord, AuthenticatedUser
    from ragpro.conversation.repository import ConversationMySQLRepository

logger = get_logger("ragpro.api")
settings = get_settings()
app = FastAPI(title="RAGPro API", description="Formalized API entrypoint for the RAGPro project")
if WEB_ROOT.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_ROOT)), name="static")

AUDIT_ACTIONS = (
    "register",
    "login",
    "logout",
    "change_password",
    "admin_create_user",
    "update_user_access",
    "reset_password",
    "delete_user",
)
SENSITIVE_AUDIT_ACTIONS = (
    "reset_password",
    "delete_user",
    "change_password",
    "update_user_access",
)


def _call_local_llm(prompt: str) -> str:
    from ragpro.generation.llm import call_local_llm

    return call_local_llm(prompt)


def _stream_local_llm(prompt: str):
    from ragpro.generation.llm import stream_local_llm

    return stream_local_llm(prompt)


def _build_rag_service():
    from ragpro.generation.service import RAGGenerationService
    from ragpro.retrieval import RetrievalService, VectorStore

    retrieval_service = RetrievalService(vector_store=VectorStore())
    return RAGGenerationService(
        retrieval_service=retrieval_service,
        llm=_call_local_llm,
        llm_stream=_stream_local_llm,
    )


def _build_document_upload_service():
    from ragpro.ingestion import DocumentUploadService

    return DocumentUploadService()


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


def _validate_source_filter(source_filter: str | None) -> None:
    if source_filter and source_filter not in settings.valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_filter '{source_filter}'. Supported values: {settings.valid_sources}",
        )


def _validate_allowed_sources(values: list[str] | tuple[str, ...] | None) -> list[str] | None:
    if values is None:
        return None
    normalized = [str(value).strip() for value in values if str(value).strip()]
    invalid = [value for value in normalized if value not in settings.valid_sources]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sources {invalid}. Supported values: {settings.valid_sources}",
        )
    return normalized


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


def _conversation_get_history(service, session_id: str, *, user_id: int) -> list[dict]:
    try:
        return service.get_history(session_id, user_id=user_id)
    except TypeError:
        return service.get_history(session_id)


def _conversation_save_turn(service, session_id: str, question: str, answer: str, *, user_id: int) -> list[dict]:
    try:
        return service.save_turn(session_id, question, answer, user_id=user_id)
    except TypeError:
        return service.save_turn(session_id, question, answer)


def _conversation_clear_history(service, session_id: str, *, user_id: int) -> None:
    try:
        service.clear_history(session_id, user_id=user_id)
    except TypeError:
        service.clear_history(session_id)


def _serialize_user(user: AuthenticatedUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "allowed_sources": list(user.allowed_sources),
        "is_active": user.is_active,
        "created_at": user.created_at,
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
        raise HTTPException(status_code=403, detail="Administrator permission required.")
    return user


def _resolve_query_source_filter_for_user(
    *,
    query: str,
    requested_source_filter: str | None,
    user: AuthenticatedUser,
) -> str | None:
    _validate_source_filter(requested_source_filter)
    try:
        return resolve_effective_source_filter(
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


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="user", description="Role to assign: admin or user")
    allowed_sources: list[str] | None = Field(default=None, description="Allowed knowledge sources")
    is_active: bool = Field(default=True, description="Whether the account is active")


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


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
def list_users(request: Request) -> dict:
    _require_admin_user(request)
    auth_repository = None
    try:
        auth_repository = _create_auth_repository()
        auth_service = _auth_service_from_repository(auth_repository)
        return {"users": [_serialize_user(user) for user in auth_service.list_users()]}
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
        )
        _record_auth_audit(
            auth_repository,
            action="admin_create_user",
            actor=admin_user,
            target=created,
            metadata={"allowed_sources": list(created.allowed_sources), "is_active": created.is_active},
        )
        return {"user": _serialize_user(created)}
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


@app.get("/sources")
def get_sources(request: Request) -> dict:
    user = _require_authenticated_user(request)
    return {"sources": filter_sources_for_user(settings.valid_sources, user)}


@app.get("/sessions/{session_id}/history")
def get_session_history(session_id: str, request: Request) -> dict:
    user = _require_authenticated_user(request)
    repository = None
    try:
        repository = _create_conversation_repository()
        service = _conversation_service_from_repository(repository)
        history = _conversation_get_history(service, session_id, user_id=user.id)
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
        _conversation_clear_history(service, session_id, user_id=user.id)
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


@app.post("/documents/upload")
async def upload_documents(
    request: Request,
    source: str = Form(...),
    replace_source: bool = Form(False),
    files: list[UploadFile] = File(...),
) -> dict:
    _require_admin_user(request)
    _validate_source_filter(source)
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    from ragpro.ingestion import DocumentUploadError, IncomingDocument

    incoming_files: list[IncomingDocument] = []
    try:
        for item in files:
            content = await item.read()
            incoming_files.append(
                IncomingDocument(
                    filename=item.filename or "",
                    content=content,
                    content_type=item.content_type,
                )
            )
        service = _build_document_upload_service()
        return service.upload_documents(
            source=source,
            files=incoming_files,
            replace_source=replace_source,
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


@app.post("/reindex")
def reindex_documents(payload: ReindexRequest, request: Request) -> dict:
    _require_admin_user(request)
    try:
        _validate_source_filter(payload.source)
        directory = _resolve_reindex_directory(payload.source, payload.directory)
        result = _run_reindex_job(directory, append=payload.append)
        return {
            "requested_source": payload.source,
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
        effective_source_filter = _resolve_query_source_filter_for_user(
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
            else _conversation_get_history(conversation_service, session_id, user_id=user.id)
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
                    effective_source_filter=effective_source_filter,
                ),
                media_type="text/event-stream",
            )
            faq_repository = None
            conversation_repository = None
            return response

        result = router.route(
            payload.query,
            threshold=payload.threshold,
            source_filter=effective_source_filter,
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
        raise HTTPException(status_code=503, detail=f"Unified query unavailable: {exc}") from exc
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
    effective_source_filter: str | None,
):
    try:
        metadata, stream = router.stream_route(
            payload.query,
            threshold=payload.threshold,
            source_filter=effective_source_filter,
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
                "error": str(exc),
                "is_complete": True,
            }
        )
    finally:
        faq_repository.close()
        conversation_repository.close()


def _sse_message(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
