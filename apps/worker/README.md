# Worker Layer

`apps/worker/` is reserved for background tasks such as:

- document ingestion
- vector reindexing
- FAQ import jobs
- offline evaluation runs

The first worker implementation should extract the data-processing flow currently
living inside the stage-based RAG entrypoints.

Current workers:

- `index_documents.py`
- `faq_import.py`
- `run_evaluation.py`

Suggested evaluation commands:

```powershell
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

The regression dataset currently covers:

- `general`
- `faq`
- `rag`
- `source_filter`
- `conversation`
- `fallback`

For a new business domain, copy:

- `packages/data/evaluation/domain_regression_template.json`

Then replace the placeholder queries, source keys, expected FAQ questions, expected citation snippets, and grounded answer snippets with your own domain data. The worker and evaluator code do not need to change.

If you want a larger ready-to-run example based on the current repo data, use:

- `packages/data/evaluation/current_domain_regression.json`

That set currently contains `10` cases and is intended as a reference for how to scale from a smoke set to a more business-shaped regression suite.
