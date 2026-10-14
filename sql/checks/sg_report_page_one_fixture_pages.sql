-- ===========================================================================
-- SG report links on five mandate pages: what each page should show.
--
-- Read-only. Run as mandates_readonly, the role the website reads as:
--     psql "$DATABASE_URL" -f sql/checks/sg_report_page_one_fixture_pages.sql
--
-- The block's source is MANDATED_SG_REPORTS_SOURCE
-- (website/src/lib/feature-flags.ts):
--   - 'page_one': queries 1 to 5 are the page. They apply the logic of
--     getSgReportsStatingResolution
--     (website/src/lib/data/sg-report-page-one-links.ts).
--   - 'union': queries 6 and 7 are the page. They apply both reads (the
--     catalogue-notes read is getSgReportsMandatedByResolution in
--     website/src/lib/data/sg-report-links.ts) and the combining rules of
--     unionSgReports (website/src/lib/sg-report-union.ts). Queries 1 to 5
--     are then the page-one side of the union.
-- If any of those functions changes, change these queries with it.
--
-- The pages, chosen from the output of the run accepted for the preview.
-- The page-one side is known from that run; the catalogue-notes side is
-- whatever the database holds, so the union counts come from query 7.
--   /mandate/S/RES/2467%20(2019)   page one: eight reports
--   /mandate/S/RES/2467(2019)      page one: the same eight; the run looked
--                                  up both registry spellings
--   /mandate/A/RES/46/182          page one: seven reports, each with two
--                                  symbols (A/ and E/)
--   /mandate/A/RES/76/147          page one: one report; three others name
--                                  the resolution only as context and must
--                                  not show
--   /mandate/S/RES/1325(2000)      page one: none (five context only); under
--                                  'union' any rows are catalogue notes only
-- ===========================================================================

-- 1. The accepted run the site reads. One row expected. No row means no run
--    is accepted, and every mandate page shows the not-accepted line instead
--    of a list.
SELECT a.run_id, a.acceptance_id, a.accepted_at
FROM mandates.sg_report_page_one_run_acceptances a
ORDER BY a.accepted_at DESC, a.acceptance_id DESC
LIMIT 1;

-- 2. What each page renders, in the page's order: year, symbols and title.
--    shown_symbols is one chip per element, in this order. A page whose only
--    row has a NULL report_recid renders no block.
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
       x.report_symbols AS shown_symbols,
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

-- 5. Dual symbols, for the A/RES/46/182 reports: one row per chip, in the
--    order the page shows them (record order). Two rows per report expected,
--    A/ then E/. document_symbol is not what this page shows; it is what the
--    catalogue-notes block shows for the same report (one symbol), listed so
--    the two blocks can be told apart on a preview.
SELECT o.report_recid,
       s.chip_ordinal,
       s.chip_symbol,
       d.document_symbol AS catalogue_notes_block_symbol
FROM mandates.sg_report_page_one_outcomes o
CROSS JOIN LATERAL unnest(o.report_symbols) WITH ORDINALITY AS s (chip_symbol, chip_ordinal)
LEFT JOIN digitallibrary.documents d ON d.recid = o.report_recid
WHERE o.run_id = (SELECT a.run_id
                  FROM mandates.sg_report_page_one_run_acceptances a
                  ORDER BY a.accepted_at DESC, a.acceptance_id DESC
                  LIMIT 1)
  AND o.report_recid IN (3858642, 3926632, 3972586, 4010533, 4051016, 4081587, 4114833)
ORDER BY o.report_recid, s.chip_ordinal;

-- 6. Under 'union': what each page renders, in the page's order. One row per
--    report: provenance (page_one, catalogue_notes or both), the symbol chips
--    (page one's symbols where page one has the report, else the catalogue
--    notes' one), year, title, and the annex chip (the catalogue notes'
--    annex_position_only; NULL where they do not have the report). A page
--    whose only row has a NULL report_recid renders no block. With no
--    accepted run, every row is catalogue_notes.
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
page_one AS (
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
),
catalogue_notes AS (
    SELECT p.page_symbol,
           l.report_recid,
           l.report_symbol,
           d.title,
           d.date_publication,
           bool_and(l.citation_position = 'annex_title') AS annex_position_only
    FROM fixture_pages p
    JOIN mandates.sg_report_to_mandate_links l
      ON p.page_symbol = ANY (l.resolution_display_candidates)
    JOIN digitallibrary.documents d ON d.recid = l.report_recid
    WHERE l.citation_sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                               'activities_carried_out')
      AND l.report_recid NOT IN (494738, 3945711, 3968269, 4096508)
    GROUP BY p.page_symbol, l.report_recid, l.report_symbol, d.title, d.date_publication
),
union_rows AS (
    SELECT page_symbol,
           report_recid,
           CASE WHEN a.report_symbols IS NOT NULL AND c.report_symbol IS NOT NULL THEN 'both'
                WHEN a.report_symbols IS NOT NULL THEN 'page_one'
                ELSE 'catalogue_notes'
           END AS provenance,
           CASE WHEN a.report_symbols IS NOT NULL THEN a.report_symbols
                ELSE ARRAY[c.report_symbol]
           END AS shown_symbols,
           CASE WHEN a.report_symbols IS NOT NULL THEN a.date_publication
                ELSE c.date_publication
           END AS date_publication,
           CASE WHEN a.report_symbols IS NOT NULL THEN a.title ELSE c.title END AS title,
           c.annex_position_only AS catalogue_annex_only
    FROM page_one a
    FULL JOIN catalogue_notes c USING (page_symbol, report_recid)
)
SELECT p.page_ordinal,
       p.page_symbol,
       u.report_recid,
       u.provenance,
       left(u.date_publication::text, 4) AS shown_year,
       u.shown_symbols,
       u.catalogue_annex_only,
       u.title AS shown_title
FROM fixture_pages p
LEFT JOIN union_rows u ON u.page_symbol = p.page_symbol
-- COLLATE "C" because the page sorts symbols by code unit, not by locale.
ORDER BY p.page_ordinal,
         u.date_publication DESC NULLS LAST,
         u.shown_symbols COLLATE "C",
         u.report_recid;

-- 7. Under 'union': per page, the count the heading shows, the split by
--    provenance, the annex chips, and the reports in both sources whose
--    title or date differ between the two reads. title_or_date_differs must
--    be 0 on every page: both reads take title and date from the same
--    digitallibrary.documents row, and the page throws if they ever differ.
--    duplicate_rows must be 0 too: a report one read returns twice (the
--    catalogue-notes read groups by report_symbol as well as recid) also
--    makes the page throw.
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
page_one AS (
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
),
catalogue_notes AS (
    SELECT p.page_symbol,
           l.report_recid,
           l.report_symbol,
           d.title,
           d.date_publication,
           bool_and(l.citation_position = 'annex_title') AS annex_position_only
    FROM fixture_pages p
    JOIN mandates.sg_report_to_mandate_links l
      ON p.page_symbol = ANY (l.resolution_display_candidates)
    JOIN digitallibrary.documents d ON d.recid = l.report_recid
    WHERE l.citation_sense IN ('direct_request', 'founding_renewal', 'additional_joint',
                               'activities_carried_out')
      AND l.report_recid NOT IN (494738, 3945711, 3968269, 4096508)
    GROUP BY p.page_symbol, l.report_recid, l.report_symbol, d.title, d.date_publication
),
union_rows AS (
    SELECT page_symbol,
           report_recid,
           a.report_symbols IS NOT NULL AS on_page_one,
           c.report_symbol IS NOT NULL AS on_catalogue_notes,
           c.annex_position_only AS catalogue_annex_only,
           a.report_symbols IS NOT NULL AND c.report_symbol IS NOT NULL
             AND (a.title IS DISTINCT FROM c.title
                  OR a.date_publication IS DISTINCT FROM c.date_publication) AS title_or_date_differs
    FROM page_one a
    FULL JOIN catalogue_notes c USING (page_symbol, report_recid)
)
SELECT p.page_ordinal,
       p.page_symbol,
       count(u.report_recid) AS reports_shown,
       count(*) FILTER (WHERE u.on_page_one AND NOT u.on_catalogue_notes) AS page_one_only,
       count(*) FILTER (WHERE u.on_catalogue_notes AND NOT u.on_page_one) AS catalogue_notes_only,
       count(*) FILTER (WHERE u.on_page_one AND u.on_catalogue_notes) AS both_sources,
       count(*) FILTER (WHERE u.catalogue_annex_only) AS annex_chips,
       count(*) FILTER (WHERE u.catalogue_annex_only AND u.on_page_one) AS annex_chips_on_both_rows,
       count(*) FILTER (WHERE u.title_or_date_differs) AS title_or_date_differs,
       count(*) FILTER (WHERE u.report_recid IS NOT NULL) - count(DISTINCT u.report_recid)
           AS duplicate_rows
FROM fixture_pages p
LEFT JOIN union_rows u ON u.page_symbol = p.page_symbol
GROUP BY p.page_ordinal, p.page_symbol
ORDER BY p.page_ordinal;
