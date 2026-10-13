/** Merge an official PPB backbone with intact citation-derived locations. */
import type { EntityProgrammeRow } from './entities-programmes-tree'
import { budgetLocationFilters } from '#lib/budget-location-links'

export interface OfficialProgrammeStructure {
  version: string
  budgetCycle: string
  budgetVersion: string
  rows: EntityProgrammeRow[]
  accounting: {
    inputs: {
      id: string
      source: string
      classification: 'represented' | 'funding_duplicate' | 'nonprogramme'
      rowIds: string[]
      reason?: string
    }[]
  }
}

/** Every official source observation is represented or explicitly classified. */
export function validateOfficialProgrammeStructure(
  source: OfficialProgrammeStructure
) {
  const rows = new Map(source.rows.map((row) => [row.id, row]))
  if (
    !source.version ||
    source.budgetCycle !== '2027' ||
    rows.size !== source.rows.length ||
    source.rows.some(
      (row) => row.count !== 0 || (row.parentId && !rows.has(row.parentId))
    )
  )
    throw new Error(
      'Official programme backbone has conflicting identities or citation counts'
    )
  const inputs = source.accounting.inputs
  if (
    !inputs.length ||
    new Set(inputs.map((row) => JSON.stringify([row.source, row.id]))).size !==
      inputs.length
  )
    throw new Error('Official programme inputs are missing or duplicated')
  const represented = new Set(
    inputs
      .filter((input) => input.classification === 'represented')
      .flatMap((input) => input.rowIds)
  )
  if (represented.size !== rows.size)
    throw new Error('Official backbone contains rows without source evidence')
  for (const input of inputs) {
    if (
      input.classification === 'represented'
        ? !input.rowIds.length || input.rowIds.some((id) => !rows.has(id))
        : !['funding_duplicate', 'nonprogramme'].includes(
            input.classification
          ) ||
          input.rowIds.some((id) => !rows.has(id)) ||
          (input.classification === 'funding_duplicate'
            ? !input.rowIds.length
            : !input.reason || input.rowIds.length > 0)
    )
      throw new Error(
        'Official programme source observation is unaccounted for'
      )
  }
  return source
}

/** Existing IDs, counts and filter scopes survive; new source locations have zero citations. */
export function completeProgrammeRows(
  citations: EntityProgrammeRow[],
  source: OfficialProgrammeStructure,
  version: string
): EntityProgrammeRow[] {
  validateOfficialProgrammeStructure(source)
  if (source.budgetVersion !== version)
    throw new Error(
      'Official programme structure belongs to a different budget version'
    )
  if (new Set(citations.map((row) => row.id)).size !== citations.length)
    throw new Error('Citation hierarchy has duplicate identities')
  const byId = new Map(
    source.rows.map((row) => [
      row.id,
      { ...row, citationAvailable: false } as EntityProgrammeRow,
    ])
  )
  for (const row of citations) byId.set(row.id, row)
  const children = programmeChildren([...byId.values()], citations)
  const output: EntityProgrammeRow[] = []
  const visited = new Set<string>()
  const visit = (parent?: string) => {
    for (const row of children.get(parent) ?? []) {
      if (visited.has(row.id))
        throw new Error('Programme hierarchy contains a cycle')
      visited.add(row.id)
      output.push({
        ...row,
        hasChildren: Boolean(children.get(row.id)?.length),
      })
      visit(row.id)
    }
  }
  visit()
  if (output.length !== byId.size)
    throw new Error('Programme hierarchy lost a disconnected location')
  verifyCitationLocations(citations, output, version)
  return output
}

/** Numbered locations follow budget order; cited entities retain their previous count order. */
function programmeChildren(
  rows: EntityProgrammeRow[],
  citations: EntityProgrammeRow[]
) {
  const ids = new Set(rows.map((row) => row.id))
  const children = new Map<string | undefined, EntityProgrammeRow[]>()
  for (const row of rows) {
    if (row.parentId && !ids.has(row.parentId))
      throw new Error('Programme hierarchy has a missing parent')
    const siblings = children.get(row.parentId) ?? []
    siblings.push(row)
    children.set(row.parentId, siblings)
  }
  const previousOrder = new Map(citations.map((row, index) => [row.id, index]))
  const parts = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII',
    'XIII',
    'XIV',
  ]
  for (const siblings of children.values())
    siblings.sort((a, b) => {
      if (a.kind !== b.kind) return 0
      const left = JSON.parse(a.id) as string[]
      const right = JSON.parse(b.id) as string[]
      if (a.kind === 'part')
        return parts.indexOf(left[3]) - parts.indexOf(right[3])
      if (a.kind === 'section')
        return left[5].localeCompare(right[5], 'en', { numeric: true })
      if (a.kind === 'subprogramme') {
        const first = JSON.parse(left.at(-1)!) as [number | null, string]
        const second = JSON.parse(right.at(-1)!) as [number | null, string]
        return (
          (first[0] ?? Number.MAX_SAFE_INTEGER) -
          (second[0] ?? Number.MAX_SAFE_INTEGER)
        )
      }
      if (a.kind === 'entity')
        return (
          b.count - a.count ||
          (previousOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (previousOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
          a.label.localeCompare(b.label, 'en')
        )
      if (a.kind === 'stream')
        return (
          (previousOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (previousOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
      return 0
    })
  return children
}

/** Reject any accidental change to the citation row universe or its actual query scopes. */
function verifyCitationLocations(
  before: EntityProgrammeRow[],
  after: EntityProgrammeRow[],
  version: string
) {
  const byId = new Map(after.map((row) => [row.id, row]))
  for (const row of before) {
    const merged = byId.get(row.id)
    if (
      !merged ||
      merged.count !== row.count ||
      merged.parentId !== row.parentId ||
      JSON.stringify(budgetLocationFilters(merged, version)) !==
        JSON.stringify(budgetLocationFilters(row, version))
    )
      throw new Error(
        'Official structure changed an existing citation location or count'
      )
  }
}
