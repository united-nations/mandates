import snapshot from './data/sc-agenda-snapshot.json' with { type: 'json' }
import { validateScAgendaSnapshot, type ScAgendaSnapshot } from '#lib/sc-agenda'

/** Checked official 2025 export; year/heading keys are local scope identities. */
export const scAgendaSnapshot = validateScAgendaSnapshot(
  snapshot as ScAgendaSnapshot
)
