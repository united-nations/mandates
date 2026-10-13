-- Attribute source documents to their organ from the body-header source.
--
-- Run after ANY PPB import that adds ppb2026.source_documents rows: the importer
-- stores the fascicle's mandate body-header in ppb_document_source but does not
-- set ppb_body, so unlinked commission/treaty mandates (e.g. "Commission on
-- Narcotic Drugs resolutions") would otherwise have no organ. See
-- sql/migrations/028_backfill_ppb_body.sql for background.
--
--     psql "$DATABASE_URL" -f sql/backfill_ppb_body.sql
--
-- Idempotent: only touches rows where ppb_body IS NULL. Uses the mapping table
-- ppb2026.body_source_organ_map (seeded by migration 028; canonical copy at
-- data/references/ppb_body_source_map.tsv). Refreshes the matview at the end.

update ppb2026.source_documents sd
set ppb_body = m.organ_short
from (
    select distinct on (s.ppb_full_document_symbol)
        s.ppb_full_document_symbol,
        map.organ_short
    from ppb2026.source_documents s
    join ppb2026.body_source_organ_map map
        on s.ppb_document_source ilike '%' || map.pattern || '%'
    where s.ppb_body is null
    order by s.ppb_full_document_symbol, map.priority
) m
where sd.ppb_full_document_symbol = m.ppb_full_document_symbol
  and sd.ppb_body is null;

refresh materialized view public.unified_documents;
