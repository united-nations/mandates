/**
 * Central definition of all filter parameters used throughout the application.
 * This ensures consistency between URL parameters, API calls, and type definitions.
 */
import {
  BUDGET_LOCATION_KEYS,
  parseBudgetLocation,
} from '#lib/budget-location-scope'

// Friendly labels for the top-level budget streams (the values the
// `budget_document` filter now carries: a doc_type). Version-agnostic, so used
// for filter chips where the version-specific document name would be noise.
export const BUDGET_STREAM_LABELS = {
  ppb: 'UN Programme Budget',
  pko: 'Peacekeeping Operations',
  plan_outline: 'Plan Outline',
} as const

// Friendly labels for the 18 UNBIS thesaurus subject domains (the values the
// `subject_domain` filter carries: a two-digit domain code). Source of truth
// for the domain code -> display name used by filter chips and the /subjects
// page, so the DB's shouty uppercase labels never surface in the UI.
export const SUBJECT_DOMAIN_LABELS: Record<string, string> = {
  '01': 'Political and Legal Questions',
  '02': 'Economic Development and Development Finance',
  '03': 'Natural Resources and the Environment',
  '04': 'Agriculture, Forestry and Fishing',
  '05': 'Industry',
  '06': 'Transport and Communications',
  '07': 'International Trade',
  '08': 'Population',
  '09': 'Human Settlements',
  '10': 'Health',
  '11': 'Education',
  '12': 'Employment',
  '13': 'Humanitarian Aid and Relief',
  '14': 'Social Conditions and Equity',
  '15': 'Culture',
  '16': 'Science and Technology',
  '17': 'Geographical Descriptors',
  '18': 'Organizational Questions',
} as const

// All filter parameters that can be passed to the API
export const FILTER_PARAMS = [
  'entity',
  'organ',
  'crossCitingEntity',
  'keyword',
  'budget_part',
  'section',
  'subprogramme',
  'foundational',
  'programme',
  'subject',
  'subject_domain',
  'start_year',
  'end_year',
  'budget_document',
  'budget_group',
  'budget_location',
  'document_type',
  'agenda_item',
  'agenda_scope',
  'related_scope',
  'full_document_symbol',
  'min_citations',
  'max_citations',
  'cited',
  'ppb_version',
  'group',
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
  'budget_part',
  'section',
  'subprogramme',
  'foundational',
  'programme',
  'subject',
  'subject_domain',
  'start_year',
  'end_year',
  'budget_document',
  'budget_group',
  'budget_location',
  'document_type',
  'agenda_item',
  'agenda_scope',
  'related_scope',
  'full_document_symbol',
  'min_citations',
  'max_citations',
  // A real filter, not a control: it narrows the catalogue to what the selected
  // budget cites, and it clears like any other chip.
  'cited',
] as const

// Parameters that are handled separately (pagination and sorting).
// `ppb_version` is a control, not a filter: it is the LENS the page is read
// through (which budget supplies the citation data), so "clear all filters"
// preserves it.
export const CONTROL_PARAMS = [
  'ppb_version',
  'group',
  'sort_by',
  'page',
  'limit',
] as const

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

  // The page ALWAYS shows the whole document catalogue (~43,000 documents)
  // unified with what the selected budget version cites; `cited` narrows it to
  // that cited subset. `?mode=active_mandates` was the old way to ask for the
  // same thing, back when it was a scope switch, so old links and bookmarks
  // keep working by mapping onto the filter. Both the server (page.tsx, the
  // data layer) and the client (FilterContext) parse the URL through here, so
  // this is the only place the mapping lives — they cannot disagree.
  //
  // The catalogue is only navigable because the list defaults to
  // citing_entities_desc (see getMandates), which floats the budget-cited
  // documents to the top of the otherwise year-ordered mass.
  const legacyMode = getString('mode')
  const cited =
    getString('cited') ?? (legacyMode === 'active_mandates' ? '1' : undefined)

  const filters: import('@/types').FilterOptions = {
    cited,
    // No hardcoded default: when absent, the data layer's versionClause
    // COALESCEs to ppb2026.budget_versions.is_default (single source of truth).
    ppb_version: getString('ppb_version'),
    group: getString('group'),
    entity: getString('entity'),
    organ: getString('organ'),
    crossCitingEntity: getString('crossCitingEntity'),
    keyword: getString('keyword'),
    budget_part: getString('budget_part'),
    section: getString('section'),
    subprogramme: getString('subprogramme'),
    foundational: getString('foundational'),
    programme: getString('programme'),
    subject: getString('subject'),
    subject_domain: getString('subject_domain'),
    start_year: getString('start_year'),
    end_year: getString('end_year'),
    budget_document: getString('budget_document'),
    budget_group: getString('budget_group'),
    document_type: getString('document_type'),
    agenda_item: getString('agenda_item'),
    agenda_scope: getString('agenda_scope'),
    related_scope: getString('related_scope'),
    full_document_symbol: getString('full_document_symbol'),
    min_citations: getString('min_citations'),
    max_citations: getString('max_citations'),
    sort_by: getString('sort_by') || undefined,
    page: getString('page') || '1',
    limit: getString('limit') || '15',
  }
  const location = getString('budget_location')
  if (filters.related_scope) {
    delete filters.agenda_scope
    delete filters.agenda_item
  }
  if (filters.agenda_scope) delete filters.agenda_item
  if (location) {
    for (const key of BUDGET_LOCATION_KEYS) delete filters[key]
    Object.assign(
      filters,
      parseBudgetLocation(location) ?? {
        budget_document: 'invalid-budget-location',
      }
    )
    filters.budget_location = location
  }
  return filters
}
