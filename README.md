# RAGPro

RAGPro is a staged Chinese RAG question-answering project that is being formalized into a production-oriented structure.

## Current Direction

- FAQ exact match first
- RAG retrieval on FAQ miss
- Milvus + BGE-M3 + reranker
- Formal source layout under `src/ragpro/`

## Important Docs

- `docs/rag-project-analysis.md`
- `docs/planning-design.md`
- `docs/current-code-structure-summary.md`
- `docs/code-migration-map.md`
- `docs/formalization-progress.md`

## Current Formal Entrypoint

- API: `apps/api/main.py`

## Notes

- Legacy stage-based code still exists under `packages/`
- New formalized modules are being extracted into `src/ragpro/`
