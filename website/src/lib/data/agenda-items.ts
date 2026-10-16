import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createHash } from 'node:crypto'
import { queryMany } from '../db/query'
import { withRequestQueryCache } from '../db/request-query-cache'
import { buildAgendaTree, validAgendaRow, type MirroredAgendaRow, type AgendaReference } from '#lib/agenda-tree'
import { agendaDocumentSymbols, agendaResolutionReferenceCte, normalizeAgendaItem, normalizedDocumentSql, parseAgendaScope, type AgendaBody } from '#lib/agenda-scope'
import type { FilterOptions } from '@/types'
import { buildHrcAgenda, hrcAgendaSessions } from '#lib/hrc-agenda'
import { buildScAgenda, type ScRegistryResolution } from '#lib/sc-agenda'
import { scAgendaSnapshot, scAgendaSessions, getScAgendaSnapshot } from '#lib/sc-agenda-snapshot'
import { scRegistryResolutionSql } from '#lib/agenda-scope'
import { withRelatedItems, getRelatedResolutionCounts, relatedClustersForNode } from '#lib/related-agenda'

export const AGENDA_MIRROR_SQL = `
  SELECT row_id::text, igov_body, igov_session, agenda_item, title, allocation, data, synced_at
  FROM un_daily_mirror.igov_agenda_items
  WHERE igov_body IN ('GA', 'ECOSOC') ORDER BY row_id`

export const agendaReferencesSql = (body: AgendaBody = 'GA') => `
  WITH ${agendaResolutionReferenceCte()}
  SELECT DISTINCT symbol, reference->>'item' AS item,
    reference->>'desc' AS description, reference->>'topic' AS topic, provenance
  FROM agenda_resolution_refs a
  WHERE ${normalizedDocumentSql("a.reference->>'doc'")} ${body === 'HRC' ? '= ANY($1::text[])' : '= $1'}
  ${body === 'HRC' ? `AND ${normalizedDocumentSql('a.symbol')} ~ '^A/HRC/'` : ''}`

// Successful JSON rows refresh every five minutes; query changes invalidate the key.
const loadMirror = cache(unstable_cache(
  () => queryMany<MirroredAgendaRow>(AGENDA_MIRROR_SQL),
  ['agenda-mirror-v1', createHash('sha256').update(AGENDA_MIRROR_SQL).digest('hex')],
  { revalidate: 300 }
))
const readReferences = unstable_cache(
  (body: AgendaBody, documents: string[]) => queryMany<AgendaReference>(
    agendaReferencesSql(body), [body === 'HRC' ? documents : documents[0]]
  ),
  ['agenda-resolution-references-v1', createHash('sha256').update(JSON.stringify(
    ['GA', 'ECOSOC', 'HRC'].map(body => agendaReferencesSql(body as AgendaBody))
  )).digest('hex')],
  { revalidate: 300 }
)
// Actual document editions are cache arguments, so a source revision cannot reuse an old entry.
const loadReferences = cache((body: AgendaBody, session: string) =>
  readReferences(body, agendaDocumentSymbols(body, session))
)

/** Symbols an agenda-scope link opens, read from the same cached references the
 * list page counts, so the arrow's count and the filtered catalogue cannot
 * disagree. SC scopes keep their own snapshot-driven predicate (undefined here),
 * as does an absent or invalid scope. */
export async function agendaScopeSymbols(filters: FilterOptions): Promise<string[] | undefined> {
  if (filters.related_scope || !filters.agenda_scope) return undefined
  const scope = parseAgendaScope(filters.agenda_scope)
  if (!scope || scope.body === 'SC') return undefined
  const references = await loadReferences(scope.body, scope.session)
  return [...new Set(references.filter(ref => {
    const token = ref.item === null ? null : normalizeAgendaItem(ref.item)
    return token !== null && scope.items.includes(token)
  }).map(ref => ref.symbol))].sort()
}
const readScRegistry = unstable_cache(
  (year: string, symbols: string[]) => queryMany<ScRegistryResolution>(scRegistryResolutionSql(1), [symbols]),
  ['agenda-sc-registry-v2', createHash('sha256').update(scRegistryResolutionSql(1)).digest('hex')],
  { revalidate: 300 }
)
const loadScRegistry = cache((year: string) => {
  const snapshot = getScAgendaSnapshot(year)!
  return readScRegistry(year, snapshot.documents ?? snapshot.resolutions)
})

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as {code?:string;cause?:unknown}
  return e.code ?? errorCode(e.cause)
}

export async function getAgendaPageData(body: AgendaBody, requestedSession?: string) {
  return withRequestQueryCache(() => loadAgendaPageData(body, requestedSession))
}

async function loadAgendaPageData(body: AgendaBody, requestedSession?: string) {
  try {
    const relatedCounts = getRelatedResolutionCounts()
    if (body === 'SC') {
      const session = requestedSession && scAgendaSessions.includes(requestedSession) ? requestedSession : scAgendaSnapshot.year
      const [registry, counts] = await Promise.all([loadScRegistry(session), relatedCounts])
      return { status: 'ready' as const, body, sessions: scAgendaSessions, session, ...await withRelatedItems(buildScAgenda(getScAgendaSnapshot(session)!, registry), counts) }
    }
    if (body === 'HRC') {
      const sessions = hrcAgendaSessions
      const session = requestedSession && sessions.includes(requestedSession) ? requestedSession : sessions.includes('62') ? '62' : sessions[0]
      const [refs, counts] = await Promise.all([loadReferences(body, session), relatedCounts])
      return { status: 'ready' as const, body, sessions, session, ...await withRelatedItems(buildHrcAgenda(session, refs), counts) }
    }
    const rows = await loadMirror()
    const sessions = [...new Set(rows.filter(row => row.igov_body === body && validAgendaRow(row) && /^\d+$/.test(row.igov_session)).map(row => row.igov_session))].sort((a,b)=>Number(b)-Number(a))
    const preferredSession = body === 'GA' ? '80' : '2026'
    const session = requestedSession && sessions.includes(requestedSession) ? requestedSession : sessions.includes(preferredSession) ? preferredSession : sessions[0]
    if (!session) return {status:'empty' as const,body,sessions}
    const [refs, counts] = await Promise.all([loadReferences(body, session), relatedCounts])
    const result = await withRelatedItems(buildAgendaTree(rows,body,session,refs), counts)
    const syncTimes=rows.filter(row=>row.igov_body===body && row.igov_session===session).map(row=>new Date(row.synced_at).getTime()).filter(Number.isFinite)
    const syncedAt=syncTimes.length ? new Date(Math.max(...syncTimes)).toISOString() : undefined
    return {status:'ready' as const,body,sessions,session,syncedAt,...result}
  } catch(error) {
    const code=errorCode(error)
    console.error('Agenda items unavailable', {code:code ?? 'unknown'})
    return {status:code==='42501' ? 'permission' as const : 'error' as const,body,sessions:[] as string[]}
  }
}

/** Lightweight title hierarchy; resolution diagnostics remain pending until enrichment. */
export type AgendaTitleData =
  | { status: 'ready'; body: AgendaBody; sessions: string[]; session: string; nodes: ReturnType<typeof buildAgendaTree>['nodes']; coverage?: 'complete' | 'partial'; dataCutoff?: string }
  | { status: 'empty' | 'permission' | 'error'; body: AgendaBody; sessions: string[] }

export interface AgendaMainCounts {
  status: 'ready' | 'unavailable'
  body: AgendaBody
  session: string
  nodes: Record<string, { count: number; titleDifferences: string[] }>
}
export interface AgendaRelatedCounts {
  status: 'ready' | 'unavailable'
  counts: Record<string, number>
}

/** Preserve exact title identity and subtree scopes when adding resolution metadata. */
function titleIdentity(nodes: ReturnType<typeof buildAgendaTree>['nodes']) {
  return JSON.stringify(nodes.map(({ id, titles, allocations, parentId, depth, scope, meetingCount }) =>
    [id, titles, allocations, parentId, depth, scope, meetingCount]))
}

/** Separate promises let either count source finish without holding back the title table. */
export async function getProgressiveAgendaPageData(body: AgendaBody, requestedSession?: string) {
  return withRequestQueryCache(async () => {
    const relatedCounts: Promise<AgendaRelatedCounts> = getRelatedResolutionCounts().then(counts => ({
      status: counts.size ? 'ready' : 'unavailable', counts: Object.fromEntries(counts),
    }))
    try {
      const rows = body === 'GA' || body === 'ECOSOC' ? await loadMirror() : []
      const sessions = body === 'SC' ? scAgendaSessions : body === 'HRC' ? hrcAgendaSessions :
        [...new Set(rows.filter(row => row.igov_body === body && validAgendaRow(row) && /^\d+$/.test(row.igov_session)).map(row => row.igov_session))].sort((a,b) => Number(b)-Number(a))
      const preferred = body === 'GA' ? '80' : body === 'ECOSOC' ? '2026' : body === 'HRC' ? '62' : scAgendaSnapshot.year
      const session = requestedSession && sessions.includes(requestedSession) ? requestedSession : sessions.includes(preferred) ? preferred : sessions[0]
      if (!session) return { data: { status: 'empty', body, sessions } as AgendaTitleData }
      const baseline = body === 'SC' ? buildScAgenda(getScAgendaSnapshot(session)!, []) : body === 'HRC' ? buildHrcAgenda(session, []) : buildAgendaTree(rows, body, session, [])
      const mainCounts: Promise<AgendaMainCounts> = (async () => {
        try {
          const complete = body === 'SC' ? buildScAgenda(getScAgendaSnapshot(session)!, await loadScRegistry(session)) :
            body === 'HRC' ? buildHrcAgenda(session, await loadReferences(body, session)) :
              buildAgendaTree(rows, body, session, await loadReferences(body, session))
          if (titleIdentity(complete.nodes) !== titleIdentity(baseline.nodes)) throw new Error('Agenda enrichment changed title hierarchy or scope')
          return { status: 'ready', body, session, nodes: Object.fromEntries(complete.nodes.map(node =>
            [node.id, { count: node.symbols.length, titleDifferences: node.titleDifferences }])) }
        } catch {
          console.error('Agenda resolution counts unavailable', { body, session })
          return { status: 'unavailable', body, session, nodes: {} }
        }
      })()
      const snapshot = body === 'SC' ? getScAgendaSnapshot(session) : undefined
      const data: AgendaTitleData = { status: 'ready', body, sessions, session, ...(snapshot ? {coverage: snapshot.coverage ?? 'complete', dataCutoff: snapshot.dataCutoff ?? snapshot.headings.flatMap(heading => heading.meetings.map(meeting => meeting.date)).sort().at(-1)} : {}), nodes: baseline.nodes.map(node => ({
        ...node, sourceRows: [], sourceIds: [], directSymbols: [], symbols: [],
        relatedItems: relatedClustersForNode(node),
      })) }
      return { data, mainCounts, relatedCounts }
    } catch (error) {
      return { data: { status: errorCode(error) === '42501' ? 'permission' : 'error', body, sessions: [] } as AgendaTitleData }
    }
  })
}
