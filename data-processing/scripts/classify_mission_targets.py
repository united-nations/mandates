"""Build website/src/data/mission-targets.json — a semantic classification of every
results-based-budgeting (RBB) performance indicator in the UN Peace & Security Data
Hub `dos-indicators` dataset into met / partially met / not met / not assessable.

Why not just use the dataset's own binary `Target_met` flag? Because a binary flag
throws away the distance between "missed by a hair" (0.97 against a 1.00 standard)
and "missed badly" (0.60), and it does not tell a reader *why*. This script keeps
the direction of each indicator (is higher better, lower better, or a band?) —
which is a semantic property of the indicator's wording, read once per family — and
then grades each individual record on a transparent, direction-aware distance from
its planned target, emitting a one-line reason grounded in the actual planned-vs-
actual numbers.

The semantic step (assigning each of the 15 indicator families a direction) is done
by reading the indicator wording, NOT by regexing the numbers:

  - "Minimize timeline …", "Reduce the share …"      -> ceiling  (lower is better)
  - "Ensure … compliant", "Achieve …", "Improve …",
    "Comply …", "Utilize …", "Address …", "Increase …",
    "Implement all …", "Enhance … (points)"           -> floor    (higher is better)
  - "Minimize the share of posts that remain vacant"  -> band     (must land inside
      [Target, Target_2]; both under- and over-shoot miss — an under-vacancy means
      the mission over-hired against its budgeted attrition, an over-vacancy means
      posts sat empty). Confirmed against the dataset's own met flag.

Grading bands (direction-aware distance from target):
  - floor : met if actual >= target; partially met if within 10% below; else not met.
  - ceiling: met if actual <= target; partially met if within 10% over; else not met.
  - band  : met if Target <= actual <= Target_2; partially met if within 10% of the
            nearer bound; else not met.
  - not assessable: target missing / non-positive for a single-sided indicator, so
    no ratio can be formed. (The dataset is clean, so this bucket is tiny.)

Usage:  python3 classify_mission_targets.py
Reads the cached CSV on /Volumes/SSDAStorage/un-mandates-impact (no network, no DB).
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = Path("/Volumes/SSDAStorage/un-mandates-impact")
SRC = CACHE / "dos-indicators.csv"
OUT = REPO / "website" / "src" / "data" / "mission-targets.json"

# Semantic direction per indicator family, read from the indicator wording.
# floor   = higher is better (target is a minimum to reach or exceed)
# ceiling = lower is better  (target is a maximum not to breach)
# band    = actual must fall within [Target, Target_2]
DIRECTION = {
    "Gender balance": "floor",
    "Vacancy rates": "band",
    "Recruitment roster": "ceiling",
    "Property management": "floor",
    "Occupational safety and health": "floor",
    "Recruitment post-specific": "ceiling",
    "Aviation usage": "floor",
    "UN troop accommodation": "floor",
    "ICT": "floor",
    "Troop rations service": "floor",
    "Environment": "floor",
    "Demand plan deviation": "ceiling",
    "Recruitment modality": "floor",
    "Cancelled obligations": "ceiling",
    "Board of auditors": "floor",
}

# How to render each family's value/target in the reason string.
UNIT = {
    "Property management": "points",
    "Environment": "points",
    "Recruitment roster": "days",
    "Recruitment post-specific": "days",
}  # everything else is a percentage

PARTIAL_TOL = 0.10  # within 10% of the target counts as "partially met"


def fnum(s: str) -> float | None:
    s = (s or "").strip().replace(",", "")
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fmt(v: float, unit: str) -> str:
    if unit == "points":
        return f"{v:.0f} pts"
    if unit == "days":
        return f"{v:.0f} d"
    return f"{round(v * 100)}%"


def classify(fam: str, value: float, target: float | None, target2: float | None):
    """Return (status, reason). status in met/partial/not_met/not_assessable."""
    direction = DIRECTION.get(fam, "floor")
    unit = UNIT.get(fam, "percent")
    v = fmt(value, unit)

    if direction == "band":
        lo = target
        hi = target2 if target2 is not None else target
        if lo is None or hi is None:
            return "not_assessable", "No target band recorded for this indicator."
        if hi < lo:
            lo, hi = hi, lo
        band = f"{fmt(lo, unit)}–{fmt(hi, unit)}"
        if lo <= value <= hi:
            return "met", f"Actual {v} sits inside the budgeted band {band}."
        if value < lo:
            near = lo
            if value >= near * (1 - PARTIAL_TOL):
                return "partial", f"Actual {v} dips just below the band {band} (over-staffed)."
            return "not_met", f"Actual {v} well below the band {band} (over-staffed vs budget)."
        # value > hi
        if value <= hi * (1 + PARTIAL_TOL):
            return "partial", f"Actual {v} just over the band {band} (posts left vacant)."
        return "not_met", f"Actual {v} well above the band {band} (posts left vacant)."

    if target is None or target <= 0:
        return "not_assessable", f"Actual {v} but no usable target value recorded."
    t = fmt(target, unit)

    if direction == "floor":
        if value >= target * (1 - 1e-6):
            if value >= target * 1.05:
                return "met", f"Actual {v} exceeded the {t} target."
            return "met", f"Actual {v} met the {t} target."
        if value >= target * (1 - PARTIAL_TOL):
            return "partial", f"Actual {v} fell just short of the {t} target."
        return "not_met", f"Actual {v} fell short of the {t} target."

    # ceiling
    if value <= target * (1 + 1e-6):
        return "met", f"Actual {v} stayed within the {t} target."
    if value <= target * (1 + PARTIAL_TOL):
        return "partial", f"Actual {v} slightly over the {t} target."
    return "not_met", f"Actual {v} exceeded the {t} target."


def short_desc(desc: str) -> str:
    # Strip the "(Target: …)" tail; the target is shown separately.
    i = desc.find("(Target")
    return (desc[:i] if i > 0 else desc).strip()


def main() -> None:
    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))

    # mission -> period -> list of classified targets
    out: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    agree = 0
    counted = 0
    status_tally: dict[str, int] = defaultdict(int)

    for r in rows:
        fam = r["Indicator"].strip()
        value = fnum(r["Value"])
        target = fnum(r["Target"])
        target2 = fnum(r["Target_2"])
        if value is None:
            status, reason = "not_assessable", "No actual value recorded."
        else:
            status, reason = classify(fam, value, target, target2)
        status_tally[status] += 1

        official = r["Target_met"].strip()
        if official in ("0", "0.0", "1", "1.0") and status != "not_assessable":
            counted += 1
            off_met = official in ("1", "1.0")
            # our "met" or "partial" both count as broadly-on-track for agreement check
            if (status == "met") == off_met:
                agree += 1

        out[r["Mission"].strip()][r["Period"].strip()].append(
            {
                "id": int(r["id"]),
                "indicator": fam,
                "desc": short_desc(r["Target_Description"]),
                "value": value,
                "target": target,
                "target2": target2,
                "status": status,
                "reason": reason,
                "official": official in ("1", "1.0"),
            }
        )

    # sort each period's targets: not_met, partial, met, not_assessable, then by id
    order = {"not_met": 0, "partial": 1, "met": 2, "not_assessable": 3}
    missions = {}
    for mission, periods in out.items():
        pmap = {}
        for period, items in periods.items():
            items.sort(key=lambda x: (order[x["status"]], x["indicator"]))
            pmap[period] = items
        missions[mission] = dict(sorted(pmap.items()))

    payload = {
        "generated": date.today().isoformat(),
        "method": (
            "Each RBB indicator family is assigned a semantic direction (higher-is-better, "
            "lower-is-better, or an in-band target) by reading its wording; each record is "
            "then graded met / partially met (within 10% of target) / not met / not assessable "
            "on its direction-aware distance from the planned target, with a reason grounded in "
            "the planned-vs-actual numbers."
        ),
        "statusTally": dict(status_tally),
        "missions": missions,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")

    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    print("status tally:", dict(status_tally))
    print(f"agreement of our 'met' with dataset Target_met flag: {agree}/{counted} = {agree/counted:.1%}")


if __name__ == "__main__":
    main()
