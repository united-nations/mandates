-- 012: Auto-refresh public.unified_documents daily via pg_cron.
--
-- The digitallibrary.documents table is updated by a once-daily sync that
-- lives in a separate codebase. unified_documents is a materialized view
-- (migration 011) and does NOT auto-update, so it must be refreshed after
-- that sync. A trigger on digitallibrary.documents is deliberately NOT used:
-- it would fire inside the sync's bulk transaction and run an
-- ACCESS EXCLUSIVE ~1s REFRESH per statement. pg_cron keeps the refresh
-- fully decoupled from the sync codebase.
--
-- Schedule: 07:00 UTC daily. pg_cron evaluates cron expressions in UTC.
-- 07:00 UTC = 03:00 America/New_York during EDT (summer, UTC-4) and
-- 02:00 during EST (winter, UTC-5). For a daily maintenance refresh the
-- one-hour DST drift is harmless; what matters is that it runs after the
-- daily digitallibrary sync.
--
-- pg_cron (v1.6) is installed in the `postgres` database, which is also
-- cron.database_name and the database containing this matview, so a plain
-- cron.schedule() runs the job in the right place.
--
-- Idempotent: re-running this migration replaces the existing job.

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh_unified_documents';

select cron.schedule(
    'refresh_unified_documents',
    '0 7 * * *',
    $$refresh materialized view public.unified_documents$$
);
