/**
 * Centralized budget document mapping and utilities
 * This handles the mapping between URL slugs, display names, and actual data values
 */

export interface BudgetDocumentMapping {
  slug: string // URL-friendly identifier (e.g., 'ppb2026', 'pko')
  displayName: string // Human-readable name for UI
  matchPattern: string | RegExp // Pattern to match against origin_document in data
}

// Central mapping of budget documents
export const BUDGET_DOCUMENT_MAPPINGS: BudgetDocumentMapping[] = [
  {
    slug: 'ppb2026',
    displayName: 'Proposed Programme Budget for 2026',
    matchPattern: 'PPB 2026',
  },
  {
    slug: 'pko',
    displayName: 'Budget of Peacekeeping Operations 2025/26',
    matchPattern: /^PKM 25\/26/,
  },
  {
    slug: 'plan-outline',
    displayName: 'Plan Outline',
    matchPattern: 'PPB 2026/Plan Outline',
  },
]

/**
 * Get display name for a budget document slug
 */
export function getBudgetDocumentDisplayName(slug: string): string {
  const mapping = BUDGET_DOCUMENT_MAPPINGS.find((m) => m.slug === slug)
  return mapping?.displayName || slug
}

/**
 * Get slug for a budget document display name (reverse lookup)
 */
export function getBudgetDocumentSlug(displayName: string): string {
  const mapping = BUDGET_DOCUMENT_MAPPINGS.find(
    (m) => m.displayName === displayName
  )
  return mapping?.slug || displayName
}

/**
 * Get all available budget document options for filter dropdowns
 */
export function getBudgetDocumentOptions(): Array<{
  value: string
  label: string
}> {
  return BUDGET_DOCUMENT_MAPPINGS.map((mapping) => ({
    value: mapping.slug,
    label: mapping.displayName,
  }))
}

/**
 * Check if an origin_document matches a budget document slug
 */
export function matchesBudgetDocument(
  originDocument: string,
  slug: string
): boolean {
  const mapping = BUDGET_DOCUMENT_MAPPINGS.find((m) => m.slug === slug)
  if (!mapping) return false

  if (typeof mapping.matchPattern === 'string') {
    return originDocument === mapping.matchPattern
  } else {
    return mapping.matchPattern.test(originDocument)
  }
}

/**
 * Get the appropriate display name for an origin_document value from the data
 */
export function getOriginDocumentDisplayName(originDocument: string): string {
  // Check if this origin document matches any of our known patterns
  for (const mapping of BUDGET_DOCUMENT_MAPPINGS) {
    if (typeof mapping.matchPattern === 'string') {
      if (originDocument === mapping.matchPattern) {
        return mapping.displayName
      }
    } else {
      if (mapping.matchPattern.test(originDocument)) {
        return mapping.displayName
      }
    }
  }

  // If no pattern matches, return the original value
  return originDocument
}

/**
 * Convert a budget document slug to the actual value(s) needed for API filtering
 */
export function getBudgetDocumentFilterValues(slug: string): string[] {
  const mapping = BUDGET_DOCUMENT_MAPPINGS.find((m) => m.slug === slug)
  if (!mapping) return []

  if (typeof mapping.matchPattern === 'string') {
    return [mapping.matchPattern]
  } else {
    // For regex patterns like PKM, we need to return all possible values
    // This is handled by the matchesBudgetDocument function in the API
    // The API will use the regex to match against origin_document values
    return []
  }
}

/**
 * Get a regex pattern for server-side filtering (if needed)
 */
export function getBudgetDocumentRegexPattern(
  slug: string
): RegExp | string | null {
  const mapping = BUDGET_DOCUMENT_MAPPINGS.find((m) => m.slug === slug)
  if (!mapping) return null

  return mapping.matchPattern
}
