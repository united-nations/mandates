"""Final SPM documents must retain entity boundaries despite missing styles."""

import unittest

import docx

from ppb_processing.b_parse_downloaded import annotate_elements


class BudgetParserTests(unittest.TestCase):
    def test_unstyled_mission_headings_start_separate_entities(self):
        document = docx.Document()
        for text in [
            "1.\tFirst mission",
            "",
            "A.\tProposed programme plan for 2027 and programme performance in 2025",
            "Overall orientation",
            "Mandates and background",
            "1.\tThe first mission implements its mandate.",
            "2.\tSecond mission",
            "($1,186,000)",
            "A.\tProposed programme plan for 2027",
            "Overall orientation",
            "Mandates and background",
            "2.\tThe second mission implements its mandate.",
        ]:
            document.add_paragraph(text)

        elements = annotate_elements(document)
        backgrounds = [e for e in elements if e.text == "Mandates and background"]
        self.assertEqual(len(backgrounds), 2)
        self.assertIn(("entity", "1.\tFirst mission"), backgrounds[0].position)
        self.assertIn(("entity", "2.\tSecond mission"), backgrounds[1].position)
        self.assertNotIn(("entity", "1.\tFirst mission"), backgrounds[1].position)
        prose = [e for e in elements if "implements its mandate" in (e.text or "")]
        self.assertTrue(all(e.block_type == "paragraph-1" for e in prose))

    def test_table_prevents_inference_across_unrelated_content(self):
        document = docx.Document()
        document.add_paragraph("1.\tA numbered paragraph")
        document.add_table(rows=1, cols=1)
        document.add_paragraph("A.\tProposed programme plan for 2027")

        element = annotate_elements(document)[1]
        self.assertEqual(element.block_type, "paragraph-1")


if __name__ == "__main__":
    unittest.main()
