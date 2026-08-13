"""List HDX resource download URLs for UN Peace and Security Pillar datasets."""

import json
import urllib.request

DATASETS = [
    "peacekeeping-fatalities",
    "dpo-postsapproved",
    "dpo-postsactual",
    "dppa-fieldmissions",
    "dppa-fieldmissions-missions",
    "peacekeeping-uniformed-contributions-by-gender",
    "dpo-pkbudget",
    "dpo-pkexp",
    "dos-indicators",
]

for ds in DATASETS:
    url = f"https://data.humdata.org/api/3/action/package_show?id={ds}"
    with urllib.request.urlopen(url, timeout=30) as f:
        d = json.load(f)["result"]
    print("###", d["name"])
    for r in d["resources"]:
        print(" ", r["format"], r["url"], "| updated", (r.get("last_modified") or "?")[:10])
