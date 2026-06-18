-- Migration: surface the Plan Outline in the budget-version dropdown labels.
--
-- A/80/6 (Plan Outline 2026-2028) is now part of both modelled budget
-- versions via budget_document_versions; reflect that in the dropdown
-- so users know it's there before they pick a version.

update ppb2026.budget_versions
set display_name = 'Proposed Programme Budget for 2026, Peacekeeping Budget for 2025/2026 and Plan Outline 2026-2028'
where slug = 'ppb2026';

update ppb2026.budget_versions
set display_name = 'Proposed Programme Budget for 2027, Peacekeeping Budget for 2026/2027 and Plan Outline 2026-2028'
where slug = 'ppb2027';
