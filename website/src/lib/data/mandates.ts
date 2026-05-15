/**
 * Mandate Database Queries
 *
 * Fetches mandate data from PostgreSQL, replacing the JSON file approach.
 * All operations are server-side only.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany, queryOne } from '../db/query'
import { titleCase } from 'title-case'
import { getMandateDisplayTitle, safeHighlightSearchTerms } from '@/lib/utils'
import { getAllEntities } from './entities'
import { getAllOrgans, getOrganMap } from './organs'
import { getBudgetDocuments } from './budget-documents'
import type { Mandate, FilterOptions, EntityWithCount, OrganWithCount, CrossCitation, CitationBin, ApiResponse } from '@/types'

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
  
  // Parse CSV respecting quoted strings
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) result.push(current.trim())
  return result
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
  programmes: string[] | null
  origin_documents: string[] | null
  total_count: string
  document_symbol: string | null
  uniform_title: string | null
  proper_title: string | null
  title: string | null
  subtitle: string | null
  subject_terms: string | null
  issuing_body: string | null
  agenda_document_symbol: string | null
  agenda_item_number: string | null
  agenda_item_title: string | null
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
): { clauses: string[]; params: SqlParam[]; havingClauses: string[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let paramIndex = paramOffset + 1

  // Version scoping: every citation-based filter must match citations that
  // originate from the selected PPB version, otherwise filters like `entity`
  // leak citations from other versions (e.g. PPB 2026 DCO rows showing up
  // under ppb_version=ppb2027). `versionClause(alias)` returns the SQL
  // predicate to AND into any citation subquery / join, reusing a single
  // bound pattern param across all call sites.
  let versionClause: (alias: string) => string = () => 'TRUE'
  if (filters.mode !== 'all_resolutions') {
    const version = filters.ppb_version || 'ppb2026'
    if (version === 'ppb2026') {
      versionClause = (a) =>
        `(${a}.origin_document ~ '^PPB 2026$' OR ${a}.origin_document ~ '^PKM 25/26')`
    } else {
      const pattern = version === 'ppb2027' ? '^PPB 2027$' : `^${version}$`
      params.push(pattern)
      const patternIdx = paramIndex
      paramIndex++
      versionClause = (a) => `${a}.origin_document ~ $${patternIdx}`
    }

    // Mode membership: the document must be cited in the selected version.
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c_ppb
        WHERE c_ppb.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND ${versionClause('c_ppb')}
      )
    `)
  }

  // Entity filter - document must have a citation by this entity
  if (filters.entity) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c2
        WHERE c2.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND c2.entity = $${paramIndex}
        AND ${versionClause('c2')}
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
        AND ${versionClause('c3')}
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
        AND ${versionClause('c4')}
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

  // Budget document filter — match against the regex stored in ppb2026.budget_documents
  if (filters.budget_document) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c5
        WHERE c5.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND c5.origin_document ~ (
          SELECT match_pattern FROM ppb2026.budget_documents WHERE slug = $${paramIndex}
        )
        AND ${versionClause('c5')}
      )
    `)
    params.push(filters.budget_document)
    paramIndex++
  }

  // Document type filter — uses ppb_type from source_documents (well-populated)
  if (filters.document_type) {
    clauses.push(`LOWER(d.ppb_type) = LOWER($${paramIndex})`)
    params.push(filters.document_type)
    paramIndex++
  }

  // Agenda item filter — agenda_item_title is a text[] array column
  if (filters.agenda_item) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_documents_metadata_clean m7
        WHERE m7.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND EXISTS (
          SELECT 1 FROM UNNEST(m7.agenda_item_title::text[]) t
          WHERE LOWER(t) LIKE $${paramIndex}
        )
      )
    `)
    params.push(`%${filters.agenda_item.toLowerCase()}%`)
    paramIndex++
  }

  // Keyword search — only fields shown on the card:
  //   ppb_full_document_symbol  (symbol badge)
  //   ppb_description           (title fallback)
  //   proper_title              (primary display title)
  //   title                     (display title for Security Council docs)
  //   subject_terms             (subject heading badges)
  if (filters.keyword) {
    const keyword = `%${filters.keyword.toLowerCase()}%`
    clauses.push(`(
      LOWER(d.ppb_full_document_symbol) LIKE $${paramIndex}
      OR LOWER(d.ppb_description) LIKE $${paramIndex}
      OR EXISTS (
        SELECT 1 FROM ppb2026.source_documents_metadata_clean m3
        WHERE m3.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND (
          LOWER(m3.proper_title) LIKE $${paramIndex}
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

  // Citation count filters (applied as HAVING after GROUP BY)
  const havingClauses: string[] = []
  const havingParams: SqlParam[] = []
  if (filters.min_citations) {
    havingClauses.push(`COUNT(c.id) >= $${paramIndex}`)
    havingParams.push(parseInt(filters.min_citations))
    paramIndex++
  }
  if (filters.max_citations) {
    havingClauses.push(`COUNT(c.id) <= $${paramIndex}`)
    havingParams.push(parseInt(filters.max_citations))
    paramIndex++
  }

  return { clauses, params: [...params, ...havingParams], havingClauses }
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
      return 'ORDER BY COALESCE(m.date_year, c.ppb_year) DESC NULLS LAST'
    case 'year_asc':
      return 'ORDER BY COALESCE(m.date_year, c.ppb_year) ASC NULLS LAST'
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

  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  // Keyword rank params — pushed after filter params so indexes are stable
  // Ranks: 0=exact symbol, 1=symbol prefix, 2=title/description match, 3=subject-only
  let keywordRankExpr = ''
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    const exactIdx = params.length + 1
    const prefixIdx = params.length + 2
    const containsIdx = params.length + 3
    params.push(kw)
    params.push(`${kw}%`)
    params.push(`%${kw}%`)
    keywordRankExpr = `,
      CASE
        WHEN LOWER(c.ppb_full_document_symbol) = $${exactIdx} THEN 0
        WHEN LOWER(c.ppb_full_document_symbol) LIKE $${prefixIdx} THEN 1
        WHEN (
          LOWER(COALESCE(m.proper_title, '')) LIKE $${containsIdx}
          OR LOWER(COALESCE(m.title, '')) LIKE $${containsIdx}
          OR LOWER(COALESCE(c.ppb_description, '')) LIKE $${containsIdx}
        ) THEN 2
        ELSE 3
      END AS keyword_rank`
  }

  // Default sort: year_desc for all_resolutions (most docs have 0 citations),
  // citing_entities_desc for active_mandates
  const effectiveSortBy = filters.sort_by
    || (filters.mode === 'all_resolutions' ? 'year_desc' : 'citing_entities_desc')

  // When keyword is active with no explicit sort, rank by relevance only.
  // When an explicit sort_by is chosen, use relevance as primary then the chosen sort.
  const orderBy = filters.keyword
    ? filters.sort_by
      ? `ORDER BY keyword_rank ASC, ${buildOrderByClause(filters.sort_by).replace('ORDER BY ', '')}`
      : 'ORDER BY keyword_rank ASC'
    : buildOrderByClause(effectiveSortBy)

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
        ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities,
        ARRAY_AGG(DISTINCT c.programme_title) FILTER (WHERE c.programme_title IS NOT NULL AND c.programme_title != '') as programmes,
        ARRAY_AGG(DISTINCT c.origin_document) FILTER (WHERE c.origin_document IS NOT NULL) as origin_documents
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body, d.ppb_description, d.ppb_type
      ${havingClause}
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
      m.issuing_body,
      m.agenda_item_title
      ${keywordRankExpr}
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
    issuing_body: row.issuing_body || null,
    programme: (row.programmes && row.programmes.length > 0) ? row.programmes.join(', ') : undefined,
    agenda_document_symbols: [],
    agenda_item_numbers: [],
    agenda_item_titles: parsePostgresArray(row.agenda_item_title),
    citation_info: (row.origin_documents || []).map((od: string) => ({
      origin_document: od,
      budget_part: '',
      section: '',
      section_title: '',
      entity: '',
      entity_long: '',
      programme: null,
      programme_title: '',
      'sub-programme': null,
      component: '',
      description: '',
      part_in_document: '',
    })),
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
      m.subject_terms,
      m.issuing_body,
      m.agenda_document_symbol,
      m.agenda_item_number,
      m.agenda_item_title
    FROM public.unified_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON d.ppb_full_document_symbol = m.ppb_full_document_symbol
    WHERE d.ppb_full_document_symbol = $1
    GROUP BY
      d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body,
      d.ppb_description, d.ppb_type, m.symbol, m.uniform_title,
      m.proper_title, m.title, m.subtitle, m.subject_terms, m.issuing_body,
      m.agenda_document_symbol, m.agenda_item_number, m.agenda_item_title
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
    issuing_body: row.issuing_body || null,
    agenda_document_symbols: parsePostgresArray(row.agenda_document_symbol),
    agenda_item_numbers: parsePostgresArray(row.agenda_item_number),
    agenda_item_titles: parsePostgresArray(row.agenda_item_title),
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT
        d.ppb_full_document_symbol,
        d.ppb_body,
        COUNT(c.id) as citation_count,
        COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entity_count
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol, d.ppb_body
      ${havingClause}
    )
    SELECT
      COUNT(*) as total_documents,
      COUNT(DISTINCT ppb_body) FILTER (WHERE ppb_body IS NOT NULL) as total_organs,
      SUM(citation_count) as total_citations,
      (SELECT COUNT(DISTINCT c.entity) FROM filtered_docs fd2
       JOIN ppb2026.source_document_citations c
         ON fd2.ppb_full_document_symbol = c.ppb_full_document_symbol
       WHERE c.entity IS NOT NULL) as total_entities
    FROM filtered_docs
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol
      ${havingClause}
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const allHaving = ['d.ppb_body IS NOT NULL', "d.ppb_body != ''", ...havingClauses]
  const havingClause = `HAVING ${allHaving.join(' AND ')}`

  const query = `
    SELECT
      d.ppb_body as short,
      COUNT(DISTINCT d.ppb_full_document_symbol) as count
    FROM public.unified_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
    ${whereClause}
    GROUP BY d.ppb_body
    ${havingClause}
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol
      ${havingClause}
    )
    SELECT
      c.programme_title as value,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
    WHERE c.programme_title IS NOT NULL AND c.programme_title != ''
    GROUP BY c.programme_title
    ORDER BY count DESC, c.programme_title
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol
      ${havingClause}
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
    ORDER BY count DESC, subject
  `

  const rows = await queryMany<ValueCountRow>(query, params)

  // Normalize to title case then deduplicate (different raw strings can produce the same display value)
  const merged = new Map<string, number>()
  for (const row of rows) {
    const key = titleCase(row.value.trim())
    merged.set(key, (merged.get(key) ?? 0) + (parseInt(row.count) || 0))
  }
  return Array.from(merged.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/**
 * Get document type options from ppb_type (well-populated field on source_documents)
 */
export async function getDocumentTypeOptions(filters: FilterOptions = {}): Promise<{ value: string; count: number }[]> {
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol, d.ppb_type
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol, d.ppb_type
      ${havingClause}
    )
    SELECT
      ppb_type as value,
      COUNT(DISTINCT ppb_full_document_symbol) as count
    FROM filtered_docs
    WHERE ppb_type IS NOT NULL AND ppb_type != ''
    GROUP BY ppb_type
    ORDER BY count DESC, ppb_type
  `

  const rows = await queryMany<ValueCountRow>(query, params)

  return rows.map((row) => ({
    value: row.value,
    count: parseInt(row.count) || 0,
  }))
}

/**
 * Get agenda item options — parallel UNNEST of number + title arrays
 */
export async function getAgendaItemOptions(filters: FilterOptions = {}): Promise<{ value: string; count: number }[]> {
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol
      ${havingClause}
    ),
    agenda_items AS (
      SELECT
        fd.ppb_full_document_symbol,
        UNNEST(m.agenda_item_title::text[]) as item
      FROM filtered_docs fd
      JOIN ppb2026.source_documents_metadata_clean m
        ON fd.ppb_full_document_symbol = m.ppb_full_document_symbol
      WHERE m.agenda_item_title IS NOT NULL
    )
    SELECT
      item as value,
      COUNT(DISTINCT ppb_full_document_symbol) as count
    FROM agenda_items
    WHERE item IS NOT NULL AND item != ''
    GROUP BY item
    ORDER BY count DESC, item
  `

  const rows = await queryMany<ValueCountRow>(query, params)

  return rows.map((row) => ({
    value: row.value,
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
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH filtered_docs AS (
      SELECT d.ppb_full_document_symbol, d.ppb_year
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol, d.ppb_year
      ${havingClause}
    )
    SELECT
      ppb_year as year,
      COUNT(DISTINCT ppb_full_document_symbol) as count
    FROM filtered_docs
    WHERE ppb_year IS NOT NULL
    GROUP BY ppb_year
    ORDER BY ppb_year
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

/**
 * Get citation count distribution for histogram
 */
export async function getCitationDistribution(filters: FilterOptions = {}): Promise<CitationBin[]> {
  const { clauses, params, havingClauses } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  const query = `
    WITH doc_citations AS (
      SELECT d.ppb_full_document_symbol, COUNT(c.id) as citation_count
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      ${whereClause}
      GROUP BY d.ppb_full_document_symbol
      ${havingClause}
    ),
    binned AS (
      SELECT
        CASE
          WHEN citation_count = 1 THEN '1'
          WHEN citation_count BETWEEN 2 AND 5 THEN '2–5'
          WHEN citation_count BETWEEN 6 AND 10 THEN '6–10'
          ELSE '11+'
        END as bin,
        CASE
          WHEN citation_count = 1 THEN 1
          WHEN citation_count BETWEEN 2 AND 5 THEN 2
          WHEN citation_count BETWEEN 6 AND 10 THEN 3
          ELSE 4
        END as sort_order,
        CASE
          WHEN citation_count = 1 THEN 1
          WHEN citation_count BETWEEN 2 AND 5 THEN 2
          WHEN citation_count BETWEEN 6 AND 10 THEN 6
          ELSE 11
        END as min_citations,
        CASE
          WHEN citation_count = 1 THEN 1
          WHEN citation_count BETWEEN 2 AND 5 THEN 5
          WHEN citation_count BETWEEN 6 AND 10 THEN 10
          ELSE 999999
        END as max_citations
      FROM doc_citations
    )
    SELECT
      bin,
      COUNT(*) as count,
      MIN(min_citations) as min_citations,
      MIN(max_citations) as max_citations
    FROM binned
    GROUP BY bin, sort_order
    ORDER BY sort_order
  `

  const rows = await queryMany<{ bin: string; count: string; min_citations: string; max_citations: string }>(query, params)

  return rows.map((row) => ({
    bin: row.bin,
    count: parseInt(row.count) || 0,
    minCitations: parseInt(row.min_citations),
    maxCitations: parseInt(row.max_citations),
  }))
}

// ============================================================================
// Page Data Orchestration
// ============================================================================

/**
 * Inner implementation — runs DB queries and assembles the full ApiResponse.
 */
async function _getMandatePageDataInner(filters: FilterOptions): Promise<ApiResponse> {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '10', 10)

  const [
    mandatesResult,
    counts,
    entityCounts,
    organCounts,
    citationDistribution,
    programmeOptions,
    subjectOptions,
    documentTypeOptions,
    agendaItemOptions,
    yearStats,
    yearStatsForChart,
    entities,
    organs,
    organMap,
    budgetDocuments,
  ] = await Promise.all([
    getMandates(filters, { page, limit }),
    getMandateCounts(filters),
    getEntityCounts(filters),
    getOrganCounts(filters),
    getCitationDistribution(filters),
    getProgrammeOptions(filters),
    getSubjectOptions(filters),
    getDocumentTypeOptions(filters),
    getAgendaItemOptions(filters),
    getYearStats(filters),
    getYearStats({ ...filters, start_year: undefined, end_year: undefined }),
    getAllEntities(),
    getAllOrgans(),
    getOrganMap(),
    getBudgetDocuments(),
  ])

  const { mandates, totalCount } = mandatesResult

  let crossCitations: ApiResponse['sidebar']['crossCitations'] = []
  if (filters.entity) {
    crossCitations = await getCrossCitations(filters.entity)
  }

  const enrichedMandates = mandates.map((mandate) => {
    const base = {
      ...mandate,
      displayTitle: getMandateDisplayTitle(mandate),
      body_long: organMap.get(mandate.body)?.long || mandate.body,
    }

    if (!filters.keyword) return base

    const kw = filters.keyword
    const highlightedFields: Record<string, string> = {}
    const matchedFields: Array<{ field: string; value: string }> = []

    const ht = safeHighlightSearchTerms(base.displayTitle, kw)
    if (ht && ht !== base.displayTitle) {
      highlightedFields.title = ht
      matchedFields.push({ field: 'title', value: base.displayTitle ?? '' })
    }

    const hs = safeHighlightSearchTerms(base.full_document_symbol, kw)
    if (hs && hs !== base.full_document_symbol) {
      highlightedFields.full_document_symbol = hs
      matchedFields.push({ field: 'symbol', value: base.full_document_symbol })
    }

    const matchedSubjects = base.subject_headings
      .map((s) => safeHighlightSearchTerms(s, kw) ?? s)
      .filter((s, i) => s !== base.subject_headings[i])
    if (matchedSubjects.length > 0) {
      highlightedFields.subject_headings = matchedSubjects.join(', ')
      matchedFields.push({ field: 'subject', value: matchedSubjects.join(', ') })
    }

    if (Object.keys(highlightedFields).length === 0) return base

    return { ...base, highlightedFields, match_details: matchedFields }
  })

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
      citationDistribution,
    },
    filterOptions: {
      programmes: programmeOptions,
      subjects: subjectOptions,
      documentTypes: documentTypeOptions,
      agendaItems: agendaItemOptions,
      yearRange: yearStats.yearRange,
      yearDistribution: yearStats.yearDistribution,
      yearDistributionUnfiltered: yearStatsForChart.yearDistribution,
      budgetDocuments,
    },
    reference: {
      entities,
      organs,
    },
  }
}

/**
 * Public API: fetch and assemble all data needed for mandate list pages.
 *
 * Two-layer caching:
 * 1. unstable_cache  — persists the result across requests for 5 min,
 *                      keyed by the serialised filters object.
 *                      Default params (homepage) always hits this cache
 *                      after the first request, avoiding redundant DB work.
 * 2. react.cache     — deduplicates within a single render tree in case
 *                      multiple Server Components call this with the same filters.
 */
export const getMandatePageData = cache(
  (filters: FilterOptions): Promise<ApiResponse> =>
    unstable_cache(
      () => _getMandatePageDataInner(filters),
      [JSON.stringify(filters)],
      { revalidate: 3600 } // 1 hour — data changes infrequently
    )()
)
