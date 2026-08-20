/**
 * @file Filtered subject-count SQL
 * @description Deduplicates small per-document arrays before global grouping.
 *
 * Key exports:
 * - subjectCountSql() - Builds subject row and count CTEs.
 */

/** Builds exact distinct-document subject counts without a global DISTINCT. */
export const subjectCountSql = (documentsCte: string): string => `
  subj AS (
    SELECT fd.ppb_full_document_symbol AS sym, normalized.subject
    FROM ${documentsCte} fd
    CROSS JOIN LATERAL (
      SELECT DISTINCT LOWER(TRIM(s)) AS subject
      FROM UNNEST(fd.subjects) s
      WHERE TRIM(s) <> ''
    ) normalized
    WHERE fd.subjects IS NOT NULL
  ),
  subject_counts AS (
    SELECT subject, COUNT(*)::int AS n
    FROM subj
    GROUP BY subject
  )`
