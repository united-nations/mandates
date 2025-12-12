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
  'sort_by',
  'page',
  'limit',
] as const

// Type utilities
export type FilterParamKey = (typeof FILTER_PARAMS)[number]
export type FilterOnlyParamKey = (typeof FILTER_ONLY_PARAMS)[number]
export type ControlParamKey = (typeof CONTROL_PARAMS)[number]
export type AdditionalFilterParamKey = (typeof ADDITIONAL_FILTER_PARAMS)[number]
