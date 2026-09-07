from fastapi import APIRouter

from app.ml.downscaler import COARSE_FACTOR, FINE_SIZE, MC_DROPOUT_SAMPLES, MODEL_VERSION, get_train_metadata

router = APIRouter(tags=["model-card"])


@router.get("/model-card")
async def model_card():
    return {
        "model_version": MODEL_VERSION,
        "architecture": "CC-MRSF-Net-lite: a compact U-Net (2 downsample/upsample stages, skip connections) "
        "over 7 input channels (population, vegetation, wetland, fossil-activity proxies, broadcast coarse value, "
        "x/y coordinates) with a differentiable per-block conservation-normalization output layer implemented in "
        "TensorFlow.",
        "simplifications_vs_blueprint": [
            "Single fused CNN instead of separate satellite/coarse-emission encoders + attention decoder.",
            "No temporal transformer — synthetic 'variants' stand in for time slices without sequence modeling.",
            "Uncertainty via MC-Dropout ensembling (12 stochastic passes) rather than a dedicated quantile head.",
        ],
        "not_simplified": "The conservation layer is a real hard output constraint (per-block softplus + "
        "normalize-then-scale), applied identically to the trained model, both baselines, and every "
        "uncertainty-ensemble member — every map this API returns sums exactly to its coarse input.",
        "grid": {"fine_size": FINE_SIZE, "coarse_size": FINE_SIZE // COARSE_FACTOR, "factor": COARSE_FACTOR},
        "uncertainty_method": f"MC-Dropout, {MC_DROPOUT_SAMPLES} stochastic forward passes, P10/P90 percentile bounds",
        "training": get_train_metadata(),
        "data_realism": "Trained and evaluated entirely on a procedural synthetic benchmark (see docs/limitations.md) "
        "because this environment has no connectivity to the NASA Earthdata / US GHG Center archives. Metrics "
        "(MAE/RMSE/R2/conservation error) are real and reproducible against that synthetic ground truth, but are "
        "NOT validation against real satellite observations.",
        "evaluation_metrics": ["MAE", "RMSE", "R2", "spatial_correlation", "conservation_error"],
        "ablation_baselines": ["area_weighted (Stage A, no ML)", "single_predictor (classical, no ML)"],
    }
