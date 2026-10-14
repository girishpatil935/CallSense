# CallSense AI

CallSense AI is a full-stack call-review dashboard built with React and FastAPI. It includes four synthetic sample calls and, when the local pipeline artifacts are available, a separate real recording entry for `Demo Audio.mp4` with its Faster-Whisper transcript, DistilBERT sentiment results, and generated PDF report.

> **Data labels:** The four `CALL-001` through `CALL-004` entries are synthetic. The `REAL-AUDIO-001` entry is the local recording and is labeled **REAL AUDIO** in the dashboard. Purchase-intent scores on synthetic calls are heuristic estimates, not calibrated probabilities.

## Quick start

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

The local frontend example points to `http://127.0.0.1:8000`.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS, Recharts, and Lucide icons. It displays the four calls, sentiment breakdowns, heuristic purchase-intent estimates, insights, behavioral signals, transcript, recommendation, audio player, and report-download actions.
- **Backend:** FastAPI serves health data, four synthetic calls, and the optional real recording from local pipeline artifacts. It also serves audio and PDF reports.
- **Storage:** The four synthetic WAV files live in `backend/media/`. `Demo Audio.mp4` and its transcript, sentiment JSON, and PDF stay as local project files. The app has no database or upload endpoint.

## API endpoints

All paths are relative to `http://localhost:8000`.

| Method and path | Response |
| --- | --- |
| `GET /api/health` | `status`, `sentiment_engine`, and `transformer_enabled` |
| `GET /api/calls` | `{ calls: Call[], count: number, demo_data: true }`; includes `REAL-AUDIO-001` when its local assets exist |
| `GET /api/calls/{call_id}` | One call with its `analysis`; unknown IDs return 404 |
| `GET /api/calls/{call_id}/audio` | A synthetic WAV recording or the real fixture MP4 (`audio/mp4`) |
| `GET /api/calls/{call_id}/report` | A PDF report (`application/pdf`); the real entry serves the locally generated report |

Each call includes `id`, `customer`, `title`, `date`, `duration`, `channel`, `transcript`, and `audio`. Synthetic calls include heuristic purchase estimates and three-way sentiment. The real recording carries segment-share scores from its binary DistilBERT sentiment output; its call label is the majority segment label, neutral is not a native model class, and purchase likelihood is not supplied.

## AI methodology and limitations

- **Sentiment:** The default lexical fallback counts whole-word and whole-phrase signals, then applies a documented balance rule to return Positive, Neutral, or Negative. Its three-way class scores are indicative values, not calibrated model probabilities.
- **Real-recording sentiment:** The transcript segments for `Demo Audio.mp4` were classified with the pretrained Hugging Face model [`distilbert/distilbert-base-uncased-finetuned-sst-2-english`](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english), using the Hugging Face `transformers` library. This model is binary (positive/negative); the displayed call label is the majority segment label, and the displayed percentages are the measured shares of positive and negative segments. There is no native neutral class, and no accuracy claim is made for this recording.
- **Speech to text:** The real recording was transcribed locally with the `faster-whisper` Python library using the Whisper `base` model. Its generated transcript and timestamped segments are stored under `artifacts/transcription/` and used as the input to sentiment analysis.
- **Optional backend transformer:** The FastAPI source backend can use a locally cached DistilBERT SST-2 model when transformer dependencies are installed and `ENABLE_TRANSFORMERS=true` with `SENTIMENT_MODEL_PATH` pointing to the local model. The application sets `local_files_only=True`; it does not download a model. Its separate wrapper rule may assign Neutral based on signal balance. Transformer output only contributes sentiment signals; it does not produce purchase intent.
- **Purchase intent:** Explainable phrase-based features add or subtract fixed heuristic weights. The output is an estimate for the synthetic demonstration, not a trained or calibrated purchase probability. It has no measured accuracy claim and must not be used as a forecast.
- **Insights and recommendation:** Deterministic rules summarize transcript signals and suggest a next action. There is no external AI API or cloud dependency.
- **PDF reports:** Each report includes synthetic call metadata, sentiment and indicative class scores, the heuristic score and caveat, method, insights, behavioral signals, recommendation, transcript, and generation time.

- **Real recording:** `REAL-AUDIO-001` appears only when the root `Demo Audio.mp4` and the files under `artifacts/transcription/`, `artifacts/sentiment/`, and `artifacts/reports/` are present. The API reads the existing artifacts; it does not rerun transcription or sentiment analysis. This is analysis of a recorded call, not a live streaming transcription service.

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

- **Dashboard reports an API error:** Confirm FastAPI listens on port 8000 and `frontend/.env` contains `VITE_API_BASE_URL=http://127.0.0.1:8000`; restart Vite after changing it.
- **Ports 5173 or 8000 are busy:** Stop the conflicting process or use another Vite/uvicorn port.
- **Audio or PDF request returns 404:** Use a listed call ID. The real recording entry requires the original audio and all three artifact files; synthetic WAV files must remain in `backend/media/`.
- **Optional transformer is unavailable:** Install the optional backend ML dependencies and point `SENTIMENT_MODEL_PATH` to an already downloaded model; otherwise the backend uses the lexical fallback.

## Repository hygiene

Local implementation notes and handoff documents stay in the working folder but are ignored by Git; only the root `README.md` is intended to be trackable among Markdown files. Generated reports, environment files, databases, local model weights, uploaded/private media, and build outputs are also ignored. The four synthetic sample WAV recordings remain project assets.
