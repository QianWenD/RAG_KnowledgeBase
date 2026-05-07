from __future__ import annotations

from dataclasses import dataclass

from ragpro.routing import LightweightIntentClassifier

from .models import AuthenticatedUser


@dataclass(frozen=True)
class QueryAccessError(Exception):
    code: str
    message: str
    status_code: int

    def __str__(self) -> str:
        return self.message


@dataclass(frozen=True)
class QuerySourceScope:
    source_filter: str | None
    allowed_sources: tuple[str, ...] | None
    auto_scoped: bool = False


def filter_sources_for_user(
    valid_sources: tuple[str, ...] | list[str],
    user: AuthenticatedUser,
) -> list[str]:
    available = list(dict.fromkeys([*valid_sources, *user.allowed_sources]))
    if user.is_admin:
        return available
    allowed = set(user.allowed_sources)
    return [source for source in available if source in allowed]


def resolve_query_source_scope(
    *,
    query: str,
    requested_source_filter: str | None,
    user: AuthenticatedUser,
    classifier: LightweightIntentClassifier | None = None,
) -> QuerySourceScope:
    if user.is_admin:
        return QuerySourceScope(
            source_filter=requested_source_filter,
            allowed_sources=None,
            auto_scoped=False,
        )

    if requested_source_filter:
        if requested_source_filter not in user.allowed_sources:
            raise QueryAccessError(
                code="source_forbidden",
                message=f"当前账号无权访问数据源“{requested_source_filter}”。",
                status_code=403,
            )
        return QuerySourceScope(
            source_filter=requested_source_filter,
            allowed_sources=(requested_source_filter,),
            auto_scoped=False,
        )

    decision = (classifier or LightweightIntentClassifier()).classify(query, source_filter=None)
    if decision.route.value == "general_llm":
        return QuerySourceScope(source_filter=None, allowed_sources=None, auto_scoped=False)

    if not user.allowed_sources:
        raise QueryAccessError(
            code="no_sources_assigned",
            message="当前账号尚未分配可用数据源，请联系管理员配置后再试。",
            status_code=403,
        )

    if len(user.allowed_sources) == 1:
        return QuerySourceScope(
            source_filter=user.allowed_sources[0],
            allowed_sources=user.allowed_sources,
            auto_scoped=True,
        )

    return QuerySourceScope(
        source_filter=None,
        allowed_sources=user.allowed_sources,
        auto_scoped=True,
    )


def resolve_effective_source_filter(
    *,
    query: str,
    requested_source_filter: str | None,
    user: AuthenticatedUser,
    classifier: LightweightIntentClassifier | None = None,
) -> str | None:
    return resolve_query_source_scope(
        query=query,
        requested_source_filter=requested_source_filter,
        user=user,
        classifier=classifier,
    ).source_filter
