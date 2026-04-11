from __future__ import annotations

import argparse
import json
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


def build_http_query_executor(base_url: str):
    root = base_url.rstrip("/")

    def execute(case: EvaluationCase) -> dict:
        payload = json.dumps(_build_payload(case), ensure_ascii=False).encode("utf-8")
        request = Request(
            url=f"{root}/query",
            data=payload,
            headers={"Content-Type": "application/json"},
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


def run_evaluation(
    dataset_path: str | Path,
    *,
    mode: str = "app",
    base_url: str = "http://127.0.0.1:8000",
) -> dict:
    dataset = load_dataset(dataset_path)
    if mode == "app":
        executor = build_app_query_executor()
    elif mode == "http":
        executor = build_http_query_executor(base_url)
    else:
        raise ValueError(f"Unsupported evaluation mode: {mode}")

    report = EvaluationRunner(executor).run(dataset.cases, dataset_name=dataset.name)
    return report.to_dict()


def _build_payload(case: EvaluationCase) -> dict:
    return {
        "query": case.query,
        "source_filter": case.source_filter,
        "history": list(case.history) if case.history else None,
        "stream": False,
    }


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
        "--output",
        type=str,
        default="",
        help="Optional JSON output path. Defaults to runtime/evaluation/<dataset>.report.json",
    )
    args = parser.parse_args()

    report = run_evaluation(args.dataset, mode=args.mode, base_url=args.base_url)
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


if __name__ == "__main__":
    main()
