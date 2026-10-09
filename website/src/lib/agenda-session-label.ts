import calendar from './data/agenda-session-years.json' with { type: 'json' }
import type { AgendaBody } from '#lib/agenda-scope'
import { explainerTexts } from '#lib/en_text_contents'

/** Verified session calendars, rather than the issue dates of agenda documents. */
export function agendaSessionLabel(body: AgendaBody, session: string) {
  if (body === 'SC') return session
  const years = (calendar[body].years as Record<string, string>)[session]
  return years
    ? explainerTexts.agendaItems.sessionWithYears
        .replace('{session}', session)
        .replace('{years}', years)
    : session
}
