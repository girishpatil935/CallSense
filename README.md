# CallSense AI

CallSense AI is a full-stack demo for reviewing synthetic customer calls. It combines a React dashboard with a FastAPI service that analyzes four prerecorded WAV samples and creates an individual PDF report for each call.

> **Demo data:** Every sample call and recording in this project is synthetic. Estimated purchase-intent values are transparent heuristic scores; they are not calibrated probabilities or claims about real conversion rates.

## Quick start with Docker

Requirements: Docker Desktop (or Docker Engine) with the Compose plugin.

From the repository root:

```sh
docker compose up --build
```

Open the dashboard at <http://localhost:5173>, the API docs at <http://localhost:8000/docs>, and health status at <http://localhost:8000/api/health>. The frontend container serves the production Vite build and proxies `/api` requests to FastAPI. The backend uses the lightweight lexical sentiment fallback by default; no API key, paid service, cloud model, or model download is required.

Useful Docker commands:

```sh
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose down
docker compose up --build -d
```

`docker compose down` retains the named `callsense_reports` volume, which stores generated PDFs. To also remove this generated report data, use `docker compose down -v`. The four source WAV files are included in the backend image and are not written into a volume.

To change backend environment settings, copy `.env.example` to `.env` at the repository root before starting Compose. The bundled backend image does not install optional transformer libraries or model weights, so keep `ENABLE_TRANSFORMERS=false` for the standard Docker demo. The source backend can use a separately installed, locally cached transformer as described in [AI methodology](#ai-methodology-and-limitations).

## Run without Docker

Requirements: Python 3.10 or newer and Node.js 18 or newer. Use two terminals from the project root.

PowerShell terminal 1 (backend):

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

PowerShell terminal 2 (frontend):

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open <http://localhost:5173>. On macOS/Linux, replace `py` with `python3`, activate using `source .venv/bin/activate`, and copy the frontend example with `cp .env.example .env`.

The local frontend example points to `http://127.0.0.1:8000`. In production builds the frontend uses same-origin `/api` requests, which the Nginx container forwards to FastAPI.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS, Recharts, and Lucide icons. It displays the four calls, sentiment breakdowns, heuristic purchase-intent estimates, insights, behavioral signals, transcript, recommendation, audio player, and report-download actions.
- **Backend:** FastAPI serves call and health data, the four synthetic recordings, analysis results, and generated PDF reports. ReportLab creates PDFs on request.
- **Container deployment:** Docker Compose starts FastAPI and an Nginx container hosting the built frontend. Nginx forwards `/api/*` to the backend service; the browser needs no cross-origin API configuration in this mode.
- **Storage:** The source recordings are packaged with the backend. Generated PDF files live in the Compose named volume `callsense_reports`. The app currently has no database or upload endpoint.

## API endpoints

All paths are relative to `http://localhost:8000`.

| Method and path | Response |
| --- | --- |
| `GET /api/health` | `status`, `sentiment_engine`, and `transformer_enabled` |
| `GET /api/calls` | `{ calls: Call[], count: number, demo_data: true }` |
| `GET /api/calls/{call_id}` | One call with its `analysis` and `demo_data: true`; unknown IDs return 404 |
| `GET /api/calls/{call_id}/audio` | The call's WAV recording (`audio/wav`) |
| `GET /api/calls/{call_id}/report` | A generated PDF (`application/pdf`) with a download filename |

Each call includes `id`, `customer`, `title`, `date`, `duration`, `channel`, `transcript`, and `audio`. The nested `analysis` contains `sentiment` (`Positive`, `Neutral`, or `Negative`), `sentiment_scores` (three indicative class scores), `purchase_probability` (the heuristic intent score, 0–100), `confidence_note`, `key_insights`, `behavioral_signals`, `recommended_action`, `analyzed_at`, and `analysis_method`. Call content and response values describe a synthetic demo only.

## AI methodology and limitations

- **Sentiment:** The default lexical fallback counts whole-word and whole-phrase signals, then applies a documented balance rule to return Positive, Neutral, or Negative. Its three-way class scores are indicative values, not calibrated model probabilities.
- **Optional local transformer:** The source backend can use a locally cached DistilBERT SST-2 model when transformer dependencies are installed and `ENABLE_TRANSFORMERS=true` with `SENTIMENT_MODEL_PATH` pointing to the local model. The application sets `local_files_only=True`; it does not download a model. SST-2 is binary, so Neutral is still assigned by the separate wrapper rule based on signal balance. Transformer output only contributes sentiment signals; it does not produce purchase intent.
- **Purchase intent:** Explainable phrase-based features add or subtract fixed heuristic weights. The output is an estimate for the synthetic demonstration, not a trained or calibrated purchase probability. It has no measured accuracy claim and must not be used as a forecast.
- **Insights and recommendation:** Deterministic rules summarize transcript signals and suggest a next action. There is no external AI API or cloud dependency.
- **PDF reports:** Each report includes synthetic call metadata, sentiment and indicative class scores, the heuristic score and caveat, method, insights, behavioral signals, recommendation, transcript, and generation time.

The sample set is small and authored for demonstration. The lexical analyzer does not understand context, sarcasm, or speech acoustics, and no real-world evaluation dataset is provided. Replace the prototype scoring only after collecting appropriately consented, labeled data and evaluating a suitable model.

## Verification

Frontend checks (from `frontend/`):

```sh
npm test
npm run build
```

Backend checks (from `backend/`):

```sh
python -m compileall -q app
python -m unittest discover -s tests -v
```

For interactive endpoint checks, start the backend and visit <http://localhost:8000/docs>, or check health and the calls list with:

```sh
curl http://localhost:8000/api/health
curl http://localhost:8000/api/calls
```

Each `CALL-001` through `CALL-004` supports its own `/audio` and `/report` paths. Download a sample report with `curl -OJ http://localhost:8000/api/calls/CALL-001/report`.

## Troubleshooting

- **Dashboard reports an API error:** Check `docker compose ps` and `docker compose logs backend`. In local development, confirm FastAPI listens on port 8000 and the frontend `.env` contains `VITE_API_BASE_URL=http://127.0.0.1:8000`; restart Vite after changing it.
- **Ports 5173 or 8000 are busy:** Stop the conflicting process or edit the host-side port before the colon in `docker-compose.yml` (for example, `5174:80`).
- **Audio or PDF request returns 404:** Use a listed call ID (`CALL-001` through `CALL-004`) and check backend logs. Keep the synthetic source WAV files in `backend/media/`.
- **Docker build fails to pull a base image:** Check Docker Engine connectivity and registry access, then retry `docker compose up --build`.
- **Reports disappeared after cleanup:** `docker compose down -v` removes the named reports volume. Start Compose again to recreate an empty volume.
- **Optional transformer is unavailable:** The standard Docker image intentionally contains no transformer package or weights. For local use, install the optional dependencies and point `SENTIMENT_MODEL_PATH` to an already downloaded model; otherwise the backend reports and uses the lexical fallback.

## Repository hygiene

Local implementation notes and handoff documents stay in the working folder but are ignored by Git; only the root `README.md` is intended to be trackable among Markdown files. Generated reports, environment files, databases, local model weights, uploaded/private media, and build outputs are also ignored. The four synthetic sample WAV recordings remain project assets.
