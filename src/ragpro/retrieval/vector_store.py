from __future__ import annotations

import hashlib

import torch.cuda
from langchain_core.documents import Document
from milvus_model.hybrid import BGEM3EmbeddingFunction
from pymilvus import AnnSearchRequest, DataType, MilvusClient, WeightedRanker
from sentence_transformers import CrossEncoder

from ragpro.config import get_logger, get_settings

logger = get_logger("ragpro.retrieval.vector_store")


class VectorStore:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.collection_name = settings.milvus_collection
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        reranker_path = settings.models_dir / "bge-reranker-large"
        embedding_path = settings.models_dir / "bge-m3"

        self.reranker = CrossEncoder(str(reranker_path), device=self.device)
        self.embedding_function = BGEM3EmbeddingFunction(
            model_name_or_path=str(embedding_path),
            use_fp16=(self.device == "cuda"),
            device=self.device,
        )
        self.dense_dim = self.embedding_function.dim["dense"]
        self.client = MilvusClient(
            uri=f"http://{settings.milvus_host}:{settings.milvus_port}",
            db_name=settings.milvus_database,
        )
        self._create_or_load_collection()

    def _create_or_load_collection(self) -> None:
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
        texts = [doc.page_content for doc in documents]
        embeddings = self.embedding_function(texts)

        data: list[dict] = []
        for index, doc in enumerate(documents):
            sparse_vector: dict[int, float] = {}
            row = embeddings["sparse"].getrow(index)
            for token_index, value in zip(row.indices, row.data):
                sparse_vector[int(token_index)] = float(value)

            data.append(
                {
                    "id": hashlib.md5(doc.page_content.encode("utf-8")).hexdigest(),
                    "text": doc.page_content,
                    "dense_vector": embeddings["dense"][index],
                    "sparse_vector": sparse_vector,
                    "parent_id": doc.metadata["parent_id"],
                    "parent_content": doc.metadata["parent_content"],
                    "source": doc.metadata.get("source", "unknown"),
                    "timestamp": doc.metadata.get("timestamp", "unknown"),
                }
            )

        if data:
            self.client.upsert(collection_name=self.collection_name, data=data)
            logger.info("Upserted %s documents into Milvus.", len(data))

    def hybrid_search_with_rerank(
        self,
        query: str,
        k: int | None = None,
        source_filter: str | None = None,
    ) -> list[Document]:
        k = k or self.settings.retrieval_k
        query_embeddings = self.embedding_function([query])
        dense_query_vector = query_embeddings["dense"][0]

        sparse_query_vector: dict[int, float] = {}
        row = query_embeddings["sparse"].getrow(0)
        for token_index, value in zip(row.indices, row.data):
            sparse_query_vector[int(token_index)] = float(value)

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
        if len(parent_docs) < 2:
            return parent_docs[: self.settings.candidate_m]

        pairs = [[query, doc.page_content] for doc in parent_docs]
        scores = self.reranker.predict(pairs)
        ranked = [doc for _, doc in sorted(zip(scores, parent_docs), reverse=True)]
        return ranked[: self.settings.candidate_m]

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

    @staticmethod
    def _doc_from_hit(hit: dict) -> Document:
        return Document(
            page_content=hit.get("text"),
            metadata={
                "parent_id": hit.get("parent_id"),
                "parent_content": hit.get("parent_content"),
                "source": hit.get("source"),
                "timestamp": hit.get("timestamp"),
            },
        )
