"""Offline identity repair: emit new CSVs without changing source exports."""

import argparse
import csv
from collections import Counter
from pathlib import Path

from utils.mandate_identity import Identity, resolve_rows

REPAIR_FIELDS = [
    "old_key",
    "origin_document",
    "entity",
    "section",
    "part_in_document",
    "subprogramme",
    "new_key",
    "source",
    "description",
    "symbol",
    "link",
    "organ",
    "official",
]


def normalized_row(row: dict[str, str]) -> dict[str, str]:
    return {k.lower().replace(" ", "_"): v for k, v in row.items()}


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    # Exclusive creation protects the original export and previous audit runs.
    with path.open("x", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def repair_row(row: dict[str, str], identity: Identity) -> dict[str, str]:
    result = {key: row.get(key, "") for key in REPAIR_FIELDS}
    result.update(
        old_key=row.get("full_document_symbol") or row["symbol"],
        new_key=identity.key,
        official=str(bool(identity.official_symbol)).lower(),
    )
    result["entity"] = result["entity"].replace("UN-Women", "UN Women")
    if row.get("addendum"):
        result["section"] += f" (Add.{row['addendum']})"
    return result


def audit_identities(rows: list[dict[str, str]], identities: list[Identity]) -> None:
    assert len(rows) == len(identities), "Citation rows were lost"
    bodies: dict[str, set[str]] = {}
    for identity in identities:
        bodies.setdefault(identity.key, set()).add(identity.issuer)
    # Empty headings are not evidence of an issuer conflict. Explicit symbols
    # may be cited under generic prose headers (e.g. "Secretary-General").
    for row, identity in zip(rows, identities, strict=True):
        if identity.status != "explicit" and not identity.official_symbol:
            assert len(bodies[identity.key]) == 1, (
                f"Cross-body collision: {identity.key}"
            )
        assert identity.key, f"Unresolved citation: {row}"


def unambiguous_repairs(changes: list[dict[str, str]]) -> list[dict[str, str]]:
    groups: dict[tuple[str, ...], set[str]] = {}
    fields = REPAIR_FIELDS[:6]
    for row in changes:
        key = tuple(row[field] for field in fields)
        groups.setdefault(key, set()).add(row["new_key"])
    result = [row for row in changes if len(groups[tuple(row[f] for f in fields)]) == 1]
    print(f"Repair provenance: {len(result)}/{len(changes)} rows unambiguous")
    return result


def convert_file(
    source: Path, output: Path, repair: Path | None = None
) -> Counter[str]:
    with source.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        original = list(reader)
        fields = list(reader.fieldnames or [])
    rows = [normalized_row(row) for row in original]
    identities = resolve_rows(rows)
    audit_identities(rows, identities)
    resolved = [
        dict(row, **{"Full Document Symbol": i.key})
        for row, i in zip(original, identities, strict=True)
    ]
    write_csv(output, fields, resolved)
    if repair is not None:
        changes = [
            repair_row(row, i)
            for row, i in zip(rows, identities, strict=True)
            if (row.get("full_document_symbol") or row["symbol"]) != i.key
        ]
        write_csv(repair, REPAIR_FIELDS, unambiguous_repairs(changes))
    return Counter(identity.status for identity in identities)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--repair", type=Path)
    args = parser.parse_args()
    print(convert_file(args.source, args.output, args.repair))


if __name__ == "__main__":
    main()
