-- Migration 027: subject -> UNBIS thesaurus domain/sub-domain mapping.
--
-- Backs the /subjects browse page, which imposes the UNBIS thesaurus
-- hierarchy (18 top-level domains -> sub-domains -> leaf subjects) on the
-- otherwise-flat subject headings carried on public.unified_documents.subjects
-- (a text[] of UNBIS prefLabels, Digital-Library sourced).
--
-- Source: data/references/subject_thesaurus.csv, derived from the UNBIS
-- thesaurus dump v20250708 (UN Digital Library record 4075456). Built by
-- walking skos:broader to the top of each concept, then resolving the concept
-- *scheme* via skos:inScheme / skos:topConceptOf to recover the 18 domains
-- (the domains are SKOS concept schemes, not broader parents -- a naive
-- broader-walk stops one level short). Subjects are matched to concepts on
-- English prefLabel + altLabel, uppercased. Coverage against the live distinct
-- subjects: 95.2% of distinct strings / 99.1% of document mentions. The ~0.9%
-- unmatched tail is entirely sub-national place names UNBIS does not carry as
-- topic concepts (Golan Heights, Jerusalem, Darfur (Sudan), ...); the
-- application routes those into domain 17 (Geographical Descriptors) at query
-- time, so they are intentionally absent from this table.
--
-- subject_norm is upper(trim()) of the heading; joins from
-- unified_documents.subjects use the same normalisation. A subject can map to
-- more than one domain (3 today: DOCUMENTS, FISHERIES, ORGANIZATIONAL
-- STRUCTURE) -- one row per (subject, domain) pair, hence the composite key.
--
-- Idempotent: safe to re-run.

begin;

create table if not exists ppb2026.subject_thesaurus (
    subject_norm   text not null,
    domain_code    text not null,
    domain_label   text not null,
    domain_uri     text not null,
    subdomain_label text,
    subdomain_uri   text,
    primary key (subject_norm, domain_code)
);

comment on table ppb2026.subject_thesaurus is
    'Maps a normalised (upper/trim) UNBIS subject heading to its thesaurus '
    'domain (01-18) and sub-domain. Seeded from data/references/'
    'subject_thesaurus.csv (UNBIS v20250708). See migration 027.';

create temp table _subject_thesaurus_staging (
    subject_norm    text,
    domain_code     text,
    domain_label    text,
    domain_uri      text,
    subdomain_label text,
    subdomain_uri   text
) on commit drop;

\copy _subject_thesaurus_staging from 'data/references/subject_thesaurus.csv' with (format csv, header true)

-- Empty strings in the CSV's nullable columns become NULL.
insert into ppb2026.subject_thesaurus (
    subject_norm, domain_code, domain_label, domain_uri, subdomain_label, subdomain_uri
)
select
    s.subject_norm,
    s.domain_code,
    s.domain_label,
    s.domain_uri,
    nullif(s.subdomain_label, ''),
    nullif(s.subdomain_uri, '')
from _subject_thesaurus_staging s
where s.subject_norm is not null and s.subject_norm <> ''
on conflict (subject_norm, domain_code) do update set
    domain_label    = excluded.domain_label,
    domain_uri      = excluded.domain_uri,
    subdomain_label = excluded.subdomain_label,
    subdomain_uri   = excluded.subdomain_uri;

grant select on ppb2026.subject_thesaurus to mandates_readonly;

commit;

-- Sanity checks (run manually after applying):
--   select count(*) from ppb2026.subject_thesaurus;                  -- expect 3779
--   select domain_code, domain_label, count(*)
--     from ppb2026.subject_thesaurus group by 1, 2 order by 1;       -- 18 domains
