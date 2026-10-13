import type { AgendaTreeEntry } from '#lib/agenda-tree'

/** Source allocations only; a blank tag never implies plenary or parent allocation. */
export function agendaAllocations(allocations: string[]): string[] {
  return [
    ...new Set(
      allocations.flatMap((value) =>
        value
          .split(';')
          .map((label) => label.trim())
          .filter(Boolean)
      )
    ),
  ]
}

/** Keep matching items plus their headings/ancestors, without unrelated siblings. */
export function filterAgendaCommittee(
  entries: AgendaTreeEntry[],
  committee: string
): AgendaTreeEntry[] {
  if (!committee) return entries
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  const included = new Set<string>()
  for (const entry of entries) {
    if (entry.kind !== 'item') continue
    const allocations = agendaAllocations(entry.node.allocations)
    if (
      committee === 'untagged'
        ? allocations.length > 0
        : !allocations.includes(committee)
    )
      continue
    let current: AgendaTreeEntry | undefined = entry
    while (current && !included.has(current.id)) {
      included.add(current.id)
      current =
        current.kind === 'item'
          ? byId.get(current.node.parentId ?? current.groupId ?? '')
          : undefined
    }
  }
  return entries.filter((entry) => included.has(entry.id))
}
