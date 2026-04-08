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
from ragpro.retrieval import RetrievalService, VectorStore

logger = get_logger("ragpro.worker.index")


def run_index(directory: str | Path) -> dict:
    documents = process_documents(directory)
    retrieval_service = RetrievalService(vector_store=VectorStore())
    retrieval_service.add_documents(documents)
    return {
        "directory": str(directory),
        "document_chunks": len(documents),
        "status": "indexed",
    }


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Index local documents into Milvus.")
    parser.add_argument(
        "--directory",
        type=str,
        default=str(settings.data_dir / "ai_data"),
        help="Directory containing source documents.",
    )
    args = parser.parse_args()

    result = run_index(args.directory)
    logger.info("Index job completed: %s", result)
    print(result)


if __name__ == "__main__":
    main()
