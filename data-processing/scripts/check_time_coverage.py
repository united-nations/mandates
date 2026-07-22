"""Check time coverage and category values of the HDX datasets."""

import csv
from collections import Counter
from pathlib import Path

CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact")

with open(CACHE / "dpo-postsapproved.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
print("approved categories:", Counter(r["category"] for r in rows))
print("approved periods:", sorted({r["start_date"][:4] for r in rows}))

with open(CACHE / "dos-indicators.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
print("indicator periods:", sorted({r["Period"] for r in rows}))
print("target_met values:", Counter(r["Target_met"] for r in rows).most_common(6))

with open(CACHE / "dpo-uchistorical.csv", encoding="utf-8-sig") as f:
    dates = sorted({r["last_reporting_date"] for r in csv.DictReader(f)})
print("deploy dates:", dates[0], "→", dates[-1], f"({len(dates)} months)")

with open(CACHE / "dpo-pkbudget.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
print("budget years:", sorted({r["start_date"][:4] for r in rows}))

with open(CACHE / "dppa-fieldmissions.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
print("components missions sample:", Counter(r["mission"] for r in rows).most_common(8))
res = {r["resolution_number"] for r in rows}
print("components: distinct resolutions", len(res), "| sample:", sorted(res)[:5])

with open(CACHE / "dppadposs-fatalities.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
print("fatalities:", len(rows), "| years", min(r["incident_date"][:4] for r in rows), "→", max(r["incident_date"][:4] for r in rows))
print("incident types:", Counter(r["type_of_incident"] for r in rows).most_common())
