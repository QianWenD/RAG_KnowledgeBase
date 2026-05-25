from __future__ import annotations

import argparse
from collections.abc import Iterator
from contextlib import contextmanager, nullcontext
from http.cookies import SimpleCookie
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ragpro.config import get_logger, get_settings
from ragpro.evaluation import EvaluationCase, EvaluationRunner, load_dataset

logger = get_logger("ragpro.worker.evaluation")


def build_app_query_executor():
    from fastapi.testclient import TestClient

    from apps.api.main import app

    client = TestClient(app)

    def execute(case: EvaluationCase) -> dict:
        response = client.post("/query", json=_build_payload(case))
        if response.status_code >= 400:
            raise RuntimeError(f"/query returned {response.status_code}: {response.text}")
        return response.json()

    return execute


def build_http_query_executor(
    base_url: str,
    *,
    username: str = "",
    password: str = "",
    use_login: bool = False,
):
    root = base_url.rstrip("/")
    cookie_header = _login_http_session(root, username=username, password=password) if use_login else ""

    def execute(case: EvaluationCase) -> dict:
        payload = json.dumps(_build_payload(case), ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if cookie_header:
            headers["Cookie"] = cookie_header
        request = Request(
            url=f"{root}/query",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"/query returned {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"HTTP evaluation request failed: {exc}") from exc

    return execute


def _login_http_session(root: str, *, username: str, password: str) -> str:
    if not username or not password:
        raise ValueError("HTTP evaluation login requires username and password.")

    payload = json.dumps({"username": username, "password": password}, ensure_ascii=False).encode("utf-8")
    request = Request(
        url=f"{root}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=120) as response:
            set_cookie_headers = response.headers.get_all("Set-Cookie", [])
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"/auth/login returned {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"HTTP evaluation login failed: {exc}") from exc

    cookies = SimpleCookie()
    for header in set_cookie_headers:
        cookies.load(header)
    if not cookies:
        raise RuntimeError("/auth/login did not return an authentication cookie.")
    return "; ".join(f"{cookie.key}={cookie.value}" for cookie in cookies.values())


def _build_app_evaluation_user():
    from apps.api.main import settings as api_settings
    from ragpro.auth.models import AuthenticatedUser

    return AuthenticatedUser(
        id=0,
        username="evaluation",
        role="admin",
        allowed_sources=tuple(api_settings.valid_sources),
        is_active=True,
        display_name="Evaluation Runner",
    )


@contextmanager
def _app_admin_auth_context() -> Iterator[None]:
    from apps.api import main as api_main

    original = api_main._require_authenticated_user
    evaluation_user = _build_app_evaluation_user()
    api_main._require_authenticated_user = lambda request: evaluation_user
    try:
        yield
    finally:
        api_main._require_authenticated_user = original


def run_evaluation(
    dataset_path: str | Path,
    *,
    mode: str = "app",
    base_url: str = "http://127.0.0.1:8000",
    auth_mode: str = "auto",
    username: str = "",
    password: str = "",
) -> dict:
    dataset = load_dataset(dataset_path)
    if mode == "app":
        if auth_mode == "http-login":
            raise ValueError("auth_mode=http-login is only supported when mode=http.")
        auth_context = _app_admin_auth_context() if auth_mode in {"auto", "app-admin"} else nullcontext()
        executor = build_app_query_executor()
    elif mode == "http":
        if auth_mode == "app-admin":
            raise ValueError("auth_mode=app-admin is only supported when mode=app.")
        use_login = auth_mode == "http-login" or (auth_mode == "auto" and bool(username and password))
        executor = build_http_query_executor(
            base_url,
            username=username,
            password=password,
            use_login=use_login,
        )
        auth_context = nullcontext()
    else:
        raise ValueError(f"Unsupported evaluation mode: {mode}")

    with auth_context:
        report = EvaluationRunner(executor).run(dataset.cases, dataset_name=dataset.name)
    return report.to_dict()


def _build_payload(case: EvaluationCase) -> dict:
    return {
        "query": case.query,
        "source_filter": case.source_filter,
        "history": list(case.history) if case.history else None,
        "stream": False,
    }


def _parse_pass_rate_threshold(value: str) -> float:
    try:
        threshold = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("fail-under must be a number between 0 and 1.") from exc
    if threshold < 0 or threshold > 1:
        raise argparse.ArgumentTypeError("fail-under must be between 0 and 1.")
    return threshold


def _enforce_fail_under(report: dict, *, fail_under: float | None) -> None:
    if fail_under is None:
        return
    pass_rate = float(report.get("summary", {}).get("pass_rate", 0.0))
    if pass_rate < fail_under:
        raise SystemExit(
            f"Evaluation pass rate {pass_rate:.4f} is below required threshold {fail_under:.4f}."
        )


def _resolve_default_dataset_path(data_dir: Path) -> Path:
    preferred = data_dir / "evaluation" / "phase_one_smoke.json"
    if preferred.exists():
        return preferred
    return data_dir / "rag_evaluate_data.json"


def _resolve_output_path(runtime_dir: Path, dataset_name: str) -> Path:
    safe_name = dataset_name.replace(" ", "_")
    return runtime_dir / "evaluation" / f"{safe_name}.report.json"


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Run offline evaluation cases against /query.")
    parser.add_argument(
        "--dataset",
        type=str,
        default=str(_resolve_default_dataset_path(settings.data_dir)),
        help="Evaluation dataset file path.",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=("app", "http"),
        default="app",
        help="Use the in-process FastAPI app or a running HTTP service.",
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="http://127.0.0.1:8000",
        help="Base URL when mode=http.",
    )
    parser.add_argument(
        "--auth-mode",
        type=str,
        choices=("auto", "none", "app-admin", "http-login"),
        default="auto",
        help=(
            "Authentication strategy. Default auto injects an in-process admin for mode=app "
            "and logs in for mode=http when credentials are supplied."
        ),
    )
    parser.add_argument(
        "--username",
        type=str,
        default=os.getenv("RAGPRO_EVAL_USERNAME", ""),
        help="Username for mode=http login. Defaults to RAGPRO_EVAL_USERNAME.",
    )
    parser.add_argument(
        "--password",
        type=str,
        default=os.getenv("RAGPRO_EVAL_PASSWORD", ""),
        help="Password for mode=http login. Defaults to RAGPRO_EVAL_PASSWORD.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="",
        help="Optional JSON output path. Defaults to runtime/evaluation/<dataset>.report.json",
    )
    parser.add_argument(
        "--fail-under",
        type=_parse_pass_rate_threshold,
        default=None,
        help="Exit with a non-zero status when the evaluation pass rate is below this threshold.",
    )
    args = parser.parse_args()

    report = run_evaluation(
        args.dataset,
        mode=args.mode,
        base_url=args.base_url,
        auth_mode=args.auth_mode,
        username=args.username,
        password=args.password,
    )
    output_path = Path(args.output) if args.output else _resolve_output_path(
        settings.runtime_dir,
        report["dataset_name"],
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Evaluation report written to %s", output_path)
    print(
        {
            "dataset_name": report["dataset_name"],
            "summary": report["summary"],
            "output_path": str(output_path),
        }
    )
    _enforce_fail_under(report, fail_under=args.fail_under)


if __name__ == "__main__":
    main()
