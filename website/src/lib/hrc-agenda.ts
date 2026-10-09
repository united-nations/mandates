import snapshot from './data/hrc-agenda-snapshot.json' with { type: 'json' }
import { normalizeAgendaItem } from '#lib/agenda-scope-client'
import type { AgendaNode, AgendaReference } from '#lib/agenda-tree'

export const hrcAgendaSessions = snapshot.sessions
  .map((source) => source.session)
  .sort((a, b) => Number(b) - Number(a))

/** Official agenda items only; annotation records and special sessions are excluded. */
export function buildHrcAgenda(session: string, references: AgendaReference[]) {
  const source = snapshot.sessions.find((entry) => entry.session === session)
  if (!source) throw new Error('HRC session is outside the verified snapshot')
  const nodes: AgendaNode[] = snapshot.items.map((item) => ({
    id: JSON.stringify(['HRC', session, item.item]),
    item: item.item,
    token: item.item,
    titles: [item.title],
    allocations: [],
    sourceRows: [`${item.sourceId}/${session}`],
    sourceIds: [item.sourceId],
    heading: '',
    depth: 0,
    directSymbols: [],
    symbols: [],
    scope: { body: 'HRC', session, item: item.item, items: [item.item] },
    titleDifferences: [],
  }))
  const byItem = new Map(nodes.map((node) => [node.item, node]))
  const unresolvedReferences: AgendaReference[] = []
  for (const reference of references) {
    const node = byItem.get(normalizeAgendaItem(reference.item ?? '') ?? '')
    if (!node) {
      unresolvedReferences.push(reference)
      continue
    }
    if (!node.directSymbols.includes(reference.symbol))
      node.directSymbols.push(reference.symbol)
    if (
      reference.description &&
      !node.titles.includes(reference.description) &&
      !node.titleDifferences.includes(reference.description)
    )
      node.titleDifferences.push(reference.description)
  }
  for (const node of nodes) {
    node.directSymbols.sort()
    node.symbols = [...node.directSymbols]
  }
  if (
    nodes.length !== 10 ||
    byItem.size !== 10 ||
    snapshot.items.some((item) => !item.sessions.includes(session))
  )
    throw new Error('HRC snapshot item accounting failed')
  return {
    nodes,
    source,
    accounting: {
      sourceRows: nodes.length,
      nodes: nodes.length,
      duplicates: 0,
      excluded: [],
      ambiguousTokens: [],
      unresolvedReferences,
    },
  }
}
