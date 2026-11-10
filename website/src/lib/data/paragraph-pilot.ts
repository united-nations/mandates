import 'server-only'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Paragraph } from '@/types'
import type { PilotRecord } from '../paragraph-pilot'
import { SHOW_PARAGRAPH_PILOT } from '../feature-flags'

/** Export v2 retains activity-level implementer types. */
let records: Record<string, PilotRecord> | undefined
let artifactModified = 0

/** Frozen branch pilot; attach only to unchanged source IDs, text and parser. */
export function withParagraphPilot(p: Paragraph): Paragraph {
  if (!SHOW_PARAGRAPH_PILOT) return p
  const artifact = join(process.cwd(), 'src/data/paragraph-pilot.json')
  const modified =
    process.env.NODE_ENV === 'development' ? statSync(artifact).mtimeMs : 0
  if (!records || modified !== artifactModified) {
    records = JSON.parse(readFileSync(artifact, 'utf8')) as Record<
      string,
      PilotRecord
    >
    artifactModified = modified
  }
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
      reasoning: record.reasoning,
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
