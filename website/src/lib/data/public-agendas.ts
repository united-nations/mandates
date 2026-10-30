import { getProgressiveAgendaPageData } from './agenda-items'
import { relatedClustersForNode } from '../related-agenda'
import { API_VERSION, ApiInputError } from '../public-api'
import type { AgendaBody } from '../agenda-scope-client'

export async function getPublicAgendas(body: AgendaBody, session?: string) {
  const { data, mainCounts, relatedCounts } =
    await getProgressiveAgendaPageData(body, session)
  if (data.status === 'error' || data.status === 'permission')
    throw new Error('Agenda data unavailable')
  if (session && !data.sessions.includes(session))
    throw new ApiInputError('Unknown session for this body')
  const [main, related] = await Promise.all([mainCounts, relatedCounts])
  if (data.status !== 'ready')
    return { apiVersion: API_VERSION, ...data, nodes: [] }
  const counts = new Map(Object.entries(related?.counts ?? {}))
  return {
    apiVersion: API_VERSION,
    status: data.status,
    body: data.body,
    sessions: data.sessions,
    session: data.session,
    coverage: data.coverage,
    dataCutoff: data.dataCutoff,
    resolutionCountsStatus: main?.status ?? 'unavailable',
    relatedCountsStatus: related?.status ?? 'unavailable',
    nodes: data.nodes.map((node) => ({
      id: node.id,
      item: node.item,
      titles: node.titles,
      allocations: node.allocations,
      heading: node.heading,
      parentId: node.parentId,
      depth: node.depth,
      scope: node.scope,
      meetingCount: node.meetingCount,
      resolutionCount: main?.nodes[node.id]?.count ?? null,
      titleDifferences: main?.nodes[node.id]?.titleDifferences ?? [],
      relatedItems: relatedClustersForNode(node, counts),
    })),
  }
}
