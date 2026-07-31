"""
Stage A tests for report_mandate_links.a_extract — fixture-driven, no database.

Run from data-processing/:
    uv run python -m unittest discover -s tests -v

The transform is pure by design (I/O at the edges); if a test here ever needs a
connection, a boundary has been violated somewhere. Fixture provenance is
documented at the top of fixtures_sg_report_notes.py: doc-quoted seeds, to be
augmented from a live sample query.
"""

import unittest

import fixtures_sg_report_notes as fx
from report_mandate_links.a_extract import (
    SourceReport,
    canonical,
    classify_sense,
    extract,
    extract_pinpoint,
    match_key,
    recognise_citations,
    resolve_display,
    tag_role,
)


def extract_notes(*notes, recid=101, symbol=fx.JOINT_REPORT_A):
    """One-report extract over the fixture display index."""
    report = SourceReport(report_recid=recid, report_symbol=symbol, notes=tuple(notes))
    return extract([report], fx.DISPLAY_INDEX)


def sole_citation(note):
    """The single RawCitation a note is expected to yield."""
    recognition = recognise_citations(note)
    assert len(recognition.citations) == 1, recognition
    return recognition.citations[0]


class TestSymbolFunctions(unittest.TestCase):
    """canonical / match_key / resolve_display — §5's three-function contract."""

    def test_canonical_strips_whitespace_and_uppercases(self):
        # Grammar 8: the spaced registry form folds to bare under the whitespace strip.
        self.assertEqual(canonical(fx.REGISTRY_SPACED_LETTER), "A/RES/72/266A")
        self.assertEqual(canonical("s/res/2779 (2025)"), "S/RES/2779(2025)")

    def test_canonical_never_folds_brackets(self):
        # The single most reversal-costly behaviour: brackets survive canonical —
        # folding into identity would break the symbol_normalized equality (§6).
        self.assertEqual(canonical(fx.REGISTRY_BRACKET_SINGLE), "A/RES/31/106[A]")
        self.assertEqual(canonical(fx.REGISTRY_BRACKET_ROMAN), "A/RES/40/252[XII]")

    def test_match_key_folds_bracketed_parts(self):
        # Grammar 9 (single char) and grammar 10 (multi-char) — one rule, same fold.
        self.assertEqual(match_key("A/RES/31/106[A]"), "A/RES/31/106A")
        self.assertEqual(match_key("A/RES/40/252[XII]"), "A/RES/40/252XII")
        self.assertEqual(match_key("A/RES/289(IV)[AA]"), "A/RES/289(IV)AA")

    def test_bracket_fold_in_both_directions(self):
        # Explicitly paired: the SAME string is preserved by canonical and folded by
        # match_key. Layer order matters — the fold sits above identity.
        registry = fx.REGISTRY_BRACKET_SINGLE
        self.assertEqual(canonical(registry), registry)          # identity: no fold
        self.assertEqual(match_key(canonical(registry)), "A/RES/31/106A")  # join: folds

    def test_match_key_leaves_letter_ranges_alone(self):
        # Grammars 11 and 12: a range is not a citation of either part — no fold.
        self.assertEqual(match_key(canonical(fx.REGISTRY_RANGE_BARE)), "A/RES/31/141A-B")
        # Grammar 12's en dash survives (only whitespace is stripped) — those two rows
        # fall to pending_coverage by design.
        self.assertEqual(
            match_key(canonical(fx.REGISTRY_RANGE_EN_DASH)), "A/RES/79/93A–B"
        )

    def test_match_key_is_identity_on_unbracketed_forms(self):
        for symbol in ("A/RES/79/223", "S/RES/1325(2000)", "A/HRC/RES/10/1",
                       "E/RES/1978/1", "A/RES/ES-10/1"):
            self.assertEqual(match_key(symbol), symbol)

    def test_resolve_display_returns_all_variants_or_empty(self):
        self.assertEqual(
            resolve_display("A/RES/40/2A", fx.DISPLAY_INDEX),
            ("A/RES/40/2[A]", "A/RES/40/2A"),
        )
        self.assertEqual(resolve_display("A/RES/78/176", fx.DISPLAY_INDEX), ())


class TestRecogniseCitations(unittest.TestCase):
    """The include rule, the grammars in prose, and organ inference (§3)."""

    def test_noise_element_is_not_kept(self):
        recognition = recognise_citations(fx.NOISE)
        self.assertEqual(recognition.citations, ())
        self.assertFalse(recognition.had_mandate_construction)

    def test_non_resolution_reference_is_rejected_but_counted(self):
        recognition = recognise_citations(fx.MONTREAL)
        self.assertEqual(recognition.citations, ())
        self.assertTrue(recognition.had_mandate_construction)

    def test_mandate_construction_with_no_symbol_is_counted(self):
        recognition = recognise_citations(fx.RELEVANT_RESOLUTIONS)
        self.assertEqual(recognition.citations, ())
        self.assertTrue(recognition.had_mandate_construction)

    def test_organ_is_never_guessed(self):
        # Roman-session shape does not imply GA: with no organ mention earlier in the
        # element, the citation is withheld and the element is flagged for the
        # diagnostic record instead.
        recognition = recognise_citations(fx.DIRECT_ROMAN_BARE)
        self.assertEqual(recognition.citations, ())
        self.assertTrue(recognition.had_mandate_construction)

    def test_in_pursuance_is_a_mandate_construction(self):
        # S-006 verb widening ([LIVE] fixture): "In pursuance of ..." carries no other
        # construction verb — before the widening this element was ignored entirely.
        recognition = recognise_citations(fx.IN_PURSUANCE)
        self.assertTrue(recognition.had_mandate_construction)
        self.assertEqual(
            [citation.organ_prefix for citation in recognition.citations], ["A/RES/"]
        )

    def test_direct_citation_resolves_adjacent_organ(self):
        citation = sole_citation(fx.DIRECT_SC)
        self.assertEqual(citation.organ_prefix, "S/RES/")
        self.assertIn("resolution 2779 (2025)", citation.prose_symbol)

    def test_bare_citation_inherits_organ_from_earlier_in_element(self):
        # §3's real subtlety: "… most recently resolution 2811 (2025)" names no organ;
        # it must inherit S/RES/ from the "Security Council" mention earlier in the
        # SAME element. Get this wrong and renewals are mis-prefixed.
        recognition = recognise_citations(fx.FOUNDING_RENEWAL)
        self.assertEqual(len(recognition.citations), 2)
        self.assertEqual(
            [citation.organ_prefix for citation in recognition.citations],
            ["S/RES/", "S/RES/"],
        )

    def test_joint_citations_each_take_their_nearest_preceding_organ(self):
        recognition = recognise_citations(fx.ADDITIONAL_JOINT)
        self.assertEqual(
            [citation.organ_prefix for citation in recognition.citations],
            ["A/RES/", "E/RES/"],
        )

    def test_mixed_element_flags_and_still_returns_resolved_citations(self):
        # One withheld token must not annul the element's resolvable citations.
        recognition = recognise_citations(fx.MIXED_BARE_THEN_RESOLVED)
        self.assertTrue(recognition.had_unresolvable_citation)
        self.assertEqual(
            [citation.organ_prefix for citation in recognition.citations], ["S/RES/"]
        )

    def test_prst_symbol_is_recognised_in_symbol_form(self):
        citation = sole_citation(fx.PRST)
        self.assertEqual(citation.organ_prefix, "S/PRST/")
        self.assertEqual(citation.prose_symbol, "S/PRST/2024/7")

    def test_citations_are_returned_in_note_order(self):
        recognition = recognise_citations(fx.FOUNDING_RENEWAL)
        spans = [citation.note_span for citation in recognition.citations]
        self.assertEqual(spans, sorted(spans))


class TestClassification(unittest.TestCase):
    """Sense (§3) and role (§4.2) from phrasing."""

    def test_direct_request(self):
        citation = sole_citation(fx.DIRECT_SC)
        self.assertEqual(classify_sense(citation, fx.DIRECT_SC), "direct_request")
        self.assertEqual(tag_role(citation, fx.DIRECT_SC), "co_equal")

    def test_activities_carried_out_outranks_nearer_generic_cue(self):
        # In the UNFICYP form the generic "pursuant to" sits NEARER the citation than
        # "activities carried out"; the specific cue must still win.
        citation = sole_citation(fx.UNFICYP)
        self.assertEqual(classify_sense(citation, fx.UNFICYP), "activities_carried_out")
        self.assertEqual(tag_role(citation, fx.UNFICYP), "co_equal")

    def test_body_established(self):
        citation = sole_citation(fx.COMMITTEE)
        self.assertEqual(classify_sense(citation, fx.COMMITTEE), "body_established")
        self.assertEqual(tag_role(citation, fx.COMMITTEE), "establishing")

    def test_additional_joint(self):
        recognition = recognise_citations(fx.ADDITIONAL_JOINT)
        for citation in recognition.citations:
            self.assertEqual(
                classify_sense(citation, fx.ADDITIONAL_JOINT), "additional_joint"
            )
            self.assertEqual(tag_role(citation, fx.ADDITIONAL_JOINT), "additional")

    def test_founding_and_most_recent_from_one_note(self):
        recognition = recognise_citations(fx.FOUNDING_RENEWAL)
        founding, renewal = recognition.citations
        self.assertEqual(classify_sense(founding, fx.FOUNDING_RENEWAL), "founding_renewal")
        self.assertEqual(classify_sense(renewal, fx.FOUNDING_RENEWAL), "founding_renewal")
        self.assertEqual(tag_role(founding, fx.FOUNDING_RENEWAL), "founding")
        self.assertEqual(tag_role(renewal, fx.FOUNDING_RENEWAL), "most_recent")

    def test_established_cue_is_body_agnostic_group_in_pursuance_of(self):
        # The establishment cue must not require the word "committee": a Group
        # established with the "in pursuance of" connective carries the sense and the
        # role, both of which the committee-anchored vocabulary missed.
        citation = sole_citation(fx.GROUP_ESTABLISHED_IN_PURSUANCE)
        self.assertEqual(
            classify_sense(citation, fx.GROUP_ESTABLISHED_IN_PURSUANCE),
            "body_established",
        )
        self.assertEqual(
            tag_role(citation, fx.GROUP_ESTABLISHED_IN_PURSUANCE), "establishing"
        )

    def test_established_cue_is_body_agnostic_panel_pursuant_to(self):
        # "established pursuant to" verbatim present, body a Panel: the sense cue
        # missed it while the role cue caught it — after the widening both agree.
        citation = sole_citation(fx.PANEL_ESTABLISHED_PURSUANT)
        self.assertEqual(
            classify_sense(citation, fx.PANEL_ESTABLISHED_PURSUANT),
            "body_established",
        )
        self.assertEqual(tag_role(citation, fx.PANEL_ESTABLISHED_PURSUANT), "establishing")

    def test_established_under_carries_sense_and_role(self):
        # The third observed connective, previously in no vocabulary at all. Both
        # occurrences of 687 (1991) sit after the cue and both take sense and role.
        recognition = recognise_citations(fx.COMMISSION_ESTABLISHED_UNDER)
        self.assertEqual(len(recognition.citations), 2)
        for citation in recognition.citations:
            self.assertEqual(
                classify_sense(citation, fx.COMMISSION_ESTABLISHED_UNDER),
                "body_established",
            )
            self.assertEqual(
                tag_role(citation, fx.COMMISSION_ESTABLISHED_UNDER), "establishing"
            )

    def test_authorized_under_is_not_an_establishment_cue(self):
        # "under" is admitted only anchored on "established": the observed
        # "authorized under" construction must keep classifying via the generic cue.
        recognition = recognise_citations(fx.UNSOM_AUTHORIZED_UNDER)
        self.assertEqual(len(recognition.citations), 2)
        for citation in recognition.citations:
            self.assertEqual(
                classify_sense(citation, fx.UNSOM_AUTHORIZED_UNDER), "direct_request"
            )
            self.assertEqual(tag_role(citation, fx.UNSOM_AUTHORIZED_UNDER), "co_equal")

    def test_prst_sense(self):
        citation = sole_citation(fx.PRST)
        self.assertEqual(classify_sense(citation, fx.PRST), "prst_note_decision")

    def test_pinpoint_captured_and_absent_is_none(self):
        with_pinpoint = sole_citation(fx.PINPOINT)
        self.assertEqual(extract_pinpoint(with_pinpoint), "para. 50")
        without = sole_citation(fx.DIRECT_SC)
        self.assertIsNone(extract_pinpoint(without))


class TestExtract(unittest.TestCase):
    """The pure spine end-to-end: canonicalisation, lookup, ordering, determinism."""

    def test_each_prose_grammar_canonicalises_per_the_rules_table(self):
        expected = {
            fx.DIRECT_GA: "A/RES/78/176",          # grammar 1
            fx.DIRECT_SC: "S/RES/2779(2025)",      # grammar 2
            fx.ADDITIONAL_JOINT: "E/RES/2024/8",   # grammar 3 (second citation below)
            fx.DIRECT_HRC: "A/HRC/RES/41/19",      # grammar 4
            fx.DIRECT_ROMAN: "A/RES/3376(XXX)",    # grammar 5
            fx.DIRECT_ES: "A/RES/ES-10/1",         # grammar 6
            fx.DIRECT_LETTER: "A/RES/72/266A",     # grammars 7/8
            fx.DIRECT_RANGE: "A/RES/31/141A-B",    # grammar 11
        }
        for note, canonical_symbol in expected.items():
            with self.subTest(note=note):
                output = extract_notes(note)
                self.assertEqual(
                    output.links[-1].resolution_canonical, canonical_symbol
                )
                self.assertEqual(output.unparsed, ())

    def test_in_pursuance_notes_reach_link_rows_with_correct_symbols(self):
        # S-006 verb widening, both [LIVE] fixtures. The second is the no-space letter
        # part the survey extractor gets wrong (parent A/RES/47/70); _LETTER_PART must
        # resolve it to the actual cited part.
        for note, symbol in ((fx.IN_PURSUANCE, "A/RES/51/131"),
                             (fx.IN_PURSUANCE_LETTER_NOSPACE, "A/RES/47/70F")):
            with self.subTest(note=note):
                output = extract_notes(note)
                self.assertEqual(
                    [row.resolution_canonical for row in output.links], [symbol]
                )
                self.assertEqual(output.unparsed, ())

    def test_letter_roman_session_is_recognised(self):
        # "645 G (XXIII)" — a number, a single-letter section and a roman-numeral session.
        # It canonicalises with the ECOSOC prefix and sits before two ordinary members.
        output = extract_notes(fx.LETTER_ROMAN_SESSION_NOTE)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["E/RES/645G(XXIII)", "E/RES/1999/62", "E/RES/1999/65"],
        )

    def test_non_emergency_special_session_is_recognised(self):
        # "S-26/2" — a non-emergency special session, distinct from the emergency "ES-"
        # tag. Its organ is inherited from the "General Assembly" mention earlier on.
        output = extract_notes(fx.SPECIAL_SESSION_NOTE)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["A/RES/S-26/2", "A/RES/75/284"],
        )

    def test_dated_interpolation_does_not_truncate_the_list(self):
        # "resolutions 1745 (LIV) of 16 May 1973, 1989/64 and 1995/57" — the date between
        # the first member and the rest must not end the list. "Council decision 2005/247"
        # after them is a decision, not a resolution, and is correctly excluded.
        output = extract_notes(fx.DATED_LIST_NOTE)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["E/RES/1745(LIV)", "E/RES/1989/64", "E/RES/1995/57"],
        )

    def test_pinpoint_prefix_interpolation_does_not_truncate_the_list(self):
        # "resolutions 2139 (2014), para. 10 of 2165 (2014) and para. 5 of 2191 (2014)"
        # — an interpolated pinpoint before a member must not end the list. Before the
        # separator admitted it, 2165 and 2191 were silently dropped: no citation and
        # no flag, since a token outside any list span is never scanned.
        output = extract_notes(fx.SYRIA_PINPOINT_LIST)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["S/RES/2139(2014)", "S/RES/2165(2014)", "S/RES/2191(2014)"],
        )
        self.assertEqual(output.unparsed, ())
        for row in output.links:
            self.assertEqual(row.citation_sense, "direct_request")
            self.assertEqual(row.resolution_role, "co_equal")

    def test_pinpoint_interpolation_recovers_member_without_reaching_across_and_and(self):
        # The doubled "and and" (source typo): 2165 is recovered through the pinpoint
        # interpolation, but the list must NOT reach across "and and para. 5 of
        # Security Council" — 2191 resolves via its own later "resolution" head.
        output = extract_notes(fx.SYRIA_PINPOINT_DOUBLED_AND)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["S/RES/2139(2014)", "S/RES/2165(2014)", "S/RES/2191(2014)"],
        )
        self.assertEqual(output.unparsed, ())

    def test_pinpoint_postfix_interpolation_does_not_truncate_the_list(self):
        # "resolutions 69/205, paragraph 4, and 68/199" — the postfix pinpoint after a
        # member must not end the list; the trailing ", paragraph 24." after the last
        # member is left unconsumed (the list simply ends).
        output = extract_notes(fx.POSTFIX_PINPOINT_LIST)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["A/RES/69/205", "A/RES/68/199"],
        )
        self.assertEqual(output.unparsed, ())

    def test_session_appositive_interpolation_does_not_truncate_the_list(self):
        # "S-27/2 of the 27th special session in 2002, 58/282 and 61/272" — the
        # appositive after a special-session member must not end the list.
        output = extract_notes(fx.SESSION_APPOSITIVE_LIST)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["A/RES/S-27/2", "A/RES/58/282", "A/RES/61/272"],
        )
        self.assertEqual(output.unparsed, ())

    def test_arbitrary_interpolation_is_still_not_admitted(self):
        # Only the observed interpolation shapes extend a list. Arbitrary text — a
        # parenthetical aside, a "decision" citation, prose with intervening words, a
        # missing comma — still ends the list where it begins: this note's five
        # recognised citations stay exactly five, and its known head/member-defect
        # losses (61/244, 61/276, the "including" list) stay dropped.
        output = extract_notes(fx.ARBITRARY_INTERPOLATION_NOTE)
        self.assertEqual(
            [row.resolution_canonical for row in output.links],
            ["A/RES/51/243", "A/RES/57/281B", "A/RES/57/305",
             "A/RES/59/266", "A/RES/60/266"],
        )

    def test_citation_side_match_key_usually_equals_canonical(self):
        output = extract_notes(fx.DIRECT_RANGE)
        row = output.links[0]
        self.assertEqual(row.resolution_match_key, row.resolution_canonical)

    def test_display_candidates_come_from_lookup_never_construction(self):
        # Prose "resolution 31/106 A" must meet its bracket-form registry row through
        # the fold — under canonical alone they never meet (§5).
        row = extract_notes(fx.DIRECT_BRACKET_REGISTRY).links[0]
        self.assertEqual(row.resolution_canonical, "A/RES/31/106A")
        self.assertEqual(row.resolution_display_candidates, ("A/RES/31/106[A]",))

    def test_display_candidates_carry_every_variant_unpicked(self):
        # A real fold-created cluster: two registry variants under one match_key.
        # Both are stored; the pick is read-time (§0.1).
        row = extract_notes(fx.DIRECT_CLUSTER).links[0]
        self.assertEqual(
            row.resolution_display_candidates, ("A/RES/40/2[A]", "A/RES/40/2A")
        )

    def test_display_candidates_empty_when_no_registry_row(self):
        row = extract_notes(fx.DIRECT_GA).links[0]
        self.assertEqual(row.resolution_display_candidates, ())

    def test_pinpoint_reaches_the_row(self):
        row = extract_notes(fx.PINPOINT).links[0]
        self.assertEqual(row.resolution_canonical, "S/RES/2808(2025)")
        self.assertEqual(row.resolution_pinpoint, "para. 50")

    def test_organ_provenance_stated_when_mention_abuts_head(self):
        # "Security Council resolution 2779 (2025)" — the organ mention immediately
        # precedes the head (zero-word gap), so provenance is "stated".
        row = extract_notes(fx.DIRECT_SC).links[0]
        self.assertEqual(row.organ_provenance, "stated")

    def test_organ_provenance_inherited_across_a_word_gap(self):
        # The renewal "most recently resolution 2811 (2025)" carries no organ of its own;
        # it inherits S/RES/ from "Security Council" earlier in the element, across a
        # non-zero word gap -> "inherited". The first citation abuts its head -> "stated".
        rows = extract_notes(fx.FOUNDING_RENEWAL).links
        self.assertEqual(
            [(row.resolution_canonical, row.organ_provenance) for row in rows],
            [("S/RES/350(1974)", "stated"), ("S/RES/2811(2025)", "inherited")],
        )

    def test_organ_provenance_later_list_member_is_inherited(self):
        # A later member of a "resolutions X and Y" list appeared as a bare token, never
        # written next to an organ, so it is "inherited" even though the head is near —
        # first member stated, second inherited.
        rows = extract_notes(fx.LIST_TWO_MEMBERS).links
        self.assertEqual(
            [(row.resolution_canonical, row.organ_provenance) for row in rows],
            [("A/RES/61/241", "stated"), ("A/RES/61/642", "inherited")],
        )

    def test_organ_provenance_intrinsic_for_prst(self):
        # PRST names its organ in the symbol itself, so no mention is needed -> "intrinsic".
        row = extract_notes(fx.PRST).links[0]
        self.assertEqual(row.organ_provenance, "intrinsic")

    def test_unresolvable_notes_become_unparsed_records_not_rows(self):
        output = extract_notes(fx.MONTREAL, fx.RELEVANT_RESOLUTIONS, fx.DIRECT_ROMAN_BARE)
        self.assertEqual(output.links, ())
        self.assertEqual(len(output.unparsed), 3)
        # Verbatim note text is the evidence — preserved exactly.
        self.assertEqual(
            [record.source_note_text for record in output.unparsed],
            [fx.MONTREAL, fx.RELEVANT_RESOLUTIONS, fx.DIRECT_ROMAN_BARE],
        )

    def test_mixed_element_keeps_resolved_links_and_records_the_withheld_token(self):
        # Capture completely AND record: the element's resolvable citation becomes a
        # link row, the organ-less one becomes a diagnostic record — both, not either.
        output = extract_notes(fx.MIXED_BARE_THEN_RESOLVED)
        self.assertEqual(
            [row.resolution_canonical for row in output.links], ["S/RES/2779(2025)"]
        )
        self.assertEqual(len(output.unparsed), 1)
        record = output.unparsed[0]
        self.assertEqual(record.source_note_text, fx.MIXED_BARE_THEN_RESOLVED)
        self.assertIn("governing organ", record.reason)

    def test_organ_is_never_inherited_across_note_elements(self):
        # The worst failure class (§7): the first element names Security Council; the
        # second's bare "resolution 2811 (2025)" must NOT inherit it — it is withheld
        # and recorded instead.
        output = extract_notes(fx.DIRECT_SC, fx.BARE_RENEWAL_ELEMENT)
        self.assertEqual(
            [row.resolution_canonical for row in output.links], ["S/RES/2779(2025)"]
        )
        self.assertEqual(len(output.unparsed), 1)
        self.assertEqual(output.unparsed[0].source_note_text, fx.BARE_RENEWAL_ELEMENT)

    def test_pure_noise_is_ignored_entirely(self):
        output = extract_notes(fx.NOISE)
        self.assertEqual(output.links, ())
        self.assertEqual(output.unparsed, ())

    def test_dual_symbol_report_lands_verbatim(self):
        # Unresolved dual-symbol decision, straightforward reading: it is the row's report
        # identity, unsplit, one row per cited resolution.
        report = SourceReport(
            report_recid=301,
            report_symbol=fx.DUAL_SYMBOL_REPORT,
            notes=(fx.FOUNDING_RENEWAL,),
        )
        output = extract([report], fx.DISPLAY_INDEX)
        self.assertEqual(len(output.links), 2)
        for row in output.links:
            self.assertEqual(row.report_symbol, fx.DUAL_SYMBOL_REPORT)

    def test_output_is_sorted_by_recid_note_index_then_span(self):
        report_late = SourceReport(202, fx.JOINT_REPORT_B, (fx.DIRECT_GA,))
        report_early = SourceReport(
            101, fx.JOINT_REPORT_A, (fx.DIRECT_SC, fx.FOUNDING_RENEWAL)
        )
        output = extract([report_late, report_early], fx.DISPLAY_INDEX)
        self.assertEqual(
            [(row.report_recid, row.resolution_canonical) for row in output.links],
            [
                (101, "S/RES/2779(2025)"),   # recid 101, note 0
                (101, "S/RES/350(1974)"),    # recid 101, note 1, earlier span
                (101, "S/RES/2811(2025)"),   # recid 101, note 1, later span
                (202, "A/RES/78/176"),       # recid 202
            ],
        )

    def test_determinism_identical_input_identical_output(self):
        reports = [
            SourceReport(101, fx.JOINT_REPORT_A, (fx.FOUNDING_RENEWAL, fx.MONTREAL)),
            SourceReport(202, fx.JOINT_REPORT_B, (fx.ADDITIONAL_JOINT,)),
            SourceReport(301, fx.DUAL_SYMBOL_REPORT, (fx.UNFICYP, fx.PRST)),
        ]
        first = extract(reports, fx.DISPLAY_INDEX)
        second = extract(reports, fx.DISPLAY_INDEX)
        self.assertEqual(first, second)
        # Input order must not leak into output order either.
        reversed_run = extract(list(reversed(reports)), fx.DISPLAY_INDEX)
        self.assertEqual(first, reversed_run)


if __name__ == "__main__":
    unittest.main()
