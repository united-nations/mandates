import type { DetailBudgetLocation } from '../types/index'

export interface CitationScope {
  entity: string
  stream: DetailBudgetLocation['stream']
  part: string | null
  section: string | null
  subprogramme: string | null
  number: number | null
  support: boolean | null
}

export function citationScope(location: DetailBudgetLocation): CitationScope {
  const subprogramme =
    location.subprogramme === 'All Subprogrammes'
      ? null
      : location.subprogramme || null
  return {
    entity: location.entity ?? '',
    stream: location.stream,
    part: location.part || null,
    section: location.section || null,
    subprogramme,
    number: subprogramme ? location.subprogramme_number : null,
    support: location.stream === 'pko' ? !!location.is_support : null,
  }
}

export const citationScopeKey = (scope: CitationScope) =>
  JSON.stringify(['citation', scope])

/** Explicit nulls mean general citations, not the entity's entire section. */
export function parseCitationScope(value: string): CitationScope | null {
  try {
    const path = JSON.parse(value)
    if (!Array.isArray(path) || path.length !== 2 || path[0] !== 'citation')
      return null
    const s = path[1]
    if (
      !s ||
      typeof s !== 'object' ||
      Array.isArray(s) ||
      Object.keys(s).sort().join(',') !==
        'entity,number,part,section,stream,subprogramme,support' ||
      typeof s.entity !== 'string' ||
      !s.entity ||
      ![null, 'ppb', 'pko', 'plan_outline'].includes(s.stream) ||
      !['part', 'section', 'subprogramme'].every(
        (key) =>
          s[key] === null || (typeof s[key] === 'string' && s[key].length)
      ) ||
      !(s.number === null || Number.isInteger(s.number)) ||
      (s.subprogramme === null && s.number !== null) ||
      (s.stream === 'pko' ? typeof s.support !== 'boolean' : s.support !== null)
    )
      return null
    return s as CitationScope
  } catch {
    return null
  }
}

/** Shared null-safe predicates for the exact location link. */
export function citationScopePredicates(scope: CitationScope, start: number) {
  const expressions = [
    'ch.entity',
    'bdh.doc_type',
    "NULLIF(ch.budget_part_number, '')",
    "NULLIF(ch.section, '')",
    "NULLIF(NULLIF(ch.sub_programme, 'All Subprogrammes'), '')",
    "CASE WHEN NULLIF(NULLIF(ch.sub_programme, 'All Subprogrammes'), '') IS NULL THEN NULL ELSE ch.sub_programme_number END",
    "CASE WHEN bdh.doc_type = 'pko' THEN COALESCE(ch.section_title LIKE 'Administrative and budgetary aspects%', FALSE) ELSE NULL END",
  ]
  return {
    predicates: expressions.map(
      (expression, index) =>
        `${expression} IS NOT DISTINCT FROM $${start + index}`
    ),
    params: [
      scope.entity,
      scope.stream,
      scope.part,
      scope.section,
      scope.subprogramme,
      scope.number,
      scope.support,
    ],
  }
}
