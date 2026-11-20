import type { ExpenditureDataset } from '#lib/expenditure-schema'
import { normalizeEntityName } from '#lib/normalize-entity-name'
type Node = ExpenditureDataset['nodes'][number]
type Entry = { node: Node; order: number; label: string; identities: string[] }

function preferredRoots(
  candidates: Entry[],
  byId: Map<string, Node>,
  names: Set<string>
) {
  const ids = new Set(candidates.map((entry) => entry.node.id))
  const roots = candidates.filter(({ node }) => {
    let parent = node.parentId === null ? undefined : byId.get(node.parentId)
    while (parent) {
      if (ids.has(parent.id)) return false
      parent = parent.parentId === null ? undefined : byId.get(parent.parentId)
    }
    return true
  })
  const identified = roots.filter((entry) =>
    entry.identities.some((name) => names.has(name))
  )
  return (identified.length ? identified : roots).map((entry) => entry.node)
}

function indexNames(nodes: Node[]) {
  const byName = new Map<string, Entry[]>()
  nodes.forEach((node, order) => {
    if (['whole', 'part'].includes(node.tier)) return
    const identities = [node.entity?.acronym, node.entity?.name]
      .filter((name): name is string => Boolean(name))
      .map(normalizeEntityName)
    const entry = {
      node,
      order,
      identities,
      label: normalizeEntityName(node.label),
    }
    const names = new Set([...identities, ...(node.label ? [entry.label] : [])])
    for (const name of names) {
      const entries = byName.get(name) ?? []
      entries.push(entry)
      byName.set(name, entries)
    }
  })
  return byName
}

export function createExpenditureIndex(dataset: ExpenditureDataset) {
  const byId = new Map(dataset.nodes.map((node) => [node.id, node]))
  const byName = indexNames(dataset.nodes)
  const match = (names: Set<string>): Node[] => {
    const found = new Set([...names].flatMap((name) => byName.get(name) ?? []))
    const candidates = [...found].filter(
      ({ node, label }) =>
        node.tier !== 'section' ||
        node.entityStatus === 'single_owner' ||
        names.has(label)
    )
    candidates.sort((a, b) => a.order - b.order)
    return preferredRoots(candidates, byId, names)
  }
  return { dataset, match }
}
export type ExpenditureIndex = ReturnType<typeof createExpenditureIndex>
