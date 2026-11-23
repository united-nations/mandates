"""Reproduce the frozen coarse passage checks; these are not semantic accuracy."""

import argparse, json, statistics
from pathlib import Path


def score(directory):
    directory = Path(directory)
    gold = json.loads((directory / "gold-test.json").read_text())
    summaries = []
    for variant, model in [
        ("baseline", "gpt-6-luna"),
        ("v6", "gpt-6-luna"),
        ("v6", "gpt-6.1-sol"),
    ]:
        records = []
        words = []
        for line in (directory / "results-final.jsonl").read_text().splitlines():
            r = json.loads(line)
            if r["variant"] != variant or r["model"] != model:
                continue
            output = r.get("output", {})
            tasks = output.get("tasks", output.get("activities", []))
            g = gold[r["case_id"]]
            families = {t.get("family", t.get("activity_type")) for t in tasks}
            actors = {
                a.get("entity_type")
                for t in tasks
                for a in t.get("actors", t.get("assignees", []))
                if (
                    a.get("role") == "implementer"
                    if variant != "baseline"
                    else a.get("basis") != "implicit"
                )
            }
            checks = dict(
                valid=r["valid"],
                families=set(g["required"]) <= families <= set(g["allowed"]),
                implementers=actors == set(g["actors"]),
                task_count=g["min"] <= len(tasks) <= g["max"],
            )
            records.append(
                dict(
                    id=r["case_id"],
                    checks=checks,
                    passed=all(checks.values()),
                    families=sorted(families),
                    implementer_types=sorted(actors, key=lambda x: x or ""),
                )
            )
            for t in tasks:
                words.extend(
                    len(e["quote"].split())
                    for e in t.get("highlights", t.get("evidence", []))
                )
        summaries.append(
            dict(
                variant=variant,
                model=model,
                cases=len(records),
                valid=sum(r["checks"]["valid"] for r in records),
                all_checks=sum(r["passed"] for r in records),
                display_words_median=statistics.median(words) if words else None,
                records=records,
            )
        )
    return summaries


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument(
        "--directory",
        type=Path,
        default=Path(__file__).resolve().parents[4]
        / "data/references/paragraph-quality-20261123",
    )
    args = p.parse_args()
    for s in score(args.directory):
        print({k: v for k, v in s.items() if k != "records"})
