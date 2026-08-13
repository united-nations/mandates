"""Build website/src/data/sanctions-implementation.json.

Joins the UN Security Council Consolidated Sanctions List (the official, machine-
readable roster of every individual and entity currently designated under an
active SC sanctions regime) with the sanctions resolutions in our own Digital
Library mirror, keyed on the sanctions regime -> its establishing SC resolution
and the country/thematic UNBIS subject its resolutions carry.

The mandate side (our DB): SC resolutions that establish, renew, and amend each
sanctions regime -- the "paper" authorising coercive measures.
The enforcement side (Consolidated List): the individuals and entities actually
designated under each regime, with the date each was listed -- the "ground".

Sources (see docs/lens-impact/SOURCES-ROUND2.md):
- https://scsanctions.un.org/resources/xml/en/consolidated.xml   (official XML)
- digitallibrary.documents                                        (our SC mirror)

Usage:  python3 build_sanctions_implementation.py [--refresh]
Raw XML is cached in /Volumes/SSDAStorage/un-mandates-impact2 (external disk).
Requires DATABASE_URL in the repo-root .env and `psql` on PATH (read-only query).
"""

from __future__ import annotations

import csv
import io
import json
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact2")
OUT = REPO / "website" / "src" / "data" / "sanctions-implementation.json"
XML_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"

# Each active regime in the Consolidated List (keyed by its UN_LIST_TYPE) mapped
# to: the SC resolution that established the sanctions committee / designation
# regime, and the UNBIS subject(s) its SC resolutions carry in our mirror, used
# to count the mandate-renewal volume. Establishing resolutions verified present
# in digitallibrary.documents on 2026-07-22.
REGIMES: dict[str, dict] = {
    "Al-Qaida": {
        "name": "ISIL (Da'esh) & Al-Qaida",
        "establishing": "S/RES/1267(1999)",
        "subjects": ["TERRORISM", "COUNTER-TERRORISM", "TERRORISM FINANCING"],
    },
    "Taliban": {
        "name": "Taliban (1988 Committee, Afghanistan)",
        "establishing": "S/RES/1988(2011)",
        "subjects": ["AFGHANISTAN"],
    },
    "DPRK": {
        "name": "Democratic People's Republic of Korea",
        "establishing": "S/RES/1718(2006)",
        "subjects": ["DEMOCRATIC PEOPLE'S REPUBLIC OF KOREA"],
    },
    "Iran": {
        "name": "Iran (terminated 2015, legacy listings)",
        "establishing": "S/RES/1737(2006)",
        "subjects": ["IRAN (ISLAMIC REPUBLIC OF)"],
    },
    "Iraq": {
        "name": "Iraq (1518 Committee)",
        "establishing": "S/RES/1518(2003)",
        "subjects": ["IRAQ"],
    },
    "DRC": {
        "name": "Democratic Republic of the Congo",
        "establishing": "S/RES/1533(2004)",
        "subjects": ["DEMOCRATIC REPUBLIC OF THE CONGO"],
    },
    "Libya": {
        "name": "Libya",
        "establishing": "S/RES/1970(2011)",
        "subjects": ["LIBYA"],
    },
    "Somalia": {
        "name": "Somalia",
        "establishing": "S/RES/751(1992)",
        "subjects": ["SOMALIA"],
    },
    "CAR": {
        "name": "Central African Republic",
        "establishing": "S/RES/2127(2013)",
        "subjects": ["CENTRAL AFRICAN REPUBLIC"],
    },
    "Sudan": {
        "name": "Sudan (Darfur)",
        "establishing": "S/RES/1591(2005)",
        "subjects": ["SUDAN"],
    },
    "Haiti": {
        "name": "Haiti",
        "establishing": "S/RES/2653(2022)",
        "subjects": ["HAITI"],
    },
    "Yemen": {
        "name": "Yemen",
        "establishing": "S/RES/2140(2014)",
        "subjects": ["YEMEN"],
    },
    "GB": {
        "name": "Guinea-Bissau",
        "establishing": "S/RES/2048(2012)",
        "subjects": ["GUINEA-BISSAU"],
    },
    "SouthSudan": {
        "name": "South Sudan",
        "establishing": "S/RES/2206(2015)",
        "subjects": ["SOUTH SUDAN"],
    },
}


def database_url() -> str:
    for line in (REPO / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("DATABASE_URL not found in .env")


def psql_csv(sql: str) -> list[dict[str, str]]:
    out = subprocess.run(
        ["psql", database_url(), "--csv", "-c", sql],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return list(csv.DictReader(io.StringIO(out)))


def download(refresh: bool) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / "consolidated.xml"
    if refresh or not target.exists():
        print("downloading consolidated.xml")
        req = urllib.request.Request(XML_URL, headers={"User-Agent": "un-mandates-registry/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r:
            target.write_bytes(r.read())
    return target


def year_of(s: str | None) -> int | None:
    s = (s or "").strip()
    if len(s) >= 4 and s[:4].isdigit():
        return int(s[:4])
    return None


def main() -> None:
    refresh = "--refresh" in sys.argv
    xml_path = download(refresh)
    root = ET.parse(xml_path).getroot()
    generated = root.get("dateGenerated")

    # ---- enforcement side: parse the Consolidated List ---------------------
    per_regime: dict[str, dict] = {
        code: {
            "individuals": 0,
            "entities": 0,
            "listing_years": Counter(),
            "listed_on": [],
        }
        for code in REGIMES
    }
    unknown_types: Counter = Counter()

    def ingest(node, kind: str) -> None:
        code = (node.findtext("UN_LIST_TYPE") or "").strip()
        if code not in per_regime:
            unknown_types[code] += 1
            return
        per_regime[code][kind] += 1
        listed = (node.findtext("LISTED_ON") or "").strip()
        y = year_of(listed)
        if y:
            per_regime[code]["listing_years"][y] += 1
            per_regime[code]["listed_on"].append(listed)

    for ind in root.find("INDIVIDUALS") if root.find("INDIVIDUALS") is not None else []:
        ingest(ind, "individuals")
    for ent in root.find("ENTITIES") if root.find("ENTITIES") is not None else []:
        ingest(ent, "entities")

    # ---- mandate side: count SC sanctions resolutions per regime -----------
    # One query: (subject -> distinct SC sanctions recids) then fold per regime.
    # Two grains: S/RES/ resolutions (the mandate instrument itself) and all SC
    # sanctions documents (resolutions + committee reports, notes, letters).
    recid_rows = psql_csv(
        """
        SELECT recid,
               (symbol_normalized LIKE 'S/RES/%') AS is_res,
               unnest(subjects) AS subj
        FROM digitallibrary.documents
        WHERE deleted_at IS NULL
          AND un_body = 'Security Council'
          AND 'SANCTIONS' = ANY(subjects)
        """
    )
    subj_to_res: dict[str, set[str]] = defaultdict(set)
    subj_to_docs: dict[str, set[str]] = defaultdict(set)
    for r in recid_rows:
        subj_to_docs[r["subj"]].add(r["recid"])
        if r["is_res"] in ("t", "true", "True"):
            subj_to_res[r["subj"]].add(r["recid"])

    # ---- confirm establishing resolutions are in our mirror ----------------
    est_syms = [r["establishing"].replace(" ", "").upper() for r in REGIMES.values()]
    est_list = ",".join("'" + s.replace("'", "''") + "'" for s in est_syms)
    est_rows = psql_csv(
        f"""
        SELECT symbol_normalized, date_publication
        FROM digitallibrary.documents
        WHERE deleted_at IS NULL AND symbol_normalized IN ({est_list})
        """
    )
    est_info = {r["symbol_normalized"]: r["date_publication"] for r in est_rows}

    # ---- assemble ----------------------------------------------------------
    regimes_out = []
    for code, meta in REGIMES.items():
        rec = per_regime[code]
        est_norm = meta["establishing"].replace(" ", "").upper()
        res_ids: set[str] = set()
        doc_ids: set[str] = set()
        for subj in meta["subjects"]:
            res_ids |= subj_to_res.get(subj, set())
            doc_ids |= subj_to_docs.get(subj, set())
        listed = sorted(rec["listed_on"])
        regimes_out.append(
            {
                "code": code,
                "name": meta["name"],
                "establishing_resolution": meta["establishing"],
                "establishing_in_db": est_norm in est_info,
                "establishing_date": est_info.get(est_norm),
                "subjects": meta["subjects"],
                "sc_sanctions_resolutions_in_db": len(res_ids),
                "sc_sanctions_documents_in_db": len(doc_ids),
                "individuals_listed": rec["individuals"],
                "entities_listed": rec["entities"],
                "total_listed": rec["individuals"] + rec["entities"],
                "first_listing": listed[0] if listed else None,
                "last_listing": listed[-1] if listed else None,
                "listings_by_year": dict(sorted(rec["listing_years"].items())),
            }
        )

    regimes_out.sort(key=lambda r: r["total_listed"], reverse=True)

    total_ind = sum(r["individuals_listed"] for r in regimes_out)
    total_ent = sum(r["entities_listed"] for r in regimes_out)
    all_years: Counter = Counter()
    for r in regimes_out:
        for y, n in r["listings_by_year"].items():
            all_years[int(y)] += n

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "list_generated": generated,
        "source": "UN Security Council Consolidated Sanctions List (consolidated.xml) x digitallibrary.documents",
        "regime_count": len(regimes_out),
        "totals": {
            "individuals_listed": total_ind,
            "entities_listed": total_ent,
            "total_listed": total_ind + total_ent,
            "sc_sanctions_resolutions_in_db": sum(
                r["sc_sanctions_resolutions_in_db"] for r in regimes_out
            ),
            "listings_by_year": dict(sorted(all_years.items())),
        },
        "regimes": regimes_out,
        "notes": {
            "unknown_list_types": dict(unknown_types),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.relative_to(REPO)}")
    print(
        f"  {len(regimes_out)} regimes, {total_ind} individuals + {total_ent} entities listed,"
        f" {payload['totals']['sc_sanctions_resolutions_in_db']} SC sanctions resolutions joined"
    )


if __name__ == "__main__":
    main()
