-- 041: Correct registry issuing organs for canonical HRC RES/PRST outcomes.
-- MANUAL APPLY ONLY. Never updates Digital Library or curated PPB source rows.
-- Covers regular/special resolutions, OM resolutions, regular/OS presidential
-- statements and their corrigenda/revisions/addenda; reports, drafts, prose
-- and composite aliases retain their existing body.
--
-- The live view can predate migration 035. Wrap its existing SELECT rather
-- than substituting the latest schema snapshot: no implicit document-type
-- change, membership change or refresh of any other derived field.
-- Rebuild is atomic and preserves all existing columns, indexes, ownership,
-- relation comment and ACL privileges (including WITH GRANT OPTION).
-- No CASCADE: a new dependent object causes the transaction to fail safely.
-- WITH DATA recreates the view from current sources; no extra REFRESH needed.
-- A conservation guard compares complete stored rows with only the intended
-- issuing-body correction applied, preventing unrelated body-only drift too.
-- If the sources have drifted since the last refresh, the entire transaction
-- rolls back. Review/refresh that drift separately before applying this change.

begin;

-- Approved: allow the two exact hash-audited refreshes below.
-- Any other drift still fails the conservation guard.
set local mandates.allow_audited_041_refresh = 'on';

-- Issuing organ for adopted HRC outcomes, independent of their broad DL
-- catalog body. Preserve every fallback for other/ambiguous symbol families.
-- Whitespace, case and compatibility forms do not change symbol identity.
create or replace function public.registry_issuing_body(document_symbol text, fallback_body text)
returns text language sql immutable parallel safe
as $issuing_body$
    select case
        when upper(regexp_replace(normalize(document_symbol, NFKC), '[[:space:]]', '', 'g'))
            ~ '^A/HRC/(RES/((S-)?[1-9][0-9]*|OM/[1-9][0-9]*)/(R\.)?[1-9][0-9]*|PRST/([1-9][0-9]*|OS/[1-9][0-9]*)/[1-9][0-9]*)(/(CORR|REV|ADD)\.[1-9][0-9]*)?$'
        then 'HRC'
        else fallback_body
    end
$issuing_body$;

do $migration$
declare
    old_definition text;
    projection text;
    indexes text[];
    privileges text[];
    relation_owner text;
    relation_comment text;
    command text;
begin
    select pg_get_viewdef(c.oid, true), pg_get_userbyid(c.relowner),
           obj_description(c.oid, 'pg_class')
    into strict old_definition, relation_owner, relation_comment
    from pg_class c
    where c.oid = 'public.unified_documents'::regclass and c.relkind = 'm';

    -- Reapplying the migration updates the immutable function above without
    -- nesting another wrapper or rebuilding an already-correct view.
    if position('registry_issuing_body(' in old_definition) > 0 then
        return;
    end if;

    select string_agg(
        case when attname = 'ppb_body' then
            'public.registry_issuing_body(base.ppb_full_document_symbol, base.ppb_body) AS ppb_body'
        else format('base.%I', attname) end,
        ', ' order by attnum)
    into projection
    from pg_attribute
    where attrelid = 'public.unified_documents'::regclass
      and attnum > 0 and not attisdropped;

    select array_agg(indexdef order by indexname) into indexes
    from pg_indexes
    where schemaname = 'public' and tablename = 'unified_documents';

    select array_agg(format('GRANT %s ON TABLE public.unified_documents TO %s%s',
        acl.privilege_type,
        case when acl.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(acl.grantee)) end,
        case when acl.is_grantable then ' WITH GRANT OPTION' else '' end))
    into privileges
    from pg_class c,
         lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    where c.oid = 'public.unified_documents'::regclass;

    create temporary table registry_issuing_body_before on commit drop as
        select to_jsonb(d) || jsonb_build_object('ppb_body',
            public.registry_issuing_body(d.ppb_full_document_symbol, d.ppb_body)) as record
        from public.unified_documents d;

    execute 'DROP MATERIALIZED VIEW public.unified_documents';
    execute format('CREATE MATERIALIZED VIEW public.unified_documents AS SELECT %s FROM (%s) base WITH DATA',
        projection, regexp_replace(old_definition, ';[[:space:]]*$', ''));

    if current_setting('mandates.allow_audited_041_refresh', true) = 'on' then
        -- Audited 2026-10-08, full PostgreSQL jsonb row SHA-256 values.
        -- 2025(XX): adds agenda A/5990/Rev.1 item 102 and trailing CHINA subject.
        -- 2069(XX): BAHAMAS subject becomes BAHAMAS (THE).
        -- Accept only the exact complete old/new rows, never a symbol wildcard
        -- or permission to refresh any other fields on these documents.
        update registry_issuing_body_before stored
        set record = to_jsonb(fresh)
        from public.unified_documents fresh,
            (values
                ('A/RES/2025(XX)', '73aa35e6d07d25ce8e813dae737249f90a47db21f9e1d85538d8a6d6608e46e2', 'b3b5c736bcb3b6f40df1e123865243613816505fa367571ce21dde0b5890b386'),
                ('A/RES/2069(XX)', '5cd9863d3765d8bf8b98ab4d66c7e2c00ee8b579d52c6ab763dce2c2af84bbdd', '852793b84464aa987a353d07a2805754a7d18d2296e29cb814f61c5da40af5b4')
            ) audited(symbol, old_sha256, new_sha256)
        where stored.record ->> 'ppb_full_document_symbol' = audited.symbol
          and fresh.ppb_full_document_symbol = audited.symbol
          and encode(sha256(convert_to(stored.record::text, 'UTF8')), 'hex') = audited.old_sha256
          and encode(sha256(convert_to(to_jsonb(fresh)::text, 'UTF8')), 'hex') = audited.new_sha256;
    end if;

    if exists (
        (select record from registry_issuing_body_before
         except all select to_jsonb(d) from public.unified_documents d)
        union all
        (select to_jsonb(d) from public.unified_documents d
         except all select record from registry_issuing_body_before)
    ) then
        raise exception 'Issuing-body migration rejected: source refresh changes fields or membership outside the intended issuing-body correction. Review and refresh separately, then retry.';
    end if;
    if indexes is not null then
        foreach command in array indexes loop execute command; end loop;
    end if;
    execute format('ALTER MATERIALIZED VIEW public.unified_documents OWNER TO %I', relation_owner);
    if privileges is not null then
        foreach command in array privileges loop execute command; end loop;
    end if;
    if relation_comment is not null then
        execute format('COMMENT ON MATERIALIZED VIEW public.unified_documents IS %L', relation_comment);
    end if;
end
$migration$;

commit;
