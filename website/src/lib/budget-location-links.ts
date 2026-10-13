import type { EntityProgrammeRow } from './entities-programmes-tree'
import type { FilterOptions } from '../types/index'

/** Uses existing URL keys with every ancestor, never just a loose leaf name. */
export function budgetLocationFilters(
  row: EntityProgrammeRow,
  version: string
): FilterOptions {
  const path = JSON.parse(row.id) as string[]
  const filters: FilterOptions = {
    ppb_version: version,
    cited: '1',
    budget_document: path[1],
  }
  for (let index = 2; index < path.length; index += 2) {
    const kind = path[index],
      key = path[index + 1]
    if (kind === 'part') filters.budget_part = key
    if (kind === 'section') filters.section = key
    if (kind === 'entity') filters.entity = key
    if (kind === 'group') filters.budget_group = key
    if (kind === 'subprogramme')
      filters.subprogramme = (JSON.parse(key) as [number | null, string])[1]
  }
  return filters
}

export function budgetLocationHref(
  row: EntityProgrammeRow,
  version: string
): string {
  const filters = budgetLocationFilters(row, version)
  const params = new URLSearchParams({
    ppb_version: filters.ppb_version ?? version,
    budget_location: row.id,
  })
  return `/secretariat?${params}`
}
