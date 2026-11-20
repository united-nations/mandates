import {
  FUNDING_SOURCES,
  OPEN_UN_BASE,
  type EntityExpenditure,
  type ExpenditureDataset,
} from '#lib/expenditure-schema'
import { normalizeEntityName } from '#lib/normalize-entity-name'
import {
  createExpenditureIndex,
  type ExpenditureIndex,
} from '#lib/expenditure-index'
export {
  parseExpenditureDataset,
  FUNDING_SOURCES,
  OPEN_UN_BASE,
} from '#lib/expenditure-schema'
export type {
  EntityExpenditure,
  ExpenditureDataset,
  ExpenditureMap,
} from '#lib/expenditure-schema'
export { normalizeEntityName } from '#lib/normalize-entity-name'
type Node = ExpenditureDataset['nodes'][number]
type Funding = (typeof FUNDING_SOURCES)[number]

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

function matchIndexedEntity(
  entity: string,
  longName: string | undefined,
  indexes: ExpenditureIndex[]
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
  for (const index of indexes) {
    matches.push(
      ...index.match(names).map((node) => ({ node, dataset: index.dataset }))
    )
  }
  if (matches.length === 0)
    return {
      status: 'unavailable',
      reason: indexes.length === 2 ? 'not_matched' : 'source_unavailable',
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
    sources: matches.flatMap((m) => [
      ...Object.values(m.node.metricSources?.expenditure ?? {}).flat(),
      ...Object.values(m.node.sources ?? {}),
    ]),
    datasetUrl: first.dataset.url,
    // The PPB page currently defaults to 2025 expenditure. The JSON link for
    // PKO is the exact 2024/25 source; its current portal view uses older years.
    openUrl:
      first.dataset.meta.stream === 'ppb'
        ? `${OPEN_UN_BASE}/secretariat/programme-budget/#regular-budget=${encodeURIComponent(first.node.id)}`
        : first.dataset.url,
  }
}

/** Request-local indexes; no cross-request cache or retained dataset lifetime. */
export function createEntityExpenditureMatcher(datasets: ExpenditureDataset[]) {
  const indexes = datasets.map(createExpenditureIndex)
  return (entity: string, longName?: string) =>
    matchIndexedEntity(entity, longName, indexes)
}

export function matchEntityExpenditure(
  entity: string,
  longName: string | undefined,
  datasets: ExpenditureDataset[]
) {
  return createEntityExpenditureMatcher(datasets)(entity, longName)
}
