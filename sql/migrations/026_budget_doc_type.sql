-- Adds doc_type to ppb2026.budget_documents: the top-level budget "stream" that
-- groups the per-version editions into three branches:
--   ppb          -> Proposed Programme Budget (Part -> Section -> Entity -> Subprogramme)
--   pko          -> Peacekeeping Operations financing (missions + support account)
--   plan_outline -> Plan Outline (strategic; no sub-structure)
-- This is the single source of truth the budget-hierarchy tree groups by, so a
-- new budget document only needs its doc_type set here (never hardcoded in app
-- code). Backfills the 5 existing rows.

alter table ppb2026.budget_documents
    add column if not exists doc_type text;

update ppb2026.budget_documents
set doc_type = case
        when slug in ('ppb2026', 'ppb2027') then 'ppb'
        when slug in ('pko', 'pko2627') then 'pko'
        when slug = 'plan-outline-a80-6' then 'plan_outline'
    end
where doc_type is null;

alter table ppb2026.budget_documents
    alter column doc_type set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'budget_documents_doc_type_check'
    ) then
        alter table ppb2026.budget_documents
            add constraint budget_documents_doc_type_check
            check (doc_type in ('ppb', 'pko', 'plan_outline'));
    end if;
end $$;
