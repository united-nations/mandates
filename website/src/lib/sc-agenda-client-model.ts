/** Total source-to-display conservation, without copying the source ledger to clients. */
import type { ScAgendaSnapshot } from '#lib/sc-agenda'
import { scRelatedOccurrenceBindings } from '#lib/related-sc-bindings'

export interface ScAgendaClientIndex {
  sourceSha256: string
  sourceVersion?: string
  years: { year: string; headings: { id: string; title: string }[] }[]
  relatedOccurrences: { id: string; clusterId: string; label: string }[]
}

export function buildScAgendaClientIndex(
  snapshots: ScAgendaSnapshot[],
  sourceSha256: string
): ScAgendaClientIndex {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256))
    throw new Error('SC client index source hash missing')
  const sourceVersion = snapshots[0]?.provenance.sourceVersion
  return {
    sourceSha256,
    ...(typeof sourceVersion === 'string' ? { sourceVersion } : {}),
    years: snapshots.map((snapshot) => ({
      year: snapshot.year,
      headings: snapshot.headings.map(({ id, title }) => ({ id, title })),
    })),
    relatedOccurrences: scRelatedOccurrenceBindings(snapshots).map((row) => ({
      id: row.id,
      clusterId: row.clusterId,
      label: `SC ${row.year} · ${row.title}`,
    })),
  }
}

export function validateScAgendaClientIndex(
  index: ScAgendaClientIndex,
  snapshots: ScAgendaSnapshot[],
  expectedSourceSha256: string
) {
  if (
    JSON.stringify(index) !==
    JSON.stringify(buildScAgendaClientIndex(snapshots, expectedSourceSha256))
  )
    throw new Error(
      'SC client index differs from audited source years/headings/labels'
    )
  return index
}
