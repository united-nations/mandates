import {
  normalizeAgendaItem,
  type AgendaBody,
  type AgendaScope,
} from '#lib/agenda-scope-client'

export interface MirroredAgendaRow {
  row_id: string
  igov_body: string
  igov_session: string
  agenda_item: string | null
  title: string | null
  allocation: string | null
  data: Record<string, unknown> | null
  synced_at: string
}
export interface AgendaReference {
  symbol: string
  item: string | null
  description: string | null
  topic: string | null
  provenance: string
}
export interface AgendaNode {
  relatedItems?: import('../components/RelatedItemsCell').RelatedClusterView[]
  id: string
  item: string
  token: string
  titles: string[]
  allocations: string[]
  sourceRows: string[]
  meetingCount?: number
  sourceIds: string[]
  heading: string
  parentId?: string
  depth: number
  directSymbols: string[]
  symbols: string[]
  scope: AgendaScope
  titleDifferences: string[]
}

export type AgendaTreeEntry =
  | { kind: 'group'; id: string; label: string }
  | { kind: 'item'; id: string; node: AgendaNode; groupId?: string }

/** Source headings wrap intact item branches; no invented groups or agenda scopes. */
export function groupAgendaNodes(nodes: AgendaNode[]): AgendaTreeEntry[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const groups = new Map<
    string,
    { heading?: AgendaTreeEntry; items: AgendaTreeEntry[] }
  >()
  for (const node of nodes) {
    let root = node
    while (root.parentId) {
      const parent = byId.get(root.parentId)
      if (!parent) throw new Error('Agenda parent is missing')
      root = parent
    }
    const label = root.heading.trim()
    const id = label
      ? JSON.stringify(['heading', root.scope.body, root.scope.session, label])
      : ''
    let group = groups.get(id)
    if (!group) {
      group = {
        heading: label ? { kind: 'group', id, label } : undefined,
        items: [],
      }
      groups.set(id, group)
    }
    group.items.push({
      kind: 'item',
      id: node.id,
      node,
      groupId: id || undefined,
    })
  }
  const entries = [...groups.values()].flatMap((group) => [
    ...(group.heading ? [group.heading] : []),
    ...group.items,
  ])
  const items = entries.filter((entry) => entry.kind === 'item')
  if (
    items.length !== nodes.length ||
    new Set(items.map((entry) => entry.id)).size !== nodes.length
  )
    throw new Error('Agenda grouping lost or duplicated an item')
  return entries
}

export function visibleAgendaEntries(
  entries: AgendaTreeEntry[],
  collapsed: Set<string>
) {
  const visible = new Set<string>()
  return entries.filter((entry) => {
    if (entry.kind === 'item') {
      if (entry.groupId && !visible.has(entry.groupId)) return false
      if (entry.node.parentId && !visible.has(entry.node.parentId)) return false
    }
    if (!collapsed.has(entry.id)) visible.add(entry.id)
    return true
  })
}
export const validAgendaRow = (row: MirroredAgendaRow) =>
  ['GA', 'ECOSOC'].includes(row.igov_body) &&
  String(row.data?.AG_Body ?? '')
    .trim()
    .toUpperCase() === row.igov_body &&
  String(row.data?.AG_SessionNo ?? '').trim() === row.igov_session &&
  !String(row.data?.AG_Item ?? '')
    .normalize('NFKC')
    .includes('[') &&
  normalizeAgendaItem(String(row.data?.AG_Item ?? '')) !== null &&
  normalizeAgendaItem(row.agenda_item ?? '') ===
    normalizeAgendaItem(String(row.data?.AG_Item ?? ''))

const itemDisplay = (value: string) =>
  value.normalize('NFKC').replace(/\s/g, '').toLowerCase()
const titleKey = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const parentItem = (item: string) => {
  if (item.includes('(')) return item.replace(/\([a-z]+\)$/, '')
  return /^\d+[a-z]+$/.test(item) ? item.replace(/[a-z]+$/, '') : null
}

/** Every mirror row is a node contribution, duplicate allocation, or explicit exclusion. */
export function buildAgendaTree(
  rows: MirroredAgendaRow[],
  body: AgendaBody,
  session: string,
  references: AgendaReference[]
) {
  const selected = rows.filter(
    (row) => row.igov_body === body && row.igov_session === session
  )
  const excluded: { rowId: string; reason: string }[] = []
  const nodes = new Map<string, AgendaNode>()
  let duplicates = 0
  for (const row of selected) {
    if (!validAgendaRow(row)) {
      excluded.push({
        rowId: row.row_id,
        reason: 'source_body_session_or_item_mismatch',
      })
      continue
    }
    const item = itemDisplay(String(row.data!.AG_Item))
    const id = JSON.stringify([body, session, item])
    let node = nodes.get(id)
    if (!node) {
      const token = normalizeAgendaItem(item)!
      node = {
        id,
        item,
        token,
        titles: [],
        allocations: [],
        sourceRows: [],
        sourceIds: [],
        heading: String(row.data?.AG_Heading ?? ''),
        depth: 0,
        directSymbols: [],
        symbols: [],
        scope: { body, session, item, items: [token] },
        titleDifferences: [],
      }
      nodes.set(id, node)
    } else duplicates++
    const title = String(row.data?.AG_Title ?? row.title ?? '').trim()
    if (title && !node.titles.includes(title)) node.titles.push(title)
    const allocation = String(
      row.data?.AG_Allocation ?? row.allocation ?? ''
    ).trim()
    if (allocation && !node.allocations.includes(allocation))
      node.allocations.push(allocation)
    node.sourceRows.push(row.row_id)
    if (
      typeof row.data?._id === 'string' &&
      !node.sourceIds.includes(row.data._id)
    )
      node.sourceIds.push(row.data._id)
  }
  const byToken = new Map<string, AgendaNode[]>()
  for (const node of nodes.values())
    byToken.set(node.token, [...(byToken.get(node.token) ?? []), node])
  const unresolvedReferences: AgendaReference[] = []
  for (const ref of references) {
    const token = normalizeAgendaItem(ref.item ?? '')
    const candidates = token ? byToken.get(token) : null
    if (candidates?.length !== 1) {
      unresolvedReferences.push(ref)
      continue
    }
    const node = candidates[0]
    if (!node.directSymbols.includes(ref.symbol))
      node.directSymbols.push(ref.symbol)
    if (
      ref.description &&
      !node.titles.some(
        (title) => titleKey(title) === titleKey(ref.description!)
      ) &&
      !node.titleDifferences.includes(ref.description)
    )
      node.titleDifferences.push(ref.description)
  }
  for (const node of nodes.values()) {
    let parent = parentItem(node.item)
    while (parent) {
      const candidates = byToken.get(normalizeAgendaItem(parent)!)
      if (candidates?.length === 1) {
        node.parentId = candidates[0].id
        break
      }
      parent = parentItem(parent)
    }
  }
  const children = (id?: string) =>
    [...nodes.values()]
      .filter((n) => n.parentId === id)
      .sort((a, b) => a.item.localeCompare(b.item, 'en', { numeric: true }))
  const ordered: AgendaNode[] = []
  const visit = (node: AgendaNode, depth: number): string[] => {
    node.depth = depth
    ordered.push(node)
    const descendants = children(node.id)
    const symbols = new Set(node.directSymbols)
    const tokens = new Set([node.token])
    for (const child of descendants) {
      for (const symbol of visit(child, depth + 1)) symbols.add(symbol)
      for (const token of child.scope.items) tokens.add(token)
    }
    node.symbols = [...symbols].sort()
    node.scope.items = [...tokens]
    return node.symbols
  }
  for (const root of children()) visit(root, 0)
  if (
    ordered.length !== nodes.size ||
    nodes.size + duplicates + excluded.length !== selected.length
  )
    throw new Error('Agenda row accounting failed')
  const ambiguous = [...byToken.values()].filter((list) => list.length > 1)
  // Ambiguous tokens must not leak back into parent rollup links.
  for (const node of ordered)
    node.scope.items = node.scope.items.filter(
      (token) => byToken.get(token)?.length === 1
    )
  return {
    nodes: ordered,
    accounting: {
      sourceRows: selected.length,
      nodes: nodes.size,
      duplicates,
      excluded,
      ambiguousTokens: ambiguous.map((list) => list[0].token),
      unresolvedReferences,
    },
  }
}
