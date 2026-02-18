/**
 * Mandate Database Queries
 *
 * Fetches mandate data from PostgreSQL, replacing the JSON file approach.
 * All operations are server-side only.
 */

import { cache } from 'react'
import { queryMany, queryOne } from './query'
import { titleCase } from 'title-case'
import { getMandateDisplayTitle } from '@/lib/utils'
import DataService from '@/lib/data-service'
import type { Mandate, FilterOptions, EntityWithCount, OrganWithCount, CrossCitation, ApiResponse } from '@/types'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse PostgreSQL array literal format: {"item1","item2","item3"}
 * Returns an array of strings
 */
function parsePostgresArray(pgArray: string | null): string[] {
  if (!pgArray || pgArray.trim() === '') return []
  
  // Remove outer braces
  const cleaned = pgArray.trim().replace(/^\{|\}$/g, '')
  if (cleaned === '') return []
  
  // Match all quoted strings
  const matches = cleaned.match(/"([^"]*)"/g)
  if (!matches) return []
  
  // Remove quotes and return
  return matches.map(match => match.slice(1, -1))
}

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

/** Row type for mandate list query results */
interface MandateListRow {
  ppb_full_document_symbol: string
  ppb_link: string | null
  ppb_year: number | null
  ppb_body: string | null
  ppb_description: string | null
  ppb_type: string | null
  num_entities: string
  num_citations: string
  entities: string[] | null
  total_count: string
  document_symbol: string | null
  uniform_title: string | null
  proper_title: string | null
  title: string | null
  subtitle: string | null
  subject_terms: string | null
}

/** Row type for citation query results */
interface CitationQueryRow {
  origin_document: string | null
  budget_part: string | null
  section: string | null
  section_title: string | null
  entity: string | null
  programme: number | null
  programme_title: string | null
  sub_programme: string | null
  component: string | null
  part_in_document: string | null
  entity_long: string | null
}

/** SQL parameter value types */
type SqlParam = string | number | boolean | null

/** Row type for counts query */
interface CountsRow {
  total_documents: string
  total_entities: string
  total_organs: string
  total_citations: string
}

/** Row type for entity/organ counts */
interface EntityCountRow {
  entity: string
  entity_long: string | null
  count: string
}

interface OrganCountRow {
  short: string
  count: string
}

/** Row type for value/count pairs */
interface ValueCountRow {
  value: string
  count: string
}

/** Row type for year stats */
interface YearRow {
  year: number
  count: string
}

// ============================================================================
// Core Mandate Queries
// ============================================================================

/**
 * Build WHERE clauses and parameters from filter options
 */
function buildFilterClauses(
  filters: FilterOptions,
  paramOffset = 0
): { clauses: string[]; params: SqlParam[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let paramIndex = paramOffset + 1

  // Entity filter - document must have a citation by this entity
  if (filters.entity) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c2
        WHERE c2.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND c2.entity = $${paramIndex}
      )
    `)
    params.push(filters.entity)
    paramIndex++
  }

  // Cross-citing entity filter
  if (filters.crossCitingEntity) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c3
        WHERE c3.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND c3.entity = $${paramIndex}
      )
    `)
    params.push(filters.crossCitingEntity)
    paramIndex++
  }

  // Organ filter
  if (filters.organ) {
    clauses.push(`d.ppb_body = $${paramIndex}`)
    params.push(filters.organ)
    paramIndex++
  }

  // Year range filters
  if (filters.start_year) {
    clauses.push(`d.ppb_year >= $${paramIndex}`)
    params.push(parseInt(filters.start_year))
    paramIndex++
  }
  if (filters.end_year) {
    clauses.push(`d.ppb_year <= $${paramIndex}`)
    params.push(parseInt(filters.end_year))
    paramIndex++
  }

  // Programme filter
  if (filters.programme) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c4
        WHERE c4.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND LOWER(c4.programme_title) LIKE $${paramIndex}
      )
    `)
    params.push(`%${filters.programme.toLowerCase()}%`)
    paramIndex++
  }

  // Subject filter (searches in metadata subject_terms)
  if (filters.subject) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_documents_metadata_clean m2
        WHERE m2.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND LOWER(m2.subject_terms::text) LIKE $${paramIndex}
      )
    `)
    params.push(`%${filters.subject.toLowerCase()}%`)
    paramIndex++
  }

  // Budget document filter
  if (filters.budget_document) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c5
        WHERE c5.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND c5.origin_document LIKE $${paramIndex}
      )
    `)
    params.push(`%${filters.budget_document}%`)
    paramIndex++
  }

  // Keyword search
  if (filters.keyword) {
    const keyword = `%${filters.keyword.toLowerCase()}%`
    clauses.push(`(
      LOWER(d.ppb_full_document_symbol) LIKE $${paramIndex}
      OR LOWER(d.ppb_description) LIKE $${paramIndex}
      OR EXISTS (
        SELECT 1 FROM ppb2026.source_documents_metadata_clean m3
        WHERE m3.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND (
          LOWER(m3.uniform_title) LIKE $${paramIndex}
          OR LOWER(m3.title) LIKE $${paramIndex}
          OR LOWER(m3.subject_terms::text) LIKE $${paramIndex}
        )
      )
    )`)
    params.push(keyword)
    paramIndex++
  }

  // Exact document symbol match
  if (filters.full_document_symbol) {
    clauses.push(`d.ppb_full_document_symbol = $${paramIndex}`)
    params.push(filters.full_document_symbol)
    paramIndex++
  }

  return { clauses, params }
}

/**
 * Build ORDER BY clause from sort option
 */
function buildOrderByClause(sortBy?: string): string {
  switch (sortBy) {
    case 'citing_entities_desc':
      return 'ORDER BY num_entities DESC, num_citations DESC'
    case 'citing_entities_asc':
      return 'ORDER BY num_entities ASC, num_citations ASC'
    case 'citations_desc':
      return 'ORDER BY num_citations DESC, num_entities DESC'
    case 'citations_asc':
      return 'ORDER BY CASE WHEN num_entities = 0 THEN 0 ELSE num_citations END ASC'
    case 'year_desc':
      return 'ORDER BY d.ppb_year DESC NULLS LAST'
    case 'year_asc':
      return 'ORDER BY d.ppb_year ASC NULLS LAST'
    default:
      return 'ORDER BY num_entities DESC, num_citations DESC'
  }
}

/**
 * Fetch mandates with filters, sorting, and pagination
 * Returns mandates with aggregated citation counts and entity arrays
 */
export async function getMandates(
  filters: FilterOptions = {},
  options: { page?: number; limit?: number } = {}
): Promise<{ mandates: Mandate[]; totalCount: number }> {
  const page = options.page ?? 1
  const limit = options.limit ?? 10
  const offset = (page - 1) * limit

  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = buildOrderByClause(filters.sort_by)

  // Main query with aggregations
  const query = `
    WITH filtered_docs AS (
      SELECT
        d.ppb_full_document_symbol,
        d.ppb_link,
        d.ppb_year,
        d.ppb_body,
        d.ppb_description,
        d.ppb_type,
        COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as num_entities,
        COUNT(c.id) as num_citations,
        ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities
      FROM ppb2026.source_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body, d.ppb_description, d.ppb_type
    ),
    counted AS (
      SELECT *, COUNT(*) OVER() as total_count
      FROM filtered_docs
    )
    SELECT
      c.*,
      m.symbol as document_symbol,
      m.uniform_title,
      m.proper_title,
      m.title,
      m.subtitle,
      m.subject_terms,
      m.date_year,
      m.document_type,
      m.issuing_body
    FROM counted c
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON c.ppb_full_document_symbol = m.ppb_full_document_symbol
    ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `

  const rows = await queryMany<MandateListRow>(query, [...params, limit, offset])

  if (rows.length === 0) {
    return { mandates: [], totalCount: 0 }
  }

  const totalCount = parseInt(rows[0]?.total_count ?? '0')

  // Transform DB rows to Mandate type
  const mandates: Mandate[] = rows.map((row) => ({
    full_document_symbol: row.ppb_full_document_symbol,
    document_symbol: row.document_symbol || null,
    num_citations: parseInt(row.num_citations) || 0,
    num_entities: parseInt(row.num_entities) || 0,
    entities: row.entities || [],
    link: row.ppb_link || null,
    year: row.ppb_year?.toString() || '',
    body: row.ppb_body || '',
    description: row.ppb_description || null,
    type: row.ppb_type || 'Unknown',
    // Metadata fields
    uniform_title: row.uniform_title ? [row.uniform_title] : null,
    proper_title: row.proper_title || null,
    title: row.title || null,
    subtitle: row.subtitle || null,
    subject_headings: parsePostgresArray(row.subject_terms)
      .map(s => titleCase(s.toLowerCase())),
    symbol_prefix: null,
    symbol_number: null,
    // Empty citation_info - will be loaded separately if needed
    citation_info: [],
  }))

  return { mandates, totalCount }
}

/**
 * Fetch detailed citation info for a specific mandate
 * Used for enriching individual mandates on detail pages
 */
export async function getMandateCitations(symbol: string): Promise<Mandate['citation_info']> {
  const query = `
    SELECT
      c.origin_document,
      c.budget_part,
      c.section,
      c.section_title,
      c.entity,
      c.programme,
      c.programme_title,
      c.sub_programme,
      c.component,
      c.part_in_document,
      e.entity_long
    FROM ppb2026.source_document_citations c
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.ppb_full_document_symbol = $1
    ORDER BY c.entity, c.programme
  `

  const rows = await queryMany<CitationQueryRow>(query, [symbol])

  return rows.map((row) => ({
    origin_document: row.origin_document || '',
    budget_part: row.budget_part || '',
    section: row.section || '',
    section_title: row.section_title || '',
    entity_long: row.entity_long || row.entity || '',
    entity: row.entity || '',
    programme: row.programme,
    programme_title: row.programme_title || '',
    'sub-programme': row.sub_programme || null,
    component: row.component || null,
    description: '', // Not stored in citations table
    part_in_document: row.part_in_document || '',
  }))
}

/**
 * Fetch a single mandate by symbol with full details
 */
export async function getMandateBySymbol(symbol: string): Promise<Mandate | null> {
  const query = `
    SELECT
      d.ppb_full_document_symbol,
      d.ppb_link,
      d.ppb_year,
      d.ppb_body,
      d.ppb_description,
      d.ppb_type,
      COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as num_entities,
      COUNT(c.id) as num_citations,
      ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities,
      m.symbol as document_symbol,
      m.uniform_title,
      m.proper_title,
      m.title,
      m.subtitle,
      m.subject_terms
    FROM ppb2026.source_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON d.ppb_full_document_symbol = m.ppb_full_document_symbol
    WHERE d.ppb_full_document_symbol = $1
    GROUP BY
      d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body,
      d.ppb_description, d.ppb_type, m.symbol, m.uniform_title,
      m.proper_title, m.title, m.subtitle, m.subject_terms
  `

  const row = await queryOne<MandateListRow>(query, [symbol])
  if (!row) return null

  // Fetch citations separately for the detail view
  const citations = await getMandateCitations(symbol)

  return {
    full_document_symbol: row.ppb_full_document_symbol,
    document_symbol: row.document_symbol || null,
    num_citations: parseInt(row.num_citations) || 0,
    num_entities: parseInt(row.num_entities) || 0,
    entities: row.entities || [],
    link: row.ppb_link || null,
    year: row.ppb_year?.toString() || '',
    body: row.ppb_body || '',
    description: row.ppb_description || null,
    type: row.ppb_type || 'Unknown',
    uniform_title: row.uniform_title ? [row.uniform_title] : null,
    proper_title: row.proper_title || null,
    title: row.title || null,
    subtitle: row.subtitle || null,
    subject_headings: parsePostgresArray(row.subject_terms)
      .map(s => titleCase(s.toLowerCase())),
    symbol_prefix: null,
    symbol_number: null,
    citation_info: citations,
  }
}

// ============================================================================
// Aggregation Queries (for sidebar and counts)
// ============================================================================

/**
 * Get total counts for the data cards
 */
export async function getMandateCounts(filters: FilterOptions = {}): Promise<{
  totalDocuments: number
  totalEntities: number
  totalOrgans: number
  totalCitations: number
}> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    SELECT
      COUNT(DISTINCT d.ppb_full_document_symbol) as total_documents,
      COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as total_entities,
      COUNT(DISTINCT d.ppb_body) FILTER (WHERE d.ppb_body IS NOT NULL) as total_organs,
      COUNT(c.id) as total_citations
    FROM ppb2026.source_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    ${whereClause}
  `

  const row = await queryOne<CountsRow>(query, params)

  return {
    totalDocuments: parseInt(row?.total_documents ?? '0'),
    totalEntities: parseInt(row?.total_entities ?? '0'),
    totalOrgans: parseInt(row?.total_organs ?? '0'),
    totalCitations: parseInt(row?.total_citations ?? '0'),
  }
}

/**
 * Get entity counts for the sidebar
 */
export async function getEntityCounts(filters: FilterOptions = {}): Promise<EntityWithCount[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT DISTINCT d.ppb_full_document_symbol
      FROM ppb2026.source_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL AND c.entity != ''
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<EntityCountRow>(query, params)

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}

/**
 * Get organ counts for the sidebar
 */
export async function getOrganCounts(filters: FilterOptions = {}): Promise<OrganWithCount[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    SELECT
      d.ppb_body as short,
      COUNT(DISTINCT d.ppb_full_document_symbol) as count
    FROM ppb2026.source_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    ${whereClause}
    GROUP BY d.ppb_body
    HAVING d.ppb_body IS NOT NULL AND d.ppb_body != ''
    ORDER BY count DESC
  `

  const rows = await queryMany<OrganCountRow>(query, params)

  // Organ long names need to come from the JSON file (keeping organs in JSON as decided)
  return rows.map((row) => ({
    short: row.short,
    long: row.short, // Will be enriched with organ data later
    count: parseInt(row.count) || 0,
  }))
}

/**
 * Get cross-citations for entity pages
 */
export async function getCrossCitations(entityCode: string): Promise<CrossCitation[]> {
  const query = `
    WITH entity_docs AS (
      -- Get all documents cited by this entity
      SELECT DISTINCT ppb_full_document_symbol
      FROM ppb2026.source_document_citations
      WHERE entity = $1
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM entity_docs ed
    JOIN ppb2026.source_document_citations c
      ON ed.ppb_full_document_symbol = c.ppb_full_document_symbol
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL
      AND c.entity != ''
      AND c.entity != $1
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<EntityCountRow>(query, [entityCode])

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}

// ============================================================================
// Filter Options Queries
// ============================================================================

/**
 * Get programme options with counts
 */
export async function getProgrammeOptions(filters: FilterOptions = {}): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT DISTINCT d.ppb_full_document_symbol
      FROM ppb2026.source_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
    )
    SELECT
      c.programme_title as value,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
    WHERE c.programme_title IS NOT NULL AND c.programme_title != ''
    GROUP BY c.programme_title
    ORDER BY c.programme_title
  `

  const rows = await queryMany<ValueCountRow>(query, params)

  return rows.map((row) => ({
    value: row.value,
    count: parseInt(row.count) || 0,
  }))
}

/**
 * Get subject options with counts
 */
export async function getSubjectOptions(filters: FilterOptions = {}): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT DISTINCT d.ppb_full_document_symbol
      FROM ppb2026.source_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
    ),
    subjects AS (
      SELECT
        fd.ppb_full_document_symbol,
        LOWER(UNNEST(m.subject_terms::text[])) as subject
      FROM filtered_docs fd
      JOIN ppb2026.source_documents_metadata_clean m
        ON fd.ppb_full_document_symbol = m.ppb_full_document_symbol
      WHERE m.subject_terms IS NOT NULL AND m.subject_terms != ''
    )
    SELECT
      subject as value,
      COUNT(DISTINCT ppb_full_document_symbol) as count
    FROM subjects
    WHERE subject IS NOT NULL AND subject != ''
    GROUP BY subject
    ORDER BY subject
  `

  const rows = await queryMany<ValueCountRow>(query, params)

  // Normalize subjects to title case for consistent display
  return rows.map((row) => ({
    value: titleCase(row.value),
    count: parseInt(row.count) || 0,
  }))
}

/**
 * Get year range and distribution
 */
export async function getYearStats(filters: FilterOptions = {}): Promise<{
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const query = `
    SELECT
      d.ppb_year as year,
      COUNT(DISTINCT d.ppb_full_document_symbol) as count
    FROM ppb2026.source_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    ${whereClause}
    GROUP BY d.ppb_year
    HAVING d.ppb_year IS NOT NULL
    ORDER BY d.ppb_year
  `

  const rows = await queryMany<YearRow>(query, params)

  if (rows.length === 0) {
    return {
      yearRange: { min: 2000, max: 2024 },
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
// Page Data Orchestration
// ============================================================================

/**
 * Fetch and assemble all data needed for mandate list pages.
 * Cached per request to avoid duplicate DB calls within the same render.
 */
export const getMandatePageData = cache(async (filters: FilterOptions): Promise<ApiResponse> => {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '10', 10)

  const [
    mandatesResult,
    counts,
    entityCounts,
    organCounts,
    programmeOptions,
    subjectOptions,
    yearStats,
    referenceData,
  ] = await Promise.all([
    getMandates(filters, { page, limit }),
    getMandateCounts(filters),
    getEntityCounts(filters),
    getOrganCounts(filters),
    getProgrammeOptions(filters),
    getSubjectOptions(filters),
    getYearStats(filters),
    DataService.getReferenceData(),
  ])

  const { mandates, totalCount } = mandatesResult
  const { organMap, entities, organs } = referenceData

  let crossCitations: ApiResponse['sidebar']['crossCitations'] = []
  if (filters.entity) {
    crossCitations = await getCrossCitations(filters.entity)
  }

  const enrichedMandates = mandates.map((mandate) => ({
    ...mandate,
    displayTitle: getMandateDisplayTitle(mandate),
    body_long: organMap.get(mandate.body)?.long || mandate.body,
  }))

  const enrichedOrganCounts = organCounts.map((organ) => ({
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
      totalOrgans: counts.totalOrgans,
      totalCitations: counts.totalCitations,
    },
    sidebar: {
      entities: entityCounts,
      organs: enrichedOrganCounts,
      crossCitations,
    },
    filterOptions: {
      programmes: programmeOptions,
      subjects: subjectOptions,
      yearRange: yearStats.yearRange,
      yearDistribution: yearStats.yearDistribution,
    },
    reference: {
      entities,
      organs,
    },
  }
})
