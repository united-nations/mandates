/**
 * Budget Document Types
 *
 * Fetches the list of filterable budget document options from the DB.
 * Each row represents one selectable option in the budget_document filter,
 * mapping a URL slug to a display name and a POSIX regex matched against
 * the origin_document column in source_document_citations.
 */

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
 */
export async function getBudgetDocuments(): Promise<BudgetDocument[]> {
  const rows = await queryMany<BudgetDocumentRow>(
    `SELECT slug, display_name, match_pattern, sort_order
     FROM ppb2026.budget_documents
     ORDER BY sort_order`,
    []
  )
  return rows
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
