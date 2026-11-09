import { publicSeries } from '../public-series'
import type { FilterOptions, Mandate } from '@/types'
import {
  getMandates,
  getMandateBySymbol,
  getMandateExportBatches,
  getResolutionSeries,
} from './mandates'
import { getBudgetVersions, getDefaultVersionSlug } from './budget-documents'
import { getAllEntities } from './entities'
import { getAllOrgans } from './organs'
import { getBudgetHierarchy } from './mandates'
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

/** The summary record of a document: the fields the document table shows. */
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

export async function getPublicDocument(symbol: string, version: string) {
  const record = await getMandateBySymbol(symbol, version)
  if (!record) return null
  // The single-document reader carries no series summary; take the same
  // summary fields a list row has.
  const series = await getResolutionSeries(symbol)
  return publicDocument(
    {
      ...record,
      series: series && {
        superseded_by: series.superseded_by,
        is_collection: series.is_collection,
        has_newer: series.has_newer,
        is_latest: series.is_latest,
        series_count: series.series_count,
      },
    },
    version
  )
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
  limit: number
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
  return {
    apiVersion: API_VERSION,
    budgetVersion: version,
    coverage: COVERAGE_NOTES,
    items: result.mandates.map((record) => publicDocument(record, version.slug)),
    pagination: {
      page,
      pageSize: limit,
      total: result.totalCount,
      hasMore: page * limit < result.totalCount,
    },
  }
}

/** Export summaries, read through one database cursor in the list's order. */
export async function* publicExportBatches(
  filters: FilterOptions,
  version: string,
  signal: AbortSignal
) {
  for await (const batch of getMandateExportBatches(
    { ...filters, ppb_version: version },
    signal
  ))
    yield batch.map((record) => publicDocument(record, version))
}
