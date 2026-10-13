-- Migration: import the 205 Plan Outline citation rows.
--
-- Source: data/references/plan_outline_citations.csv, lifted from the
-- Airtable-curated dataset in the un-mandates repo (the deterministic
-- DOCX parser produces only ~150 of these; the rest are manual curation
-- including renormalised priority-area labels and the "Effective
-- functioning of the organization" rows).
--
-- Requires migration 014 (entity nullable) and migration 015 (plan
-- outline budget document seeded).

begin;

create temp table _plan_outline_staging (
    full_document_symbol text,
    origin_document      text,
    part_in_document     text,
    priority_area        text,
    link                 text,
    symbol               text
);

\copy _plan_outline_staging from 'data/references/plan_outline_citations.csv' with (format csv, header true)

-- Insert any source documents that aren't already known.
-- The 18 Plan-Outline-only documents (UDHR, etc.) are already present from
-- earlier seeding, but this is idempotent and forward-compatible.
insert into ppb2026.source_documents (
    ppb_full_document_symbol, ppb_symbol, ppb_link
)
select distinct s.full_document_symbol, s.symbol, s.link
from _plan_outline_staging s
where s.full_document_symbol is not null
  and s.full_document_symbol <> ''
on conflict (ppb_full_document_symbol) do nothing;

-- Insert citations with NULL entity (requires migration 014).
insert into ppb2026.source_document_citations (
    ppb_full_document_symbol, entity, origin_document, part_in_document, priority_area
)
select s.full_document_symbol, null, s.origin_document, s.part_in_document, s.priority_area
from _plan_outline_staging s
where s.full_document_symbol is not null
  and s.full_document_symbol <> ''
on conflict do nothing;

-- Refresh the materialized view so new source_documents rows surface.
refresh materialized view public.unified_documents;

commit;
