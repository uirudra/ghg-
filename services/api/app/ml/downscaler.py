from __future__ import annotations

import logging
import threading
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from app.data.regions import REGIONS, get_region
from app.data.synthetic import COARSE_FACTOR, FINE_SIZE, SyntheticScene, build_scene
from app.db.schemas import Gas, Region
from app.ml import baselines, conservation, metrics
from app.ml.model import ConservationNormalize, build_model, make_training_step

logger = logging.getLogger("ghg.ml")

CHECKPOINT_DIR = Path(__file__).resolve().parent / "checkpoints"
CHECKPOINT_DIR.mkdir(exist_ok=True)
WEIGHTS_PATH = CHECKPOINT_DIR / "cc_mrsf_net_lite.weights.h5"

IN_CHANNELS = 7
TRAIN_VARIANTS = 6  # synthetic "time slices" per region used as training samples
MC_DROPOUT_SAMPLES = 12
MODEL_VERSION = "cc-mrsf-net-lite-tf-v1"

_lock = threading.Lock()
_model: keras.Model | None = None
_train_metadata: dict | None = None


def _feature_stack(scene: SyntheticScene) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns (features[H,W,7], coarse_broadcast[H,W], coarse_grid[coarse,coarse])."""
    coarse = scene.coarse_grid()
    coarse_broadcast = np.repeat(np.repeat(coarse, COARSE_FACTOR, axis=0), COARSE_FACTOR, axis=1)
    coarse_norm = coarse_broadcast / (coarse_broadcast.max() + 1e-9)

    ys, xs = np.mgrid[0:FINE_SIZE, 0:FINE_SIZE]
    x_norm = xs / (FINE_SIZE - 1)
    y_norm = ys / (FINE_SIZE - 1)

    stack = np.stack(
        [scene.population, scene.vegetation, scene.wetland, scene.fossil_activity, coarse_norm, x_norm, y_norm],
        axis=-1,
    ).astype(np.float32)
    return stack, coarse_broadcast, coarse


def _target_shares(scene: SyntheticScene, coarse_broadcast: np.ndarray) -> np.ndarray:
    shares = scene.fine_truth / (coarse_broadcast + 1e-9)
    return shares[..., np.newaxis].astype(np.float32)


def _build_training_set(holdout_region_id: str | None) -> tuple[np.ndarray, np.ndarray, list[str], list[str]]:
    xs, ys = [], []
    used_regions, held_out = [], []
    for region in REGIONS:
        if region.region_id == holdout_region_id:
            held_out.append(region.region_id)
            continue
        used_regions.append(region.region_id)
        for gas in ("CO2", "CH4"):
            for variant in range(TRAIN_VARIANTS):
                scene = build_scene(region, gas, variant)  # type: ignore[arg-type]
                feats, coarse_broadcast, _ = _feature_stack(scene)
                target = _target_shares(scene, coarse_broadcast)
                xs.append(feats)
                ys.append(target)
    return np.stack(xs), np.stack(ys), used_regions, held_out


def _train(holdout_region_id: str | None, epochs: int = 180) -> keras.Model:
    logger.info("Training CC-MRSF-Net-lite (holdout=%s, epochs=%s)...", holdout_region_id, epochs)
    x_train, y_train, used_regions, held_out = _build_training_set(holdout_region_id)

    model = build_model(FINE_SIZE, IN_CHANNELS)
    optimizer = keras.optimizers.Adam(learning_rate=3e-3)
    train_step = make_training_step(model, optimizer)

    x_t = tf.convert_to_tensor(x_train)
    y_t = tf.convert_to_tensor(y_train)
    n = x_t.shape[0]
    batch_size = min(8, n)

    history = []
    for epoch in range(epochs):
        perm = np.random.permutation(n)
        epoch_loss = 0.0
        for start in range(0, n, batch_size):
            idx = perm[start : start + batch_size]
            loss, recon, smooth = train_step(tf.gather(x_t, idx), tf.gather(y_t, idx))
            epoch_loss += float(loss) * len(idx)
        history.append(epoch_loss / n)

    model.save_weights(str(WEIGHTS_PATH))
    global _train_metadata
    _train_metadata = {
        "model_version": MODEL_VERSION,
        "epochs": epochs,
        "train_region_ids": used_regions,
        "holdout_region_ids": held_out,
        "final_loss": history[-1],
        "loss_curve_tail": history[-5:],
        "train_samples": int(n),
    }
    logger.info("Training complete. Final loss=%.5f", history[-1])
    return model


def get_model(force_retrain: bool = False, holdout_region_id: str | None = None) -> keras.Model:
    global _model
    with _lock:
        if _model is not None and not force_retrain:
            return _model
        if WEIGHTS_PATH.exists() and not force_retrain:
            model = build_model(FINE_SIZE, IN_CHANNELS)
            model.build((None, FINE_SIZE, FINE_SIZE, IN_CHANNELS))
            model.load_weights(str(WEIGHTS_PATH))
            global _train_metadata
            _train_metadata = _train_metadata or {
                "model_version": MODEL_VERSION,
                "note": "loaded from checkpoint; metadata unavailable until next retrain",
            }
            _model = model
            return _model
        _model = _train(holdout_region_id)
        return _model


def get_train_metadata() -> dict:
    return _train_metadata or {"model_version": MODEL_VERSION, "note": "not yet trained this process"}


def run_downscale(region_id: str, gas: Gas, variant: int = 0, holdout_test: bool = False) -> dict:
    """
    Full hero-workflow pipeline: build the (synthetic) scene, run the trained
    conservation-constrained model with MC-Dropout uncertainty, and score the
    result against the known synthetic ground truth and two baselines.

    If holdout_test=True, the model used is retrained excluding this region
    entirely (Stage F — spatial generalization test) rather than the cached
    model, which may have seen this region during training.
    """
    region = get_region(region_id)
    if region is None:
        raise ValueError(f"Unknown region_id: {region_id}")

    scene = build_scene(region, gas, variant)
    feats, coarse_broadcast, coarse = _feature_stack(scene)

    model = get_model(force_retrain=holdout_test, holdout_region_id=region_id if holdout_test else None)

    x = tf.convert_to_tensor(feats[np.newaxis, ...])
    mc_shares = []
    for _ in range(MC_DROPOUT_SAMPLES):
        shares = model(x, training=True).numpy()[0, :, :, 0]  # dropout active -> stochastic
        mc_shares.append(shares)
    mc_shares = np.stack(mc_shares)  # (K, H, W)

    mean_shares = mc_shares.mean(axis=0)  # still sums to 1 per block (linear combination)
    p10_shares = np.percentile(mc_shares, 10, axis=0)
    p90_shares = np.percentile(mc_shares, 90, axis=0)

    ml_fine = mean_shares * coarse_broadcast
    ml_fine = conservation.allocate(np.clip(ml_fine, 1e-9, None), coarse, COARSE_FACTOR)  # re-assert exactness
    p10_fine = p10_shares * coarse_broadcast
    p90_fine = p90_shares * coarse_broadcast

    baseline_area = baselines.area_weighted_baseline(coarse, COARSE_FACTOR)
    dominant_predictor = scene.wetland if gas == "CH4" else scene.population
    baseline_single = baselines.single_predictor_baseline(coarse, dominant_predictor, COARSE_FACTOR)

    truth = scene.fine_truth

    def score(pred: np.ndarray) -> dict:
        return {
            "mae": round(metrics.mae(pred, truth), 4),
            "rmse": round(metrics.rmse(pred, truth), 4),
            "r2": round(metrics.r2(pred, truth), 4),
            "spatial_correlation": round(metrics.spatial_correlation(pred, truth), 4),
            "conservation_error": round(conservation.conservation_error(pred, coarse, COARSE_FACTOR), 8),
        }

    return {
        "region": region.model_dump(),
        "gas": gas,
        "variant": variant,
        "model_version": MODEL_VERSION if not holdout_test else f"{MODEL_VERSION}-holdout-{region_id}",
        "grid": {
            "fine_size": FINE_SIZE,
            "coarse_size": FINE_SIZE // COARSE_FACTOR,
            "factor": COARSE_FACTOR,
        },
        "maps": {
            "ml_downscaled": ml_fine.round(3).tolist(),
            "uncertainty_p10": p10_fine.round(3).tolist(),
            "uncertainty_p90": p90_fine.round(3).tolist(),
            "coarse_input": coarse.round(3).tolist(),
            "baseline_area_weighted": baseline_area.round(3).tolist(),
            "baseline_single_predictor": baseline_single.round(3).tolist(),
            "synthetic_reference_truth": truth.round(3).tolist(),
        },
        "predictors": {
            "population": scene.population.round(3).tolist(),
            "vegetation": scene.vegetation.round(3).tolist(),
            "wetland": scene.wetland.round(3).tolist(),
            "fossil_activity": scene.fossil_activity.round(3).tolist(),
        },
        "totals": {
            "coarse_total": round(float(coarse.sum()), 3),
            "ml_fine_total": round(float(ml_fine.sum()), 3),
        },
        "ablation": {
            "ml_downscaled": score(ml_fine),
            "baseline_area_weighted": score(baseline_area),
            "baseline_single_predictor": score(baseline_single),
        },
        "provenance": {
            "coarse_input": "Modeled (synthetic proxy standing in for OCO-2 MIP / GOSAT top-down budgets)",
            "ml_downscaled": "ML-downscaled",
            "synthetic_reference_truth": "Synthetic benchmark ground truth (not a satellite observation)",
        },
    }
