/** Total conservation checks for the frozen source appearance ledger. */
import type { RelatedAgendaSnapshot } from '#lib/related-agenda-model'

/** Every source appearance is accounted for once, and clustered appearances become occurrences. */
export function validateAppearanceAccounting(snapshot: RelatedAgendaSnapshot) {
  const {
    appearances,
    totalAppearances,
    clusteredAppearances,
    unclusteredAppearances,
  } = snapshot.accounting
  const clustered = appearances.filter(
    (row) => row.classification === 'clustered'
  )
  const unclustered = appearances.filter(
    (row) => row.classification === 'unclustered'
  )
  if (
    totalAppearances !== 10701 ||
    appearances.length !== totalAppearances ||
    new Set(appearances.map((row) => row.id)).size !== totalAppearances ||
    clustered.length !== clusteredAppearances ||
    unclustered.length !== unclusteredAppearances ||
    clustered.length + unclustered.length !== totalAppearances
  )
    throw new Error('AHWG source appearance conservation failed')
  const ledger = new Map(clustered.map((row) => [row.id, row.conceptId]))
  if (
    snapshot.occurrences.length !== clustered.length ||
    snapshot.occurrences.some((row) => ledger.get(row.id) !== row.conceptId)
  )
    throw new Error('AHWG clustered appearances were lost or invented')
}
