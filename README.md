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
- `docs/frontend-e2e-verification.md`

## Current Formal Entrypoint

- API: `apps/api/main.py`
- Frontend: `apps/web/index.html`

## Quick Start

### 1. Create local venv and install base dependencies

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt
```

### 2. Start the API and frontend in one process

```powershell
.venv\Scripts\python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open `http://127.0.0.1:8000/`.

### 2.1 Frontend browser smoke tests

The native frontend can be checked with Playwright:

```powershell
npm install
npm run test:e2e:install
npm run test:e2e
```

For an opt-in live permission and audit-chain check against the configured MySQL database:

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```

The live suite self-provisions temporary `e2e_*` accounts and cleans up matching users and audit logs after the run. More details are in `docs/frontend-e2e-verification.md`.

### 3. Optional RAG runtime dependencies

```powershell
.venv\Scripts\python -m pip install -r requirements-rag.txt
```

If `Milvus` is not running, the project falls back to a local lightweight retrieval store in `runtime/local_vector_store.pkl` for development.

`requirements-rag.txt` now also installs the document-ingestion runtime used by the worker path:

- `pypdf` for text-based PDF extraction
- `PyMuPDF + rapidocr-onnxruntime` for optional OCR fallback on scanned PDFs
- `docx2txt` for `.docx` loading

The current ingestion layer supports:

- `.txt`
- `.md` / `.markdown`
- `.html` / `.htm`
- `.pdf`
- `.docx`
- `.ppt` / `.pptx` when the optional unstructured PowerPoint loader is available

PDF ingestion now uses a two-step strategy:

- prefer text extraction when the extracted text quality is acceptable
- automatically switch to OCR when the extracted PDF text looks suspicious

### 4. Start Milvus Standalone in WSL

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

This starts `Milvus Standalone` inside `WSL Ubuntu`, keeps the distro alive through a managed background `wsl.exe` process, and exposes:

- `127.0.0.1:19530`
- `127.0.0.1:9091`

To stop it:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-milvus-wsl.ps1
```

If you want the API to prefer Milvus explicitly in the current shell:

```powershell
$env:RAGPRO_VECTOR_BACKEND = "milvus"
```

For local Milvus verification on this machine, there are currently two practical paths:

- `WSL Ubuntu + Milvus Lite` for lightweight local validation
- `Docker Desktop + WSL2 + Milvus Standalone` for a setup closer to the official server runtime

When the fallback backend is used, `/query` responses include:

- `retrieval_backend`: current backend, such as `local` or `milvus`
- `citations`: deduplicated source references with `excerpt`
- `context_count`: number of retrieved parent documents
- `confidence`: structured confidence with `score` and `label`
- `debug_info`: structured FAQ, routing, retrieval, and fallback metadata

The current `/query` flow also supports:

- multi-turn session history persistence
- history-aware retrieval query rewriting for short follow-up questions
- concept-oriented retrieval expansion for terms such as `澶ц瑷€妯″瀷 / LLM / 澶фā鍨媊
- compressed conversation context passed into the answer-generation prompt
- guarded fallback answers when retrieval returns no reliable context
- citation ordering that prioritizes stronger retrieval evidence
- HTML and OCR noise cleanup before context assembly and citation excerpt generation
- structured `confidence` for `faq_match / general_llm / rag / rag_unavailable`
- structured `debug_info` including:
  - source filter
  - FAQ score and matched question
  - routing reasons
  - retrieval strategy, query, backend, citation count, and context count
  - fallback detection
- SSE `start` and `end` events now include the same `confidence` and `debug_info` metadata as the non-stream response

Operational endpoints are now split by purpose:

- `GET /health`: lightweight liveness and readiness summary
- `GET /diagnostics`: detailed runtime diagnostics, dependency checks, and environment metadata

The API layer now also supports document upload and source rebuild operations:

Upload endpoint:

- `POST /documents/upload`
- accepts `multipart/form-data`
- fields:
  - `source`: one of the configured sources such as `ai` or `test`
  - `replace_source`: optional boolean, default `false`
  - `files`: one or more uploaded files
- supported upload types:
  - `.txt`
  - `.md` / `.markdown`
  - `.html` / `.htm`
  - `.pdf`
  - `.docx`
  - `.ppt` / `.pptx`
- the upload path uses extension allow-list validation, filename sanitization, and a per-file size limit
- uploaded files are persisted under `runtime/uploads/<source>/...` and indexed immediately into the active retrieval backend

Rebuild endpoint:

- `POST /reindex`
- accepts `application/json`
- fields:
  - `source`: required source key such as `ai`
  - `directory`: optional directory override
  - `append`: optional boolean, default `false`
- allowed rebuild roots:
  - `packages/data/<source>_data`
  - `runtime/uploads/<source>`
- if `append=false`, the endpoint deletes the existing vectors for that source before re-indexing
- if `directory` is omitted, the API prefers `packages/data/<source>_data` and falls back to `runtime/uploads/<source>`

Example:

```powershell
curl -X POST http://127.0.0.1:8000/documents/upload `
  -F "source=ai" `
  -F "replace_source=false" `
  -F "files=@packages/data/ai_data/浜哄伐鏅鸿兘灏变笟璇捐绋嬪ぇ绾?md"
```

Rebuild example:

```powershell
curl -X POST http://127.0.0.1:8000/reindex `
  -H "Content-Type: application/json" `
  -d "{\"source\":\"ai\",\"append\":false}"
```

The web console now includes a built-in upload panel in the left rail:

- choose a `source`
- toggle whether to replace the existing source index
- select one or more files
- upload and index them directly from the browser
- see the latest upload summary without leaving the page
- drag files into the upload zone
- watch a real upload progress bar during transfer
- keep a recent upload record list in browser local storage

The current ingestion verification on this machine has already confirmed that:

- `packages/data/ai_data/LLM鍩虹鐭ヨ瘑.pdf` can be loaded
- low-quality PDF extraction will auto-switch to OCR
- the `ai_data` directory is processed into `105` child chunks
- the indexed collection can be queried from the API with `retrieval_backend: milvus`
- concept queries such as `浠€涔堟槸澶ц瑷€妯″瀷` now expand into a retrieval query like `浠€涔堟槸澶ц瑷€妯″瀷 澶ц瑷€妯″瀷 LLM 澶фā鍨?瀹氫箟 鑳屾櫙`
- `/query` now returns cleaner excerpts without raw HTML tags or OCR bullet noise in citations

### 6. Run offline evaluation

You can now run both a smoke set and a broader regression set directly against the in-process app:

```powershell
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

These write JSON reports into:

- `runtime/evaluation/phase-one-smoke.report.json`
- `runtime/evaluation/phase-one-regression.report.json`
- `runtime/evaluation/current-domain-regression.report.json`

The current evaluation module now supports:

- loading structured datasets with categories such as `general`, `faq`, `rag`, `source_filter`, `conversation`, and `fallback`
- tagging cases so reports can be reused across different business domains
- checking route accuracy
- checking FAQ hit rate
- checking FAQ exact-question accuracy
- checking FAQ score thresholds
- checking retrieval-strategy accuracy
- checking keyword hit coverage
- checking citation coverage
- checking expected retrieval backend
- checking expected citation sources
- checking the expected top citation source
- checking whether relevant evidence appears within the top-k citations
- checking whether rerank keeps the expected evidence at top-1
- checking minimum retrieved context count
- checking answer fidelity through expected answer snippets
- checking answer safety through forbidden answer snippets
- checking fallback behavior when no reliable context is found
- exporting machine-readable reports with:
  - overall pass rate
  - per-check pass rates
  - category breakdown
  - tag breakdown
  - failure breakdown
  - per-case citation excerpts and top citation excerpt for retrieval debugging

For future business-domain swaps, you can reuse the same evaluator and only replace the dataset content. A reusable starter template is available at:

- `packages/data/evaluation/domain_regression_template.json`

The repo now also includes a larger current-domain regression set for the data already present in this project:

- `packages/data/evaluation/current_domain_regression.json`

This dataset currently covers `10` cases across:

- `general`
- `faq`
- `rag`
- `source_filter`
- `conversation`
- `fallback`

When rebuilding a source index with the worker, the default behavior is now:

- delete existing vectors for the same `source`
- then upsert the new chunk set

If you explicitly want to append instead of replace:

```powershell
.venv\Scripts\python apps\worker\index_documents.py --directory packages\data\ai_data --append
```

If you prefer one command on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1 -InstallBase
```

## Notes

- Legacy stage-based code still exists under `packages/`
- New formalized modules are being extracted into `src/ragpro/`
## Authentication And Authorization

The project now includes a built-in authentication and access-control layer.

Implemented endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/users`
- `GET /auth/users`
- `PATCH /auth/users/{user_id}/access`
- `POST /auth/users/{user_id}/reset-password`
- `DELETE /auth/users/{user_id}`

Implemented rules:

- `HttpOnly` cookie session for authenticated access
- the first registered account becomes `admin`
- later accounts default to `user`
- `/sources`, `/sessions/*`, and `/query` require login
- users can change their own password; changing it invalidates existing sessions and clears the current cookie
- `/documents/upload`, `/reindex`, `/diagnostics`, and `/faq/query` are admin-only
- admins can create users, reset passwords, update source access, disable accounts, and delete users
- normal users only see their assigned `source` values
- professional queries are constrained by assigned sources
- conversation history is isolated by `user_id + session_id`

The web console now also includes:

- login and register panel
- current user identity and allowed source tags
- admin-only create-user form
- admin-only permission management panel
- admin-only password reset action
- self-service password change action
- admin-only user deletion action
- admin-only upload panel integrated into the same left rail
