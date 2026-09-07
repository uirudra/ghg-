import numpy as np

from app.ml.conservation import allocate, conservation_error


def test_allocate_conserves_mass_for_random_weights():
    rng = np.random.default_rng(42)
    coarse = rng.random((8, 8)) * 1000
    weights = rng.random((64, 64))

    fine = allocate(weights, coarse, factor=8)

    assert conservation_error(fine, coarse, factor=8) < 1e-9


def test_allocate_conserves_mass_for_degenerate_weights():
    """Even near-zero or wildly skewed weights must still conserve exactly —
    this is the failure mode a naive normalization could hit."""
    coarse = np.array([[100.0, 0.0], [50.0, 250.0]])
    weights = np.zeros((4, 4))
    weights[0, 0] = 1.0  # everything else zero within its block

    fine = allocate(weights, coarse, factor=2)

    assert conservation_error(fine, coarse, factor=2) < 1e-9


def test_conservation_error_zero_for_exact_input():
    coarse = np.array([[10.0]])
    fine = np.full((4, 4), 10.0 / 16)
    assert conservation_error(fine, coarse, factor=4) < 1e-12


def test_conservation_error_nonzero_when_violated():
    coarse = np.array([[10.0]])
    fine = np.full((4, 4), 1.0)  # sums to 16, not 10
    err = conservation_error(fine, coarse, factor=4)
    assert err > 0.1
