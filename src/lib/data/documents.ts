/**
 * Public Documents Database Queries
 *
 * Fetches data from public.documents (41k+ UN documents).
 * Used in "All Documents" mode as an alternative to the PPB-specific queries.
 * All operations are server-side only.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany, queryOne } from '../db/query'
import { titleCase } from 'title-case'
import { getMandateDisplayTitle } from '@/lib/utils'
import type { Mandate, FilterOptions, OrganWithCount, EntityWithCount, ApiResponse } from '@/types'
import { getAllEntities } from './entities'
import { getOrganMap } from './organs'

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

interface DocumentListRow {
  symbol: string
  title: string | null
  proper_title: string | null
  uniform_title: string | null // jsonb → text
  subtitle: string | null
  date_year: number | null
  issuing_body: string | null
  document_type: string | null
  subject_terms: string | null // jsonb → text
  total_count: string
  // PPB enrichment (null when document has no PPB citations)
  num_entities: string
  num_citations: string
  entities: string[] | null
  ppb_link: string | null
  ppb_description: string | null
  // Resolution stats enrichment
  word_count: number | null
  similarity_to_previous: string | null // numeric → string from pg
  previous_symbol: string | null
  has_within_existing_resources: boolean | null
  is_recurring_series: boolean | null
  series_symbol_count: number | null
  series_first_year: number | null
  series_last_year: number | null
  pdf_url: string | null
}

interface CountsRow {
  total_documents: string
  total_issuing_bodies: string
  total_entities: string
  total_citations: string
}

interface ValueCountRow {
  value: string
  count: string
}

interface YearRow {
  year: number
  count: string
}

type SqlParam = string | number | boolean | null

// ============================================================================
// Filter Building
// ============================================================================

function buildDocumentFilterClauses(
  filters: FilterOptions,
  paramOffset = 0
): { clauses: string[]; params: SqlParam[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let paramIndex = paramOffset + 1

  // Issuing body filter (equivalent of organ in PPB mode)
  if (filters.organ) {
    clauses.push(`d.issuing_body = $${paramIndex}`)
    params.push(filters.organ)
    paramIndex++
  }

  // Year range filters
  if (filters.start_year) {
    clauses.push(`d.date_year >= $${paramIndex}`)
    params.push(parseInt(filters.start_year))
    paramIndex++
  }
  if (filters.end_year) {
    clauses.push(`d.date_year <= $${paramIndex}`)
    params.push(parseInt(filters.end_year))
    paramIndex++
  }

  // Document type filter (new, only available in All mode)
  if (filters.document_type) {
    clauses.push(`d.document_type = $${paramIndex}`)
    params.push(filters.document_type)
    paramIndex++
  }

  // Subject filter (jsonb array)
  if (filters.subject) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(d.subject_terms) AS st
        WHERE LOWER(st) LIKE $${paramIndex}
      )
    `)
    params.push(`%${filters.subject.toLowerCase()}%`)
    paramIndex++
  }

  // Keyword search — full-text on combined fields + LIKE fallback
  if (filters.keyword) {
    const keyword = filters.keyword.trim()
    clauses.push(`(
      to_tsvector('english',
        COALESCE(d.title, '') || ' ' ||
        COALESCE(d.proper_title, '') || ' ' ||
        COALESCE(d.uniform_title::text, '')
      ) @@ plainto_tsquery('english', $${paramIndex})
      OR LOWER(d.symbol) LIKE $${paramIndex + 1}
      OR LOWER(d.title) LIKE $${paramIndex + 1}
      OR LOWER(d.proper_title) LIKE $${paramIndex + 1}
      OR LOWER(d.uniform_title::text) LIKE $${paramIndex + 1}
      OR LOWER(d.subtitle) LIKE $${paramIndex + 1}
      OR LOWER(d.subject_terms::text) LIKE $${paramIndex + 1}
    )`)
    params.push(keyword, `%${keyword.toLowerCase()}%`)
    paramIndex += 2
  }

  // Exact symbol match
  if (filters.full_document_symbol) {
    clauses.push(`d.symbol = $${paramIndex}`)
    params.push(filters.full_document_symbol)
    paramIndex++
  }

  return { clauses, params }
}

function buildDocumentOrderByClause(sortBy?: string): string {
  switch (sortBy) {
    case 'year_desc':
      return 'ORDER BY d.date_year DESC NULLS LAST, d.symbol'
    case 'year_asc':
      return 'ORDER BY d.date_year ASC NULLS LAST, d.symbol'
    case 'title_asc':
      return 'ORDER BY d.title ASC NULLS LAST'
    case 'title_desc':
      return 'ORDER BY d.title DESC NULLS LAST'
    case 'word_count_desc':
      return 'ORDER BY rs.word_count DESC NULLS LAST, d.symbol'
    case 'word_count_asc':
      return 'ORDER BY rs.word_count ASC NULLS LAST, d.symbol'
    case 'similarity_desc':
      return 'ORDER BY rs.similarity_to_previous DESC NULLS LAST, d.symbol'
    case 'similarity_asc':
      return 'ORDER BY rs.similarity_to_previous ASC NULLS LAST, d.symbol'
    default:
      return 'ORDER BY d.date_year DESC NULLS LAST, d.symbol'
  }
}

// ============================================================================
// Core Queries
// ============================================================================

async function getDocuments(
  filters: FilterOptions = {},
  options: { page?: number; limit?: number } = {}
): Promise<{ mandates: Mandate[]; totalCount: number }> {
  const page = options.page ?? 1
  const limit = options.limit ?? 10
  const offset = (page - 1) * limit

  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = buildDocumentOrderByClause(filters.sort_by)

  const sql = `
    WITH filtered AS (
      SELECT
        d.symbol,
        d.title,
        d.proper_title,
        d.uniform_title::text,
        d.subtitle,
        d.date_year,
        d.issuing_body,
        d.document_type,
        d.subject_terms::text as subject_terms,
        COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as num_entities,
        COUNT(c.id) as num_citations,
        ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities,
        sd.ppb_link,
        sd.ppb_description,
        rs.word_count,
        rs.similarity_to_previous,
        rs.previous_symbol,
        rs.has_within_existing_resources,
        rs.is_recurring_series,
        rs.series_symbol_count,
        rs.series_first_year,
        rs.series_last_year,
        rs.pdf_url,
        COUNT(*) OVER() as total_count
      FROM public.documents d
      LEFT JOIN ppb2026.source_documents sd
        ON d.symbol = sd.ppb_full_document_symbol
      LEFT JOIN ppb2026.source_document_citations c
        ON d.symbol = c.ppb_full_document_symbol
      LEFT JOIN public.resolution_stats rs
        ON d.symbol = rs.symbol
      ${whereClause}
      GROUP BY d.symbol, d.title, d.proper_title, d.uniform_title,
        d.subtitle, d.date_year, d.issuing_body, d.document_type,
        d.subject_terms, sd.ppb_link, sd.ppb_description,
        rs.word_count, rs.similarity_to_previous, rs.previous_symbol,
        rs.has_within_existing_resources, rs.is_recurring_series,
        rs.series_symbol_count, rs.series_first_year, rs.series_last_year,
        rs.pdf_url
      ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    )
    SELECT * FROM filtered
  `

  const rows = await queryMany<DocumentListRow>(sql, [...params, limit, offset])

  if (rows.length === 0) {
    return { mandates: [], totalCount: 0 }
  }

  const totalCount = parseInt(rows[0]?.total_count ?? '0')

  // Map public.documents rows into the Mandate shape (adapter pattern)
  const mandates: Mandate[] = rows.map((row) => {
    const subjectTerms = parseJsonbArray(row.subject_terms)
    return {
      full_document_symbol: row.symbol,
      document_symbol: row.symbol,
      num_citations: parseInt(row.num_citations) || 0,
      num_entities: parseInt(row.num_entities) || 0,
      entities: row.entities || [],
      link: row.ppb_link || null,
      year: row.date_year?.toString() || '',
      body: row.issuing_body || '',
      description: row.ppb_description || null,
      type: row.document_type || 'Unknown',
      uniform_title: parseJsonbArray(row.uniform_title ? row.uniform_title : null),
      proper_title: row.proper_title || null,
      title: row.title || null,
      subtitle: row.subtitle || null,
      issuing_body: row.issuing_body || null,
      subject_headings: subjectTerms.map((s) => titleCase(s.toLowerCase())),
      citation_info: [],
      word_count: row.word_count ?? null,
      similarity_to_previous: row.similarity_to_previous != null ? parseFloat(row.similarity_to_previous) : null,
      previous_symbol: row.previous_symbol ?? null,
      has_within_existing_resources: row.has_within_existing_resources ?? null,
      is_recurring_series: row.is_recurring_series ?? null,
      series_symbol_count: row.series_symbol_count ?? null,
      series_first_year: row.series_first_year ?? null,
      series_last_year: row.series_last_year ?? null,
      pdf_url: row.pdf_url ?? null,
    }
  })

  return { mandates, totalCount }
}

async function getDocumentCounts(
  filters: FilterOptions = {}
): Promise<{ totalDocuments: number; totalIssuingBodies: number; totalEntities: number; totalCitations: number }> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    SELECT
      COUNT(DISTINCT d.symbol) as total_documents,
      COUNT(DISTINCT d.issuing_body) FILTER (WHERE d.issuing_body IS NOT NULL) as total_issuing_bodies,
      COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as total_entities,
      COUNT(c.id) as total_citations
    FROM public.documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.symbol = c.ppb_full_document_symbol
    ${whereClause}
  `

  const row = await queryOne<CountsRow>(sql, params)

  return {
    totalDocuments: parseInt(row?.total_documents ?? '0'),
    totalIssuingBodies: parseInt(row?.total_issuing_bodies ?? '0'),
    totalEntities: parseInt(row?.total_entities ?? '0'),
    totalCitations: parseInt(row?.total_citations ?? '0'),
  }
}

async function getDocumentIssuingBodyCounts(
  filters: FilterOptions = {}
): Promise<OrganWithCount[]> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    SELECT
      d.issuing_body as short,
      COUNT(*) as count
    FROM public.documents d
    ${whereClause}
    GROUP BY d.issuing_body
    HAVING d.issuing_body IS NOT NULL AND d.issuing_body != ''
    ORDER BY count DESC
  `

  const rows = await queryMany<{ short: string; count: string }>(sql, params)

  return rows.map((row) => ({
    short: row.short,
    long: row.short, // No normalised long names for arbitrary issuing bodies
    count: parseInt(row.count) || 0,
  }))
}

async function getDocumentEntityCounts(
  filters: FilterOptions = {}
): Promise<EntityWithCount[]> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH filtered_docs AS (
      SELECT d.symbol
      FROM public.documents d
      ${whereClause}
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.symbol = c.ppb_full_document_symbol
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL AND c.entity != ''
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<{ entity: string; entity_long: string | null; count: string }>(sql, params)

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}

async function getDocumentSubjectOptions(
  filters: FilterOptions = {}
): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH filtered_docs AS (
      SELECT d.symbol, d.subject_terms
      FROM public.documents d
      ${whereClause}
    ),
    subjects AS (
      SELECT
        fd.symbol,
        LOWER(st.value::text) as subject
      FROM filtered_docs fd,
        jsonb_array_elements_text(fd.subject_terms) AS st(value)
      WHERE fd.subject_terms IS NOT NULL
    )
    SELECT
      subject as value,
      COUNT(DISTINCT symbol) as count
    FROM subjects
    WHERE subject IS NOT NULL AND subject != ''
    GROUP BY subject
    ORDER BY subject
    LIMIT 200
  `

  const rows = await queryMany<ValueCountRow>(sql, params)

  return rows.map((row) => ({
    value: titleCase(row.value),
    count: parseInt(row.count) || 0,
  }))
}

async function getDocumentTypeOptions(
  filters: FilterOptions = {}
): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    SELECT
      d.document_type as value,
      COUNT(*) as count
    FROM public.documents d
    ${whereClause}
    GROUP BY d.document_type
    HAVING d.document_type IS NOT NULL AND d.document_type != ''
    ORDER BY count DESC
  `

  const rows = await queryMany<ValueCountRow>(sql, params)

  return rows.map((row) => ({
    value: row.value,
    count: parseInt(row.count) || 0,
  }))
}

async function getDocumentYearStats(
  filters: FilterOptions = {}
): Promise<{
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}> {
  const { clauses, params } = buildDocumentFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    SELECT
      d.date_year as year,
      COUNT(*) as count
    FROM public.documents d
    ${whereClause}
    GROUP BY d.date_year
    HAVING d.date_year IS NOT NULL
    ORDER BY d.date_year
  `

  const rows = await queryMany<YearRow>(sql, params)

  if (rows.length === 0) {
    return {
      yearRange: { min: 1946, max: 2025 },
      yearDistribution: {},
    }
  }

  const years = rows.map((r) => r.year)
  const distribution: Record<string, number> = {}

  rows.forEach((row) => {
    distribution[row.year.toString()] = parseInt(row.count) || 0
  })

  return {
    yearRange: {
      min: Math.min(...years),
      max: Math.max(...years),
    },
    yearDistribution: distribution,
  }
}

// ============================================================================
// Orchestrator
// ============================================================================

async function _getDocumentPageDataInner(filters: FilterOptions): Promise<ApiResponse> {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '10', 10)

  const [
    documentsResult,
    counts,
    issuingBodyCounts,
    entityCounts,
    subjectOptions,
    documentTypeOptions,
    yearStats,
    entities,
    organMap,
  ] = await Promise.all([
    getDocuments(filters, { page, limit }),
    getDocumentCounts(filters),
    getDocumentIssuingBodyCounts(filters),
    getDocumentEntityCounts(filters),
    getDocumentSubjectOptions(filters),
    getDocumentTypeOptions(filters),
    getDocumentYearStats(filters),
    getAllEntities(),
    getOrganMap(),
  ])

  const { mandates, totalCount } = documentsResult

  // Enrich mandates with display title and organ long names
  const enrichedMandates = mandates.map((mandate) => ({
    ...mandate,
    displayTitle: getMandateDisplayTitle(mandate),
    body_long: organMap.get(mandate.body)?.long || mandate.issuing_body || mandate.body,
  }))

  const enrichedOrganCounts = issuingBodyCounts.map((organ) => ({
    ...organ,
    long: organMap.get(organ.short)?.long || organ.short,
  }))

  const totalPages = Math.ceil(totalCount / limit)

  return {
    mandates: enrichedMandates,
    pagination: {
      page,
      limit,
      totalPages,
      totalItems: totalCount,
    },
    counts: {
      totalDocuments: counts.totalDocuments,
      totalEntities: counts.totalEntities,
      totalOrgans: counts.totalIssuingBodies,
      totalCitations: counts.totalCitations,
    },
    mode: 'documents',
    sidebar: {
      entities: entityCounts,
      organs: enrichedOrganCounts,
      crossCitations: [],
    },
    filterOptions: {
      programmes: [], // Not available in All mode
      subjects: subjectOptions,
      yearRange: yearStats.yearRange,
      yearDistribution: yearStats.yearDistribution,
      budgetDocuments: [], // Not available in All mode
      documentTypes: documentTypeOptions,
    },
    reference: {
      entities,
      organs: [],
    },
  }
}

/**
 * Public API: fetch all data for the "All Documents" list page.
 * Two-layer caching (same pattern as getMandatePageData).
 */
export const getDocumentPageData = cache(
  (filters: FilterOptions): Promise<ApiResponse> =>
    unstable_cache(
      () => _getDocumentPageDataInner(filters),
      ['documents', JSON.stringify(filters)],
      { revalidate: 300 }
    )()
)

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a JSONB array (serialised as text) into a string array.
 * Handles: '["a","b"]', null, empty string.
 */
function parseJsonbArray(jsonText: string | null): string[] {
  if (!jsonText || jsonText.trim() === '') return []
  try {
    const parsed = JSON.parse(jsonText)
    if (Array.isArray(parsed)) return parsed.map(String)
    return []
  } catch {
    return []
  }
}
