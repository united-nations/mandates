-- 021: Resolution series — recurring-resolution detection over Digital Library
-- resolutions, with conservative supersession claims.
--
-- Groups /RES/ documents by (normalized title, un_body). Within a group, a
-- document whose year precedes the group's latest year "has a newer version".
-- A SPECIFIC successor (superseded_by) is only ever named when every safety
-- gate passes; anything ambiguous degrades to the weaker unnamed claim, so a
-- misclassified group can cause a missed link but never a false one:
--
--   * not a "collection" group (agenda-umbrella catalog records, petition
--     bursts): a group is a collection when any year has >= 3 docs or the
--     group averages > 1.5 docs/year. Collections keep has_newer but never
--     name successors — within-year ordering there is arbitrary.
--   * the normalized key is informative (>= 2 non-stopword tokens), which
--     drops junk/truncated titles like "United Nations".
--   * the group's latest year contains exactly one document, so "the
--     successor" is unambiguous. Same-year siblings are never ordered.
--   * Security Council number-only titles ("Resolution 1000 (1995)") carry
--     no series information and are excluded from grouping entirely
--     (normalize_res_title returns NULL).
--
-- The title normalization is a SQL port of normalize_radically
-- (un-mandates src/utils/nlp_utils.py, feature-reports branch), tuned for
-- resolutions: numbers/ordinals/years/months collapse to <n>/<nth>/<year>/
-- <month> placeholders so annual re-adoptions match across sessions, while
-- guard captures re-append distinguishing identifiers (referenced resolution
-- numbers, article/paragraph/rule numbers, T/PET petition numbers) that the
-- placeholders would otherwise erase. NO fuzzy matching anywhere — exact key
-- equality only; missing a recurrence is acceptable, a false one is not.
-- Audited precision of named successors: 35/35 random pairs (2026-07).
--
-- Accent handling: the Python original folds accents via NFKD; unaccent is
-- not installed on this server, so common accented characters are folded via
-- translate() and anything else is stripped by the [^a-z <>] cleanup. Both
-- members of a series normalize identically either way, so grouping is
-- unaffected unless the SAME title varies its accents across years (rare;
-- splits a group = a miss, never a false claim).
--
-- digitallibrary.documents is synced nightly (03:00 UTC, separate codebase);
-- the matview is refreshed daily at 06:30 UTC via pg_cron (before the 07:00
-- unified_documents refresh, migration 012). REFRESH ... CONCURRENTLY is used
-- (unique index on recid) so readers are never blocked.
--
-- Idempotent: re-running replaces the function, matview, and cron job.

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

-- refresh daily after the nightly digitallibrary sync (03:00 UTC), before
-- the unified_documents refresh (07:00 UTC, migration 012)
select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh_resolution_series';

select cron.schedule(
    'refresh_resolution_series',
    '30 6 * * *',
    $$refresh materialized view concurrently digitallibrary.resolution_series$$
);
