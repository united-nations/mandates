import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attachFootnotes } from '#lib/fulltext-footnotes'
import type { Paragraph } from '../types/index.ts'
const row = (text: string, type: string, note_ids: number[]): Paragraph => ({
  text,
  type,
  note_ids,
  heading_level: null,
  paragraph_type: null,
  paragraph_level: null,
  prefix: null,
  links: [],
})
test('attaches notes by ID to every referencing paragraph and retains unmatched notes', () => {
  const a = row('Body', 'paragraph', [1])
  const b = row('Second reference', 'paragraph', [1])
  const note = row('Resolution 70/1.', 'footnote', [1])
  const unmatched = row('Unmatched', 'footnote', [2])
  const result = attachFootnotes([a, b, note, unmatched])
  assert.equal(result.length, 3)
  assert.deepEqual(result[0].footnotes, [note])
  assert.deepEqual(result[1].footnotes, [note])
  assert.equal(result[2], unmatched)
  assert.equal(a.footnotes, undefined)
})

test('maps source boundaries through annotation markup without moving references', async () => {
  const { plainTextOffsets } = await import('#lib/fulltext-footnotes')
  const text = 'We request the Secretary-General to report.'
  const marked = 'We *request* the <<Secretary-General>> to report.'
  const offsets = plainTextOffsets(text, marked)!
  assert.equal(
    offsets[marked.indexOf('Secretary-General')],
    text.indexOf('Secretary-General')
  )
  assert.equal(offsets[marked.indexOf('>>')], text.indexOf(' to report.'))
  assert.equal(offsets[marked.length], text.length)
  assert.equal(plainTextOffsets(text, '*Different text*'), null)
})

test('uses UTF-16 boundaries and preserves literal punctuation in unannotated text', async () => {
  const { plainTextOffsets } = await import('#lib/fulltext-footnotes')
  const text = '😀 Text * literal citation.'
  const offsets = plainTextOffsets(text, text)!
  assert.equal(offsets[text.indexOf('citation')], text.indexOf('citation'))
  assert.equal(offsets[2], 2)
})
