import type { FilterOptions } from '../types/index'
import { explainerTexts } from '#lib/en_text_contents'
import { parseCitationScope } from '#lib/citation-budget-location'

export const BUDGET_LOCATION_KEYS = [
  'budget_location',
  'budget_document',
  'budget_group',
  'budget_part',
  'section',
  'entity',
  'subprogramme',
  'programme',
] as const

/** Decode one removable location without dropping any ancestor constraints. */
export function parseBudgetLocation(value: string): FilterOptions | null {
  try {
    const path: unknown = JSON.parse(value)
    const citation = parseCitationScope(value)
    if (citation)
      return {
        entity: citation.entity,
        budget_document: citation.stream ?? undefined,
        budget_part: citation.part ?? undefined,
        section: citation.section ?? undefined,
        subprogramme: citation.subprogramme ?? undefined,
      }
    if (
      Array.isArray(path) &&
      path.length === 2 &&
      path[0] === 'entity' &&
      typeof path[1] === 'string' &&
      path[1]
    )
      return { entity: path[1] }
    if (
      !Array.isArray(path) ||
      path.length < 2 ||
      path.length > 10 ||
      path.length % 2 ||
      !path.every((key) => typeof key === 'string' && key.length > 0)
    )
      return null
    const levels =
      path[1] === 'ppb'
        ? ['stream', 'part', 'section', 'entity', 'subprogramme']
        : path[1] === 'pko'
          ? ['stream', 'group', 'entity']
          : path[1] === 'plan_outline'
            ? ['stream']
            : []
    if (
      !levels.length ||
      path.length > levels.length * 2 ||
      path.some((key, index) => index % 2 === 0 && key !== levels[index / 2])
    )
      return null
    const scope: FilterOptions = { budget_document: path[1] }
    for (let index = 2; index < path.length; index += 2) {
      const kind = path[index],
        key = path[index + 1]
      if (kind === 'part') scope.budget_part = key
      if (kind === 'section') scope.section = key
      if (kind === 'entity') scope.entity = key
      if (kind === 'group') {
        if (!['missions', 'support'].includes(key)) return null
        scope.budget_group = key
      }
      if (kind === 'subprogramme') {
        const subprogramme: unknown = JSON.parse(key)
        if (
          !Array.isArray(subprogramme) ||
          subprogramme.length !== 2 ||
          (subprogramme[0] !== null && !Number.isInteger(subprogramme[0])) ||
          typeof subprogramme[1] !== 'string' ||
          !subprogramme[1]
        )
          return null
        scope.subprogramme = subprogramme[1]
      }
    }
    return scope
  } catch {
    return null
  }
}

export function withoutBudgetLocation(
  params: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of BUDGET_LOCATION_KEYS) next.delete(key)
  return next
}

export function budgetLocationLabel(
  scope: FilterOptions,
  streamLabels: Record<string, string>
): string {
  const text = explainerTexts.entitiesAndProgrammes
  const citation = scope.budget_location
    ? parseCitationScope(scope.budget_location)
    : null
  if (citation)
    return (
      citation.subprogramme ??
      (citation.section
        ? `${text.section} ${citation.section}: ${explainerTexts.mandateDetail.citationCounts.general}`
        : (streamLabels[citation.stream ?? ''] ??
          explainerTexts.mandateDetail.citationCounts.noLocation))
    )
  if (scope.subprogramme) return scope.subprogramme
  if (scope.entity) return scope.entity
  if (scope.section) return `${text.section} ${scope.section}`
  if (scope.budget_part) return `${text.part} ${scope.budget_part}`
  if (scope.budget_group)
    return (
      text.groups[scope.budget_group as 'missions' | 'support'] ??
      text.peacekeepingGroup
    )
  return streamLabels[scope.budget_document ?? ''] ?? text.location
}
