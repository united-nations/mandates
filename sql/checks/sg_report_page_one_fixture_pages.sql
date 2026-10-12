-- ===========================================================================
-- Page-one SG report links: what four mandate pages should show.
--
-- Read-only. Run as mandates_readonly, the role the website reads as:
--     psql "$DATABASE_URL" -f sql/checks/sg_report_page_one_fixture_pages.sql
--
-- Each query applies the logic of getSgReportsStatingResolution
-- (website/src/lib/data/sg-report-page-one-links.ts) to a fixed set of page
-- symbols, so its output can be compared row for row with the mandate pages
-- of a preview that reads the same database. If the read function changes,
-- change these queries with it.
--
-- The pages, chosen from the output of the run accepted for the preview:
--   /mandate/S/RES/2467%20(2019)   eight reports
--   /mandate/S/RES/2467(2019)      the same eight: the run looked up both
--                                  registry spellings of the resolution
--   /mandate/A/RES/46/182          seven reports, each with two symbols
--                                  (A/ and E/); the list shows five and
--                                  "Show all 7"
--   /mandate/A/RES/76/147          one report; three others name the
--                                  resolution only as context and must not
--                                  show
--   /mandate/S/RES/1325(2000)      no report: five name it only as context,
--                                  so the block does not render
-- ===========================================================================

-- 1. The accepted run the site reads. One row expected. No row means no run
--    is accepted, and every mandate page shows the not-accepted line instead
--    of a list.
SELECT a.run_id, a.acceptance_id, a.accepted_at
FROM mandates.sg_report_page_one_run_acceptances a
ORDER BY a.accepted_at DESC, a.acceptance_id DESC
LIMIT 1;

-- 2. What each page renders, in the page's order: year, symbol as shown, and
--    title. A page whose only row has a NULL report_recid renders no block.
WITH accepted_run AS (
    SELECT a.run_id
    FROM mandates.sg_report_page_one_run_acceptances a
    ORDER BY a.accepted_at DESC, a.acceptance_id DESC
    LIMIT 1
),
fixture_pages (page_ordinal, page_symbol) AS (
    VALUES (1, 'S/RES/2467 (2019)'),
           (2, 'S/RES/2467(2019)'),
           (3, 'A/RES/46/182'),
           (4, 'A/RES/76/147'),
           (5, 'S/RES/1325(2000)')
),
page_reports AS (
    SELECT p.page_symbol,
           o.report_recid,
           o.report_symbols,
           d.title,
           d.date_publication
    FROM fixture_pages p
    CROSS JOIN accepted_run r
    JOIN mandates.sg_report_page_one_links l
      ON l.run_id = r.run_id
     AND p.page_symbol = ANY (l.cited_display_candidates)
     AND l.citation_role IN ('mandating', 'mandating_founding', 'mandating_most_recent')
    JOIN mandates.sg_report_page_one_outcomes o
      ON o.run_id = l.run_id AND o.report_recid = l.report_recid
    LEFT JOIN digitallibrary.documents d ON d.recid = l.report_recid
    GROUP BY p.page_symbol, o.report_recid, o.report_symbols, d.title, d.date_publication
)
SELECT p.page_ordinal,
       p.page_symbol,
       x.report_recid,
       left(x.date_publication::text, 4) AS shown_year,
       array_to_string(x.report_symbols, ' - ') AS shown_symbol,
       x.title AS shown_title
FROM fixture_pages p
LEFT JOIN page_reports x ON x.page_symbol = p.page_symbol
ORDER BY p.page_ordinal,
         x.date_publication DESC NULLS LAST,
         x.report_symbols,
         x.report_recid;

-- 3. The same pages against the report ids expected from the run's output
--    files. matches should be true on every row; for S/RES/1325(2000) both
--    sides are empty.
WITH accepted_run AS (
    SELECT a.run_id
    FROM mandates.sg_report_page_one_run_acceptances a
    ORDER BY a.accepted_at DESC, a.acceptance_id DESC
    LIMIT 1
),
fixture_pages (page_symbol, expected_recids) AS (
    VALUES ('S/RES/2467 (2019)', ARRAY[3868979, 3907256, 3957087, 3967573, 4014201, 4044629, 4086814, 4114911]),
           ('S/RES/2467(2019)',  ARRAY[3868979, 3907256, 3957087, 3967573, 4014201, 4044629, 4086814, 4114911]),
           ('A/RES/46/182',      ARRAY[3858642, 3926632, 3972586, 4010533, 4051016, 4081587, 4114833]),
           ('A/RES/76/147',      ARRAY[4024054]),
           ('S/RES/1325(2000)',  ARRAY[]::integer[])
),
actual AS (
    SELECT p.page_symbol,
           array_agg(DISTINCT l.report_recid ORDER BY l.report_recid) AS actual_recids
    FROM fixture_pages p
    CROSS JOIN accepted_run r
    JOIN mandates.sg_report_page_one_links l
      ON l.run_id = r.run_id
     AND p.page_symbol = ANY (l.cited_display_candidates)
     AND l.citation_role IN ('mandating', 'mandating_founding', 'mandating_most_recent')
    GROUP BY p.page_symbol
)
SELECT p.page_symbol,
       p.expected_recids,
       a.actual_recids,
       (p.expected_recids = a.actual_recids
        OR (cardinality(p.expected_recids) = 0 AND a.actual_recids IS NULL)) AS matches
FROM fixture_pages p
LEFT JOIN actual a ON a.page_symbol = p.page_symbol
ORDER BY p.page_symbol;

-- 4. The citations of these pages that the role filter leaves out. Expected:
--    context rows for 3967573 and 4014201 (which also cite S/RES/2467 (2019) as
--    mandating, so still show), 3987670, 4060107 and 4112779 on A/RES/76/147,
--    and five reports on S/RES/1325(2000).
WITH accepted_run AS (
    SELECT a.run_id
    FROM mandates.sg_report_page_one_run_acceptances a
    ORDER BY a.accepted_at DESC, a.acceptance_id DESC
    LIMIT 1
)
SELECT p.page_symbol, l.report_recid, l.citation_role
FROM (VALUES ('S/RES/2467 (2019)'), ('S/RES/2467(2019)'), ('A/RES/46/182'),
             ('A/RES/76/147'), ('S/RES/1325(2000)')) AS p (page_symbol)
CROSS JOIN accepted_run r
JOIN mandates.sg_report_page_one_links l
  ON l.run_id = r.run_id
 AND p.page_symbol = ANY (l.cited_display_candidates)
 AND l.citation_role NOT IN ('mandating', 'mandating_founding', 'mandating_most_recent')
ORDER BY p.page_symbol, l.report_recid, l.citation_role;

-- 5. Dual symbols: the page joins a report's symbols with ' - '. This lists
--    the Digital Library's own document_symbol beside it for the A/RES/46/182
--    reports; if the two differ, the separator or order on the page is not
--    the catalogue's.
SELECT o.report_recid,
       array_to_string(o.report_symbols, ' - ') AS shown_symbol,
       d.document_symbol AS catalogue_document_symbol
FROM mandates.sg_report_page_one_outcomes o
LEFT JOIN digitallibrary.documents d ON d.recid = o.report_recid
WHERE o.run_id = (SELECT a.run_id
                  FROM mandates.sg_report_page_one_run_acceptances a
                  ORDER BY a.accepted_at DESC, a.acceptance_id DESC
                  LIMIT 1)
  AND o.report_recid IN (3858642, 3926632, 3972586, 4010533, 4051016, 4081587, 4114833)
ORDER BY o.report_recid;
