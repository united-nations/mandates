-- Migration: model "budget version" as a first-class dimension.
--
-- Until now the PPB version was inferred by regex forks hardcoded in the
-- web app (`^PPB 2026$ OR ^PKM 25/26` vs `^PPB 2027$`). That logic was
-- asymmetric: PKM 26/27 (A/80/604), added in migration 009, matched
-- *neither* fork and was unreachable from the version filter.
--
-- A budget *version* groups the budget *documents* already seeded in
-- ppb2026.budget_documents (migration 001 / 007 / 009):
--
--   version ppb2026 = PPB 2026  + Peacekeeping Budget 2025/26  (pko)
--   version ppb2027 = PPB 2027  + Peacekeeping Budget 2026/27  (pko2627)
--
-- After this migration the version predicate is fully data-driven:
-- a citation belongs to version V iff its origin_document matches the
-- match_pattern of any budget_document whose version_slug = V. Adding a
-- future cycle (PPB 2028 + its peacekeeping budget) is two data rows,
-- not another code fork.

create table if not exists ppb2026.budget_versions (
    slug         text primary key,
    display_name text    not null,
    ppb_year     int     not null,
    is_default   boolean not null default false,
    sort_order   smallint not null default 0
);

insert into ppb2026.budget_versions (slug, display_name, ppb_year, is_default, sort_order)
values
    ('ppb2027', 'Proposed Programme Budget for 2027 and Peacekeeping Budget for 2026/2027', 2027, false, 0),
    ('ppb2026', 'Proposed Programme Budget for 2026 and Peacekeeping Budget for 2025/2026', 2026, true,  1)
on conflict (slug) do update set
    display_name = excluded.display_name,
    ppb_year     = excluded.ppb_year,
    is_default   = excluded.is_default,
    sort_order   = excluded.sort_order;

-- exactly one default
update ppb2026.budget_versions set is_default = (slug = 'ppb2026');

alter table ppb2026.budget_documents
    add column if not exists version_slug text;

update ppb2026.budget_documents
set version_slug = case slug
        when 'ppb2026'  then 'ppb2026'
        when 'pko'      then 'ppb2026'   -- Peacekeeping 2025/26
        when 'ppb2027'  then 'ppb2027'
        when 'pko2627'  then 'ppb2027'   -- Peacekeeping 2026/27
    end
where slug in ('ppb2026', 'pko', 'ppb2027', 'pko2627');

alter table ppb2026.budget_documents
    add constraint budget_documents_version_slug_fkey
    foreign key (version_slug) references ppb2026.budget_versions(slug);

create index if not exists budget_documents_version_slug_idx
    on ppb2026.budget_documents (version_slug);
