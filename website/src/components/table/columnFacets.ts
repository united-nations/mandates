import { ORGAN_CATEGORIES } from '@/lib/organ-groups'
import type { BudgetStream, EntityWithCount, OrganWithCount } from '@/types'
import type { FilterGroup, FilterOption } from './ColumnHeaderFilter'

/**
 * Facet option lists for the column filters. Named FilterFacets to avoid
 * colliding with the data-layer FilterOptions (active filter *values*).
 */
export interface FilterFacets {
  budgetHierarchy: BudgetStream[]
  programmes: { value: string; count: number }[]
  subjects: { value: string; count: number }[]
  documentTypes: { value: string; count: number }[]
  agendaItems: { value: string; count: number }[]
  yearRange: { min: number; max: number }
  yearDistribution: Record<string, number>
}

/**
 * Everything the column filters need to render their options. The two count
 * lists stay separate from the reference lists (organsData/entitiesData) used
 * for short↔long lookups in cell rendering.
 */
export interface ColumnFacetSources {
  organCounts: OrganWithCount[]
  entityCounts: EntityWithCount[]
  filterOptions: FilterFacets
}

/**
 * Which options a column's filter offers. Shared by the table header and the
 * "More columns and filters" menu, which reach the same filter from two places
 * and must not drift into offering different option lists.
 */
export function getColumnFilterOptions(
  columnId: string,
  { organCounts, entityCounts, filterOptions }: ColumnFacetSources
): FilterOption[] | undefined {
  switch (columnId) {
    case 'organ':
      // organCounts is already ordered by count DESC from the DB (faceted on
      // all other active filters, see getOrganCounts). label = short so the
      // acronym renders verbatim (titleCase would mangle e.g. ECOSOC).
      return organCounts.map((o) => ({
        value: o.short,
        label: o.short,
        count: o.count,
      }))
    case 'entity_list':
    case 'entity_count':
      return entityCounts.map((e) => ({ value: e.entity, count: e.count }))
    case 'subjects':
      return filterOptions.subjects
    case 'document_type':
      return filterOptions.documentTypes
    case 'agenda_item':
      return filterOptions.agendaItems
    default:
      return undefined
  }
}

/** Organs group by their place in the UN system (shared with the /organs page). */
export function getColumnFilterGroups(
  columnId: string
): FilterGroup[] | undefined {
  return columnId === 'organ'
    ? ORGAN_CATEGORIES.map((c) => ({ label: c.label, values: c.organs }))
    : undefined
}
