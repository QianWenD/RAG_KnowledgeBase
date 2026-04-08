from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import os


@dataclass(frozen=True)
class AppSettings:
    project_root: Path
    mysql_host: str = "localhost"
    mysql_user: str = "root"
    mysql_password: str = "123456"
    mysql_database: str = "subjects_kg"
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = "1234"
    redis_db: int = 0
    milvus_host: str = "localhost"
    milvus_port: str = "19530"
    milvus_database: str = "itcast"
    milvus_collection: str = "edurag_final"
    llm_model: str = "qwen2.5:7b"
    customer_service_phone: str = ""
    parent_chunk_size: int = 1200
    child_chunk_size: int = 300
    chunk_overlap: int = 50
    retrieval_k: int = 5
    candidate_m: int = 2
    valid_sources: tuple[str, ...] = ("ai", "java", "test", "ops", "bigdata")
    models_dir_name: str = "packages/models"
    data_dir_name: str = "packages/data"
    log_file: str = "logs/app.log"

    @property
    def log_path(self) -> Path:
        return self.project_root / self.log_file

    @property
    def models_dir(self) -> Path:
        return self.project_root / self.models_dir_name

    @property
    def data_dir(self) -> Path:
        return self.project_root / self.data_dir_name


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    project_root = Path(__file__).resolve().parents[3]
    return AppSettings(
        project_root=project_root,
        mysql_host=os.getenv("RAGPRO_MYSQL_HOST", "localhost"),
        mysql_user=os.getenv("RAGPRO_MYSQL_USER", "root"),
        mysql_password=os.getenv("RAGPRO_MYSQL_PASSWORD", "123456"),
        mysql_database=os.getenv("RAGPRO_MYSQL_DATABASE", "subjects_kg"),
        redis_host=os.getenv("RAGPRO_REDIS_HOST", "localhost"),
        redis_port=int(os.getenv("RAGPRO_REDIS_PORT", "6379")),
        redis_password=os.getenv("RAGPRO_REDIS_PASSWORD", "1234"),
        redis_db=int(os.getenv("RAGPRO_REDIS_DB", "0")),
        milvus_host=os.getenv("RAGPRO_MILVUS_HOST", "localhost"),
        milvus_port=os.getenv("RAGPRO_MILVUS_PORT", "19530"),
        milvus_database=os.getenv("RAGPRO_MILVUS_DATABASE", "itcast"),
        milvus_collection=os.getenv("RAGPRO_MILVUS_COLLECTION", "edurag_final"),
        llm_model=os.getenv("RAGPRO_LLM_MODEL", "qwen2.5:7b"),
        customer_service_phone=os.getenv("RAGPRO_CUSTOMER_SERVICE_PHONE", ""),
        parent_chunk_size=int(os.getenv("RAGPRO_PARENT_CHUNK_SIZE", "1200")),
        child_chunk_size=int(os.getenv("RAGPRO_CHILD_CHUNK_SIZE", "300")),
        chunk_overlap=int(os.getenv("RAGPRO_CHUNK_OVERLAP", "50")),
        retrieval_k=int(os.getenv("RAGPRO_RETRIEVAL_K", "5")),
        candidate_m=int(os.getenv("RAGPRO_CANDIDATE_M", "2")),
        valid_sources=tuple(
            s.strip()
            for s in os.getenv(
                "RAGPRO_VALID_SOURCES",
                "ai,java,test,ops,bigdata",
            ).split(",")
            if s.strip()
        ),
        models_dir_name=os.getenv("RAGPRO_MODELS_DIR", "packages/models"),
        data_dir_name=os.getenv("RAGPRO_DATA_DIR", "packages/data"),
        log_file=os.getenv("RAGPRO_LOG_FILE", "logs/app.log"),
    )
