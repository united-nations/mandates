import type { ExpenditureDataset } from '#lib/expenditure-schema'
type Node = ExpenditureDataset['nodes'][number]

function selectDescendants(
  nodes: Node[],
  byId: Map<string, Node>,
  roots: string[]
) {
  const ids = new Set(roots)
  return nodes.filter((node) => {
    let current: Node | undefined = node
    while (current) {
      if (ids.has(current.id)) return true
      current =
        current.parentId === null ? undefined : byId.get(current.parentId)
    }
    return false
  })
}

/** Request-local hierarchy lookup. Preserve source order, including the roots. */
export function createDescendantReader(dataset: ExpenditureDataset) {
  const byId = new Map(dataset.nodes.map((node) => [node.id, node]))
  const cached = new Map<string, Node[]>()
  return (roots: string[]) => {
    const key = JSON.stringify(roots)
    let nodes = cached.get(key)
    if (!nodes) {
      nodes = selectDescendants(dataset.nodes, byId, roots)
      cached.set(key, nodes)
    }
    return nodes
  }
}
