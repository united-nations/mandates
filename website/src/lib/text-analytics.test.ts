import assert from 'node:assert/strict'
import test from 'node:test'
import {
  comparisonUrl,
  formatSimilarity,
  formatWordCount,
} from '#lib/text-analytics'

test('unavailable metrics are distinct from valid zero', () => {
  assert.equal(formatWordCount(null), '—')
  assert.equal(formatWordCount(0), '0')
  assert.equal(formatWordCount(4820), '4,820')
  assert.equal(formatSimilarity(null), null)
  assert.equal(formatSimilarity(0), '0%')
  assert.equal(formatSimilarity(0.913), '91%')
  for (const score of [-1, 1.1, NaN, Infinity])
    assert.equal(formatSimilarity(score), null)
})

test('comparison uses the supplied complete-series predecessor, never a row index', () => {
  const metrics = {
    word_count: 4820,
    similarity_to_previous: null,
    previous_document_symbol: 'A/RES/70/1',
    can_compare: true,
  }
  const url = new URL(comparisonUrl('A/RES/78/1', metrics)!)
  assert.equal(url.searchParams.get('symbol1'), 'A/RES/70/1')
  assert.equal(url.searchParams.get('symbol2'), 'A/RES/78/1')
  assert.equal(
    comparisonUrl('A/RES/78/1', { ...metrics, can_compare: false }),
    null
  )
  assert.equal(
    comparisonUrl('A/RES/78/1', { ...metrics, previous_document_symbol: null }),
    null
  )
})
