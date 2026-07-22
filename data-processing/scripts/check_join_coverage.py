"""Validate mission-acronym join coverage across HDX Peace & Security datasets."""

import csv
from pathlib import Path

CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact")


def col(fname: str, colname: str) -> set[str]:
    with open(CACHE / fname, encoding="utf-8-sig") as f:
        return {(r.get(colname) or "").strip() for r in csv.DictReader(f)} - {""}


missions = col("dppa-fieldmissions-missions.csv", "missions")
components = col("dppa-fieldmissions.csv", "mission")
fatal = col("dppadposs-fatalities.csv", "mission_acronym")
approved = col("dpo-postsapproved.csv", "mission_acronym")
actual = col("dpo-postsactual.csv", "mission_acronym")
deploy = col("dpo-uchistorical.csv", "mission_acronym")
budget = col("dpo-pkbudget.csv", "mission_acronym")
exp = col("dpo-pkexp.csv", "mission_acronym")
ind = col("dos-indicators.csv", "Mission")

print("missions dashboard:", len(missions), sorted(missions))
print("\ncomponents:", len(components))
print("fatalities:", len(fatal))
print("approved:", len(approved), sorted(approved))
print("actual:", len(actual))
print("deploy:", len(deploy), sorted(deploy))
print("budget:", len(budget), sorted(budget))
print("indicators:", len(ind), sorted(ind))

print("\nmissions ∩ approved:", sorted(missions & approved))
print("missions ∩ deploy:", sorted(missions & deploy))
print("missions ∩ fatal:", len(missions & fatal))
print("missions - fatal:", sorted(missions - fatal))
print("approved - missions:", sorted(approved - missions))
