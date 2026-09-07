from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_datasets():
    res = client.get("/datasets")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 12
    assert all("provenance" in d for d in body["datasets"])


def test_list_datasets_filtered_by_gas():
    res = client.get("/datasets?gas=CH4")
    assert res.status_code == 200
    body = res.json()
    assert all(d["variable"] == "CH4" for d in body["datasets"])


def test_list_regions_includes_kolkata():
    res = client.get("/regions")
    assert res.status_code == 200
    ids = [r["region_id"] for r in res.json()["regions"]]
    assert "kolkata-metro" in ids


def test_map_layers():
    res = client.get("/map/layers")
    assert res.status_code == 200
    assert "layers" in res.json()


def test_downscale_run_conserves_mass():
    res = client.post("/downscale/run", json={"region_id": "kolkata-metro", "gas": "CH4"})
    assert res.status_code == 200
    body = res.json()
    assert body["ablation"]["ml_downscaled"]["conservation_error"] < 1e-6
    assert abs(body["totals"]["coarse_total"] - body["totals"]["ml_fine_total"]) < 1e-3


def test_downscale_run_unknown_region_404():
    res = client.post("/downscale/run", json={"region_id": "nowhere", "gas": "CH4"})
    assert res.status_code == 404
