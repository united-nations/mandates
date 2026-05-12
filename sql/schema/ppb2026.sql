create table systemchart.entities (
    entity varchar(255) not null primary key,
    entity_long text,
    updated_at timestamp with time zone default (
        CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York'::text
    )
);
create table ppb2026.budget_documents (
    slug text not null primary key,
    display_name text not null,
    match_pattern text not null,
    sort_order smallint not null default 0
);
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
create table ppb2026.source_document_citations (
    id bigserial primary key,
    ppb_full_document_symbol text not null references ppb2026.source_documents on delete cascade,
    entity varchar(255) not null references systemchart.entities on update cascade,
    origin_document text,
    part_in_document text,
    section text,
    section_title text,
    priority_area text,
    sub_programme text,
    pillar text,
    budget_part text,
    programme smallint,
    programme_title text,
    component text,
    last_updated timestamp with time zone default now() not null
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

-- Unified view: PPB source documents + Digital Library resolutions
create or replace view public.unified_documents as
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
    );

grant select on public.unified_documents to mandates_readonly;