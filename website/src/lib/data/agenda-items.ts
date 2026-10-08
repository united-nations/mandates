import 'server-only'
import { cache } from 'react'
import { queryMany } from '../db/query'
import { buildAgendaTree, validAgendaRow, type MirroredAgendaRow, type AgendaReference } from '#lib/agenda-tree'
import { agendaDocumentSymbol, agendaResolutionReferenceCte, normalizedDocumentSql, type AgendaBody } from '#lib/agenda-scope'

export const AGENDA_MIRROR_SQL = `
  SELECT row_id::text, igov_body, igov_session, agenda_item, title, allocation, data, synced_at
  FROM un_daily_mirror.igov_agenda_items
  WHERE igov_body IN ('GA', 'ECOSOC') ORDER BY row_id`

export const agendaReferencesSql = () => `
  WITH ${agendaResolutionReferenceCte()}
  SELECT DISTINCT symbol, reference->>'item' AS item,
    reference->>'desc' AS description, reference->>'topic' AS topic, provenance
  FROM agenda_resolution_refs a
  WHERE ${normalizedDocumentSql("a.reference->>'doc'")} = $1`

const loadMirror = cache(() => queryMany<MirroredAgendaRow>(AGENDA_MIRROR_SQL))

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as {code?:string;cause?:unknown}
  return e.code ?? errorCode(e.cause)
}

export async function getAgendaPageData(body: AgendaBody, requestedSession?: string) {
  try {
    const rows = await loadMirror()
    const sessions = [...new Set(rows.filter(row => row.igov_body === body && validAgendaRow(row) && /^\d+$/.test(row.igov_session)).map(row => row.igov_session))].sort((a,b)=>Number(b)-Number(a))
    const preferredSession = body === 'GA' ? '80' : '2026'
    const session = requestedSession && sessions.includes(requestedSession) ? requestedSession : sessions.includes(preferredSession) ? preferredSession : sessions[0]
    if (!session) return {status:'empty' as const,body,sessions}
    const refs = await queryMany<AgendaReference>(agendaReferencesSql(),[agendaDocumentSymbol(body,session)])
    const result = buildAgendaTree(rows,body,session,refs)
    const syncTimes=rows.filter(row=>row.igov_body===body && row.igov_session===session).map(row=>new Date(row.synced_at).getTime()).filter(Number.isFinite)
    const syncedAt=syncTimes.length ? new Date(Math.max(...syncTimes)).toISOString() : undefined
    return {status:'ready' as const,body,sessions,session,syncedAt,...result}
  } catch(error) {
    const code=errorCode(error)
    console.error('Agenda items unavailable', {code:code ?? 'unknown'})
    return {status:code==='42501' ? 'permission' as const : 'error' as const,body,sessions:[] as string[]}
  }
}
