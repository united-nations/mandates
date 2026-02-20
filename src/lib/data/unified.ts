/**
 * Unified Document Database Queries
 *
 * Single data service for all ~42k UN documents.
 * Base: public.documents (41k) LEFT-JOINed with ppb2026 tables for citation enrichment.
 * UNION: ppb2026-only docs (~1,134) not present in public.documents.
 * The `cited_only` filter (mode !== 'documents') narrows to the ~4k PPB-cited mandates.
 *
 * Replaces the former mandates.ts + documents.ts split.
 * PPB-specific helpers (getMandateCitations, getCrossCitations) stay in mandates.ts.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany, queryOne } from '../db/query'
import { titleCase } from 'title-case'
import { getMandateDisplayTitle } from '@/lib/utils'
import { getAllEntities } from './entities'
import { getAllOrgans, getOrganMap } from './organs'
import { getBudgetDocuments } from './budget-documents'
import type {
  Mandate,
  FilterOptions,
  EntityWithCount,
  OrganWithCount,
  ApiResponse,
} from '@/types'

// ============================================================================
// Helpers
// ============================================================================

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

function parsePostgresArray(pgArray: string | null): string[] {
  if (!pgArray || pgArray.trim() === '') return []
  const cleaned = pgArray.trim().replace(/^\{|\}$/g, '')
  if (cleaned === '') return []
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

type SqlParam = string | number | boolean | null

// ============================================================================
// Internal Row Types
// ============================================================================

interface UnifiedListRow {
  symbol: string
  is_cited: boolean
  year: number | null
  issuing_body: string | null
  ppb_body: string | null
  body: string | null
  document_type: string | null
  title: string | null
  proper_title: string | null
  uniform_title: string | null       // coalesced from ppb metadata + public (text)
  pub_uniform_title: string | null   // raw from public.documents (jsonb→text)
  ppb_uniform_title: string | null   // raw from ppb metadata (text)
  subtitle: string | null
  subject_terms: string | null       // from public.documents (jsonb→text)
  ppb_subject_terms: string | null   // from ppb metadata (postgres array→text)
  description: string | null
  ppb_link: string | null
  ppb_type: string | null
  display_title: string | null
  num_entities: string
  num_citations: string
  entities: string[] | null
  total_count: string
  word_count: number | null
  similarity_to_previous: string | null
  previous_symbol: string | null
  has_within_existing_resources: boolean | null
  is_recurring_series: boolean | null
  series_symbol_count: number | null
  series_first_year: number | null
  series_last_year: number | null
  pdf_url: string | null
}

interface UnifiedDetailRow extends UnifiedListRow {
  agenda_document_symbol: string | null
  agenda_item_number: string | null
  agenda_item_title: string | null
  full_subject_terms: string | null   // ppb metadata subjects for detail page
}

interface CountsRow {
  total_documents: string
  total_bodies: string
  total_entities: string
  total_citations: string
}

interface EntityCountRow {
  entity: string
  entity_long: string | null
  count: string
}

interface OrganCountRow {
  short: string
  count: string
}

interface ValueCountRow {
  value: string
  count: string
}

interface YearRow {
  year: number
  count: string
}

// ============================================================================
// Base CTE
// Returns the SQL fragment (without leading "WITH") for the base UNION.
// Both branches expose the same canonical column aliases.
// ============================================================================

const BASE_CTE = `
  base AS (
    -- Branch 1: public.documents (41k) with optional PPB enrichment
    SELECT
      d.symbol                                                                       AS symbol,
      (ppb.ppb_full_document_symbol IS NOT NULL)                                     AS is_cited,
      COALESCE(d.date_year::int, ppb.ppb_year::int)                                 AS year,
      d.issuing_body                                                                 AS issuing_body,
      ppb.ppb_body                                                                   AS ppb_body,
      COALESCE(d.issuing_body, ppb.ppb_body)                                        AS body,
      d.document_type                                                                AS document_type,
      d.title                                                                        AS title,
      COALESCE(m.proper_title, d.proper_title)                                      AS proper_title,
      COALESCE(m.uniform_title, d.uniform_title::text)                              AS uniform_title,
      d.uniform_title::text                                                          AS pub_uniform_title,
      m.uniform_title                                                                AS ppb_uniform_title,
      d.subtitle                                                                     AS subtitle,
      d.subject_terms::text                                                          AS subject_terms,
      m.subject_terms::text                                                          AS ppb_subject_terms,
      ppb.ppb_description                                                            AS description,
      ppb.ppb_link                                                                   AS ppb_link,
      ppb.ppb_type                                                                   AS ppb_type,
      COALESCE(m.uniform_title, m.proper_title, d.proper_title, d.title)            AS display_title,
      rs.word_count,
      rs.similarity_to_previous,
      rs.previous_symbol,
      rs.has_within_existing_resources,
      rs.is_recurring_series,
      rs.series_symbol_count,
      rs.series_first_year,
      rs.series_last_year,
      rs.pdf_url
    FROM public.documents d
    LEFT JOIN ppb2026.source_documents ppb
      ON d.symbol = ppb.ppb_full_document_symbol
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON ppb.ppb_full_document_symbol = m.ppb_full_document_symbol
    LEFT JOIN public.resolution_stats rs
      ON d.symbol = rs.symbol

    UNION ALL

    -- Branch 2: PPB-only docs not present in public.documents (~1,134 rows)
    SELECT
      ppb.ppb_full_document_symbol                                                   AS symbol,
      TRUE                                                                           AS is_cited,
      ppb.ppb_year::int                                                              AS year,
      NULL::text                                                                     AS issuing_body,
      ppb.ppb_body                                                                   AS ppb_body,
      ppb.ppb_body                                                                   AS body,
      ppb.ppb_type                                                                   AS document_type,
      NULL::text                                                                     AS title,
      m.proper_title                                                                 AS proper_title,
      m.uniform_title                                                                AS uniform_title,
      NULL::text                                                                     AS pub_uniform_title,
      m.uniform_title                                                                AS ppb_uniform_title,
      NULL::text                                                                     AS subtitle,
      NULL::text                                                                     AS subject_terms,
      m.subject_terms::text                                                          AS ppb_subject_terms,
      ppb.ppb_description                                                            AS description,
      ppb.ppb_link                                                                   AS ppb_link,
      ppb.ppb_type                                                                   AS ppb_type,
      COALESCE(m.uniform_title, m.proper_title)                                     AS display_title,
      rs.word_count,
      rs.similarity_to_previous,
      rs.previous_symbol,
      rs.has_within_existing_resources,
      rs.is_recurring_series,
      rs.series_symbol_count,
      rs.series_first_year,
      rs.series_last_year,
      rs.pdf_url
    FROM ppb2026.source_documents ppb
    LEFT JOIN ppb2026.source_documents_metadata_clean m
      ON ppb.ppb_full_document_symbol = m.ppb_full_document_symbol
    LEFT JOIN public.resolution_stats rs
      ON ppb.ppb_full_document_symbol = rs.symbol
    WHERE NOT EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.symbol = ppb.ppb_full_document_symbol
    )
  )
`

// ============================================================================
// Filter Builder
// ============================================================================

function buildFilterClauses(
  filters: FilterOptions,
  paramOffset = 0
): { clauses: string[]; params: SqlParam[] } {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let p = paramOffset + 1

  // cited_only: mode defaults to PPB (anything that isn't 'documents')
  if (filters.mode !== 'documents') {
    clauses.push('base.is_cited = TRUE')
  }

  // Entity filter — doc must be cited by this entity
  if (filters.entity) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations cit2
        WHERE cit2.ppb_full_document_symbol = base.symbol
          AND cit2.entity = $${p}
      )
    `)
    params.push(filters.entity)
    p++
  }

  // Cross-citing entity
  if (filters.crossCitingEntity) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations cit3
        WHERE cit3.ppb_full_document_symbol = base.symbol
          AND cit3.entity = $${p}
      )
    `)
    params.push(filters.crossCitingEntity)
    p++
  }

  // Organ / issuing body — uses the coalesced `body` column
  if (filters.organ) {
    clauses.push(`base.body = $${p}`)
    params.push(filters.organ)
    p++
  }

  // Year range
  if (filters.start_year) {
    clauses.push(`base.year >= $${p}`)
    params.push(parseInt(filters.start_year))
    p++
  }
  if (filters.end_year) {
    clauses.push(`base.year <= $${p}`)
    params.push(parseInt(filters.end_year))
    p++
  }

  // Programme (PPB-only concept; graceful 0 results for non-PPB rows)
  if (filters.programme) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations cit4
        WHERE cit4.ppb_full_document_symbol = base.symbol
          AND LOWER(cit4.programme_title) LIKE $${p}
      )
    `)
    params.push(`%${filters.programme.toLowerCase()}%`)
    p++
  }

  // Subject — check public jsonb subjects OR PPB metadata subjects
  if (filters.subject) {
    clauses.push(`(
      (base.subject_terms IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(base.subject_terms::jsonb) AS st
          WHERE LOWER(st) LIKE $${p}
        ))
      OR EXISTS (
        SELECT 1 FROM ppb2026.source_documents_metadata_clean m_sub
        WHERE m_sub.ppb_full_document_symbol = base.symbol
          AND LOWER(m_sub.subject_terms::text) LIKE $${p}
      )
    )`)
    params.push(`%${filters.subject.toLowerCase()}%`)
    p++
  }

  // Budget document (PPB-only; graceful 0 for non-PPB)
  if (filters.budget_document) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations cit5
        WHERE cit5.ppb_full_document_symbol = base.symbol
          AND cit5.origin_document ~ (
            SELECT match_pattern FROM ppb2026.budget_documents
            WHERE slug = $${p}
          )
      )
    `)
    params.push(filters.budget_document)
    p++
  }

  // Document type (from public.documents; null for PPB-only rows → no match)
  if (filters.document_type) {
    clauses.push(`base.document_type = $${p}`)
    params.push(filters.document_type)
    p++
  }

  // Keyword search — tsvector on public fields + LIKE fallback for PPB-only rows
  if (filters.keyword) {
    const kw = filters.keyword.trim()
    clauses.push(`(
      to_tsvector('english',
        COALESCE(base.title, '') || ' ' ||
        COALESCE(base.proper_title, '') || ' ' ||
        COALESCE(base.uniform_title, '')
      ) @@ plainto_tsquery('english', $${p})
      OR LOWER(base.symbol)        LIKE $${p + 1}
      OR LOWER(base.title)         LIKE $${p + 1}
      OR LOWER(base.proper_title)  LIKE $${p + 1}
      OR LOWER(base.uniform_title) LIKE $${p + 1}
      OR LOWER(base.subtitle)      LIKE $${p + 1}
      OR LOWER(base.description)   LIKE $${p + 1}
      OR LOWER(base.subject_terms) LIKE $${p + 1}
    )`)
    params.push(kw, `%${kw.toLowerCase()}%`)
    p += 2
  }

  // Exact symbol match
  if (filters.full_document_symbol) {
    clauses.push(`base.symbol = $${p}`)
    params.push(filters.full_document_symbol)
    p++
  }

  return { clauses, params }
}

// ============================================================================
// Order By Builder
// ============================================================================

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
      return 'ORDER BY base.year DESC NULLS LAST, base.symbol'
    case 'year_asc':
      return 'ORDER BY base.year ASC NULLS LAST, base.symbol'
    case 'title_asc':
      return 'ORDER BY base.display_title ASC NULLS LAST'
    case 'title_desc':
      return 'ORDER BY base.display_title DESC NULLS LAST'
    case 'word_count_desc':
      return 'ORDER BY base.word_count DESC NULLS LAST, base.symbol'
    case 'word_count_asc':
      return 'ORDER BY base.word_count ASC NULLS LAST, base.symbol'
    case 'similarity_desc':
      return 'ORDER BY base.similarity_to_previous DESC NULLS LAST, base.symbol'
    case 'similarity_asc':
      return 'ORDER BY base.similarity_to_previous ASC NULLS LAST, base.symbol'
    default:
      return 'ORDER BY num_entities DESC, num_citations DESC'
  }
}

// ============================================================================
// Row → Mandate Mapper
// ============================================================================

function mapRowToMandate(row: UnifiedListRow): Mandate {
  // Merge subjects from both sources
  const pubSubjects = parseJsonbArray(row.subject_terms)
  const ppbSubjects = parsePostgresArray(row.ppb_subject_terms)
  const allSubjects = [...new Set([...pubSubjects, ...ppbSubjects])]

  // uniform_title: public.documents stores as jsonb array; PPB metadata as single text
  const uniformTitle = row.pub_uniform_title
    ? parseJsonbArray(row.pub_uniform_title)
    : row.ppb_uniform_title
      ? [row.ppb_uniform_title]
      : null

  return {
    full_document_symbol: row.symbol,
    document_symbol: row.symbol,
    num_citations: parseInt(row.num_citations) || 0,
    num_entities: parseInt(row.num_entities) || 0,
    entities: row.entities || [],
    link: row.ppb_link || null,
    year: row.year?.toString() || '',
    body: row.body || '',
    description: row.description || null,
    type: row.ppb_type || row.document_type || 'Unknown',
    uniform_title: uniformTitle,
    proper_title: row.proper_title || null,
    title: row.title || null,
    subtitle: row.subtitle || null,
    issuing_body: row.issuing_body || null,
    subject_headings: allSubjects.map((s) => titleCase(s.toLowerCase())),
    agenda_document_symbols: [],
    agenda_item_numbers: [],
    agenda_item_titles: [],
    citation_info: [],
    word_count: row.word_count ?? null,
    similarity_to_previous:
      row.similarity_to_previous != null
        ? parseFloat(row.similarity_to_previous)
        : null,
    previous_symbol: row.previous_symbol ?? null,
    has_within_existing_resources: row.has_within_existing_resources ?? null,
    is_recurring_series: row.is_recurring_series ?? null,
    series_symbol_count: row.series_symbol_count ?? null,
    series_first_year: row.series_first_year ?? null,
    series_last_year: row.series_last_year ?? null,
    pdf_url: row.pdf_url ?? null,
  }
}

// ============================================================================
// List Query
// ============================================================================

async function getDocuments(
  filters: FilterOptions = {},
  options: { page?: number; limit?: number } = {}
): Promise<{ mandates: Mandate[]; totalCount: number }> {
  const page = options.page ?? 1
  const limit = options.limit ?? 10
  const offset = (page - 1) * limit

  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''
  const orderBy = buildOrderByClause(filters.sort_by)

  const sql = `
    WITH ${BASE_CTE},
    agg AS (
      SELECT
        base.*,
        COUNT(DISTINCT cit.entity) FILTER (WHERE cit.entity IS NOT NULL) AS num_entities,
        COUNT(cit.id)                                                      AS num_citations,
        ARRAY_AGG(DISTINCT cit.entity) FILTER (WHERE cit.entity IS NOT NULL) AS entities,
        COUNT(*) OVER()                                                    AS total_count
      FROM base
      LEFT JOIN ppb2026.source_document_citations cit
        ON base.symbol = cit.ppb_full_document_symbol
      WHERE 1=1 ${whereClause}
      GROUP BY
        base.symbol, base.is_cited, base.year, base.issuing_body,
        base.ppb_body, base.body, base.document_type, base.title,
        base.proper_title, base.uniform_title, base.pub_uniform_title,
        base.ppb_uniform_title, base.subtitle, base.subject_terms,
        base.ppb_subject_terms, base.description, base.ppb_link,
        base.ppb_type, base.display_title,
        base.word_count, base.similarity_to_previous, base.previous_symbol,
        base.has_within_existing_resources, base.is_recurring_series,
        base.series_symbol_count, base.series_first_year, base.series_last_year,
        base.pdf_url
      ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    )
    SELECT * FROM agg
  `

  const rows = await queryMany<UnifiedListRow>(sql, [...params, limit, offset])

  if (rows.length === 0) return { mandates: [], totalCount: 0 }

  const totalCount = parseInt(rows[0]?.total_count ?? '0')
  const mandates = rows.map(mapRowToMandate)

  return { mandates, totalCount }
}

// ============================================================================
// Detail Query
// ============================================================================

export async function getMandateBySymbol(symbol: string): Promise<Mandate | null> {
  const sql = `
    WITH ${BASE_CTE},
    detail AS (
      SELECT
        base.*,
        COUNT(DISTINCT cit.entity) FILTER (WHERE cit.entity IS NOT NULL) AS num_entities,
        COUNT(cit.id)                                                      AS num_citations,
        ARRAY_AGG(DISTINCT cit.entity) FILTER (WHERE cit.entity IS NOT NULL) AS entities,
        ''::text                                                           AS total_count,
        m_meta.agenda_document_symbol,
        m_meta.agenda_item_number,
        m_meta.agenda_item_title,
        m_meta.subject_terms::text                                         AS full_subject_terms
      FROM base
      LEFT JOIN ppb2026.source_document_citations cit
        ON base.symbol = cit.ppb_full_document_symbol
      LEFT JOIN ppb2026.source_documents_metadata_clean m_meta
        ON base.symbol = m_meta.ppb_full_document_symbol
      WHERE base.symbol = $1
      GROUP BY
        base.symbol, base.is_cited, base.year, base.issuing_body,
        base.ppb_body, base.body, base.document_type, base.title,
        base.proper_title, base.uniform_title, base.pub_uniform_title,
        base.ppb_uniform_title, base.subtitle, base.subject_terms,
        base.ppb_subject_terms, base.description, base.ppb_link,
        base.ppb_type, base.display_title,
        base.word_count, base.similarity_to_previous, base.previous_symbol,
        base.has_within_existing_resources, base.is_recurring_series,
        base.series_symbol_count, base.series_first_year, base.series_last_year,
        base.pdf_url,
        m_meta.agenda_document_symbol, m_meta.agenda_item_number,
        m_meta.agenda_item_title, m_meta.subject_terms
    )
    SELECT * FROM detail
  `

  const row = await queryOne<UnifiedDetailRow>(sql, [symbol])
  if (!row) return null

  const base = mapRowToMandate(row)

  // Add PPB metadata subjects if not already captured
  const ppbDetailSubjects = parsePostgresArray(row.full_subject_terms)
  const mergedSubjects = [
    ...new Set([
      ...base.subject_headings.map((s) => s.toLowerCase()),
      ...ppbDetailSubjects.map((s) => s.toLowerCase()),
    ]),
  ]

  return {
    ...base,
    subject_headings: mergedSubjects.map((s) => titleCase(s)),
    agenda_document_symbols: parsePostgresArray(row.agenda_document_symbol),
    agenda_item_numbers: parsePostgresArray(row.agenda_item_number),
    agenda_item_titles: parsePostgresArray(row.agenda_item_title),
    // citation_info populated by getMandateCitations in mandates.ts if needed
  }
}

// ============================================================================
// Aggregation Queries
// ============================================================================

async function getCounts(
  filters: FilterOptions = {}
): Promise<{ totalDocuments: number; totalBodies: number; totalEntities: number; totalCitations: number }> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE}
    SELECT
      COUNT(DISTINCT base.symbol)                                              AS total_documents,
      COUNT(DISTINCT base.body) FILTER (WHERE base.body IS NOT NULL)          AS total_bodies,
      COUNT(DISTINCT cit.entity) FILTER (WHERE cit.entity IS NOT NULL)        AS total_entities,
      COUNT(cit.id)                                                            AS total_citations
    FROM base
    LEFT JOIN ppb2026.source_document_citations cit
      ON base.symbol = cit.ppb_full_document_symbol
    WHERE 1=1 ${whereClause}
  `

  const row = await queryOne<CountsRow>(sql, params)
  return {
    totalDocuments: parseInt(row?.total_documents ?? '0'),
    totalBodies: parseInt(row?.total_bodies ?? '0'),
    totalEntities: parseInt(row?.total_entities ?? '0'),
    totalCitations: parseInt(row?.total_citations ?? '0'),
  }
}

async function getEntityCounts(filters: FilterOptions = {}): Promise<EntityWithCount[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE},
    filtered AS (
      SELECT DISTINCT base.symbol
      FROM base
      LEFT JOIN ppb2026.source_document_citations cit
        ON base.symbol = cit.ppb_full_document_symbol
      WHERE 1=1 ${whereClause}
    )
    SELECT
      c.entity,
      e.entity_long,
      COUNT(DISTINCT c.ppb_full_document_symbol) AS count
    FROM filtered f
    JOIN ppb2026.source_document_citations c
      ON f.symbol = c.ppb_full_document_symbol
    LEFT JOIN systemchart.entities e ON c.entity = e.entity
    WHERE c.entity IS NOT NULL AND c.entity != ''
    GROUP BY c.entity, e.entity_long
    ORDER BY count DESC
  `

  const rows = await queryMany<EntityCountRow>(sql, params)
  return rows.map((row) => ({
    entity: row.entity,
    entity_long: row.entity_long || row.entity,
    count: parseInt(row.count) || 0,
  }))
}

async function getOrganCounts(filters: FilterOptions = {}): Promise<OrganWithCount[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE}
    SELECT
      base.body AS short,
      COUNT(DISTINCT base.symbol) AS count
    FROM base
    LEFT JOIN ppb2026.source_document_citations cit
      ON base.symbol = cit.ppb_full_document_symbol
    WHERE 1=1 ${whereClause}
      AND base.body IS NOT NULL AND base.body != ''
    GROUP BY base.body
    ORDER BY count DESC
  `

  const rows = await queryMany<OrganCountRow>(sql, params)
  return rows.map((row) => ({
    short: row.short,
    long: row.short, // enriched with organ data in orchestrator
    count: parseInt(row.count) || 0,
  }))
}

async function getSubjectOptions(
  filters: FilterOptions = {}
): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  // Collect subjects from both sources: public.documents (jsonb) and ppb metadata (text[])
  const sql = `
    WITH ${BASE_CTE},
    filtered_symbols AS (
      SELECT DISTINCT base.symbol, base.subject_terms
      FROM base
      LEFT JOIN ppb2026.source_document_citations cit
        ON base.symbol = cit.ppb_full_document_symbol
      WHERE 1=1 ${whereClause}
    ),
    pub_subjects AS (
      SELECT fs.symbol, LOWER(st.value::text) AS subject
      FROM filtered_symbols fs,
        jsonb_array_elements_text(fs.subject_terms::jsonb) AS st(value)
      WHERE fs.subject_terms IS NOT NULL
    ),
    ppb_subjects AS (
      SELECT fs.symbol, LOWER(UNNEST(m.subject_terms::text[])) AS subject
      FROM filtered_symbols fs
      JOIN ppb2026.source_documents_metadata_clean m
        ON fs.symbol = m.ppb_full_document_symbol
      WHERE m.subject_terms IS NOT NULL AND m.subject_terms != ''
    ),
    all_subjects AS (
      SELECT * FROM pub_subjects
      UNION
      SELECT * FROM ppb_subjects
    )
    SELECT
      subject AS value,
      COUNT(DISTINCT symbol) AS count
    FROM all_subjects
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
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE}
    SELECT
      base.document_type AS value,
      COUNT(DISTINCT base.symbol) AS count
    FROM base
    LEFT JOIN ppb2026.source_document_citations cit
      ON base.symbol = cit.ppb_full_document_symbol
    WHERE 1=1 ${whereClause}
      AND base.document_type IS NOT NULL AND base.document_type != ''
    GROUP BY base.document_type
    ORDER BY count DESC
  `

  const rows = await queryMany<ValueCountRow>(sql, params)
  return rows.map((row) => ({
    value: row.value,
    count: parseInt(row.count) || 0,
  }))
}

async function getProgrammeOptions(
  filters: FilterOptions = {}
): Promise<{ value: string; count: number }[]> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE},
    filtered AS (
      SELECT DISTINCT base.symbol
      FROM base
      LEFT JOIN ppb2026.source_document_citations cit
        ON base.symbol = cit.ppb_full_document_symbol
      WHERE 1=1 ${whereClause}
    )
    SELECT
      c.programme_title AS value,
      COUNT(DISTINCT c.ppb_full_document_symbol) AS count
    FROM filtered f
    JOIN ppb2026.source_document_citations c
      ON f.symbol = c.ppb_full_document_symbol
    WHERE c.programme_title IS NOT NULL AND c.programme_title != ''
    GROUP BY c.programme_title
    ORDER BY c.programme_title
  `

  const rows = await queryMany<ValueCountRow>(sql, params)
  return rows.map((row) => ({
    value: row.value,
    count: parseInt(row.count) || 0,
  }))
}

async function getYearStats(filters: FilterOptions = {}): Promise<{
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}> {
  const { clauses, params } = buildFilterClauses(filters)
  const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : ''

  const sql = `
    WITH ${BASE_CTE}
    SELECT
      base.year AS year,
      COUNT(DISTINCT base.symbol) AS count
    FROM base
    LEFT JOIN ppb2026.source_document_citations cit
      ON base.symbol = cit.ppb_full_document_symbol
    WHERE 1=1 ${whereClause}
      AND base.year IS NOT NULL
    GROUP BY base.year
    ORDER BY base.year
  `

  const rows = await queryMany<YearRow>(sql, params)

  if (rows.length === 0) {
    return { yearRange: { min: 1946, max: 2025 }, yearDistribution: {} }
  }

  const years = rows.map((r) => r.year)
  const distribution: Record<string, number> = {}
  rows.forEach((row) => {
    distribution[row.year.toString()] = parseInt(row.count) || 0
  })

  return {
    yearRange: { min: Math.min(...years), max: Math.max(...years) },
    yearDistribution: distribution,
  }
}

// ============================================================================
// Orchestrator
// ============================================================================

async function _getPageDataInner(filters: FilterOptions): Promise<ApiResponse> {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '10', 10)

  const [
    documentsResult,
    counts,
    entityCounts,
    organCounts,
    programmeOptions,
    subjectOptions,
    documentTypeOptions,
    yearStats,
    entities,
    organs,
    organMap,
    budgetDocuments,
  ] = await Promise.all([
    getDocuments(filters, { page, limit }),
    getCounts(filters),
    getEntityCounts(filters),
    getOrganCounts(filters),
    getProgrammeOptions(filters),
    getSubjectOptions(filters),
    getDocumentTypeOptions(filters),
    getYearStats(filters),
    getAllEntities(),
    getAllOrgans(),
    getOrganMap(),
    getBudgetDocuments(),
  ])

  const { mandates, totalCount } = documentsResult

  // Cross-citations (entity pages only — populated in mandates.ts)
  const crossCitations: ApiResponse['sidebar']['crossCitations'] = []

  const enrichedMandates = mandates.map((mandate) => ({
    ...mandate,
    displayTitle: getMandateDisplayTitle(mandate),
    body_long: organMap.get(mandate.body)?.long || mandate.issuing_body || mandate.body,
  }))

  const enrichedOrganCounts = organCounts.map((organ) => ({
    ...organ,
    long: organMap.get(organ.short)?.long || organ.short,
  }))

  const totalPages = Math.ceil(totalCount / limit)
  const isCitedOnly = filters.mode !== 'documents'

  return {
    mandates: enrichedMandates,
    pagination: { page, limit, totalPages, totalItems: totalCount },
    counts: {
      totalDocuments: counts.totalDocuments,
      totalEntities: counts.totalEntities,
      totalOrgans: counts.totalBodies,
      totalCitations: counts.totalCitations,
    },
    mode: isCitedOnly ? 'ppb' : 'documents',
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
      budgetDocuments,
      documentTypes: documentTypeOptions,
    },
    reference: {
      entities,
      organs,
    },
  }
}

/**
 * Public API: fetch all data for the document list page.
 * Two-layer caching: unstable_cache (5 min, keyed by filters) + React cache (per-render dedup).
 */
export const getPageData = cache(
  (filters: FilterOptions): Promise<ApiResponse> =>
    unstable_cache(
      () => _getPageDataInner(filters),
      ['unified', JSON.stringify(filters)],
      { revalidate: 300 }
    )()
)
