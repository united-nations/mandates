"""Build website/src/data/mission-implementation.json.

Joins UN Peace & Security Data Hub datasets (DPPA-DPO official open data, fetched
from their HDX mirrors) with mandate-renewal resolutions from our own Digital
Library mirror, keyed on the mission acronym.

Sources (see docs/lens-impact/SOURCES.md):
- dppa-fieldmissions-missions  mission register (name, expiry, Chapter VII, ...)
- dppa-fieldmissions           paragraph-level mandate components per resolution
- dpo-postsapproved/-actual    approved (mandated) vs actual personnel per budget year
- dpo-uchistorical             monthly uniformed deployment per mission since 2010
- dppadposs-fatalities         individual fatalities since 1948
- dpo-pkbudget/-pkexp          appropriation vs expenditure per budget year
- dos-indicators               results-based-budgeting indicators with target-met flag
- digitallibrary.documents     S/RES whose DL title marks a mandate extension/renewal

Usage:  python3 build_mission_implementation.py [--refresh]
Raw CSVs are cached in /Volumes/SSDAStorage/un-mandates-impact (external disk).
Requires DATABASE_URL in the repo-root .env and `psql` on PATH (read-only query).
"""

from __future__ import annotations

import csv
import io
import json
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact")
OUT = REPO / "website" / "src" / "data" / "mission-implementation.json"

HDX = "https://data.humdata.org/dataset"
FILES = {
    "dppa-fieldmissions-missions.csv": f"{HDX}/183d95e1-3816-42c4-8a06-a727e97bca6d/resource/5e560cbd-e95b-4b4e-8648-fed8ca8f0189/download/dppa-fieldmissions-missions.csv",
    "dppa-fieldmissions.csv": f"{HDX}/1383fd15-5522-48db-bebd-1e19203c9cf2/resource/8bd26eb2-ae9f-4ee0-bcc1-701d2003f449/download/dppa-fieldmissions.csv",
    "dpo-postsapproved.csv": f"{HDX}/b63d765c-f0b9-47d6-911b-62c15a15d86c/resource/2607beba-bc20-43d0-9fb5-cf31dc448164/download/dpo-postsapproved.csv",
    "dpo-postsactual.csv": f"{HDX}/f6b91534-494c-45b1-97a4-cd01bafb4e72/resource/b1efbe57-2bbe-4f3b-9b05-6c2c2e891822/download/dpo-postsactual.csv",
    "dpo-uchistorical.csv": f"{HDX}/76d1790e-1303-4284-a245-e9093419e357/resource/ee990c5a-f9c0-418c-bc1c-de4d90b60544/download/dpo-uchistorical.csv",
    "dppadposs-fatalities.csv": f"{HDX}/4ce16b45-5526-471d-8918-2ed76082f1c8/resource/4cfc43b6-cc9c-403b-966f-fc37b8dd7d4b/download/dppadposs-fatalities.csv",
    "dpo-pkbudget.csv": f"{HDX}/0f9e2923-847e-45f1-bfc2-5d9f75dc8f3e/resource/6d5e265d-9f03-4c6e-9d9e-4339454f6657/download/dpo-pkbudget.csv",
    "dpo-pkexp.csv": f"{HDX}/d0eab416-ed0f-41f3-8cf6-215af1da5591/resource/f25d7b83-4c8b-4e8b-8450-81903f6fa061/download/dpo-pkexp.csv",
    "dos-indicators.csv": f"{HDX}/a62651e5-7ce3-4ca0-a046-7a7c35749f89/resource/d8484dc6-8e3c-4160-80e7-f90c45979c35/download/dos-indicators.csv",
}

# The register names one mission by full name; every other dataset uses UNVMC.
REGISTER_ACRONYM_FIX = {"UN Verification Mission in Colombia": "UNVMC"}

# Typos in the register's location column.
LOCATION_FIX = {"Cote d'Ivore": "Côte d'Ivoire"}

# Uniformed personnel categories in dpo-posts* (case-normalised).
UNIFORMED = {
    "military observers",
    "military contingents",
    "military contingent personnel",
    "united nations police",
    "formed police units",
    "government-provided personnel",
    "government provided personnel",
}

RENEWAL_SQL = """
SELECT symbol_normalized AS symbol,
       date_publication  AS date,
       title_other       AS title
FROM digitallibrary.documents
WHERE symbol_normalized LIKE 'S/RES/%'
  AND deleted_at IS NULL
  AND title_other ~* '(extension|renewal) of the mandate|extend(s|ing) the mandate'
ORDER BY date_publication
"""


def read_csv(name: str) -> list[dict[str, str]]:
    with open(CACHE / name, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def download(refresh: bool) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        target = CACHE / name
        if target.exists() and not refresh:
            continue
        print("downloading", name)
        req = urllib.request.Request(url, headers={"User-Agent": "un-mandates-registry/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r:
            target.write_bytes(r.read())


def database_url() -> str:
    for line in (REPO / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("DATABASE_URL not found in .env")


def fetch_renewals() -> list[dict[str, str]]:
    out = subprocess.run(
        ["psql", database_url(), "--csv", "-c", RENEWAL_SQL],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return list(csv.DictReader(io.StringIO(out)))


def num(s: str | None) -> float:
    s = (s or "").strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def main() -> None:
    refresh = "--refresh" in sys.argv
    download(refresh)

    # ---- mission register --------------------------------------------------
    missions: dict[str, dict] = {}
    for r in read_csv("dppa-fieldmissions-missions.csv"):
        acr = REGISTER_ACRONYM_FIX.get(r["missions"].strip(), r["missions"].strip())
        if not acr or len(acr) > 12:  # drops the embedded free-text note row
            continue
        missions[acr] = {
            "acronym": acr,
            "name": r["mission_name"].strip(),
            "location": LOCATION_FIX.get(r["location"].strip(), r["location"].strip()),
            "type": r["lead_entity"].strip(),  # "Peacekeeping Mission" | "Special Political Mission"
            "chapterVii": r["chapter_vii"].strip().lower() == "yes",
            "open": r["open_closed"].strip().lower().startswith("open"),
            "initialSymbol": r["initial_symbol"].strip() or None,
            "latestSymbol": r["latest_symbol"].strip() or None,
            "mandateExpiry": r["mandate_expiry"].strip() or None,
            "mandateTasks": int(float(r["no_of_mandate_tasks"])) if r["no_of_mandate_tasks"] else None,
            "renewals": [],
            "personnel": [],
            "deployment": [],
            "fatalities": [],
            "budget": [],
            "indicators": [],
        }

    # ---- mandate components (count per mission, latest resolutions) --------
    comp_count: dict[str, int] = defaultdict(int)
    for r in read_csv("dppa-fieldmissions.csv"):
        acr = REGISTER_ACRONYM_FIX.get(r["mission"].strip(), r["mission"].strip())
        comp_count[acr] += 1
    for acr, m in missions.items():
        m["mandateParagraphs"] = comp_count.get(acr, 0)

    # ---- renewals from our DL mirror ----------------------------------------
    import re

    def norm_name(s: str) -> str:
        return re.sub(r"\s+", " ", s.lower().replace("united nations", "un")).strip()

    names = {norm_name(m["name"]): acr for acr, m in missions.items() if m["name"]}

    MONTHS = {
        m[:3].lower(): i + 1
        for i, m in enumerate(
            ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"]
        )
    }

    def parse_until(title: str) -> str | None:
        """Parse '… until 30 Apr. 2025]' from a DL resolution title."""
        m = re.search(r"until (\d{1,2}) ([A-Za-z]+)\.? (\d{4})", title)
        if not m:
            return None
        month = MONTHS.get(m.group(2)[:3].lower())
        if not month:
            return None
        return f"{m.group(3)}-{month:02d}-{int(m.group(1)):02d}"

    got_renewals = set()
    for r in fetch_renewals():
        title = r["title"] or ""
        acr = None
        match = re.search(r"\(([A-Z]{4,10})\)", title)
        if match and match.group(1) in missions:
            acr = match.group(1)
        else:
            tn = norm_name(title)
            for name, a in names.items():
                if name in tn:
                    acr = a
                    break
        if acr:
            entry: dict[str, str | None] = {"symbol": r["symbol"], "date": r["date"]}
            until = parse_until(title)
            if until:
                entry["until"] = until
            missions[acr]["renewals"].append(entry)
            got_renewals.add(acr)

    # Effective mandate expiry: the register's expiry can lag behind the latest
    # renewal we see in the Digital Library, so take whichever is later.
    for m in missions.values():
        untils = [r["until"] for r in m["renewals"] if r.get("until")]
        latest_until = max(untils) if untils else None
        if latest_until and (not m["mandateExpiry"] or latest_until > m["mandateExpiry"]):
            m["mandateExpiry"] = latest_until

    # ---- approved vs actual personnel (uniformed + civilian totals) --------
    def year_label(start: str) -> str:
        y = int(start[:4])
        return f"{y}/{str(y + 1)[-2:]}"

    def collect_posts(fname: str, value_col: str) -> dict[tuple[str, str], dict[str, float]]:
        acc: dict[tuple[str, str], dict[str, float]] = defaultdict(lambda: {"uniformed": 0.0, "civilian": 0.0})
        for r in read_csv(fname):
            key = (r["mission_acronym"].strip(), year_label(r["start_date"]))
            kind = "uniformed" if r["category"].strip().lower() in UNIFORMED else "civilian"
            acc[key][kind] += num(r[value_col])
        return acc

    approved = collect_posts("dpo-postsapproved.csv", "approved")
    actual = collect_posts("dpo-postsactual.csv", "actual_average")
    for (acr, year), a in sorted(approved.items()):
        if acr not in missions:
            continue
        b = actual.get((acr, year), {"uniformed": 0.0, "civilian": 0.0})
        missions[acr]["personnel"].append(
            {
                "year": year,
                "approved": round(a["uniformed"] + a["civilian"]),
                "actual": round(b["uniformed"] + b["civilian"]),
                "approvedUniformed": round(a["uniformed"]),
                "actualUniformed": round(b["uniformed"]),
            }
        )

    # ---- monthly uniformed deployment ---------------------------------------
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in read_csv("dpo-uchistorical.csv"):
        acr = r["mission_acronym"].strip()
        month = r["last_reporting_date"][:7]
        monthly[acr][month] += num(r["male_personnel"]) + num(r["female_personnel"])
    for acr, m in missions.items():
        series = sorted(monthly.get(acr, {}).items())
        m["deployment"] = [{"m": k, "n": round(v)} for k, v in series]

    # ---- fatalities per year -------------------------------------------------
    fat: dict[str, dict[int, dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: {"t": 0, "mal": 0}))
    for r in read_csv("dppadposs-fatalities.csv"):
        acr = r["mission_acronym"].strip()
        year = int(r["incident_date"][:4])
        fat[acr][year]["t"] += 1
        if r["type_of_incident"].strip() == "Malicious Act":
            fat[acr][year]["mal"] += 1
    for acr, m in missions.items():
        m["fatalities"] = [
            {"y": y, "total": v["t"], "malicious": v["mal"]} for y, v in sorted(fat.get(acr, {}).items())
        ]

    # ---- budget: appropriation vs expenditure --------------------------------
    def collect_money(fname: str, value_col: str) -> dict[tuple[str, str], float]:
        acc: dict[tuple[str, str], float] = defaultdict(float)
        for r in read_csv(fname):
            acc[(r["mission_acronym"].strip(), year_label(r["start_date"]))] += num(r[value_col])
        return acc

    appro = collect_money("dpo-pkbudget.csv", "appropriation")
    spend = collect_money("dpo-pkexp.csv", "expenditure")
    for (acr, year), a in sorted(appro.items()):
        if acr not in missions or a == 0:
            continue
        missions[acr]["budget"].append(
            {"year": year, "appropriation": round(a), "expenditure": round(spend.get((acr, year), 0.0))}
        )

    # ---- RBB performance indicators ------------------------------------------
    ind: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: {"met": 0, "total": 0})
    for r in read_csv("dos-indicators.csv"):
        key = (r["Mission"].strip(), r["Period"].strip())
        if r["Target_met"] in ("0.0", "1.0", "0", "1"):
            ind[key]["total"] += 1
            ind[key]["met"] += int(float(r["Target_met"]))
    for (acr, period), v in sorted(ind.items()):
        if acr in missions and v["total"] > 0:
            missions[acr]["indicators"].append({"period": period, "met": v["met"], "total": v["total"]})

    # ---- write ---------------------------------------------------------------
    ordered = sorted(
        missions.values(),
        key=lambda m: (not m["open"], m["type"], m["acronym"]),
    )
    payload = {
        "generated": date.today().isoformat(),
        "missions": ordered,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")

    open_n = sum(1 for m in ordered if m["open"])
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    print(f"{len(ordered)} missions ({open_n} open); renewals matched for {len(got_renewals)}")
    for m in ordered:
        if m["open"]:
            print(
                f"  {m['acronym']:9s} renew={len(m['renewals']):3d} pers={len(m['personnel']):2d} "
                f"deploy={len(m['deployment']):3d} fatal={sum(f['total'] for f in m['fatalities']):4d} "
                f"budget={len(m['budget']):2d} ind={len(m['indicators']):2d}"
            )


if __name__ == "__main__":
    main()
