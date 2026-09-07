"""Stage A baselines from the training strategy: area-weighted (no ML) and a
single-predictor classical baseline, used for the ablation comparison against
CC-MRSF-Net-lite."""

from __future__ import annotations

import numpy as np

from app.ml.conservation import allocate


def area_weighted_baseline(coarse: np.ndarray, factor: int) -> np.ndarray:
    """Every fine pixel in a block gets an equal share — zero spatial detail,
    perfect conservation by construction."""
    weights = np.ones((coarse.shape[0] * factor, coarse.shape[1] * factor))
    return allocate(weights, coarse, factor)


def single_predictor_baseline(coarse: np.ndarray, predictor: np.ndarray, factor: int) -> np.ndarray:
    """Classical ML-free baseline: allocate proportional to one physical
    predictor (e.g. population for CO2, wetland probability for CH4)."""
    return allocate(predictor, coarse, factor)
