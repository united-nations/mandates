-- =============================================================================
-- Read-only user for the UN dashboard database
-- Grants SELECT on all current and future tables/views in relevant schemas.
-- Re-runnable: safe to execute multiple times.
-- =============================================================================

-- 1. Create role (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mandates_readonly') THEN
        CREATE ROLE mandates_readonly WITH LOGIN PASSWORD 'changeme';
    END IF;
END
$$;

-- 2. Allow connecting to the database
GRANT CONNECT ON DATABASE postgres TO mandates_readonly;

-- 3. Schema-level USAGE (required to see objects inside each schema)
GRANT USAGE ON SCHEMA public       TO mandates_readonly;
GRANT USAGE ON SCHEMA ppb2026      TO mandates_readonly;
GRANT USAGE ON SCHEMA mandates     TO mandates_readonly;
GRANT USAGE ON SCHEMA systemchart  TO mandates_readonly;

-- 4. SELECT on all existing tables, views, and materialized views
GRANT SELECT ON ALL TABLES IN SCHEMA public       TO mandates_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA ppb2026      TO mandates_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA mandates     TO mandates_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA systemchart  TO mandates_readonly;

-- 5. Auto-grant SELECT on any future tables/views created in these schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA public       GRANT SELECT ON TABLES TO mandates_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA ppb2026      GRANT SELECT ON TABLES TO mandates_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA mandates     GRANT SELECT ON TABLES TO mandates_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA systemchart  GRANT SELECT ON TABLES TO mandates_readonly;
