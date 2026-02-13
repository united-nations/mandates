/**
 * Server-side data fetching for mandate pages
 *
 * This module provides functions to fetch all data needed for mandate list pages.
 * Called directly from Server Components - no API routes needed.
 */

import { cache } from 'react'
import type { FilterOptions, ApiResponse } from '@/types'
import { getMandateDisplayTitle } from '@/lib/utils'
import DataService from '@/lib/data-service'
import {
  getMandates,
  getMandateCounts,
  getEntityCounts,
  getOrganCounts,
  getCrossCitations,
  getProgrammeOptions,
  getSubjectOptions,
  getYearStats,
} from '@/lib/db/mandates'

// Cache the data fetching for the duration of a single request
// This ensures we don't make duplicate DB calls within the same render
export const getMandatePageData = cache(async (filters: FilterOptions): Promise<ApiResponse> => {
  const page = parseInt(filters.page || '1', 10)
  const limit = parseInt(filters.limit || '10', 10)

  // Fetch all data in parallel
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

  // Fetch cross-citations if on entity page
  let crossCitations: ApiResponse['sidebar']['crossCitations'] = []
  if (filters.entity) {
    crossCitations = await getCrossCitations(filters.entity)
  }

  // Enrich mandates with display titles and long names
  const enrichedMandates = mandates.map((mandate) => ({
    ...mandate,
    displayTitle: getMandateDisplayTitle(mandate),
    body_long: organMap.get(mandate.body)?.long || mandate.body,
  }))

  // Enrich organ counts with long names
  const enrichedOrganCounts = organCounts.map((organ) => ({
    ...organ,
    long: organMap.get(organ.short)?.long || organ.short,
  }))

  // Build pagination
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

/**
 * Parse search params into FilterOptions
 */
export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): FilterOptions {
  const getString = (key: string): string | undefined => {
    const value = searchParams[key]
    if (Array.isArray(value)) return value[0]
    return value || undefined
  }

  return {
    entity: getString('entity'),
    organ: getString('organ'),
    crossCitingEntity: getString('crossCitingEntity'),
    keyword: getString('keyword'),
    programme: getString('programme'),
    subject: getString('subject'),
    start_year: getString('start_year'),
    end_year: getString('end_year'),
    budget_document: getString('budget_document'),
    full_document_symbol: getString('full_document_symbol'),
    sort_by: getString('sort_by') || 'citing_entities_desc',
    page: getString('page') || '1',
    limit: getString('limit') || '10',
  }
}
