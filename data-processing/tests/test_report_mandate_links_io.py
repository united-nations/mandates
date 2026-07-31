"""
Stage B tests for report_mandate_links.a_extract — the PURE halves of the I/O
boundary (selection partitioning, display-index building, row identity, the
JSONL sidecar). No database: everything that touches a connection is exercised
only through its pure counterpart, which is the design's point.

Run from data-processing/:
    uv run python -m unittest discover -s tests -v
"""

import json
import tempfile
import unittest
import uuid
from datetime import datetime, timezone
from pathlib import Path

from report_mandate_links.a_extract import (
    LinkRow,
    UnparsedNote,
    _build_display_index,
    _link_row_id,
    _partition_selection,
    write_unparsed_notes,
)

DELETED = datetime(2026, 1, 1, tzinfo=timezone.utc)  # any non-None deleted_at


def selection_row(recid, symbol, notes=(), deleted_at=None):
    return (recid, symbol, list(notes), deleted_at)


class PartitionSelectionTests(unittest.TestCase):
    def test_clean_report_is_kept_with_notes_verbatim(self):
        reports, counts = _partition_selection(
            [selection_row(101, "A/80/123", notes=["note one", "note two"])]
        )
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0].report_recid, 101)
        self.assertEqual(reports[0].report_symbol, "A/80/123")
        self.assertEqual(reports[0].notes, ("note one", "note two"))
        self.assertEqual(counts.selected_by_marc, 1)

    def test_null_symbol_removed_and_counted(self):
        reports, counts = _partition_selection([selection_row(102, None)])
        self.assertEqual(reports, ())
        self.assertEqual(counts.removed_null_symbol, 1)

    def test_corr_rev_tested_against_canonical_fold(self):
        # The spaced marker "/ Corr.1" folds to "/CORR.1" — the raw-byte test
        # ("/CORR." in the uppercased-but-unstripped symbol) would miss it.
        reports, counts = _partition_selection(
            [
                selection_row(103, "A/80/50/Corr.1"),
                selection_row(104, "A/80/51/ Corr.1"),
                selection_row(105, "S/2026/10/Rev.2"),
            ]
        )
        self.assertEqual(reports, ())
        self.assertEqual(counts.removed_corr_rev, 3)

    def test_deleted_removed_and_counted(self):
        reports, counts = _partition_selection(
            [selection_row(106, "A/80/60", deleted_at=DELETED)]
        )
        self.assertEqual(reports, ())
        self.assertEqual(counts.removed_deleted, 1)

    def test_clause_order_first_failure_wins(self):
        # A document that is both a corrigendum and soft-deleted counts under
        # clause (3), the first clause it fails — counts stay disjoint.
        _, counts = _partition_selection(
            [selection_row(107, "A/80/61/Corr.1", deleted_at=DELETED)]
        )
        self.assertEqual(counts.removed_corr_rev, 1)
        self.assertEqual(counts.removed_deleted, 0)

    def test_wider_marker_counted_not_excluded(self):
        reports, counts = _partition_selection(
            [
                selection_row(108, "A/80/70/CORR2"),         # bare no-period: counted
                selection_row(109, "A/80/71/CORRIGENDUM"),   # spelled out: counted
                selection_row(110, "A/80/72/Add.1"),         # addenda in scope, not counted
                selection_row(111, "E/2020/15/ADDENDUM"),    # spelled-out addendum: retained,
                                                             # NOT counted — the residual is
                                                             # corrigendum/revision forms only
            ]
        )
        self.assertEqual(len(reports), 4)  # all retained
        self.assertEqual(counts.wider_marker_retained, 2)

    def test_counts_reconcile_to_selected_total(self):
        _, counts = _partition_selection(
            [
                selection_row(111, "A/80/80", notes=["kept"]),
                selection_row(112, None),
                selection_row(113, "A/80/81/Rev.1"),
                selection_row(114, "A/80/82", deleted_at=DELETED),
            ]
        )
        self.assertEqual(counts.selected_by_marc, 4)
        self.assertEqual(
            counts.selected_by_marc,
            counts.removed_null_symbol + counts.removed_corr_rev
            + counts.removed_deleted + 1,  # 1 = reports parsed
        )


class BuildDisplayIndexTests(unittest.TestCase):
    def test_variants_group_under_folded_key_sorted(self):
        # Grammar-9 bracket variant and the bare form share one match_key; the
        # tuple is sorted so re-runs are byte-stable regardless of fetch order.
        index = _build_display_index(["A/RES/31/106[A]", "A/RES/31/106A"])
        self.assertEqual(
            index, {"A/RES/31/106A": ("A/RES/31/106A", "A/RES/31/106[A]")}
        )

    def test_singleton_key(self):
        index = _build_display_index(["S/RES/2664 (2022)"])
        self.assertEqual(index, {"S/RES/2664(2022)": ("S/RES/2664 (2022)",)})


class LinkRowIdTests(unittest.TestCase):
    ROW = LinkRow(
        report_symbol="A/80/123",
        report_recid=101,
        note_index=0,
        resolution_canonical="A/RES/79/1",
        resolution_match_key="A/RES/79/1",
        resolution_display_candidates=("A/RES/79/1",),
        resolution_role="co_equal",
        resolution_pinpoint=None,
        citation_sense="direct_request",
        citation_position="body",
        organ_provenance="stated",
        note_span=(12, 22),
        source_note_text="Submitted pursuant to General Assembly resolution 79/1.",
    )

    def test_identity_is_the_pinned_uuid5_form(self):
        # uuid5(NAMESPACE_URL, "<recid>:<note_index>:<canonical>:<span_start>") —
        # pinned literal so an accidental change to namespace, order, or join
        # fails here rather than silently re-keying the table.
        self.assertEqual(_link_row_id(self.ROW), "9a44d7f6-5240-515e-964a-f45dc9949804")

    def test_identity_recomputable_from_key_fields_only(self):
        rekeyed = LinkRow(
            **{
                **{f: getattr(self.ROW, f) for f in self.ROW.__dataclass_fields__},
                "source_note_text": "different non-key field",
            }
        )
        self.assertEqual(_link_row_id(rekeyed), _link_row_id(self.ROW))
        self.assertEqual(
            _link_row_id(self.ROW),
            str(uuid.uuid5(uuid.NAMESPACE_URL, "101:0:A/RES/79/1:12")),
        )


class WriteUnparsedNotesTests(unittest.TestCase):
    RECORDS = [
        UnparsedNote(
            report_symbol="A/80/123",
            report_recid=101,
            source_note_text="pursuant to the relevant resolutions",
            reason="test reason",
        ),
        UnparsedNote(
            report_symbol="S/2026/1",
            report_recid=102,
            source_note_text="Submitted pursuant to resolution 9/1 …",
            reason="other reason",
        ),
    ]

    def test_jsonl_round_trip_lf_sorted_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unparsed.jsonl"
            write_unparsed_notes(self.RECORDS, str(path))
            raw = path.read_bytes()
            self.assertNotIn(b"\r\n", raw)  # LF endings, whole file
            lines = raw.decode("utf-8").splitlines()
            self.assertEqual(len(lines), 2)
            first = json.loads(lines[0])
            self.assertEqual(
                list(first),
                ["reason", "report_recid", "report_symbol", "source_note_text"],
            )
            self.assertEqual(first["report_recid"], 101)

    def test_append_semantics(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unparsed.jsonl"
            write_unparsed_notes(self.RECORDS[:1], str(path))
            write_unparsed_notes(self.RECORDS[1:], str(path))
            lines = path.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 2)


if __name__ == "__main__":
    unittest.main()
