import { validateScAgendaSnapshot, type ScAgendaSnapshot } from '#lib/sc-agenda'
export interface SecurityCouncilAgendaDataset {
  version: string
  body: 'SC'
  defaultYear: '2025'
  years: CouncilYear[]
}
export interface CouncilYear {
  year: string
  provenance: {
    coverage: 'complete' | 'partial'
    dataCutoff: string
    retrievedAt?: string
    sources: {
      id: string
      url?: string
      path?: string
      sha256?: string
      retrievedAt?: string
    }[]
    scope: string
    knownGaps: string[]
    annualCompletenessProof?: unknown
  }
  headings: {
    id: string
    title: string
    classification?: string
    meetingIds: string[]
    adoptedDocumentSymbols: string[]
    registeredDocumentSymbols: string[]
    evidenceIds: string[]
  }[]
  meetings: {
    id: string
    symbol: string
    date: string
    private: boolean | null
    headingIds: string[]
    outcomeIds: string[]
    evidenceIds: string[]
    considerationStatus: 'considered' | 'agenda_not_adopted' | 'unsupported'
    reason?: string
  }[]
  outcomes: {
    id: string
    meetingId?: string
    adoptingMeetingSymbol?: string
    headingIds: string[]
    type: 'resolution' | 'presidential_statement' | 'decision' | 'other'
    symbol?: string
    status: 'adopted' | 'not_adopted' | 'unresolvable' | 'unsupported'
    reason?: string
    registryStatus: 'registered' | 'not_registered' | 'not_resolvable'
    registrySymbols: string[]
    registryTypes: (string | null)[]
    evidenceIds: string[]
  }[]
  evidence: {
    id: string
    source: string
    url?: string
    recordId?: number
    path?: string
    field?: string
    quote?: string
    [key: string]: unknown
  }[]
  accounting: {
    inputs: {
      id: string
      source: string
      classification:
        | 'represented'
        | 'duplicate'
        | 'not_adopted'
        | 'unresolvable'
        | 'unsupported'
        | 'out_of_scope'
      meetingIds: string[]
      outcomeIds: string[]
      reason?: string
    }[]
    totals: {
      headings: number
      uniqueFormalMeetings: number
      adoptedDocuments: number
      registeredAdoptedDocuments: number
      unresolvableDecisions: number
      unsupportedInputs: number
    }
  }
}
// Ids are source-owned. 2025 heading IDs are EXACT existing audited snapshot IDs.
// Resumptions retain adoptingMeetingSymbol and attach to one base formal meeting ID.
// Document totals count distinct canonical official symbols of adopted outcomes only.
// Registry raw literal spellings/types remain explicit: no RES-only filter, no inferred aliases.
// Symbol-less decisions remain unresolvable and cannot receive fabricated document links/counts.
// Reports/draft papers and failed votes are not adopted mandates. Date is actual meeting date.
// retrievedAt is actual retrieval time; unknown cache retrieval omitted. No fake annual coverage.

export type ScAgendaYearInventory = SecurityCouncilAgendaDataset
const set = (xs: string[]) => [...new Set(xs)].sort()
const same = (a: string[], b: string[]) =>
  JSON.stringify(set(a)) === JSON.stringify(set(b))
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new Error(`SC source conservation failed: ${reason}`)
}
function ids(rows: { id: string }[]) {
  check(
    rows.every((r) => r.id) &&
      new Set(rows.map((r) => r.id)).size === rows.length,
    'unique IDs'
  )
}
/** Source-owned flat contract; only independently audited artifacts may be installed. */
export function scAgendaYears(
  inventory: SecurityCouncilAgendaDataset,
  audited2025: ScAgendaSnapshot
) {
  check(
    inventory.body === 'SC' &&
      inventory.version &&
      inventory.defaultYear === '2025',
    'dataset identity'
  )
  check(
    new Set(inventory.years.map((r) => r.year)).size === inventory.years.length,
    'unique years'
  )
  const snapshots = inventory.years.map((year) => {
    const { headings, meetings, outcomes, evidence, accounting, provenance } =
      year
    check(
      /^\d{4}$/.test(year.year) &&
        ['complete', 'partial'].includes(provenance.coverage),
      'year coverage'
    )
    for (const rows of [
      headings,
      meetings,
      outcomes,
      evidence,
      accounting.inputs,
    ])
      ids(rows)
    const hm = new Map(headings.map((r) => [r.id, r]))
    const mm = new Map(meetings.map((r) => [r.id, r]))
    const om = new Map(outcomes.map((r) => [r.id, r]))
    const ei = new Set(evidence.map((r) => r.id))
    check(
      meetings.length &&
        new Set(meetings.map((r) => r.symbol)).size === meetings.length,
      'unique base PV'
    )
    check(
      meetings.every(
        (r) =>
          /^S\/PV\.\d+$/.test(r.symbol) &&
          r.date.startsWith(`${year.year}-`) &&
          Number.isFinite(Date.parse(r.date))
      ),
      'PV date'
    )
    check(
      provenance.dataCutoff ===
        meetings
          .map((r) => r.date)
          .sort()
          .at(-1),
      'actual cutoff'
    )
    for (const row of [...headings, ...meetings, ...outcomes])
      check(
        row.evidenceIds.length && row.evidenceIds.every((id) => ei.has(id)),
        'evidence references'
      )
    for (const meeting of meetings) {
      check(
        meeting.headingIds.every((id) => hm.has(id)) &&
          meeting.outcomeIds.every((id) => om.has(id)),
        'meeting references'
      )
      check(
        meeting.considerationStatus === 'considered'
          ? meeting.headingIds.length
          : meeting.reason,
        'consideration disposition'
      )
      for (const id of meeting.outcomeIds)
        check(om.get(id)!.meetingId === meeting.id, 'inverse outcome meeting')
    }
    for (const outcome of outcomes) {
      check(
        outcome.headingIds.every((id) => hm.has(id)),
        'outcome heading'
      )
      if (outcome.meetingId) {
        const meeting = mm.get(outcome.meetingId)
        check(
          meeting && meeting.outcomeIds.includes(outcome.id),
          'outcome meeting'
        )
        if (outcome.adoptingMeetingSymbol)
          check(
            outcome.adoptingMeetingSymbol.replace(
              /(?: \(Resumption \d+\)|\/Resumption\d+)$/,
              ''
            ) === meeting.symbol,
            'resumption base'
          )
      }
      check(outcome.status !== 'adopted' || outcome.symbol, 'adopted symbol')
      if (outcome.status === 'adopted') {
        const normalized = (symbol: string) =>
          symbol.normalize('NFKC').replace(/\s/g, '').toUpperCase()
        const proof = evidence.filter((row) =>
          outcome.evidenceIds.includes(row.id)
        )
        check(
          proof.some(
            (row) =>
              typeof row.documentSymbol === 'string' &&
              normalized(row.documentSymbol) === outcome.symbol
          ),
          'canonical adopted symbol proof'
        )
        if (
          outcome.type === 'resolution' ||
          outcome.type === 'presidential_statement'
        ) {
          check(
            outcome.meetingId && outcome.adoptingMeetingSymbol,
            'adopting meeting association'
          )
          check(
            proof.some(
              (row) => row.adoptingMeeting === outcome.adoptingMeetingSymbol
            ),
            'exact adopting meeting proof'
          )
        }
        if (outcome.registryStatus === 'registered')
          check(
            outcome.registrySymbols.every(
              (symbol) => normalized(symbol) === outcome.symbol
            ),
            'canonical registry spelling'
          )
      }

      check(
        outcome.status !== 'unresolvable' || outcome.reason,
        'unresolvable reason'
      )
      check(
        outcome.registryStatus !== 'registered' ||
          (outcome.symbol && outcome.registrySymbols.length),
        'registry proof'
      )
    }
    const adopted = outcomes.filter((r) => r.status === 'adopted' && r.symbol)
    const registered = adopted.filter((r) => r.registryStatus === 'registered')
    const documents = set(adopted.map((r) => r.symbol!))
    for (const heading of headings) {
      check(
        heading.meetingIds.every((id) => mm.has(id)),
        'heading meeting'
      )
      check(
        same(
          heading.meetingIds,
          meetings
            .filter((r) => r.headingIds.includes(heading.id))
            .map((r) => r.id)
        ),
        'inverse heading meeting'
      )
      check(
        same(
          heading.adoptedDocumentSymbols,
          adopted
            .filter((r) => r.headingIds.includes(heading.id))
            .map((r) => r.symbol!)
        ),
        'heading adopted union'
      )
      check(
        same(
          heading.registeredDocumentSymbols,
          registered
            .filter((r) => r.headingIds.includes(heading.id))
            .map((r) => r.symbol!)
        ),
        'heading registry union'
      )
    }
    const proof = provenance.annualCompletenessProof
    check(
      proof &&
        typeof proof === 'object' &&
        'inputIds' in proof &&
        'expectedAdoptedOutcomeBindings' in proof,
      'pin proof metadata'
    )
    const expected = proof.inputIds
    check(
      Array.isArray(expected) &&
        expected.every((id) => typeof id === 'string') &&
        new Set(expected).size === expected.length &&
        expected.length === accounting.inputs.length &&
        JSON.stringify(expected) === JSON.stringify([...expected].sort()) &&
        same(
          expected,
          accounting.inputs.map((row) => row.id)
        ),
      'independent source input inventory'
    )
    const bindings = proof.expectedAdoptedOutcomeBindings
    check(Array.isArray(bindings), 'expected adoption bindings')
    const expectedBindings = bindings
      .map((value: unknown) => {
        check(
          value &&
            typeof value === 'object' &&
            'canonicalSymbol' in value &&
            'adoptingMeeting' in value &&
            'headingIds' in value,
          'expected adoption binding shape'
        )
        check(
          typeof value.canonicalSymbol === 'string' &&
            (value.adoptingMeeting === null ||
              typeof value.adoptingMeeting === 'string') &&
            Array.isArray(value.headingIds) &&
            value.headingIds.every((id) => typeof id === 'string') &&
            new Set(value.headingIds).size === value.headingIds.length,
          'expected adoption binding values'
        )
        return JSON.stringify([
          value.canonicalSymbol,
          value.adoptingMeeting,
          [...value.headingIds].sort(),
        ])
      })
      .sort()
    const actualBindings = adopted
      .map((row) =>
        JSON.stringify([
          row.symbol,
          row.adoptingMeetingSymbol ?? null,
          [...row.headingIds].sort(),
        ])
      )
      .sort()
    check(
      JSON.stringify(expectedBindings) === JSON.stringify(actualBindings),
      'independent adopted outcome bindings'
    )
    for (const input of accounting.inputs) {
      check(
        input.meetingIds.every((id) => mm.has(id)) &&
          input.outcomeIds.every((id) => om.has(id)),
        'input references'
      )
      check(
        input.classification === 'represented' || input.reason,
        'input disposition'
      )
    }
    check(
      same(
        accounting.inputs.flatMap((r) => r.meetingIds),
        meetings.map((r) => r.id)
      ) &&
        same(
          accounting.inputs.flatMap((r) => r.outcomeIds),
          outcomes.map((r) => r.id)
        ),
      'total input coverage'
    )
    const totals = {
      headings: headings.length,
      uniqueFormalMeetings: meetings.length,
      adoptedDocuments: documents.length,
      registeredAdoptedDocuments: set(registered.map((r) => r.symbol!)).length,
      unresolvableDecisions: outcomes.filter(
        (r) => r.type === 'decision' && r.status === 'unresolvable'
      ).length,
      unsupportedInputs: accounting.inputs.filter(
        (r) => r.classification === 'unsupported'
      ).length,
    }
    for (const key of Object.keys(totals) as (keyof typeof totals)[])
      check(totals[key] === accounting.totals[key], `total ${key}`)
    const snapshot: ScAgendaSnapshot = {
      body: 'SC',
      year: year.year,
      dataCutoff: provenance.dataCutoff,
      coverage: provenance.coverage,
      documents,
      formalMeetings: meetings.map(
        ({ symbol, date, considerationStatus, reason }) => ({
          symbol,
          date,
          considerationStatus,
          ...(reason ? { reason } : {}),
        })
      ),
      resolutions: documents.filter((s) => s.startsWith('S/RES/')),
      provenance: {
        ...provenance,
        accounting,
        sourceVersion: inventory.version,
        sourceEvidenceIds: evidence.map((row) => row.id),
      },
      headings: headings.map((heading) => ({
        id: heading.id,
        title: heading.title,
        documents: heading.adoptedDocumentSymbols,
        meetings: heading.meetingIds.map((id) => {
          const meeting = mm.get(id)!
          const symbols = set(
            adopted
              .filter(
                (r) => r.meetingId === id && r.headingIds.includes(heading.id)
              )
              .map((r) => r.symbol!)
          )
          return {
            symbol: meeting.symbol,
            date: meeting.date,
            documents: symbols,
            resolutions: symbols.filter((s) => s.startsWith('S/RES/')),
          }
        }),
      })),
    }
    if (year.year === '2025') {
      const identity = (s: ScAgendaSnapshot) =>
        s.headings
          .map((h) => [
            h.id,
            h.title,
            h.meetings
              .map((m) => [m.symbol, m.date, [...m.resolutions].sort()])
              .sort(),
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      check(
        JSON.stringify(identity(snapshot)) ===
          JSON.stringify(identity(audited2025)) &&
          same(snapshot.resolutions, audited2025.resolutions),
        'immutable 2025 IDs/PVs/dates/resolutions'
      )
    }
    return validateScAgendaSnapshot(snapshot)
  })
  check(
    snapshots.some((r) => r.year === inventory.defaultYear),
    'default year'
  )
  return snapshots.sort((a, b) => Number(b.year) - Number(a.year))
}
