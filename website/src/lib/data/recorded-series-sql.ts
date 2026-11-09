/** Broad analytical recurrence, mirroring the genuinely-new first-year rule.
 * Includes collections. Every member of the last recorded publication year is
 * retained, together with standalone, uninformative and missing-series records.
 * The materialized series covers full history before version or age filters.
 * These title-based endpoints do not assert legal supersession or expiry.
 */
export const recordedSeriesCtes = `earlier_symbols AS (
       SELECT DISTINCT document_symbol
       FROM digitallibrary.resolution_series
       WHERE is_recurring AND is_informative AND year > 0 AND year < series_last_year
     )`
