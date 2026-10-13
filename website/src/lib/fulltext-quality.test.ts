import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasFulltextQualityWarning } from '#lib/fulltext-quality'

test('clean and unchecked-only parses do not claim an extraction defect', () => {
  for (const value of [null, undefined, {}, [], [null, 2, {}], [{problem: 'source_unchecked'}], [{problem: 'source_unreadable'}], [{problem: 'diagnostic', severity: 'info'}]]) {
    assert.equal(hasFulltextQualityWarning(value), false)
  }
})
test('original parser issues and imported quality flags produce the public warning', () => {
  for (const problem of ['unconfirmed_marker', 'accounting', 'word_accounting', 'source_truncated', 'source_overreach', 'quality_overreach', 'quality_source_truncated', 'quality_word_accounting']) {
    assert.equal(hasFulltextQualityWarning([{problem: 'source_unchecked'}, {problem, text_head: '/private/source/path', severity: 'warning'}]), true)
  }
})
