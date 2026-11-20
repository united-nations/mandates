import type { ExpenditureDataset } from '#lib/expenditure-schema'
import { createDescendantReader } from '#lib/expenditure-descendants'
import { createEntityExpenditureMatcher } from '#lib/entity-expenditure'

/** Shared only within one budget-location matching operation. */
export function createExpenditureScopes(datasets: ExpenditureDataset[]) {
  const readers = new Map(
    datasets.map((dataset) => [dataset, createDescendantReader(dataset)])
  )
  type Scope = {
    dataset: ExpenditureDataset
    match: ReturnType<typeof createEntityExpenditureMatcher>
  }
  const scopes = new Map(
    datasets.map((dataset) => [dataset, new Map<string, Scope>()])
  )
  const descendants = (dataset: ExpenditureDataset, roots: string[]) =>
    readers.get(dataset)!(roots)
  const scope = (dataset: ExpenditureDataset, id: string) => {
    const cache = scopes.get(dataset)!
    let existing = cache.get(id)
    if (!existing) {
      const scoped = { ...dataset, nodes: descendants(dataset, [id]) }
      existing = {
        dataset: scoped,
        match: createEntityExpenditureMatcher([scoped]),
      }
      cache.set(id, existing)
    }
    return existing
  }
  return { descendants, scope }
}
