"""Ingestion layer for document loading, cleaning, and chunking."""

from .document_processor import process_documents

__all__ = ["process_documents"]
