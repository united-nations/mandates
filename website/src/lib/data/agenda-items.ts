import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createHash } from 'node:crypto'
import { queryMany } from '../db/query'
import { withRequestQueryCache } from '../db/request-query-cache'
import { buildAgendaTree, validAgendaRow, type MirroredAgendaRow, type AgendaReference } from '#lib/agenda-tree'
import { agendaDocumentSymbols, agendaResolutionReferenceCte, normalizedDocumentSql, type AgendaBody } from '#lib/agenda-scope'
import { buildHrcAgenda, hrcAgendaSessions } from '#lib/hrc-agenda'
import { buildScAgenda, type ScRegistryResolution } from '#lib/sc-agenda'
import { scAgendaSnapshot } from '#lib/sc-agenda-snapshot'
import { scRegistryResolutionSql } from '#lib/agenda-scope'
import { withRelatedItems, getRelatedResolutionCounts } from '#lib/related-agenda'

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
  ${body === 'HRC' ? `AND ${normalizedDocumentSql('a.symbol')} ~ '^A/HRC/RES/[0-9]+/'` : ''}`

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
const loadScRegistry = cache(unstable_cache(
  () => queryMany<ScRegistryResolution>(scRegistryResolutionSql(1), [scAgendaSnapshot.resolutions]),
  ['agenda-sc-registry-v1', createHash('sha256').update(scRegistryResolutionSql(1))
    .update(JSON.stringify(scAgendaSnapshot.resolutions)).digest('hex')],
  { revalidate: 300 }
))

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
      const session = scAgendaSnapshot.year
      const [registry, counts] = await Promise.all([loadScRegistry(), relatedCounts])
      return { status: 'ready' as const, body, sessions: [session], session, ...await withRelatedItems(buildScAgenda(scAgendaSnapshot, registry), counts) }
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
