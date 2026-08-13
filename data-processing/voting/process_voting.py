"""Process harvested UN Digital Library "Voting Data" MARCXML into the two
JSON files the website ships with.

Inputs
------
1. Raw search-page MARCXML from harvest_dl_voting.mjs (external disk):
   /Volumes/SSDAStorage/un-voting-data/raw/search-pages/vd-YYYY-pNN.xml
   Per record: 791$a resolution symbol, 981$a body, 992$a vote date,
   967 repeated per country ($c ISO3, $d Y/N/A, missing $d = absent).
2. Voeten/Bailey/Strezhnev ideal point estimates (Harvard Dataverse
   doi:10.7910/DVN/LEJUQZ, file Idealpointestimates1946-2025.tab), cached at
   /Volumes/SSDAStorage/un-voting-data/Idealpointestimates1946-2025.tab.

Outputs (committed to the repo)
-------------------------------
website/src/data/voting/vote-details.json
    {countries: {iso3: name},
     votes: {symbol_normalized: {d: date, t: body, y: yes count,
             x: absent count, n: [iso3 against], a: [iso3 abstaining]}}}

website/src/data/voting/voting-analysis.json
    Aggregates for the /secretariat geopolitics expander:
    - countries: iso3 -> display name
    - gaCoverage: {from, to, votes} (GA plenary recorded votes used)
    - order: iso3[] ordered by latest Voeten ideal point (West -> non-West);
      countries without ideal points appended by name
    - matrix: percent agreement (0-100 ints) between ordered countries on GA
      plenary votes both participated in (Y/N/A identical; absences excluded;
      pairs with < MIN_COMMON common votes -> null)
    - loneliest: countries most often on the losing 1-2 country side of a GA
      "No" vote
    - idealPoints: {years, percentiles: {p10,p25,p50,p75,p90 per year},
      series: {iso3: (value|null)[] per year}} from the Voeten data

Run:  python3 voting/process_voting.py   (from data-processing/; stdlib only,
      deliberately not part of the uv package so it can run standalone)
"""

from __future__ import annotations

import csv
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

RAW_DIR = Path("/Volumes/SSDAStorage/un-voting-data/raw/search-pages")
IDEAL_POINTS = Path(
    "/Volumes/SSDAStorage/un-voting-data/Idealpointestimates1946-2025.tab"
)
REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "website" / "src" / "data" / "voting"

NS = {"m": "http://www.loc.gov/MARC21/slim"}
MIN_COMMON = 50  # minimum common votes for a similarity-matrix pair
LONELY_MAX_NO = 2  # a "No" is lonely when at most this many countries said No
SERIES_COUNTRIES = [  # labeled trajectories in the ideal-point chart (max 7
    "USA",  # series — the palette is validated for exactly this set)
    "ISR",
    "GBR",
    "UKR",
    "RUS",
    "IND",
    "CHN",
]


def title_case_country(name: str) -> str:
    """MARC 967$e names are ALL CAPS; make them presentable."""
    small = {"of", "the", "and", "da", "de", "del", "d'ivoire", "am"}
    words = name.strip().title().split()
    out = [
        w.lower() if w.lower() in small and i > 0 else w
        for i, w in enumerate(words)
    ]
    s = " ".join(out)
    # Common fixups the naive title-case gets wrong.
    for a, b in [
        ("Cote D'Ivoire", "Côte d'Ivoire"),
        ("Turkiye", "Türkiye"),
        ("Democratic People'S", "Democratic People's"),
        ("People'S", "People's"),
        ("(Islamic Republic Of)", "(Islamic Republic of)"),
        ("(Bolivarian Republic Of)", "(Bolivarian Republic of)"),
        ("(Plurinational State Of)", "(Plurinational State of)"),
        ("(Federated States Of)", "(Federated States of)"),
        ("Usa", "USA"),
        ("Uk ", "UK "),
    ]:
        s = s.replace(a, b)
    return s


def parse_records() -> dict[int, dict]:
    """Parse all raw search pages; dedupe by recid."""
    records: dict[int, dict] = {}
    for path in sorted(RAW_DIR.glob("vd-*.xml")):
        root = ET.parse(path).getroot()
        for rec in root.findall("m:record", NS):
            recid_el = rec.find("m:controlfield[@tag='001']", NS)
            if recid_el is None or not recid_el.text:
                continue
            recid = int(recid_el.text)
            if recid in records:
                continue

            def df(tag: str, code: str) -> str | None:
                el = rec.find(
                    f"m:datafield[@tag='{tag}']/m:subfield[@code='{code}']", NS
                )
                return el.text if el is not None else None

            symbol = df("791", "a")
            if not symbol:
                continue
            votes: dict[str, str] = {}
            names: dict[str, str] = {}
            for f in rec.findall("m:datafield[@tag='967']", NS):
                iso = f.find("m:subfield[@code='c']", NS)
                vote = f.find("m:subfield[@code='d']", NS)
                name = f.find("m:subfield[@code='e']", NS)
                if iso is None or not iso.text:
                    continue
                votes[iso.text] = (
                    vote.text if vote is not None and vote.text else "X"
                )  # X = absent / non-voting
                if name is not None and name.text:
                    names[iso.text] = name.text
            records[recid] = {
                "symbol": symbol.strip(),
                "body": df("981", "a") or "",
                "date": df("992", "a") or "",
                "votes": votes,
                "names": names,
            }
    return records


def norm_symbol(s: str) -> str:
    return re.sub(r"\s+", "", s).upper()


def body_code(body: str, symbol: str) -> str:
    if symbol.startswith("S/"):
        return "SC"
    if symbol.startswith("A/HRC/"):
        return "HRC"
    if symbol.startswith(("A/RES", "A/")):
        return "GA"
    if symbol.startswith("E/"):
        return "ECOSOC"
    return body or "?"


def main() -> None:
    records = parse_records()
    print(f"parsed {len(records)} unique voting records")

    # ---- country name registry (prefer the most recent spelling) -----------
    country_names: dict[str, str] = {}
    for rec in sorted(records.values(), key=lambda r: r["date"]):
        for iso, name in rec["names"].items():
            country_names[iso] = title_case_country(name)

    # ---- 1) per-resolution minority details for the detail strip -----------
    details: dict[str, dict] = {}
    for rec in records.values():
        v = rec["votes"]
        if not v:
            # The collection also has records for consensus adoptions (no 967
            # fields); the detail strip already covers those via vote_summary.
            continue
        key = norm_symbol(rec["symbol"])
        details[key] = {
            "d": rec["date"],
            "t": body_code(rec["body"], rec["symbol"]),
            "y": sum(1 for x in v.values() if x == "Y"),
            "x": sum(1 for x in v.values() if x == "X"),
            "n": sorted(iso for iso, x in v.items() if x == "N"),
            "a": sorted(iso for iso, x in v.items() if x == "A"),
        }

    # ---- GA plenary universe for the analysis ------------------------------
    ga = [
        r
        for r in records.values()
        if r["symbol"].startswith("A/RES/") and r["votes"]
    ]
    ga_years = sorted({r["date"][:4] for r in ga if r["date"]})
    print(f"GA plenary recorded votes: {len(ga)} ({ga_years[0]}-{ga_years[-1]})")

    # ---- 2a) pairwise agreement on GA votes --------------------------------
    isos = sorted({iso for r in ga for iso in r["votes"]})
    idx = {iso: i for i, iso in enumerate(isos)}
    k = len(isos)
    common = [[0] * k for _ in range(k)]
    agree = [[0] * k for _ in range(k)]
    for r in ga:
        cast = [(idx[i], x) for i, x in r["votes"].items() if x in "YNA"]
        for p in range(len(cast)):
            ip, xp = cast[p]
            for q in range(p + 1, len(cast)):
                iq, xq = cast[q]
                common[ip][iq] += 1
                if xp == xq:
                    agree[ip][iq] += 1

    # ---- order countries by latest Voeten ideal point -----------------------
    # Voeten keeps Serbia on the historical Yugoslavia code.
    ISO_FIXUPS = {"YUG": "SRB"}
    ideal_latest: dict[str, float] = {}
    ideal_rows: list[dict] = []
    with IDEAL_POINTS.open() as f:
        for row in csv.DictReader(f, delimiter="\t"):
            iso = row["iso3c"].strip('"')
            iso = ISO_FIXUPS.get(iso, iso)
            year = int(row["year"])
            val = float(row["IdealPointFP"])
            ideal_rows.append({"iso": iso, "year": year, "v": val})
            if iso not in ideal_latest or year >= ideal_latest[iso][0]:
                ideal_latest[iso] = (year, val)
    with_ip = [i for i in isos if i in ideal_latest]
    without_ip = [i for i in isos if i not in ideal_latest]
    order = sorted(with_ip, key=lambda i: -ideal_latest[i][1]) + sorted(
        without_ip, key=lambda i: country_names.get(i, i)
    )
    print(f"countries: {k} ({len(without_ip)} without ideal points)")

    matrix: list[list[int | None]] = []
    for a in order:
        row: list[int | None] = []
        for b in order:
            if a == b:
                row.append(100)
                continue
            i, j = sorted((idx[a], idx[b]))
            c = common[i][j]
            row.append(round(100 * agree[i][j] / c) if c >= MIN_COMMON else None)
        matrix.append(row)

    # ---- 2b) loneliest No voters -------------------------------------------
    lonely = defaultdict(int)
    total_no = defaultdict(int)
    participated = defaultdict(int)
    for r in ga:
        nos = [iso for iso, x in r["votes"].items() if x == "N"]
        for iso in nos:
            total_no[iso] += 1
        if 1 <= len(nos) <= LONELY_MAX_NO:
            for iso in nos:
                lonely[iso] += 1
        for iso, x in r["votes"].items():
            if x in "YNA":
                participated[iso] += 1
    loneliest = sorted(
        (
            {
                "iso": iso,
                "lonely": n,
                "totalNo": total_no[iso],
                "votes": participated[iso],
            }
            for iso, n in lonely.items()
        ),
        key=lambda d: -d["lonely"],
    )[:15]

    # ---- 2c) ideal-point history: percentiles + labeled series --------------
    years = sorted({r["year"] for r in ideal_rows})
    by_year: dict[int, list[float]] = defaultdict(list)
    by_country: dict[str, dict[int, float]] = defaultdict(dict)
    for r in ideal_rows:
        by_year[r["year"]].append(r["v"])
        by_country[r["iso"]][r["year"]] = r["v"]

    def pct(vals: list[float], p: float) -> float:
        vals = sorted(vals)
        i = (len(vals) - 1) * p
        lo, hi = int(i), min(int(i) + 1, len(vals) - 1)
        return round(vals[lo] + (vals[hi] - vals[lo]) * (i - lo), 3)

    percentiles = {
        f"p{int(p * 100)}": [pct(by_year[y], p) for y in years]
        for p in (0.1, 0.25, 0.5, 0.75, 0.9)
    }
    series = {
        iso: [
            round(by_country[iso][y], 3) if y in by_country[iso] else None
            for y in years
        ]
        for iso in SERIES_COUNTRIES
        if iso in by_country
    }

    analysis = {
        "countries": {i: country_names.get(i, i) for i in isos},
        "gaCoverage": {
            "from": ga_years[0],
            "to": ga_years[-1],
            "votes": len(ga),
        },
        "order": order,
        "matrix": matrix,
        "loneliest": loneliest,
        "idealPoints": {
            "years": years,
            "percentiles": percentiles,
            "series": series,
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_isos = sorted({iso for r in records.values() for iso in r["votes"]})
    (OUT_DIR / "vote-details.json").write_text(
        json.dumps(
            {
                "countries": {i: country_names.get(i, i) for i in all_isos},
                "votes": details,
            },
            separators=(",", ":"),
            sort_keys=True,
        )
    )
    (OUT_DIR / "voting-analysis.json").write_text(
        json.dumps(analysis, separators=(",", ":"))
    )
    for name in ("vote-details.json", "voting-analysis.json"):
        size = (OUT_DIR / name).stat().st_size
        print(f"{name}: {size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
