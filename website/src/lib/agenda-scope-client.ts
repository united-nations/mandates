/** Scope parsing and labels depend only on compact official heading identities. */
import hrcSnapshot from './data/hrc-agenda-snapshot.json' with { type: 'json' }
import { getScAgendaClientYear } from '#lib/sc-agenda-client-index'
import { scHeadingDisplayTitle } from '#lib/sc-agenda'

export type AgendaBody = 'GA' | 'ECOSOC' | 'HRC' | 'SC'
export interface AgendaScope {
  body: AgendaBody
  session: string
  item: string
  items: string[]
}

/** Bracketed subject refinements are not official agenda children. */
export function normalizeAgendaItem(value: string): string | null {
  const compact = value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/(?:\[\d+\])+$/, '')
    .replace(/[\s()]/g, '')
  const match = compact.match(/^(\d+)([a-z]*)$/)
  return match ? `${Number(match[1])}${match[2]}` : null
}

export function parseAgendaScope(value?: string): AgendaScope | null {
  try {
    if (!value) return null
    const scope = JSON.parse(value)
    if (scope?.body === 'SC') {
      const snapshot = getScAgendaClientYear(scope.session)
      if (
        !snapshot ||
        typeof scope.item !== 'string' ||
        !Array.isArray(scope.items) ||
        scope.items.length !== 1 ||
        scope.items[0] !== scope.item ||
        !snapshot.headings.some((row) => row.id === scope.item)
      )
        return null
      return {
        body: 'SC',
        session: scope.session,
        item: scope.item,
        items: [scope.item],
      }
    }
    if (
      !scope ||
      !['GA', 'ECOSOC', 'HRC'].includes(scope.body) ||
      typeof scope.session !== 'string' ||
      !/^\d+$/.test(scope.session) ||
      (scope.body === 'ECOSOC' && !/^\d{4}$/.test(scope.session)) ||
      (scope.body === 'HRC' &&
        !hrcSnapshot.sessions.some(
          (source) => source.session === scope.session
        )) ||
      typeof scope.item !== 'string' ||
      !normalizeAgendaItem(scope.item) ||
      !Array.isArray(scope.items) ||
      !scope.items.length ||
      scope.items.length > 1000 ||
      scope.items.some(
        (item: unknown) =>
          typeof item !== 'string' || normalizeAgendaItem(item) !== item
      ) ||
      new Set(scope.items).size !== scope.items.length ||
      !scope.items.includes(normalizeAgendaItem(scope.item)) ||
      (scope.body === 'HRC' &&
        (scope.items.length !== 1 ||
          !hrcSnapshot.items.some((item) => item.item === scope.item))) ||
      scope.items.some(
        (item: string) =>
          !item.startsWith(normalizeAgendaItem(scope.item)!) ||
          !/^[a-z]*$/.test(item.slice(normalizeAgendaItem(scope.item)!.length))
      )
    )
      return null
    return scope as AgendaScope
  } catch {
    return null
  }
}

export const agendaScopeHref = (scope: AgendaScope) =>
  `/secretariat?${new URLSearchParams({ agenda_scope: JSON.stringify(scope), group: '0' })}`

export const agendaScopeItemLabel = (scope: AgendaScope) =>
  scope.body === 'SC'
    ? scHeadingDisplayTitle(
        getScAgendaClientYear(scope.session)?.headings.find(
          (row) => row.id === scope.item
        )?.title ?? scope.item
      )
    : scope.item
