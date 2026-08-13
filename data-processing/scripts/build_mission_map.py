"""Build website/src/data/mission-map.json — geography + time for the /missions map.

Dependency-light by design: instead of shipping d3-geo / topojson to the browser,
this script projects a low-resolution Natural Earth land outline
(data/references/ne_110m_land.geojson, public domain) with a plain equirectangular
projection at BUILD time and stores the resulting SVG path string. The runtime only
draws that path and plots markers with the same linear lon/lat -> x/y formula, so
markers and coastlines stay in register with zero map libraries.

It also derives, per mission:
  - a curated operational coordinate (host country / HQ; the P&S hub deployment
    data carries no per-location geometry, so this table is curated and committed),
  - the active span [startYear, endYear] (endYear = expiry year, or the data's
    current year if the mission is open),
  - deployed uniformed strength per calendar year (mean of the monthly series),
    used to size the marker for the selected year.

Usage:  python3 build_mission_map.py
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LAND = REPO / "data" / "references" / "ne_110m_land.geojson"
IMPL = REPO / "website" / "src" / "data" / "mission-implementation.json"
OUT = REPO / "website" / "src" / "data" / "mission-map.json"

# Projection window (degrees): every current & recent UN field mission sits in the
# Atlantic-to-South-Asia band, so we crop to it for an efficient, legible frame.
LON0, LON1 = -95.0, 95.0
LAT0, LAT1 = -38.0, 70.0
W, H = 760.0, 432.0  # ~ (LON1-LON0)/(LAT1-LAT0) aspect

# Curated operational coordinate per mission (lat, lon). Chosen at the mission's
# main area of operations / HQ, nudged where two missions share a city so markers
# don't fully overlap.
COORDS: dict[str, tuple[float, float]] = {
    "MINURSO": (24.2, -13.0),   # Western Sahara
    "MINUSCA": (6.6, 20.9),     # Central African Republic
    "MONUSCO": (-1.5, 27.8),    # eastern DR Congo
    "UNDOF": (33.0, 35.9),      # Golan Heights
    "UNFICYP": (35.1, 33.4),    # Cyprus
    "UNIFIL": (33.2, 35.4),     # south Lebanon
    "UNISFA": (9.5, 28.4),      # Abyei
    "UNMIK": (42.6, 21.0),      # Kosovo
    "UNMISS": (7.0, 30.0),      # South Sudan
    "UNMOGIP": (34.1, 74.4),    # Kashmir (India/Pakistan)
    "UNTSO": (31.6, 35.1),      # Jerusalem / Middle East
    "BINUH": (18.9, -72.3),     # Haiti (nudged N of MINUJUSTH)
    "UNAMA": (34.5, 69.2),      # Afghanistan
    "UNAMI": (33.3, 44.4),      # Iraq
    "UNOCA": (0.4, 9.5),        # Central Africa (Libreville)
    "UNOWAS": (14.7, -17.5),    # West Africa (Dakar)
    "UNRCCA": (37.95, 58.38),   # Central Asia (Ashgabat)
    "UNSCOL": (34.2, 35.9),     # Lebanon (Beirut, nudged from UNIFIL)
    "UNSMIL": (32.9, 13.2),     # Libya
    "UNTMIS": (2.4, 45.3),      # Somalia (nudged from UNSOM)
    "UNVMC": (4.7, -74.1),      # Colombia
    "UNMIL": (6.4, -10.8),      # Liberia
    "UNOCI": (7.5, -5.5),       # Côte d'Ivoire
    "MINUJUSTH": (18.2, -72.6),  # Haiti
    "MINUSMA": (17.0, -3.5),    # Mali
    "UNAMID": (13.5, 24.9),     # Darfur
    "UNIOGBIS": (12.0, -15.0),  # Guinea-Bissau
    "UNMHA": (14.8, 42.95),     # Hodeidah, Yemen
    "UNSOM": (2.05, 45.3),      # Somalia (Mogadishu)
}


def px(lon: float, lat: float) -> tuple[float, float]:
    x = (lon - LON0) / (LON1 - LON0) * W
    y = (LAT1 - lat) / (LAT1 - LAT0) * H
    return x, y


def ring_path(coords: list[list[float]]) -> str | None:
    # Skip rings entirely outside the window (with a margin) to shrink the path.
    if all(
        lon < LON0 - 5 or lon > LON1 + 5 or lat < LAT0 - 5 or lat > LAT1 + 5
        for lon, lat in coords
    ):
        return None
    pts = []
    for lon, lat in coords:
        x, y = px(lon, lat)
        pts.append(f"{x:.1f},{y:.1f}")
    return "M" + "L".join(pts) + "Z"


def land_path() -> str:
    gj = json.loads(LAND.read_text())
    segs: list[str] = []
    for feat in gj["features"]:
        geom = feat["geometry"]
        polys = (
            [geom["coordinates"]]
            if geom["type"] == "Polygon"
            else geom["coordinates"]
        )
        for poly in polys:
            for ring in poly:
                p = ring_path(ring)
                if p:
                    segs.append(p)
    return "".join(segs)


def since_year(m: dict) -> int | None:
    mm = re.search(r"\((\d{4})\)", m.get("initialSymbol") or "")
    if mm:
        return int(mm.group(1))
    if m["renewals"]:
        return int(m["renewals"][0]["date"][:4])
    if m["deployment"]:
        return int(m["deployment"][0]["m"][:4])
    return None


def main() -> None:
    impl = json.loads(IMPL.read_text())
    data_year = int(impl["generated"][:4])

    missions_out = []
    for m in impl["missions"]:
        acr = m["acronym"]
        coord = COORDS.get(acr)
        if not coord:
            continue
        lat, lon = coord

        # yearly deployed strength = mean of monthly uniformed personnel
        by_year: dict[int, list[int]] = defaultdict(list)
        for d in m["deployment"]:
            by_year[int(d["m"][:4])].append(d["n"])
        strength = {y: round(sum(v) / len(v)) for y, v in by_year.items()}

        start = since_year(m)
        if m["open"]:
            end = data_year
        else:
            # closed: end at expiry year, else last deployment/renewal year
            end = None
            if m["mandateExpiry"]:
                end = int(m["mandateExpiry"][:4])
            elif m["deployment"]:
                end = int(m["deployment"][-1]["m"][:4])
            elif m["renewals"]:
                end = int(m["renewals"][-1]["until"][:4])
        missions_out.append(
            {
                "acronym": acr,
                "name": m["name"],
                "location": m["location"],
                "type": m["type"],
                "open": m["open"],
                "lat": lat,
                "lon": lon,
                "startYear": start,
                "endYear": end,
                "strengthByYear": {str(k): v for k, v in sorted(strength.items())},
                "peakStrength": max(strength.values()) if strength else 0,
            }
        )

    years = [
        y
        for m in missions_out
        if m["startYear"]
        for y in [m["startYear"], m["endYear"]]
        if y
    ]
    payload = {
        "generated": impl["generated"],
        "projection": {
            "lon0": LON0,
            "lon1": LON1,
            "lat0": LAT0,
            "lat1": LAT1,
            "w": W,
            "h": H,
        },
        "land": land_path(),
        "minYear": min(years),
        "maxYear": max(years),
        "missions": sorted(missions_out, key=lambda m: m["acronym"]),
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    print(f"{len(missions_out)} missions mapped; years {payload['minYear']}–{payload['maxYear']}")
    print(f"land path length {len(payload['land'])} chars")


if __name__ == "__main__":
    main()
