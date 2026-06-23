-- 013: Expand public.unified_documents to include Decisions and Presidential
-- Statements from digitallibrary.documents, not just Resolutions.
--
-- Why: migration 008's view (kept in 011's matview rewrite) filtered the
-- Digital Library arm to document_symbol ~ '/RES/'. That excluded A/DEC,
-- E/DEC, S/PRST and A/HRC/PRST from the DL side entirely; the only decisions
-- and PRSTs surviving were the ~5,315 hand-curated in ppb2026.source_documents.
-- The result: the resolutions table and Source Documents widget showed
-- 40,348 total with Decisions = 184 and Presidential Statements = 99,
-- versus the prior main app's 41,204 with ~9,565 decisions and ~1,137 PRSTs.
--
-- This migration broadens the DL filter to the same eight symbol families
-- main's static dataset covered, and labels each row's ppb_type from its
-- symbol pattern instead of hard-coding 'Resolutions'. The PPB arm is
-- unchanged: it keeps the ~200 Letters/Conventions/Charter/Conclusions/
-- Reports rows that are cited from PPBs but don't match the eight patterns,
-- so citations to UN-Habitat HSP/*, regional commissions, etc. keep
-- resolving on mandate detail pages.
--
-- Column shape is byte-identical to migration 011 so every existing query
-- against public.unified_documents keeps working unchanged.
--
-- Refresh: `with data` populates on create; the daily 07:00 UTC pg_cron job
-- from migration 012 keeps it current.

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
    true as is_ppb
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
    false as is_ppb
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
--   -- expect ~41,700
--   select count(*) from public.unified_documents;
--
--   -- expect Resolutions ~30,900 / Decisions ~9,650 / Presidential Statements ~1,140
--   --        plus PPB-only Letters 67 / Conventions 28 / Charter 22 / etc.
--   select ppb_type, count(*) from public.unified_documents
--   group by 1 order by 2 desc;
--
--   -- expect 0: every cited symbol still resolves
--   select count(*) from ppb2026.source_document_citations c
--   where not exists (
--     select 1 from public.unified_documents u
--     where u.ppb_full_document_symbol = c.ppb_full_document_symbol
--   );
