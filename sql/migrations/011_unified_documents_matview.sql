-- 011: Convert public.unified_documents from a plain VIEW to a MATERIALIZED VIEW.
--
-- Why: the view is a UNION ALL whose Digital Library branch full-scans the
-- ~380k-row digitallibrary.documents table, applying a non-indexable regex
-- (document_symbol ~ '/RES/') plus a NOT EXISTS anti-join — ~700ms every time
-- the view is referenced. The mandate explorer references it 16x per cold
-- page load (one list query + ~15 facet/count queries), so every uncached
-- load paid ~8.5s of repeated recomputation, and the small max:5 connection
-- pool starved trivial lookups behind it for seconds.
--
-- The unified set is only ~40k rows, changes only when the data pipeline
-- imports new documents, and the expensive work is identical regardless of
-- mode/filters — a textbook materialized view. Each reference drops from
-- ~850ms to a few ms over the facet indexes below.
--
-- Columns are kept byte-identical to the previous view definition so every
-- existing query against public.unified_documents keeps working unchanged.
--
-- OPERATIONAL NOTE: this matview is NOT auto-updated. Any process that
-- changes ppb2026.source_documents, digitallibrary.documents, or
-- ppb2026.organs must afterwards run (see sql/refresh_unified_documents.sql):
--     REFRESH MATERIALIZED VIEW public.unified_documents;
-- A plain (non-concurrent) refresh briefly takes an ACCESS EXCLUSIVE lock;
-- it runs at infrequent import time and the app's 1h unstable_cache shields
-- live readers. CONCURRENTLY is not used because ppb_full_document_symbol is
-- not unique in the unified set (~14 duplicate symbols), so there is no
-- clean unique index to diff against.

drop view if exists public.unified_documents;

create materialized view public.unified_documents as
-- PPB source documents
select
    ppb_full_document_symbol,
    ppb_description,
    ppb_link,
    ppb_year,
    ppb_body,
    ppb_type,
    true as is_ppb
from ppb2026.source_documents
union all
-- Digital Library resolutions not already in PPB
select
    dl.document_symbol as ppb_full_document_symbol,
    dl.title as ppb_description,
    null as ppb_link,
    extract(year from dl.date_publication)::smallint as ppb_year,
    coalesce(
        o.short,
        case dl.un_body
            when 'Other UN Bodies and Entities' then 'Other'
            else null
        end
    ) as ppb_body,
    'Resolutions' as ppb_type,
    false as is_ppb
from digitallibrary.documents dl
left join ppb2026.organs o on o.long = dl.un_body
where dl.document_symbol ~ '/RES/'
    and dl.deleted_at is null
    and not exists (
        select 1 from ppb2026.source_documents p
        where p.ppb_full_document_symbol = dl.document_symbol
    )
with data;

-- Join key: every list/facet query LEFT JOINs ppb2026.source_document_citations
-- on ppb_full_document_symbol and GROUPs/anti-joins by it.
create index unified_documents_symbol_idx
    on public.unified_documents (ppb_full_document_symbol);

-- Facet filter columns used by the explorer's per-dimension count queries.
create index unified_documents_body_idx on public.unified_documents (ppb_body);
create index unified_documents_type_idx on public.unified_documents (ppb_type);
create index unified_documents_year_idx on public.unified_documents (ppb_year);

grant select on public.unified_documents to mandates_readonly;
