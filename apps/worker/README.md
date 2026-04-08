# Worker Layer

`apps/worker/` is reserved for background tasks such as:

- document ingestion
- vector reindexing
- FAQ import jobs
- offline evaluation runs

The first worker implementation should extract the data-processing flow currently
living inside the stage-based RAG entrypoints.
