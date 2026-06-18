-- Migration: seed the Plan Outline as a budget document spanning two versions.
--
-- A/80/6 (Plan outline) is the UN's triennial strategic framework; this
-- iteration covers the proposed programme budgets for 2026, 2027, and 2028.
-- We label it version-neutrally as "Plan Outline 2026-2028" and map it to
-- the two budget versions currently modelled (ppb2026, ppb2027).
-- When PPB 2028 is added, append another row to budget_document_versions.

begin;

insert into ppb2026.budget_documents (slug, display_name, match_pattern, sort_order)
values ('plan-outline-a80-6', 'Plan Outline 2026-2028', '^Plan Outline 2026-2028$', 4)
on conflict (slug) do update
set display_name  = excluded.display_name,
    match_pattern = excluded.match_pattern,
    sort_order    = excluded.sort_order;

insert into ppb2026.budget_document_versions (doc_slug, version_slug)
values ('plan-outline-a80-6', 'ppb2026'),
       ('plan-outline-a80-6', 'ppb2027')
on conflict do nothing;

commit;
