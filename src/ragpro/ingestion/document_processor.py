from __future__ import annotations

from pathlib import Path

from langchain.text_splitter import MarkdownTextSplitter
from langchain_core.documents import Document

from ragpro.config import get_logger, get_settings

from .loaders.registry import load_directory
from .splitters.chinese_recursive import ChineseRecursiveTextSplitter

logger = get_logger("ragpro.ingestion.processor")


def process_documents(
    directory_path: str | Path,
    parent_chunk_size: int | None = None,
    child_chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Document]:
    settings = get_settings()
    parent_chunk_size = parent_chunk_size or settings.parent_chunk_size
    child_chunk_size = child_chunk_size or settings.child_chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    documents = load_directory(directory_path)
    logger.info("Loaded %s raw documents from %s.", len(documents), directory_path)

    parent_splitter = ChineseRecursiveTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=chunk_overlap,
    )
    child_splitter = ChineseRecursiveTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=chunk_overlap,
    )
    markdown_parent_splitter = MarkdownTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=chunk_overlap,
    )
    markdown_child_splitter = MarkdownTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=chunk_overlap,
    )

    child_chunks: list[Document] = []
    for doc_index, doc in enumerate(documents):
        file_path = Path(doc.metadata.get("file_path", ""))
        is_markdown = file_path.suffix.lower() == ".md"

        current_parent_splitter = markdown_parent_splitter if is_markdown else parent_splitter
        current_child_splitter = markdown_child_splitter if is_markdown else child_splitter

        parent_docs = current_parent_splitter.split_documents([doc])
        for parent_index, parent_doc in enumerate(parent_docs):
            parent_id = f"doc_{doc_index}_parent_{parent_index}"
            sub_chunks = current_child_splitter.split_documents([parent_doc])
            for child_index, child_chunk in enumerate(sub_chunks):
                child_chunk.metadata["parent_id"] = parent_id
                child_chunk.metadata["parent_content"] = parent_doc.page_content
                child_chunk.metadata["id"] = f"{parent_id}_child_{child_index}"
                child_chunks.append(child_chunk)

    logger.info("Processed %s child chunks from %s.", len(child_chunks), directory_path)
    return child_chunks
