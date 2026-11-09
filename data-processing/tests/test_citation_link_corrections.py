"""Reviewed corrections are scoped and reject unexpectedly changed inputs."""

import unittest

import pandas as pd

from utils.data_cleaning import apply_reviewed_link_corrections


class CitationLinkCorrectionTests(unittest.TestCase):
    def test_corrects_only_the_reviewed_document(self):
        original = "https://docs.un.org/en/A/HRC/RES/77/318"
        row = {"link": original, "mandate_source": None}
        unchanged = apply_reviewed_link_corrections(
            pd.DataFrame([row]), "different.json", 2027
        )
        self.assertEqual(unchanged.iloc[0]["link"], original)
        corrected = apply_reviewed_link_corrections(
            pd.DataFrame([row]), "A_81_6 (SECT. 3)_ADD.2.json", 2027
        )
        self.assertEqual(corrected.iloc[0]["link"], "https://docs.un.org/en/A/RES/77/318")
        self.assertEqual(corrected.iloc[0]["mandate_source"], "General Assembly resolutions")

    def test_changed_correction_target_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "no longer matches"):
            apply_reviewed_link_corrections(
                pd.DataFrame([{"link": "different", "mandate_source": None}]),
                "A_81_6 (SECT. 3)_ADD.2.json",
                2027,
            )

    def test_joint_report_preserves_original_citation_text(self):
        corrected = apply_reviewed_link_corrections(
            pd.DataFrame([{
                "link": "https://docs.un.org/en/A/74/73-/E/2019/14",
                "symbol": "A/74/73-/E/2019/14",
                "mandate_source": None,
            }]),
            "A_81_6 (SECT. 1).json",
            2027,
        )
        self.assertEqual(corrected.iloc[0]["link"], "https://docs.un.org/en/A/74/73")
        self.assertEqual(corrected.iloc[0]["symbol"], "A/74/73-/E/2019/14")


if __name__ == "__main__":
    unittest.main()
