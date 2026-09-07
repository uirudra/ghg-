from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Gas = Literal["CO2", "CH4"]
Provenance = Literal["Observed", "Modeled", "ML-downscaled", "AI-explained"]


class Dataset(BaseModel):
    dataset_id: str
    name: str
    provider: str
    role: str
    variable: Gas
    resolution: str
    time_range: str
    provenance: Provenance
    version: str = "v1"
    url: str | None = None


class Region(BaseModel):
    region_id: str
    name: str
    country_code: str
    bbox: list[float]  # [minLon, minLat, maxLon, maxLat]
    population: int | None = None


class GridProduct(BaseModel):
    run_id: str
    region_id: str
    gas: Gas
    resolution_fine_km: float
    coarse_total: float
    fine_total: float
    conservation_error: float
    model_version: str
    stats: dict
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MethaneEvent(BaseModel):
    event_id: str
    gas: Literal["CH4"] = "CH4"
    region_id: str
    lon: float
    lat: float
    source_category: str
    strength_kg_hr: float
    persistence_days: int
    confidence: float
    status: Literal["active", "resolved", "investigating"]
    observed_at: datetime
    provenance: Provenance = "Observed"


class ModelRun(BaseModel):
    run_id: str
    architecture: str
    version: str
    hyperparameters: dict
    metrics: dict
    train_region_ids: list[str]
    validation_region_ids: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CopilotSession(BaseModel):
    session_id: str
    query: str
    provider: Literal["groq", "gemini"]
    retrieved_facts: list[dict]
    response: str
    citations: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Alert(BaseModel):
    alert_id: str
    region_id: str
    gas: Gas
    threshold: float
    event_id: str | None = None
    delivered: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
