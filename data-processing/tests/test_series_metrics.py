import importlib.util
import sys
import sqlite3
from unittest.mock import MagicMock
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("series_metrics", ROOT / "series_metrics.py")
series_metrics = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = series_metrics
assert spec.loader
spec.loader.exec_module(series_metrics)


def member(symbol, day):
    return series_metrics.SeriesMember(symbol, "topic", "GA", "RES", day)


class SeriesMetricsTests(unittest.TestCase):
    def test_orders_by_complete_publication_date(self):
        a = member("A", date(2020, 1, 1))
        b = member("B", date(2021, 2, 1))
        c = member("C", date(2022, 3, 1))
        edges = series_metrics.resolve_predecessors([c, a, b])
        self.assertEqual([(x.member.symbol, x.previous.symbol if x.previous else None,
                           x.ordering_status) for x in edges], [
            ("A", None, "first"), ("B", "A", "ordered"), ("C", "B", "ordered")])

    def test_equal_dates_are_ambiguous_and_not_bridged(self):
        a = member("A", date(2020, 1, 1))
        b = member("B", date(2021, 1, 1))
        c = member("C", date(2021, 1, 1))
        d = member("D", date(2022, 1, 1))
        edges = series_metrics.resolve_predecessors([a, b, c, d])
        self.assertEqual([x.ordering_status for x in edges],
                         ["first", "ambiguous_order", "ambiguous_order", "ambiguous_order"])
        self.assertTrue(all(x.previous is None for x in edges[1:]))

    def test_missing_date_is_ambiguous(self):
        edge = series_metrics.resolve_predecessors([member("A", None)])[0]
        self.assertEqual(edge.ordering_status, "ambiguous_order")

    def test_one_missing_date_makes_the_entire_series_ambiguous(self):
        a = member("A", date(2020, 1, 1))
        unknown = member("B", None)
        c = member("C", date(2022, 1, 1))
        edges = series_metrics.resolve_predecessors([c, unknown, a])
        self.assertEqual({edge.member.symbol for edge in edges}, {"A", "B", "C"})
        self.assertTrue(all(edge.ordering_status == "ambiguous_order" for edge in edges))
        self.assertTrue(all(edge.previous is None for edge in edges))

    def test_word_token_similarity_and_deltas(self):
        a = member("A", date(2020, 1, 1))
        b = member("B", date(2021, 1, 1))
        edge = series_metrics.Predecessor(b, a, "ordered")
        metrics = {
            "A": series_metrics.TextMetric("a" * 64, 3, "one two three"),
            "B": series_metrics.TextMetric("b" * 64, 4, "one two four five"),
        }
        values = series_metrics.comparison_values(edge, metrics)
        self.assertEqual(values["status"], "ready")
        self.assertEqual(values["delta"], 1)
        self.assertAlmostEqual(values["delta_percent"], 1 / 3)
        self.assertAlmostEqual(values["similarity"], 0.5)

    def test_missing_immediate_predecessor_is_not_bridged(self):
        a = member("A", date(2020, 1, 1))
        b = member("B", date(2021, 1, 1))
        c = member("C", date(2022, 1, 1))
        edges = series_metrics.resolve_predecessors([a, b, c])
        values = series_metrics.comparison_values(edges[2], {
            "A": series_metrics.TextMetric("a" * 64, 2, "one two"),
            "C": series_metrics.TextMetric("c" * 64, 2, "one three"),
        })
        self.assertEqual(values["previous_symbol"], "B")
        self.assertEqual(values["status"], "missing_predecessor_text")
        self.assertIsNone(values["similarity"])

    def test_only_exact_current_parse_generations_supply_metrics(self):
        with sqlite3.connect(":memory:") as db:
            db.execute("ATTACH DATABASE ':memory:' AS digitallibrary")
            db.execute("CREATE TABLE digitallibrary.document_text_metrics (symbol_normalized TEXT, lang TEXT, content_sha256 TEXT, word_count INTEGER, token_text TEXT, text_profile_version TEXT, metric_version TEXT, parser_version TEXT, source_parsed_at TEXT)")
            db.execute("CREATE TABLE digitallibrary.document_files (symbol_normalized TEXT, lang TEXT, status TEXT)")
            db.execute("CREATE TABLE digitallibrary.document_parses (symbol_normalized TEXT, lang TEXT, parser_version TEXT, parsed_at TEXT)")
            for symbol, generation, status, parser in [
                ("current", "new", "parsed", "v1"),
                ("old", "old", "parsed", "v1"),
                ("unknown", None, "parsed", "v1"),
                ("failed", "new", "parse_failed", "v1"),
                ("wrong_parser", "new", "parsed", "v0"),
            ]:
                db.execute("INSERT INTO digitallibrary.document_text_metrics VALUES (?,?,?,?,?,?,?,?,?)", (symbol,"en","hash",2,"one two",series_metrics.TEXT_PROFILE_VERSION,series_metrics.TEXT_METRIC_VERSION,parser,generation))
                db.execute("INSERT INTO digitallibrary.document_files VALUES (?,?,?)", (symbol,"en",status))
                db.execute("INSERT INTO digitallibrary.document_parses VALUES (?,?,?,?)", (symbol,"en","v1","new"))
            cursor = MagicMock()
            cursor.execute.side_effect = lambda sql, params: setattr(cursor.fetchall, "return_value", db.execute(sql.replace("%s", "?"), params).fetchall())
            self.assertEqual(set(series_metrics.fetch_metrics(cursor)), {"current"})

    def test_worker_deduplicates_catalogue_records_before_series_edges(self):
        import inspect
        source = inspect.getsource(series_metrics.fetch_members)
        self.assertIn("DISTINCT ON (upper(regexp_replace(rs.document_symbol", source)
        self.assertIn("ORDER BY upper(regexp_replace(rs.document_symbol", source)


if __name__ == "__main__":
    unittest.main()
