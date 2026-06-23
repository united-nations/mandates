-- 019: Move the default budget version from ppb2026 to ppb2027.
--
-- ppb2026.budget_versions.is_default drives every "active mandates" filter:
-- the stat cards, sidebar counts, list query and facet builders all
-- COALESCE(filters.ppb_version, (select slug ... where is_default)) before
-- joining citations. Flipping the flag here moves the whole app's default
-- view to the latest budget (Proposed Programme Budget for 2027 +
-- Peacekeeping Budget 2026/2027 + Plan Outline 2026-2028) without touching
-- application code.
--
-- Idempotent: re-running converges to the same single-default state even if
-- the flag has been set by hand. No unique constraint enforces "at most one
-- default" — the queries that read this column already use LIMIT 1 — but
-- both rows are explicitly set so the state is unambiguous.

update ppb2026.budget_versions set is_default = (slug = 'ppb2027');
