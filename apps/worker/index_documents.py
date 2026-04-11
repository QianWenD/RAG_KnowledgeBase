from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.config import get_logger, get_settings
from ragpro.ingestion import process_documents
from ragpro.ingestion.loaders import load_directory
from ragpro.retrieval import RetrievalService, VectorStore

logger = get_logger("ragpro.worker.index")


def run_index(directory: str | Path, *, replace_source: bool = True) -> dict:
    documents = process_documents(directory)
    retrieval_service = RetrievalService(vector_store=VectorStore())
    source = _detect_source(directory, documents)
    deleted = 0
    if replace_source and source:
        deleted = retrieval_service.delete_source(source)
    retrieval_service.add_documents(documents)
    return {
        "directory": str(directory),
        "document_chunks": len(documents),
        "source": source,
        "replaced_existing_source": replace_source,
        "deleted_before_index": deleted,
        "status": "indexed",
    }


def _detect_source(directory: str | Path, documents) -> str:
    if documents:
        return str(documents[0].metadata.get("source") or "unknown")
    loaded = load_directory(directory)
    if loaded:
        return str(loaded[0].metadata.get("source") or "unknown")
    return Path(directory).name.replace("_data", "")


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Index local documents into Milvus.")
    parser.add_argument(
        "--directory",
        type=str,
        default=str(settings.data_dir / "ai_data"),
        help="Directory containing source documents.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append into the existing source index instead of replacing the same source first.",
    )
    args = parser.parse_args()

    result = run_index(args.directory, replace_source=not args.append)
    logger.info("Index job completed: %s", result)
    print(result)


if __name__ == "__main__":
    main()
