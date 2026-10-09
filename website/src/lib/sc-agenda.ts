import type { AgendaNode } from '#lib/agenda-tree'

export interface ScAgendaSnapshot {
  body: 'SC'
  year: string
  dataCutoff?: string
  coverage?: 'complete' | 'partial'
  documents?: string[]
  formalMeetings?: {
    symbol: string
    date: string
    considerationStatus: 'considered' | 'agenda_not_adopted' | 'unsupported'
    reason?: string
  }[]
  provenance: Record<string, unknown>
  headings: {
    id: string
    title: string
    documents?: string[]
    meetings: {
      symbol: string
      date: string
      resolutions: string[]
      documents?: string[]
    }[]
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

/** Adopted mandate symbols from explicit source outcomes, including PRST and decisions. */
export function scHeadingMandateDocuments(
  snapshot: ScAgendaSnapshot,
  year: string,
  headingId: string
) {
  if (year !== snapshot.year) return null
  const heading = snapshot.headings.find((row) => row.id === headingId)
  return heading
    ? [
        ...new Set(
          heading.documents ??
            heading.meetings.flatMap(
              (meeting) => meeting.documents ?? meeting.resolutions
            )
        ),
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
    !/^\d{4}$/.test(snapshot.year) ||
    (snapshot.documents === undefined && snapshot.year !== '2025') ||
    (snapshot.year === '2025' && headings.length !== 46) ||
    !headings.length ||
    new Set(headings.map((heading) => heading.id)).size !== headings.length ||
    headings.some((heading) => !heading.id || !heading.title.trim()) ||
    (snapshot.year === '2025' && meetings.length !== 255) ||
    new Set(meetings.map((meeting) => meeting.symbol)).size !==
      meetings.length ||
    meetings.some((meeting) => !meeting.date.startsWith(`${snapshot.year}-`)) ||
    (snapshot.year === '2025' && resolutions.size !== 44) ||
    resolutions.size !== snapshot.resolutions.length ||
    snapshot.resolutions.some(
      (symbol) =>
        !new RegExp(`^S/RES/[0-9]+\\(${snapshot.year}\\)$`).test(symbol)
    ) ||
    assigned.size !== resolutions.size ||
    adoptionAssignments.length !== resolutions.size ||
    [...assigned].some((symbol) => !resolutions.has(symbol))
  )
    throw new Error('SC snapshot heading/meeting/adoption conservation failed')
  if (snapshot.documents) {
    const accounting = snapshot.provenance.accounting
    const totals = accounting && typeof accounting === 'object' && 'totals' in accounting ? accounting.totals : null
    if (!snapshot.formalMeetings || !totals || typeof totals !== 'object' || !('uniqueFormalMeetings' in totals) || snapshot.formalMeetings.length !== totals.uniqueFormalMeetings)
      throw new Error('SC source formal meeting inventory or total missing')
  }
  if (snapshot.formalMeetings) {
    const formal = snapshot.formalMeetings
    const bySymbol = new Map(formal.map((row) => [row.symbol, row]))
    const assigned = new Set(meetings.map((row) => row.symbol))
    if (
      bySymbol.size !== formal.length ||
      formal.some(
        (row) =>
          !row.date.startsWith(`${snapshot.year}-`) ||
          (row.considerationStatus === 'considered'
            ? !assigned.has(row.symbol)
            : assigned.has(row.symbol) || !row.reason)
      ) ||
      meetings.some((row) => bySymbol.get(row.symbol)?.date !== row.date)
    )
      throw new Error('SC formal and considered meeting conservation failed')
  }
  if (snapshot.documents) {
    const documents = new Set(snapshot.documents)
    const headingDocuments = new Set(
      headings.flatMap(
        (heading) =>
          heading.documents ??
          heading.meetings.flatMap(
            (meeting) => meeting.documents ?? meeting.resolutions
          )
      )
    )
    if (
      documents.size !== snapshot.documents.length ||
      headingDocuments.size !== documents.size ||
      [...headingDocuments].some((symbol) => !documents.has(symbol)) ||
      [...resolutions].some((symbol) => !documents.has(symbol))
    )
      throw new Error('SC adopted mandate document conservation failed')
  }
  return snapshot
}

const meetingsInSnapshot = (snapshot: ScAgendaSnapshot) =>
  new Set(
    snapshot.headings.flatMap((heading) =>
      heading.meetings.map((meeting) => meeting.symbol)
    )
  ).size

export function buildScAgenda(
  snapshot: ScAgendaSnapshot,
  registry: ScRegistryResolution[]
) {
  validateScAgendaSnapshot(snapshot)
  if (
    new Set(registry.map((row) => row.identity)).size !== registry.length ||
    registry.some(
      (row) =>
        !(snapshot.documents ?? snapshot.resolutions).includes(row.identity) ||
        row.symbol.normalize('NFKC').replace(/\s/g, '').toUpperCase() !==
          row.identity
    )
  )
    throw new Error('SC registry resolution identity accounting failed')
  const available = new Map(registry.map((row) => [row.identity, row.symbol]))
  const nodes: AgendaNode[] = snapshot.headings.map((heading) => {
    const symbols = [
      ...new Set(
        heading.documents ??
          heading.meetings.flatMap(
            (meeting) => meeting.documents ?? meeting.resolutions
          )
      ),
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
  if (
    nodes.reduce((total, node) => total + node.meetingCount!, 0) !==
    snapshot.headings.reduce(
      (total, heading) => total + heading.meetings.length,
      0
    )
  )
    throw new Error('SC distinct formal meeting count conservation failed')
  return {
    nodes,
    accounting: {
      sourceRows:
        snapshot.formalMeetings?.length ??
        snapshot.headings.flatMap((heading) => heading.meetings).length,
      formalMeetings:
        snapshot.formalMeetings?.length ?? meetingsInSnapshot(snapshot),
      consideredMeetings: meetingsInSnapshot(snapshot),
      nodes: nodes.length,
      duplicates: 0,
      excluded: [],
      ambiguousTokens: [],
      unresolvedReferences: [],
      documents: (snapshot.documents ?? snapshot.resolutions).map((symbol) => ({
        symbol,
        registrySymbol: available.get(symbol) ?? null,
      })),
      resolutions: snapshot.resolutions.map((symbol) => ({
        symbol,
        registrySymbol: available.get(symbol) ?? null,
      })),
      missingSymbols: (snapshot.documents ?? snapshot.resolutions).filter(
        (symbol) => !available.has(symbol)
      ),
    },
  }
}
