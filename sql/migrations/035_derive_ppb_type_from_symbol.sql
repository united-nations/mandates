-- 035_derive_ppb_type_from_symbol.sql
--
-- Fill missing document types on the PPB branch of public.unified_documents.
--
-- Problem: ~630 PPB source documents (overwhelmingly the 2027-pipeline
-- resolutions, which were imported without a curated Airtable ppb_type) carry
-- an empty ppb_type. They are counted in the "Source Documents" total but drop
-- out of the document-type breakdown (getDocumentTypeOptions filters
-- `ppb_type <> ''`), so on the 2027 tab the bars sum to far less than the
-- header, and those documents are unfilterable and show "Unknown" as type.
--
-- Fix: derive ppb_type from the document symbol family (the same rule the DL
-- branch already applies), and fall back to the curated Airtable ppb_type only
-- where the symbol carries no type signal (Letters, Reports, Conventions,
-- Charter, …). This is "DL wherever possible, Airtable where necessary".
--
-- Validated against the live DB (5,469 PPB rows):
--   630  FILLED         empty -> derived (all genuine RES/DEC; 0 false positives)
--   3000 AGREE          derived == curated Airtable type (no change)
--   6    OVERRIDE       S/PRST docs curated as "Statements" -> "Presidential
--                       Statements" (correct consolidation, matches DL)
--   1043 KEEP airtable  no symbol signal -> curated rich type preserved
--   790  STILL empty    bare session-numbers / prose titles: not typeable
-- Zero curated types regress. WTO ministerial docs (WT/MIN(NN)/DEC/N) use
-- "/DEC/" in their own numbering and are NOT UN decisions, so `^WT/` is
-- excluded and those rows keep their Airtable type.
--
-- unified_documents is a materialized view, so a column expression cannot be
-- altered in place: the view is dropped and recreated. This is a pure
-- definition change (no underlying data changes); CREATE ... WITH DATA
-- repopulates it, so no separate REFRESH is needed.

drop view if exists public.unified_documents;
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
-- PPB source documents (enriched from DL where the symbol matches)
select
    sd.ppb_full_document_symbol,
    sd.ppb_description,
    coalesce(dl.display_title, sd.ppb_description) as display_title,
    sd.ppb_link,
    coalesce(sd.ppb_year, extract(year from dl.date_publication)::smallint) as ppb_year,
    sd.ppb_body,
    -- Type: DL-derived-from-symbol first, curated Airtable type as fallback.
    -- WTO ministerial docs (e.g. WT/MIN(01)/DEC/1) use "/DEC/" in their own
    -- numbering and are not UN decisions, so they are excluded and keep Airtable.
    coalesce(
        case
            when sd.ppb_full_document_symbol ~ '^WT/'    then null
            when sd.ppb_full_document_symbol ~ '/PRST/'  then 'Presidential Statements'
            when sd.ppb_full_document_symbol ~ '/DEC/'   then 'Decisions'
            when sd.ppb_full_document_symbol ~ '/RES/'   then 'Resolutions'
        end,
        sd.ppb_type
    ) as ppb_type,
    dl.subjects,
    dl.agenda_items,
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
