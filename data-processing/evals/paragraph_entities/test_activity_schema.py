"""Evidence safeguards for the frozen extraction pilot."""
import unittest
from activity_schema import Evidence, evidence_offsets, validate_output


class EvidenceTests(unittest.TestCase):
    def test_offsets_preserve_source_whitespace(self):
        source = 'Requests the\u00a0Secretary-General\nto report.'
        span = evidence_offsets(Evidence(paragraph_ref='p1', quote='the Secretary-General to report', occurrence=0), {'p1': source})
        self.assertEqual(source[span['start']:span['end']], span['quote'])
        self.assertTrue(span['whitespace_aligned'])

    def test_invented_or_wrong_occurrence_rejected(self):
        for quote, occurrence in [('Secretary General', 0), ('report', 1)]:
            with self.assertRaises(ValueError):
                evidence_offsets(Evidence(paragraph_ref='p1', quote=quote, occurrence=occurrence), {'p1': 'Secretary-General to report'})

    def test_repeated_quote_selects_correct_occurrence(self):
        span = evidence_offsets(Evidence(paragraph_ref='p1', quote='report', occurrence=1), {'p1': 'report and report'})
        self.assertEqual(span['start'], 11)

    def test_context_cannot_become_activity_on_its_own(self):
        task = {'input': {'document': {'issuer': {'normalized_name': 'GA', 'aliases': ['General Assembly']}}, 'target': [{'ref': 'p2', 'text': 'Takes note of the report.'}], 'context': [{'ref': 'p1', 'text': 'Requests a report.'}]}}
        activity = {'activity_type': 'reporting', 'activity_subtype': 'written_report', 'evidence': [{'paragraph_ref': 'p1', 'quote': 'Requests a report', 'occurrence': 0}], 'assignees': [], 'deliverables': [], 'institutional_target': None}
        with self.assertRaises(ValueError):
            validate_output({'activities': [activity], 'mentioned_entities': [], 'uncertainties': []}, task)
        activity['evidence'] = [{'paragraph_ref': 'p2', 'quote': 'report', 'occurrence': 0}]
        activity['activity_subtype'] = 'funding'
        with self.assertRaises(ValueError):
            validate_output({'activities': [activity], 'mentioned_entities': [], 'uncertainties': []}, task)


if __name__ == '__main__':
    unittest.main()
