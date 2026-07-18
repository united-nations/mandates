'use client'

import {
  BudgetStreamTree,
  type BudgetTreeLevel,
} from '@/components/table/BudgetStreamTree'
import type { BudgetStream } from '@/types'

/**
 * Where a document sits in the budget, as a tree — the detail page's "group by
 * budget location" view. It renders the exact same `BudgetStream[]` shape as the
 * table's column filter, through the shared <BudgetStreamTree>; here the data is
 * `getBudgetHierarchy` scoped to this one document, and clicking a node
 * navigates to the main list filtered to it (rather than setting a filter in
 * place). Counts are hidden because, for a single document, every node is 1.
 */

/** Which filter param each selectable level navigates by. */
const LEVEL_PARAM: Record<BudgetTreeLevel, string> = {
  stream: 'budget_document',
  part: 'budget_part',
  section: 'section',
  entity: 'entity',
  subprogramme: 'subprogramme',
}

export function BudgetLocationTree({
  streams,
  foundationalEntities = [],
}: {
  streams: BudgetStream[]
  foundationalEntities?: string[]
}) {
  const navigate = (level: BudgetTreeLevel, value: string) => {
    window.location.href = `/?${LEVEL_PARAM[level]}=${encodeURIComponent(value)}`
  }

  return (
    <BudgetStreamTree
      hierarchy={streams}
      onSelect={navigate}
      showCounts={false}
      foundationalEntities={foundationalEntities}
    />
  )
}
