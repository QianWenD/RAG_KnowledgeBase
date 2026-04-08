from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from ragpro.config import get_logger, get_settings
from ragpro.faq_match import FAQMySQLRepository

logger = get_logger("ragpro.worker.faq_import")


def run_import(csv_path: str | Path) -> dict:
    repository = FAQMySQLRepository()
    try:
        repository.ensure_table()
        inserted = repository.import_csv(str(csv_path))
        return {
            "csv_path": str(csv_path),
            "inserted": inserted,
            "status": "imported",
        }
    finally:
        repository.close()


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Import FAQ CSV data into MySQL.")
    parser.add_argument(
        "--csv",
        type=str,
        default=str(settings.data_dir / "JP学科知识问答.csv"),
        help="CSV file path for FAQ import.",
    )
    args = parser.parse_args()

    result = run_import(args.csv)
    logger.info("FAQ import completed: %s", result)
    print(result)


if __name__ == "__main__":
    main()
