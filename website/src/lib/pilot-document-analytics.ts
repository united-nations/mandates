import { PILOT_ACTIVITY_LABELS } from '#lib/paragraph-pilot'

export type PilotDimension = 'actions' | 'assignees' | 'tasks'
export interface PilotDocument {
  symbol: string
  body: string
  targets: number
  validated: number
  facets: Record<PilotDimension, string[][]>
}
export interface PilotAnalytics {
  model: string
  reasoning: string
  sampleHash: string
  sampleDocuments: number
  targets: number
  validated: number
  documents: PilotDocument[]
}
export function documentFacetPaths(
  doc: PilotDocument,
  dimension: PilotDimension
): string[][] {
  if (dimension !== 'assignees') return doc.facets[dimension]
  return doc.facets.assignees.map(([type, name]) =>
    type === 'member_states'
      ? ['member_states', name]
      : ['un_organs', 'un_secretariat', 'un_system'].includes(type)
        ? ['un', type, name]
        : ['other', type, name]
  )
}
export function matchesDocumentFacet(
  doc: PilotDocument,
  dimension: PilotDimension,
  path: string[]
): boolean {
  return (
    !path.length ||
    documentFacetPaths(doc, dimension).some((value) =>
      path.every((part, i) => part === value[i])
    )
  )
}
export function countDocumentFacets(
  docs: readonly PilotDocument[],
  dimension: PilotDimension
): { path: string[]; count: number }[] {
  const counts = new Map<string, number>()
  for (const doc of docs) {
    const seen = new Set<string>()
    for (const path of documentFacetPaths(doc, dimension))
      for (let i = 1; i <= path.length; i++)
        seen.add(JSON.stringify(path.slice(0, i)))
    for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts]
    .map(([key, count]) => ({ path: JSON.parse(key) as string[], count }))
    .sort((a, b) =>
      dimension === 'assignees'
        ? ['member_states', 'un', 'other'].indexOf(a.path[0]) -
            ['member_states', 'un', 'other'].indexOf(b.path[0]) ||
          b.count - a.count
        : b.count - a.count
    )
}
export function analyticsFacetLabel(value: string): string {
  const actors: Record<string, string> = {
    un: 'UN system',
    un_organs: 'UN intergovernmental bodies',
    un_secretariat: 'UN Secretariat',
    un_system: 'Other UN system organizations',
    member_states: 'Member States',
    other: 'Other',
    unresolved: 'Unresolved actor type',
  }
  return (
    actors[value] ??
    PILOT_ACTIVITY_LABELS[value] ??
    value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  )
}

export function documentFacetTree(
  docs: readonly PilotDocument[],
  dimension: PilotDimension
) {
  const facets = countDocumentFacets(docs, dimension)
  const tree = (
    parent: string[] = []
  ): import('./paragraph-pilot').PilotFacetNode[] =>
    facets
      .filter(
        (f) =>
          f.path.length === parent.length + 1 &&
          parent.every((part, i) => f.path[i] === part)
      )
      .map((f) => ({
        value: JSON.stringify(f.path),
        label: analyticsFacetLabel(f.path[f.path.length - 1]),
        count: f.count,
        children: tree(f.path),
      }))
  return tree()
}
