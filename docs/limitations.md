# Limitations

This is the single most important document in this repository. Read it before presenting, judging, or extending
this project.

## What is real

- **The conservation-constrained downscaling algorithm** (`services/api/app/ml/conservation.py`,
  `services/api/app/ml/model.py`) is a genuine, working implementation: a TensorFlow U-Net with a differentiable
  per-block normalization layer that forces every fine-pixel allocation to sum exactly to its coarse input. This is
  not simulated or hard-coded — it is trained and verified live, and the conservation error you see in the UI is
  computed from the actual output array, not a canned number.
- **The MAE / RMSE / R² / spatial-correlation metrics** are real, computed against a known synthetic ground truth
  (see below). The ~55-60% MAE improvement over the area-weighted baseline is measured, not asserted.
- **MongoDB Atlas, GroqCloud, and Gemini integrations** are real API calls with real credentials, not mocked.
- **The AI guardrails** (grounded evidence bundles, provenance labeling, "insufficient evidence" fallback) are
  enforced by the actual system prompt and are visible in the Copilot/Decision Studio's real responses.

## What is NOT real

- **This deployment has no network access to the NASA Earthdata / US GHG Center archives.** Those are large
  (multi-GB), often auth-gated granules that could not be downloaded and ingested in this build environment.
- Every dataset value — coarse grids, fine predictor layers (population/vegetation/wetland/fossil-activity),
  methane events — is produced by `services/api/app/data/synthetic.py` and `app/ml/events.py`: a **procedural
  generator** using multi-octave value noise shaped by a per-region land-use profile, with realistic orders of
  magnitude but no connection to an actual satellite pixel.
- The "synthetic reference truth" used to score the downscaler is the noise field the generator itself produced —
  i.e., the benchmark is internally consistent and useful for demonstrating the *method*, but it is **not**
  validation against real observations.
- Regions, bounding boxes, and populations are real (e.g., Kolkata's East Kolkata Wetlands are a real Ramsar site),
  but the emission values overlaid on them are illustrative.

## Deliberate deviations from the original blueprint

- **TensorFlow instead of PyTorch** for the neural downscaler, per explicit user instruction.
- **CC-MRSF-Net-lite** is a compact single-U-Net realization of the blueprint's multi-encoder/attention-decoder
  architecture — see `docs/model-card.md` for the exact simplifications and what was deliberately kept faithful
  (the conservation layer).
- Event intelligence uses procedurally-generated plume candidates rather than ingested EMIT granules.

## Bottom line

Treat every number this app displays as **"what the method would produce given real data of this shape"**, not as
a real-world emissions estimate. The Model Transparency page and every AI response carry this caveat by design —
removing or softening that framing anywhere in this codebase would misrepresent the platform's actual capability.
