import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  countPilotHierarchy,
  pilotTooltip,
  assignedEntitiesOnly,
  matchesPilotActivity,
  pilotActivityTree,
} from '#lib/paragraph-pilot'
import type { Paragraph } from '@/types'

const paragraph = (
  activities: { type: string; subtype: string }[]
): Paragraph => ({
  text: 'Requests a report and update.',
  type: 'paragraph',
  heading_level: null,
  paragraph_type: 'operative',
  paragraph_level: 1,
  prefix: '1.',
  links: [],
  pilot: { status: 'validated', activities, spans: [] },
})
test('pilot parents and leaves match without treating missing extraction as an activity', () => {
  const p = paragraph([{ type: 'reporting', subtype: 'update' }])
  assert.equal(matchesPilotActivity(p, 'reporting'), true)
  assert.equal(matchesPilotActivity(p, 'reporting:update'), true)
  assert.equal(matchesPilotActivity(p, 'substantive:update'), false)
  assert.equal(matchesPilotActivity(paragraph([]), 'reporting'), false)
  assert.equal(matchesPilotActivity(paragraph([]), 'all'), true)
})
test('multi-activity clauses count once per family and leaf, retaining zero-count options', () => {
  const p = paragraph([
    { type: 'reporting', subtype: 'update' },
    { type: 'reporting', subtype: 'written_report' },
    { type: 'reporting', subtype: 'update' },
  ])
  const q = paragraph([{ type: 'institutional', subtype: 'renewal_extension' }])
  const counts = countPilotHierarchy([p, q], (x) => x === p)
  assert.deepEqual(counts.categories, { reporting: 1, institutional: 0 })
  assert.deepEqual(counts.children.reporting, { update: 1, written_report: 1 })
  assert.equal(counts.children.institutional.renewal_extension, 0)
})

test('implementer branches use each activity actor and deduplicate joint assignments', () => {
  const p = paragraph([])
  p.pilot!.activities = [
    {
      type: 'substantive',
      subtype: 'capacity_building',
      actor_types: ['member_states'],
    },
    {
      type: 'reporting',
      subtype: 'written_report',
      actor_types: ['un_secretariat'],
    },
  ]
  assert.equal(matchesPilotActivity(p, 'substantive:un'), false)
  assert.equal(
    matchesPilotActivity(p, 'substantive:member_states:capacity_building'),
    true
  )
  p.pilot!.activities.push({
    type: 'substantive',
    subtype: 'capacity_building',
    actor_types: ['member_states', 'un_system'],
  })
  const tree = pilotActivityTree([p], () => true)
  assert.equal(tree[0].count, 1)
  assert.equal(
    tree[0].children.find((n) => n.value === 'substantive:member_states')!
      .count,
    1
  )
  assert.equal(
    tree[0].children.find((n) => n.value === 'substantive:un')!.count,
    1
  )
})

test('frontend hides mentions and affected targets without mutating extraction or assigned evidence', () => {
  const p = paragraph([])
  p.textWithHighlights =
    '*Requests* <<the Secretary-General>> to consult {{UNICEF}}.'
  p.mandates = [
    {
      action_verb: 'Requests',
      action_verb_type: 'directive',
      assignees: [
        {
          assignee: 'the Secretary-General',
          assignee_normalized: 'UN Secretary-General',
          assignee_type: 'un_secretariat',
        },
      ],
      mentioned_entities: [
        {
          mentioned_entity: 'UNICEF',
          mentioned_entity_normalized: 'UNICEF',
          mentioned_entity_type: 'un_system',
        },
      ],
      deliverables: [],
    },
  ]
  p.pilot!.spans = [
    { start: 0, end: 8, kind: 'activity', label: 'Reporting' },
    { start: 9, end: 30, kind: 'assignee', label: 'UN Secretary-General' },
    { start: 42, end: 48, kind: 'mention', label: 'UNICEF' },
    { start: 42, end: 48, kind: 'institutional_target', label: 'UNICEF' },
  ]
  const visible = assignedEntitiesOnly(p)
  assert.equal(visible.mandates![0].mentioned_entities.length, 0)
  assert.equal(visible.mandates![0].assignees.length, 1)
  assert.deepEqual(
    visible.pilot!.spans.map((s) => s.kind),
    ['activity', 'assignee']
  )
  assert.equal(
    visible.textWithHighlights,
    '*Requests* <<the Secretary-General>> to consult UNICEF.'
  )
  assert.equal(p.mandates[0].mentioned_entities.length, 1)
  assert.equal(p.pilot!.spans.length, 4)
})

test('evidence tooltips explain task classifications and assigned actors without raw field codes', () => {
  const task = pilotTooltip({
    start: 0,
    end: 10,
    kind: 'activity',
    label: 'reporting: written report',
  })
  assert.equal(task.title, 'Task')
  assert.equal(task.detail, 'Reporting › Written reports')
  assert.equal(task.explanation, 'Prepare or submit a written report.')
  const actor = pilotTooltip({
    start: 0,
    end: 10,
    kind: 'assignee',
    label: 'Assignee · UN Secretary-General · un_secretariat',
  })
  assert.deepEqual(actor, {
    title: 'Assigned to',
    detail: 'UN Secretary-General',
    explanation: 'UN Secretariat',
  })
})
