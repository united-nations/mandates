import { z } from 'zod'

export const OPEN_UN_BASE = 'https://open.un-two-zero.org'
export const FUNDING_SOURCES = [
  'regular_budget',
  'other_assessed',
  'extrabudgetary',
] as const
type Funding = (typeof FUNDING_SOURCES)[number]
const sourceSchema = z.object({
  symbol: z.string().optional(),
  url: z.string().url().refine(value => new URL(value).protocol === 'https:', 'Source links must use HTTPS').optional(),
})
const nodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  tier: z.string(),
  kind: z.string(),
  label: z.string(),
  code: z.string().nullable().optional(),
  amount: z.number().finite().nullable(),
  values: z.object({
    regular_budget: z.number().finite().nullable().optional(),
    other_assessed: z.number().finite().nullable().optional(),
    extrabudgetary: z.number().finite().nullable().optional(),
  }),
  entityStatus: z.string().optional(),
  entity: z
    .object({ name: z.string(), acronym: z.string().nullable().optional() })
    .nullable()
    .optional(),
  metricSources: z
    .object({
      expenditure: z.record(z.string(), z.array(sourceSchema)),
    })
    .optional(),
  sources: z.record(z.string(), sourceSchema).optional(),
  note: z.string().optional(),
  breakdowns: z.record(z.string(), z.object({
    childAmount: z.number().finite().nullable(),
    difference: z.number().finite().nullable(),
    outcome: z.string(),
    completeness: z.string(),
  })).optional(),
})
const datasetSchema = z.object({
  meta: z.object({
    year: z.literal(2025),
    measure: z.literal('expenditure'),
    currency: z.literal('USD'),
    fiscalYear: z.string(),
    stream: z.enum(['ppb', 'pko']),
  }),
  nodes: z.array(nodeSchema),
})
export type ExpenditureDataset = z.infer<typeof datasetSchema> & { url: string }
type Node = ExpenditureDataset['nodes'][number]
export type EntityExpenditure =
  | {
      status: 'matched'
      amount: number
      period: string
      funding: Partial<Record<Funding, number>>
      nodeIds: string[]
      sources: { symbol?: string; url?: string }[]
      datasetUrl: string
      openUrl: string
    }
  | {
      status: 'unavailable'
      reason:
        | 'dco_scope'
        | 'unsoh_period'
        | 'not_matched'
        | 'ambiguous'
        | 'source_unavailable'
    }
export type ExpenditureMap = Record<string, EntityExpenditure>

export function parseExpenditureDataset(
  raw: unknown,
  stream: 'ppb' | 'pko'
): ExpenditureDataset {
  const data = datasetSchema.parse(raw)
  if (
    data.meta.stream !== stream ||
    data.meta.fiscalYear !== (stream === 'ppb' ? '2025' : '2024/25')
  )
    throw new Error('Unexpected expenditure reporting period')
  const nodes = new Map(data.nodes.map((n) => [n.id, n]))
  if (nodes.size !== data.nodes.length)
    throw new Error('Duplicate expenditure node IDs')
  for (const n of data.nodes) {
    const seen = new Set<string>()
    let current: Node | undefined = n
    while (current) {
      if (seen.has(current.id)) throw new Error('Cyclic expenditure hierarchy')
      seen.add(current.id)
      if (current.parentId !== null && !nodes.has(current.parentId))
        throw new Error('Missing expenditure parent')
      current =
        current.parentId === null ? undefined : nodes.get(current.parentId)
    }
    const values = FUNDING_SOURCES.flatMap((k) =>
      typeof n.values[k] === 'number' ? [n.values[k] as number] : []
    )
    if (
      n.amount !== null &&
      (values.length === 0 ||
        Math.abs(n.amount - values.reduce((a, b) => a + b, 0)) > 0.01)
    )
      throw new Error(
        'Expenditure amount does not reconcile to funding sources'
      )
  }
  // Cross-totals use source-declared child coverage, preserving printed
  // differences rather than silently replacing authoritative parent amounts.
  for (const n of data.nodes) {
    const children = data.nodes.filter(child => child.parentId === n.id)
    if (stream === 'pko' && n.tier === 'whole' && n.amount !== null &&
      children.every(child => child.tier === 'mission' && child.amount !== null) &&
      Math.abs(n.amount - children.reduce((sum, child) => sum + (child.amount ?? 0), 0)) > 0.01)
      throw new Error('Peacekeeping mission accounts do not reconcile to their source total')
    for (const key of FUNDING_SOURCES) {
      const breakdown = n.breakdowns?.[key]
      if (!breakdown || breakdown.childAmount === null) continue
      const amounts = children.flatMap(child => typeof child.values[key] === 'number' ? [child.values[key] as number] : [])
      if (!amounts.length || Math.abs(amounts.reduce((a, b) => a + b, 0) - breakdown.childAmount) > 0.01)
        throw new Error('Expenditure children do not reconcile to declared source coverage')
      if (typeof n.values[key] === 'number' && breakdown.difference !== null &&
        Math.abs((n.values[key] as number) - breakdown.childAmount - breakdown.difference) > 0.01)
        throw new Error('Expenditure source difference is not conserved')
    }
  }
  return {
    ...data,
    url: `${OPEN_UN_BASE}/data/budget-${stream === 'ppb' ? 'ppb-expenditure' : 'audited-pko'}-2025.json`,
  }
}

export const normalizeEntityName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// Scope-specific aliases. Never broaden these into substring/fuzzy matching.
// Source labels are preserved, including the upstream footnote attached to 1718.
export const ENTITY_EXPENDITURE_ALIASES: Record<string, string> = {
  'SESG-GL':
    'Office of the Special Envoy of the Secretary-General for the Great Lakes Region of Africa',
  ASMT: 'Analytical Support and Sanctions Monitoring Team pursuant to Security Council resolutions 1526 (2004) and 2253 (2015) concerning Islamic State in Iraq and the Levant (Da’esh), Al-Qaida and the Taliban and associated individuals and entities',
  'FP-Delisting': 'Office of the Focal Point for Delisting',
  'SC-RES1718':
    'Support to the Security Council Committee established pursuant to resolution 1718 (2006)a',
  'UNGSC Brindisi': 'UNLB',
  'OSESG-SCRES1559':
    'Support for the implementation of Security Council resolution 1559 (2004)',
  'SC-RES2231':
    'Mission for the implementation of Security Council resolution 2231 (2015)',
}

export function matchEntityExpenditure(
  entity: string,
  longName: string | undefined,
  datasets: ExpenditureDataset[]
): EntityExpenditure {
  if (entity === 'DCO') return { status: 'unavailable', reason: 'dco_scope' }
  if (entity === 'UNSOH')
    return { status: 'unavailable', reason: 'unsoh_period' }
  const names = new Set(
    [entity, longName, ENTITY_EXPENDITURE_ALIASES[entity]]
      .filter((s): s is string => Boolean(s))
      .map(normalizeEntityName)
  )
  const matches: { node: Node; dataset: ExpenditureDataset }[] = []
  for (const dataset of datasets) {
    const byId = new Map(dataset.nodes.map((n) => [n.id, n]))
    const isIdentity = (n: Node) =>
      [n.entity?.acronym, n.entity?.name, n.label].some(
        (s) => s && names.has(normalizeEntityName(s))
      )
    // A part is a presentation grouping, not an entity amount.
    const candidates = dataset.nodes.filter(
      (n) =>
        !['whole', 'part'].includes(n.tier) &&
        isIdentity(n) &&
        (n.tier !== 'section' ||
          n.entityStatus === 'single_owner' ||
          names.has(normalizeEntityName(n.label)))
    )
    // Prefer an identified authoritative ancestor to its duplicate child projection.
    const roots = candidates.filter((n) => {
      let parent = n.parentId === null ? undefined : byId.get(n.parentId)
      while (parent) {
        if (candidates.some((c) => c.id === parent?.id)) return false
        parent =
          parent.parentId === null ? undefined : byId.get(parent.parentId)
      }
      return true
    })
    // An entity's explicit financial identity outranks incidental labels on
    // allocations elsewhere (e.g. section 33 construction rows named ECA).
    // SPMs currently lack entity annotations, so exact labels remain a fallback.
    const identified = roots.filter((n) =>
      [n.entity?.acronym, n.entity?.name].some(
        (s) => s && names.has(normalizeEntityName(s))
      )
    )
    matches.push(
      ...(identified.length ? identified : roots).map((node) => ({
        node,
        dataset,
      }))
    )
  }
  if (matches.length === 0)
    return {
      status: 'unavailable',
      reason: datasets.length === 2 ? 'not_matched' : 'source_unavailable',
    }
  // Different reporting periods/scopes must never be added.
  if (matches.some((m) => m.dataset.url !== matches[0].dataset.url))
    return { status: 'unavailable', reason: 'ambiguous' }
  if (
    matches.length > 1 &&
    !matches.every(
      (m) =>
        normalizeEntityName(m.node.label) ===
          normalizeEntityName(matches[0].node.label) &&
        m.node.parentId === matches[0].node.parentId
    )
  )
    return { status: 'unavailable', reason: 'ambiguous' }
  const funding: Partial<Record<Funding, number>> = {}
  for (const { node } of matches) {
    if (node.amount === null)
      return { status: 'unavailable', reason: 'not_matched' }
    for (const k of FUNDING_SOURCES) {
      const value = node.values[k]
      if (typeof value !== 'number') continue
      if (funding[k] !== undefined)
        return { status: 'unavailable', reason: 'ambiguous' }
      funding[k] = value
    }
  }
  const first = matches[0]
  return {
    status: 'matched',
    amount: Object.values(funding).reduce((a, b) => a + b, 0),
    period: first.dataset.meta.fiscalYear,
    funding,
    nodeIds: matches.map((m) => m.node.id),
    sources: matches.flatMap((m) =>
      [...Object.values(m.node.metricSources?.expenditure ?? {}).flat(), ...Object.values(m.node.sources ?? {})]
    ),
    datasetUrl: first.dataset.url,
    // The PPB page currently defaults to 2025 expenditure. The JSON link for
    // PKO is the exact 2024/25 source; its current portal view uses older years.
    openUrl:
      first.dataset.meta.stream === 'ppb'
        ? `${OPEN_UN_BASE}/secretariat/programme-budget/#regular-budget=${encodeURIComponent(first.node.id)}`
        : first.dataset.url,
  }
}
