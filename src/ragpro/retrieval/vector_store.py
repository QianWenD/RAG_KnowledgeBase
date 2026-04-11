from __future__ import annotations

import hashlib
import pickle
import socket
from collections import defaultdict

import numpy as np
import torch.cuda
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

from ragpro.config import get_logger, get_settings
from ragpro.faq_match import preprocess_text

logger = get_logger("ragpro.retrieval.vector_store")


class VectorStore:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.collection_name = settings.milvus_collection
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.backend = "milvus"
        self.local_store_path = settings.local_vector_store_path
        self.local_records: list[dict] = []
        self.local_bm25: BM25Okapi | None = None
        self.local_tokenized_texts: list[list[str]] = []
        self.client = None
        self.embedding_function = None
        self.reranker = None
        self.dense_dim: int | None = None

        self._initialize_backend()

    def _initialize_backend(self) -> None:
        preferred_backend = self.settings.vector_backend.lower()
        if preferred_backend not in {"auto", "milvus", "local"}:
            raise ValueError(f"Unsupported vector backend: {self.settings.vector_backend}")

        if preferred_backend in {"auto", "milvus"} and self._milvus_port_open():
            self._initialize_milvus_backend()
            return

        if preferred_backend == "milvus":
            raise RuntimeError("Milvus backend requested but service is unavailable.")

        self._initialize_local_backend()

    def _milvus_port_open(self) -> bool:
        sock = socket.socket()
        sock.settimeout(1.0)
        try:
            sock.connect((self.settings.milvus_host, int(self.settings.milvus_port)))
            return True
        except Exception:
            return False
        finally:
            sock.close()

    def _initialize_milvus_backend(self) -> None:
        from milvus_model.hybrid import BGEM3EmbeddingFunction
        from pymilvus import MilvusClient
        from sentence_transformers import CrossEncoder

        reranker_path = self.settings.models_dir / "bge-reranker-large"
        embedding_path = self.settings.models_dir / "bge-m3"

        self.reranker = CrossEncoder(
            str(reranker_path),
            device=self.device,
            tokenizer_args={"use_fast": False},
            local_files_only=True,
        )
        self.embedding_function = BGEM3EmbeddingFunction(
            model_name_or_path=str(embedding_path),
            use_fp16=(self.device == "cuda"),
            device=self.device,
        )
        self.dense_dim = self.embedding_function.dim["dense"]
        self.client = MilvusClient(
            uri=f"http://{self.settings.milvus_host}:{self.settings.milvus_port}",
            db_name=self.settings.milvus_database,
        )
        self._create_or_load_collection()
        self.backend = "milvus"
        logger.info("Vector backend initialized: milvus")

    def _initialize_local_backend(self) -> None:
        self.backend = "local"
        self.local_store_path.parent.mkdir(parents=True, exist_ok=True)
        self.local_records = self._load_local_records()
        self._rebuild_local_index()
        logger.info("Vector backend initialized: local (%s)", self.local_store_path)

    def _create_or_load_collection(self) -> None:
        from pymilvus import DataType

        if self.client is None or self.dense_dim is None:
            raise RuntimeError("Milvus backend is not fully initialized.")
        if not self.client.has_collection(self.collection_name):
            schema = self.client.create_schema(auto_id=False, enable_dynamic_field=True)
            schema.add_field("id", datatype=DataType.VARCHAR, is_primary=True, max_length=100)
            schema.add_field("text", datatype=DataType.VARCHAR, max_length=65535)
            schema.add_field("dense_vector", datatype=DataType.FLOAT_VECTOR, dim=self.dense_dim)
            schema.add_field("sparse_vector", datatype=DataType.SPARSE_FLOAT_VECTOR)
            schema.add_field("parent_id", datatype=DataType.VARCHAR, max_length=100)
            schema.add_field("parent_content", datatype=DataType.VARCHAR, max_length=65535)
            schema.add_field("source", datatype=DataType.VARCHAR, max_length=50)
            schema.add_field("timestamp", datatype=DataType.VARCHAR, max_length=50)

            index_params = self.client.prepare_index_params()
            index_params.add_index(
                field_name="dense_vector",
                index_name="dense_index",
                index_type="IVF_FLAT",
                metric_type="IP",
                params={"nlist": 128},
            )
            index_params.add_index(
                field_name="sparse_vector",
                index_name="sparse_index",
                index_type="SPARSE_INVERTED_INDEX",
                metric_type="IP",
                params={"drop_ratio_build": 0.2},
            )
            self.client.create_collection(
                collection_name=self.collection_name,
                schema=schema,
                index_params=index_params,
            )
            logger.info("Created Milvus collection %s.", self.collection_name)
        self.client.load_collection(self.collection_name)

    def add_documents(self, documents: list[Document]) -> None:
        if not documents:
            return
        if self.backend == "local":
            self._add_documents_local(documents)
            return
        self._add_documents_milvus(documents)

    def delete_source(self, source: str) -> int:
        if not source:
            return 0
        if self.backend == "local":
            return self._delete_source_local(source)
        return self._delete_source_milvus(source)

    def _add_documents_local(self, documents: list[Document]) -> None:
        existing = {row["id"]: row for row in self.local_records}
        for doc in documents:
            record = {
                "id": hashlib.md5(doc.page_content.encode("utf-8")).hexdigest(),
                "text": doc.page_content,
                "parent_id": doc.metadata["parent_id"],
                "parent_content": doc.metadata["parent_content"],
                "source": doc.metadata.get("source", "unknown"),
                "timestamp": doc.metadata.get("timestamp", "unknown"),
                "search_text": self._build_search_text(
                    doc.page_content,
                    doc.metadata.get("parent_content", ""),
                ),
            }
            existing[record["id"]] = record
        self.local_records = list(existing.values())
        self._save_local_records()
        self._rebuild_local_index()
        logger.info("Upserted %s documents into local vector store.", len(documents))

    def _add_documents_milvus(self, documents: list[Document]) -> None:
        if self.embedding_function is None or self.client is None:
            raise RuntimeError("Milvus backend is not fully initialized.")
        texts = [doc.page_content for doc in documents]
        embeddings = self.embedding_function(texts)

        data: list[dict] = []
        for index, doc in enumerate(documents):
            sparse_vector = self._sparse_row_to_dict(embeddings["sparse"], index)

            data.append(
                {
                    "id": hashlib.md5(doc.page_content.encode("utf-8")).hexdigest(),
                    "text": doc.page_content,
                    "dense_vector": np.asarray(embeddings["dense"][index], dtype=np.float32),
                    "sparse_vector": sparse_vector,
                    "parent_id": doc.metadata["parent_id"],
                    "parent_content": doc.metadata["parent_content"],
                    "source": doc.metadata.get("source", "unknown"),
                    "timestamp": doc.metadata.get("timestamp", "unknown"),
                }
            )

        self.client.upsert(collection_name=self.collection_name, data=data)
        logger.info("Upserted %s documents into Milvus.", len(data))

    def _delete_source_local(self, source: str) -> int:
        before = len(self.local_records)
        self.local_records = [
            record for record in self.local_records if record.get("source") != source
        ]
        deleted = before - len(self.local_records)
        if deleted:
            self._save_local_records()
            self._rebuild_local_index()
            logger.info("Deleted %s local vector records for source=%s.", deleted, source)
        return deleted

    def _delete_source_milvus(self, source: str) -> int:
        if self.client is None:
            raise RuntimeError("Milvus backend is not fully initialized.")
        rows = self.client.query(
            collection_name=self.collection_name,
            filter=f"source == '{source}'",
            output_fields=["id"],
            limit=16384,
        )
        ids = [str(row["id"]) for row in rows if row.get("id")]
        if not ids:
            return 0

        deleted = 0
        batch_size = 500
        for start in range(0, len(ids), batch_size):
            batch_ids = ids[start : start + batch_size]
            result = self.client.delete(
                collection_name=self.collection_name,
                ids=batch_ids,
            )
            deleted += int(result.get("delete_count", 0))

        self.client.flush(collection_name=self.collection_name)
        self.client.load_collection(self.collection_name)
        if deleted:
            logger.info("Deleted %s Milvus vector records for source=%s.", deleted, source)
        return deleted

    def hybrid_search_with_rerank(
        self,
        query: str,
        k: int | None = None,
        source_filter: str | None = None,
    ) -> list[Document]:
        k = k or self.settings.retrieval_k
        if self.backend == "local":
            return self._local_search(query=query, source_filter=source_filter, k=k)
        return self._milvus_search(query=query, source_filter=source_filter, k=k)

    def _local_search(
        self,
        *,
        query: str,
        source_filter: str | None = None,
        k: int,
    ) -> list[Document]:
        if self.local_bm25 is None or not self.local_records:
            return []

        filtered_records = self.local_records
        filtered_tokens = self.local_tokenized_texts
        if source_filter:
            filtered_records = [
                record for record in self.local_records if record.get("source") == source_filter
            ]
            filtered_tokens = [preprocess_text(record["text"]) for record in filtered_records]

        if not filtered_records:
            return []

        bm25 = self.local_bm25 if filtered_records is self.local_records else BM25Okapi(filtered_tokens)
        query_tokens = preprocess_text(query)
        if not query_tokens:
            return []

        scores = bm25.get_scores(query_tokens)
        ranked_rows: list[dict] = []
        for index, score in enumerate(scores):
            record = filtered_records[int(index)]
            lexical_bonus = self._lexical_overlap_score(
                query_tokens,
                filtered_tokens[int(index)],
            )
            final_score = float(score) + lexical_bonus
            if final_score <= 0:
                continue
            ranked_rows.append({"record": record, "score": final_score})

        ranked_rows.sort(key=lambda item: item["score"], reverse=True)
        return self._rank_parent_documents(ranked_rows, limit=self.settings.candidate_m)

    def _milvus_search(
        self,
        *,
        query: str,
        source_filter: str | None,
        k: int,
    ) -> list[Document]:
        from pymilvus import AnnSearchRequest, WeightedRanker

        if self.embedding_function is None or self.client is None:
            raise RuntimeError("Milvus backend is not fully initialized.")

        query_embeddings = self.embedding_function([query])
        dense_query_vector = query_embeddings["dense"][0]
        sparse_query_vector = self._sparse_row_to_dict(query_embeddings["sparse"], 0)

        filter_expr = f"source == '{source_filter}'" if source_filter else ""
        dense_request = AnnSearchRequest(
            data=[dense_query_vector],
            anns_field="dense_vector",
            param={"metric_type": "IP", "params": {"nprobe": 10}},
            limit=k,
            expr=filter_expr,
        )
        sparse_request = AnnSearchRequest(
            data=[sparse_query_vector],
            anns_field="sparse_vector",
            param={"metric_type": "IP", "params": {}},
            limit=k,
            expr=filter_expr,
        )

        results = self.client.hybrid_search(
            collection_name=self.collection_name,
            reqs=[dense_request, sparse_request],
            ranker=WeightedRanker(1.0, 0.7),
            limit=k,
            output_fields=["text", "parent_id", "parent_content", "source", "timestamp"],
        )[0]

        sub_chunks = [self._doc_from_hit(hit["entity"]) for hit in results]
        parent_docs = self._get_unique_parent_docs(sub_chunks)
        if len(parent_docs) < 2 or self.reranker is None:
            return [
                self._decorate_parent_doc(doc, retrieval_score=None, matched_chunks=1)
                for doc in parent_docs[: self.settings.candidate_m]
            ]

        pairs = [[query, doc.page_content] for doc in parent_docs]
        scores = self.reranker.predict(pairs)
        ranked_pairs = sorted(zip(scores, parent_docs), reverse=True)
        return [
            self._decorate_parent_doc(doc, retrieval_score=float(score), matched_chunks=1)
            for score, doc in ranked_pairs[: self.settings.candidate_m]
        ]

    def _rebuild_local_index(self) -> None:
        for record in self.local_records:
            record.setdefault(
                "search_text",
                self._build_search_text(record.get("text", ""), record.get("parent_content", "")),
            )
        self.local_tokenized_texts = [
            preprocess_text(record.get("search_text", record.get("text", "")))
            for record in self.local_records
        ]
        self.local_bm25 = BM25Okapi(self.local_tokenized_texts) if self.local_tokenized_texts else None

    def _load_local_records(self) -> list[dict]:
        if not self.local_store_path.exists():
            return []
        with self.local_store_path.open("rb") as handle:
            return pickle.load(handle)

    def _save_local_records(self) -> None:
        with self.local_store_path.open("wb") as handle:
            pickle.dump(self.local_records, handle)

    @staticmethod
    def _get_unique_parent_docs(sub_chunks: list[Document]) -> list[Document]:
        seen: set[str] = set()
        unique_docs: list[Document] = []
        for chunk in sub_chunks:
            parent_content = chunk.metadata.get("parent_content", chunk.page_content)
            if parent_content and parent_content not in seen:
                unique_docs.append(Document(page_content=parent_content, metadata=chunk.metadata))
                seen.add(parent_content)
        return unique_docs

    def _rank_parent_documents(self, ranked_rows: list[dict], limit: int) -> list[Document]:
        grouped: dict[str, dict] = defaultdict(
            lambda: {
                "record": None,
                "max_score": 0.0,
                "matched_chunks": 0,
            }
        )
        top_candidates = ranked_rows[: max(self.settings.retrieval_k * 4, limit * 6)]
        for item in top_candidates:
            record = item["record"]
            parent_key = record.get("parent_id") or hashlib.md5(
                record.get("parent_content", "").encode("utf-8")
            ).hexdigest()
            bucket = grouped[parent_key]
            bucket["matched_chunks"] += 1
            if bucket["record"] is None or item["score"] > bucket["max_score"]:
                bucket["record"] = record
                bucket["max_score"] = float(item["score"])

        ranked_parents = sorted(
            grouped.values(),
            key=lambda item: item["max_score"] + 0.08 * max(item["matched_chunks"] - 1, 0),
            reverse=True,
        )
        return [
            self._decorate_parent_doc(
                self._doc_from_hit(item["record"]),
                retrieval_score=item["max_score"],
                matched_chunks=item["matched_chunks"],
            )
            for item in ranked_parents[:limit]
            if item["record"] is not None
        ]

    def _decorate_parent_doc(
        self,
        doc: Document,
        *,
        retrieval_score: float | None,
        matched_chunks: int,
    ) -> Document:
        metadata = dict(doc.metadata)
        metadata["retrieval_backend"] = self.backend
        metadata["matched_chunks"] = matched_chunks
        if retrieval_score is not None:
            metadata["retrieval_score"] = round(retrieval_score, 4)
        return Document(page_content=doc.page_content, metadata=metadata)

    @staticmethod
    def _build_search_text(text: str, parent_content: str) -> str:
        parent_excerpt = (parent_content or "")[:800]
        return "\n".join(part for part in [text, parent_excerpt] if part)

    @staticmethod
    def _lexical_overlap_score(query_tokens: list[str], doc_tokens: list[str]) -> float:
        if not query_tokens or not doc_tokens:
            return 0.0
        query_terms = set(query_tokens)
        doc_terms = set(doc_tokens)
        overlap = len(query_terms & doc_terms)
        return 0.12 * overlap / max(len(query_terms), 1)

    def _doc_from_hit(self, hit: dict) -> Document:
        return Document(
            page_content=hit.get("text"),
            metadata={
                "parent_id": hit.get("parent_id"),
                "parent_content": hit.get("parent_content"),
                "source": hit.get("source"),
                "timestamp": hit.get("timestamp"),
                "retrieval_backend": self.backend,
            },
        )

    @staticmethod
    def _sparse_row_to_dict(sparse_matrix, index: int) -> dict[int, float]:
        row = sparse_matrix[index]
        indices = getattr(row, "indices", None)
        data = getattr(row, "data", None)
        if indices is None or data is None:
            if hasattr(sparse_matrix, "getrow"):
                row = sparse_matrix.getrow(index)
            elif hasattr(sparse_matrix, "_getrow"):
                row = sparse_matrix._getrow(index)
            else:
                raise TypeError(f"Unsupported sparse matrix type: {type(sparse_matrix)!r}")
            indices = row.indices
            data = row.data
        return {
            int(token_index): float(value)
            for token_index, value in zip(indices, data)
        }
