"""Budget traversal must carry issuing-body context across subprogramme blocks."""

import importlib
import sys
import types
import unittest
from unittest.mock import patch


class IdentityExtractionTests(unittest.TestCase):
    def test_subprogramme_does_not_discard_parent_issuer(self):
        # Extraction of table references needs no model calls or credentials.
        stub = types.ModuleType("utils.llm_extract_mandates")
        stub.llm_extract_mandates = lambda *args: []
        with patch.dict(sys.modules, {"utils.llm_extract_mandates": stub}):
            extractor = importlib.import_module("ppb_processing.c_extract_parsed")
        table = {
            "block_type": "table-content",
            "text": "",
            "children": [],
            "table_content": [
                [
                    {"text": "4/6", "hyperlinks": []},
                    {"text": "Office", "hyperlinks": []},
                ]
            ],
        }
        subprogramme = {
            "block_type": "subprogramme",
            "text": "Subprogramme 1 – Rights",
            "children": [table],
        }
        section = {"children": [subprogramme]}
        rows = extractor.get_mandates(
            section,
            mandate_source="Human Rights Council resolutions",
            entity="OHCHR",
            file_name="source.json",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][3], "Human Rights Council resolutions")
        self.assertEqual(rows[0][4], "Subprogramme 1 – Rights")


if __name__ == "__main__":
    unittest.main()
