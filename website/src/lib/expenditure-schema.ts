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
  url: z
    .string()
    .url()
    .refine(
      (value) => new URL(value).protocol === 'https:',
      'Source links must use HTTPS'
    )
    .optional(),
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
  breakdowns: z
    .record(
      z.string(),
      z.object({
        childAmount: z.number().finite().nullable(),
        difference: z.number().finite().nullable(),
        outcome: z.string(),
        completeness: z.string(),
      })
    )
    .optional(),
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
    const children = data.nodes.filter((child) => child.parentId === n.id)
    if (
      stream === 'pko' &&
      n.tier === 'whole' &&
      n.amount !== null &&
      children.every(
        (child) => child.tier === 'mission' && child.amount !== null
      ) &&
      Math.abs(
        n.amount - children.reduce((sum, child) => sum + (child.amount ?? 0), 0)
      ) > 0.01
    )
      throw new Error(
        'Peacekeeping mission accounts do not reconcile to their source total'
      )
    for (const key of FUNDING_SOURCES) {
      const breakdown = n.breakdowns?.[key]
      if (!breakdown || breakdown.childAmount === null) continue
      const amounts = children.flatMap((child) =>
        typeof child.values[key] === 'number'
          ? [child.values[key] as number]
          : []
      )
      if (
        !amounts.length ||
        Math.abs(amounts.reduce((a, b) => a + b, 0) - breakdown.childAmount) >
          0.01
      )
        throw new Error(
          'Expenditure children do not reconcile to declared source coverage'
        )
      if (
        typeof n.values[key] === 'number' &&
        breakdown.difference !== null &&
        Math.abs(
          (n.values[key] as number) -
            breakdown.childAmount -
            breakdown.difference
        ) > 0.01
      )
        throw new Error('Expenditure source difference is not conserved')
    }
  }
  return {
    ...data,
    url: `${OPEN_UN_BASE}/data/budget-${stream === 'ppb' ? 'ppb-expenditure' : 'audited-pko'}-2025.json`,
  }
}
