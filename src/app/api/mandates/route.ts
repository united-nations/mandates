import { NextResponse } from 'next/server'
import DataService from '@/lib/data-service'
import { safeHighlightSearchTerms } from '@/lib/utils'
import { titleCase } from 'title-case'
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

    // Enrich mandates with entity/organ details (includes displayTitle)
    const enrichedMandates = enrichMandates(
      mandates,
      entityMap,
      organMap
    )

    // Apply filters
    const filteredMandates = filterMandates(enrichedMandates, filters)

    // Add highlighting when keyword search is active
    const highlightedMandates = addHighlighting(filteredMandates, filters.keyword)

    // Sort mandates
    const sortedMandates = sortMandates(
      highlightedMandates,
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

    // Calculate aggregations
    const counts = calculateCounts(filteredMandates)
    const sidebarData = calculateSidebarData(
      filteredMandates,
      entityMap,
      organMap,
      filters,
      mandates
    )
    const filterOptions = calculateFilterOptions(mandates, filteredMandates, entityMap, organMap)

    // Build response
    const response: ApiResponse = {
      mandates: paginatedMandates,
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

  // Keyword search (search in displayTitle, document symbol, and subject headings)
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    filtered = filtered.filter(mandate => {
      const searchableText = [
        mandate.displayTitle || '',
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
 * Add highlighting to mandates when keyword search is active
 */
function addHighlighting(mandates: Mandate[], keyword?: string): Mandate[] {
  if (!keyword) return mandates;
  
  return mandates.map(mandate => {
    // Create highlighted fields object
    const highlightedFields: { [key: string]: string } = {};
    
    // Highlight the displayTitle (already normalized and title-cased in enrichMandates)
    if (mandate.displayTitle) {
      const highlightedTitle = safeHighlightSearchTerms(mandate.displayTitle, keyword);
      if (highlightedTitle && highlightedTitle !== mandate.displayTitle) {
        highlightedFields.title = highlightedTitle;
      }
    }
    
    // Note: Description highlighting removed as it's already used as title fallback and would be duplicated
    
    // Highlight full document symbol
    if (mandate.full_document_symbol) {
      const highlightedSymbol = safeHighlightSearchTerms(mandate.full_document_symbol, keyword);
      if (highlightedSymbol && highlightedSymbol !== mandate.full_document_symbol) {
        highlightedFields.full_document_symbol = highlightedSymbol;
      }
    }
    
    // Highlight subject headings - only include those that actually have matches
    if (mandate.subject_headings && mandate.subject_headings.length > 0) {
      const matchedSubjects = mandate.subject_headings
        .map(subject => {
          const titleCasedSubject = titleCase(subject.toLowerCase());
          const highlighted = safeHighlightSearchTerms(titleCasedSubject, keyword);
          return highlighted !== titleCasedSubject ? highlighted : null;
        })
        .filter(highlighted => highlighted !== null) as string[];
      
      if (matchedSubjects.length > 0) {
        highlightedFields.subject_headings = matchedSubjects.join(', ');
      }
    }
    
    return {
      ...mandate,
      highlightedFields: Object.keys(highlightedFields).length > 0 ? highlightedFields : undefined
    };
  });
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
    body_long: organMap.get(mandate.body)?.long || mandate.body,
    displayTitle: titleCase(((mandate.uniform_title && mandate.uniform_title.length > 0 && mandate.uniform_title[0].trim()) 
      ? mandate.uniform_title[0].trim()
      : (mandate.title && mandate.title.trim()) 
        ? mandate.title.trim()
        : (mandate.description && mandate.description.trim()) 
          ? mandate.description.trim()
          : 'Untitled').toLowerCase())
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
  allMandates: Mandate[],
  filteredMandates: Mandate[],
  entityMap: Map<string, Entity>,
  organMap: Map<string, Organ>
) {
  // Get all possible programmes and subjects from all mandates
  const allProgrammes = new Set<string>()
  const allSubjects = new Set<string>()
  
  allMandates.forEach(mandate => {
    // Programmes
    mandate.citation_info.forEach(info => {
      if (info.programme_title) {
        allProgrammes.add(info.programme_title)
      }
    })

    // Subjects
    mandate.subject_headings.forEach(subject => {
      allSubjects.add(subject)
    })
  })

  // Calculate counts for programmes and subjects from filtered mandates
  const programmeCounts = new Map<string, number>()
  const subjectCounts = new Map<string, number>()
  const years = new Set<number>()

  filteredMandates.forEach(mandate => {
    // Programme counts
    mandate.citation_info.forEach(info => {
      if (info.programme_title) {
        programmeCounts.set(
          info.programme_title,
          (programmeCounts.get(info.programme_title) || 0) + 1
        )
      }
    })

    // Subject counts
    mandate.subject_headings.forEach(subject => {
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1)
    })

    // Years (context-aware)
    years.add(parseInt(mandate.year))
  })

  // Build programme options with counts (including 0 counts)
  const programmeOptions = Array.from(allProgrammes).map(programme => ({
    value: programme,
    count: programmeCounts.get(programme) || 0
  })).sort((a, b) => a.value.localeCompare(b.value))

  // Build subject options with counts (including 0 counts)
  const subjectOptions = Array.from(allSubjects).map(subject => ({
    value: subject,
    count: subjectCounts.get(subject) || 0
  })).sort((a, b) => a.value.localeCompare(b.value))

  // Year range and distribution (context-aware)
  const sortedYears = Array.from(years).sort((a, b) => a - b)
  const yearRange = {
    min: sortedYears[0] || 2000,
    max: sortedYears[sortedYears.length - 1] || 2024
  }

  const yearDistribution = sortedYears.reduce((acc, year) => {
    acc[year.toString()] = filteredMandates.filter(
      m => parseInt(m.year) === year
    ).length
    return acc
  }, {} as Record<string, number>)

  return {
    programmes: programmeOptions,
    subjects: subjectOptions,
    yearRange,
    yearDistribution
  }
}
