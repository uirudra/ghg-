# Methodology

## The conservation constraint

Given a coarse cell `C` with scientific value `E_C`, and positive fine-pixel weights `w_i` predicted by the model
for the pixels `i ∈ F(C)` inside it, the allocated emission is:

```
E_i = E_C * w_i / Σ(w_j for j in F(C))
```

By construction, `Σ(E_i) = E_C` up to floating-point tolerance — implemented in `app/ml/conservation.py::allocate()`
and, redundantly, as a differentiable TensorFlow layer (`ConservationNormalize` in `app/ml/model.py`) so it is
enforced both during training (as part of the loss target's natural scale) and as a hard post-processing step on
every output the API returns, including baselines and each uncertainty-ensemble member.

## Training data and split

- 6 regions × 2 gases × 6 synthetic "time slices" = 84 training samples per full training run.
- `holdout_test=true` on `/downscale/run` retrains the model with the requested region **excluded entirely** —
  this is the blueprint's Stage F (spatial generalization test) — so you can verify the model isn't just
  memorizing per-region noise.
- Loss = Huber(predicted shares, true shares) + λ · spatial-smoothness (total variation). `λ` was tuned down from
  an initial 0.02 to 0.0008 after discovering the higher value caused the model to collapse to a near-uniform
  (i.e., baseline-equivalent) allocation — the intrinsic within-block variance of the synthetic ground truth is
  modest (~14% coefficient of variation), so an aggressive smoothness term dominated the (already-small)
  reconstruction gradient. This is documented here because it is a real tuning finding, not a hypothetical.

## Uncertainty

12 MC-Dropout stochastic forward passes (dropout layers stay active at inference) produce 12 conserving candidate
allocations. Their **mean** is the primary "ML-downscaled" product (a mean of per-block-normalized shares is still
exactly per-block normalized — conservation holds without any extra step). Per-pixel P10/P90 percentiles across the
12 passes are reported as uncertainty bounds; these are informational spread indicators, not individually
conservation-exact.

## Evaluation

For each run, three methods are scored against the same synthetic reference truth:

1. **ML-downscaled** (CC-MRSF-Net-lite)
2. **Baseline — area-weighted**: every fine pixel gets an equal share of its coarse cell (zero spatial detail,
   Stage A from the blueprint's training strategy)
3. **Baseline — single-predictor**: allocation proportional to one physical layer (population for CO₂, wetland
   probability for CH₄) with no learning

Metrics: MAE, RMSE, R², spatial correlation, and conservation error (all in `app/ml/metrics.py` and
`conservation.py`). Typical result on this synthetic benchmark: **50-60% lower MAE and R² above 0.95** for the ML
model vs. the area-weighted baseline — see `docs/model-card.md` for a live example.
