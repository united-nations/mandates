import { mandateMembershipSql, versionPredicateSql } from '@/lib/mandate-membership'
/**
 * Mandate Database Queries
 *
 * Fetches mandate data from PostgreSQL, replacing the JSON file approach.
 * All operations are server-side only.
 */

import { cache } from 'react'
import { normalizePagination } from '#lib/pagination'
import { getDocumentTextMetrics } from './text-metrics'
import { buildTextMetricsSql } from './text-metrics-sql'
import { getDocumentPdfUrl } from './source-links'
import { getHistoricalDocument } from './historical-document'
import type { DocumentTextMetrics } from '../text-analytics'
import { unstable_cache } from 'next/cache'
import { queryMany, queryOne } from '../db/query'
import { titleCase } from 'title-case'
import { getMandateDisplayTitle, safeHighlightSearchTerms } from '@/lib/utils'
import { compileSearchMarker } from '@/lib/paragraph-search'
import { parseSearchQuery, positiveTerms } from '@/lib/search-query'
import {
  buildSearchPredicate,
  likePattern,
  likePrefixPattern,
  searchFoldSql,
  type SearchField,
} from './search-query-sql'
import { getAllEntities } from './entities'
import { getAllOrgans, getOrganMap } from './organs'
import { getBudgetVersions } from './budget-documents'
import {
  exploreCardBaselineFilters,
  type ExploreCardFigures,
} from '@/lib/explore-card-state'
import { FOUNDATIONAL_PART_IN_DOCUMENT } from '@/lib/foundational'
import { ORGAN_CATEGORIES } from '@/lib/organ-groups'
import { readDynamicCache } from '@/lib/perf/dynamic-cache'
import { subjectCountSql } from './subject-count-sql'
import { buildUngroupedListSql } from './mandate-list-sql'
import {
  buildDirectBudgetCitations,
  buildQualifiedBudgetCitations,
} from './budget-citation-sql'
import { SUBJECT_DOMAIN_LABELS } from '@/lib/filter-constants'
import { citationScope, citationScopeKey, parseCitationScope, citationScopePredicates } from '@/lib/citation-budget-location'
import type { DetailBudgetLocation } from '@/types'
import { agendaResolutionPredicate, parseAgendaScope } from '@/lib/agenda-scope'
import { agendaScopeSymbols } from './agenda-items'
import { relatedResolutionPredicate } from '@/lib/related-agenda'
import {
  pairKey,
  organEntityKey,
  type CoCitationMatrix,
  type OrganEntityMatrix,
} from '@/lib/heatmap/matrix'
import type { Mandate, FilterOptions, EntityWithCount, OrganWithCount, OrganGroup, CrossCitation, CitationBin, ApiResponse, BudgetLocation, BudgetPartNode, BudgetSectionNode, BudgetEntityNode, BudgetStream, BudgetPkoGroupNode, DocumentTypeCatalogue, SubjectDomain, SubjectSubdomain, SubjectLeaf } from '@/types'

// ============================================================================
// Helper Functions
// ============================================================================

// PPB 2026 labels a citation that belongs to no specific subprogramme with the
// literal "All Subprogrammes"; PPB 2027 represents the same generic case as a
// NULL sub_programme (and renders the entity with no subprogramme pill). Fold
// the 2026 label to NULL wherever the value surfaces so both versions behave
// identically — no "All Subprogrammes" node, pill, filter option, or tooltip
// line. Downstream NULL handling (buildBudgetTree, BudgetLocationCell) already
// does the right thing, and sub_programme_number is already NULL for these rows.
const GENERIC_SUBPROGRAMME_LABEL = 'All Subprogrammes'
const subProgrammeExpr = (col: string) =>
  `NULLIF(${col}, '${GENERIC_SUBPROGRAMME_LABEL}')`

// ppb_type is free text curated per document, so the recorded types run to a
// long tail of categories carrying one or two documents each, underneath the
// three the registry is actually read for. Everything outside those three is
// grouped under one label, and every surface that counts or filters on the
// type reads this one expression rather than the raw column - a facet and a
// predicate that agree because they are the same SQL, not by luck.
//
// The NULL branch comes FIRST and the order is load-bearing. A large share of
// the catalogue has no recorded type at all (see the note on
// _getDocumentTypeCatalogueInner); those rows have to stay NULL so the modal
// can still count them and disclose the gap. Test the bucket first and they
// are absorbed into it, the untyped count goes to zero, the footnote that
// reports the gap disappears, and the panel silently claims a complete
// partition of a catalogue it covers under half of.
const OTHER_DOCUMENT_TYPE_LABEL = 'Other document types'
const documentTypeGroupExpr = (col: string) => `CASE
      WHEN NULLIF(TRIM(${col}), '') IS NULL THEN NULL
      WHEN TRIM(${col}) IN ('Resolutions', 'Decisions', 'Presidential Statements')
        THEN TRIM(${col})
      ELSE '${OTHER_DOCUMENT_TYPE_LABEL}'
    END`

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

/** MARC 991 agenda entry as stored in digitallibrary.documents.agenda_items. */
interface DlAgendaItem {
  doc: string | null
  item: string | null
  desc: string | null
  topic: string | null
}

/** Digital Library subjects (TEXT[]) -> title-cased, deduped display headings. */
function dlSubjectHeadings(subjects: string[] | null | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of subjects ?? []) {
    const v = titleCase(s.trim().toLowerCase())
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

/** Pull one field (natural-language `desc` title, or `item` number) out of the
 * agenda_items JSONB, dropping nulls/dupes while preserving order. */
function dlAgendaField(
  items: DlAgendaItem[] | null | undefined,
  key: 'item' | 'desc' | 'doc'
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const a of items ?? []) {
    const v = a?.[key]
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

interface MandateListRow {
  ppb_full_document_symbol: string
  ppb_link: string | null
  ppb_year: number | null
  ppb_body: string | null
  ppb_description: string | null
  display_title: string | null
  ppb_type: string | null
  num_entities: string
  num_citations: string
  entities: string[] | null
  foundational_entities: string[] | null
  programmes: string[] | null
  budget_locations: RawBudgetLocation[] | null
  origin_documents: string[] | null
  total_count: string
  // Digital Library metadata surfaced on unified_documents
  subjects: string[] | null
  agenda_items: DlAgendaItem[] | null
  // resolution series facts (LEFT JOIN on digitallibrary.resolution_series)
  superseded_by?: string | null
  is_collection?: boolean | null
  has_newer?: boolean | null
  is_latest?: boolean | null
  series_count?: number | null
  // grouped mode only
  group_size?: string | null
  group_min_year?: number | null
  group_max_year?: number | null
  group_members?:
    | { symbol: string; year: number | null; title: string | null }[]
    | null
}

/** Row type for citation query results */
interface CitationQueryRow {
  stream: DetailBudgetLocation['stream']
  is_support: boolean | null
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
type SqlParam = string | string[] | number | boolean | null

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
  /**
   * The `$n` placeholder the selected ppb_version is bound at. Exposed so
   * queries that reach past the shared CTE (getMandateCounts' catalogue-wide
   * totals) can scope to the SAME version instead of re-binding it or, worse,
   * assuming a positional `$1`.
   */
  versionParam: string
}

/**
 * The fields the keyword search reads — the ones shown on the row: the
 * symbol, the raw description, the rendered title and the subject headings.
 * The ordering rank in getMandates reads the same fields.
 *
 * Which fold each field gets was counted, not assumed. Symbols carry the
 * folded characters in a few dozen rows ("A/RES/79/259 A–C" with an en dash,
 * a non-breaking hyphen in an OAS symbol, stray whitespace in 37), and
 * descriptions and titles carry them in the hundreds, with doubled or edge
 * whitespace in over ten thousand — those three get the full fold. Subject
 * headings were counted at zero for every mapped character and every
 * whitespace anomaly, so lower-casing them gives the same answer as the
 * full fold, and this is the field with several values per row.
 */
const KEYWORD_SEARCH_FIELDS: SearchField[] = [
  { expr: 'd.ppb_full_document_symbol', fold: 'text' },
  { expr: 'd.ppb_description', fold: 'text' },
  { expr: 'd.display_title', fold: 'text' },
  { expr: 'd.subjects', fold: 'case', array: true },
]

// agendaSymbols is agendaScopeSymbols(filters), resolved by the async caller;
// required so that a new caller cannot silently skip it.
function buildFilterClauses(
  filters: FilterOptions,
  agendaSymbols: string[] | undefined,
  paramOffset = 0
): FilterClauses {
  const clauses: string[] = []
  const params: SqlParam[] = []
  let paramIndex = paramOffset + 1

  // Version scoping. The selected budget version is a LENS, not a scope tab:
  // the page always shows the whole document catalogue, and the version decides
  // which citations are attached to it. Every citation-based filter and every
  // displayed aggregate must therefore match citations originating from the
  // selected version only — otherwise `entity` leaks citations from other
  // versions (PPB 2026 DCO rows showing up under ppb_version=ppb2027) and the
  // citation counts on the list are the SUM of two budget cycles for the 1,314
  // documents both cycles cite.
  //
  // A version is a data-driven grouping of budget documents
  // (ppb2026.budget_versions <- ppb2026.budget_document_versions):
  //   ppb2026 = PPB 2026 + Peacekeeping 2025/26
  //   ppb2027 = PPB 2027 + Peacekeeping 2026/27
  // so a citation belongs to version V iff its origin_document matches the
  // match_pattern of any budget_document mapped to V. The selected slug is
  // bound ONCE here and reused across every call site; an unknown/absent slug
  // falls back to the table's default version (no regex is ever built from user
  // input -> no ReDoS surface).
  params.push(filters.ppb_version ?? null)
  const versionParam = `$${paramIndex}`
  paramIndex++
  const versionClause = (a: string) => versionPredicateSql(a, versionParam)

  // Membership: the catalogue, unified with what the SELECTED version cites.
  // "Catalogue" is anything matching one of the 8 symbol families (A/RES,
  // A/DEC, S/RES, S/PRST, E/RES, E/DEC, A/HRC/RES, A/HRC/PRST); the definition
  // lives in the matview (column is_catalog_pattern, set in migration 020) so
  // the regex stays in exactly one place.
  //
  // The union arm follows the selected version rather than the default one, so
  // switching the lens moves the row set with it: 42,904 documents under PPB
  // 2027, 43,020 under PPB 2026. That keeps the set self-consistent — every row
  // outside the 8 families is there BECAUSE the version on display cites it, so
  // no row can appear with nothing to show for itself.
  clauses.push(mandateMembershipSql('d', versionParam))

  // "Cited as mandates" — the subset of the catalogue the selected version
  // cites (the 2,737 / 3,962 documents behind explore card 3). This used to be
  // `mode=active_mandates`, a hidden scope switch that also silently turned
  // version scoping OFF for the other arm. It is now an ordinary, removable
  // filter that composes with every other one.
  if (filters.cited === '1') {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c_ppb
        WHERE c_ppb.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND ${versionClause('c_ppb')}
      )
    `)
  }

  const exactCitationScope = filters.budget_location ? parseCitationScope(filters.budget_location) : null
  const hasBudgetLocation = Boolean(exactCitationScope || filters.budget_document || filters.budget_group || filters.budget_part || filters.section || filters.subprogramme)
  // Standalone entity selection is catalogue-wide. A location plus entity
  // must match one citation, handled together below.
  if (filters.entity && !hasBudgetLocation) {
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
  // Exact title match: getProgrammeOptions emits one option per distinct
  // programme_title with its own count, and a substring match made those counts
  // wrong for every title that is a prefix of another.
  if (filters.programme) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations c4
        WHERE c4.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND LOWER(TRIM(c4.programme_title)) = $${paramIndex}
        AND ${versionClause('c4')}
      )
    `)
    params.push(filters.programme.trim().toLowerCase())
    paramIndex++
  }

  // Full-path budget location: all selected fields must match the SAME
  // citation. Independent EXISTS predicates could combine an entity from
  // one location and a subprogramme from another, broadening tree links.
  //
  // `section` matches the stored value EXACTLY, addendum suffix included. It
  // used to strip "(Add.N)" from the column before comparing, so that section 3
  // also caught its addenda — but the budget tree lists "3" and "3 (Add.2)" as
  // separate siblings with separate counts, so that predicate could never
  // reproduce either of them: clicking "3" returned section 3 plus five addenda,
  // and clicking "3 (Add.2)" returned NOTHING at all (the left-hand side is
  // stripped, so it can never equal a value that still carries the suffix). The
  // only writers of this param are those tree nodes; no link in the app sets it.
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
      column: (p) => `ch.section = ${p}`,
    },
    {
      value: filters.subprogramme,
      column: (p) => `ch.sub_programme = ${p}`,
    },
  ]
  const locationPredicates: string[] = []
  for (const level of hierarchyLevels) {
    if (!level.value || exactCitationScope) continue
    locationPredicates.push(level.column(`$${paramIndex}`))
    params.push(level.value)
    paramIndex++
  }
  if (exactCitationScope) {
    const exact = citationScopePredicates(exactCitationScope, paramIndex)
    params.push(...exact.params)
    paramIndex += exact.params.length
    clauses.push(`EXISTS (
      SELECT 1 FROM ppb2026.source_document_citations ch
      LEFT JOIN ppb2026.budget_documents bdh ON ch.origin_document ~ bdh.match_pattern
      WHERE ch.ppb_full_document_symbol = d.ppb_full_document_symbol
      AND ${exact.predicates.join(' AND ')} AND ${versionClause('ch')}
    )`)
  } else if (hasBudgetLocation) {
    if (filters.budget_document) {
      locationPredicates.push(`bdh.doc_type = $${paramIndex}`)
      params.push(filters.budget_document)
      paramIndex++
    } else {
      locationPredicates.push(filters.budget_group ? "bdh.doc_type = 'pko'" : "bdh.doc_type = 'ppb'")
    }
    if (hierarchyLevels.some(level => level.value)) locationPredicates.push("bdh.doc_type = 'ppb'")
    if (filters.entity) {
      locationPredicates.push(`ch.entity = $${paramIndex}`)
      params.push(filters.entity)
      paramIndex++
    }
    if (filters.budget_group) {
      locationPredicates.push("bdh.doc_type = 'pko'")
      locationPredicates.push("ch.entity IS NOT NULL AND ch.entity <> ''")
      if (filters.budget_group === 'support') locationPredicates.push("(ch.section_title LIKE 'Administrative and budgetary aspects%') IS TRUE")
      else if (filters.budget_group === 'missions') locationPredicates.push("(ch.section_title LIKE 'Administrative and budgetary aspects%') IS NOT TRUE")
      else locationPredicates.push('FALSE')
    }
    clauses.push(`
      EXISTS (
        SELECT 1 FROM ppb2026.source_document_citations ch
        JOIN ppb2026.budget_documents bdh
          ON ch.origin_document ~ bdh.match_pattern
        WHERE ch.ppb_full_document_symbol = d.ppb_full_document_symbol
        AND ${locationPredicates.join(' AND ')}
        AND ${versionClause('ch')}
      )
    `)
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

  // Subject filter — Digital Library subjects (TEXT[]) surfaced on the matview.
  //
  // EXACT heading match, not a substring one. The facet counts (getSubjectOptions,
  // getSubjectHierarchy) are computed per distinct heading, so a LIKE '%x%' filter
  // returned a strictly larger set than the number the user clicked: `Terrorism`
  // showed 66 but returned 93, because it also matched `Counter-Terrorism`,
  // `Terrorism Financing`, etc. Case/whitespace are normalised on both sides
  // because the pill carries the title-cased display form of the heading while
  // the array holds the raw one.
  if (filters.subject) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM UNNEST(d.subjects) s
        WHERE LOWER(TRIM(s)) = $${paramIndex}
      )
    `)
    params.push(filters.subject.trim().toLowerCase())
    paramIndex++
  }

  // Subject-domain filter — the top level of the UNBIS subject hierarchy
  // (/subjects page). A document matches if any of its subject headings maps to
  // this domain in ppb2026.subject_thesaurus. Unmapped headings (sub-national
  // place names) get an effective domain of '17' (Geographical Descriptors),
  // exactly as getSubjectHierarchy routes them, so the filter and the page agree.
  if (filters.subject_domain) {
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM UNNEST(d.subjects) s
        LEFT JOIN ppb2026.subject_thesaurus t
          ON t.subject_norm = UPPER(TRIM(s))
        WHERE TRIM(s) <> ''
          AND COALESCE(t.domain_code, '17') = $${paramIndex}
      )
    `)
    params.push(filters.subject_domain)
    paramIndex++
  }

  // Document type filter — the grouped label the facets render, OR the raw
  // stored value. The second arm is the predicate exactly as it stood, kept
  // because the app itself minted links for every value of the old long tail
  // (the type pills' href is /secretariat?document_type=<stored value>), so
  // URLs like ?document_type=Letters are already in shared links and browser
  // history. Without that arm they resolve to the grouped label, match
  // nothing, and return an empty table with no error and no explanation.
  if (filters.document_type) {
    clauses.push(`(
      LOWER(${documentTypeGroupExpr('d.ppb_type')}) = LOWER($${paramIndex})
      OR LOWER(d.ppb_type) = LOWER($${paramIndex})
    )`)
    params.push(filters.document_type)
    paramIndex++
  }

  // Agenda item filter — Digital Library agenda_items (JSONB [{doc,item,desc,topic}]);
  // the agenda title is the natural-language "desc". Exact match on that title,
  // for the same reason as the subject filter: getAgendaItemOptions counts one
  // row per distinct "desc", so a substring match would return more documents
  // than the count the user clicked.
  if (filters.related_scope) {
    const related = relatedResolutionPredicate(filters.related_scope, paramIndex)
    clauses.push(related.predicate)
    params.push(...related.params)
    paramIndex += related.params.length
  } else if (filters.agenda_scope) {
    const agenda = agendaResolutionPredicate(parseAgendaScope(filters.agenda_scope),paramIndex,agendaSymbols)
    clauses.push(agenda.predicate)
    params.push(...agenda.params)
    paramIndex+=agenda.params.length
  } else if (filters.agenda_item) {
    clauses.push(`
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(d.agenda_items, '[]'::jsonb)) a
        WHERE LOWER(TRIM(a->>'desc')) = $${paramIndex}
      )
    `)
    params.push(filters.agenda_item.trim().toLowerCase())
    paramIndex++
  }

  // Keyword search: the same query grammar as the paragraph search on the
  // detail page (search-query.ts), over KEYWORD_SEARCH_FIELDS. Terms are
  // ANDed, a quoted span is one phrase, a leading minus excludes; a term
  // matches a row if it appears in any of the fields, and an excluded term
  // rejects the row if it appears in any of them. A query that parses to no
  // terms — whitespace, a bare minus, an empty quote pair — is no search.
  // Every count on the page comes through this clause, so the list, its
  // total, the grouped view and the facets all read the same filtered set.
  if (filters.keyword) {
    const search = buildSearchPredicate(
      parseSearchQuery(filters.keyword),
      KEYWORD_SEARCH_FIELDS,
      paramIndex
    )
    if (search.clause) {
      clauses.push(search.clause)
      params.push(...search.params)
      paramIndex += search.params.length
    }
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

  return {
    clauses,
    params: [...params, ...havingParams],
    havingClauses,
    versionClause,
    versionParam,
  }
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
  opts: { selectCols: string; groupCols: string; name?: string; agendaSymbols: string[] | undefined }
): {
  cte: string
  params: SqlParam[]
  versionClause: (alias: string) => string
  versionParam: string
} {
  const { clauses, params, havingClauses, versionClause, versionParam } =
    buildFilterClauses(filters, opts.agendaSymbols)
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

  return { cte, params, versionClause, versionParam }
}

/**
 * Faceting is CONJUNCTIVE: every count on the page honours every active
 * filter, its own dimension included.
 *
 * This used to be disjunctive — each facet dropped its own value before
 * counting (the `omitOwnDimension` helper), which is the standard rule for
 * MULTI-select facets: without it, ticking one value zeroes its siblings and
 * you can never add a second. Our filters are single-select (`organ?: string`,
 * not `string[]`), so that rule only bought the ability to switch sibling
 * values without clearing first — which the active-filter chip already gives.
 *
 * What it cost was steep: each facet needed its own row set, so no two facet
 * queries could share one. Conjunctive means every aggregate on the page reads
 * the SAME filtered set, which is what lets them collapse into a single query
 * instead of ~21 that each rebuild the same CTE.
 *
 * Consequence to keep in mind in the UI: selecting a value collapses that
 * panel to the value, so the chip that clears it must stay visible.
 */

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
    case 'similarity_desc':
      return 'ORDER BY c.similarity_to_previous DESC NULLS LAST, c.ppb_full_document_symbol ASC'
    case 'similarity_asc':
      return 'ORDER BY c.similarity_to_previous ASC NULLS LAST, c.ppb_full_document_symbol ASC'
    case 'word_count_desc':
      return 'ORDER BY c.word_count DESC NULLS LAST, c.ppb_full_document_symbol ASC'
    case 'word_count_asc':
      return 'ORDER BY c.word_count ASC NULLS LAST, c.ppb_full_document_symbol ASC'
    case 'year_desc':
      return 'ORDER BY c.ppb_year DESC NULLS LAST'
    case 'year_asc':
      return 'ORDER BY c.ppb_year ASC NULLS LAST'
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
  options: { page?: number; limit?: number; includeMetrics?: boolean } = {}
): Promise<{ mandates: Mandate[]; totalCount: number }> {
  const { page, limit } = normalizePagination(options.page, options.limit)
  const offset = (page - 1) * limit

  const metricSort = [
    'similarity_asc',
    'similarity_desc',
    'word_count_asc',
    'word_count_desc',
  ].includes(filters.sort_by ?? '')
  const { cte: baseCte, params } = buildFilteredDocsCTE(filters, {
    agendaSymbols: await agendaScopeSymbols(filters),
    name: metricSort ? 'base_filtered_docs' : 'filtered_docs',
    selectCols: `
        d.ppb_full_document_symbol,
        d.ppb_link,
        d.ppb_year,
        d.ppb_body,
        d.ppb_description,
        d.display_title,
        d.ppb_type,
        d.subjects,
        d.agenda_items,
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
          'stream', (SELECT bd.doc_type FROM ppb2026.budget_documents bd WHERE c.origin_document ~ bd.match_pattern LIMIT 1),
          'part', c.budget_part_number,
          'part_title', bp.part_title,
          'section', c.section,
          'section_title', c.section_title,
          'programme', c.programme,
          'programme_title', c.programme_title,
          'entity', c.entity,
          'subprogramme', ${subProgrammeExpr('c.sub_programme')},
          'subprogramme_number', c.sub_programme_number,
          'is_support', (c.section_title LIKE 'Administrative and budgetary aspects%'),
          'part_sort', bp.sort_order
        )) FILTER (WHERE c.origin_document IS NOT NULL) as budget_locations,
        ARRAY_AGG(DISTINCT c.origin_document) FILTER (WHERE c.origin_document IS NOT NULL) as origin_documents`,
    groupCols:
      'd.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body, d.ppb_description, d.display_title, d.ppb_type, d.subjects, d.agenda_items',
  })

  // Reuse display eligibility so stale or ambiguous scores sort as missing.
  // Only metric sorting needs this lookup across the full filtered set.
  const cte = metricSort
    ? `${baseCte}, sort_metrics AS (
        ${buildTextMetricsSql('SELECT ppb_full_document_symbol AS symbol FROM base_filtered_docs')}
      ), filtered_docs AS (
        SELECT d.*, tm.word_count, tm.similarity_to_previous
        FROM base_filtered_docs d
        LEFT JOIN sort_metrics tm ON tm.symbol = d.ppb_full_document_symbol
      )`
    : baseCte

  // Bind a value and return its 1-based placeholder index. Using the index
  // returned by the push itself (instead of params.length + N arithmetic)
  // means later params can be appended without silently corrupting earlier
  // placeholders.
  const bind = (value: SqlParam): number => params.push(value)

  // Ordering under a keyword: rows whose symbol is the query first, then
  // symbol-prefix matches, then title or description matches, then the rest
  // (subject-only matches). The rank reads the positive terms of the parsed
  // query — an excluded term has already removed its rows and says nothing
  // about the ones left — and at each level every positive term has to hold:
  // the symbol equals the query only when the query is one term, a prefix
  // match means every term is in the symbol and the first begins it, and a
  // title match means every term is in the title or the description. A query
  // with no positive terms has nothing to rank by and keeps the default sort.
  const rankTerms = filters.keyword ? positiveTerms(filters.keyword) : []
  let keywordRankExpr = ''
  if (rankTerms.length > 0) {
    const symbol = searchFoldSql('c.ppb_full_document_symbol')
    const title = searchFoldSql("COALESCE(c.display_title, '')")
    const description = searchFoldSql("COALESCE(c.ppb_description, '')")
    const exactSymbol =
      rankTerms.length === 1 ? `${symbol} = $${bind(rankTerms[0].term)}` : 'false'
    const symbolPrefix = rankTerms
      .map(({ term }, i) =>
        i === 0
          ? `${symbol} LIKE $${bind(likePrefixPattern(term))}`
          : `${symbol} LIKE $${bind(likePattern(term))}`
      )
      .join(' AND ')
    const inTitle = rankTerms
      .map(({ term }) => {
        const pattern = bind(likePattern(term))
        return `(${title} LIKE $${pattern} OR ${description} LIKE $${pattern})`
      })
      .join(' AND ')
    keywordRankExpr = `,
      CASE
        WHEN ${exactSymbol} THEN 0
        WHEN ${symbolPrefix} THEN 1
        WHEN ${inTitle} THEN 2
        ELSE 3
      END AS keyword_rank`
  }

  // Default sort: most citing entities first, in BOTH modes.
  //
  // all_resolutions used to default to year_desc, which was defensible while it
  // was an opt-in tab. It is now the DEFAULT mode, so that would open the page
  // on the newest 15 of ~43,000 documents — the 2,737 budget-cited ones (the
  // subject of this site) would be nowhere near the first page. It also
  // disagreed with the table header, which has always drawn its sort indicator
  // at citing_entities_desc when sort_by is absent (MandateDataTable).
  const effectiveSortBy = filters.sort_by || 'citing_entities_desc'

  // When keyword is active with no explicit sort, rank by relevance only.
  // When an explicit sort_by is chosen, use relevance as primary then the chosen sort.
  const orderBy = keywordRankExpr
    ? filters.sort_by
      ? `ORDER BY keyword_rank ASC, ${buildOrderByClause(filters.sort_by).replace('ORDER BY ', '')}`
      : 'ORDER BY keyword_rank ASC'
    : buildOrderByClause(effectiveSortBy)

  // Series facts joined by symbol. The matview has 14 known duplicate
  // symbols (distinct recids), so dedupe to keep the join 1:1.
  const seriesLookupCte = `series_lookup AS (
      SELECT DISTINCT ON (document_symbol)
        document_symbol, series_key, un_body AS series_organ, doc_type,
        series_count, is_collection, has_newer, is_latest, superseded_by
      FROM digitallibrary.resolution_series
      ORDER BY document_symbol, recid
    )`
  const seriesCols = `
      rs.superseded_by,
      rs.is_collection,
      rs.has_newer,
      rs.is_latest,
      rs.series_count`

  // Subject/agenda/display-title metadata now rides on the matview (d.subjects,
  // d.agenda_items, d.display_title) and flows through filtered_docs -> c.*, so
  // no source_documents_metadata_clean join is needed here anymore.

  // Main query. filtered_docs (membership + version-scoped citation
  // aggregates) comes from the shared builder.
  //
  // Grouped mode (filters.group === '1') collapses the FILTERED rows to one
  // representative per resolution series (newest matching member). Grouping
  // after filtering means every filter — including keyword search — applies
  // to members, so a search hitting an old version still surfaces its group.
  // Members for inline expansion are attached per page row via LATERAL,
  // strictly after LIMIT so only the visible page pays for it.
  const grouped = filters.group === '1'
  let query: string
  if (grouped) {
    // buildOrderByClause references m./c. aliases; inside page_ord those are
    // plain columns of the page CTE, so strip the qualifiers.
    const outerOrderBy = orderBy.replace(/\b[mc]\./g, '')
    query = `
    /* trace:mandates.list-grouped */
    WITH ${cte},
    ${seriesLookupCte},
    enriched AS (
      SELECT f.*,${seriesCols},
        COALESCE(rs.series_key || '¦' || rs.series_organ || '¦' || rs.doc_type,
                 'sym:' || f.ppb_full_document_symbol) AS grp_key
      FROM filtered_docs f
      LEFT JOIN series_lookup rs
        ON rs.document_symbol = f.ppb_full_document_symbol
    ),
    ranked AS (
      SELECT e.*,
        COUNT(*) OVER (PARTITION BY e.grp_key) AS group_size,
        MIN(e.ppb_year) OVER (PARTITION BY e.grp_key) AS group_min_year,
        MAX(e.ppb_year) OVER (PARTITION BY e.grp_key) AS group_max_year,
        ROW_NUMBER() OVER (
          PARTITION BY e.grp_key
          ORDER BY e.ppb_year DESC NULLS LAST, e.ppb_full_document_symbol DESC
        ) AS grp_rn
      FROM enriched e
    ),
    counted AS (
      SELECT *, COUNT(*) OVER() as total_count
      FROM ranked
      WHERE grp_rn = 1
    ),
    page AS (
      SELECT
        c.*${keywordRankExpr}
      FROM counted c
      ${orderBy}
      LIMIT $${bind(limit)} OFFSET $${bind(offset)}
    ),
    page_ord AS (
      SELECT p.*, ROW_NUMBER() OVER (${outerOrderBy}) AS page_ord
      FROM page p
    )
    SELECT po.*, gm.group_members
    FROM page_ord po
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'symbol', x.ppb_full_document_symbol,
                 'year', x.ppb_year,
                 'title', x.ppb_description
               )
             ) AS group_members
      FROM (
        SELECT e2.ppb_full_document_symbol, e2.ppb_year, e2.ppb_description
        FROM enriched e2
        WHERE e2.grp_key = po.grp_key
          AND e2.ppb_full_document_symbol <> po.ppb_full_document_symbol
        ORDER BY e2.ppb_year DESC NULLS LAST, e2.ppb_full_document_symbol DESC
        LIMIT 100
      ) x
    ) gm ON true
    ORDER BY po.page_ord
  `
  } else {
    query = buildUngroupedListSql({
      filteredCte: cte,
      keywordRank: keywordRankExpr,
      limitParam: `$${bind(limit)}`,
      offsetParam: `$${bind(offset)}`,
      orderBy,
      seriesColumns: seriesCols,
    })
  }

  const rows = await queryMany<MandateListRow>(query, params)

  if (rows.length === 0) {
    return { mandates: [], totalCount: 0 }
  }

  const totalCount = parseInt(rows[0]?.total_count ?? '0')

  // Transform DB rows to Mandate type
  const mandates: Mandate[] = rows.map((row) => ({
    series:
      row.series_count != null
        ? {
            superseded_by: row.superseded_by ?? null,
            is_collection: !!row.is_collection,
            has_newer: !!row.has_newer,
            is_latest: !!row.is_latest,
            series_count: row.series_count,
          }
        : null,
    group: grouped
      ? {
          size: parseInt(row.group_size ?? '1') || 1,
          min_year: row.group_min_year ?? null,
          max_year: row.group_max_year ?? null,
          members: row.group_members ?? [],
        }
      : undefined,
    full_document_symbol: row.ppb_full_document_symbol,
    document_symbol: row.ppb_full_document_symbol || null,
    num_citations: parseInt(row.num_citations) || 0,
    num_entities: parseInt(row.num_entities) || 0,
    entities: row.entities || [],
    foundational_entities: row.foundational_entities || [],
    link: getDocumentPdfUrl(row.ppb_full_document_symbol),
    year: row.ppb_year?.toString() || '',
    body: row.ppb_body || '',
    description: row.ppb_description || null,
    display_title: row.display_title || null,
    type: row.ppb_type || 'Unknown',
    // Metadata fields (from the Digital Library, via the matview)
    uniform_title: null,
    proper_title: null,
    title: null,
    subtitle: null,
    subject_headings: dlSubjectHeadings(row.subjects),
    issuing_body: null,
    budget_locations: sortBudgetLocations(row.budget_locations),
    agenda_document_symbols: [],
    agenda_item_numbers: dlAgendaField(row.agenda_items, 'item'),
    agenda_item_titles: dlAgendaField(row.agenda_items, 'desc'),
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

  if (options.includeMetrics !== false) {
    return { mandates: await enrichTextMetrics(mandates), totalCount }
  }
  return { mandates, totalCount }
}

/** Revalidate content fingerprints after the hour-long document-list cache. */
async function enrichTextMetrics(mandates: Mandate[]): Promise<Mandate[]> {
  const metrics = await getDocumentTextMetrics(mandates.flatMap((m) => [
    m.full_document_symbol,
    ...(m.group?.members.map((member) => member.symbol) ?? []),
  ]))
  return mandates.map((mandate) => ({
    ...mandate,
    text_metrics: metrics.get(mandate.full_document_symbol),
    group: mandate.group ? {
      ...mandate.group,
      members: mandate.group.members.map((member) => ({
        ...member, text_metrics: metrics.get(member.symbol),
      })),
    } : undefined,
  }))
}

interface LocationCitationCountRow {
  entity: string
  stream: DetailBudgetLocation['stream']
  part: string | null
  section: string | null
  sub_programme: string | null
  number: number | null
  support: boolean | null
  entity_level: number
  total_citations: string
}

/** Independent entity totals and exact location totals from the same version. */
async function getLocationCitationCounts(
  entities: string[],
  version?: string | null
): Promise<{ locations: Map<string, number>; entities: Record<string, number> }> {
  const result = { locations: new Map<string, number>(), entities: {} as Record<string, number> }
  if (!entities.length) return result
  const query = `
    /* trace:mandates.detail-location-citation-counts */
    WITH sites AS (
      SELECT c.entity, c.ppb_full_document_symbol,
        bd.doc_type AS stream,
        NULLIF(c.budget_part_number, '') AS part,
        NULLIF(c.section, '') AS section,
        NULLIF(${subProgrammeExpr('c.sub_programme')}, '') AS sub_programme,
        CASE WHEN NULLIF(${subProgrammeExpr('c.sub_programme')}, '') IS NULL
          THEN NULL ELSE c.sub_programme_number END AS number,
        CASE WHEN bd.doc_type = 'pko' THEN
          COALESCE(c.section_title LIKE 'Administrative and budgetary aspects%', FALSE)
          ELSE NULL END AS support
      FROM ppb2026.source_document_citations c
      LEFT JOIN ppb2026.budget_documents bd ON c.origin_document ~ bd.match_pattern
      JOIN public.unified_documents d ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      WHERE c.entity = ANY($1::text[]) AND ${versionPredicateSql('c', '$2')}
    )
    SELECT entity, stream, part, section, sub_programme, number, support,
      GROUPING(stream) AS entity_level,
      COUNT(DISTINCT ppb_full_document_symbol)::text AS total_citations
    FROM sites
    GROUP BY GROUPING SETS (
      (entity), (entity, stream, part, section, sub_programme, number, support)
    )`
  const rows = await queryMany<LocationCitationCountRow>(query, [entities, version ?? null])
  for (const row of rows) {
    const count = Number(row.total_citations)
    if (Number(row.entity_level) === 1) result.entities[row.entity] = count
    else result.locations.set(citationScopeKey({
      entity: row.entity, stream: row.stream, part: row.part, section: row.section,
      subprogramme: row.sub_programme, number: row.number, support: row.support,
    }), count)
  }
  return result
}

/**
 * The generic-subprogramme label PPB 2026 uses where PPB 2027 uses NULL.
 * Mirrors `subProgrammeExpr`'s NULLIF on the application side, so a
 * `BudgetLocation` built from either edition looks the count up the same way.
 */
function normalizeSubprogramme(subprogramme: string | null): string | null {
  return subprogramme === GENERIC_SUBPROGRAMME_LABEL ? null : subprogramme
}

/**
 * Fetch detailed citation info for a specific mandate
 * Used for enriching individual mandates on detail pages
 *
 * Retains every citing entity and every distinct citation site, including
 * PKO, Plan Outline and sites outside the named subprogramme structure.
 * Entity totals and exact location totals count distinct documents separately.
 */
export async function getMandateCitations(
  symbol: string,
  version?: string | null
): Promise<{
  citations: Mandate['citation_info']
  budgetLocations: BudgetLocation[]
  foundationalEntities: string[]
  detailBudgetLocations: DetailBudgetLocation[]
  entityCitationTotals: Record<string, number>
}> {
  const query = `
    /* trace:mandates.detail-citations */
    SELECT
      c.origin_document,
      bd.doc_type AS stream,
      (c.section_title LIKE 'Administrative and budgetary aspects%') AS is_support,
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
    LEFT JOIN ppb2026.budget_documents bd ON c.origin_document ~ bd.match_pattern
    LEFT JOIN ppb2026.budget_parts bp ON bp.part_number = c.budget_part_number
    WHERE c.ppb_full_document_symbol = $1
      AND ${versionPredicateSql('c', '$2')}
    ORDER BY c.entity, c.programme
  `

  const rows = await queryMany<CitationQueryRow>(query, [symbol, version ?? null])

  const citingEntities = [
    ...new Set(rows.map((row) => row.entity).filter((e): e is string => !!e)),
  ]
  const locationCitationCounts = await getLocationCitationCounts(
    citingEntities,
    version
  )

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

  // Narrative and legislative-list occurrences at the same scope share one child.
  // Keep every stream and every genuine null location; only entities are required.
  const detailSeen = new Map<string, DetailBudgetLocation>()
  for (const row of rows) {
    if (!row.entity) continue
    const location: DetailBudgetLocation = {
      stream: row.stream,
      part: row.budget_part_number || null,
      part_title: row.part_title,
      section: row.section || null,
      section_title: row.section_title,
      programme: row.programme,
      programme_title: row.programme_title,
      entity: row.entity,
      entity_long: row.entity_long,
      subprogramme: normalizeSubprogramme(row.sub_programme) || null,
      subprogramme_number: normalizeSubprogramme(row.sub_programme) ? row.sub_programme_number : null,
      is_support: row.stream === 'pko' ? !!row.is_support : undefined,
    }
    const key = citationScopeKey(citationScope(location))
    location.total_citations_at_location = locationCitationCounts.locations.get(key) ?? null
    if (!detailSeen.has(key)) detailSeen.set(key, location)
  }
  const detailBudgetLocations = [...detailSeen.values()]

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
    budgetLocations: sortBudgetLocations(detailBudgetLocations.filter((location): location is BudgetLocation => location.stream !== null)),
    detailBudgetLocations,
    entityCitationTotals: locationCitationCounts.entities,
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
    /* trace:mandates.detail-document */
    SELECT
      d.ppb_full_document_symbol,
      d.ppb_link,
      d.ppb_year,
      d.ppb_body,
      d.ppb_description,
      d.display_title,
      d.ppb_type,
      d.subjects,
      d.agenda_items,
      COUNT(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as num_entities,
      COUNT(c.id) as num_citations,
      ARRAY_AGG(DISTINCT c.entity) FILTER (WHERE c.entity IS NOT NULL) as entities
    FROM public.unified_documents d
    LEFT JOIN ppb2026.source_document_citations c
      ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
      AND ${versionPredicateSql('c', '$2')}
    WHERE d.ppb_full_document_symbol = $1
    GROUP BY
      d.ppb_full_document_symbol, d.ppb_link, d.ppb_year, d.ppb_body,
      d.ppb_description, d.display_title, d.ppb_type, d.subjects, d.agenda_items
  `

  const row = await queryOne<MandateListRow>(query, [symbol, version ?? null])
    ?? await getHistoricalDocument(symbol)
  if (!row) return null

  // Fetch citations separately for the detail view
  const { citations, budgetLocations, foundationalEntities, detailBudgetLocations, entityCitationTotals } =
    await getMandateCitations(symbol, version)

  return {
    full_document_symbol: row.ppb_full_document_symbol,
    document_symbol: row.ppb_full_document_symbol || null,
    num_citations: parseInt(row.num_citations) || 0,
    num_entities: parseInt(row.num_entities) || 0,
    entities: row.entities || [],
    link: getDocumentPdfUrl(symbol),
    year: row.ppb_year?.toString() || '',
    body: row.ppb_body || '',
    description: row.ppb_description || null,
    display_title: row.display_title || null,
    type: row.ppb_type || 'Unknown',
    uniform_title: null,
    proper_title: null,
    title: null,
    subtitle: null,
    subject_headings: dlSubjectHeadings(row.subjects),
    issuing_body: null,
    agenda_document_symbols: dlAgendaField(row.agenda_items, 'doc'),
    agenda_item_numbers: dlAgendaField(row.agenda_items, 'item'),
    agenda_item_titles: dlAgendaField(row.agenda_items, 'desc'),
    citation_info: citations,
    budget_locations: budgetLocations,
    detail_budget_locations: detailBudgetLocations,
    citation_entity_totals: entityCitationTotals,
    foundational_entities: foundationalEntities,
  }
}

/**
 * Resolution series (migration 021): all documents sharing this symbol's
 * normalized title + organ, newest first. Returns null when the document is
 * not in a recurring group (singleton, SC number-only title, or not a /RES/
 * document), so callers can simply skip rendering.
 *
 * Claims follow the two-tier model: `superseded_by` is only non-null when
 * every safety gate passed (non-collection group, unambiguous latest doc);
 * `is_collection` groups get the weaker "newer related resolutions exist"
 * semantics and must never be presented as ordered versions.
 */
export interface ResolutionSeriesMember {
  text_metrics?: DocumentTextMetrics
  document_symbol: string
  title: string | null
  year: number | null
  is_latest: boolean
}

export interface ResolutionSeriesInfo {
  series_count: number
  first_year: number | null
  last_year: number | null
  is_collection: boolean
  has_newer: boolean
  is_latest: boolean
  superseded_by: string | null
  members: ResolutionSeriesMember[]
}

interface SeriesRow {
  document_symbol: string
  title: string | null
  year: number
  member_is_latest: boolean
  series_count: number
  series_first_year: number
  series_last_year: number
  is_collection: boolean
  has_newer: boolean
  doc_is_latest: boolean
  superseded_by: string | null
}

export async function getResolutionSeries(
  symbol: string
): Promise<ResolutionSeriesInfo | null> {
  const query = `
    /* trace:mandates.resolution-series */
    WITH me AS (
      SELECT series_key, un_body, doc_type, is_collection, has_newer,
             is_latest, superseded_by
      FROM digitallibrary.resolution_series
      WHERE document_symbol = $1
      LIMIT 1
    )
    SELECT
      rs.document_symbol,
      -- SC resolutions have a number-only plain title ("Resolution 2825
      -- (2026)"); display_title carries the descriptive one.
      COALESCE(d.display_title, d.title) AS title,
      rs.year,
      rs.is_latest AS member_is_latest,
      rs.series_count,
      rs.series_first_year,
      rs.series_last_year,
      me.is_collection,
      me.has_newer,
      me.is_latest AS doc_is_latest,
      me.superseded_by
    FROM me
    JOIN digitallibrary.resolution_series rs
      ON rs.series_key = me.series_key
     AND rs.un_body = me.un_body
     AND rs.doc_type = me.doc_type
    LEFT JOIN digitallibrary.documents d ON d.recid = rs.recid
    ORDER BY d.date_publication DESC NULLS LAST, rs.document_symbol DESC
  `
  const rows = await queryMany<SeriesRow>(query, [symbol])
  if (rows.length <= 1) return null

  const head = rows[0]
  const metrics = await getDocumentTextMetrics(rows.map((row) => row.document_symbol))
  return {
    series_count: head.series_count,
    first_year: head.series_first_year || null,
    last_year: head.series_last_year || null,
    is_collection: head.is_collection,
    has_newer: head.has_newer,
    is_latest: head.doc_is_latest,
    superseded_by: head.superseded_by,
    members: rows.map((r) => ({
      document_symbol: r.document_symbol,
      text_metrics: metrics.get(r.document_symbol),
      title: r.title,
      year: r.year || null,
      is_latest: r.member_is_latest,
    })),
  }
}

// ============================================================================
// Aggregation Queries (for sidebar and counts)
// ============================================================================

/** Raw shape of the one consolidated aggregate query. Counts arrive as strings
 *  (pg returns bigint as text) and lists as jsonb arrays. */
interface AggregateBundleRow {
  total_documents: string
  total_organs: string
  result_entities: string
  catalogue_citations: string
  catalogue_entities: string
  entity_counts: Array<[string, string | null, number]> | null
  year_counts: Array<[number, number]> | null
  subject_counts: Array<[string, number]> | null
  type_counts: Array<[string, number]> | null
  agenda_counts: Array<[string, number]> | null
  programme_counts: Array<[string, number]> | null
  citation_bins: Array<[string, number, number, number]> | null
}

/**
 * EVERY document-grained aggregate the explorer needs, in ONE query.
 *
 * This is the fix for the fan-out. Each of these numbers used to be its own
 * query, and each of those queries re-ran the same `filtered_docs` CTE over the
 * 43,912-row unified_documents matview: ~10 rebuilds of identical work per
 * uncached render, which is what saturated the 15-slot pool and hung the site.
 *
 * Postgres materialises a CTE that is referenced more than once, so gathering
 * the aggregates as sibling CTEs over one `filtered_docs` builds it exactly
 * once and every branch reads the materialised result. Measured on the same
 * database: 31,228 ms of work across the separate queries against 836 ms here.
 *
 * Each branch returns jsonb so a single row carries every list; the accessors
 * below unpack it and keep their original public shapes, so nothing upstream
 * of them changes.
 *
 * Only aggregates over the DOCUMENT grain (plus the two citation-grain lists
 * that need no hierarchy) live here. The nested directories — budget, subject,
 * organ, document-type catalogue — still run their own queries.
 */
const getFilteredAggregates = cache((filters: FilterOptions = {}) =>
  readDynamicCache(
    async () => {
      const { cte, params, versionClause, versionParam } =
        buildFilteredDocsCTE(filters, {
          agendaSymbols: await agendaScopeSymbols(filters),
          selectCols: `d.ppb_full_document_symbol, d.ppb_body, d.ppb_type,
            d.ppb_year, d.subjects, d.agenda_items,
            COUNT(c.id) AS citation_count`,
          groupCols: `d.ppb_full_document_symbol, d.ppb_body, d.ppb_type,
            d.ppb_year, d.subjects, d.agenda_items`,
        })

      const query = `
        /* trace:mandates.filtered-aggregates */
        WITH ${cte},
        cites AS (
          SELECT c.ppb_full_document_symbol AS sym, c.entity, c.programme_title
          FROM filtered_docs fd
          JOIN ppb2026.source_document_citations c
            ON fd.ppb_full_document_symbol = c.ppb_full_document_symbol
            AND ${versionClause('c')}
        ),
        ${subjectCountSql('filtered_docs')},
        agenda AS (
          SELECT fd.ppb_full_document_symbol AS sym, (elem->>'desc') AS item
          FROM filtered_docs fd
          CROSS JOIN LATERAL
            jsonb_array_elements(COALESCE(fd.agenda_items, '[]'::jsonb)) elem
        ),
        binned AS (
          SELECT
            CASE WHEN citation_count = 1 THEN '1'
                 WHEN citation_count BETWEEN 2 AND 5 THEN '2–5'
                 WHEN citation_count BETWEEN 6 AND 10 THEN '6–10'
                 ELSE '11+' END AS bin,
            CASE WHEN citation_count = 1 THEN 1
                 WHEN citation_count BETWEEN 2 AND 5 THEN 2
                 WHEN citation_count BETWEEN 6 AND 10 THEN 3
                 ELSE 4 END AS sort_order,
            CASE WHEN citation_count = 1 THEN 1
                 WHEN citation_count BETWEEN 2 AND 5 THEN 2
                 WHEN citation_count BETWEEN 6 AND 10 THEN 6
                 ELSE 11 END AS min_citations,
            CASE WHEN citation_count = 1 THEN 1
                 WHEN citation_count BETWEEN 2 AND 5 THEN 5
                 WHEN citation_count BETWEEN 6 AND 10 THEN 10
                 ELSE 999999 END AS max_citations
          FROM filtered_docs
        )
        SELECT
          (SELECT COUNT(*) FROM filtered_docs) AS total_documents,
          -- Card 1's figure. Joined to the organ vocabulary rather than counted
          -- straight off the column, so it counts the same population the panel
          -- it opens lists: a code with a row in ppb2026.organs and at least one
          -- document in view. Two observed values (SGB, DP) have no organ row
          -- and render nowhere — not as cards, not as filter options, not as
          -- heatmap rows — so counting them advertised a door that does not
          -- exist. The join subsumes the old IS NOT NULL: a null body matches no
          -- organ row. The documents behind those two are acknowledged in the
          -- directory's notes panel instead, which is where a fact the reader
          -- cannot navigate to belongs.
          (SELECT COUNT(DISTINCT fd.ppb_body) FROM filtered_docs fd
            JOIN ppb2026.organs o ON o.short = fd.ppb_body) AS total_organs,
          (SELECT COUNT(DISTINCT entity) FROM cites
            WHERE entity IS NOT NULL) AS result_entities,
          -- Catalogue-wide totals for the version on display: deliberately NOT
          -- filter-scoped (see getMandateCounts).
          (SELECT COUNT(*) FROM ppb2026.source_document_citations c
            WHERE ${versionPredicateSql('c', versionParam)}) AS catalogue_citations,
          (SELECT COUNT(DISTINCT c.entity) FROM ppb2026.source_document_citations c
            WHERE ${versionPredicateSql('c', versionParam)}
              AND c.entity IS NOT NULL) AS catalogue_entities,
          (SELECT jsonb_agg(jsonb_build_array(entity, entity_long, n)
                            ORDER BY n DESC)
             FROM (
               SELECT ct.entity, e.entity_long, COUNT(DISTINCT ct.sym)::int AS n
               FROM cites ct
               LEFT JOIN systemchart.entities e ON ct.entity = e.entity
               WHERE ct.entity IS NOT NULL AND ct.entity != ''
               GROUP BY ct.entity, e.entity_long
             ) x) AS entity_counts,
          (SELECT jsonb_agg(jsonb_build_array(y, n) ORDER BY y)
             FROM (
               SELECT ppb_year AS y, COUNT(DISTINCT ppb_full_document_symbol)::int AS n
               FROM filtered_docs WHERE ppb_year IS NOT NULL GROUP BY ppb_year
             ) x) AS year_counts,
          (SELECT jsonb_agg(jsonb_build_array(subject, n) ORDER BY n DESC, subject)
             FROM subject_counts) AS subject_counts,
          -- Grouped (documentTypeGroupExpr), so this facet and the explore
          -- modal's offer the same options with the same counts. The untyped
          -- remainder is still discarded here and only here: it arrives as
          -- NULL from the expression, and this filter has no footnote to
          -- disclose it in. The grouped label sorts last whatever its count,
          -- so a shift in the corpus cannot float it above a real type.
          (SELECT jsonb_agg(jsonb_build_array(value, n)
                            ORDER BY (value IS NOT DISTINCT FROM '${OTHER_DOCUMENT_TYPE_LABEL}'),
                                     n DESC, value)
             FROM (
               SELECT ${documentTypeGroupExpr('ppb_type')} AS value,
                      COUNT(DISTINCT ppb_full_document_symbol)::int AS n
               FROM filtered_docs
               GROUP BY 1
             ) x
            WHERE value IS NOT NULL) AS type_counts,
          (SELECT jsonb_agg(jsonb_build_array(item, n) ORDER BY n DESC, item)
             FROM (
               SELECT item, COUNT(DISTINCT sym)::int AS n
               FROM agenda WHERE item IS NOT NULL AND item != '' GROUP BY item
             ) x) AS agenda_counts,
          (SELECT jsonb_agg(jsonb_build_array(programme_title, n)
                            ORDER BY n DESC, programme_title)
             FROM (
               SELECT programme_title, COUNT(DISTINCT sym)::int AS n
               FROM cites
               WHERE programme_title IS NOT NULL AND programme_title != ''
               GROUP BY programme_title
             ) x) AS programme_counts,
          (SELECT jsonb_agg(jsonb_build_array(bin, n, mn, mx) ORDER BY so)
             FROM (
               SELECT bin, sort_order AS so, COUNT(*)::int AS n,
                      MIN(min_citations) AS mn, MIN(max_citations) AS mx
               FROM binned GROUP BY bin, sort_order
             ) x) AS citation_bins
      `

      const row = await queryOne<AggregateBundleRow>(query, params)
      return row
    },
    // -v2: total_organs now joins the organ vocabulary, so v1 entries hold a
    // count over a wider population than the surface it feeds now describes.
    // -v3: type_counts is grouped, so v2 entries hold the ungrouped long tail.
    ['filtered-aggregates-v4', JSON.stringify(filters)],
    { revalidate: 3600 }
  )
)

/**
 * Get total counts for the data cards
 */
export async function getMandateCounts(filters: FilterOptions = {}): Promise<{
  totalDocuments: number
  totalEntities: number
  totalOrgans: number
  totalCitations: number
}> {
  // Citations and UN Entities are catalogue-wide totals for the budget version
  // ON DISPLAY — they read as "what this budget cites", so they follow the
  // version lens rather than the active facet filters. They used to be pinned
  // to budget_versions.is_default, which made them contradict every other
  // number on the page as soon as the reader switched to the other version.
  // Source Documents and UN Organs stay filter-driven catalogue totals.
  //
  // totalOrgans is the same figure card 1 shows, so it narrowed when card 1 did:
  // it now counts only bodies the reader can reach. Nothing mounted renders it
  // today — HeaderStats, its only consumer, is not on any page — but a surface
  // that revives it inherits that population and the promise it makes.
  const row = await getFilteredAggregates(filters)

  return {
    totalDocuments: parseInt(row?.total_documents ?? '0'),
    totalEntities: parseInt(row?.catalogue_entities ?? '0'),
    totalOrgans: parseInt(row?.total_organs ?? '0'),
    totalCitations: parseInt(row?.catalogue_citations ?? '0'),
  }
}

/**
 * How many documents match `filters` — the single number behind the two
 * document tiles on /secretariat.
 *
 * Deliberately the SAME CTE the list query counts over (buildFilteredDocsCTE ->
 * COUNT(*) OVER() in getMandates), so the tile can only ever show the number of
 * rows the table would return for the same filters. It is a separate, narrower
 * query than getMandateCounts purely because that one also runs two
 * catalogue-wide citation/entity subqueries this does not need.
 *
 * Not honoured: `group` (the "group versions" toggle), which collapses the list
 * to one row per resolution series *after* filtering. The tiles therefore always
 * state the ungrouped document count; the table's own pagination line states the
 * grouped one.
 */
export const getFilteredDocumentCount = cache((filters: FilterOptions = {}) =>
  readDynamicCache(
    async () => {
      // Deliberately its own narrow query rather than a read off
      // getFilteredAggregates. The explore cards ask for this count under two
      // EXTRA scopes (cited on, cited ignored) that need nothing else from the
      // bundle, and making each of those compute every facet would cost far
      // more than the two small counts it saves.
      const { cte, params } = buildFilteredDocsCTE(filters, {
        agendaSymbols: await agendaScopeSymbols(filters),
        selectCols: 'd.ppb_full_document_symbol',
        groupCols: 'd.ppb_full_document_symbol',
      })
      const row = await queryOne<{ count: string }>(
        `/* trace:mandates.filtered-document-count */
         WITH ${cte} SELECT COUNT(*) AS count FROM filtered_docs`,
        params
      )
      return parseInt(row?.count ?? '0', 10)
    },
    // -v2: the filter shape changed (`mode` -> `cited` + an always-applied
    // version lens), so v1 entries would answer a question no longer asked.
    ['filtered-document-count-v3', JSON.stringify(filters)],
    { revalidate: 3600 }
  )
)

/**
 * How many distinct organs and citing entities are present in the current
 * result set — the numbers on explore cards 1 and 4.
 *
 * These honour EVERY active filter, their own dimension included: filtering to
 * one organ makes the organs card read 1, because that is how many organs the
 * table below it is showing. The own-dimension exclusion belongs to the option
 * LISTS inside the panels (getOrganHierarchy, getBudgetHierarchy), which must
 * keep offering the values you could switch to; it has no business in a number
 * that claims to describe what you are looking at.
 *
 * Both are "distinct values of this dimension in the result set", which is not
 * always the same as "the value you filtered by". `organ` is a property of the
 * document, so organ=GA gives exactly 1. `entity` is a property of a citation,
 * so entity=DESA gives every entity that cites the documents DESA cites —
 * matching the entities the table's own column shows on those rows.
 */
export const getFilteredDimensionCounts = async (
  filters: FilterOptions = {}
): Promise<{ organs: number; entities: number }> => {
  const row = await getFilteredAggregates(filters)
  return {
    organs: parseInt(row?.total_organs ?? '0', 10),
    entities: parseInt(row?.result_entities ?? '0', 10),
  }
}

/**
 * The scopes the four /secretariat explore cards are computed in. Exported so
 * the page and the cards derive them from ONE definition instead of copies that
 * can drift apart.
 *
 * ONE rule: every card number honours every active filter. No exceptions — a
 * card describes the result set, so filtering to one organ makes the organs
 * card read 1. Option LISTS inside the panels are the separate case: each drops
 * its own dimension (getOrganHierarchy drops `organ`, and so on) because a
 * facet whose own value constrains its own list collapses to that value and can
 * never be changed. Nothing is pinned or forced, which is why panel selections
 * can be purely additive.
 *
 * - `facets`    — the active filters minus what cannot change a count
 *                 (pagination, grouping, sort). What every card is counted
 *                 under, and the cache key.
 * - `allDocuments` — `facets` with `cited` ignored. The ONLY scope that departs
 *                 from the active filters, and only because it backs the "All
 *                 documents" option of the cited/all chooser itself: an option
 *                 must state the count it would produce, not the current one.
 * - `cited`     — `facets` with `cited` on. Backs the other option, and card 3.
 *
 * `ppb_version` is never touched by any of them: it is the lens all of this is
 * read through, not a dimension any card owns.
 */
export function exploreCardScopes(filters: FilterOptions): {
  facets: FilterOptions
  allDocuments: FilterOptions
  cited: FilterOptions
} {
  const facets: FilterOptions = {
    ...filters,
    page: undefined,
    limit: undefined,
    group: undefined,
    sort_by: undefined,
  }
  return {
    facets,
    allDocuments: { ...facets, cited: undefined },
    cited: { ...facets, cited: '1' },
  }
}

export interface ExploreCardData {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
  /** Distinct organs in the result set — card 1. */
  organCount: number
  /** Distinct citing entities in the result set — card 4. */
  entityCount: number
  /** Documents under the active filters with `cited` ignored — the "All
   * documents" option of the cited/all chooser, and card 2 whenever that filter
   * is off (when it is off, the two are the same number). */
  allDocumentsCount: number
  /** Documents under the active filters with `cited` on — the "Cited only"
   * option, and card 3. */
  citedDocumentCount: number
}

/**
 * Everything the four explore cards and their panels need, as one cached unit.
 *
 * Cached together because they are one screenful that is always fetched
 * together, and because two of them (the subject hierarchy over ~43,000
 * documents, the budget hierarchy's three GROUPING SETS queries) are slow enough
 * — ~3s uncached, all six in parallel — to be worth not repeating per request.
 * They render outside the explorer's Suspense boundary, so they are on the
 * critical path for first paint.
 */
export const getExploreCardData = cache((filters: FilterOptions = {}) => {
  const { facets, allDocuments, cited } = exploreCardScopes(filters)
  return readDynamicCache(
    async (): Promise<ExploreCardData> => {
      const [
        organGroups,
        budgetStreams,
        subjectDomains,
        documentTypes,
        dimensionCounts,
        allDocumentsCount,
        citedDocumentCount,
      ] = await Promise.all([
        // The four directories back the panels' option LISTS, so each drops its
        // own dimension internally to stay navigable. Every other filter
        // applies, so a node's count is what the table returns when clicked.
        getOrganHierarchy(facets),
        // Backs BOTH the entity directory (card 4) and the budget-location tree
        // inside card 3, so those two can never state different numbers for the
        // same entity.
        getBudgetHierarchy(facets),
        getSubjectHierarchy(facets),
        getDocumentTypeCatalogue(facets),
        // Cards 1 and 4 — the result set as it is, own dimension included.
        getFilteredDimensionCounts(facets),
        // The two options of the cited/all chooser. Card 2 is whichever one the
        // active filters select (see DirectoryExplorer).
        getFilteredDocumentCount(allDocuments),
        getFilteredDocumentCount(cited),
      ])
      return {
        organGroups,
        budgetStreams,
        subjectDomains,
        documentTypes,
        organCount: dimensionCounts.organs,
        entityCount: dimensionCounts.entities,
        allDocumentsCount,
        citedDocumentCount,
      }
    },
    // -v4: this payload embeds the organ hierarchy, whose categories and
    // membership changed, and card 1's count narrowed with it. Bumping the
    // hierarchy key alone would leave THIS entry serving the old groups for the
    // full hour — the two have to move together or the change deploys green and
    // renders nothing.
    ['explore-card-data-v5', JSON.stringify(facets)],
    { revalidate: 3600 }
  )
})

/**
 * The four card figures in their FULL state: the card-owned selections (organ,
 * entity, cited) dropped, every other filter — the version lens above all —
 * kept. See exploreCardBaselineFilters for why the line is drawn there.
 *
 * Deliberately a counts-only fetch rather than a second getExploreCardData
 * call: the comparison needs the four figures and nothing else, and the wide
 * call would also compute four panel hierarchies (two of them ~3s uncached)
 * for a scope nobody is rendering. The three reads below go through the same
 * per-query caches getExploreCardData itself uses, so on the unfiltered
 * landing view they resolve from the very entries the page has already
 * warmed, and on filtered views the baseline is one extra cache entry per
 * lens, shared by every filtered view under it.
 */
export const getExploreCardBaseline = cache(
  async (filters: FilterOptions = {}): Promise<ExploreCardFigures> => {
    const { facets, allDocuments, cited } = exploreCardScopes(
      exploreCardBaselineFilters(filters)
    )
    const [dimensionCounts, documentsCount, citedDocumentCount] =
      await Promise.all([
        getFilteredDimensionCounts(facets),
        getFilteredDocumentCount(allDocuments),
        getFilteredDocumentCount(cited),
      ])
    return {
      organCount: dimensionCounts.organs,
      entityCount: dimensionCounts.entities,
      documentsCount,
      citedDocumentCount,
    }
  }
)

/**
 * How many documents the registry holds as the SELECTED budget version
 * displays it: getFilteredDocumentCount with every filter dropped except
 * `ppb_version`. A third scope alongside the live and baseline ones, and the
 * same query — nothing new is being counted here, only counted wider.
 *
 * Card 2 needs it because card 2 is the one card that NAMES its own
 * population ("listed in the registry"). The other three point at whatever is
 * on screen — "of them", "the documents shown", "citing them" — and stay true
 * under any filter without knowing what the filters are. Naming a population
 * means being able to tell whether the number really is that population,
 * which is a different question from whether the number is narrower than its
 * baseline, and needs its own operand.
 *
 * The lens is retained, and that is the whole reason this is a query rather
 * than a constant. The registry as displayed is the catalogue symbol families
 * unified with whatever the selected version cites (the membership clause in
 * buildFilterClauses), so it moves when the lens moves: the code there records
 * 42,904 under PPB 2027 against 43,020 under PPB 2026. Keeping `ppb_version`
 * on this side too means both operands of card 2's comparison move together,
 * so a version switch leaves the card's wording alone — which is the standing
 * rule for the lens. A version-free total over the whole matview would never
 * equal the baseline in any state, and card 2 would silently stop saying "in
 * the registry" everywhere.
 */
export const getExploreCardRegistryCount = (
  filters: FilterOptions = {}
): Promise<number> =>
  getFilteredDocumentCount({ ppb_version: filters.ppb_version })

/**
 * Get entity counts for the sidebar
 */
export async function getEntityCounts(filters: FilterOptions = {}): Promise<EntityWithCount[]> {
  const row = await getFilteredAggregates(filters)
  return (row?.entity_counts ?? []).map(([entity, entityLong, count]) => ({
    entity,
    entity_long: entityLong || entity,
    count: count || 0,
  }))
}

/**
 * Get organ counts for the sidebar
 */
export async function getOrganCounts(filters: FilterOptions = {}): Promise<OrganWithCount[]> {
  const { clauses, params, havingClauses, versionClause } = buildFilterClauses(filters, await agendaScopeSymbols(filters))
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const allHaving = ['d.ppb_body IS NOT NULL', "d.ppb_body != ''", ...havingClauses]
  const havingClause = `HAVING ${allHaving.join(' AND ')}`

  const query = `
    /* trace:mandates.organ-counts */
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
 * Organs grouped by editorial category for the /organs directory.
 *
 * The parallel to getBudgetHierarchy (which backs /entities): merges the
 * canonical organ list (names + websites, ppb2026.organs) with document counts,
 * folds them into ORGAN_CATEGORIES, and drops organs with no documents.
 * Categories keep their declared order; within a category, organs keep their
 * declared order. Any organ present in the DB but absent from every category is
 * appended to the last (catch-all) category so it is never lost.
 *
 * Directory scope: the documents matching the CURRENTLY ACTIVE filters (mode and
 * budget version included), the organ filter itself included — counting is
 * conjunctive. Picking an organ therefore narrows this directory to that organ,
 * so the tile reads "1 organ" rather than staying at "22"; the active-filter
 * chip is how the user gets back. Because the CTE is the same one the list
 * query counts over, clicking an organ returns exactly the number the card
 * displayed — provided the caller ADDS organ to the active filters rather than
 * replacing them (see DirectoryExplorer).
 *
 * It used to count the whole mirror instead (no version predicate at all), which
 * made the modal read GA 27,969 / ECOSOC 9,553 / SC 4,055 / HRC 729 while a click
 * returned 1,180 / 282 / 270 / 257 — 15-34x too high, 200px under a tile reading
 * "2,737 documents".
 */
async function _getOrganHierarchyInner(
  filters: FilterOptions
): Promise<OrganGroup[]> {
  const { cte, params } = buildFilteredDocsCTE(filters, {
    agendaSymbols: await agendaScopeSymbols(filters),
    selectCols: 'd.ppb_full_document_symbol, d.ppb_body',
    groupCols: 'd.ppb_full_document_symbol, d.ppb_body',
  })
  const [organs, countRows] = await Promise.all([
    getAllOrgans(),
    queryMany<{ short: string; count: string }>(
      `/* trace:mandates.organ-hierarchy */
       WITH ${cte}
       SELECT ppb_body AS short, COUNT(*) AS count
       FROM filtered_docs
       WHERE ppb_body IS NOT NULL AND ppb_body != ''
       GROUP BY ppb_body`,
      params
    ),
  ])
  const countBy = new Map(
    countRows.map((r) => [r.short, parseInt(r.count, 10) || 0])
  )
  const listed = new Set(ORGAN_CATEGORIES.flatMap((c) => c.organs))

  const build = (short: string): OrganWithCount | null => {
    const organ = organs.find((o) => o.short === short)
    const count = countBy.get(short) ?? 0
    if (!organ || count === 0) return null
    return {
      short: organ.short,
      long: organ.long,
      website: organ.website,
      count,
    }
  }

  const groups: OrganGroup[] = ORGAN_CATEGORIES.map((category) => {
    const members = [...category.organs]
    // Fold any DB organ not placed in a category into the catch-all bucket.
    // Selected by the declared flag, not by array position: the residue is last
    // for display reasons, and a reordering that moved it would otherwise send
    // unlisted codes into whichever category happened to be last.
    if (category.isCatchAll) {
      for (const organ of organs) {
        if (!listed.has(organ.short)) members.push(organ.short)
      }
    }
    return {
      id: category.id,
      label: category.label,
      organs: members
        .map(build)
        .filter((o): o is OrganWithCount => o !== null),
    }
  })

  return groups.filter((g) => g.organs.length > 0)
}

/**
 * Filter-scoped and cached per filter set, like getDocumentTypeCatalogue.
 *
 * -v4: the categories, their labels and their membership changed. Bump this key
 * and explore-card-data together — that one awaits this function and stores the
 * result in its own entry, so a half-bump serves stale groups for up to an hour.
 */
export const getOrganHierarchy = cache((filters: FilterOptions = {}) =>
  readDynamicCache(
    () => _getOrganHierarchyInner(filters),
    ['organ-hierarchy-v5', JSON.stringify(filters)],
    { revalidate: 3600 }
  )
)

/**
 * Document types for the documents explore modal, with `untypedCount`.
 *
 * The parallel to getOrganHierarchy: scoped by the active filters minus its own
 * dimension (`document_type`), so picking a type does not collapse the list to
 * that one type. getDocumentTypeOptions is the near-identical facet list that
 * backs the table's own column filter; this one exists only because the modal
 * additionally needs the untyped remainder.
 *
 * The values are grouped by documentTypeGroupExpr, the same expression the
 * table's facet and the document_type predicate use, so a pill's count and the
 * rows it filters to are one statement rather than two that have to be kept in
 * agreement by hand.
 *
 * `totalCount` is therefore the population of the TYPE LIST (every active filter
 * except document_type), not necessarily the number on the tile above it — when
 * a type is selected the tile is narrower by exactly that filter.
 *
 * HONESTY: `ppb_type` is not populated for documents that only exist in the
 * PPB-2027 import, so a large share of the catalogue has no recorded type
 * (1,420 of 2,737 in ppb2027 as of July 2026). Rather than silently dropping
 * those rows — which would make a type list look like a complete partition of
 * the catalogue when it covers under half of it — the untyped rows are counted
 * separately and returned, for the UI to disclose.
 */
async function _getDocumentTypeCatalogueInner(
  filters: FilterOptions
): Promise<DocumentTypeCatalogue> {
  const { cte, params } = buildFilteredDocsCTE(filters, {
    agendaSymbols: await agendaScopeSymbols(filters),
    selectCols: 'd.ppb_full_document_symbol, d.ppb_type',
    groupCols: 'd.ppb_full_document_symbol, d.ppb_type',
  })
  const rows = await queryMany<{ value: string | null; count: string }>(
    `/* trace:mandates.document-type-catalogue */
     WITH ${cte}
     SELECT value, count FROM (
       SELECT ${documentTypeGroupExpr('ppb_type')} AS value, COUNT(*) AS count
       FROM filtered_docs
       GROUP BY 1
     ) t
     ORDER BY (value IS NOT DISTINCT FROM '${OTHER_DOCUMENT_TYPE_LABEL}'),
              count DESC, value`,
    params
  )

  const types: FacetOption[] = []
  let untypedCount = 0
  let totalCount = 0
  for (const row of rows) {
    const count = parseInt(row.count, 10) || 0
    totalCount += count
    if (row.value === null) untypedCount += count
    else types.push({ value: row.value, count })
  }

  return { types, untypedCount, totalCount }
}

export const getDocumentTypeCatalogue = cache((filters: FilterOptions = {}) =>
  readDynamicCache(
    () => _getDocumentTypeCatalogueInner(filters),
    // -v3: the types are grouped, so v2 entries hold the ungrouped long tail.
    ['document-type-catalogue-v4', JSON.stringify(filters)],
    { revalidate: 3600 }
  )
)

/**
 * Get cross-citations for entity pages
 */
export async function getCrossCitations(
  entityCode: string,
  version?: string | null
): Promise<CrossCitation[]> {
  const query = `
    /* trace:mandates.entity-cross-citations */
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

/**
 * Entity × Entity co-citation matrix for a budget version.
 *
 * For the given version, counts how many distinct document symbols each pair of
 * entities BOTH cite — i.e. |symbols(A) ∩ symbols(B)|. The diagonal (an entity
 * with itself) is that entity's own distinct symbol count, returned separately
 * in `totals`. This is the N×N generalisation of getCrossCitations and reuses
 * the same version scoping (versionPredicateSql), so the counts match the
 * entity filter and the cross-citation sidebar exactly. Symbols are normalised
 * (collapsing a trailing "<digit> <LETTER>" spacing variant) so the same
 * mandate cited with different spacing is counted once.
 */
const _getEntityCoCitationMatrixInner = async (
  version: string | null
): Promise<CoCitationMatrix> => {
  // (entity, normalised symbol) pairs for the version — one row per distinct
  // (entity, symbol). Shared by both the pair count and the per-entity totals.
  const entSymCte = `
    ent_sym AS (
      SELECT DISTINCT c.entity,
             REGEXP_REPLACE(c.ppb_full_document_symbol, '(\\d) ([A-Z])$', '\\1\\2') AS symbol
      FROM ppb2026.source_document_citations c
      WHERE c.entity IS NOT NULL AND c.entity != '' AND c.entity != 'NA'
        AND ${versionPredicateSql('c', '$1')}
    )
  `

  const [pairRows, totalRows] = await Promise.all([
    queryMany<{ e1: string; e2: string; shared: string }>(
      `WITH ${entSymCte}
       SELECT a.entity AS e1, b.entity AS e2, COUNT(*)::int AS shared
       FROM ent_sym a
       JOIN ent_sym b ON a.symbol = b.symbol AND a.entity < b.entity
       GROUP BY a.entity, b.entity`,
      [version]
    ),
    queryMany<{ entity: string; total: string }>(
      `WITH ${entSymCte}
       SELECT entity, COUNT(*)::int AS total
       FROM ent_sym
       GROUP BY entity`,
      [version]
    ),
  ])

  const pairs: Record<string, number> = {}
  for (const r of pairRows) pairs[pairKey(r.e1, r.e2)] = Number(r.shared)

  const totals: Record<string, number> = {}
  for (const r of totalRows) totals[r.entity] = Number(r.total)

  return { entities: Object.keys(totals).sort(), pairs, totals }
}

/**
 * Cached wrapper for the co-citation matrix. Keyed by version; the data changes
 * infrequently, so it persists across requests for an hour (matching the other
 * /secretariat directory fetches).
 */
export const getEntityCoCitationMatrix = cache(
  (version?: string | null): Promise<CoCitationMatrix> =>
    unstable_cache(
      () => _getEntityCoCitationMatrixInner(version ?? null),
      ['entity-cocitation-matrix-v1', version ?? 'default'],
      { revalidate: 3600 }
    )()
)

/**
 * Organ × Entity citation-pattern matrix for a budget version.
 *
 * cell(organ, entity) = the number of documents adopted by `organ` (the body
 * that carries `ppb_body = organ`) that entity cites in the version. Organ is
 * `unified_documents.ppb_body` and entity is `source_document_citations.entity`
 * — the same columns the organ and entity filters key on — and the same
 * version scoping (versionPredicateSql), so a cell's count equals what the
 * combined organ+entity filter shows. Rectangular (not symmetric): rows and
 * columns are different vocabularies.
 */
const _getOrganEntityMatrixInner = async (
  version: string | null
): Promise<OrganEntityMatrix> => {
  const [rows, organMeta] = await Promise.all([
    queryMany<{ organ: string; entity: string; n: string }>(
      `SELECT d.ppb_body AS organ,
              c.entity AS entity,
              COUNT(DISTINCT c.ppb_full_document_symbol)::int AS n
       FROM ppb2026.source_document_citations c
       JOIN public.unified_documents d
         ON d.ppb_full_document_symbol = c.ppb_full_document_symbol
       WHERE c.entity IS NOT NULL AND c.entity != '' AND c.entity != 'NA'
         AND d.ppb_body IS NOT NULL AND d.ppb_body != ''
         AND ${versionPredicateSql('c', '$1')}
       GROUP BY d.ppb_body, c.entity`,
      [version]
    ),
    getAllOrgans(),
  ])

  const cells: Record<string, number> = {}
  const organs = new Set<string>()
  const entities = new Set<string>()
  for (const r of rows) {
    cells[organEntityKey(r.organ, r.entity)] = Number(r.n)
    organs.add(r.organ)
    entities.add(r.entity)
  }

  const organLabels: Record<string, string> = {}
  for (const o of organMeta) organLabels[o.short] = o.long

  return {
    organs: [...organs].sort(),
    entities: [...entities].sort(),
    cells,
    organLabels,
  }
}

/**
 * Cached wrapper for the organ × entity matrix. Keyed by version; persists for
 * an hour like the other /secretariat directory fetches.
 */
export const getOrganEntityMatrix = cache(
  (version?: string | null): Promise<OrganEntityMatrix> =>
    unstable_cache(
      () => _getOrganEntityMatrixInner(version ?? null),
      ['organ-entity-matrix-v1', version ?? 'default'],
      { revalidate: 3600 }
    )()
)

export interface ResolutionCitationTrendYear {
  year: number
  /** All resolutions/decisions/etc. adopted that year (the "all resolutions" catalog). */
  resolutions: number
  /** Of those, how many are cited as mandates in the selected budget version. */
  citedMandates: number
}

/**
 * Per-year "resolutions vs. cited mandates" trend for the /secretariat "Trends
 * over time" expander.
 *
 * Both series are per-year counts on `unified_documents.ppb_year` — the same
 * column the year filter (start_year/end_year) keys on — so each bar's height
 * equals what clicking that year shows in the explorer. They differ only by the
 * `cited` filter, reusing getYearStats so the counts can never drift from the
 * explorer:
 *   - resolutions   = the catalogue ∪ what this version cites
 *   - citedMandates = the subset this version cites
 * citedMandates ⊆ resolutions by construction. This is a global overview — it
 * ignores any active entity/organ/subject filter, but NOT the version lens:
 * both series are read through the version passed in.
 */
const _getResolutionCitationTrendInner = async (
  version: string | null
): Promise<ResolutionCitationTrendYear[]> => {
  const [all, cited] = await Promise.all([
    getYearStats({ ppb_version: version ?? undefined }),
    getYearStats({ ppb_version: version ?? undefined, cited: '1' }),
  ])

  const years = new Set<number>()
  for (const y of Object.keys(all.yearDistribution)) years.add(Number(y))
  for (const y of Object.keys(cited.yearDistribution)) years.add(Number(y))

  return [...years]
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      resolutions: all.yearDistribution[String(year)] ?? 0,
      citedMandates: cited.yearDistribution[String(year)] ?? 0,
    }))
}

/**
 * Cached wrapper for the resolutions-vs-cited-mandates trend. Keyed by version;
 * persists for an hour like the other /secretariat directory fetches.
 */
export const getResolutionCitationTrend = cache(
  (version?: string | null): Promise<ResolutionCitationTrendYear[]> =>
    unstable_cache(
      () => _getResolutionCitationTrendInner(version ?? null),
      ['resolution-citation-trend-v1', version ?? 'default'],
      { revalidate: 3600 }
    )()
)

export interface ResolutionRecurrenceTrendYear {
  year: number
  /** All resolutions/decisions/etc. adopted that year — same universe as the citation trend's grey. */
  resolutions: number
  /** Of those, how many are a first appearance rather than a re-adoption. */
  genuinelyNew: number
}

/**
 * Per-year "genuinely new vs. re-adopted" trend for the /secretariat "Trends
 * over time" expander.
 *
 * A resolution counts as a REPETITION when its title-series appeared in an
 * earlier year (`digitallibrary.resolution_series`: recurring, informatively
 * titled, and `year > series_first_year`). Everything else is genuinely new:
 * the first year of a series, a standalone, or a document with no recurrence
 * data (S/PRST, whose titles are "Statement [made on behalf of the Security
 * Council, at the Nth meeting…]" and carry no recurrable subject).
 *
 * The comparison is deliberately made at YEAR granularity, not per document.
 * Many recurring instruments are re-adopted annually as one omnibus resolution
 * split into lettered parts (A/RES/40/64[A]…[K] on apartheid); asking only
 * "did this title appear in an earlier year?" treats those parts as a single
 * annual instance, which per-document rules get wrong in both directions. The
 * residual false positives — series whose within-year members are genuinely
 * distinct subjects, e.g. "admission of new members" — are ~418 docs (~1% of
 * the corpus), much of it in single-year groups that can never be repetitions.
 *
 * The grey series reuses the explorer's universe verbatim (`is_catalog_pattern`
 * ∪ cited in the SELECTED version) so it is identical to the citation trend's
 * grey bars and to what the year filter shows. It therefore takes the version
 * lens, like every other number on the page.
 */
const _getResolutionRecurrenceTrendInner = async (
  version: string | null
): Promise<ResolutionRecurrenceTrendYear[]> => {
  const rows = await queryMany<{
    year: number
    resolutions: number
    repetitions: number
  }>(
    `SELECT d.ppb_year AS year,
            COUNT(DISTINCT d.ppb_full_document_symbol)::int AS resolutions,
            COUNT(DISTINCT d.ppb_full_document_symbol) FILTER (
              WHERE rs.is_recurring
                AND rs.is_informative
                AND rs.year > rs.series_first_year
            )::int AS repetitions
     FROM public.unified_documents d
     LEFT JOIN digitallibrary.resolution_series rs
       ON rs.document_symbol = d.ppb_full_document_symbol
     WHERE d.ppb_year IS NOT NULL
       AND (
         d.is_catalog_pattern
         OR EXISTS (
           SELECT 1 FROM ppb2026.source_document_citations c_cat
           WHERE c_cat.ppb_full_document_symbol = d.ppb_full_document_symbol
             AND ${versionPredicateSql('c_cat', '$1')}
         )
       )
     GROUP BY d.ppb_year
     ORDER BY d.ppb_year`,
    [version]
  )

  return rows.map((r) => {
    const resolutions = Number(r.resolutions)
    const repetitions = Number(r.repetitions)
    return {
      year: Number(r.year),
      resolutions,
      genuinelyNew: Math.max(0, resolutions - repetitions),
    }
  })
}

/** Cached wrapper for the recurrence trend. Keyed by version, like the citation
 * trend, because the grey universe now follows the version lens. */
export const getResolutionRecurrenceTrend = cache(
  (version?: string | null): Promise<ResolutionRecurrenceTrendYear[]> =>
    unstable_cache(
      () => _getResolutionRecurrenceTrendInner(version ?? null),
      ['resolution-recurrence-trend-v2', version ?? 'default'],
      { revalidate: 3600 }
    )()
)

// ============================================================================
// Filter Options Queries
// ============================================================================

type FacetOption = { value: string; count: number }

/**
 * The per-facet option builder that used to live here is gone: every facet it
 * served (programme, subject, document type, agenda item) now reads its counts
 * out of the one consolidated aggregate query, getFilteredAggregates.
 */

/** A budget location as it comes back from JSONB_BUILD_OBJECT, before sorting. */
type RawBudgetLocation = BudgetLocation & { part_sort?: number }

/** Streams in reading order: the regular budget, then peacekeeping, then plan. */
const STREAM_SORT: Record<string, number> = { ppb: 0, pko: 1, plan_outline: 2 }

/**
 * Put a document's citation sites into reading order: by stream, then down the
 * budget (part, section, entity, subprogramme). JSONB_AGG(DISTINCT …) cannot
 * carry an ORDER BY, so the ordering happens here. pko/plan_outline citations
 * have no part/section, so those comparisons fall through harmlessly.
 */
function sortBudgetLocations(
  locations: RawBudgetLocation[] | null
): BudgetLocation[] {
  if (!locations?.length) return []
  return [...locations]
    .filter((location) => location.stream != null)
    .sort(
      (a, b) =>
        (STREAM_SORT[a.stream] ?? 9) - (STREAM_SORT[b.stream] ?? 9) ||
        (a.part_sort ?? 0) - (b.part_sort ?? 0) ||
        (a.section ?? '').localeCompare(b.section ?? '', undefined, {
          numeric: true,
        }) ||
        (a.entity ?? '').localeCompare(b.entity ?? '') ||
        (a.subprogramme_number ?? -1) - (b.subprogramme_number ?? -1)
    )
    .map((location) => ({
      stream: location.stream,
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
      is_support: location.is_support,
      total_citations_at_location: location.total_citations_at_location,
    }))
}

/**
 * The budget hierarchy as a tree of streams, with the number of distinct
 * documents cited at each node. Backs the budget location filter and the
 * /entities overview.
 *
 * The top level is the budget-document stream (ppb2026.budget_documents.doc_type):
 *   ppb          — Part → Section → Entity → Subprogramme (the regular budget).
 *   pko          — Peacekeeping Operations: Missions vs. Support account → entity.
 *                  A mission's several financing fascicles ("Add.N") collapse to
 *                  one entity, since they are instances of the same mission.
 *   plan_outline — a leaf (the Plan Outline has no entity/part structure).
 * Which concrete document backs each stream depends on the active version; a
 * mission's per-fascicle counts are unioned by grouping on entity, not section.
 *
 * Counts are computed independently at every level via GROUPING SETS, so a
 * document cited by two sections of the same part counts once for that part
 * rather than twice. GROUPING() returns 1 when a column is *absent* from the
 * current grouping set, which is what tells "this level was not grouped" apart
 * from "the value here is genuinely NULL" (citations with no subprogramme).
 */
export const getBudgetHierarchy = cache(_getBudgetHierarchyInner)

/** Request-cached above: the page asks for this tree twice per render (the
 *  shared page data and the explore cards), and it is the most expensive panel
 *  on the page. */
async function _getBudgetHierarchyInner(
  filters: FilterOptions = {}
): Promise<BudgetStream[]> {
  // Conjunctive, like every other count on the page: the tree's own levels
  // (budget_part, section, subprogramme, budget_document, entity) constrain it
  // as well. Selecting a node therefore narrows the tree to that node's branch
  // rather than keeping its siblings on display, so the active-filter chip is
  // the way back out.
  const built = buildFilterClauses(filters, await agendaScopeSymbols(filters))
  const whereClause = built.clauses.length
    ? `WHERE ${built.clauses.join(' AND ')}`
    : ''
  let prefix = ''
  let params = built.params
  let citesCte = buildDirectBudgetCitations({
    subprogramme: subProgrammeExpr('c.sub_programme'),
    versionClause: built.versionClause('c'),
    whereClause,
  })
  if (built.havingClauses.length) {
    const filtered = buildFilteredDocsCTE(filters, {
      agendaSymbols: await agendaScopeSymbols(filters),
      selectCols: 'd.ppb_full_document_symbol',
      groupCols: 'd.ppb_full_document_symbol',
    })
    prefix = `${filtered.cte},`
    params = filtered.params
    citesCte = buildQualifiedBudgetCitations({
      subprogramme: subProgrammeExpr('c.sub_programme'),
      versionClause: filtered.versionClause('c'),
    })
  }

  const partCols = 'p.budget_part_number, bp.part_title, bp.sort_order'
  const sectionCols =
    'p.section, p.section_title, bs.sort_order, p.programme, p.programme_title'
  const entityCols = 'p.entity, e.entity_long'
  const subprogrammeCols = 'p.sub_programme, p.sub_programme_number'

  // All three result sets in ONE query. They were three, and each rebuilt
  // filtered_docs and cites from scratch — the same scan three times for one
  // panel. As sibling CTEs they share a single materialised `cites`.
  //
  // Counts are cast to text so each row arrives in exactly the shape its
  // interface already declares (pg returns bigint as text; to_jsonb of a
  // bigint would give a JSON number instead).
  const query = `
    /* trace:mandates.budget-hierarchy */
    WITH ${prefix} ${citesCte},
    p AS (SELECT * FROM cites WHERE doc_type = 'ppb'),
    pk AS (
      SELECT * FROM cites
      WHERE doc_type = 'pko' AND entity IS NOT NULL AND entity <> ''
    ),
    totals AS (
      SELECT doc_type,
             MIN(stream_label) AS label,
             MIN(stream_sort)  AS sort_order,
             COUNT(DISTINCT sym)::text AS count
      FROM cites
      GROUP BY doc_type
    ),
    ppb_rows AS (
      SELECT
        3 - (
          GROUPING(p.section) + GROUPING(p.entity) + GROUPING(p.sub_programme)
        ) AS depth,
        p.budget_part_number AS part,
        bp.part_title,
        bp.sort_order AS part_sort,
        p.section,
        p.section_title,
        bs.sort_order AS section_sort,
        p.programme,
        p.programme_title,
        p.entity,
        e.entity_long,
        p.sub_programme,
        p.sub_programme_number,
        COUNT(DISTINCT p.sym)::text AS count
      FROM p
      JOIN ppb2026.budget_parts bp
        ON bp.part_number = p.budget_part_number
      LEFT JOIN ppb2026.budget_sections bs
        ON bs.section = regexp_replace(p.section, '\\s*\\(Add\\..*\\)$', '')
      LEFT JOIN systemchart.entities e
        ON e.entity = p.entity
      GROUP BY GROUPING SETS (
        (${partCols}),
        (${partCols}, ${sectionCols}),
        (${partCols}, ${sectionCols}, ${entityCols}),
        (${partCols}, ${sectionCols}, ${entityCols}, ${subprogrammeCols})
      )
    ),
    -- PKO: split by support-account flag, then entity. Grouping on entity (not
    -- section) collapses each mission's Add.N financing fascicles into one row.
    pko_rows AS (
      SELECT
        pk.is_support,
        GROUPING(pk.entity) AS grp,
        pk.entity,
        e.entity_long,
        COUNT(DISTINCT pk.sym)::text AS count
      FROM pk
      LEFT JOIN systemchart.entities e ON e.entity = pk.entity
      GROUP BY GROUPING SETS ((pk.is_support), (pk.is_support, pk.entity, e.entity_long))
    )
    SELECT
      (SELECT jsonb_agg(to_jsonb(t)) FROM totals t)    AS totals,
      (SELECT jsonb_agg(to_jsonb(r)) FROM ppb_rows r)  AS ppb_rows,
      (SELECT jsonb_agg(to_jsonb(r)) FROM pko_rows r)  AS pko_rows`

  const bundle = await queryOne<{
    totals: StreamTotalRow[] | null
    ppb_rows: HierarchyRow[] | null
    pko_rows: PkoRow[] | null
  }>(query, params)

  const totals = bundle?.totals ?? []
  const ppbRows = bundle?.ppb_rows ?? []
  const pkoRows = bundle?.pko_rows ?? []

  const byType = new Map(
    totals.map((t) => [
      t.doc_type,
      { label: t.label, sort: t.sort_order, count: parseInt(t.count, 10) || 0 },
    ])
  )

  const streams: BudgetStream[] = []
  const ppb = byType.get('ppb')
  if (ppb)
    streams.push({
      type: 'ppb',
      label: ppb.label,
      count: ppb.count,
      parts: buildBudgetTree(ppbRows),
    })
  const pko = byType.get('pko')
  if (pko)
    streams.push({
      type: 'pko',
      label: pko.label,
      count: pko.count,
      groups: buildPkoGroups(pkoRows),
    })
  const plan = byType.get('plan_outline')
  if (plan)
    streams.push({ type: 'plan_outline', label: plan.label, count: plan.count })

  return streams.sort(
    (a, b) => (byType.get(a.type)?.sort ?? 0) - (byType.get(b.type)?.sort ?? 0)
  )
}

interface StreamTotalRow {
  doc_type: string
  label: string
  sort_order: number
  count: string
}

interface PkoRow {
  is_support: boolean
  grp: number | string
  entity: string | null
  entity_long: string | null
  count: string
}

/**
 * Assemble the PKO stream's two groups from the GROUPING SETS rows. `grp === 1`
 * (entity grouped out) is the group total; the rest are per-mission entity rows.
 */
function buildPkoGroups(rows: PkoRow[]): BudgetPkoGroupNode[] {
  const groups = new Map<'missions' | 'support', BudgetPkoGroupNode>()
  const ensure = (isSupport: boolean) => {
    const key = isSupport ? 'support' : 'missions'
    if (!groups.has(key))
      groups.set(key, {
        group: key,
        label: isSupport ? 'Support account' : 'Missions',
        count: 0,
        entities: [],
      })
    return groups.get(key)!
  }

  for (const row of rows) {
    const group = ensure(row.is_support)
    const count = parseInt(row.count, 10) || 0
    if (Number(row.grp) === 1) {
      group.count = count
    } else if (row.entity) {
      group.entities.push({
        entity: row.entity,
        entity_long: row.entity_long,
        count,
        subprogrammes: [],
      })
    }
  }

  for (const group of groups.values())
    group.entities.sort(
      (a, b) => b.count - a.count || a.entity.localeCompare(b.entity)
    )

  // Missions first, then the support account.
  return (['missions', 'support'] as const)
    .map((key) => groups.get(key))
    .filter((g): g is BudgetPkoGroupNode => g !== undefined)
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
  const row = await getFilteredAggregates(filters)
  return (row?.programme_counts ?? []).map(([value, count]) => ({
    value,
    count: count || 0,
  }))
}

/**
 * Build the /subjects hierarchy: every subject heading on a (filtered) document,
 * grouped by the UNBIS thesaurus into domain (01-18) -> sub-domain -> leaf, with
 * distinct-document counts at each level.
 *
 * A heading's domain comes from ppb2026.subject_thesaurus (seeded from the UNBIS
 * dump); headings with no thesaurus match are all sub-national place names, so
 * they are routed into domain 17 (Geographical Descriptors) under a synthetic
 * "Places (unclassified)" sub-domain — the same routing the subject_domain
 * filter uses, so the page and the filtered explorer agree. A heading can map to
 * more than one domain and is then shown under each (per design), which is why
 * domain counts can overlap and do not sum to a grand total.
 *
 * Domains, sub-domains and leaves are each ordered by document count, so the
 * heaviest subjects surface first — this is a browse entry point, not a
 * canonical thesaurus print-out.
 */
export async function getSubjectHierarchy(
  filters: FilterOptions = {}
): Promise<SubjectDomain[]> {
  // Conjunctive: the tree's own levels (subject, subject_domain) constrain it
  // too, like every other count on the page.
  const { cte, params } = buildFilteredDocsCTE(filters, {
    agendaSymbols: await agendaScopeSymbols(filters),
    selectCols: 'd.ppb_full_document_symbol, d.subjects',
    groupCols: 'd.ppb_full_document_symbol, d.subjects',
  })

  const query = `
    /* trace:mandates.subject-hierarchy */
    WITH ${cte},
    subj AS (
      SELECT DISTINCT
        fd.ppb_full_document_symbol AS sym,
        UPPER(TRIM(s)) AS subject_norm
      FROM filtered_docs fd, UNNEST(fd.subjects) s
      WHERE TRIM(s) <> ''
    ),
    mapped AS (
      SELECT
        subj.sym,
        subj.subject_norm,
        COALESCE(t.domain_code, '17') AS domain_code,
        COALESCE(
          t.subdomain_label,
          CASE WHEN t.domain_code IS NULL THEN 'PLACES (UNCLASSIFIED)' END
        ) AS subdomain_label,
        t.subdomain_uri
      FROM subj
      LEFT JOIN ppb2026.subject_thesaurus t
        ON t.subject_norm = subj.subject_norm
    )
    SELECT
      domain_code,
      subdomain_label,
      subdomain_uri,
      subject_norm,
      GROUPING(subdomain_label) AS g_sub,
      GROUPING(subject_norm)    AS g_subj,
      COUNT(DISTINCT sym)       AS count
    FROM mapped
    GROUP BY GROUPING SETS (
      (domain_code),
      (domain_code, subdomain_label, subdomain_uri),
      (domain_code, subdomain_label, subdomain_uri, subject_norm)
    )
  `

  const rows = await queryMany<SubjectHierarchyRow>(query, params)
  return buildSubjectTree(rows)
}

interface SubjectHierarchyRow {
  domain_code: string
  subdomain_label: string | null
  subdomain_uri: string | null
  subject_norm: string | null
  g_sub: number | string
  g_subj: number | string
  count: string
}

/**
 * Assemble the nested SubjectDomain[] from the GROUPING SETS rows. Three depths
 * arrive interleaved and are told apart by the GROUPING() flags:
 *   g_sub=1,g_subj=1 -> domain total
 *   g_sub=0,g_subj=1 -> sub-domain total (subdomain_label NULL = domain-direct)
 *   g_sub=0,g_subj=0 -> leaf subject
 */
function buildSubjectTree(rows: SubjectHierarchyRow[]): SubjectDomain[] {
  const toDisplay = (norm: string) => titleCase(norm.trim().toLowerCase())
  const n = (v: string) => parseInt(v, 10) || 0

  interface DomainAcc {
    code: string
    count: number
    directSubjects: SubjectLeaf[]
    subdomains: Map<string, SubjectSubdomain>
  }
  const domains = new Map<string, DomainAcc>()
  const ensureDomain = (code: string): DomainAcc => {
    let d = domains.get(code)
    if (!d) {
      d = { code, count: 0, directSubjects: [], subdomains: new Map() }
      domains.set(code, d)
    }
    return d
  }

  // The three GROUPING SETS depths arrive interleaved. Process shallowest-first
  // (domain, then sub-domain, then leaf) so every sub-domain entry exists before
  // its leaves are attached — otherwise a leaf arriving before its sub-domain
  // total finds no parent and is silently dropped.
  const depth = (row: SubjectHierarchyRow) =>
    (Number(row.g_sub) === 1 ? 0 : 1) + (Number(row.g_subj) === 1 ? 0 : 1)
  const ordered = [...rows].sort((a, b) => depth(a) - depth(b))

  for (const row of ordered) {
    const grpSub = Number(row.g_sub) === 1
    const grpSubj = Number(row.g_subj) === 1
    const domain = ensureDomain(row.domain_code)

    if (grpSub && grpSubj) {
      // Domain total.
      domain.count = n(row.count)
    } else if (!grpSub && grpSubj) {
      // Sub-domain total. NULL label = the domain-direct bucket (no sub-domain);
      // its leaves go straight to directSubjects, so no map entry is needed.
      if (row.subdomain_label !== null) {
        domain.subdomains.set(row.subdomain_label, {
          label: toDisplay(row.subdomain_label),
          uri: row.subdomain_uri,
          count: n(row.count),
          subjects: [],
        })
      }
    } else if (!grpSub && !grpSubj && row.subject_norm !== null) {
      // Leaf subject.
      const leaf: SubjectLeaf = {
        subject: toDisplay(row.subject_norm),
        count: n(row.count),
      }
      if (row.subdomain_label === null) {
        domain.directSubjects.push(leaf)
      } else {
        domain.subdomains.get(row.subdomain_label)?.subjects.push(leaf)
      }
    }
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count

  const result: SubjectDomain[] = []
  for (const d of domains.values()) {
    d.directSubjects.sort(byCount)
    const subdomains = [...d.subdomains.values()]
    for (const sd of subdomains) sd.subjects.sort(byCount)
    subdomains.sort(byCount)
    result.push({
      code: d.code,
      label: SUBJECT_DOMAIN_LABELS[d.code] ?? toDisplay(d.code),
      uri: `http://metadata.un.org/thesaurus/${d.code}`,
      count: d.count,
      directSubjects: d.directSubjects,
      subdomains,
    })
  }
  result.sort(byCount)
  return result
}

// ============================================================================
// Topic trends — which subjects broke out in each of the last N years
// ============================================================================
//
// For each recent year, the subjects that grew distinctively more frequent
// than the pooled previous five years (a continuity-corrected binomial
// log-odds z on the subject's share of that year's documents, over the whole
// "All Documents" corpus — independent of the page's mode/filters).
//
// Two systematic noise filters remove agenda-cycle / procedural churn, so the
// lists surface genuine shifts rather than recurring housekeeping:
//   1. Recurrence — over 2000-2025, a subject whose density-invariant share of
//      subject *tags* (which corrects for the 11→3.7 tags/doc cataloguing
//      drift) spikes in ≥3 years with a gap between them is treated as cyclical.
//   2. Procedural — the subject sits in UNBIS domain 18 "Organizational
//      Questions" (Conferences, Elections, Programme Planning, Financing…).
// Both are data/taxonomy-driven, not hand-curated lists.

export interface TopicTrendSubject {
  subject: string
  domainCode: string
  /** Log-odds z of this year vs the pooled prior five. */
  z: number
  /** Share of documents in the pooled baseline years (0–1). */
  shareBefore: number
  /** Share of documents in this year (0–1). */
  shareNow: number
  /** Documents carrying the subject this year. */
  docCount: number
  /** True if this is the first year the subject reached a meaningful presence. */
  isNew: boolean
}

export interface TopicTrendYear {
  year: number
  docCount: number
  subjects: TopicTrendSubject[]
}

const TREND_DISPLAY_YEARS = 10 // most recent complete years to show
const TREND_MIN_YEAR_DOCS = 400 // exclude sparse / partial years
const TREND_MIN_DOCS = 8 // subject must carry ≥ this many docs in the year
const TREND_MIN_Z = 1.5 // log-odds z to count as a breakout
const TREND_MAX_PER_YEAR = 12
const TREND_BASELINE_YEARS = 5 // pooled prior years as the comparison
const TREND_MEANINGFUL_DOCS = 5 // first year ≥ this = the subject's "new" year
const RECUR_SINCE = 2000 // recurrence classifier window start
const RECUR_MIN_SPIKES = 3
const RECUR_MIN_GAP = 2
const ORG_PROCEDURAL_DOMAIN = '18' // UNBIS "Organizational Questions"

async function _getTopicTrendsInner(): Promise<TopicTrendYear[]> {
  const [syRows, totalRows, domRows] = await Promise.all([
    queryMany<{ subject: string; year: number; c: number }>(`
      SELECT upper(trim(s)) AS subject,
             ppb_year AS year,
             count(DISTINCT ppb_full_document_symbol)::int AS c
      FROM public.unified_documents, unnest(subjects) s
      WHERE ppb_year IS NOT NULL AND trim(s) <> ''
      GROUP BY 1, 2
    `),
    queryMany<{ year: number; n: number }>(`
      SELECT ppb_year AS year, count(DISTINCT ppb_full_document_symbol)::int AS n
      FROM public.unified_documents
      WHERE ppb_year IS NOT NULL
      GROUP BY 1
    `),
    queryMany<{ subject_norm: string; domain_code: string }>(`
      SELECT subject_norm, domain_code FROM ppb2026.subject_thesaurus
    `),
  ])

  const totals = new Map<number, number>(totalRows.map((r) => [r.year, r.n]))
  const domainOf = new Map(domRows.map((r) => [r.subject_norm, r.domain_code]))

  // subject → (year → doc count); and total subject-tag occurrences per year.
  const bySubject = new Map<string, Map<number, number>>()
  const tagTotalByYear = new Map<number, number>()
  for (const r of syRows) {
    let ym = bySubject.get(r.subject)
    if (!ym) bySubject.set(r.subject, (ym = new Map()))
    ym.set(r.year, r.c)
    tagTotalByYear.set(r.year, (tagTotalByYear.get(r.year) ?? 0) + r.c)
  }

  // First year each subject reaches a meaningful presence (for the "new" badge).
  const firstMeaningfulYear = new Map<string, number>()
  for (const [subject, ym] of bySubject) {
    let first = Infinity
    for (const [year, c] of ym)
      if (c >= TREND_MEANINGFUL_DOCS && year < first) first = year
    firstMeaningfulYear.set(subject, first)
  }

  // Lever 1 — recurrence on density-invariant tag-share over RECUR_SINCE..now.
  const recurYears = [...totals.keys()]
    .filter((y) => y >= RECUR_SINCE && (totals.get(y) ?? 0) >= TREND_MIN_YEAR_DOCS)
    .sort((a, b) => a - b)
  const cyclical = new Set<string>()
  for (const [subject, ym] of bySubject) {
    const tagShare = (y: number) => {
      const tot = tagTotalByYear.get(y) ?? 0
      return tot ? (ym.get(y) ?? 0) / tot : 0
    }
    const mean =
      recurYears.reduce((a, y) => a + tagShare(y), 0) / (recurYears.length || 1)
    if (mean === 0) continue
    const spikes = recurYears.filter(
      (y) => tagShare(y) >= 2 * mean && (ym.get(y) ?? 0) >= TREND_MIN_DOCS
    )
    if (spikes.length < RECUR_MIN_SPIKES) continue
    let maxGap = 0
    for (let i = 1; i < spikes.length; i++)
      maxGap = Math.max(maxGap, spikes[i] - spikes[i - 1])
    if (maxGap >= RECUR_MIN_GAP) cyclical.add(subject)
  }

  const K = 0.5 // continuity correction for the log-odds
  const displayYears = [...totals.keys()]
    .filter((y) => (totals.get(y) ?? 0) >= TREND_MIN_YEAR_DOCS)
    .sort((a, b) => b - a)
    .slice(0, TREND_DISPLAY_YEARS)

  const out: TopicTrendYear[] = []
  for (const year of displayYears) {
    const baseYears: number[] = []
    for (let k = 1; k <= TREND_BASELINE_YEARS; k++)
      if (totals.has(year - k)) baseYears.push(year - k)
    const nY = totals.get(year) ?? 0
    const nB = baseYears.reduce((a, y) => a + (totals.get(y) ?? 0), 0)
    if (!nB) continue

    const subjects: TopicTrendSubject[] = []
    for (const [subject, ym] of bySubject) {
      const yc = ym.get(year) ?? 0
      if (yc < TREND_MIN_DOCS) continue
      if (cyclical.has(subject)) continue
      const domain = domainOf.get(subject) ?? '17'
      if (domain === ORG_PROCEDURAL_DOMAIN) continue

      const bc = baseYears.reduce((a, y) => a + (ym.get(y) ?? 0), 0)
      const delta =
        Math.log((yc + K) / (nY - yc + K)) -
        Math.log((bc + K) / (nB - bc + K))
      const variance =
        1 / (yc + K) + 1 / (nY - yc + K) + 1 / (bc + K) + 1 / (nB - bc + K)
      const z = delta / Math.sqrt(variance)
      if (z < TREND_MIN_Z) continue

      subjects.push({
        subject: titleCase(subject.toLowerCase()),
        domainCode: domain,
        z: Math.round(z * 10) / 10,
        shareBefore: bc / nB,
        shareNow: yc / nY,
        docCount: yc,
        isNew: firstMeaningfulYear.get(subject) === year,
      })
    }
    subjects.sort((a, b) => b.z - a.z)
    out.push({
      year,
      docCount: nY,
      subjects: subjects.slice(0, TREND_MAX_PER_YEAR),
    })
  }
  return out
}

/**
 * Topic trends for the /secretariat subjects section. Historical and
 * filter-independent, so it is cached across requests for an hour.
 */
export const getTopicTrends = cache(
  (): Promise<TopicTrendYear[]> =>
    unstable_cache(_getTopicTrendsInner, ['topic-trends-v1'], {
      revalidate: 3600,
    })()
)

/**
 * Get subject options with counts
 */
export async function getSubjectOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  const row = await getFilteredAggregates(filters)
  // Normalize to title case then deduplicate (different raw strings can
  // produce the same display value).
  const merged = new Map<string, number>()
  for (const [value, count] of row?.subject_counts ?? []) {
    const key = titleCase(value.trim())
    merged.set(key, (merged.get(key) ?? 0) + (count || 0))
  }
  return Array.from(merged.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/**
 * Get document type options from ppb_type (well-populated field on source_documents)
 */
export async function getDocumentTypeOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  const row = await getFilteredAggregates(filters)
  return (row?.type_counts ?? []).map(([value, count]) => ({
    value,
    count: count || 0,
  }))
}

/**
 * Get agenda item options — parallel UNNEST of number + title arrays
 */
export async function getAgendaItemOptions(filters: FilterOptions = {}): Promise<FacetOption[]> {
  const row = await getFilteredAggregates(filters)
  return (row?.agenda_counts ?? []).map(([value, count]) => ({
    value,
    count: count || 0,
  }))
}

/**
 * Get year range and distribution
 */
export async function getYearStats(filters: FilterOptions = {}): Promise<{
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}> {
  const bundle = await getFilteredAggregates(filters)
  const rows = bundle?.year_counts ?? []

  if (rows.length === 0) {
    return {
      yearRange: { min: 2000, max: 2024 },
      yearDistribution: {},
    }
  }

  const years = rows.map(([year]) => year)
  const distribution: Record<string, number> = {}

  rows.forEach(([year, count]) => {
    distribution[year.toString()] = count || 0
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
  const row = await getFilteredAggregates(filters)
  return (row?.citation_bins ?? []).map(([bin, count, min, max]) => ({
    bin,
    count: count || 0,
    minCitations: min,
    maxCitations: max,
  }))
}

// ============================================================================
// Page Data Orchestration
// ============================================================================

/**
 * Group- and pagination-invariant slice of the page data.
 *
 * Everything here — counts, facet option lists, sidebar aggregates, reference
 * data (~15 queries) — is identical regardless of the "group versions" toggle
 * and the current page/limit. It is cached WITHOUT those keys (see
 * getSharedPageData), so toggling grouping or paginating reuses the already-warm
 * result instead of re-running these queries. Only getMandates depends on
 * group/page/limit, and it is cached separately (getMandateList).
 *
 * The returned object must stay JSON-serialisable (it passes through
 * unstable_cache): no Map/Set/class instances. organMap is deliberately NOT
 * returned — the composition layer re-derives it from the cached getAllOrgans()
 * for mandate enrichment.
 */
async function _getSharedPageDataInner(filters: FilterOptions) {
  const [
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
    budgetVersions,
  ] = await Promise.all([
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
    getBudgetVersions(),
  ])

  let crossCitations: ApiResponse['sidebar']['crossCitations'] = []
  if (filters.entity) {
    crossCitations = await getCrossCitations(filters.entity, filters.ppb_version)
  }

  const enrichedOrganCounts = organCounts.map((organ) => ({
    ...organ,
    long: organMap.get(organ.short)?.long || organ.short,
  }))

  return {
    counts,
    entityCounts,
    enrichedOrganCounts,
    crossCitations,
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
    budgetVersions,
  }
}

/**
 * The mandate list — the only slice that depends on the group toggle and the
 * current page. Cached separately (getMandateList) keyed by the FULL filters
 * (incl. group/page/limit). Returns raw rows; keyword highlighting and body_long
 * enrichment happen in the composition layer, which has organMap to hand.
 */
async function _getMandateListInner(
  filters: FilterOptions,
  page: number,
  limit: number
): Promise<{ mandates: Mandate[]; totalCount: number }> {
  return getMandates(filters, { page, limit, includeMetrics: false })
}

// Bump when the ApiResponse SHAPE changes, so cached entries produced by an
// older deploy are never served to newer client code (the cache key is only
// the filters, and entries persist for `revalidate`). This is the
// data-version guard the refactor plan called for.
const PAGE_DATA_CACHE_VERSION = 'v10-set-based-metric-sorts'

/**
 * The shared slice is invariant to grouping and pagination, so its cache key
 * drops group/page/limit — a group toggle or page change reuses the same entry.
 */
const stripListKeys = (filters: FilterOptions): FilterOptions => ({
  ...filters,
  group: undefined,
  page: undefined,
  limit: undefined,
  // sort_by only orders the list; it cannot change a count or a facet option.
  // Dropping it means re-sorting no longer invalidates any of this, and — since
  // exploreCardScopes drops it too — both callers land on the SAME aggregate
  // cache key instead of computing the identical bundle twice per render.
  sort_by: undefined,
})

const getSharedPageData = cache((filters: FilterOptions) =>
  readDynamicCache(
    () => _getSharedPageDataInner(filters),
    [PAGE_DATA_CACHE_VERSION, 'shared', JSON.stringify(filters)],
    { revalidate: 3600 } // 1 hour — data changes infrequently
  )
)

const getMandateList = cache(
  async (filters: FilterOptions, page: number, limit: number) => {
    const list = await readDynamicCache(
      () => _getMandateListInner(filters, page, limit),
      [PAGE_DATA_CACHE_VERSION, 'list', JSON.stringify(filters), String(page), String(limit)],
      { revalidate: 3600 }
    )
    // Counts/scores and content fingerprints are deliberately never hour-cached.
    // New cache artifacts or changed source text take effect on the next request.
    return { ...list, mandates: await enrichTextMetrics(list.mandates) }
  }
)

/**
 * Public API: fetch and assemble all data needed for mandate list pages.
 *
 * Split caching (both layers persist across requests for an hour):
 * 1. getSharedPageData — the ~15 group/pagination-invariant queries (counts,
 *    facets, sidebar, reference), keyed by the filters MINUS group/page/limit.
 * 2. getMandateList    — getMandates alone, keyed by the FULL filters.
 * Toggling "group versions" (or paginating) re-runs only the list query instead
 * of all ~16 queries, which is what made the first toggle take seconds.
 *
 * Keyword highlighting and body_long enrichment are cheap CPU work done here on
 * every call, using organMap re-derived from the cached getAllOrgans().
 * react.cache deduplicates each layer within a single render tree.
 */
export const getMandatePageData = cache(
  async (filters: FilterOptions): Promise<ApiResponse> => {
    const { page, limit } = normalizePagination(filters.page, filters.limit)

    const [shared, list, organMap] = await Promise.all([
      getSharedPageData(stripListKeys(filters)),
      getMandateList(filters, page, limit),
      getOrganMap(),
    ])

    const { mandates, totalCount } = list

    // The marks on the row use the paragraph search's own marker over the
    // parsed query, so a straight apostrophe marks a curly one and an
    // excluded term marks nothing. Compiled once per page, not per row.
    const marker = filters.keyword
      ? compileSearchMarker(parseSearchQuery(filters.keyword))
      : null

    const enrichedMandates = mandates.map((mandate) => {
      const base = {
        ...mandate,
        displayTitle: getMandateDisplayTitle(mandate),
        body_long: organMap.get(mandate.body)?.long || mandate.body,
      }

      if (!marker) return base

      const highlightedFields: Record<string, string> = {}
      const matchedFields: Array<{ field: string; value: string }> = []

      const ht = safeHighlightSearchTerms(base.displayTitle, marker)
      if (ht && ht !== base.displayTitle) {
        highlightedFields.title = ht
        matchedFields.push({ field: 'title', value: base.displayTitle ?? '' })
      }

      const hs = safeHighlightSearchTerms(base.full_document_symbol, marker)
      if (hs && hs !== base.full_document_symbol) {
        highlightedFields.full_document_symbol = hs
        matchedFields.push({ field: 'symbol', value: base.full_document_symbol })
      }

      const matchedSubjects = base.subject_headings
        .map((s) => safeHighlightSearchTerms(s, marker) ?? s)
        .filter((s, i) => s !== base.subject_headings[i])
      if (matchedSubjects.length > 0) {
        highlightedFields.subject_headings = matchedSubjects.join(', ')
        matchedFields.push({ field: 'subject', value: matchedSubjects.join(', ') })
      }

      if (Object.keys(highlightedFields).length === 0) return base

      return { ...base, highlightedFields, match_details: matchedFields }
    })

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
        totalDocuments: shared.counts.totalDocuments,
        totalEntities: shared.counts.totalEntities,
        totalOrgans: shared.counts.totalOrgans,
        totalCitations: shared.counts.totalCitations,
      },
      sidebar: {
        entities: shared.entityCounts,
        organs: shared.enrichedOrganCounts,
        crossCitations: shared.crossCitations,
        citationDistribution: shared.citationDistribution,
      },
      filterOptions: {
        budgetHierarchy: shared.budgetHierarchy,
        programmes: shared.programmeOptions,
        subjects: shared.subjectOptions,
        documentTypes: shared.documentTypeOptions,
        agendaItems: shared.agendaItemOptions,
        yearRange: shared.yearStats.yearRange,
        yearDistribution: shared.yearStats.yearDistribution,
        yearDistributionUnfiltered: shared.yearStatsForChart.yearDistribution,
        budgetVersions: shared.budgetVersions,
      },
      reference: {
        entities: shared.entities,
        organs: shared.organs,
      },
    }
  }
)
