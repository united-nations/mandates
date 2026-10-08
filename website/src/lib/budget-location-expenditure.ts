import {
  FUNDING_SOURCES,
  ENTITY_EXPENDITURE_ALIASES,
  OPEN_UN_BASE,
  matchEntityExpenditure,
  normalizeEntityName,
  type EntityExpenditure,
  type ExpenditureDataset,
} from '#lib/entity-expenditure'
import type { EntityProgrammeRow } from './entities-programmes-tree'

type Node = ExpenditureDataset['nodes'][number]
const unavailable = (): EntityExpenditure => ({
  status: 'unavailable',
  reason: 'not_matched',
})

/** Match financial scope using the full citation path; never allocate a parent downwards. */
export function matchBudgetLocationExpenditures(
  rows: EntityProgrammeRow[],
  datasets: ExpenditureDataset[],
  names: Map<string, string>
) {
  const result: Record<string, EntityExpenditure> = {}
  const ppb = datasets.find((dataset) => dataset.meta.stream === 'ppb')
  const pko = datasets.find((dataset) => dataset.meta.stream === 'pko')
  const amount = (
    node: Node,
    dataset: ExpenditureDataset
  ): EntityExpenditure => {
    if (node.amount === null) return unavailable()
    const funding = Object.fromEntries(
      FUNDING_SOURCES.flatMap((key) =>
        typeof node.values[key] === 'number' ? [[key, node.values[key]]] : []
      )
    )
    return {
      status: 'matched',
      amount: node.amount,
      funding,
      period: dataset.meta.fiscalYear,
      nodeIds: [node.id],
      sources: [
        ...Object.values(node.sources ?? {}),
        ...Object.values(node.metricSources?.expenditure ?? {}).flat(),
      ],
      datasetUrl: dataset.url,
      openUrl:
        dataset.meta.stream === 'ppb'
          ? `${OPEN_UN_BASE}/secretariat/programme-budget/#regular-budget=${encodeURIComponent(node.id)}`
          : dataset.url,
    }
  }
  const exactlyOne = (nodes: Node[], dataset: ExpenditureDataset) =>
    nodes.length === 1 ? amount(nodes[0], dataset) : unavailable()
  const descendants = (dataset: ExpenditureDataset, roots: string[]) => {
    const byId = new Map(dataset.nodes.map((node) => [node.id, node]))
    return dataset.nodes.filter((node) => {
      let current: Node | undefined = node
      while (current) {
        if (roots.includes(current.id)) return true
        current =
          current.parentId === null ? undefined : byId.get(current.parentId)
      }
      return false
    })
  }
  const subprogrammeAmount = (
    nodes: Node[],
    dataset: ExpenditureDataset
  ): EntityExpenditure => {
    if (nodes.length < 2) return exactlyOne(nodes, dataset)
    // A selected subprogramme can have one source schedule per funding
    // stream. Combine only disjoint streams, never parallel/overlapping rows.
    const funding: Extract<
      EntityExpenditure,
      { status: 'matched' }
    >['funding'] = {}
    for (const node of nodes) {
      if (
        node.amount === null ||
        descendants(dataset, [node.id]).some(
          (child) =>
            child.id !== node.id && nodes.some((other) => other.id === child.id)
        )
      )
        return unavailable()
      for (const key of FUNDING_SOURCES) {
        const value = node.values[key]
        if (typeof value !== 'number') continue
        if (funding[key] !== undefined)
          return { status: 'unavailable', reason: 'ambiguous' }
        funding[key] = value
      }
    }
    const first = amount(nodes[0], dataset)
    if (first.status !== 'matched') return unavailable()
    return {
      ...first,
      amount: Object.values(funding).reduce((sum, value) => sum + value, 0),
      funding,
      nodeIds: nodes.map((node) => node.id),
      sources: nodes.flatMap((node) => [
        ...Object.values(node.sources ?? {}),
        ...Object.values(node.metricSources?.expenditure ?? {}).flat(),
      ]),
    }
  }
  const subprogrammeName = (title: string) =>
    normalizeEntityName(title.replace(/^Sub-?programme\s+[\dA-Z]+\.?\s*/i, ''))
  for (const row of rows) {
    const path = JSON.parse(row.id) as string[]
    const stream = path[1]
    let value = unavailable()
    if (stream === 'ppb' && ppb) {
      const partCode = path[3]
      const sectionCode = path[5]
      const parts = ppb.nodes.filter(
        (node) => node.tier === 'part' && node.code === partCode
      )
      const sections = ppb.nodes.filter(
        (node) =>
          node.tier === 'section' &&
          node.code === sectionCode &&
          parts.some((part) => part.id === node.parentId)
      )
      if (row.kind === 'stream')
        value = exactlyOne(
          ppb.nodes.filter(
            (node) => node.tier === 'whole' && node.parentId === null
          ),
          ppb
        )
      if (row.kind === 'part') value = exactlyOne(parts, ppb)
      if (row.kind === 'section') value = exactlyOne(sections, ppb)
      if (row.kind === 'entity' && sections.length === 1) {
        const scoped = { ...ppb, nodes: descendants(ppb, [sections[0].id]) }
        value = matchEntityExpenditure(path[7], names.get(path[7]), [scoped])
        // Same entity matcher as resolution details, but constrained to this
        // section. Preserve source provenance even where older metadata lacks metricSources.
        if (value.status === 'matched') {
          value.sources = scoped.nodes
            .filter(
              (node) =>
                value.status === 'matched' && value.nodeIds.includes(node.id)
            )
            .flatMap((node) => [
              ...Object.values(node.sources ?? {}),
              ...Object.values(node.metricSources?.expenditure ?? {}).flat(),
            ])
        }
      }
      if (row.kind === 'subprogramme') {
        const entity = row.parentId ? result[row.parentId] : undefined
        const [number, title] = JSON.parse(path[9]) as [number | null, string]
        if (entity?.status === 'matched' && number !== null) {
          const label = subprogrammeName(title)
          const candidates = descendants(ppb, entity.nodeIds).filter(
            (node) =>
              node.kind === 'subprogramme' &&
              node.code === String(number) &&
              subprogrammeName(node.label) === label
          )
          value = subprogrammeAmount(candidates, ppb)
        }
      }
    }
    // The source's total includes mission accounts and support centres;
    // neither citation group is its complete scope. Leave both group totals
    // unavailable, but match individual published accounts in either group.
    if (stream === 'pko' && pko) {
      if (row.kind === 'entity')
        value = exactlyOne(
          pko.nodes.filter(
            (node) =>
              node.tier === 'mission' &&
              node.code === (ENTITY_EXPENDITURE_ALIASES[path[5]] ?? path[5])
          ),
          pko
        )
    }
    if ((stream === 'ppb' && !ppb) || (stream === 'pko' && !pko))
      value = { status: 'unavailable', reason: 'source_unavailable' }
    result[row.id] = value
  }
  return result
}
