import type { AgendaNode } from '#lib/agenda-tree'

export interface ScAgendaSnapshot {
  body: 'SC'
  year: string
  provenance: Record<string, unknown>
  headings: {
    id: string
    title: string
    meetings: { symbol: string; date: string; resolutions: string[] }[]
  }[]
  resolutions: string[]
}

export interface ScRegistryResolution {
  identity: string
  symbol: string
}

/** Presentation only; authoritative titles and heading identities stay intact. */
export const scHeadingDisplayTitle = (title: string) =>
  title.replace(/\.[\s]*$/, '')

export function scHeadingResolutions(
  snapshot: ScAgendaSnapshot,
  year: string,
  headingId: string
): string[] | null {
  if (year !== snapshot.year) return null
  const heading = snapshot.headings.find((row) => row.id === headingId)
  return heading
    ? [
        ...new Set(heading.meetings.flatMap((meeting) => meeting.resolutions)),
      ].sort()
    : null
}

/** Official heading identities and adoption symbols, never inferred from titles. */
export function validateScAgendaSnapshot(snapshot: ScAgendaSnapshot) {
  const headings = snapshot.headings
  const meetings = headings.flatMap((heading) => heading.meetings)
  const resolutions = new Set(snapshot.resolutions)
  const adoptionAssignments = meetings.flatMap((meeting) => meeting.resolutions)
  const assigned = new Set(adoptionAssignments)
  if (
    snapshot.body !== 'SC' ||
    snapshot.year !== '2025' ||
    headings.length !== 46 ||
    new Set(headings.map((heading) => heading.id)).size !== headings.length ||
    headings.some((heading) => !heading.id || !heading.title.trim()) ||
    meetings.length !== 255 ||
    new Set(meetings.map((meeting) => meeting.symbol)).size !==
      meetings.length ||
    meetings.some((meeting) => !meeting.date.startsWith(`${snapshot.year}-`)) ||
    resolutions.size !== 44 ||
    resolutions.size !== snapshot.resolutions.length ||
    snapshot.resolutions.some(
      (symbol) => !/^S\/RES\/\d+\(2025\)$/.test(symbol)
    ) ||
    assigned.size !== resolutions.size ||
    adoptionAssignments.length !== resolutions.size ||
    [...assigned].some((symbol) => !resolutions.has(symbol))
  )
    throw new Error('SC snapshot heading/meeting/adoption conservation failed')
  return snapshot
}

export function buildScAgenda(
  snapshot: ScAgendaSnapshot,
  registry: ScRegistryResolution[]
) {
  validateScAgendaSnapshot(snapshot)
  if (
    new Set(registry.map((row) => row.identity)).size !== registry.length ||
    registry.some(
      (row) =>
        !snapshot.resolutions.includes(row.identity) ||
        row.symbol.normalize('NFKC').replace(/\s/g, '').toUpperCase() !==
          row.identity
    )
  )
    throw new Error('SC registry resolution identity accounting failed')
  const available = new Map(registry.map((row) => [row.identity, row.symbol]))
  const nodes: AgendaNode[] = snapshot.headings.map((heading) => {
    const symbols = [
      ...new Set(heading.meetings.flatMap((meeting) => meeting.resolutions)),
    ]
      .flatMap((symbol) =>
        available.has(symbol) ? [available.get(symbol)!] : []
      )
      .sort()
    return {
      id: JSON.stringify(['SC', snapshot.year, heading.id]),
      item: heading.id,
      token: heading.id,
      titles: [heading.title],
      allocations: [],
      sourceRows: heading.meetings.map((meeting) => meeting.symbol),
      meetingCount: new Set(heading.meetings.map((meeting) => meeting.symbol))
        .size,
      sourceIds: [heading.id],
      heading: '',
      depth: 0,
      directSymbols: symbols,
      symbols,
      scope: {
        body: 'SC',
        session: snapshot.year,
        item: heading.id,
        items: [heading.id],
      },
      titleDifferences: [],
    }
  })
  nodes.sort(
    (a, b) =>
      b.meetingCount! - a.meetingCount! ||
      a.titles[0].localeCompare(b.titles[0], 'en') ||
      a.id.localeCompare(b.id, 'en')
  )
  if (nodes.reduce((total, node) => total + node.meetingCount!, 0) !== 255)
    throw new Error('SC distinct formal meeting count conservation failed')
  return {
    nodes,
    accounting: {
      sourceRows: snapshot.headings.flatMap((heading) => heading.meetings)
        .length,
      nodes: nodes.length,
      duplicates: 0,
      excluded: [],
      ambiguousTokens: [],
      unresolvedReferences: [],
      resolutions: snapshot.resolutions.map((symbol) => ({
        symbol,
        registrySymbol: available.get(symbol) ?? null,
      })),
      missingSymbols: snapshot.resolutions.filter(
        (symbol) => !available.has(symbol)
      ),
    },
  }
}
