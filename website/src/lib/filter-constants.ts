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
  'full_document_symbol',
  'min_citations',
  'max_citations',
  'mode',
  'ppb_version',
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
  'full_document_symbol',
  'min_citations',
  'max_citations',
] as const

// Parameters that are handled separately (pagination and sorting)
export const CONTROL_PARAMS = ['mode', 'ppb_version', 'sort_by', 'page', 'limit'] as const

// Type utilities
export type FilterParamKey = (typeof FILTER_PARAMS)[number]
export type FilterOnlyParamKey = (typeof FILTER_ONLY_PARAMS)[number]
export type ControlParamKey = (typeof CONTROL_PARAMS)[number]

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
    mode: (getString('mode') as 'active_mandates' | 'all_resolutions') || 'active_mandates',
    // No hardcoded default: when absent, the data layer's versionClause
    // COALESCEs to ppb2026.budget_versions.is_default (single source of truth).
    ppb_version: getString('ppb_version'),
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
    min_citations: getString('min_citations'),
    max_citations: getString('max_citations'),
    sort_by: getString('sort_by') || undefined,
    page: getString('page') || '1',
    limit: getString('limit') || '25',
  }
}
