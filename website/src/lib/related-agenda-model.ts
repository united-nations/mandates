/** Frozen, source-qualified AHWG concepts and their exact agenda occurrences. */
import { validateAppearanceAccounting } from '#lib/related-agenda-accounting'
import {
  normalizeAgendaItem,
  parseAgendaScope,
  type AgendaBody,
  type AgendaScope,
} from '#lib/agenda-scope'

export interface RelatedConcept {
  id: string
  body: AgendaBody
  title: string
}
export interface RelatedCluster {
  id: string
  title: string
  conceptIds: string[]
}
export interface RelatedOccurrence {
  id: string
  conceptId: string
  body: AgendaBody
  session: string
  item: string
  title: string
  status: 'verified' | 'unsupported'
  reason?: string
  scope?: AgendaScope
  referenceDocuments?: string[]
  itemTokens?: string[]
  scHeadingId?: string
  source: {
    symbol: string
    item: string
    url: string
    page: number
    kind: string
    meeting: string
  }
  evidence: Record<string, unknown>
}
export interface RelatedAgendaSnapshot {
  version: string
  concepts: RelatedConcept[]
  clusters: RelatedCluster[]
  occurrences: RelatedOccurrence[]
  accounting: {
    totalAppearances: number
    clusteredAppearances: number
    unclusteredAppearances: number
    appearances: {
      id: string
      conceptId: string
      classification: 'clustered' | 'unclustered'
    }[]
  }
}
export interface RelatedScope {
  version: string
  clusterId: string
  occurrenceId?: string
}

/** Reject conflicting identities and unverifiable occurrence scopes at import. */
export function validateRelatedSnapshot(snapshot: RelatedAgendaSnapshot) {
  if (
    !snapshot.version ||
    snapshot.concepts.length !== 121 ||
    snapshot.clusters.length !== 46
  )
    throw new Error('Invalid AHWG source inventory')
  for (const rows of [
    snapshot.concepts,
    snapshot.clusters,
    snapshot.occurrences,
  ])
    if (new Set(rows.map((row) => row.id)).size !== rows.length)
      throw new Error('Duplicate AHWG source identity')
  const concepts = new Map(snapshot.concepts.map((row) => [row.id, row]))
  const memberships = snapshot.clusters.flatMap((row) => row.conceptIds)
  if (
    memberships.length !== 121 ||
    new Set(memberships).size !== 121 ||
    memberships.some((id) => !concepts.has(id))
  )
    throw new Error(
      'AHWG cluster membership does not account for every concept'
    )
  for (const occurrence of snapshot.occurrences)
    validateOccurrence(occurrence, concepts)
  validateAppearanceAccounting(snapshot)
  return snapshot
}

/** A verified occurrence belongs to its exact concept, body, session and item. */
function validateOccurrence(
  row: RelatedOccurrence,
  concepts: Map<string, RelatedConcept>
) {
  if (
    !concepts.has(row.conceptId) ||
    concepts.get(row.conceptId)?.body !== row.body
  )
    throw new Error('AHWG occurrence has an unknown concept or body')
  if (row.status === 'unsupported' && row.reason && !row.scope) return
  if (row.status !== 'verified' || row.reason)
    throw new Error('AHWG occurrence classification is incomplete')
  const scope = parseAgendaScope(JSON.stringify(row.scope))
  if (
    !scope ||
    scope.body !== row.body ||
    scope.session !== row.session ||
    scope.item !== row.item
  )
    throw new Error('AHWG occurrence has an invalid agenda binding')
  if (row.body === 'SC') {
    if (row.scHeadingId !== scope.item)
      throw new Error('AHWG SC binding lacks a verified heading')
    return
  }
  if (
    !row.referenceDocuments?.length ||
    !row.itemTokens?.length ||
    row.itemTokens.some((item) => normalizeAgendaItem(item) !== item)
  )
    throw new Error('AHWG binding lacks audited document and item tokens')
}

/** Only immutable source IDs may select a cluster or one of its verified occurrences. */
export function parseRelatedSelector(
  snapshot: RelatedAgendaSnapshot,
  value?: string
): RelatedScope | null {
  try {
    const scope = JSON.parse(value ?? '')
    if (
      !scope ||
      Object.keys(scope).some(
        (key) => !['version', 'clusterId', 'occurrenceId'].includes(key)
      )
    )
      return null
    const cluster = snapshot.clusters.find((row) => row.id === scope.clusterId)
    if (scope.version !== snapshot.version || !cluster) return null
    if (
      scope.occurrenceId !== undefined &&
      !snapshot.occurrences.some(
        (row) =>
          row.id === scope.occurrenceId &&
          row.status === 'verified' &&
          cluster.conceptIds.includes(row.conceptId)
      )
    )
      return null
    return {
      version: snapshot.version,
      clusterId: cluster.id,
      ...(scope.occurrenceId !== undefined
        ? { occurrenceId: scope.occurrenceId }
        : {}),
    }
  } catch {
    return null
  }
}

/** Resolve source IDs to the complete verified cross-session union. */
export function relatedScopeOccurrences(
  snapshot: RelatedAgendaSnapshot,
  scope: RelatedScope
) {
  const validated = parseRelatedSelector(snapshot, JSON.stringify(scope))
  const cluster = snapshot.clusters.find(
    (row) => row.id === validated?.clusterId
  )
  return cluster
    ? snapshot.occurrences.filter(
        (row) =>
          row.status === 'verified' &&
          cluster.conceptIds.includes(row.conceptId) &&
          (!validated?.occurrenceId || row.id === validated.occurrenceId)
      )
    : []
}

/** Latest represented item, regardless of count; unavailable only when none is verified. */
export function latestRelatedOccurrences(snapshot: RelatedAgendaSnapshot) {
  const latest = new Map<string, RelatedOccurrence>()
  for (const occurrence of snapshot.occurrences) {
    const previous = latest.get(occurrence.conceptId)
    if (
      !previous ||
      (occurrence.status === 'verified' && previous.status !== 'verified') ||
      (occurrence.status === previous.status &&
        (Number(occurrence.session) > Number(previous.session) ||
          (Number(occurrence.session) === Number(previous.session) &&
            occurrence.id.localeCompare(previous.id) < 0)))
    )
      latest.set(occurrence.conceptId, occurrence)
  }
  return latest
}

/** Structural neighbours need same-session verified scope containment, never title similarity. */
export function relatedStructuralNeighbours(snapshot: RelatedAgendaSnapshot) {
  const sessions = new Map<string, RelatedOccurrence[]>()
  for (const occurrence of snapshot.occurrences) {
    if (occurrence.status !== 'verified' || !occurrence.scope) continue
    const key = JSON.stringify([occurrence.body, occurrence.session])
    const group = sessions.get(key) ?? []
    group.push(occurrence)
    sessions.set(key, group)
  }
  const neighbours = new Map<string, Set<string>>()
  const add = (from: string, to: string) => {
    const peers = neighbours.get(from) ?? new Set<string>()
    peers.add(to)
    neighbours.set(from, peers)
  }
  for (const group of sessions.values()) {
    for (const parent of group) {
      for (const child of group) {
        if (
          parent.conceptId === child.conceptId ||
          parent.scope!.items.length <= child.scope!.items.length
        )
          continue
        const parentItems = new Set(parent.scope!.items)
        if (!child.scope!.items.every((item) => parentItems.has(item))) continue
        add(parent.conceptId, child.conceptId)
        add(child.conceptId, parent.conceptId)
      }
    }
  }
  return neighbours
}
