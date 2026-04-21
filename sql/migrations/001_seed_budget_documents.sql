-- Seed: ppb2026.budget_documents
-- Filterable origin_document types for the mandate explorer filter UI.
-- match_pattern is a POSIX regex matched against source_document_citations.origin_document.
-- Add new rows here when new budget documents become available.

insert into ppb2026.budget_documents (slug, display_name, match_pattern, sort_order) values
    ('ppb2026', 'Proposed Programme Budget for 2026',      '^PPB 2026$',  1),
    ('pko',     'Budget of Peacekeeping Operations 2025/26', '^PKM 25/26', 2)
on conflict (slug) do update
    set display_name   = excluded.display_name,
        match_pattern  = excluded.match_pattern,
        sort_order     = excluded.sort_order;
