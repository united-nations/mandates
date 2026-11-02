"""Replay reviewed background extractions only when source text and links match."""

import hashlib
import json
from pathlib import Path


def input_digest(input_text, hyperlinks):
    payload = {"input_text": input_text, "hyperlinks": hyperlinks}
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


class ReviewedBackgroundExtractor:
    def __init__(self, path):
        self.entries = {}
        for entry in json.loads(Path(path).read_text())["entries"]:
            key = entry["input_sha256"]
            if key in self.entries:
                raise ValueError(f"Duplicate reviewed background input: {key}")
            self.entries[key] = entry

    def __call__(self, input_text, hyperlinks):
        key = input_digest(input_text, hyperlinks)
        if key not in self.entries:
            raise ValueError(f"Background input has not been reviewed: {key}")
        return self.entries[key]["mandates"]

    def validate_inputs(self, year):
        # Check every input before extraction starts: the ordinary extractor
        # catches per-file errors, which must not hide a missing review here.
        from ppb_processing.c_extract_parsed import (
            find_section_with_heading,
            get_section_text,
        )

        seen = set()
        for path in Path(f"../data/processed/ppb{year}/json").glob("*.json"):
            data = json.loads(path.read_text())
            for section in find_section_with_heading(data, "Mandates and background"):
                text, _, links = get_section_text(section)
                self(text, links)
                seen.add(input_digest(text, links))
        if seen != set(self.entries):
            raise ValueError("Reviewed background inputs do not match the current documents")
        print(f"Verified {len(seen)} reviewed background inputs")
