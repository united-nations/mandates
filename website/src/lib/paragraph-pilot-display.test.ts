import test from 'node:test'
import assert from 'node:assert/strict'
import { pilotDisplaySegments } from '#lib/paragraph-pilot-display'
import type { PilotSpan } from '#lib/paragraph-pilot'
const spans: PilotSpan[] = [
  { start: 0, end: 18, kind: 'activity', label: 'Task' },
  { start: 0, end: 11, kind: 'assignee', label: 'Government' },
  { start: 12, end: 18, kind: 'deliverable', label: 'Report' },
]
test('overlapping task, actor and output roles are projected into separate layers', () => {
  for (const layer of [
    'activity',
    'assignee',
    'deliverable',
    'none',
  ] as const) {
    const result = pilotDisplaySegments('Governments report', 0, spans, layer)
    assert.equal(result.map((s) => s.text).join(''), 'Governments report')
    assert.ok(result.every((s) => s.spans.every((span) => span.kind === layer)))
    if (layer === 'none') assert.ok(result.every((s) => !s.spans.length))
  }
  assert.equal(
    pilotDisplaySegments('Governments report', 0, spans, 'activity').length,
    1
  )
})
test('partial source runs preserve offsets and Unicode without invalid empty intervals', () => {
  const result = pilotDisplaySegments(
    '😀 report',
    10,
    [
      { start: 0, end: 14, kind: 'activity', label: 'Task' },
      { start: 11, end: 11, kind: 'activity', label: 'Invalid' },
    ],
    'activity'
  )
  assert.equal(result.map((s) => s.text).join(''), '😀 report')
  assert.equal(result[0].start, 10)
  assert.ok(result.every((s) => s.text.length > 0))
})
