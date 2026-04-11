# RAGPro Local Startup Runbook

This runbook records where to run each local command and what each process starts. All commands assume Windows PowerShell unless a section explicitly says WSL.

## 0. Workspace

Run project commands from the repository root:

```powershell
Set-Location D:\dc\gz\codexItem\RAGPro
```

The FastAPI app and the native frontend are served from the same API process:

- API entrypoint: `apps/api/main.py`
- Frontend files: `apps/web/`
- Static mount: `/static`
- Main browser URL: `http://127.0.0.1:8000/`

## 1. Python Environment

Create or refresh the local virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Install optional RAG ingestion/runtime dependencies when you need PDF/OCR/document ingestion and full retrieval behavior:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-rag.txt
```

## 2. Start Backend And Frontend

Start FastAPI and the frontend together from the repo root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Equivalent helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1 -InstallBase
```

Use `-InstallRag` if you also want the optional RAG dependencies installed before startup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1 -InstallRag
```

Open these pages after startup:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/qa`
- `http://127.0.0.1:8000/knowledge`
- `http://127.0.0.1:8000/users`
- `http://127.0.0.1:8000/users/access`
- `http://127.0.0.1:8000/users/security`
- `http://127.0.0.1:8000/users/audit`
- `http://127.0.0.1:8000/login`
- `http://127.0.0.1:8000/register`

Quick API checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/qa
```

## 3. MySQL And Runtime Configuration

The auth, FAQ, and conversation repositories use MySQL. Default local settings are:

- host: `localhost`
- user: `root`
- password: `123456`
- database: `subjects_kg`

Override them in the current shell when needed:

```powershell
$env:RAGPRO_MYSQL_HOST = "localhost"
$env:RAGPRO_MYSQL_USER = "root"
$env:RAGPRO_MYSQL_PASSWORD = "123456"
$env:RAGPRO_MYSQL_DATABASE = "subjects_kg"
```

Source keys default to `ai,java,test,ops,bigdata`. Override them with:

```powershell
$env:RAGPRO_VALID_SOURCES = "ai,java,test,ops,bigdata"
```

## 4. Milvus Startup

Milvus is started from Windows PowerShell at the repo root, but the service itself runs inside WSL Ubuntu with Docker Compose.

Optional prerequisite report:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-milvus-prereqs.ps1
```

Start Milvus Standalone in WSL:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-milvus-wsl.ps1
```

This creates or uses `/root/milvus-standalone` inside WSL and exposes:

- `127.0.0.1:19530` for Milvus gRPC
- `127.0.0.1:9091` for health/metrics

Stop Milvus Standalone:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-milvus-wsl.ps1
```

Force the API to prefer Milvus:

```powershell
$env:RAGPRO_VECTOR_BACKEND = "milvus"
```

If Milvus is unavailable, development can fall back to the local vector store at `runtime/local_vector_store.pkl`.

## 5. Indexing And Evaluation Workers

Run workers from the repo root.

Index a source directory and replace existing vectors for that source:

```powershell
.\.venv\Scripts\python.exe apps\worker\index_documents.py --directory packages\data\ai_data
```

Append instead of replacing:

```powershell
.\.venv\Scripts\python.exe apps\worker\index_documents.py --directory packages\data\ai_data --append
```

Run offline evaluation:

```powershell
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.\.venv\Scripts\python.exe apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

Evaluation reports are written to `runtime/evaluation/`.

## 6. Tests

Run the Python regression suite:

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

Install Playwright dependencies and Chromium:

```powershell
npm install
npm run test:e2e:install
```

Run browser-level mocked frontend smoke tests:

```powershell
npm run test:e2e
```

Run the opt-in live permission and audit flow. This creates temporary `e2e_*` accounts and cleans them up after the run:

```powershell
$env:RAGPRO_E2E_LIVE = "1"
$env:RAGPRO_E2E_CREATE_ADMIN = "1"
npm run test:e2e:live
```

## 7. Common Local URLs

- API docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`
- Diagnostics: `http://127.0.0.1:8000/diagnostics`
- Frontend dashboard: `http://127.0.0.1:8000/`
- QA workspace: `http://127.0.0.1:8000/qa`
- Knowledge upload: `http://127.0.0.1:8000/knowledge`
- Permission overview: `http://127.0.0.1:8000/users`
- Access management: `http://127.0.0.1:8000/users/access`
- Security actions: `http://127.0.0.1:8000/users/security`
- Audit logs: `http://127.0.0.1:8000/users/audit`
