-- 020: Add is_catalog_pattern boolean to public.unified_documents.
--
-- The "All resolutions" mode is defined as: the 8-pattern catalog
-- (A/RES, A/DEC, S/RES, S/PRST, E/RES, E/DEC, A/HRC/RES, A/HRC/PRST)
-- ∪ documents cited in the latest budget version. The first half of that
-- union needs a per-row classification, and we want the regex to live in
-- exactly one place — here in the matview — so the app filter is a column
-- lookup rather than a duplicated literal.
--
-- DL-arm rows are catalog-pattern by construction (the matview's WHERE
-- already filters them to the 8 patterns); the PPB arm has both pattern
-- and non-pattern symbols (HSP/*, E/CN.*, regional commissions, Letters,
-- Conventions, …) and the column captures that distinction.
--
-- Drop+recreate the matview rather than ALTER, both to keep the matview
-- definition self-contained and because PostgreSQL forbids ALTER … ADD
-- COLUMN on materialized views. Column shape stays a superset of migration
-- 018, so every existing query keeps working unchanged.
--
-- Refresh: `with data` populates on create; the daily 07:00 UTC pg_cron
-- job from migration 012 keeps it current.

drop materialized view if exists public.unified_documents;

create materialized view public.unified_documents as
-- PPB source documents
select
    ppb_full_document_symbol,
    ppb_description,
    ppb_link,
    ppb_year,
    ppb_body,
    ppb_type,
    true as is_ppb,
    ppb_full_document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)'
        as is_catalog_pattern
from ppb2026.source_documents
union all
-- Digital Library resolutions, decisions and presidential statements not
-- already in PPB. Eight symbol families: the same set main's static dataset
-- covered (A/RES, A/DEC, S/RES, S/PRST, E/RES, E/DEC, A/HRC/RES, A/HRC/PRST).
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
    -- PRST check first: some HRC special-session PRST symbols would otherwise
    -- match the /RES/ branch by accident.
    case
        when dl.document_symbol ~ '/PRST/' then 'Presidential Statements'
        when dl.document_symbol ~ '/DEC/'  then 'Decisions'
        else 'Resolutions'
    end as ppb_type,
    false as is_ppb,
    -- DL arm is filtered to the 8 patterns below, so every row here is
    -- catalog-pattern by construction.
    true as is_catalog_pattern
from digitallibrary.documents dl
left join ppb2026.organs o on o.long = dl.un_body
where dl.document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)'
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

-- Verification (run by hand after apply):
--
--   -- expect ~43,700 (unchanged from migration 018)
--   select count(*) from public.unified_documents;
--
--   -- expect ~41,900 catalog-pattern, ~1,800 non-pattern (PPB-only)
--   select is_catalog_pattern, count(*)
--   from public.unified_documents group by 1;
--
--   -- expect ~13 organs: matches active(ppb2027) plus a handful of
--   -- DL-only stragglers with quirky un_body tagging
--   select count(distinct ppb_body) filter (where ppb_body is not null)
--   from public.unified_documents d
--   where d.is_catalog_pattern
--     or exists (
--       select 1 from ppb2026.source_document_citations c
--       where c.ppb_full_document_symbol = d.ppb_full_document_symbol
--         and exists (
--           select 1 from ppb2026.budget_documents bd
--           join ppb2026.budget_document_versions bdv on bdv.doc_slug = bd.slug
--           where bdv.version_slug = (select slug from ppb2026.budget_versions where is_default limit 1)
--             and c.origin_document ~ bd.match_pattern
--         )
--     );
