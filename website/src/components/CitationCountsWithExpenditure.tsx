import { CitationCounts } from './CitationCounts'
import { getExpenditureDatasets } from '@/lib/data/entity-expenditure'
import { createEntityExpenditureMatcher } from '@/lib/entity-expenditure'
import { matchBudgetLocationExpenditures } from '@/lib/budget-location-expenditure'
import { buildResolutionCitationTree } from '@/lib/resolution-citation-tree'
import type { Entity, Mandate } from '@/types'

export async function CitationCountsWithExpenditure({
  mandate,
  entities,
  budgetVersion,
}: {
  mandate: Mandate
  entities: Entity[]
  budgetVersion?: string
}) {
  const { tree, financialRows } = buildResolutionCitationTree(mandate, entities)
  const datasets = tree.length ? await getExpenditureDatasets() : []
  const names = new Map(tree.map((e) => [e.entity, e.entityLong ?? e.entity]))
  const match = createEntityExpenditureMatcher(datasets)
  const expenditures = Object.fromEntries(
    tree.map((e) => [e.id, match(e.entity, e.entityLong)])
  )
  const locations = matchBudgetLocationExpenditures(
    financialRows,
    datasets,
    names
  )
  for (const entity of tree)
    for (const child of entity.children) {
      if (child.financial)
        expenditures[child.id] = child.financialId
          ? locations[child.financialId]
          : { status: 'unavailable', reason: 'not_matched' }
    }
  return (
    <CitationCounts
      mandate={mandate}
      entities={entities}
      expenditures={expenditures}
      budgetVersion={budgetVersion}
    />
  )
}
