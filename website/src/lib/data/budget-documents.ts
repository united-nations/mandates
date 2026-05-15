/**
 * Budget Document Types
 *
 * Fetches the list of filterable budget document options from the DB.
 * Each row represents one selectable option in the budget_document filter,
 * mapping a URL slug to a display name and a POSIX regex matched against
 * the origin_document column in source_document_citations.
 */

import { unstable_cache } from 'next/cache'
import { queryMany } from '../db/query'

export interface BudgetDocument {
  slug: string
  display_name: string
  match_pattern: string
  sort_order: number
}

interface BudgetDocumentRow {
  slug: string
  display_name: string
  match_pattern: string
  sort_order: number
}

/**
 * Load all budget document options ordered by sort_order.
 * Cached across requests; revalidates every hour.
 */
export const getBudgetDocuments = unstable_cache(
  async (): Promise<BudgetDocument[]> => {
    const rows = await queryMany<BudgetDocumentRow>(
      `SELECT slug, display_name, match_pattern, sort_order
       FROM ppb2026.budget_documents
       ORDER BY sort_order`,
      []
    )
    return rows
  },
  ['budget-documents'],
  { revalidate: 3600 }
)

export interface BudgetVersion {
  slug: string
  display_name: string
  ppb_year: number
  is_default: boolean
  sort_order: number
}

/**
 * Load all budget versions (the data-driven grouping of budget documents that
 * powers the version selector and the default-version fallback). Mirrors
 * getBudgetDocuments; cached across requests, revalidates hourly.
 */
export const getBudgetVersions = unstable_cache(
  async (): Promise<BudgetVersion[]> => {
    const rows = await queryMany<BudgetVersion>(
      `SELECT slug, display_name, ppb_year, is_default, sort_order
       FROM ppb2026.budget_versions
       ORDER BY sort_order`,
      []
    )
    return rows
  },
  ['budget-versions'],
  { revalidate: 3600 }
)

/**
 * The slug of the default budget version (is_default), or the first by
 * sort_order as a safety net. Single source of truth for "current budget".
 */
export function getDefaultVersionSlug(versions: BudgetVersion[]): string {
  return (versions.find((v) => v.is_default) ?? versions[0])?.slug ?? 'ppb2026'
}

/**
 * Get the display name for a given slug.
 * Falls back to the slug itself if not found.
 */
export function getBudgetDocumentDisplayName(
  slug: string,
  budgetDocuments: BudgetDocument[]
): string {
  return budgetDocuments.find((d) => d.slug === slug)?.display_name ?? slug
}
