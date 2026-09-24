import { CitationCounts } from './CitationCounts'
import { getEntityExpenditures } from '@/lib/data/entity-expenditure'
import type { Entity, Mandate } from '@/types'

export async function CitationCountsWithExpenditure({
  mandate,
  entities,
}: {
  mandate: Mandate
  entities: Entity[]
}) {
  const codes = [
    ...new Set(mandate.citation_info.map((c) => c.entity).filter(Boolean)),
  ]
  const names = new Map(entities.map((e) => [e.entity, e.entity_long]))
  const expenditures = await getEntityExpenditures(
    codes.map((entity) => ({
      entity,
      entity_long: names.get(entity),
    }))
  )
  return (
    <CitationCounts
      mandate={mandate}
      entities={entities}
      expenditures={expenditures}
    />
  )
}
