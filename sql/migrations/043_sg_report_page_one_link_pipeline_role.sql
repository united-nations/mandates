-- ===========================================================================
-- Writer role for the page-one report-to-mandate link tables (migration 043).
--
-- RUN THIS FIRST, ONCE, before 043_sg_report_page_one_links.sql. That
-- migration's entry assertion fails if this role does not exist.
--
-- Kept out of the migration because a login role needs a password, and a
-- password never belongs in a committed file. Replace the placeholder below
-- with a quoted password literal before running. The placeholder is
-- deliberately not a string, so running the file unedited is a syntax error
-- rather than a role with a guessable password.
--
-- One role per writing consumer: this role is used only by the loader of the
-- page-one tables. The Stage 1 extractor's writer is a separate role and is
-- not widened. Table privileges (INSERT on three tables, nothing else) are
-- granted by the migration, not here.
--
-- Needs CREATEROLE. Deliberately no IF NOT EXISTS: if the role already exists,
-- this fails, and whoever created it should be found before reusing it.
-- ===========================================================================
CREATE ROLE mandates_page_one_link_pipeline LOGIN PASSWORD __REPLACE_WITH_QUOTED_PASSWORD__;

-- Same CONNECT grant sql/schema/user.sql gives mandates_readonly, resolved
-- against the database this script is run in rather than a hard-coded name.
-- A GRANT the running role may not give only warns, so the result is checked.
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO mandates_page_one_link_pipeline',
                   current_database());
    IF NOT has_database_privilege('mandates_page_one_link_pipeline', current_database(), 'CONNECT') THEN
        RAISE EXCEPTION 'mandates_page_one_link_pipeline cannot connect to %', current_database();
    END IF;
END
$$;
