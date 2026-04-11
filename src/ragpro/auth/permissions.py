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


def filter_sources_for_user(
    valid_sources: tuple[str, ...] | list[str],
    user: AuthenticatedUser,
) -> list[str]:
    available = list(valid_sources)
    if user.is_admin:
        return available
    allowed = set(user.allowed_sources)
    return [source for source in available if source in allowed]


def resolve_effective_source_filter(
    *,
    query: str,
    requested_source_filter: str | None,
    user: AuthenticatedUser,
    classifier: LightweightIntentClassifier | None = None,
) -> str | None:
    if user.is_admin:
        return requested_source_filter

    if requested_source_filter:
        if requested_source_filter not in user.allowed_sources:
            raise QueryAccessError(
                code="source_forbidden",
                message=f"You do not have access to source '{requested_source_filter}'.",
                status_code=403,
            )
        return requested_source_filter

    decision = (classifier or LightweightIntentClassifier()).classify(query, source_filter=None)
    if decision.route.value == "general_llm":
        return None

    if not user.allowed_sources:
        raise QueryAccessError(
            code="no_sources_assigned",
            message="No knowledge sources have been assigned to this account yet.",
            status_code=403,
        )

    if len(user.allowed_sources) == 1:
        return user.allowed_sources[0]

    raise QueryAccessError(
        code="source_filter_required",
        message="Please choose a source_filter from the sources assigned to your account.",
        status_code=400,
    )
