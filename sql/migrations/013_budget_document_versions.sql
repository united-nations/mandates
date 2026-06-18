-- Migration: split budget_documents identity from version membership (m2m).
--
-- Before: ppb2026.budget_documents had a `version_slug` column FK'd to
-- budget_versions. That worked for every existing row because each budget
-- document (PPB 2026, PKM 25/26, PPB 2027, PKM 26/27) belongs to exactly
-- one version. It breaks for the Plan Outline, which is published once
-- every three years and spans the multiple budget versions it covers
-- (A/80/6 covers PPB 2026, 2027, 2028; A/83/6 will cover 2029, 2030, 2031).
--
-- After: budget_documents.version_slug is gone. Membership lives in a
-- new join table budget_document_versions. The version-scoping SQL in
-- the web app joins through this table instead of reading the column.

create table if not exists ppb2026.budget_document_versions (
    doc_slug     text not null references ppb2026.budget_documents(slug) on delete cascade,
    version_slug text not null references ppb2026.budget_versions(slug),
    primary key (doc_slug, version_slug)
);

create index if not exists budget_document_versions_version_slug_idx
    on ppb2026.budget_document_versions (version_slug);

-- Migrate existing single-version memberships into the join table.
insert into ppb2026.budget_document_versions (doc_slug, version_slug)
select slug, version_slug
from ppb2026.budget_documents
where version_slug is not null
on conflict do nothing;

-- Drop the now-redundant column (cascades the FK + index).
alter table ppb2026.budget_documents
    drop column if exists version_slug;
