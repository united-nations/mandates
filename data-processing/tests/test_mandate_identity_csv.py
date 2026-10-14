"""Conservation and provenance tests for offline identity conversion."""

import csv
import tempfile
import unittest
from pathlib import Path

from utils.mandate_identity import resolve_rows
from utils.mandate_identity_csv import REPAIR_FIELDS, convert_file, unambiguous_repairs


class IdentityCsvTests(unittest.TestCase):
    def test_conversion_preserves_every_non_identity_field(self):
        fields = ["Symbol", "Source", "Full Document Symbol", "Description", "Entity"]
        original = [
            dict(
                zip(
                    fields,
                    [
                        "4/6",
                        "Human Rights Council resolutions",
                        "",
                        "Office, title",
                        "OHCHR",
                    ],
                )
            ),
            dict(
                zip(
                    fields,
                    [
                        "4/6",
                        "United Nations Environment Assembly resolutions",
                        "",
                        "Marine litter",
                        "UNEP",
                    ],
                )
            ),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            source, output, repair = [
                Path(tmp) / name for name in ["in.csv", "out.csv", "map.csv"]
            ]
            with source.open("w", newline="") as stream:
                writer = csv.DictWriter(stream, fields)
                writer.writeheader()
                writer.writerows(original)
            convert_file(source, output, repair)
            with output.open() as stream:
                resolved = list(csv.DictReader(stream))
            self.assertEqual(len(original), len(resolved))
            for before, after in zip(original, resolved, strict=True):
                self.assertEqual(
                    {k: v for k, v in before.items() if k != "Full Document Symbol"},
                    {k: v for k, v in after.items() if k != "Full Document Symbol"},
                )
            with self.assertRaises(FileExistsError):
                convert_file(source, output)

    def test_ambiguous_old_citation_is_excluded_from_repair(self):
        before = {field: "" for field in REPAIR_FIELDS}
        before.update(old_key="2007", entity="CEB", origin_document="PPB 2027")
        changes = [
            dict(before, new_key="ECOSOC Outcome 2007"),
            dict(before, new_key="ECOSOC Conclusion 2007"),
        ]
        self.assertEqual(unambiguous_repairs(changes), [])

    def test_mixed_heading_reuses_only_unique_evidenced_identity(self):
        rows = [
            {
                "symbol": "2004/52",
                "source": "Economic and Social Council resolutions",
                "full_document_symbol": "E/RES/2004/52",
            },
            {
                "symbol": "2004/52",
                "source": "Economic and Social Council resolutions and decisions",
            },
        ]
        identities = resolve_rows(rows)
        self.assertEqual(identities[1].key, "E/RES/2004/52")
        self.assertEqual(identities[1].status, "matched")

    def test_conflicting_official_candidates_are_not_guessed(self):
        rows = [
            {
                "symbol": "4/6",
                "source": "Human Rights Council resolutions",
                "full_document_symbol": "A/HRC/RES/4/6",
            },
            {
                "symbol": "4/6",
                "source": "Human Rights Council decisions",
                "full_document_symbol": "A/HRC/DEC/4/6",
            },
            {
                "symbol": "4/6",
                "source": "Human Rights Council resolutions and decisions",
            },
        ]
        self.assertIsNone(resolve_rows(rows)[2].official_symbol)

    def test_scoped_decision_prevents_mixed_heading_resolution_guess(self):
        rows = [
            {
                "symbol": "7/1",
                "source": "United Nations Environment Assembly resolutions",
            },
            {
                "symbol": "7/1",
                "source": "United Nations Environment Assembly decisions",
            },
            {
                "symbol": "7/1",
                "source": "United Nations Environment Assembly resolutions and decisions",
            },
        ]
        self.assertIsNone(resolve_rows(rows)[2].official_symbol)
        self.assertEqual(resolve_rows(rows)[2].key, "UNEA Outcome 7/1")

    def test_evidenced_external_official_namespaces_are_preserved(self):
        rows = [
            {
                "symbol": symbol,
                "full_document_symbol": symbol,
                "source": "Other resolutions",
            }
            for symbol in ["CD/2416", "TD/B/DEC/582(LXII)", "ESCAP/RES/74/1"]
        ]
        self.assertEqual(
            [i.key for i in resolve_rows(rows)], [r["symbol"] for r in rows]
        )

    def test_numeric_resolution_and_decision_namespaces_do_not_merge(self):
        rows = [
            {"symbol": "4/6", "source": "Commission on Narcotic Drugs resolutions"},
            {"symbol": "4/6", "source": "Commission on Narcotic Drugs decisions"},
        ]
        self.assertEqual(len({i.key for i in resolve_rows(rows)}), 2)


if __name__ == "__main__":
    unittest.main()
