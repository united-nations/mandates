import type { FilterOptions } from '@/types'
import {
  exploreCardScopes,
  getFilteredDocumentCount,
  getFilteredDimensionCounts,
  getFilteredDocumentSymbols,
} from './mandates'
import { getScopedMandatedSgReportCount } from './mandated-sg-reports'

export async function getFilteredResultsSummary(filters: FilterOptions) {
  const { facets, cited } = exploreCardScopes(filters)
  const [documents, citedDocuments, dimensions, reports] = await Promise.all([
    getFilteredDocumentCount(facets),
    getFilteredDocumentCount(cited),
    getFilteredDimensionCounts(facets),
    getFilteredDocumentSymbols(facets)
      .then(getScopedMandatedSgReportCount)
      .catch((error) => {
        console.error('Unable to load filtered report count', error)
        return null
      }),
  ])
  return {
    documents,
    citedDocuments,
    bodies: dimensions.organs,
    entities: dimensions.entities,
    reports,
  }
}
export type FilteredResultsSummaryData = Awaited<
  ReturnType<typeof getFilteredResultsSummary>
>
