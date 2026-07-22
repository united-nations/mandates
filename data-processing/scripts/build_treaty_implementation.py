"""Build website/src/data/treaty-implementation.json.

Joins the UN Treaty Collection (Multilateral Treaties Deposited with the
Secretary-General, MTDSG) ratification status of the treaties the General
Assembly *created* with the GA resolutions in our own Digital Library mirror
that adopted or opened them, keyed on the adopting resolution symbol.

The mandate side (our DB): the GA resolution that adopted / opened a multilateral
treaty for signature -- the normative "paper" the Assembly produced.
The impact side (MTDSG): how many states actually became parties, when the treaty
entered into force, and the ratification trajectory since -- the real-world uptake
of that normative mandate.

Sources (see docs/lens-impact/SOURCES-ROUND2.md):
- https://treaties.un.org/Pages/ViewDetails.aspx?...  (official MTDSG status page)
- digitallibrary.documents                            (our GA resolution mirror)

Usage:  python3 build_treaty_implementation.py [--refresh]
Raw HTML is cached in /Volumes/SSDAStorage/un-mandates-impact2 (external disk).
Requires DATABASE_URL in the repo-root .env and `psql` on PATH (read-only query).
"""

from __future__ import annotations

import csv
import io
import json
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact2/mtdsg")
OUT = REPO / "website" / "src" / "data" / "treaty-implementation.json"
URL = "https://treaties.un.org/Pages/ViewDetails.aspx?src=TREATY&mtdsg_no={m}&chapter={c}&clang=_en"

# Treaties the General Assembly created, each with its MTDSG number, chapter, the
# GA resolution that adopted/opened it, and a short + full name. Adopting
# resolutions verified against digitallibrary.documents on 2026-07-22.
TREATIES: list[dict] = [
    # Chapter IV -- Human Rights
    {"m": "IV-1", "c": 4, "res": "A/RES/260(III)", "short": "Genocide Convention",
     "name": "Convention on the Prevention and Punishment of the Crime of Genocide", "cat": "Human Rights"},
    {"m": "IV-2", "c": 4, "res": "A/RES/2106(XX)", "short": "ICERD",
     "name": "International Convention on the Elimination of All Forms of Racial Discrimination", "cat": "Human Rights"},
    {"m": "IV-3", "c": 4, "res": "A/RES/2200(XXI)", "short": "ICESCR",
     "name": "International Covenant on Economic, Social and Cultural Rights", "cat": "Human Rights"},
    {"m": "IV-3-a", "c": 4, "res": "A/RES/63/117", "short": "OP-ICESCR",
     "name": "Optional Protocol to the ICESCR", "cat": "Human Rights"},
    {"m": "IV-4", "c": 4, "res": "A/RES/2200(XXI)", "short": "ICCPR",
     "name": "International Covenant on Civil and Political Rights", "cat": "Human Rights"},
    {"m": "IV-5", "c": 4, "res": "A/RES/2200(XXI)", "short": "ICCPR-OP1",
     "name": "Optional Protocol to the ICCPR", "cat": "Human Rights"},
    {"m": "IV-8", "c": 4, "res": "A/RES/34/180", "short": "CEDAW",
     "name": "Convention on the Elimination of All Forms of Discrimination against Women", "cat": "Human Rights"},
    {"m": "IV-8-b", "c": 4, "res": "A/RES/54/4", "short": "OP-CEDAW",
     "name": "Optional Protocol to CEDAW", "cat": "Human Rights"},
    {"m": "IV-9", "c": 4, "res": "A/RES/39/46", "short": "CAT",
     "name": "Convention against Torture and Other Cruel, Inhuman or Degrading Treatment", "cat": "Human Rights"},
    {"m": "IV-9-b", "c": 4, "res": "A/RES/57/199", "short": "OP-CAT",
     "name": "Optional Protocol to the Convention against Torture", "cat": "Human Rights"},
    {"m": "IV-11", "c": 4, "res": "A/RES/44/25", "short": "CRC",
     "name": "Convention on the Rights of the Child", "cat": "Human Rights"},
    {"m": "IV-11-b", "c": 4, "res": "A/RES/54/263", "short": "OP-CRC-AC",
     "name": "Optional Protocol to the CRC on the involvement of children in armed conflict", "cat": "Human Rights"},
    {"m": "IV-11-c", "c": 4, "res": "A/RES/54/263", "short": "OP-CRC-SC",
     "name": "Optional Protocol to the CRC on the sale of children, child prostitution and pornography", "cat": "Human Rights"},
    {"m": "IV-11-d", "c": 4, "res": "A/RES/66/138", "short": "OP-CRC-IC",
     "name": "Optional Protocol to the CRC on a communications procedure", "cat": "Human Rights"},
    {"m": "IV-12", "c": 4, "res": "A/RES/44/128", "short": "ICCPR-OP2",
     "name": "Second Optional Protocol to the ICCPR, aiming at the abolition of the death penalty", "cat": "Human Rights"},
    {"m": "IV-13", "c": 4, "res": "A/RES/45/158", "short": "CMW",
     "name": "International Convention on the Protection of the Rights of All Migrant Workers", "cat": "Human Rights"},
    {"m": "IV-15", "c": 4, "res": "A/RES/61/106", "short": "CRPD",
     "name": "Convention on the Rights of Persons with Disabilities", "cat": "Human Rights"},
    {"m": "IV-15-a", "c": 4, "res": "A/RES/61/106", "short": "OP-CRPD",
     "name": "Optional Protocol to the CRPD", "cat": "Human Rights"},
    {"m": "IV-16", "c": 4, "res": "A/RES/61/177", "short": "CED",
     "name": "International Convention for the Protection of All Persons from Enforced Disappearance", "cat": "Human Rights"},
    # Chapter XVIII -- Penal Matters
    {"m": "XVIII-12", "c": 18, "res": "A/RES/55/25", "short": "UNTOC",
     "name": "United Nations Convention against Transnational Organized Crime", "cat": "Crime"},
    {"m": "XVIII-14", "c": 18, "res": "A/RES/58/4", "short": "UNCAC",
     "name": "United Nations Convention against Corruption", "cat": "Crime"},
    # Chapter XXVI -- Disarmament
    {"m": "XXVI-4", "c": 26, "res": "A/RES/50/245", "short": "CTBT",
     "name": "Comprehensive Nuclear-Test-Ban Treaty", "cat": "Disarmament"},
    {"m": "XXVI-8", "c": 26, "res": "A/RES/67/234B", "short": "ATT",
     "name": "Arms Trade Treaty", "cat": "Disarmament"},
]

DATE = re.compile(r"\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}")


def database_url() -> str:
    for line in (REPO / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("DATABASE_URL not found in .env")


def psql_csv(sql: str) -> list[dict[str, str]]:
    out = subprocess.run(
        ["psql", database_url(), "--csv", "-c", sql],
        check=True, capture_output=True, text=True,
    ).stdout
    return list(csv.DictReader(io.StringIO(out)))


def fetch(t: dict, refresh: bool) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{t['m']}.html"
    if refresh or not path.exists():
        url = URL.format(m=t["m"], c=t["c"])
        print("downloading", t["short"], t["m"])
        req = urllib.request.Request(url, headers={"User-Agent": "un-mandates-registry/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r:
            path.write_bytes(r.read())
        time.sleep(1.5)
    return path.read_text(encoding="utf-8", errors="ignore")


def parse(html: str) -> dict:
    """Extract entry-into-force + participant status from an MTDSG page."""
    result = {"parties": 0, "signatories": 0, "entry_into_force": None,
              "first_action_year": None, "last_action_year": None}
    txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    m = re.search(r"Entry into force\s*:?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})", txt)
    if m:
        result["entry_into_force"] = m.group(1)
    tbl_m = re.search(r'id="[^"]*_tblgrid"[^>]*>(.*?)</table>', html, re.S)
    if not tbl_m:
        return result
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbl_m.group(1), re.S)

    # Locate columns by header text: the participant-status table has a variable
    # number of columns (some treaties add a "Provisional application" column, so
    # the consent-to-be-bound column is not always index 2).
    hdr = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip().lower()
           for x in re.findall(r"<td[^>]*>(.*?)</td>", rows[0], re.S)]
    consent = re.compile(r"ratif|accession|succession|acceptance|approval|"
                         r"formal confirmation|definitive signature", re.I)
    rat_idx = next((i for i in range(len(hdr) - 1, -1, -1) if consent.search(hdr[i])), None)
    # signature column: contains "signature" but is not the consent column
    sig_idx = next((i for i, h in enumerate(hdr)
                    if "signature" in h and i != rat_idx), None)
    if rat_idx is None:
        rat_idx = len(hdr) - 1

    years: list[int] = []
    for row in rows[1:]:  # skip header
        c = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(c) <= rat_idx:
            continue
        name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c[0])).strip()
        if not name:
            continue
        if sig_idx is not None and DATE.search(re.sub(r"<[^>]+>", " ", c[sig_idx])):
            result["signatories"] += 1
        dm = DATE.search(re.sub(r"<[^>]+>", " ", c[rat_idx]))
        if dm:
            result["parties"] += 1
            years.append(int(dm.group(0)[-4:]))
    if years:
        result["first_action_year"] = min(years)
        result["last_action_year"] = max(years)
    return result


def main() -> None:
    refresh = "--refresh" in sys.argv

    # join side: which adopting resolutions are in our mirror
    syms = sorted({t["res"].replace(" ", "").upper() for t in TREATIES})
    in_list = ",".join("'" + s.replace("'", "''") + "'" for s in syms)
    rows = psql_csv(
        f"""
        SELECT symbol_normalized, date_publication, left(display_title,120) AS title
        FROM digitallibrary.documents
        WHERE deleted_at IS NULL AND symbol_normalized IN ({in_list})
        """
    )
    db = {r["symbol_normalized"]: r for r in rows}

    out = []
    for t in TREATIES:
        html = fetch(t, refresh)
        p = parse(html)
        sym = t["res"].replace(" ", "").upper()
        rec = db.get(sym)
        out.append({
            "short": t["short"],
            "name": t["name"],
            "category": t["cat"],
            "mtdsg_no": t["m"],
            "adopting_resolution": t["res"],
            "adopting_resolution_in_db": rec is not None,
            "adopting_resolution_date": rec["date_publication"] if rec else None,
            "db_title": rec["title"] if rec else None,
            "entry_into_force": p["entry_into_force"],
            "in_force": p["entry_into_force"] is not None,
            "parties": p["parties"],
            "signatories": p["signatories"],
            "first_ratification_year": p["first_action_year"],
            "last_ratification_year": p["last_action_year"],
        })

    matched = sum(1 for r in out if r["adopting_resolution_in_db"])
    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "UN Treaty Collection MTDSG x digitallibrary.documents",
        "treaty_count": len(out),
        "totals": {
            "adopting_resolutions_in_db": matched,
            "distinct_adopting_resolutions": len(syms),
            "in_force": sum(1 for r in out if r["in_force"]),
            "sum_parties": sum(r["parties"] for r in out),
        },
        "treaties": out,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  {len(out)} treaties, {matched} adopting resolutions in DB, "
          f"{payload['totals']['in_force']} in force")


if __name__ == "__main__":
    main()
