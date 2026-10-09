/** Trusted, version-qualified AHWG links and agenda-table projections. */
import frozen from './data/ahwg-related-items.json' with { type: 'json' }
import { applyScRelatedOccurrenceBindings } from '#lib/related-sc-bindings'
import { scAgendaSnapshots } from '#lib/sc-agenda-snapshot'
import {
  parseRelatedSelector,
  latestRelatedOccurrences,
  hiddenHrcAnnotationConceptIds,
  relatedStructuralNeighbours,
  relatedScopeOccurrences,
  validateRelatedSnapshot,
  type RelatedAgendaSnapshot,
  type RelatedScope,
  type RelatedOccurrence,
} from '#lib/related-agenda-model'
import { validateRelatedLabels } from '#lib/related-agenda-label'
import {
  relatedOccurrencePredicate,
  relatedOccurrenceCountsSql,
} from '#lib/related-agenda-sql'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createHash } from 'node:crypto'
import { queryMany } from './db/query'
import type { AgendaNode } from '#lib/agenda-tree'
import type { RelatedClusterView } from '../components/RelatedItemsCell'

const sourceSnapshot = validateRelatedSnapshot(frozen as RelatedAgendaSnapshot)
validateRelatedLabels(sourceSnapshot)
export const relatedAgendaSnapshot = validateRelatedSnapshot(
  applyScRelatedOccurrenceBindings(sourceSnapshot, scAgendaSnapshots)
)
const hiddenAnnotations = hiddenHrcAnnotationConceptIds(relatedAgendaSnapshot)
const latestOccurrences = latestRelatedOccurrences(relatedAgendaSnapshot)
const structuralNeighbours = relatedStructuralNeighbours(relatedAgendaSnapshot)
const latestCountSql = relatedOccurrenceCountsSql([
  ...latestOccurrences.values(),
])
// Persist JSON rows, not Maps. Snapshot and SQL/parameter changes invalidate the entry.
const readLatestResolutionCounts = unstable_cache(
  () =>
    queryMany<{ id: string; resolution_count: number }>(
      latestCountSql.text,
      latestCountSql.params
    ),
  [
    'related-latest-represented-resolution-counts-v2',
    relatedAgendaSnapshot.version,
    createHash('sha256').update(JSON.stringify(latestCountSql)).digest('hex'),
  ],
  { revalidate: 300 }
)

/** Only successful database results persist; unavailable is request-local and retryable. */
export const getRelatedResolutionCounts = cache(async () => {
  try {
    const rows = await readLatestResolutionCounts()
    return new Map(rows.map((row) => [row.id, row.resolution_count]))
  } catch {
    console.error('Related agenda resolution counts unavailable')
    return new Map<string, number>()
  }
})

export const parseRelatedScope = (value?: string) =>
  parseRelatedSelector(relatedAgendaSnapshot, value)

/** Resolve only server-owned occurrence IDs; unknown versions fail closed. */
export function relatedResolutionPredicate(value: string, start: number) {
  const scope = parseRelatedScope(value)
  return relatedOccurrencePredicate(
    scope ? relatedScopeOccurrences(relatedAgendaSnapshot, scope) : [],
    start
  )
}

/** Links carry one removable selector and no implicit body or adoption-year filters. */
export const relatedScopeHref = (scope: RelatedScope) =>
  `/secretariat?${new URLSearchParams({ related_scope: JSON.stringify(scope), group: '0' })}`

/** Bind only to the exact item; never copy narrow relationships onto a parent. */
export function relatedClustersForNode(
  node: AgendaNode,
  counts: Map<string, number> = new Map()
): RelatedClusterView[] {
  const { concepts, clusters, occurrences, version } = relatedAgendaSnapshot
  const current = new Set(
    occurrences
      .filter(
        (row) =>
          row.status === 'verified' &&
          row.scope?.body === node.scope.body &&
          row.scope.session === node.scope.session &&
          row.scope.item === node.scope.item &&
          sameScopeItems(row, node)
      )
      .map((row) => row.conceptId)
  )
  const structural = new Set(
    [...current].flatMap((id) => [...(structuralNeighbours.get(id) ?? [])])
  )
  return clusters
    .filter((cluster) => cluster.conceptIds.some((id) => current.has(id)))
    .map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      href: occurrences.some(
        (row) =>
          row.status === 'verified' &&
          cluster.conceptIds.includes(row.conceptId)
      )
        ? relatedScopeHref({ version, clusterId: cluster.id })
        : undefined,
      members: cluster.conceptIds
        .filter(
          (id) =>
            !hiddenAnnotations.has(id) &&
            (current.has(id) || !structural.has(id))
        )
        .map((id) => {
          const concept = concepts.find((row) => row.id === id)!
          return {
            ...concept,
            current: current.has(id),
            occurrences: [latestOccurrences.get(id)!].map((row) => ({
              id: row.id,
              session: row.session,
              item: row.item,
              status: row.status,
              resolutionCount: counts.get(row.id),
              reason: row.reason,
              href:
                row.status === 'verified'
                  ? relatedScopeHref({
                      version,
                      clusterId: cluster.id,
                      occurrenceId: row.id,
                    })
                  : undefined,
            })),
          }
        }),
    }))
}

/** Send only the relevant relationship panels to the agenda client. */
export async function withRelatedItems<T extends { nodes: AgendaNode[] }>(
  data: T,
  suppliedCounts?: Map<string, number>
) {
  const counts = suppliedCounts ?? (await getRelatedResolutionCounts())
  return {
    ...data,
    nodes: data.nodes.map((node) => ({
      ...node,
      relatedItems: relatedClustersForNode(node, counts),
    })),
  }
}

/** A changed subtree cannot inherit a previously verified narrower binding. */
function sameScopeItems(row: RelatedOccurrence, node: AgendaNode) {
  const expected = row.scope!.items
  return (
    expected.length === node.scope.items.length &&
    expected.every((item) => node.scope.items.includes(item))
  )
}
