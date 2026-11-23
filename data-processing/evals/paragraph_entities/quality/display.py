"""Compile validated v6 display phrases, never full evidence, into website spans.

This is a pure adapter, not a production-data importer. Callers must preserve the
paragraph ID/parser/source hash checks already used by the website loader.
"""

from activity_schema import Evidence, evidence_offsets


def display_spans(parsed, case):
    sources = {
        p["ref"]: p["text"] for p in case["input"]["target"] + case["input"]["context"]
    }
    targets = {p["ref"] for p in case["input"]["target"]}
    spans = []

    def add(e, kind, label, summary=None):
        if not e or e["paragraph_ref"] not in targets:
            return
        r = evidence_offsets(Evidence(**e), sources)
        text = sources[e["paragraph_ref"]]
        spans.append(
            dict(
                summary=summary,
                paragraph_ref=e["paragraph_ref"],
                start=len(text[: r["start"]].encode("utf-16-le")) // 2,
                end=len(text[: r["end"]].encode("utf-16-le")) // 2,
                kind=kind,
                label=label,
            )
        )

    for task in parsed["tasks"]:
        for e in task["highlights"]:
            add(
                e,
                "activity",
                f"{task['family']}: {task['subtype']}".replace("_", " "),
                task["summary"],
            )
        for actor in task["actors"]:
            if actor["role"] == "implementer":
                add(
                    actor["evidence"],
                    "assignee",
                    f"Assignee · {actor['name']} · {actor['entity_type'] or 'unresolved'}",
                )
        for output in task["outputs"]:
            add(
                output["highlight"],
                "deliverable",
                f"Output · {output['kind']} · {output['description']}",
            )
    # Shared actors and repeated outputs are stored once, independent of task count.
    return list(
        {
            (s["paragraph_ref"], s["start"], s["end"], s["kind"], s["label"]): s
            for s in spans
        }.values()
    )
