from __future__ import annotations

import numpy as np


def mae(pred: np.ndarray, truth: np.ndarray) -> float:
    return float(np.mean(np.abs(pred - truth)))


def rmse(pred: np.ndarray, truth: np.ndarray) -> float:
    return float(np.sqrt(np.mean((pred - truth) ** 2)))


def r2(pred: np.ndarray, truth: np.ndarray) -> float:
    ss_res = np.sum((truth - pred) ** 2)
    ss_tot = np.sum((truth - truth.mean()) ** 2)
    if ss_tot < 1e-9:
        return 0.0
    return float(1 - ss_res / ss_tot)


def spatial_correlation(pred: np.ndarray, truth: np.ndarray) -> float:
    p = pred.flatten()
    t = truth.flatten()
    if p.std() < 1e-9 or t.std() < 1e-9:
        return 0.0
    return float(np.corrcoef(p, t)[0, 1])
