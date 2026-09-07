"""
A curated set of real-world regions with real bounding boxes, chosen to give
the demo scientifically interesting contrasts: a fossil hotspot, a wetland
methane source, a mixed urban/agricultural basin, and a boreal control region.
Population figures are order-of-magnitude approximations for demo purposes.
"""

from app.db.schemas import Region

REGIONS: list[Region] = [
    Region(
        region_id="permian-basin",
        name="Permian Basin, Texas/New Mexico",
        country_code="US",
        bbox=[-104.2, 30.8, -101.6, 33.2],
        population=650_000,
    ),
    Region(
        region_id="sundarbans-delta",
        name="Sundarbans Delta, Bangladesh/India",
        country_code="BD",
        bbox=[88.0, 21.4, 89.6, 22.6],
        population=4_500_000,
    ),
    Region(
        region_id="central-valley",
        name="Central Valley, California",
        country_code="US",
        bbox=[-121.9, 35.0, -119.0, 39.5],
        population=6_500_000,
    ),
    Region(
        region_id="congo-basin",
        name="Congo Basin, DRC",
        country_code="CD",
        bbox=[17.5, -3.0, 25.5, 2.5],
        population=9_200_000,
    ),
    Region(
        region_id="west-siberian-lowland",
        name="West Siberian Lowland",
        country_code="RU",
        bbox=[68.0, 60.0, 78.0, 65.0],
        population=1_100_000,
    ),
    Region(
        region_id="ruhr-valley",
        name="Ruhr Valley, Germany",
        country_code="DE",
        bbox=[6.6, 51.3, 7.9, 51.7],
        population=5_100_000,
    ),
    Region(
        region_id="kolkata-metro",
        name="Kolkata Metropolitan Area & East Kolkata Wetlands",
        country_code="IN",
        bbox=[88.20, 22.35, 88.55, 22.75],
        population=14_900_000,
    ),
]


def get_region(region_id: str) -> Region | None:
    return next((r for r in REGIONS if r.region_id == region_id), None)
