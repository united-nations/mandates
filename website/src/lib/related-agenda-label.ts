import { scAgendaClientIndex } from '#lib/sc-agenda-client-index'
/** Small source-derived display index keeps the full audit ledger server-side. */
import frozen from './data/ahwg-related-labels.json' with { type: 'json' }
const labels: {
  version: string
  clusters: Record<string, string>
  occurrences: Record<string, { clusterId: string; label: string }>
} = frozen

/** A chip names only a trusted version-qualified cluster or verified occurrence. */
export function relatedScopeLabel(value: string) {
  try {
    const scope = JSON.parse(value)
    if (
      !scope ||
      typeof scope.version !== 'string' ||
      typeof scope.clusterId !== 'string' ||
      (scope.occurrenceId !== undefined &&
        typeof scope.occurrenceId !== 'string') ||
      scope.version !== labels.version ||
      Object.keys(scope).some(
        (key) => !['version', 'clusterId', 'occurrenceId'].includes(key)
      )
    )
      return null
    const title = Object.hasOwn(labels.clusters, scope.clusterId)
      ? labels.clusters[scope.clusterId]
      : null
    if (!title) return null
    if (scope.occurrenceId === undefined) return title
    const runtime = scAgendaClientIndex.relatedOccurrences.find(
      (row) => row.id === scope.occurrenceId
    )
    const occurrence = runtime
      ? {
          clusterId: runtime.clusterId,
          label: runtime.label,
        }
      : Object.hasOwn(labels.occurrences, scope.occurrenceId)
        ? labels.occurrences[scope.occurrenceId]
        : null
    return occurrence && occurrence.clusterId === scope.clusterId
      ? `${title} · ${occurrence.label}`
      : null
  } catch {
    return null
  }
}

/** Reject a stale or incomplete client display index when the server loads its source. */
export function validateRelatedLabels(
  snapshot: import('./related-agenda-model').RelatedAgendaSnapshot
) {
  const verified = snapshot.occurrences.filter(
    (row) => row.status === 'verified'
  )
  if (
    labels.version !== snapshot.version ||
    Object.keys(labels.clusters).length !== snapshot.clusters.length ||
    Object.keys(labels.occurrences).length !== verified.length
  )
    throw new Error('AHWG display index does not match its source version')
  for (const cluster of snapshot.clusters) {
    if (labels.clusters[cluster.id] !== cluster.title)
      throw new Error('AHWG display index has a conflicting cluster')
    for (const row of verified.filter((row) =>
      cluster.conceptIds.includes(row.conceptId)
    )) {
      const label = labels.occurrences[row.id]
      if (
        label?.clusterId !== cluster.id ||
        label.label !== `${row.body} ${row.session} · ${row.title}`
      )
        throw new Error('AHWG display index has a conflicting occurrence')
    }
  }
}
