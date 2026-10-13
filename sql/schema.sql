-- Cross-product read-access snapshot for external schemas.
-- Application-owned schemas remain in sql/schema/{mandates,ppb2026,user}.sql.
-- Mirrors migration 040; the Daily product owns the mirror table itself.
-- This file does not create roles, schemas or external tables.
GRANT USAGE ON SCHEMA un_daily_mirror TO mandates_readonly;
GRANT SELECT ON TABLE un_daily_mirror.igov_agenda_items TO mandates_readonly;

-- Registry issuing-organ derivation (migration 041) is defined alongside
-- public.unified_documents in sql/schema/ppb2026.sql. Canonical HRC RES/PRST
-- outcomes derive HRC in both branches; raw Digital Library un_body is retained.
