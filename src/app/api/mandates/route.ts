import { NextResponse } from 'next/server'
import DataService from '@/lib/data-service'
import type {
  Mandate,
  Entity,
  Organ,
  FilterOptions,
  ApiResponse,
  EntityWithCount,
  OrganWithCount,
  CrossCitation
} from '@/types'

/**
 * Unified API endpoint that handles all filtering and returns comprehensive data
 */
export async function GET (request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse filter parameters
    const filters: FilterOptions = {
      entity: searchParams.get('entity') || undefined,
      organ: searchParams.get('organ') || undefined,
      crossCitingEntity: searchParams.get('crossCitingEntity') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      programme: searchParams.get('programme') || undefined,
      subject: searchParams.get('subject') || undefined,
      start_year: searchParams.get('start_year') || undefined,
      end_year: searchParams.get('end_year') || undefined,
      budget_document: searchParams.get('budget_document') || undefined,
      sort_by: searchParams.get('sort_by') || 'citing_entities_desc',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10'
    }

    // Parse pagination
    const page = Math.max(1, parseInt(filters.page || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit || '10')))

    // Load all data
    const { mandates, entities, organs, entityMap, organMap } =
      await DataService.getAllData()

    // Apply filters
    const filteredMandates = filterMandates(mandates, filters)

    // Sort mandates
    const sortedMandates = sortMandates(
      filteredMandates,
      filters.sort_by || 'citing_entities_desc'
    )

    // Paginate
    const totalItems = sortedMandates.length
    const totalPages = Math.ceil(totalItems / limit)
    const startIndex = (page - 1) * limit
    const paginatedMandates = sortedMandates.slice(
      startIndex,
      startIndex + limit
    )

    // Enrich mandates with entity/organ details
    const enrichedMandates = enrichMandates(
      paginatedMandates,
      entityMap,
      organMap
    )

    // Calculate aggregations
    const counts = calculateCounts(filteredMandates)
    const sidebarData = calculateSidebarData(
      filteredMandates,
      entityMap,
      organMap,
      filters,
      mandates
    )
    const filterOptions = calculateFilterOptions(mandates, entityMap, organMap)

    // Build response
    const response: ApiResponse = {
      mandates: enrichedMandates,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems
      },
      counts,
      sidebar: sidebarData,
      filterOptions,
      reference: {
        entities: Array.from(entityMap.values()),
        organs: Array.from(organMap.values())
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Filter mandates based on provided filters
 */
function filterMandates (
  mandates: Mandate[],
  filters: FilterOptions
): Mandate[] {
  let filtered = mandates

  // Entity filter
  if (filters.entity) {
    filtered = filtered.filter(mandate =>
      mandate.entities.includes(filters.entity!)
    )
  }

  if (filters.crossCitingEntity) {
    filtered = filtered.filter(mandate =>
      mandate.entities.includes(filters.crossCitingEntity!)
    )
  }

  // Organ filter
  if (filters.organ) {
    filtered = filtered.filter(mandate => mandate.body === filters.organ)
  }

  // Programme filter
  if (filters.programme) {
    filtered = filtered.filter(mandate =>
      mandate.citation_info.some(info =>
        info.programme_title
          ?.toLowerCase()
          .includes(filters.programme!.toLowerCase())
      )
    )
  }

  // Subject filter
  if (filters.subject) {
    filtered = filtered.filter(mandate =>
      mandate.subject_headings.some(subject =>
        subject.toLowerCase().includes(filters.subject!.toLowerCase())
      )
    )
  }

  // Year range filter
  if (filters.start_year || filters.end_year) {
    filtered = filtered.filter(mandate => {
      const year = parseInt(mandate.year)
      const startYear = filters.start_year ? parseInt(filters.start_year) : 0
      const endYear = filters.end_year ? parseInt(filters.end_year) : 9999
      return year >= startYear && year <= endYear
    })
  }

  // Budget document filter
  if (filters.budget_document) {
    filtered = filtered.filter(mandate =>
      mandate.citation_info.some(
        info => info.origin_document === filters.budget_document
      )
    )
  }

  // Keyword search (search in title, description, and subject headings)
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    filtered = filtered.filter(mandate => {
      const searchableText = [
        mandate.title || '',
        mandate.description || '',
        mandate.full_document_symbol || '',
        ...(mandate.subject_headings || [])
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(keyword)
    })
  }

  return filtered
}

/**
 * Sort mandates based on sort option
 */
function sortMandates (mandates: Mandate[], sortBy: string): Mandate[] {
  const sorted = [...mandates]

  switch (sortBy) {
    case 'citing_entities_desc':
      return sorted.sort((a, b) => b.num_entities - a.num_entities)
    case 'citing_entities_asc':
      return sorted.sort((a, b) => a.num_entities - b.num_entities)
    case 'citations_desc':
      return sorted.sort((a, b) => b.num_citations - a.num_citations)
    case 'citations_asc':
      return sorted.sort((a, b) => a.num_citations - b.num_citations)
    case 'year_desc':
      return sorted.sort((a, b) => parseInt(b.year) - parseInt(a.year))
    case 'year_asc':
      return sorted.sort((a, b) => parseInt(a.year) - parseInt(b.year))
    default:
      return sorted
  }
}

/**
 * Enrich mandates with entity and organ details
 */
function enrichMandates (
  mandates: Mandate[],
  entityMap: Map<string, Entity>,
  organMap: Map<string, Organ>
): Mandate[] {
  return mandates.map(mandate => ({
    ...mandate,
    entity_long: mandate.entities
      .map(entity => entityMap.get(entity)?.entity_long || entity)
      .join(', '),
    body_long: organMap.get(mandate.body)?.long || mandate.body
  }))
}

/**
 * Calculate counts for data cards
 */
function calculateCounts (mandates: Mandate[]) {
  const uniqueEntities = new Set<string>()
  const uniqueOrgans = new Set<string>()
  let totalCitations = 0

  mandates.forEach(mandate => {
    mandate.entities.forEach(entity => uniqueEntities.add(entity))
    if (mandate.body && mandate.body !== '') {
      uniqueOrgans.add(mandate.body)
    }
    totalCitations += mandate.num_citations
  })

  return {
    totalDocuments: mandates.length,
    totalEntities: uniqueEntities.size,
    totalOrgans: uniqueOrgans.size,
    totalCitations
  }
}

/**
 * Calculate sidebar data with counts
 */
function calculateSidebarData (
  filteredMandates: Mandate[],
  entityMap: Map<string, Entity>,
  organMap: Map<string, Organ>,
  filters: FilterOptions,
  allMandates: Mandate[]
) {
  // Count entities
  const entityCounts = new Map<string, number>()
  const organCounts = new Map<string, number>()

  filteredMandates.forEach(mandate => {
    // Entity counts - filter out null/undefined/empty entities
    mandate.entities
      .filter(entity => entity != null && entity !== '')
      .forEach(entity => {
        entityCounts.set(entity, (entityCounts.get(entity) || 0) + 1)
      })

    // Organ counts
    if (mandate.body && mandate.body !== '') {
      organCounts.set(mandate.body, (organCounts.get(mandate.body) || 0) + 1)
    }
  })

  // Build sidebar data
  const entities: EntityWithCount[] = Array.from(entityCounts.entries())
    .map(([entity, count]) => ({
      entity,
      entity_long: entityMap.get(entity)?.entity_long || entity,
      count
    }))
    .sort((a, b) => b.count - a.count)

  const organs: OrganWithCount[] = Array.from(organCounts.entries())
    .map(([organ, count]) => ({
      short: organ,
      long: organMap.get(organ)?.long || organ,
      count
    }))
    .sort((a, b) => b.count - a.count)

  // Calculate cross-citations based on page type
  const crossCitations: CrossCitation[] = calculateCrossCitations(
    filteredMandates,
    allMandates,
    entityMap,
    organMap,
    filters
  )

  return {
    entities,
    organs,
    crossCitations
  }
}

/**
 * Calculate cross-citations for entity or organ pages
 */
function calculateCrossCitations (
  filteredMandates: Mandate[],
  allMandates: Mandate[],
  entityMap: Map<string, Entity>,
  organMap: Map<string, Organ>,
  filters: FilterOptions
): CrossCitation[] {
  if (filters.entity) {
    // Entity page - find entities that cite the same documents
    const entityCrossCitations = new Map<string, number>()

    filteredMandates.forEach(mandate => {
      mandate.entities
        .forEach(entity => {
          if (entity && entity !== filters.entity && entity.trim() !== '') {
            entityCrossCitations.set(
              entity,
              (entityCrossCitations.get(entity) || 0) + 1
            )
          }
        })
    })

    return Array.from(entityCrossCitations.entries())
      .map(([entity, sharedMandatesCount]) => ({
        entity,
        entity_long: entityMap.get(entity)?.entity_long || entity,
        count: sharedMandatesCount
      }))
      .sort((a, b) => b.count - a.count)
  }

  return []
}

/**
 * Calculate filter options for dropdowns
 */
function calculateFilterOptions (
  mandates: Mandate[],
  entityMap: Map<string, Entity>,
  organMap: Map<string, Organ>
) {
  const programmes = new Set<string>()
  const subjects = new Set<string>()
  const years = new Set<number>()

  mandates.forEach(mandate => {
    // Programmes
    mandate.citation_info.forEach(info => {
      if (info.programme_title) {
        programmes.add(info.programme_title)
      }
    })

    // Subjects
    mandate.subject_headings.forEach(subject => {
      subjects.add(subject)
    })

    // Years
    years.add(parseInt(mandate.year))
  })

  const sortedYears = Array.from(years).sort((a, b) => a - b)
  const yearRange = {
    min: sortedYears[0] || 2000,
    max: sortedYears[sortedYears.length - 1] || 2024
  }

  const yearDistribution = sortedYears.reduce((acc, year) => {
    acc[year.toString()] = mandates.filter(
      m => parseInt(m.year) === year
    ).length
    return acc
  }, {} as Record<string, number>)

  return {
    programmes: Array.from(programmes).sort(),
    subjects: Array.from(subjects).sort(),
    yearRange,
    yearDistribution
  }
}
