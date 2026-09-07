# Datasets

The 13 datasets named in the project blueprint are registered as metadata in
`services/api/app/data/registry.py` and served via `GET /datasets`. Per the blueprint's MongoDB guidance, **no raw
rasters are ever stored** — only metadata (provider, role, resolution, provenance).

| Dataset | Provider | Role | Provenance |
|---|---|---|---|
| OCO-2 GEOS Column CO2 | NASA GES DISC | Atmospheric/top-down context | Observed |
| OCO-2 MIP Top-down CO2 Budgets | NASA / Global Carbon Project | CO2 conservation reference | Modeled |
| ODIAC Fossil Fuel CO2 | NIES / Tohoku University | Fine fossil-fuel prior | Modeled |
| MiCASA Land Carbon Flux | NASA GSFC | Natural carbon features | Modeled |
| LPJ-EOSIM Wetland CH4 | US GHG Center | Wetland methane prior | Modeled |
| ECCO-Darwin Air-Sea CO2 Flux | NASA JPL | Ocean sink layer | Modeled |
| GOSAT-based CH4 Budgets | JAXA / NIES | Top-down methane totals | Modeled |
| TM5-4DVar CH4 Fluxes | SRON / Global Carbon Project | Independent methane source classes | Modeled |
| EMIT CH4 Plume Complexes | NASA JPL | Large methane event evidence | Observed |
| NOAA CO2 / CH4 Surface Network | NOAA GML | Long-term atmospheric context | Observed |
| U.S. Anthropogenic CH4 | EPA / US GHG Center | Detailed human methane layer | Modeled |
| Gridded Population of the World | NASA SEDAC | Exposure/population weighting | Observed |

## Regions

Seven real-world regions with real bounding boxes, chosen for scientifically interesting contrast:

- **Permian Basin** (US) — fossil/oil & gas dominant
- **Sundarbans Delta** (BD/IN) — wetland-dominant, high natural CH4
- **Central Valley** (US) — mixed urban/agricultural
- **Congo Basin** (CD) — forest + wetland, natural carbon sink/source
- **West Siberian Lowland** (RU) — boreal wetland, high-latitude control
- **Ruhr Valley** (DE) — dense urban/industrial
- **Kolkata Metropolitan Area & East Kolkata Wetlands** (IN) — dense urban core directly adjacent to a real Ramsar
  wetland site, giving a sharp urban/wetland contrast within one bounding box

## Why synthetic, not ingested

See `docs/limitations.md`. In short: this environment has no access to the actual NASA Earthdata / US GHG Center
archives (large, often auth-gated granules). `app/data/synthetic.py` generates a physically-structured stand-in
using the same land-use logic (population, vegetation, wetland, fossil-activity) a real ingestion pipeline would
condition on, so the downscaling method itself is exercised faithfully even though the input values are not real
satellite measurements.
