"""
The core scientific guarantee of the platform: given any positive fine-grid
weight field and the coarse-grid scientific estimate it must respect, produce
a fine-grid emission field whose per-coarse-cell sum equals the coarse value
to floating-point tolerance (Sec. 5 of the blueprint — "the network learns
WHERE, the scientific estimate controls HOW MUCH").

This is a hard output transformation (not a soft loss term): it is applied
identically to the trained model's output, to naive baselines, and to
individual uncertainty-ensemble members, so every product this API returns is
conservation-exact by construction.
"""

from __future__ import annotations

import numpy as np

EPS = 1e-9


def allocate(weights: np.ndarray, coarse: np.ndarray, factor: int) -> np.ndarray:
    """
    weights: (fine, fine) positive allocation weights
    coarse: (coarse, coarse) scientific totals to preserve per block
    factor: fine_size / coarse_size
    returns: (fine, fine) field where each `factor x factor` block sums to
             the corresponding coarse cell value.
    """
    w = np.clip(weights, EPS, None)
    coarse_size = coarse.shape[0]
    fine_size = coarse_size * factor

    block_sums = w.reshape(coarse_size, factor, coarse_size, factor).sum(axis=(1, 3))
    block_sums = np.clip(block_sums, EPS, None)

    scale = coarse / block_sums  # (coarse, coarse)
    scale_upsampled = np.repeat(np.repeat(scale, factor, axis=0), factor, axis=1)
    allocated = w * scale_upsampled
    return allocated.reshape(fine_size, fine_size) if allocated.shape != (fine_size, fine_size) else allocated


def conservation_error(fine: np.ndarray, coarse: np.ndarray, factor: int) -> float:
    coarse_size = coarse.shape[0]
    block_sums = fine.reshape(coarse_size, factor, coarse_size, factor).sum(axis=(1, 3))
    diff = np.abs(block_sums - coarse)
    total = np.abs(coarse).sum()
    return float(diff.sum() / total) if total > EPS else 0.0
