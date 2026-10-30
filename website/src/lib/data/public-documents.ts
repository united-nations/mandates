import { publicSeries } from '../public-series'
import type { FilterOptions, Mandate } from '@/types'
import {
  getMandates,
  getMandateBySymbol,
  getMandateCitationsMany,
  getResolutionSeriesMany,
  getMandateExportBatches,
} from './mandates'
import { getParagraphsBySymbols } from './paragraphs'
import { getMandatedSgReportsMany } from './mandated-sg-reports'
import { getBudgetVersions, getDefaultVersionSlug } from './budget-documents'
import { getAllEntities } from './entities'
import { getAllOrgans } from './organs'
import { getBudgetHierarchy } from './mandates'
import { getExpenditureDatasets } from './entity-expenditure'
import { matchEntityExpenditure } from '../entity-expenditure'
import { buildResolutionCitationTree } from '../resolution-citation-tree'
import { matchBudgetLocationExpenditures } from '../budget-location-expenditure'
import { getRelatedMandates } from './related'
import {
  SHOW_MANDATED_SG_REPORTS,
  SHOW_RELATED_MANDATES,
} from '../feature-flags'
import { getMandateDisplayTitle } from '../utils'
import { SITE_URL, mandatePath } from '../seo'
import { API_VERSION, ApiInputError, COVERAGE_NOTES } from '../public-api'

export async function resolvePublicVersion(filters: FilterOptions) {
  const versions = await getBudgetVersions()
  const slug = filters.ppb_version ?? getDefaultVersionSlug(versions)
  const version = versions.find((version) => version.slug === slug)
  if (!version) throw new ApiInputError('Unknown ppb_version')
  return version
}

export function publicDocument(record: Mandate, version: string) {
  const url = `${SITE_URL}${mandatePath(record.full_document_symbol)}`
  const context = `?ppb_version=${encodeURIComponent(version)}`
  return {
    symbol: record.full_document_symbol,
    title: getMandateDisplayTitle(record),
    issuingBody: record.body || null,
    year: record.year ? Number(record.year) : null,
    documentType: record.type,
    subjects: record.subject_headings,
    agendaItems: {
      numbers: record.agenda_item_numbers ?? [],
      titles: record.agenda_item_titles ?? [],
    },
    sourceUrl: record.link,
    pageUrl: `${url}${context}`,
    canonicalUrl: url,
    jsonUrl: `${url}.json${context}`,
    budgetVersion: version,
    // Summary counts follow active filters; detail expansion independently fetches full cycle citations.
    matchingCitationCount: record.num_citations,
    matchingEntityCount: record.num_entities,
    matchingEntities: record.entities,
    matchingFoundationalEntities: record.foundational_entities ?? [],
    matchingProgrammes: [
      ...new Set(
        (record.budget_locations ?? []).flatMap((location) =>
          location.programme_title ? [location.programme_title] : []
        )
      ),
    ],
    matchingBudgetLocations: record.budget_locations ?? [],
    series: publicSeries(record.series, record.full_document_symbol),
    group: record.group ?? null,
  }
}
export type PublicDocument = ReturnType<typeof publicDocument>

export async function getPublicDetails(records: Mandate[], version: string) {
  const symbols = records.map((record) => record.full_document_symbol)
  const [citations, paragraphs, series, reports] = await Promise.all([
    getMandateCitationsMany(symbols, version),
    getParagraphsBySymbols(symbols),
    getResolutionSeriesMany(symbols),
    SHOW_MANDATED_SG_REPORTS ? getMandatedSgReportsMany(symbols) : null,
  ])
  const entityCodes = [
    ...new Set(
      [...citations.values()].flatMap(
        (detail) => detail.citations?.map((citation) => citation.entity) ?? []
      )
    ),
  ]
  const entities = await getAllEntities()
  const datasets = entityCodes.length ? await getExpenditureDatasets() : []
  const names = new Map(
    entities.map((entity) => [entity.entity, entity.entity_long])
  )
  const expenditures = Object.fromEntries(
    entityCodes.map((entity) => [
      entity,
      matchEntityExpenditure(entity, names.get(entity), datasets),
    ])
  )
  // Enabled experimental sections retain their existing reader, bounded to one batch.
  const related = new Map<
    string,
    Awaited<ReturnType<typeof getRelatedMandates>>
  >()
  if (SHOW_RELATED_MANDATES)
    for (const symbol of symbols)
      related.set(symbol, await getRelatedMandates(symbol))
  return records.map((record) => {
    const symbol = record.full_document_symbol
    const text = paragraphs.get(symbol) ?? []
    const citation = citations.get(symbol)!
    const history = series.get(symbol) ?? null
    const seriesSummary =
      record.series ??
      (history
        ? {
            superseded_by: history.superseded_by,
            is_collection: history.is_collection,
            has_newer: history.has_newer,
            is_latest: history.is_latest,
            series_count: history.series_count,
          }
        : null)
    const { tree, financialRows } = buildResolutionCitationTree(
      {
        ...record,
        citation_info: citation.citations ?? [],
        detail_budget_locations: citation.detailBudgetLocations,
      },
      entities
    )
    const locationExpenditures = matchBudgetLocationExpenditures(
      financialRows,
      datasets,
      names
    )
    return {
      ...publicDocument({ ...record, series: seriesSummary }, version),
      details: {
        status: 'included' as const,
        citations: citation.citations ?? [],
        budgetLocations: citation.detailBudgetLocations,
        foundationalEntities: citation.foundationalEntities,
        budgetLocationExpenditures: tree.flatMap((entity) =>
          entity.children
            .filter((child) => child.financial)
            .map((child) => ({
              location: child.location,
              expenditure: child.financialId
                ? locationExpenditures[child.financialId]
                : { status: 'unavailable', reason: 'not_matched' },
            }))
        ),
        entityCitationTotals: citation.entityCitationTotals,
        entityExpenditures: Object.fromEntries(
          Object.keys(citation.entityCitationTotals)
            .filter((entity) => expenditures[entity])
            .map((entity) => [entity, expenditures[entity]])
        ),
        paragraphs: {
          status: text.length
            ? ('available' as const)
            : ('unavailable' as const),
          language: 'en',
          items: text,
        },
        versionHistory: publicSeries(history, symbol),
        reports: reports
          ? { status: 'included' as const, data: reports.get(symbol) }
          : { status: 'not_included' as const },
        relatedDocuments: related.has(symbol)
          ? { status: 'included' as const, items: related.get(symbol) }
          : { status: 'not_included' as const },
      },
    }
  })
}
export type DetailedPublicDocument = Awaited<
  ReturnType<typeof getPublicDetails>
>[number]

export async function getPublicDocument(symbol: string, version: string) {
  const record = await getMandateBySymbol(symbol, version)
  if (!record) return null
  return (await getPublicDetails([record], version))[0]
}

export async function getPublicReference(version: string) {
  const [entities, organs, programmes, versions] = await Promise.all([
    getAllEntities(),
    getAllOrgans(),
    getBudgetHierarchy({ ppb_version: version }),
    getBudgetVersions(),
  ])
  return { entities, organs, programmes, budgetVersions: versions }
}

export async function getPublicPage(
  filters: FilterOptions,
  page: number,
  limit: number,
  details: boolean
) {
  const version = await resolvePublicVersion(filters)
  const result = await getMandates(
    { ...filters, ppb_version: version.slug },
    { limit, batchOffset: (page - 1) * limit, includeMetrics: false }
  )
  if (!result.mandates.length && page > 1) {
    result.totalCount = (
      await getMandates(
        { ...filters, ppb_version: version.slug },
        { limit: 1, batchOffset: 0, includeMetrics: false }
      )
    ).totalCount
  }
  const items = details
    ? await getPublicDetails(result.mandates, version.slug)
    : result.mandates.map((record) => ({
        ...publicDocument(record, version.slug),
        group: record.group ?? null,
        details: { status: 'not_included' as const },
      }))
  return {
    apiVersion: API_VERSION,
    budgetVersion: version,
    coverage: COVERAGE_NOTES,
    items,
    pagination: {
      page,
      pageSize: limit,
      total: result.totalCount,
      hasMore: page * limit < result.totalCount,
    },
  }
}

/** Fixed-size batches bound memory and database concurrency, never total export size. */
export async function* publicExportBatches(
  filters: FilterOptions,
  version: string,
  details: boolean,
  signal?: AbortSignal,
  streamRows = false
) {
  // Rich exports and Excel relationship sheets perform additional pooled reads
  // per batch. Do not hold a cursor connection while waiting for those reads.
  if (streamRows && !details) {
    for await (const batch of getMandateExportBatches(
      { ...filters, ppb_version: version },
      signal
    ))
      yield batch.map((record) => ({
        ...publicDocument(record, version),
        details: { status: 'not_included' as const },
      }))
    return
  }
  let offset = 0
  while (!signal?.aborted) {
    const batch = await getMandates(
      { ...filters, ppb_version: version, group: undefined },
      {
        batchSize: details ? 100 : 1000,
        batchOffset: offset,
        includeMetrics: false,
      }
    )
    if (!batch.mandates.length) return
    yield details
      ? await getPublicDetails(batch.mandates, version)
      : batch.mandates.map((record) => ({
          ...publicDocument(record, version),
          details: { status: 'not_included' as const },
        }))
    offset += batch.mandates.length
    if (offset >= batch.totalCount) return
  }
}
