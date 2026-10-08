import 'server-only'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { OPEN_UN_BASE, parseExpenditureDataset, matchEntityExpenditure } from '../entity-expenditure'
import type { ExpenditureDataset, ExpenditureMap } from '../entity-expenditure'

const loadDataset = (stream: 'ppb' | 'pko') => unstable_cache(async () => {
  const name = stream === 'ppb' ? 'ppb-expenditure' : 'audited-pko'
  // Raw PPB JSON exceeds Next's default 2MB cache limit. Cache only the
  // validated, stripped index returned here, never the raw fetch response.
  const response = await fetch(`${OPEN_UN_BASE}/data/budget-${name}-2025.json`, {
    cache: 'no-store', signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`Open UN expenditure returned ${response.status}`)
  const data = parseExpenditureDataset(await response.json(), stream)
  if (Buffer.byteLength(JSON.stringify(data)) > 1_800_000)
    throw new Error('Expenditure index exceeds cache budget')
  return data
}, ['open-un-entity-expenditure-v2', stream, '2025'], { revalidate: 86400, tags: ['entity-expenditure'] })

const ppb = loadDataset('ppb')
const pko = loadDataset('pko')
const load = cache(async (): Promise<ExpenditureDataset[]> => {
  const results = await Promise.allSettled([ppb(), pko()])
  return results.flatMap(result => {
    if (result.status === 'fulfilled') return [result.value]
    // Throwing within unstable_cache leaves the previous successful entry
    // available during background revalidation. Cold failures remain unavailable.
    console.error('Open UN expenditure source unavailable:', result.reason)
    return []
  })
})

export const getExpenditureDatasets = load

export async function getEntityExpenditures(
  entities: { entity: string; entity_long?: string }[],
): Promise<ExpenditureMap> {
  if (!entities.length) return {}
  const datasets = await load()
  return Object.fromEntries(entities.map(e =>
    [e.entity, matchEntityExpenditure(e.entity, e.entity_long, datasets)]))
}
