/**
 * @file Ungrouped mandate-list SQL layout
 * @description Applies pagination before per-row resolution-series enrichment.
 *
 * Key exports:
 * - buildUngroupedListSql() - Builds the ungrouped paginated list query.
 */

interface ListSqlOptions {
  filteredCte: string
  keywordRank: string
  limitParam: string
  offsetParam: string
  orderBy: string
  seriesColumns: string
  unpaginated?: boolean
}

const pageCte = (options: ListSqlOptions): string => `
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM filtered_docs
  ),
  page AS (
    SELECT c.*${options.keywordRank}
    FROM counted c
    ${options.orderBy}
    ${options.unpaginated ? '' : `LIMIT ${options.limitParam} OFFSET ${options.offsetParam}`}
  )`

const seriesJoin = `LEFT JOIN LATERAL (
    SELECT series_count, is_collection, has_newer, is_latest, superseded_by
    FROM digitallibrary.resolution_series
    WHERE document_symbol = p.ppb_full_document_symbol
    ORDER BY recid
    LIMIT 1
  ) rs ON true`

/** Builds a list query whose series lookup touches only visible rows. */
export const buildUngroupedListSql = (options: ListSqlOptions): string => {
  const pageOrder = options.orderBy.replace(/\bc\./g, 'p.')
  return `/* trace:mandates.list */
  WITH ${options.filteredCte},${pageCte(options)}
  SELECT p.*,${options.seriesColumns}
  FROM page p
  ${seriesJoin}
  ${pageOrder}`
}
