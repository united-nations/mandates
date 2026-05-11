/**
 * Central definition of all filter parameters used throughout the application.
 * This ensures consistency between URL parameters, API calls, and type definitions.
 */

// All filter parameters that can be passed to the API
export const FILTER_PARAMS = [
  'entity',
  'organ',
  'crossCitingEntity',
  'keyword',
  'programme',
  'subject',
  'start_year',
  'end_year',
  'budget_document',
  'document_type',
  'agenda_item',
  'sort_by',
  'page',
  'limit',
] as const

// Filter parameters that represent actual filters (exclude pagination and sorting)
export const FILTER_ONLY_PARAMS = [
  'entity',
  'organ',
  'crossCitingEntity',
  'keyword',
  'programme',
  'subject',
  'start_year',
  'end_year',
  'budget_document',
  'document_type',
  'agenda_item',
] as const

// Parameters that are handled separately (pagination and sorting)
export const CONTROL_PARAMS = ['sort_by', 'page', 'limit'] as const

// Additional filter parameters for entity/organ pages (exclude the implicit ones)
export const ADDITIONAL_FILTER_PARAMS = [
  'crossCitingEntity',
  'keyword',
  'programme',
  'subject',
  'start_year',
  'end_year',
  'budget_document',
  'document_type',
  'agenda_item',
  'sort_by',
  'page',
  'limit',
] as const

// Type utilities
export type FilterParamKey = (typeof FILTER_PARAMS)[number]
export type FilterOnlyParamKey = (typeof FILTER_ONLY_PARAMS)[number]
export type ControlParamKey = (typeof CONTROL_PARAMS)[number]
export type AdditionalFilterParamKey = (typeof ADDITIONAL_FILTER_PARAMS)[number]

/**
 * Parse Next.js searchParams into a FilterOptions object.
 */
export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): import('@/types').FilterOptions {
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
    document_type: getString('document_type'),
    agenda_item: getString('agenda_item'),
    full_document_symbol: getString('full_document_symbol'),
    sort_by: getString('sort_by') || 'citing_entities_desc',
    page: getString('page') || '1',
    limit: getString('limit') || '10',
  }
}
