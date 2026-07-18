create table systemchart.entities (
    entity varchar(255) not null primary key,
    entity_long text,
    updated_at timestamp with time zone default (
        CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York'::text
    )
);
create table ppb2026.budget_versions (
    slug text not null primary key,
    display_name text not null,
    ppb_year int not null,
    is_default boolean not null default false,
    sort_order smallint not null default 0
);
create table ppb2026.budget_documents (
    slug text not null primary key,
    display_name text not null,
    match_pattern text not null,
    -- Top-level budget stream this document belongs to. Drives the budget
    -- hierarchy tree's first level; see migration 026.
    doc_type text not null
        check (doc_type in ('ppb', 'pko', 'plan_outline')),
    sort_order smallint not null default 0
);
create table ppb2026.budget_document_versions (
    doc_slug text not null references ppb2026.budget_documents(slug) on delete cascade,
    version_slug text not null references ppb2026.budget_versions(slug),
    primary key (doc_slug, version_slug)
);
create index budget_document_versions_version_slug_idx
    on ppb2026.budget_document_versions (version_slug);
create table ppb2026.organs (
    short text not null primary key,
    long text not null,
    website text,
    sort_order smallint not null default 0
);
create table ppb2026.source_documents (
    ppb_full_document_symbol text not null primary key,
    ppb_document_source text,
    ppb_description text,
    ppb_symbol text,
    ppb_link text,
    ppb_not_ods text,
    ppb_year smallint,
    ppb_full_doc_symbol_available text,
    ppb_body text,
    ppb_type text,
    last_updated timestamp with time zone default now() not null
);
create table ppb2026.source_documents_metadata_raw (
    ppb_full_document_symbol text not null constraint source_documents_metadata_pkey primary key constraint source_documents_metadata_ppb_full_document_symbol_fkey references ppb2026.source_documents on delete cascade,
    api_source text default 'UN Library AWS dev/ds'::text not null,
    last_updated timestamp with time zone default now() not null,
    raw_json jsonb
);
-- The regular-budget hierarchy: Part → Section → Programme → Subprogramme →
-- Entity. Parts and sections are canonical here; the rest stays denormalized on
-- the citations. The section → part grouping is identical in PPB 2026 and 2027,
-- so budget_part_number is always derivable from the section (see
-- migrations/021_budget_hierarchy.sql). Peacekeeping (PKM) and Plan Outline
-- citations sit outside this structure and carry no part.
create table ppb2026.budget_parts (
    part_number text primary key,
    part_title text not null,
    sort_order smallint not null
);
create table ppb2026.budget_sections (
    section text primary key,
    part_number text not null references ppb2026.budget_parts,
    sort_order smallint not null
);
create table ppb2026.source_document_citations (
    id bigserial primary key,
    ppb_full_document_symbol text not null references ppb2026.source_documents on delete cascade,
    entity varchar(255) references systemchart.entities on update cascade,
    origin_document text,
    part_in_document text,
    section text,
    section_title text,
    priority_area text,
    sub_programme text,
    pillar text,
    budget_part text,
    budget_part_number text references ppb2026.budget_parts,
    programme smallint,
    programme_title text,
    component text,
    last_updated timestamp with time zone default now() not null,
    sub_programme_number smallint generated always as (
        nullif(substring(sub_programme from '^Subprogramme\s+(\d+)'), '')::smallint
    ) stored
);
create unique index ux_ppb2026_citations_natural on ppb2026.source_document_citations (
    ppb_full_document_symbol,
    entity,
    COALESCE(origin_document, ''::text),
    COALESCE(part_in_document, ''::text),
    COALESCE(section, ''::text),
    COALESCE(section_title, ''::text),
    COALESCE(priority_area, ''::text),
    COALESCE(sub_programme, ''::text),
    COALESCE(pillar, ''::text),
    COALESCE(budget_part, ''::text),
    COALESCE(programme::integer, '-1'::integer),
    COALESCE(programme_title, ''::text),
    COALESCE(component, ''::text)
);
create index ix_ppb2026_citations_symbol on ppb2026.source_document_citations (ppb_full_document_symbol);
create index ix_ppb2026_citations_entity on ppb2026.source_document_citations (entity);
create index ix_citations_budget_part_number on ppb2026.source_document_citations (budget_part_number);
create index ix_citations_section on ppb2026.source_document_citations (section);
create table ppb2026.source_documents_metadata_clean (
    symbol text,
    symbol_split text,
    symbol_split_n double precision,
    session_or_year text,
    uniform_title text,
    proper_title text,
    title text,
    subtitle text,
    other_title text,
    publication_date text,
    date text,
    note text,
    corporate_name_level1 text,
    corporate_name_level2 text,
    conference_name text,
    subject_terms text,
    resource_type_level3 text,
    agenda_document_symbol text,
    agenda_item_number text,
    agenda_item_title text,
    agenda_subjects text,
    related_resource_identifier text,
    ppb_full_document_symbol text,
    last_updated timestamp,
    date_year double precision,
    document_type text,
    issuing_body text,
    is_part boolean,
    symbol_without_prefix text,
    symbol_without_prefix_split text,
    symbol_without_prefix_split_n double precision
);


-- Resolution series: recurring-resolution groups over Digital Library
-- resolutions, with conservative supersession claims (named superseded_by
-- only when every safety gate passes; collections and same-year ties only
-- get the weaker has_newer). NO fuzzy matching — exact normalized-title
-- keys within one organ. Refreshed daily at 06:30 UTC via pg_cron.
-- See sql/migrations/021_resolution_series.sql for full rationale.
create or replace function digitallibrary.normalize_res_title(title text)
returns text
language plpgsql immutable parallel safe
as $fn$
declare
    t text;
    guards text[] := '{}';
    m text[];
    pat text;
begin
    if title is null then
        return null;
    end if;

    -- fold common accented characters (approximates Python NFKD -> ascii)
    t := translate(title,
        'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūçñýÿÁÀÂÄÃÅĀÉÈÊËĒÍÌÎÏĪÓÒÔÖÕØŌÚÙÛÜŪÇÑÝ',
        'aaaaaaaeeeeeiiiiiooooooouuuuucnyyAAAAAAAEEEEEIIIIIOOOOOOOUUUUUCNY');
    t := regexp_replace(lower(trim(t)), '\s+', ' ', 'g');

    -- SC-style number-only titles carry no series information
    if t ~ '^resolutions? \d' then
        return null;
    end if;

    -- strip Digital Library cataloguing suffix ": resolution / adopted by ..."
    t := regexp_replace(t, '\s*:?\s*resolutions?\s*/?\s*(adopted by.*)?$', '');

    -- capture distinguishing identifiers before placeholder collapsing
    foreach pat in array array[
        'resolutions?\s+[\d/]+',
        'paragraphs?\s+\d+',
        '\d+\w+\s+committee',
        'articles?\s+\d+',
        'rules?\s+\d+',
        't/pet\.[\d/]+'
    ] loop
        m := regexp_match(t, '(' || pat || ')');
        if m is not null then
            guards := guards || m[1];
        end if;
    end loop;

    -- collapse ordinals, months, years, remaining numbers to placeholders
    t := regexp_replace(t, '1st|2nd|3rd|\d+th', '<nth>', 'g');
    t := regexp_replace(t, 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth|thirty-first|thirty-second|thirty-third|thirty-fourth|thirty-fifth|thirty-sixth|thirty-seventh|thirty-eighth|thirty-ninth|fortieth|forty-first|forty-second|forty-third|forty-fourth|forty-fifth|forty-sixth|forty-seventh|forty-eighth|forty-ninth|fiftieth|fifty-first|fifty-second|fifty-third|fifty-fourth|fifty-fifth|fifty-sixth|fifty-seventh|fifty-eighth|fifty-ninth|sixtieth|sixty-first|sixty-second|sixty-third|sixty-fourth|sixty-fifth|sixty-sixth|sixty-seventh|sixty-eighth|sixty-ninth|seventieth|seventy-first|seventy-second|seventy-third|seventy-fourth|seventy-fifth|seventy-sixth|seventy-seventh|seventy-eighth|seventy-ninth|eightieth|eighty-first|eighty-second|eighty-third|eighty-fourth|eighty-fifth|eighty-sixth|eighty-seventh|eighty-eighth|eighty-ninth|ninetieth|ninety-first|ninety-second|ninety-third|ninety-fourth|ninety-fifth|ninety-sixth|ninety-seventh|ninety-eighth|ninety-ninth', '<nth>', 'g');
    t := regexp_replace(t, 'january|february|march|april|may|june|july|august|september|october|november|december', '<month>', 'g');
    t := regexp_replace(t, '\y\d{4}\y', '<year>', 'g');
    t := regexp_replace(t, '\y\d+\y', '<n>', 'g');
    t := trim(regexp_replace(t, '[^a-z <>]', '', 'g'));

    -- re-append the captured identifiers
    if array_length(guards, 1) is not null then
        t := t || ' [' || array_to_string(guards, '] [') || ']';
    end if;

    return nullif(t, '');
end;
$fn$;

drop materialized view if exists digitallibrary.resolution_series;

create materialized view digitallibrary.resolution_series as
with keyed as (
    select
        recid,
        document_symbol,
        coalesce(un_body, '') as un_body,
        coalesce(extract(year from date_publication)::int, 0) as year,
        digitallibrary.normalize_res_title(title) as series_key
    from digitallibrary.documents
    where document_symbol ~ '/RES/'
      and deleted_at is null
      and title is not null
      and digitallibrary.normalize_res_title(title) is not null
),
year_counts as (
    select series_key, un_body, year, count(*) as n_in_year
    from keyed
    group by 1, 2, 3
),
group_stats as (
    select
        series_key,
        un_body,
        sum(n_in_year)::int as series_count,
        min(year) as series_first_year,
        max(year) as series_last_year,
        count(*)::int as n_years,
        max(n_in_year)::int as max_per_year
    from year_counts
    group by 1, 2
),
informative as (
    select series_key,
        (select count(*)
         from unnest(string_to_array(series_key, ' ')) tok
         where tok not in ('the','of','and','for','on','in','to','a','by',
                           'its','with','at','from','an','under',
                           '<nth>','<n>','<year>','<month>')) >= 2
        as is_informative
    from (select distinct series_key from keyed) k
),
latest_docs as (
    select k.series_key, k.un_body,
           count(*)::int as n_latest,
           min(k.document_symbol) as latest_symbol
    from keyed k
    join group_stats g using (series_key, un_body)
    where k.year = g.series_last_year
    group by 1, 2
)
select
    k.recid,
    k.document_symbol,
    k.un_body,
    k.year,
    k.series_key,
    g.series_count,
    g.series_first_year,
    g.series_last_year,
    (g.series_count > 1) as is_recurring,
    (g.max_per_year >= 3 or g.series_count::numeric / g.n_years > 1.5)
        as is_collection,
    i.is_informative,
    (k.year < g.series_last_year) as has_newer,
    (k.year = g.series_last_year) as is_latest,
    case
        when k.year < g.series_last_year
             and not (g.max_per_year >= 3
                      or g.series_count::numeric / g.n_years > 1.5)
             and i.is_informative
             and ld.n_latest = 1
        then ld.latest_symbol
    end as superseded_by
from keyed k
join group_stats g using (series_key, un_body)
join informative i using (series_key)
join latest_docs ld using (series_key, un_body);

-- unique index required for REFRESH ... CONCURRENTLY
create unique index resolution_series_recid_idx
    on digitallibrary.resolution_series (recid);
-- website lookups are by symbol (14 known duplicate symbols -> non-unique)
create index resolution_series_symbol_idx
    on digitallibrary.resolution_series (document_symbol);
create index resolution_series_key_idx
    on digitallibrary.resolution_series (series_key, un_body);

grant select on digitallibrary.resolution_series to mandates_readonly;

-- Unified set: PPB source documents + Digital Library resolutions.
-- Materialized (not a plain view) — the Digital Library branch full-scans
-- ~380k rows with a regex + anti-join (~700ms) and is referenced ~16x per
-- explorer load. Refresh after any underlying-data import:
--   REFRESH MATERIALIZED VIEW public.unified_documents;
-- (see sql/refresh_unified_documents.sql / migration 011 for rationale).
-- display_title comes from the Digital Library mirror (documents.unfck.org);
-- membership uses is_catalog_pattern (the 8 symbol families) and a
-- whitespace/case-normalized symbol join. See migration 024 for rationale.
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
    sd.ppb_type,
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