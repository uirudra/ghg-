"""
Provider-agnostic grounding + fallback layer (Sec. 8, 11 of the blueprint).
Every AI call is given a structured evidence bundle and both providers sit
behind this one interface so the rest of the app never talks to Groq/Gemini
directly. If the preferred provider fails or is rate-limited, the other one
is tried automatically.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Literal

from app.ai import gemini_provider, groq_provider
from app.data.registry import DATASETS
from app.data.regions import get_region

logger = logging.getLogger("ghg.ai.grounding")

Provider = Literal["groq", "gemini"]

DATA_REALISM_NOTICE = (
    "This deployment does not have live connectivity to the NASA Earthdata / US GHG Center archives. "
    "All numeric grid, event, and metric values are produced by a procedural generator that is physically "
    "structured (driven by land-cover/population/wetland proxies with realistic magnitudes) but is NOT an "
    "ingestion of real satellite granules. This is a transparent, documented substitution — see docs/limitations.md."
)


def build_evidence_bundle(region_id: str | None, gas: str | None, computed: dict | None = None) -> dict:
    bundle: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_realism": DATA_REALISM_NOTICE,
        "datasets": [],
        "region": None,
        "computed": computed or {},
    }
    if gas:
        bundle["datasets"] = [d.model_dump() for d in DATASETS if d.variable == gas]
    else:
        bundle["datasets"] = [d.model_dump() for d in DATASETS]

    if region_id:
        region = get_region(region_id)
        if region:
            bundle["region"] = region.model_dump()

    return bundle


def _try(provider: Provider, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if provider == "groq":
        return groq_provider.complete(system_prompt, user_prompt, max_tokens=max_tokens)
    return gemini_provider.complete(system_prompt, user_prompt, max_tokens=max_tokens)


def complete_with_fallback(
    system_prompt: str, evidence: dict, question: str, prefer: Provider = "groq", max_tokens: int = 1600
) -> dict:
    """Returns {provider, response, evidence}. Tries `prefer` first, falls back
    to the other provider on any exception (rate limit, auth, network)."""
    user_prompt = f"EVIDENCE JSON:\n{json.dumps(evidence, default=str)}\n\nQUESTION:\n{question}"
    order: list[Provider] = [prefer, "gemini" if prefer == "groq" else "groq"]

    last_error: Exception | None = None
    for provider in order:
        try:
            text = _try(provider, system_prompt, user_prompt, max_tokens)
            return {"provider": provider, "response": text, "evidence": evidence, "fallback_used": provider != prefer}
        except Exception as exc:  # noqa: BLE001
            logger.warning("Provider %s failed: %s", provider, exc)
            last_error = exc
            continue

    return {
        "provider": None,
        "response": (
            "Both AI providers (Groq and Gemini) are currently unavailable, so I can't generate a grounded "
            f"response right now. Underlying error: {last_error}"
        ),
        "evidence": evidence,
        "fallback_used": True,
        "error": str(last_error) if last_error else None,
    }
