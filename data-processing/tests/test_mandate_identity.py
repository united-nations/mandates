"""Regression tests for short references which are not global document identities."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.mandate_identity import resolve_identity


def row(symbol, source, **extra):
    return {"symbol": symbol, "source": source, "entity": "test", **extra}


class MandateIdentityTests(unittest.TestCase):
    def test_issue_29_is_three_documents(self):
        cases = [
            ("United Nations Environment Assembly resolutions", "UNEP/EA.4/RES.6"),
            ("Human Rights Council resolutions", "A/HRC/RES/4/6"),
            (
                "Conference of the States Parties to the United Nations Convention against Corruption resolutions and decisions",
                "UNCAC COSP Outcome 4/6",
            ),
        ]
        identities = [resolve_identity(row("4/6", source)) for source, _ in cases]
        self.assertEqual([i.key for i in identities], [key for _, key in cases])
        self.assertEqual(len({i.key for i in identities}), 3)
        self.assertIsNone(identities[2].official_symbol)

    def test_mixed_heading_does_not_invent_resolution_symbol(self):
        identity = resolve_identity(
            row("2025/328", "Economic and Social Council resolutions and decisions")
        )
        self.assertEqual(identity.key, "ECOSOC Outcome 2025/328")
        self.assertIsNone(identity.official_symbol)

    def test_governing_council_is_not_environment_assembly(self):
        identity = resolve_identity(row("19/1", "Governing Council of UNEP"))
        self.assertEqual(identity.key, "UNEP Governing Council Outcome 19/1")
        self.assertIsNone(identity.official_symbol)

    def test_full_symbol_in_plain_text_needs_no_hyperlink(self):
        identity = resolve_identity(
            row("S/RES/2254(2015)", "Security Council resolutions")
        )
        self.assertEqual(identity.key, "S/RES/2254(2015)")
        self.assertEqual(identity.status, "explicit")

    def test_short_full_symbol_from_curated_csv_is_not_trusted(self):
        identity = resolve_identity(
            row("4/6", "Human Rights Council resolutions", full_document_symbol="4/6")
        )
        self.assertEqual(identity.key, "A/HRC/RES/4/6")

    def test_decisions_and_presidential_statements_are_distinct(self):
        resolution = resolve_identity(row("4/6", "Human Rights Council resolutions"))
        decision = resolve_identity(row("4/6", "Human Rights Council decisions"))
        statement = resolve_identity(
            row("4/6", "President’s statements agreed upon by the Human Rights Council")
        )
        self.assertEqual(len({resolution.key, decision.key, statement.key}), 3)
        self.assertIsNone(decision.official_symbol)
        self.assertEqual(statement.key, "A/HRC/PRST/4/6")

    def test_contextless_number_cannot_be_promoted(self):
        with self.assertRaisesRegex(ValueError, "issuing body"):
            resolve_identity(row("4/6", "", entity="UNEP"))

    def test_unrecognized_body_is_scoped_not_guessed(self):
        identity = resolve_identity(row("4/6", "Some Committee decisions"))
        self.assertEqual(identity.key, "Some Committee decisions Decision 4/6")
        self.assertIsNone(identity.official_symbol)

    def test_security_council_year_is_preserved(self):
        identity = resolve_identity(row("2807 (2025)", "Security Council resolutions"))
        self.assertEqual(identity.key, "S/RES/2807(2025)")

    def test_language_and_query_are_not_part_of_symbol(self):
        identity = resolve_identity(
            row(
                "4/6",
                "Human Rights Council resolutions",
                link="https://docs.un.org/fr/A/HRC/RES/4/6?x=1",
            )
        )
        self.assertEqual(identity.key, "A/HRC/RES/4/6")


if __name__ == "__main__":
    unittest.main()
