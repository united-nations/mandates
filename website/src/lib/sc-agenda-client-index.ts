/** Compact source-derived display index; no outcomes, evidence or accounting. */
import type { ScAgendaClientIndex } from '#lib/sc-agenda-client-model'
import frozen from './data/sc-agenda-client-index.json' with { type: 'json' }
export const scAgendaClientIndex: ScAgendaClientIndex = frozen
export const getScAgendaClientYear = (year: string) =>
  scAgendaClientIndex.years.find((row) => row.year === year)
