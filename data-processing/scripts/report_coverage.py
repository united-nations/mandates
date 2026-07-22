"""Print join-coverage statistics for mission-implementation.json (for ANALYSIS.md)."""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
d = json.load(open(REPO / "website/src/data/mission-implementation.json"))
ms = d["missions"]
print("generated", d["generated"], "missions", len(ms))
open_ms = [m for m in ms if m["open"]]
pkos = [m for m in open_ms if m["type"] == "Peacekeeping Mission"]
spms = [m for m in open_ms if m["type"] != "Peacekeeping Mission"]
print("open", len(open_ms), "pkos", len(pkos), "spms", len(spms), "closed", len(ms) - len(open_ms))
for k in ["renewals", "personnel", "deployment", "fatalities", "budget", "indicators"]:
    have = [m["acronym"] for m in ms if m[k]]
    no = [m["acronym"] for m in ms if not m[k]]
    print(f"{k}: {len(have)}/{len(ms)}  missing: {no}")
tot_renew = sum(len(m["renewals"]) for m in ms)
with_until = sum(1 for m in ms for r in m["renewals"] if r.get("until"))
print("total renewals matched:", tot_renew, "with until date:", with_until)
tot_fat = sum(f["total"] for m in ms for f in m["fatalities"])
print("fatalities total:", tot_fat)
reg_exp = [m["acronym"] for m in open_ms if m["mandateExpiry"]]
print("open with expiry:", len(reg_exp), "/", len(open_ms))
met = sum(i["met"] for m in ms for i in m["indicators"])
tot = sum(i["total"] for m in ms for i in m["indicators"])
print("indicators met/total:", met, tot)
allmonths = sorted({p["m"] for m in ms for p in m["deployment"]})
print("deploy range:", allmonths[0], allmonths[-1])
ys = sorted({p["year"] for m in ms for p in m["personnel"]})
print("personnel years:", ys[0], ys[-1])
bys = sorted({b["year"] for m in ms for b in m["budget"]})
print("budget years:", bys[0], bys[-1])
for m in pkos:
    ps = [p for p in m["personnel"] if p["actual"] > 0]
    if ps:
        p = ps[-1]
        r = p["actualUniformed"] / max(p["approvedUniformed"], 1)
        print(f"  {m['acronym']:9s} {p['year']} approvedU={p['approvedUniformed']} actualU={p['actualUniformed']} ratio={r:.2f}")
