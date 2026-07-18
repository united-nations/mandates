-- 024: unified_documents adopts the Digital Library display_title + normalized join.
--
-- Depends on digitallibrary.documents columns added in the DL mirror repo
-- (documents.unfck.org, migration 001_add_display_title): display_title,
-- symbol_normalized, title_other.
--
-- Changes vs migration 020:
--   * New column display_title. DL arm = dl.display_title; PPB arm =
--     coalesce(dl.display_title, ppb_description) via a normalized left join, so
--     the ~3.7k catalog docs curated in PPB now show the DL-derived title too.
--   * PPB arm ppb_year now coalesces the DL publication year, filling the ~gap of
--     PPB rows that had a null year but exist in DL.
--   * DL join/anti-join keyed on symbol_normalized (whitespace/case canonical),
--     not the exact document_symbol. This recovers ~149 docs whose PPB symbol
--     lacked the "(YYYY)" space (e.g. "S/RES/2713(2023)" vs "S/RES/2713 (2023)")
--     and removes the ~148 duplicate rows those mismatches produced.
--   * DL catalog rows deduplicated by symbol_normalized (a handful are harvested
--     twice); latest recid wins.

drop materialized view if exists public.unified_documents;

create materialized view public.unified_documents as
with dl_catalog as (
    -- Deduplicated Digital Library catalog rows (the 8 symbol families).
    select distinct on (symbol_normalized)
        document_symbol,
        symbol_normalized,
        title,
        display_title,
        date_publication,
        un_body
    from digitallibrary.documents
    where deleted_at is null
      and document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)'
    order by symbol_normalized, recid desc
),
src_norm as (
    -- Normalized keys of every PPB source document, for the DL-arm anti-join.
    select distinct upper(regexp_replace(ppb_full_document_symbol, '[[:space:]]', '', 'g')) as k
    from ppb2026.source_documents
)
-- PPB source documents (enriched from DL where the symbol matches)
select
    sd.ppb_full_document_symbol,
    sd.ppb_description,
    coalesce(dl.display_title, sd.ppb_description) as display_title,
    sd.ppb_link,
    coalesce(sd.ppb_year, extract(year from dl.date_publication)::smallint) as ppb_year,
    sd.ppb_body,
    sd.ppb_type,
    true as is_ppb,
    sd.ppb_full_document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)' as is_catalog_pattern
from ppb2026.source_documents sd
left join dl_catalog dl
    on dl.symbol_normalized = upper(regexp_replace(sd.ppb_full_document_symbol, '[[:space:]]', '', 'g'))
union all
-- Digital Library catalog rows not already represented in PPB (normalized match)
select
    dl.document_symbol as ppb_full_document_symbol,
    dl.title as ppb_description,
    dl.display_title,
    null as ppb_link,
    extract(year from dl.date_publication)::smallint as ppb_year,
    coalesce(
        o.short,
        case dl.un_body
            when 'Other UN Bodies and Entities' then 'Other'
            else null
        end
    ) as ppb_body,
    case
        when dl.document_symbol ~ '/PRST/' then 'Presidential Statements'
        when dl.document_symbol ~ '/DEC/'  then 'Decisions'
        else 'Resolutions'
    end as ppb_type,
    false as is_ppb,
    true as is_catalog_pattern
from dl_catalog dl
left join ppb2026.organs o on o.long = dl.un_body
where not exists (select 1 from src_norm sn where sn.k = dl.symbol_normalized)
with data;

create index unified_documents_symbol_idx
    on public.unified_documents (ppb_full_document_symbol);
create index unified_documents_body_idx on public.unified_documents (ppb_body);
create index unified_documents_type_idx on public.unified_documents (ppb_type);
create index unified_documents_year_idx on public.unified_documents (ppb_year);

grant select on public.unified_documents to mandates_readonly;
