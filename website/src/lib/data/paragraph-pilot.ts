import 'server-only'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Paragraph } from '@/types'
import type { PilotRecord } from '../paragraph-pilot'
import { SHOW_PARAGRAPH_PILOT } from '../feature-flags'

/** Export v2 retains activity-level implementer types. */
let records: Record<string, PilotRecord> | undefined

/** Frozen branch pilot; attach only to unchanged source IDs, text and parser. */
export function withParagraphPilot(p: Paragraph): Paragraph {
  if (!SHOW_PARAGRAPH_PILOT) return p
  records ??= JSON.parse(
    readFileSync(join(process.cwd(), 'src/data/paragraph-pilot.json'), 'utf8')
  ) as Record<string, PilotRecord>
  const record = p.id ? records[p.id] : undefined
  if (!record) return p
  const current =
    record.hash === createHash('sha256').update(p.text).digest('hex') &&
    record.parser === p.parser_version
  const actionMandates = (p.mandates ?? []).map((m) => ({
    ...m,
    assignees: [],
    mentioned_entities: [],
    deliverables: [],
  }))
  // Keep the deterministic verb, but never present its old heuristic actor as pilot output.
  const markup = p.textWithHighlights?.replace(/<<(.*?)>>/g, '$1')
  if (!current)
    return {
      ...p,
      textWithHighlights: markup,
      mandates: actionMandates,
      pilot: { status: 'stale', activities: [], spans: [] },
    }
  return {
    ...p,
    paragraph_type: 'operative',
    textWithHighlights: markup,
    pilot: {
      status: record.status,
      activities: record.activities,
      spans: record.spans,
    },
    mandates: [
      ...actionMandates,
      {
        action_verb: '',
        action_verb_type: '',
        assignees: record.assignees,
        mentioned_entities: record.mentions,
        deliverables: record.deliverables,
      },
    ],
  }
}
