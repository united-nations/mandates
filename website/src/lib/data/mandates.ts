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
import { getBudgetVersions } from './budget-documents'
import { FOUNDATIONAL_PART_IN_DOCUMENT } from '@/lib/foundational'
import type { Mandate, FilterOptions, EntityWithCount, OrganWithCount, CrossCitation, CitationBin, ApiResponse, BudgetLocation, BudgetPartNode, BudgetSectionNode, BudgetEntityNode } from '@/types'

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
  foundational_entities: string[] | null
  programmes: string[] | null
  budget_locations: RawBudgetLocation[] | null
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
  budget_part_number: string | null
  part_title: string | null
  part_sort: number | null
  sub_programme_number: number | null
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
interface FilterClauses {
  clauses: string[]
  params: SqlParam[]
  havingClauses: string[]
  /**
   * Version-scoping predicate for a citation alias. AND this into *every*
   * join/subquery against ppb2026.source_document_citations so membership
   * AND displayed aggregates are scoped to the selected budget version.
   * Reuses the single bound ppb_version param (no extra params).
   */
  versionClause: (alias: string) => string
}

/**
 * SQL predicate: citation `<citationAlias>` belongs to the budget version
 * bound at `<versionParam>` (a `$n` placeholder). Falls back to
 * budget_versions.is_default when that param is NULL. Single source of truth
 * for version scoping — used by the list/facet path (via versionClause) and
 * the mandate detail / cross-citation queries, so they can never drift.
 */
function versionPredicateSql(citationAlias: string, versionParam: string): string {
  return `EXISTS (
      SELECT 1 FROM ppb2026.budget_documents bd
      JOIN ppb2026.budget_document_versions bdv ON bdv.doc_slug = bd.slug
      WHERE bdv.version_slug = COALESCE(
        ${versionParam},
        (SELECT slug FROM ppb2026.budget_versions WHERE is_default LIMIT 1)
      )
      AND ${citationAlias}.origin_document ~ bd.match_pattern
    )`
}

function buildFilterClauses(
  filters: FilterOptions,
  paramOffset = 0
): FilterClauses {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let paramIndex = paramOffset + 1

  // Version scoping: every citation-based filter must match citations that
  // originate from the selected budget version, otherwise filters like
  // `entity` leak citations from other versions (e.g. PPB 2026 DCO rows
  // showing up under ppb_version=ppb2027).
  //
  // A version is a data-driven grouping of budget documents
  // (ppb2026.budget_versions <- ppb2026.budget_documents.version_slug):
  //   ppb2026 = PPB 2026 + Peacekeeping 2025/26
  //   ppb2027 = PPB 2027 + Peacekeeping 2026/27
  // so a citation belongs to version V iff its origin_document matches the
  // match_pattern of any budget_document whose version_slug = V. The
  // selected slug is bound once and reused across every call site; an
  // unknown/absent slug falls back to the table's default version (no
  // regex is ever built from user input -> no ReDoS surface).
  let versionClause: (alias: string) => string = () => 'TRUE'
  if (filters.mode !== 'all_resolutions') {
    params.push(filters.ppb_version ?? null)
    const vIdx = paramIndex
    paramIndex++
    versionClause = (a) => versionPredicateSql(a, `$${vIdx}`)

    // Mode membership: the document must be cited in the selected version.
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c_ppb
        WHERE c_ppb.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND ${versionClause('c_ppb')}
      )
    `)
  } else {
    // All-resolutions mode: catalog scope is "anything matching one of the 8
    // symbol families (A/RES, A/DEC, S/RES, S/PRST, E/RES, E/DEC, A/HRC/RES,
    // A/HRC/PRST) ∪ anything cited in the latest budget version". The
    // 8-pattern definition lives in the matview (column is_catalog_pattern,
    // set in migration 020) so the regex stays in exactly one place; the
    // "latest version" predicate reuses versionPredicateSql.
    clauses.push(`
      (
        d.is_catalog_pattern
        OR EXISTS (
          SELECT 1 FROM ppb2026.source_document_citations c_latest
          WHERE c_latest.ppb_full_document_symbol = d.ppb_full_document_symbol
          AND ${versionPredicateSql('c_latest', 'NULL')}
        )
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

  // Programme filter. Superseded by the section filter — every section has
  // exactly one programme — but kept so existing ?programme= links keep working.
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

  // Budget hierarchy filters. Each level is an independent exact-match
  // predicate on the citations, so they compose: part IV + subprogramme 2
  // narrows to documents cited at both. Addendum suffixes ("3 (Add.2)") are
  // stripped so that filtering on section 3 also catches its addenda.
  const hierarchyLevels: {
    value: string | undefined
    column: (placeholder: string) => string
  }[] = [
    {
      value: filters.budget_part,
      column: (p) => `ch.budget_part_number = ${p}`,
    },
    {
      value: filters.section,
      column: (p) =>
        `regexp_replace(ch.section, '\\s*\\(Add\\..*\\)$', '') = ${p}`,
    },
    {
      value: filters.subprogramme,
      column: (p) => `ch.sub_programme = ${p}`,
    },
  ]
  for (const level of hierarchyLevels) {
    if (!level.value) continue
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations ch
        WHERE ch.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND ${level.column(`$${paramIndex}`)}
        AND ${versionClause('ch')}
      )
    `)
    params.push(level.value)
    paramIndex++
  }

  // Foundational filter: the document is cited in an entity's "Mandates and
  // background" narrative, not only in its Legislative mandates table.
  //
  // Being foundational is a property of the (document, entity) pair, so when an
  // entity is also selected the two compose into a single predicate — "cited by
  // DESA, foundationally" — rather than the weaker "foundational for somebody
  // and, separately, cited by DESA".
  if (filters.foundational === 'true') {
    const entityPredicate = filters.entity
      ? `AND cf.entity = $${paramIndex + 1}`
      : ''
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations cf
        WHERE cf.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND cf.part_in_document = $${paramIndex}
        ${entityPredicate}
        AND ${versionClause('cf')}
      )
    `)
    params.push(FOUNDATIONAL_PART_IN_DOCUMENT)
    paramIndex++
    if (filters.entity) {
      params.push(filters.entity)
      paramIndex++
    }
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

  return { clauses, params: [...params, ...havingParams], havingClauses, versionClause }
}

/**
 * Shared filtered-documents CTE used by every list/count/facet query.
 *
 * One source of truth for: membership (WHERE), version-scoped citation
 * aggregation (the LEFT JOIN is scoped via versionClause so num_citations /
 * entities / programmes / counts all reflect the selected version), and the
 * min/max_citations HAVING (now operates on the version-scoped count).
 *
 * Callers pass the projection (selectCols) and GROUP BY columns; everything
 * else is identical, so adding/fixing scoping happens in exactly one place.
 */
function buildFilteredDocsCTE(
  filters: FilterOptions,
  opts: { selectCols: string; groupCols: string; name?: string }
): { cte: string; params: SqlParam[]; versionClause: (alias: string) => string } {
  const { clauses, params, havingClauses, versionClause } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const havingClause =
    havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''

  // bp is joined by primary key purely so that selectCols can reach the part
  // title and sort order without every caller repeating the join.
  const cte = `${opts.name ?? 'filtered_docs'} AS (
      SELECT ${opts.selectCols}
      FROM public.unified_documents d
      LEFT JOIN ppb2026.source_document_citations c
        ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
        AND ${versionClause('c')}
      LEFT JOIN ppb2026.budget_parts bp
        ON bp.part_number = c.budget_part_number
      ${whereClause}
      GROUP BY ${opts.groupCols}
      ${havingClause}
    )`

  return { cte, params, versionClause }
}

/**
 * Faceted-search rule: a facet's own active value must NOT constrain its own
 * option list, otherwise picking value X collapses the facet to just X and the
 * user can never switch to a sibling. Returns filters with `key` cleared so
 * each facet builder computes its options against every *other* active filter.
 * (Generalises the prior ad-hoc year-range workaround in getMandatePageData.)
 */
function omitOwnDimension(
  filters: FilterOptions,
  key: keyof FilterOptions
): FilterOptions {
  if (filters[key] === undefined) return filters
  return { ...filters, [key]: undefined }
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

  const { cte, params } = buildFilteredDocsCTE(filters, {
    selectCols: `
        d.ppb_full_document_symbol,
        d.ppb_link,
        d.ppb_year,
        d.ppb_body,
        d.ppb_description,
        d.ppb_type,
        COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as num_entities,
        COUNT(c.id) as num_citations,
        ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities,
        -- Entities that cite this document in their "Mandates and background"
        -- narrative rather than only in their Legislative mandates table. This
        -- is a property of the (document, entity) pair, not of the document:
        -- a resolution can be constitutive for UNEP and routine for DESA.
        ARRAY_AGG(DISTINCT c.entity) FILTER (
          WHERE c.entity IS NOT NULL
          AND c.part_in_document = '${FOUNDATIONAL_PART_IN_DOCUMENT}'
        ) as foundational_entities,
        ARRAY_AGG(DISTINCT c.programme_title) FILTER (WHERE c.programme_title IS NOT NULL AND c.programme_title != '') as programmes,
        JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'part', c.budget_part_number,
          'part_title', bp.part_title,
          'section', c.section,
          'section_title', c.section_title,
          'programme', c.programme,
          'programme_title', c.programme_title,
          'entity', c.entity,
          'subprogramme', c.sub_programme,
          'subprogramme_number', c.sub_programme_number,
          'part_sort', bp.sort_order
        )) FILTER (WHERE c.budget_part_number IS NOT NULL) as budget_locations,
        ARRAY_AGG(DISTINCT c.origin_document) FILTER (WHERE c.origin_document IS NOT NULL) as origin_documents`,
    groupCols:
      'd.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body, d.ppb_description, d.ppb_type',
  })

  // Bind a value and return its 1-based placeholder index. Using the index
  // returned by the push itself (instead of params.length + N arithmetic)
  // means later params can be appended without silently corrupting earlier
  // placeholders.
  const bind = (value: SqlParam): number => params.push(value)

  // Keyword rank params. Ranks: 0=exact symbol, 1=symbol prefix,
  // 2=title/description match, 3=subject-only.
  let keywordRankExpr = ''
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    const exactIdx = bind(kw)
    const prefixIdx = bind(`${kw}%`)
    const containsIdx = bind(`%${kw}%`)
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

  // Main query with aggregations. filtered_docs (membership + version-scoped
  // citation aggregates) comes from the shared builder.
  const query = `
    WITH ${cte},
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
    LIMIT $${bind(limit)} OFFSET $${bind(offset)}
  `

  const rows = await queryMany<MandateListRow>(query, params)

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
    foundational_entities: row.foundational_entities || [],
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
    budget_locations: sortBudgetLocations(row.budget_locations),
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
 *
 * Returns both shapes over the same rows: `citation_info` (the long-standing
 * denormalized view) and `budget_locations` (the hierarchy, ordered down the
 * budget). Locations exist only for citations that sit inside the regular-budget
 * part structure, so PKM and Plan Outline citations appear in citation_info but
 * not in budget_locations.
 */
export async function getMandateCitations(
  symbol: string,
  version?: string | null
): Promise<{
  citations: Mandate['citation_info']
  budgetLocations: BudgetLocation[]
  foundationalEntities: string[]
}> {
  const query = `
    SELECT
      c.origin_document,
      c.budget_part,
      c.budget_part_number,
      bp.part_title,
      bp.sort_order AS part_sort,
      c.section,
      c.section_title,
      c.entity,
      c.programme,
      c.programme_title,
      c.sub_programme,
      c.sub_programme_number,
      c.component,
      c.part_in_document,
      e.entity_long
    FROM ppb2026.source_document_citations c
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    LEFT JOIN ppb2026.budget_parts bp ON bp.part_number = c.budget_part_number
    WHERE c.ppb_full_document_symbol = $1
      AND ${versionPredicateSql('c', '$2')}
    ORDER BY c.entity, c.programme
  `

  const rows = await queryMany<CitationQueryRow>(query, [symbol, version ?? null])

  const citations = rows.map((row) => ({
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

  // The same location can arrive twice — once from the entity's "Mandates and
  // background" narrative and once from its Legislative mandates table — so
  // dedupe on the location itself. (In PPB 2027 this accounts for every
  // duplicated citation: 131 of 131.)
  const seen = new Map<string, BudgetLocation & { part_sort: number }>()
  for (const row of rows) {
    if (row.budget_part_number === null) continue
    const location = {
      part: row.budget_part_number,
      part_title: row.part_title ?? '',
      part_sort: row.part_sort ?? 0,
      section: row.section ?? '',
      section_title: row.section_title ?? '',
      programme: row.programme,
      programme_title: row.programme_title,
      entity: row.entity,
      entity_long: row.entity_long,
      subprogramme: row.sub_programme,
      subprogramme_number: row.sub_programme_number,
    }
    const key = [
      location.part,
      location.section,
      location.entity,
      location.subprogramme,
    ].join('\u0000')
    if (!seen.has(key)) seen.set(key, location)
  }

  const foundationalEntities = [
    ...new Set(
      rows
        .filter(
          (row) =>
            row.entity !== null &&
            row.part_in_document === FOUNDATIONAL_PART_IN_DOCUMENT
        )
        .map((row) => row.entity as string)
    ),
  ]

  return {
    citations,
    budgetLocations: sortBudgetLocations([...seen.values()]),
    foundationalEntities,
  }
}

/**
 * Fetch a single mandate by symbol with full details
 */
export async function getMandateBySymbol(
  symbol: string,
  version?: string | null
): Promise<Mandate | null> {
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
      AND ${versionPredicateSql('c', '$2')}
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON d.ppb_full_document_symbol = m.ppb_full_document_symbol
    WHERE d.ppb_full_document_symbol = $1
    GROUP BY
      d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body,
      d.ppb_description, d.ppb_type, m.symbol, m.uniform_title,
      m.proper_title, m.title, m.subtitle, m.subject_terms, m.issuing_body,
      m.agenda_document_symbol, m.agenda_item_number, m.agenda_item_title
  `

  const row = await queryOne<MandateListRow>(query, [symbol, version ?? null])
  if (!row) return null

  // Fetch citations separately for the detail view
  const { citations, budgetLocations, foundationalEntities } =
    await getMandateCitations(symbol, version)

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
    budget_locations: budgetLocations,
    foundational_entities: foundationalEntities,
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
  const { cte, params } = buildFilteredDocsCTE(filters, {
    selectCols: 'd.ppb_full_document_symbol, d.ppb_body',
    groupCols: 'd.ppb_full_document_symbol, d.ppb_body',
  })

  // Citations and UN Entities cards always reflect the latest budget version
  // (budget_versions.is_default) so the header reads as "what the current
  // proposed budget cites", independent of the page's mode tab. Source
  // Documents and UN Organs remain mode-driven catalog totals.
  const query = `
    WITH ${cte}
    SELECT
      COUNT(*) as total_documents,
      COUNT(DISTINCT ppb_body) FILTER (WHERE ppb_body IS NOT NULL) as total_organs,
      (SELECT COUNT(*) FROM ppb2026.source_document_citations c
       WHERE ${versionPredicateSql('c', 'NULL')}) as total_citations,
      (SELECT COUNT(DISTINCT c.entity) FROM ppb2026.source_document_citations c
       WHERE ${versionPredicateSql('c', 'NULL')} AND c.entity IS NOT NULL) as total_entities
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
  filters = omitOwnDimension(filters, 'entity')
  const { cte, params, versionClause } = buildFilteredDocsCTE(filters, {
    selectCols: 'd.ppb_full_document_symbol',
    groupCols: 'd.ppb_full_document_symbol',
  })

  const query = `
    WITH ${cte}
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
      AND ${versionClause('c')}
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
  filters = omitOwnDimension(filters, 'organ')
  const { clauses, params, havingClauses, versionClause } = buildFilterClauses(filters)
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
      AND ${versionClause('c')}
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
export async function getCrossCitations(
  entityCode: string,
  version?: string | null
): Promise<CrossCitation[]> {
  const query = `
    WITH entity_docs AS (
      -- Documents cited by this entity within the selected budget version
      SELECT DISTINCT ec.ppb_full_document_symbol
      FROM ppb2026.source_document_citations ec
      WHERE ec.entity = $1
        AND ${versionPredicateSql('ec', '$2')}
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM entity_docs ed
    JOIN ppb2026.source_document_citations c
      ON ed.ppb_full_document_symbol = c.ppb_full_document_symbol
      AND ${versionPredicateSql('c', '$2')}
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL
      AND c.entity != ''
      AND c.entity != $1
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<EntityCountRow>(query, [entityCode, version ?? null])

  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}

// ============================================================================
// Filter Options Queries
// ============================================================================

type FacetOption = { value: string; count: number }

/**
 * Shared facet-option builder. Every facet does the same dance: drop its own
 * active value (faceted-search rule, see omitOwnDimension), build the shared
 * filtered_docs CTE, run a per-facet SELECT, and coerce the count to a number.
 * Only the inner SELECT and (rarely) the post-processing differ, so those are
 * the two injection points; everything else lives here once.
 */
async function getFacetOptions(
  filters: FilterOptions,
  dimension: keyof FilterOptions,
  opts: {
    cteOpts?: { selectCols: string; groupCols: string }
    buildQuery: (ctx: {
      cte: string
      versionClause: (alias: string) => string
    }) => string
    postProcess?: (rows: ValueCountRow[]) => FacetOption[]
  }
): Promise<FacetOption[]> {
  const scoped = omitOwnDimension(filters, dimension)
  const { cte, params, versionClause } = buildFilteredDocsCTE(scoped, {
    selectCols: opts.cteOpts?.selectCols ?? 'd.ppb_full_document_symbol',
    groupCols: opts.cteOpts?.groupCols ?? 'd.ppb_full_document_symbol',
  })

  const query = opts.buildQuery({ cte, versionClause })
  const rows = await queryMany<ValueCountRow>(query, params)

  const postProcess =
    opts.postProcess ??
    ((r: ValueCountRow[]) =>
      r.map((row) => ({ value: row.value, count: parseInt(row.count) || 0 })))
  return postProcess(rows)
}

/** A budget location as it comes back from JSONB_BUILD_OBJECT, before sorting. */
type RawBudgetLocation = BudgetLocation & { part_sort?: number }

/**
 * Put a document's citation sites into reading order: down the budget, then by
 * section, then entity, then subprogramme. JSONB_AGG(DISTINCT …) cannot carry
 * an ORDER BY, so the ordering happens here.
 */
function sortBudgetLocations(
  locations: RawBudgetLocation[] | null
): BudgetLocation[] {
  if (!locations?.length) return []
  return [...locations]
    .sort(
      (a, b) =>
        (a.part_sort ?? 0) - (b.part_sort ?? 0) ||
        a.section.localeCompare(b.section, undefined, { numeric: true }) ||
        (a.entity ?? '').localeCompare(b.entity ?? '') ||
        (a.subprogramme_number ?? -1) - (b.subprogramme_number ?? -1)
    )
    .map((location) => ({
      part: location.part,
      part_title: location.part_title,
      section: location.section,
      section_title: location.section_title,
      programme: location.programme,
      programme_title: location.programme_title,
      entity: location.entity,
      entity_long: location.entity_long,
      subprogramme: location.subprogramme,
      subprogramme_number: location.subprogramme_number,
    }))
}

/**
 * The budget hierarchy as a tree, with the number of distinct documents cited
 * at each node. Backs the Budget location column's filter.
 *
 * Counts are computed independently at every level via GROUPING SETS, so a
 * document cited by two sections of the same part counts once for that part
 * rather than twice. GROUPING() returns 1 when a column is *absent* from the
 * current grouping set, which is what tells "this level was not grouped" apart
 * from "the value here is genuinely NULL" (citations with no subprogramme).
 */
export async function getBudgetHierarchy(
  filters: FilterOptions = {}
): Promise<BudgetPartNode[]> {
  // Scope by every active filter except the hierarchy's own levels, so the tree
  // keeps showing where a user can still navigate after clicking a node. Same
  // convention as the other facet lists (see omitOwnDimension).
  const scoped: FilterOptions = { ...filters }
  delete scoped.budget_part
  delete scoped.section
  delete scoped.subprogramme

  const partCols = 'c.budget_part_number, bp.part_title, bp.sort_order'
  const sectionCols =
    'c.section, c.section_title, bs.sort_order, c.programme, c.programme_title'
  const entityCols = 'c.entity, e.entity_long'
  const subprogrammeCols = 'c.sub_programme, c.sub_programme_number'

  const { cte, params, versionClause } = buildFilteredDocsCTE(scoped, {
    selectCols: 'd.ppb_full_document_symbol',
    groupCols: 'd.ppb_full_document_symbol',
  })

  const query = `
    WITH ${cte}
    SELECT
      3 - (
        GROUPING(c.section) + GROUPING(c.entity) + GROUPING(c.sub_programme)
      ) AS depth,
      c.budget_part_number AS part,
      bp.part_title,
      bp.sort_order AS part_sort,
      c.section,
      c.section_title,
      bs.sort_order AS section_sort,
      c.programme,
      c.programme_title,
      c.entity,
      e.entity_long,
      c.sub_programme,
      c.sub_programme_number,
      COUNT(DISTINCT c.ppb_full_document_symbol) AS count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
      AND ${versionClause('c')}
    JOIN ppb2026.budget_parts bp
      ON bp.part_number = c.budget_part_number
    LEFT JOIN ppb2026.budget_sections bs
      ON bs.section = regexp_replace(c.section, '\\s*\\(Add\\..*\\)$', '')
    LEFT JOIN systemchart.entities e
      ON e.entity = c.entity
    GROUP BY GROUPING SETS (
      (${partCols}),
      (${partCols}, ${sectionCols}),
      (${partCols}, ${sectionCols}, ${entityCols}),
      (${partCols}, ${sectionCols}, ${entityCols}, ${subprogrammeCols})
    )
  `

  return buildBudgetTree(await queryMany<HierarchyRow>(query, params))
}

interface HierarchyRow {
  depth: string
  part: string
  part_title: string
  part_sort: number
  section: string | null
  section_title: string | null
  section_sort: number | null
  programme: number | null
  programme_title: string | null
  entity: string | null
  entity_long: string | null
  sub_programme: string | null
  sub_programme_number: number | null
  count: string
}

/**
 * Rows arrive with the four depths interleaved, so each node is keyed by its
 * full path. Section values contain spaces ("3 (Add.2)"), so paths are joined
 * on a character that cannot occur in the data rather than on whitespace.
 */
function buildBudgetTree(rows: HierarchyRow[]): BudgetPartNode[] {
  const SEP = '\u0000'
  const parts = new Map<string, BudgetPartNode & { sort: number }>()
  const sections = new Map<string, BudgetSectionNode & { sort: number }>()
  const entities = new Map<string, BudgetEntityNode>()
  const sectionParent = new Map<string, string>()
  const entityParent = new Map<string, string>()

  const count = (row: HierarchyRow) => parseInt(row.count, 10) || 0

  // GROUPING SETS returns the four depths in no particular order, so walk them
  // shallowest-first: a subprogramme row can otherwise arrive before the entity
  // row it hangs under, find no parent, and be silently dropped.
  const shallowestFirst = [...rows].sort(
    (a, b) => parseInt(a.depth, 10) - parseInt(b.depth, 10)
  )

  for (const row of shallowestFirst) {
    const depth = parseInt(row.depth, 10)
    const sectionKey = `${row.part}${SEP}${row.section}`
    const entityKey = `${sectionKey}${SEP}${row.entity}`

    if (depth === 0) {
      parts.set(row.part, {
        part: row.part,
        part_title: row.part_title,
        count: count(row),
        sections: [],
        sort: row.part_sort,
      })
    } else if (depth === 1 && row.section !== null) {
      sectionParent.set(sectionKey, row.part)
      sections.set(sectionKey, {
        section: row.section,
        section_title: row.section_title ?? '',
        programme: row.programme,
        programme_title: row.programme_title,
        count: count(row),
        entities: [],
        sort: row.section_sort ?? 0,
      })
    } else if (depth === 2 && row.entity !== null) {
      entityParent.set(entityKey, sectionKey)
      entities.set(entityKey, {
        entity: row.entity,
        entity_long: row.entity_long,
        count: count(row),
        subprogrammes: [],
      })
    } else if (depth === 3 && row.sub_programme !== null) {
      entities.get(entityKey)?.subprogrammes.push({
        subprogramme: row.sub_programme,
        number: row.sub_programme_number,
        count: count(row),
      })
    }
  }

  for (const [key, entity] of entities) {
    // "All Subprogrammes" carries no number and belongs at the top of its entity.
    entity.subprogrammes.sort((a, b) => (a.number ?? -1) - (b.number ?? -1))
    sections.get(entityParent.get(key) ?? '')?.entities.push(entity)
  }

  // Attach in budget order, dropping the sort keys as we go: they are an
  // artefact of assembly and have no business being serialised to the client.
  const orderedSections = [...sections.entries()].sort(
    ([, a], [, b]) => a.sort - b.sort
  )
  for (const [key, section] of orderedSections) {
    section.entities.sort(
      (a, b) => b.count - a.count || a.entity.localeCompare(b.entity)
    )
    parts.get(sectionParent.get(key) ?? '')?.sections.push({
      section: section.section,
      section_title: section.section_title,
      programme: section.programme,
      programme_title: section.programme_title,
      count: section.count,
      entities: section.entities,
    })
  }

  return [...parts.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((part) => ({
      part: part.part,
      part_title: part.part_title,
      count: part.count,
      sections: part.sections,
    }))
}

/**
 * Get programme options with counts
 */
export async function getProgrammeOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  return getFacetOptions(filters, 'programme', {
    buildQuery: ({ cte, versionClause }) => `
    WITH ${cte}
    SELECT
      c.programme_title as value,
      COUNT(DISTINCT c.ppb_full_document_symbol) as count
    FROM filtered_docs fd
    JOIN ppb2026.source_document_citations c
      ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
      AND ${versionClause('c')}
    WHERE c.programme_title IS NOT NULL AND c.programme_title != ''
    GROUP BY c.programme_title
    ORDER BY count DESC, c.programme_title
  `,
  })
}

/**
 * Get subject options with counts
 */
export async function getSubjectOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  return getFacetOptions(filters, 'subject', {
    buildQuery: ({ cte }) => `
    WITH ${cte},
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
  `,
    // Normalize to title case then deduplicate (different raw strings can produce the same display value)
    postProcess: (rows) => {
      const merged = new Map<string, number>()
      for (const row of rows) {
        const key = titleCase(row.value.trim())
        merged.set(key, (merged.get(key) ?? 0) + (parseInt(row.count) || 0))
      }
      return Array.from(merged.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    },
  })
}

/**
 * Get document type options from ppb_type (well-populated field on source_documents)
 */
export async function getDocumentTypeOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  return getFacetOptions(filters, 'document_type', {
    cteOpts: {
      selectCols: 'd.ppb_full_document_symbol, d.ppb_type',
      groupCols: 'd.ppb_full_document_symbol, d.ppb_type',
    },
    buildQuery: ({ cte }) => `
    WITH ${cte}
    SELECT
      ppb_type as value,
      COUNT(DISTINCT ppb_full_document_symbol) as count
    FROM filtered_docs
    WHERE ppb_type IS NOT NULL AND ppb_type != ''
    GROUP BY ppb_type
    ORDER BY count DESC, ppb_type
  `,
  })
}

/**
 * Get agenda item options — parallel UNNEST of number + title arrays
 */
export async function getAgendaItemOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  return getFacetOptions(filters, 'agenda_item', {
    buildQuery: ({ cte }) => `
    WITH ${cte},
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
  `,
  })
}

/**
 * Get budget document options applicable to the selected budget version, with
 * citation counts under the current filters. "Applicable" = present in
 * ppb2026.budget_document_versions for COALESCE(filters.ppb_version, default
 * version). This mirrors versionPredicateSql, so the filter dropdown stays in
 * lockstep with the version toggle (no hardcoded 2026 → which-docs mapping).
 *
 * Returned shape extends the reference BudgetDocument with `count`. Ordered by
 * count DESC (sort_order as tiebreaker so curated order shows when counts tie).
 */
export async function getBudgetDocumentOptions(
  filters: FilterOptions = {}
): Promise<{
  slug: string
  display_name: string
  match_pattern: string
  sort_order: number
  count: number
}[]> {
  const scoped = omitOwnDimension(filters, 'budget_document')
  const { cte, params } = buildFilteredDocsCTE(scoped, {
    selectCols: 'd.ppb_full_document_symbol',
    groupCols: 'd.ppb_full_document_symbol',
  })

  // Bind ppb_version separately for the applicable-docs filter and the citation
  // version scope below. In active_mandates mode buildFilteredDocsCTE already
  // bound the same value, but rebinding is harmless and lets all_resolutions
  // mode (where the inner CTE skips version scoping) still narrow the budget
  // doc universe + citation count to the selected version.
  params.push(filters.ppb_version ?? null)
  const vIdx = params.length

  const query = `
    WITH ${cte},
    applicable_docs AS (
      SELECT bd.slug, bd.display_name, bd.match_pattern, bd.sort_order
      FROM ppb2026.budget_documents bd
      JOIN ppb2026.budget_document_versions bdv ON bdv.doc_slug = bd.slug
      WHERE bdv.version_slug = COALESCE(
        $${vIdx},
        (SELECT slug FROM ppb2026.budget_versions WHERE is_default LIMIT 1)
      )
    ),
    doc_counts AS (
      SELECT
        ad.slug,
        COUNT(DISTINCT fd.ppb_full_document_symbol) as count
      FROM filtered_docs fd
      JOIN ppb2026.source_document_citations c
        ON c.ppb_full_document_symbol = fd.ppb_full_document_symbol
        AND ${versionPredicateSql('c', `$${vIdx}`)}
      JOIN applicable_docs ad
        ON c.origin_document ~ ad.match_pattern
      GROUP BY ad.slug
    )
    SELECT
      ad.slug,
      ad.display_name,
      ad.match_pattern,
      ad.sort_order,
      COALESCE(dc.count, 0) as count
    FROM applicable_docs ad
    LEFT JOIN doc_counts dc ON dc.slug = ad.slug
    ORDER BY COALESCE(dc.count, 0) DESC, ad.sort_order
  `

  const rows = await queryMany<{
    slug: string
    display_name: string
    match_pattern: string
    sort_order: number
    count: string
  }>(query, params)

  return rows.map((r) => ({
    slug: r.slug,
    display_name: r.display_name,
    match_pattern: r.match_pattern,
    sort_order: r.sort_order,
    count: parseInt(r.count) || 0,
  }))
}

/**
 * Get year range and distribution
 */
export async function getYearStats(filters: FilterOptions = {}): Promise<{
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}> {
  const { cte, params } = buildFilteredDocsCTE(filters, {
    selectCols: 'd.ppb_full_document_symbol, d.ppb_year',
    groupCols: 'd.ppb_full_document_symbol, d.ppb_year',
  })

  const query = `
    WITH ${cte}
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
  const { cte, params } = buildFilteredDocsCTE(filters, {
    name: 'doc_citations',
    selectCols: 'd.ppb_full_document_symbol, COUNT(c.id) as citation_count',
    groupCols: 'd.ppb_full_document_symbol',
  })

  const query = `
    WITH ${cte},
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
    budgetHierarchy,
    subjectOptions,
    documentTypeOptions,
    agendaItemOptions,
    yearStats,
    yearStatsForChart,
    entities,
    organs,
    organMap,
    budgetDocuments,
    budgetVersions,
  ] = await Promise.all([
    getMandates(filters, { page, limit }),
    getMandateCounts(filters),
    getEntityCounts(filters),
    getOrganCounts(filters),
    getCitationDistribution(filters),
    getProgrammeOptions(filters),
    getBudgetHierarchy(filters),
    getSubjectOptions(filters),
    getDocumentTypeOptions(filters),
    getAgendaItemOptions(filters),
    getYearStats(filters),
    getYearStats({ ...filters, start_year: undefined, end_year: undefined }),
    getAllEntities(),
    getAllOrgans(),
    getOrganMap(),
    getBudgetDocumentOptions(filters),
    getBudgetVersions(),
  ])

  const { mandates, totalCount } = mandatesResult

  let crossCitations: ApiResponse['sidebar']['crossCitations'] = []
  if (filters.entity) {
    crossCitations = await getCrossCitations(filters.entity, filters.ppb_version)
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
      budgetHierarchy,
      programmes: programmeOptions,
      subjects: subjectOptions,
      documentTypes: documentTypeOptions,
      agendaItems: agendaItemOptions,
      yearRange: yearStats.yearRange,
      yearDistribution: yearStats.yearDistribution,
      yearDistributionUnfiltered: yearStatsForChart.yearDistribution,
      budgetDocuments,
      budgetVersions,
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
// Bump when the ApiResponse SHAPE changes, so cached entries produced by an
// older deploy are never served to newer client code (the cache key is only
// the filters, and entries persist for `revalidate`). This is the
// data-version guard the refactor plan called for.
const PAGE_DATA_CACHE_VERSION = 'v5-budget-hierarchy'

export const getMandatePageData = cache(
  (filters: FilterOptions): Promise<ApiResponse> =>
    unstable_cache(
      () => _getMandatePageDataInner(filters),
      [PAGE_DATA_CACHE_VERSION, JSON.stringify(filters)],
      { revalidate: 3600 } // 1 hour — data changes infrequently
    )()
)
