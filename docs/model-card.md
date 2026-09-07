# Model Card — CC-MRSF-Net-lite

This is a static summary. The live, always-current version (including the most recent training run's metrics) is
served at `GET /model-card` and rendered on the app's Model Transparency page.

## Intended use

Demonstrate a conservation-constrained approach to spatial downscaling of coarse greenhouse-gas emission estimates,
using satellite-derived-style predictor layers, for a hackathon prototype. **Not intended for operational emissions
accounting or policy decisions without validation against real observational data.**

## Architecture

A compact U-Net (2 downsample/upsample stages, skip connections) built in TensorFlow/Keras:

- **Input**: 7 channels at 64×64 — population density, vegetation index, wetland probability, fossil-activity
  proxy, the coarse value broadcast to fine resolution, and x/y coordinate channels.
- **Encoder/decoder**: Conv2D(20)→Conv2D(20) skip @ full res → MaxPool → Conv2D(32)×2 (dropout) skip @ 1/2 res →
  MaxPool → Conv2D(48)×2 bottleneck (dropout) → UpSample+concat → Conv2D(32) → UpSample+concat → Conv2D(20) →
  Conv2D(1) raw logits.
- **Output layer**: `ConservationNormalize` — softplus, per-block sum-pool, divide — a real differentiable hard
  constraint, not a loss-only penalty. See `docs/methodology.md`.

## Training

- 84 samples (6 regions × 2 gases × 6 synthetic time-slice variants), Adam optimizer, lr 3e-3, 180 epochs.
- Loss: Huber(predicted allocation shares, true shares) + 0.0008 × total-variation smoothness.
- `holdout_test=true` retrains with one region fully excluded (spatial generalization test).

## Evaluation (synthetic benchmark)

Representative result (Kolkata Metropolitan Area, CH4): MAE 5.42 vs. baseline 13.25 (**~59% lower**), R² 0.976 vs.
0.849, conservation error 0.0 for all three methods compared (area-weighted, single-predictor, and the trained
model) — conservation is architectural, not a modeling achievement, and holds regardless of prediction quality.

## Uncertainty

MC-Dropout, 12 stochastic passes at inference. Mean → primary product (conservation-exact by linearity).
Percentile P10/P90 → uncertainty bounds (informational, not individually conservation-exact).

## Known limitations

1. Trained and evaluated on procedurally-generated synthetic data — see `docs/limitations.md`.
2. No temporal transformer; "time slices" are independent noise realizations of the same static geography, not a
   physically-simulated time series.
3. Single fused CNN rather than the blueprint's separate satellite/coarse-emission encoders + attention decoder.
4. Small model (~tens of thousands of parameters) sized for a 64×64 demo grid, not validated at production
   satellite resolution.
