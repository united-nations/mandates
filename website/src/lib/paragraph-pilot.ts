import type { Paragraph } from '@/types'

export interface PilotSpan {
  start: number
  end: number
  kind:
    'activity' | 'assignee' | 'mention' | 'deliverable' | 'institutional_target'
  label: string
}
export interface ParagraphPilot {
  reasoning?: 'none' | 'medium'
  status: 'validated' | 'rejected' | 'stale'
  activities: { type: string; subtype: string; actor_types?: string[] }[]
  spans: PilotSpan[]
}
export interface PilotRecord extends ParagraphPilot {
  hash: string
  parser: string
  assignees: NonNullable<Paragraph['mandates']>[number]['assignees']
  mentions: NonNullable<Paragraph['mandates']>[number]['mentioned_entities']
  deliverables: NonNullable<Paragraph['mandates']>[number]['deliverables']
}
export const PILOT_ACTIVITY_LABELS: Record<string, string> = {
  substantive: 'Substantive',
  reporting: 'Reporting',
  deliberation: 'Deliberation',
  institutional: 'Institutional',
  resources: 'Resources and support',
  mandate_review: 'Mandate review',
  establishment: 'Mandate establishment',
  renewal_extension: 'Mandate renewal',
  amendment: 'Mandate change',
  termination: 'Mandate termination',
  appointment_membership: 'Appointments and membership',
  un: 'For the UN system to implement',
  member_states: 'For Member States to implement',
  other: 'For other or unspecified actors',
  policy_normative_action: 'Policy and normative action',
  technical_assistance: 'Technical assistance',
  capacity_building: 'Capacity building',
  operational_delivery: 'Operational delivery',
  humanitarian_delivery: 'Humanitarian delivery',
  information_knowledge_work: 'Information and knowledge',
  written_report: 'Written reports',
  oral_briefing: 'Oral briefings',
  update: 'Updates',
  assessment: 'Assessments',
  recommendations: 'Recommendations',
  meeting: 'Meetings',
  dialogue_consultation: 'Dialogues and consultations',
  conference: 'Conferences',
  agenda_consideration: 'Agenda items',
  participation: 'Participation',
  funding: 'Funding',
  personnel: 'Personnel',
  facilities_infrastructure: 'Facilities and infrastructure',
  evaluation: 'Evaluation',
  consolidation: 'Consolidation',
}
export function pilotActivityLabel(key: string): string {
  return key
    .split(':')
    .map((part) => PILOT_ACTIVITY_LABELS[part] ?? part.replace(/_/g, ' '))
    .join(' › ')
}
export function activityImplementers(
  a: ParagraphPilot['activities'][number]
): string[] {
  const types = a.actor_types ?? []
  const groups = new Set<string>()
  if (
    types.some((t) => ['un_organs', 'un_secretariat', 'un_system'].includes(t))
  )
    groups.add('un')
  if (types.includes('member_states')) groups.add('member_states')
  if (!types.length || types.some((t) => ['other', 'unresolved'].includes(t)))
    groups.add('other')
  return [...groups]
}
export function matchesPilotActivity(p: Paragraph, filter: string): boolean {
  if (filter === 'all') return true
  const [family, child, subtype] = filter.split(':')
  return !!p.pilot?.activities.some(
    (a) =>
      a.type === family &&
      (!child ||
        (family === 'substantive' &&
        ['un', 'member_states', 'other'].includes(child)
          ? activityImplementers(a).includes(child) &&
            (!subtype || a.subtype === subtype)
          : a.subtype === child))
  )
}
export interface PilotFacetNode {
  value: string
  label: string
  count: number
  children: PilotFacetNode[]
}
export function pilotActivityTree(
  paragraphs: readonly Paragraph[],
  include: (p: Paragraph) => boolean
): PilotFacetNode[] {
  const roots: PilotFacetNode[] = []
  const nodes = new Map<string, PilotFacetNode>()
  const counts = new Map<string, Set<Paragraph>>()
  for (const p of paragraphs)
    for (const a of p.pilot?.activities ?? []) {
      const paths =
        a.type === 'substantive'
          ? activityImplementers(a).map((g) => [a.type, g, a.subtype])
          : [[a.type, a.subtype]]
      for (const path of paths) {
        let siblings = roots
        path.forEach((part, i) => {
          const key = path.slice(0, i + 1).join(':')
          let node = nodes.get(key)
          if (!node) {
            node = {
              value: key,
              label: PILOT_ACTIVITY_LABELS[part] ?? part,
              count: 0,
              children: [],
            }
            nodes.set(key, node)
            siblings.push(node)
            counts.set(key, new Set())
          }
          if (include(p)) counts.get(key)!.add(p)
          node.count = counts.get(key)!.size
          siblings = node.children
        })
      }
    }
  const order = [
    'substantive',
    'reporting',
    'deliberation',
    'institutional',
    'resources',
    'mandate_review',
  ]
  return roots.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
}

/** Count paragraphs once per family/leaf; retain zero-count facet options. */
export function countPilotHierarchy(
  paragraphs: readonly Paragraph[],
  include: (p: Paragraph) => boolean
) {
  const categories: Record<string, number> = {}
  const children: Record<string, Record<string, number>> = {}
  for (const p of paragraphs) {
    const seen = new Set<string>()
    const leaves = new Set<string>()
    for (const a of p.pilot?.activities ?? []) {
      categories[a.type] ??= 0
      children[a.type] ??= {}
      children[a.type][a.subtype] ??= 0
      if (!include(p)) continue
      if (!seen.has(a.type)) categories[a.type]++
      if (!leaves.has(`${a.type}:${a.subtype}`)) children[a.type][a.subtype]++
      seen.add(a.type)
      leaves.add(`${a.type}:${a.subtype}`)
    }
  }
  return { categories, children }
}

/** Presentation only: preserve extraction records, expose assigned actors alone. */
export function assignedEntitiesOnly(p: Paragraph): Paragraph {
  return {
    ...p,
    textWithHighlights: p.textWithHighlights?.replace(
      /\{\{([\s\S]*?)\}\}/g,
      '$1'
    ),
    mandates: p.mandates?.map((m) => ({ ...m, mentioned_entities: [] })),
    pilot: p.pilot
      ? {
          ...p.pilot,
          spans: p.pilot.spans.filter(
            (s) => s.kind !== 'mention' && s.kind !== 'institutional_target'
          ),
        }
      : undefined,
  }
}

/** Translate frozen evidence labels into reader-facing tooltip fields. */
export function pilotTooltip(span: PilotSpan): {
  title: string
  detail: string
  explanation?: string
} {
  if (span.kind === 'activity') {
    const key = span.label
      .split(':')
      .map((p) => p.trim().replace(/ /g, '_'))
      .join(':')
    return {
      title: 'Task',
      detail: pilotActivityLabel(key),
      explanation:
        (
          {
            policy_normative_action:
              'Develop, adopt or implement a policy, rule or standard.',
            technical_assistance:
              'Provide practical expertise or technical support.',
            capacity_building:
              'Strengthen skills, institutions or capabilities.',
            operational_delivery:
              'Carry out a service, programme or operational function.',
            humanitarian_delivery:
              'Deliver humanitarian assistance or protection.',
            information_knowledge_work:
              'Collect, analyse or share information.',
            written_report: 'Prepare or submit a written report.',
            oral_briefing: 'Present information in an oral briefing.',
            update: 'Provide an update on progress or implementation.',
            establishment: 'Create a new body, mechanism or mandate.',
            renewal_extension: 'Extend an existing mandate.',
            amendment:
              'Change an existing mandate or institutional arrangement.',
            funding: 'Provide or allocate financial resources.',
            personnel: 'Provide, recruit or assign personnel.',
            meeting: 'Convene or organize a meeting.',
            dialogue_consultation:
              'Hold a dialogue, consultation or negotiation.',
            agenda_consideration: 'Include or consider an item on an agenda.',
          } as Record<string, string>
        )[key.split(':')[1]] ??
        'The kind of work requested in the highlighted text.',
    }
  }
  const parts = span.label.split(' · ')
  if (span.kind === 'assignee') {
    const types: Record<string, string> = {
      un_organs: 'UN intergovernmental body',
      un_secretariat: 'UN Secretariat',
      un_system: 'UN system organization',
      member_states: 'Member State or government',
      other: 'Other actor',
      unresolved: 'Actor type not determined',
    }
    return {
      title: 'Assigned to',
      detail: parts[1] ?? span.label,
      explanation: types[parts[2]] ?? 'Responsible for carrying out the task.',
    }
  }
  if (span.kind === 'deliverable')
    return {
      title: 'Expected output',
      detail: parts.slice(2).join(' · ') || span.label,
      explanation:
        PILOT_ACTIVITY_LABELS[parts[1]] ?? parts[1]?.replace(/_/g, ' '),
    }
  return { title: 'Referenced entity', detail: parts[1] ?? span.label }
}
