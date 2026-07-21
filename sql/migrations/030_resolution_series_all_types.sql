-- 030: widen resolution_series from /RES/-only to all instrument types that
-- carry a real, recurring title: resolutions, decisions, and Human Rights
-- Council presidential statements.
--
-- WHAT CHANGED vs 021
--
-- (1) Title source is now coalesce(display_title, title).
--     display_title (the Digital Library title-reconstruction column) is
--     descriptive for every type; plain `title` is number-only for the
--     Security Council ("Resolution 2825 (2026)"), which is why 2,823 of
--     2,825 SC resolutions were previously dropped. Coverage of display_title
--     is 100% today, so coalesce() is purely defensive.
--
-- (2) normalize_series_title() gained a type-aware PREPROCESSING step that
--     runs before the shared normalization:
--
--     RES/DEC: extract the topic. SC display_titles look like
--       "Security Council resolution 2825 (2026) [on renewal of measures ...]"
--     so the "[on <topic>]" bracket is the series-bearing part. Without this
--     the document's OWN number survives into the key (a 4-digit number folds
--     to <year> AND is captured as a distinguishing guard), making every SC
--     resolution a singleton. If there is no bracket we instead strip a
--     leading "<Body> resolution/decision N (Y)" self-reference. For
--     GA/ECOSOC/HRC/Trusteeship titles both branches are no-ops.
--
--     PRST: strip presentation noise that varies year to year — a trailing
--     "[Human Rights Council, Nth session]" bracket, a trailing
--     "(President's) statement", and "Reports of" vs "Report of" — then drop
--     contentless titles ("President's statement", "Statement by the
--     President") which carry no topic and would otherwise form a bogus
--     group. These rules are deliberately scoped to PRST: 4,365 RES/DEC
--     titles END in a MEANINGFUL bracket ("Individual territories
--     [questions of American Samoa, Anguilla, ...]", "Financial matters
--     [UNICEF]") and stripping those globally would produce false merges.
--
-- (3) Type filter widened to /RES/ + /DEC/ + non-Security-Council /PRST/.
--
--     Security Council presidential statements are deliberately EXCLUDED.
--     Their display_title is meeting-based, not topical ("Statement [made on
--     behalf of the Security Council, at the 10128th meeting, ...]"), so the
--     only available key is the agenda item — which groups by VENUE rather
--     than by a recurring action. Verified against fulltext: the MARC subject
--     buckets merge ~14 distinct agenda items each, and even the agenda item
--     title leaves catch-alls ("Maintenance of international peace and
--     security" spans mediation, WMD proliferation, famine, and the UN's 75th
--     and 80th anniversaries). 77% of SC PRSTs land in collection-quarantined
--     groups, so they would yield almost no usable claim anyway.
--
--     A/HRC presidential statements ARE included: they carry real topical
--     titles and behave like resolutions. Fulltext-verified series include
--     "Reports of the Advisory Committee" (15 docs, 2010-2025 — every
--     document's internal title, agenda item and operative action are
--     identical, exactly one per September/October session) and "Situation of
--     human rights in Haiti" (7 docs, 2008-2017).
--
-- (4) Groups are now keyed on (series_key, un_body, doc_type) and the matview
--     exposes doc_type. Without doc_type in the key, 1,003 groups mixed
--     resolutions with decisions on generic topics, producing links like
--     "E/RES/334(XI) superseded by E/DEC/1997/209". Splitting them costs only
--     cross-type recurrences and nets MORE named successions.
--
-- UNCHANGED: exact normalized-key equality, NO fuzzy matching; a missed
-- recurrence is acceptable, a false one is not. A specific superseded_by is
-- still named only when the group is not a collection, the key is informative
-- (>= 2 non-stopword tokens), and the latest year holds exactly one document.
--
-- MEASURED EFFECT (full corpus, 2026-07-20)
--   RES  in a multi-year series 62% -> 66%  (SC 0% -> 41%; no GA/ECOSOC change)
--   DEC  in a multi-year series (new) 57%
--   A/HRC PRST: 53/57 keyed, 25 named successions, 0 collections
--   named superseded_by 14,586 -> ~21,400 ; ~40-pair blind audit, 0 false merges
--
-- Idempotent: re-running replaces the functions, matview, and cron job.

-- Shared normalizer. doc_kind is 'PRST' or anything else (RES/DEC).
create or replace function digitallibrary.normalize_series_title(
    title text, doc_kind text default 'RES')
returns text
language plpgsql immutable parallel safe
as $fn$
declare
    t text;
    br text;
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

    if doc_kind = 'PRST' then
        -- presentation noise that varies between sessions (PRST ONLY)
        t := regexp_replace(t, '\s*\[[^\]]*\]\s*$', '');
        t := regexp_replace(t, '[,\s]*human rights council,?\s*\d+\w*\s*session\s*$', '');
        t := regexp_replace(t, '[,\s]*(the )?president''?s? statement\s*$', '');
        t := regexp_replace(t, '[,\s]*statement\s*$', '');
        t := regexp_replace(t, '^reports? of\y', 'report of');
        t := trim(t);
        -- titles with no topic of their own carry no series information
        if t ~ '^(the )?(president''?s? statement|statement by the president|statement)$' then
            return null;
        end if;
    else
        -- topic extraction for RES/DEC: SC "[on <topic>]" wins, else strip a
        -- leading "<Body> resolution/decision N (Y)" self-reference.
        br := substring(t from '\[on (.+)\]\s*$');
        if br is not null then
            t := br;
        else
            t := regexp_replace(t,
                '^(security council|general assembly|economic and social council|'
                || 'trusteeship council|human rights council|commission on human rights)'
                || '\s+(resolution|decision)s?\s+[^ ]+\s*(\(\d{4}\))?\s*', '');
        end if;
    end if;

    -- number-only titles carry no series information (safety net for rows the
    -- extraction above could not improve)
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

-- Backwards-compatible wrapper (021 signature).
create or replace function digitallibrary.normalize_res_title(title text)
returns text
language sql immutable parallel safe
as $fn$
    select digitallibrary.normalize_series_title(title, 'RES');
$fn$;

drop materialized view if exists digitallibrary.resolution_series;

create materialized view digitallibrary.resolution_series as
with base as (
    select
        recid,
        document_symbol,
        coalesce(un_body, '') as un_body,
        coalesce(extract(year from date_publication)::int, 0) as year,
        case
            when document_symbol ~ '/PRST/' then 'PRST'
            when document_symbol ~ '/DEC/'  then 'DEC'
            else 'RES'
        end as doc_type,
        digitallibrary.normalize_series_title(
            coalesce(display_title, title),
            case when document_symbol ~ '/PRST/' then 'PRST' else 'RES' end
        ) as series_key
    from digitallibrary.documents
    where deleted_at is null
      and coalesce(display_title, title) is not null
      and (
            document_symbol ~ '/RES/'
         or document_symbol ~ '/DEC/'
         -- Security Council presidential statements have no topical title;
         -- see the header note. A/HRC presidential statements do.
         or (document_symbol ~ '/PRST/' and document_symbol !~ '^S/PRST/')
      )
),
keyed as (
    select * from base where series_key is not null
),
year_counts as (
    select series_key, un_body, doc_type, year, count(*) as n_in_year
    from keyed
    group by 1, 2, 3, 4
),
group_stats as (
    select
        series_key,
        un_body,
        doc_type,
        sum(n_in_year)::int as series_count,
        min(year) as series_first_year,
        max(year) as series_last_year,
        count(*)::int as n_years,
        max(n_in_year)::int as max_per_year
    from year_counts
    group by 1, 2, 3
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
    select k.series_key, k.un_body, k.doc_type,
           count(*)::int as n_latest,
           min(k.document_symbol) as latest_symbol
    from keyed k
    join group_stats g using (series_key, un_body, doc_type)
    where k.year = g.series_last_year
    group by 1, 2, 3
)
select
    k.recid,
    k.document_symbol,
    k.un_body,
    k.doc_type,
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
join group_stats g using (series_key, un_body, doc_type)
join informative i using (series_key)
join latest_docs ld using (series_key, un_body, doc_type);

-- unique index required for REFRESH ... CONCURRENTLY
create unique index resolution_series_recid_idx
    on digitallibrary.resolution_series (recid);
-- website lookups are by symbol (known duplicate symbols -> non-unique)
create index resolution_series_symbol_idx
    on digitallibrary.resolution_series (document_symbol);
create index resolution_series_key_idx
    on digitallibrary.resolution_series (series_key, un_body, doc_type);

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
