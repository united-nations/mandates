-- Migration: relax `entity` to be nullable on source_document_citations.
--
-- The Plan Outline assigns documents to UN priority areas (not to specific
-- entities), so its citations carry priority_area and no entity. Until now
-- those rows were dropped at seed-time because entity was NOT NULL with an
-- FK to systemchart.entities. The FK already tolerates NULL on its own;
-- this migration drops the NOT NULL so the rows can be inserted.
--
-- The natural-key index uses COALESCE(entity, '') so NULL slots are already
-- distinguishable from real entities for uniqueness.

alter table ppb2026.source_document_citations
    alter column entity drop not null;
