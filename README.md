# GHG Intelligence Nexus

A conservation-constrained ML downscaling platform for CO₂/CH₄ emissions, built for a NASA Space Apps-style
challenge: turn coarse scientific estimates into fine-resolution maps whose totals are provably conserved, surface
methane plume-like events, and let a grounded (never-hallucinating) AI copilot explain it all.

**Read `docs/limitations.md` first.** This build's ML pipeline, conservation math, and AI guardrails are all real
and working — but it runs on procedurally-generated data standing in for the NASA/US GHG Center archives, which
this environment cannot download. Every page in the app says so explicitly.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + MapLibre GL + GSAP
- **Backend**: FastAPI + TensorFlow/Keras (conservation-constrained U-Net) + NumPy
- **Database**: MongoDB Atlas (free tier) — dataset metadata, run results, events, copilot sessions
- **AI**: GroqCloud (fast, primary) with automatic fallback to Gemini

## Quick start (local dev)

### 1. Backend

```bash
cd services/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
uvicorn app.main:app --reload --port 8000
```

The first `/downscale/run` call trains the model (~3-4 min on CPU); it's then cached to
`app/ml/checkpoints/cc_mrsf_net_lite.weights.h5` and every later call loads instantly.

### 2. Frontend

```bash
cd apps/web
npm install
npm run dev
```

Visit http://localhost:3000. Set `NEXT_PUBLIC_API_URL` if the API isn't on `localhost:8000`.

### 3. Environment

Copy `.env.example` to `.env` at the repo root and fill in:

```
MONGODB_URI=...       # percent-encode special characters in the password (@ -> %40 etc.)
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

### Docker

```bash
docker compose up --build
```

## Deploy (Render)

A `render.yaml` blueprint at the repo root defines both services (native Python + Node runtimes, no Docker
required, `free` plan by default):

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint**, connect the repo, apply `render.yaml`.
3. Set the `sync: false` secrets on each service (Render will prompt for them): `MONGODB_URI`, `MONGODB_DB_NAME`,
   `GROQ_API_KEY`, `GEMINI_API_KEY` on `ghg-nexus-api`; nothing extra required for `ghg-nexus-web` besides step 4.
4. After the first deploy, both services have URLs. Set:
   - `ghg-nexus-api` → `API_CORS_ORIGINS` = the web service's URL (e.g. `https://ghg-nexus-web.onrender.com`)
   - `ghg-nexus-web` → `NEXT_PUBLIC_API_URL` = the api service's URL (e.g. `https://ghg-nexus-api.onrender.com`)
   then trigger a manual redeploy of `ghg-nexus-web` so the URL gets baked into the client build.
5. **MongoDB Atlas Network Access**: add `0.0.0.0/0` to the cluster's IP allow-list. Render's outbound IPs aren't
   static on the free/starter plan, so a fixed-IP allow-list entry won't work here — this is a demo cluster with
   no sensitive data, so an open allow-list is the pragmatic choice. Without it the app still runs fully; only
   Mongo persistence is skipped (`/health` reports `mongodb_connected: false`).

The trained model checkpoint (`app/ml/checkpoints/cc_mrsf_net_lite.weights.h5`, ~400KB) is committed on purpose so
a fresh deploy serves pretrained inference immediately instead of a ~4 minute cold-training run on first request.

Dockerfiles (`services/api/Dockerfile`, `apps/web/Dockerfile`) are also provided for `docker compose up --build` or
any Docker-based host — untested against a real Docker daemon in this build environment, so treat them as a
best-effort starting point.

## MongoDB Atlas note

If `/health` reports `mongodb_connected: false`, the API still works fully (in-memory fallback for run results,
Mongo writes are best-effort everywhere) — but check the cluster's **Network Access** allow-list in Atlas; a common
cause is the connecting IP not being whitelisted (add `0.0.0.0/0` for a demo cluster, or the specific IP).

## Project pages

01 Command Center · 02 Explorer · 03 ML Downscaler Lab (hero workflow) · 04 Methane Event Radar ·
05 Natural Carbon Observatory · 06 Region Intelligence · 07 AI Copilot · 08 Decision Studio · 09 Model Transparency

## Docs

- `docs/architecture.md` — system design and request flow
- `docs/methodology.md` — the conservation math and training strategy
- `docs/datasets.md` — the 13 tracked datasets and 7 regions
- `docs/model-card.md` — architecture, training, evaluation, limitations
- `docs/limitations.md` — **the honesty document, read this first**
