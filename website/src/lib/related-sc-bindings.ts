/** Explicit source occurrences eligible for a newly audited year, never title aliases. */
import type { RelatedAgendaSnapshot } from '#lib/related-agenda-model'
import type { ScAgendaSnapshot } from '#lib/sc-agenda'

const eligible = [
  {
    id: 'appearance-233411dd7a489de9b9f38fee',
    conceptId: 'SC-667259933142',
    year: '2023',
    meeting: 'S/PV.9471',
    agenda: 'S/Agenda/9471',
    clusterId: '18',
    title:
      'Election of five members of the International Court of Justice (S/2023/445, S/2023/446 and S/2023/447)',
  },
  {
    id: 'appearance-145eda6f79af6cad201d6149',
    conceptId: 'SC-d3314b276073',
    year: '2024',
    meeting: 'S/PV.9597',
    agenda: 'S/Agenda/9597',
    clusterId: '17',
    title: 'Admission of new members',
  },
  {
    id: 'appearance-dfd9e7b0fa4a6d7162ff6192',
    conceptId: 'SC-d3314b276073',
    year: '2024',
    meeting: 'S/PV.9609',
    agenda: 'S/Agenda/9609',
    clusterId: '17',
    title: 'Admission of new members',
  },
] as const

export function scRelatedOccurrenceBindings(snapshots: ScAgendaSnapshot[]) {
  return snapshots.flatMap((snapshot) => {
    const bindings = snapshot.provenance.relatedOccurrenceBindings
    if (bindings === undefined) return []
    if (!Array.isArray(bindings))
      throw new Error('Invalid SC related binding inventory')
    const sourceEvidence = snapshot.provenance.sourceEvidenceIds
    const seen = new Set<string>()
    return bindings.map((binding: unknown) => {
      if (
        !binding ||
        typeof binding !== 'object' ||
        !('occurrenceId' in binding) ||
        !('year' in binding) ||
        !('headingId' in binding) ||
        !('evidenceIds' in binding)
      )
        throw new Error('Invalid SC related binding')
      const source = eligible.find((row) => row.id === binding.occurrenceId)
      const heading = snapshot.headings.find(
        (row) => row.id === binding.headingId
      )
      if (
        !source ||
        source.year !== snapshot.year ||
        binding.year !== snapshot.year ||
        !heading?.meetings.some((row) => row.symbol === source.meeting) ||
        !Array.isArray(binding.evidenceIds) ||
        !binding.evidenceIds.length ||
        !Array.isArray(sourceEvidence) ||
        binding.evidenceIds.some(
          (id) => typeof id !== 'string' || !sourceEvidence.includes(id)
        ) ||
        seen.has(source.id)
      )
        throw new Error(
          'SC related binding lacks exact occurrence/PV/evidence proof'
        )
      seen.add(source.id)
      return {
        ...source,
        headingId: heading.id,
        evidenceIds: binding.evidenceIds as string[],
        sourceVersion: snapshot.provenance.sourceVersion,
      }
    })
  })
}

/** Copies only explicitly audited occurrences; the frozen ledger is never modified. */
export function applyScRelatedOccurrenceBindings(
  snapshot: RelatedAgendaSnapshot,
  years: ScAgendaSnapshot[]
): RelatedAgendaSnapshot {
  const bindings = scRelatedOccurrenceBindings(years)
  const byId = new Map<string, (typeof bindings)[number]>(
    bindings.map((row) => [row.id, row])
  )
  if (!bindings.length) return snapshot
  for (const binding of bindings) {
    const row = snapshot.occurrences.find((row) => row.id === binding.id)
    if (
      !row ||
      row.body !== 'SC' ||
      row.status !== 'unsupported' ||
      row.conceptId !== binding.conceptId ||
      row.session !== binding.year ||
      row.source.symbol !== binding.agenda ||
      row.source.item !== '2' ||
      row.source.page !== 1 ||
      row.source.kind !== 'Meeting agenda' ||
      row.title !== binding.title ||
      !snapshot.clusters
        .find((cluster) => cluster.id === binding.clusterId)
        ?.conceptIds.includes(row.conceptId)
    )
      throw new Error(
        'SC related binding disagrees with frozen source occurrence'
      )
  }
  return {
    ...snapshot,
    occurrences: snapshot.occurrences.map((row) => {
      const binding = byId.get(row.id)
      if (!binding) return row
      const source = { ...row }
      delete source.reason
      return {
        ...source,
        status: 'verified',
        item: binding.headingId,
        scHeadingId: binding.headingId,
        scope: {
          body: 'SC',
          session: binding.year,
          item: binding.headingId,
          items: [binding.headingId],
        },
        evidence: { ...row.evidence, auditedRuntimeBinding: binding },
      }
    }),
  }
}
