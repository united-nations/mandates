/**
 * Insights / Resolution Stats Database Queries
 *
 * Fetches data from public.documents LEFT JOIN public.resolution_stats
 * to power the Insights table.  All documents are included; resolution_stats
 * columns will be NULL for documents without stats.  Server-side only.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany } from '../db/query'
import { formatDocumentTitle } from '../utils'

// ============================================================================
// Types
// ============================================================================

export interface InsightRow {
  symbol: string
  title: string | null
  proper_title: string | null
  display_title: string
  year: number | null
  issuing_body: string | null
  organ_short: string | null
  word_count: number | null
  similarity_to_previous: number | null
  previous_symbol: string | null
  is_recurring_series: boolean | null
  series_symbol_count: number | null
  series_first_year: number | null
  series_last_year: number | null
  pdf_url: string | null
}

interface InsightDbRow {
  symbol: string
  title: string | null
  proper_title: string | null
  date_year: number | null
  issuing_body: string | null
  organ_short: string | null
  word_count: number | null
  similarity_to_previous: string | null
  previous_symbol: string | null
  is_recurring_series: boolean | null
  series_symbol_count: number | null
  series_first_year: number | null
  series_last_year: number | null
  pdf_url: string | null
  total_count: string
}

export interface InsightFilters {
  keyword?: string
  organ?: string
  start_year?: string
  end_year?: string
  recurrence?: string     // 'recurring' | 'non-recurring'
  sort_by?: string
  page?: string
  limit?: string
}

export interface InsightIssuingBody {
  value: string
  short: string | null
  count: number
}

export interface InsightsResponse {
  rows: InsightRow[]
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }
  filterOptions: {
    issuingBodies: InsightIssuingBody[]
    yearRange: { min: number; max: number }
  }
}

type SqlParam = string | number | boolean | null

// ============================================================================
// Filter Building
// ============================================================================

function buildInsightFilterClauses(
  filters: InsightFilters,
  paramOffset = 0
): { clauses: string[]; params: SqlParam[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let idx = paramOffset + 1

  if (filters.organ) {
    const bodies = filters.organ.split(',').map((b) => b.trim()).filter(Boolean)
    if (bodies.length === 1) {
      clauses.push(`d.issuing_body = $${idx}`)
      params.push(bodies[0])
      idx++
    } else if (bodies.length > 1) {
      const placeholders = bodies.map((_, i) => `$${idx + i}`).join(', ')
      clauses.push(`d.issuing_body IN (${placeholders})`)
      bodies.forEach((b) => params.push(b))
      idx += bodies.length
    }
  }

  if (filters.start_year) {
    clauses.push(`d.date_year >= $${idx}`)
    params.push(parseInt(filters.start_year))
    idx++
  }

  if (filters.end_year) {
    clauses.push(`d.date_year <= $${idx}`)
    params.push(parseInt(filters.end_year))
    idx++
  }

  if (filters.recurrence === 'recurring') {
    clauses.push(`rs.is_recurring_series = true`)
  } else if (filters.recurrence === 'non-recurring') {
    clauses.push(`(rs.is_recurring_series = false OR rs.is_recurring_series IS NULL)`)
  }

  if (filters.keyword) {
    const kw = filters.keyword.trim()
    clauses.push(`(
      LOWER(d.symbol) LIKE $${idx}
      OR LOWER(d.title) LIKE $${idx}
      OR LOWER(d.proper_title) LIKE $${idx}
    )`)
    params.push(`%${kw.toLowerCase()}%`)
    idx++
  }

  return { clauses, params }
}

function buildInsightOrderBy(sortBy?: string): string {
  switch (sortBy) {
    case 'symbol_asc':
      return 'ORDER BY d.symbol ASC'
    case 'symbol_desc':
      return 'ORDER BY d.symbol DESC'
    case 'year_asc':
      return 'ORDER BY d.date_year ASC NULLS LAST, d.symbol DESC'
    case 'year_desc':
      return 'ORDER BY d.date_year DESC NULLS LAST, d.symbol DESC'
    case 'title_asc':
      return 'ORDER BY d.title ASC NULLS LAST'
    case 'title_desc':
      return 'ORDER BY d.title DESC NULLS LAST'
    case 'length_asc':
      return 'ORDER BY rs.word_count ASC NULLS LAST, d.symbol DESC'
    case 'length_desc':
      return 'ORDER BY rs.word_count DESC NULLS LAST, d.symbol DESC'
    case 'similarity_asc':
      return 'ORDER BY rs.similarity_to_previous ASC NULLS LAST, d.symbol DESC'
    case 'similarity_desc':
      return 'ORDER BY rs.similarity_to_previous DESC NULLS LAST, d.symbol DESC'
    case 'recurrence_asc':
      return 'ORDER BY rs.series_symbol_count ASC NULLS LAST, d.symbol DESC'
    case 'recurrence_desc':
      return 'ORDER BY rs.series_symbol_count DESC NULLS LAST, d.symbol DESC'
    case 'organ_asc':
      return 'ORDER BY o.sort_order ASC NULLS LAST, d.date_year DESC NULLS LAST, d.symbol DESC'
    case 'organ_desc':
      return 'ORDER BY o.sort_order DESC NULLS LAST, d.date_year DESC NULLS LAST, d.symbol DESC'
    default:
      return 'ORDER BY o.sort_order ASC NULLS LAST, d.date_year DESC NULLS LAST, d.symbol DESC'
  }
}

// ============================================================================
// Core Query
// ============================================================================

async function getInsightRows(
  filters: InsightFilters,
  options: { page?: number; limit?: number } = {}
): Promise<{ rows: InsightRow[]; totalCount: number }> {
  const page = options.page ?? 1
  const limit = options.limit ?? 25
  const offset = (page - 1) * limit

  const { clauses, params } = buildInsightFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''
  const orderBy = buildInsightOrderBy(filters.sort_by)

  const sql = `
    SELECT
      d.symbol,
      d.title,
      d.proper_title,
      d.date_year,
      d.issuing_body,
      o.short AS organ_short,
      rs.word_count,
      rs.similarity_to_previous,
      rs.previous_symbol,
      rs.is_recurring_series,
      rs.series_symbol_count,
      rs.series_first_year,
      rs.series_last_year,
      rs.pdf_url,
      COUNT(*) OVER() AS total_count
    FROM public.documents d
    LEFT JOIN public.resolution_stats rs ON d.symbol = rs.symbol
    LEFT JOIN ppb2026.organs o ON d.issuing_body = o.long
    WHERE 1=1 ${whereClause}
    ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `

  const dbRows = await queryMany<InsightDbRow>(sql, [...params, limit, offset])

  if (dbRows.length === 0) {
    return { rows: [], totalCount: 0 }
  }

  const totalCount = parseInt(dbRows[0].total_count ?? '0')

  const rows: InsightRow[] = dbRows.map((r) => ({
    symbol: r.symbol,
    title: r.title,
    proper_title: r.proper_title,
    display_title: formatDocumentTitle(r.title, r.proper_title, r.issuing_body),
    year: r.date_year,
    issuing_body: r.issuing_body,
    organ_short: r.organ_short ?? null,
    word_count: r.word_count,
    similarity_to_previous:
      r.similarity_to_previous != null ? parseFloat(r.similarity_to_previous) : null,
    previous_symbol: r.previous_symbol,
    is_recurring_series: r.is_recurring_series,
    series_symbol_count: r.series_symbol_count,
    series_first_year: r.series_first_year,
    series_last_year: r.series_last_year,
    pdf_url: r.pdf_url,
  }))

  return { rows, totalCount }
}

// ============================================================================
// Filter Options (for sidebar / dropdowns)
// ============================================================================

async function getInsightIssuingBodies(): Promise<InsightIssuingBody[]> {
  const sql = `
    SELECT d.issuing_body AS value, o.short, COUNT(*) AS count
    FROM public.documents d
    LEFT JOIN ppb2026.organs o ON d.issuing_body = o.long
    WHERE d.issuing_body IS NOT NULL AND d.issuing_body != ''
    GROUP BY d.issuing_body, o.short
    ORDER BY count DESC
  `
  const rows = await queryMany<{ value: string; short: string | null; count: string }>(sql)
  return rows.map((r) => ({ value: r.value, short: r.short ?? null, count: parseInt(r.count) }))
}

async function getInsightYearRange(): Promise<{ min: number; max: number }> {
  const sql = `
    SELECT MIN(d.date_year) AS min_year, MAX(d.date_year) AS max_year
    FROM public.documents d
    WHERE d.date_year IS NOT NULL
  `
  const row = await queryMany<{ min_year: number; max_year: number }>(sql)
  if (row.length === 0) return { min: 1946, max: 2026 }
  return { min: row[0].min_year ?? 1946, max: row[0].max_year ?? 2026 }
}

// ============================================================================
// Orchestrator
// ============================================================================

async function _getInsightsDataInner(filters: InsightFilters): Promise<InsightsResponse> {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '25', 10)

  const [result, issuingBodies, yearRange] = await Promise.all([
    getInsightRows(filters, { page, limit }),
    getInsightIssuingBodies(),
    getInsightYearRange(),
  ])

  return {
    rows: result.rows,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(result.totalCount / limit),
      totalItems: result.totalCount,
    },
    filterOptions: {
      issuingBodies,
      yearRange,
    },
  }
}

/**
 * Public API: fetch insights data with two-layer caching.
 */
export const getInsightsData = cache(
  (filters: InsightFilters): Promise<InsightsResponse> =>
    unstable_cache(
      () => _getInsightsDataInner(filters),
      ['insights', JSON.stringify(filters)],
      { revalidate: 300 }
    )()
)
