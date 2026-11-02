"""Reviewed extractions must never be replayed against changed source inputs."""

import json
import tempfile
import unittest
from pathlib import Path

from utils.reviewed_mandates import ReviewedBackgroundExtractor, input_digest


class ReviewedMandatesTests(unittest.TestCase):
    def test_only_exact_text_and_hyperlinks_replay(self):
        text = "Mandate derives from resolution 79/1."
        links = [["79/1", "https://docs.un.org/en/A/RES/79/1"]]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "review.json"
            path.write_text(json.dumps({"entries": [{
                "input_sha256": input_digest(text, links),
                "mandates": [],
            }]}))
            extractor = ReviewedBackgroundExtractor(path)
            self.assertEqual(extractor(text, links), [])
            self.assertEqual(extractor(text, [tuple(links[0])]), [])
            with self.assertRaisesRegex(ValueError, "has not been reviewed"):
                extractor(text + " Additional text.", links)
            with self.assertRaisesRegex(ValueError, "has not been reviewed"):
                extractor(text, [])

    def test_duplicate_review_keys_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "review.json"
            entry = {"input_sha256": "same", "mandates": []}
            path.write_text(json.dumps({"entries": [entry, entry]}))
            with self.assertRaisesRegex(ValueError, "Duplicate reviewed"):
                ReviewedBackgroundExtractor(path)


if __name__ == "__main__":
    unittest.main()
