import 'server-only'
import { scAgendaClientIndex } from '#lib/sc-agenda-client-index'
import { validateScAgendaClientIndex } from '#lib/sc-agenda-client-model'
import legacy from './data/sc-agenda-snapshot.json' with { type: 'json' }
import source from './data/sc-agenda-years.json' with { type: 'json' }
import { validateScAgendaSnapshot, type ScAgendaSnapshot } from '#lib/sc-agenda'
import { scAgendaYears, type SecurityCouncilAgendaDataset } from '#lib/sc-agenda-years'

/** Independent source audit: 649 checks, 3,744 inputs, zero unexplained source failures. */
export const SC_AGENDA_SOURCE_SHA256 = '743fdb304acb5b4ae05820689daefbfff94b11ca634b0ee13fbb750bf7c1b120'
const audited2025 = validateScAgendaSnapshot(legacy as ScAgendaSnapshot)
export const scAgendaSnapshots = scAgendaYears(source as SecurityCouncilAgendaDataset, audited2025)
export const scAgendaSessions = scAgendaSnapshots.map(row => row.year)
export const getScAgendaSnapshot = (year: string) => scAgendaSnapshots.find(row => row.year === year)
/** Keep the complete audited 2025 year as the default. */
export const scAgendaSnapshot = getScAgendaSnapshot(source.defaultYear)!
validateScAgendaClientIndex(scAgendaClientIndex, scAgendaSnapshots, SC_AGENDA_SOURCE_SHA256)
