import type { BudgetTreeLevel } from '@/components/table/BudgetStreamTree'
import type { FilterParamKey } from '@/lib/filter-constants'

export const DIMENSION_GROUPS: FilterParamKey[][] = [
  ['organ'],
  ['subject', 'subject_domain'],
  ['document_type'],
  [
    'budget_document',
    'budget_part',
    'section',
    'entity',
    'subprogramme',
    'programme',
  ],
]

export const BUDGET_LEVEL_PARAM: Record<BudgetTreeLevel, FilterParamKey> = {
  stream: 'budget_document',
  part: 'budget_part',
  section: 'section',
  entity: 'entity',
  subprogramme: 'subprogramme',
}
