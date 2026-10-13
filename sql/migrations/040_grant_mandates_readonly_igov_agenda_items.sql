-- Mandates reads the existing Daily agenda mirror in the same database.
-- Run manually as its owner/administrator. No table/data changes are made.
-- Re-running these narrow grants is safe; no future-table or write privileges.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'mandates_readonly') THEN
        RAISE EXCEPTION 'Required existing role mandates_readonly is missing';
    END IF;
    IF to_regclass('un_daily_mirror.igov_agenda_items') IS NULL THEN
        RAISE EXCEPTION 'Required existing mirror un_daily_mirror.igov_agenda_items is missing';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA un_daily_mirror TO mandates_readonly;
GRANT SELECT ON TABLE un_daily_mirror.igov_agenda_items TO mandates_readonly;
