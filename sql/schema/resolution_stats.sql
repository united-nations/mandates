-- =============================================================================
-- Resolution statistics from the un-mandates analysis pipeline
--
-- Sourced from: un-mandates/data/public/all_resolutions_dashboard.json
-- Loaded via:   scripts/load_resolution_stats.py
--
-- Contains computed fields per resolution:
--   - word_count:              parsed PDF text length
--   - similarity_to_previous:  cosine/text similarity to previous doc in series
--   - has_within_existing_resources: whether text mentions "within existing resources"
--   - is_recurring_series:     part of an annual/periodic resolution series
--   - series_* fields:         series temporal metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.resolution_stats (
  symbol                          TEXT PRIMARY KEY,
  word_count                      INTEGER,
  similarity_to_previous          NUMERIC(12, 9),
  previous_symbol                 TEXT,
  distance_to_previous            INTEGER,
  has_within_existing_resources   BOOLEAN,
  count_within_existing_resources INTEGER,
  is_recurring_series             BOOLEAN NOT NULL DEFAULT FALSE,
  series_symbol_count             INTEGER,
  series_first_year               INTEGER,
  series_last_year                INTEGER,
  series_year_range               INTEGER,
  pdf_url                         TEXT,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes to support sorting in the dashboard
CREATE INDEX IF NOT EXISTS resolution_stats_word_count_idx
  ON public.resolution_stats (word_count);

CREATE INDEX IF NOT EXISTS resolution_stats_similarity_idx
  ON public.resolution_stats (similarity_to_previous);

-- Grant read access (re-runnable, mirrors user.sql pattern)
GRANT SELECT ON public.resolution_stats TO mandates_readonly;
