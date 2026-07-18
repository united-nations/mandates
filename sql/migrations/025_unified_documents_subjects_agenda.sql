-- 025: surface Digital Library subjects + agenda_items on unified_documents,
-- so mandates can read subject/agenda metadata (display, filters, facets) from
-- the matview instead of ppb2026.source_documents_metadata_clean. This removes
-- the last metadata_clean readers in the mandates app; the table is dropped in
-- a later phase once housekeeping is repointed too.
--
--   subjects      TEXT[]  — MARC 650$a controlled-vocabulary terms
--   agenda_items  JSONB   — MARC 991 [{doc, item, desc, topic}]; the agenda
--                           title is the natural-language "desc".
--
-- Same structure as migration 024, with the two columns added to dl_catalog and
-- both arms (PPB-arm values come from the normalized DL join; null when the PPB
-- symbol is not in the DL catalog).

drop materialized view if exists public.unified_documents;

create materialized view public.unified_documents as
with dl_catalog as (
    select distinct on (symbol_normalized)
        document_symbol,
        symbol_normalized,
        title,
        display_title,
        date_publication,
        un_body,
        subjects,
        agenda_items
    from digitallibrary.documents
    where deleted_at is null
      and document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)'
    order by symbol_normalized, recid desc
),
src_norm as (
    select distinct upper(regexp_replace(ppb_full_document_symbol, '[[:space:]]', '', 'g')) as k
    from ppb2026.source_documents
)
select
    sd.ppb_full_document_symbol,
    sd.ppb_description,
    coalesce(dl.display_title, sd.ppb_description) as display_title,
    sd.ppb_link,
    coalesce(sd.ppb_year, extract(year from dl.date_publication)::smallint) as ppb_year,
    sd.ppb_body,
    sd.ppb_type,
    dl.subjects,
    dl.agenda_items,
    true as is_ppb,
    sd.ppb_full_document_symbol ~ '^(A/RES/|A/DEC/|S/RES/|S/PRST/|E/RES/|E/DEC/|A/HRC/RES/|A/HRC/PRST/)' as is_catalog_pattern
from ppb2026.source_documents sd
left join dl_catalog dl
    on dl.symbol_normalized = upper(regexp_replace(sd.ppb_full_document_symbol, '[[:space:]]', '', 'g'))
union all
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
    dl.subjects,
    dl.agenda_items,
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
