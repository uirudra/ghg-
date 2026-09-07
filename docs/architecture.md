# Architecture

```
ghg-intelligence-nexus/
  apps/web/            Next.js 15 (App Router) + TypeScript + Tailwind + MapLibre GL + GSAP
  services/api/
    app/
      main.py          FastAPI app, CORS, startup (Mongo ping + index creation)
      config.py        pydantic-settings, loads repo-root .env
      db/               mongo.py, schemas.py, indexes.py
      data/             registry.py (13 dataset records), regions.py (7 regions), synthetic.py (procedural scenes)
      ml/               conservation.py, model.py (TF Keras), downscaler.py (train/infer), events.py, baselines.py, metrics.py
      ai/               groq_provider.py, gemini_provider.py, grounding.py, prompts.py
      routers/          datasets, map, downscale, events, copilot, decision_brief, model_card
  docs/                 this folder
  docker-compose.yml
  .env / .env.example
```

## Request flow (hero workflow)

1. Frontend `RegionGasPicker` sets `region_id` / `gas` in a shared React context (`SelectionContext`), persisted to
   `localStorage`.
2. `POST /downscale/run` → `app/ml/downscaler.run_downscale()`:
   - builds a procedural scene (`app/data/synthetic.SyntheticScene`) for the region/gas/variant,
   - loads (or trains, on first boot) `CC-MRSF-Net-lite` from `app/ml/checkpoints/`,
   - runs 12 MC-Dropout stochastic forward passes,
   - passes every candidate field through `conservation.allocate()` so it sums exactly to the coarse input,
   - scores the ML result and two baselines (area-weighted, single-predictor) against the synthetic ground truth,
   - best-effort persists a `grid_products` document to MongoDB (never blocks the response if Mongo is down).
3. The frontend renders coarse vs. ML-downscaled as a canvas heatmap (`HeatGrid`), a live conservation proof
   (`ConservationCard`), and an ablation table.
4. `POST /copilot/query` and `POST /decision-brief` build a structured **evidence bundle** (dataset metadata +
   region + the caller's last downscale result / top methane events) and pass it to
   `app/ai/grounding.complete_with_fallback()`, which tries GroqCloud first and falls back to Gemini automatically
   on any exception (rate limit, auth, network). Every response is scored against the system prompt's guardrails
   (see `app/ai/prompts.py`).

## Why MongoDB writes are all best-effort

Every router wraps its Mongo write in try/except and logs a warning on failure rather than raising. This means the
whole app stays fully functional (with an in-memory fallback cache for `/downscale/{run_id}`) even if the Atlas
cluster is temporarily unreachable — which happened during development (see the Atlas Network Access note in the
README) and is a realistic failure mode for a free-tier cluster a judge might hit mid-demo.
