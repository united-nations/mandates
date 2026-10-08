-- Cross-product read-access snapshot for external schemas.
-- Application-owned schemas remain in sql/schema/{mandates,ppb2026,user}.sql.
-- Mirrors migration 040; the Daily product owns the mirror table itself.
-- This file does not create roles, schemas or external tables.
GRANT USAGE ON SCHEMA un_daily_mirror TO mandates_readonly;
GRANT SELECT ON TABLE un_daily_mirror.igov_agenda_items TO mandates_readonly;
